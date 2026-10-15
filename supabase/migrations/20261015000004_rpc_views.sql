-- Boxly — RPC e view (CONTRACT §4)
-- Gli errori usano `raise exception '<codice>'` → error.message = codice.

-- share_box -----------------------------------------------------------------
create or replace function public.share_box(p_box_id uuid, p_email text, p_role text)
returns public.box_shares
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_share   public.box_shares;
begin
  if auth.uid() is null
     or not exists (select 1 from public.boxes b where b.id = p_box_id and b.owner_id = auth.uid()) then
    raise exception 'not_owner';
  end if;

  if p_role is null or p_role not in ('viewer', 'editor') then
    raise exception 'invalid_role';
  end if;

  select p.id into v_user_id
    from public.profiles p
   where lower(p.email) = lower(btrim(p_email));
  if v_user_id is null then
    raise exception 'user_not_found';
  end if;

  if v_user_id = auth.uid() then
    raise exception 'cannot_share_with_self';
  end if;

  insert into public.box_shares (box_id, user_id, role)
  values (p_box_id, v_user_id, p_role)
  on conflict (box_id, user_id) do update set role = excluded.role
  returning * into v_share;

  return v_share;
end;
$$;

-- revoke_share --------------------------------------------------------------
create or replace function public.revoke_share(p_box_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or not (
       p_user_id = auth.uid()
       or exists (select 1 from public.boxes b where b.id = p_box_id and b.owner_id = auth.uid())
     ) then
    raise exception 'not_owner';
  end if;

  -- Dettaglio: revocare una condivisione inesistente non è un errore.
  delete from public.box_shares s where s.box_id = p_box_id and s.user_id = p_user_id;
end;
$$;

-- move_item -----------------------------------------------------------------
create or replace function public.move_item(p_item_id uuid, p_to_box_id uuid)
returns public.items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from_box uuid;
  v_item     public.items;
begin
  select i.box_id into v_from_box from public.items i where i.id = p_item_id;

  -- item inesistente/invisibile o permessi mancanti su una delle due scatole
  if v_from_box is null
     or not public.can_edit_box(v_from_box)
     or not public.can_edit_box(p_to_box_id) then
    raise exception 'forbidden';
  end if;

  update public.items i
     set box_id = p_to_box_id
   where i.id = p_item_id
  returning * into v_item;

  return v_item;
end;
$$;

-- search_items --------------------------------------------------------------
-- Dettagli implementativi:
--  * query vuota/solo spazi → nessun risultato;
--  * full-text: ogni parola (senza accenti, minuscola) diventa un prefisso `parola:*`
--    in AND;
--  * fallback ilike (accent-insensitive) su name/brand/color/category con la
--    query intera (i caratteri % _ \ sono trattati letteralmente);
--  * ordinamento: ts_rank desc, poi match sul nome, poi updated_at desc;
--  * la colonna `search` (tsvector) non è restituita.
create or replace function public.search_items(p_query text)
returns table (
  id uuid,
  box_id uuid,
  name text,
  brand text,
  color text,
  category text,
  size text,
  season text,
  notes text,
  photo_path text,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  box_name text,
  box_location text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_q       text := btrim(coalesce(p_query, ''));
  v_tsquery tsquery;
  v_like    text;
begin
  if v_q = '' then
    return;
  end if;

  select to_tsquery('simple'::regconfig, string_agg(w || ':*', ' & '))
    into v_tsquery
    from regexp_split_to_table(lower(public.immutable_unaccent(v_q)), '[^[:alnum:]]+') as w
   where w <> '';

  v_like := '%' || replace(replace(replace(public.immutable_unaccent(v_q), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
    select i.id, i.box_id, i.name, i.brand, i.color, i.category, i.size, i.season, i.notes,
           i.photo_path, i.created_by, i.created_at, i.updated_at,
           b.name as box_name, b.location as box_location
      from public.items i
      join public.boxes b on b.id = i.box_id
     where (v_tsquery is not null and i.search @@ v_tsquery)
        or public.immutable_unaccent(i.name)     ilike v_like
        or public.immutable_unaccent(i.brand)    ilike v_like
        or public.immutable_unaccent(i.color)    ilike v_like
        or public.immutable_unaccent(i.category) ilike v_like
     order by case when v_tsquery is not null then ts_rank(i.search, v_tsquery) else 0 end desc,
              (public.immutable_unaccent(i.name) ilike v_like) desc,
              i.updated_at desc
     limit 50;
end;
$$;

-- Grant RPC: solo utenti autenticati.
revoke all on function public.share_box(uuid, text, text),
                       public.revoke_share(uuid, uuid),
                       public.move_item(uuid, uuid),
                       public.search_items(text)
  from public, anon;
grant execute on function public.share_box(uuid, text, text),
                          public.revoke_share(uuid, uuid),
                          public.move_item(uuid, uuid),
                          public.search_items(text)
  to authenticated, service_role;

-- Funzioni interne di trigger: non esposte come RPC.
revoke all on function public.handle_new_user(), public.handle_user_email_change(),
  public.set_updated_at(), public.box_shares_reject_owner(), public.boxes_owner_immutable(),
  public.items_created_by_immutable(), public.log_item_event()
  from public, anon, authenticated;

-- Views ---------------------------------------------------------------------
create view public.box_overview
with (security_invoker = true)
as
  select b.*,
         public.box_role(b.id) as my_role,
         (select count(*) from public.items i where i.box_id = b.id)::int as item_count,
         p.email as owner_email
    from public.boxes b
    left join public.profiles p on p.id = b.owner_id
   order by b.updated_at desc;

create view public.box_share_members
with (security_invoker = true)
as
  select s.*, p.email, p.display_name
    from public.box_shares s
    join public.profiles p on p.id = s.user_id;

revoke all on public.box_overview, public.box_share_members from anon;
grant select on public.box_overview, public.box_share_members to authenticated, service_role;
