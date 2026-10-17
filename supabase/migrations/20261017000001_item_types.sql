-- Stivo v2 — tipi di oggetto (CONTRACT v2.2)

-- ---------------------------------------------------------------------------
-- Colonne e check
-- ---------------------------------------------------------------------------
alter table public.items
  add column item_type text not null default 'other'
    constraint items_item_type_check
    check (item_type in ('clothing', 'shoes_accessories', 'books', 'electronics',
                         'home_kitchen', 'toys_games', 'documents', 'other')),
  add column attributes jsonb not null default '{}'::jsonb
    constraint items_attributes_check
    -- Il CASE garantisce l'ordine di valutazione: l'operatore `-` su uno
    -- scalare andrebbe in errore invece di violare il check.
    check (
      case when jsonb_typeof(attributes) = 'object' then
        (attributes - array['author', 'model', 'serial']) = '{}'::jsonb
        and coalesce(jsonb_typeof(attributes -> 'author'), 'string') = 'string'
        and coalesce(jsonb_typeof(attributes -> 'model'),  'string') = 'string'
        and coalesce(jsonb_typeof(attributes -> 'serial'), 'string') = 'string'
      else false end
    );

alter table public.boxes
  add column default_item_type text
    constraint boxes_default_item_type_check
    check (default_item_type in ('clothing', 'shoes_accessories', 'books', 'electronics',
                                 'home_kitchen', 'toys_games', 'documents', 'other'));

create index items_item_type_idx on public.items (item_type, updated_at desc);

-- ---------------------------------------------------------------------------
-- Colonna generata `search`: ora include author/model/serial
-- (una colonna generata non si può alterare: drop + add; l'indice GIN cade con lei)
-- ---------------------------------------------------------------------------
alter table public.items drop column search;

alter table public.items
  add column search tsvector generated always as (
    to_tsvector(
      'simple'::regconfig,
      public.immutable_unaccent(
        coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(color, '') || ' ' ||
        coalesce(category, '') || ' ' || coalesce(size, '') || ' ' || coalesce(notes, '') || ' ' ||
        coalesce(attributes ->> 'author', '') || ' ' || coalesce(attributes ->> 'model', '') || ' ' ||
        coalesce(attributes ->> 'serial', '')
      )
    )
  ) stored;

create index items_search_idx on public.items using gin (search);

-- ---------------------------------------------------------------------------
-- Storico: item_type e attributes generano 'updated'
-- (create or replace mantiene i privilegi già revocati)
-- ---------------------------------------------------------------------------
create or replace function public.log_item_event()
returns trigger
language plpgsql
security definer  -- item_events non ha policy di insert
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.item_events (item_id, item_name, box_id, action, actor_id)
    values (new.id, new.name, new.box_id, 'added', auth.uid());
    return new;

  elsif tg_op = 'UPDATE' then
    if new.box_id is distinct from old.box_id then
      insert into public.item_events (item_id, item_name, box_id, from_box_id, action, actor_id)
      values (new.id, new.name, new.box_id, old.box_id, 'moved', auth.uid());
    elsif (new.name, new.brand, new.color, new.category, new.size, new.season, new.notes, new.photo_path,
           new.item_type, new.attributes)
          is distinct from
          (old.name, old.brand, old.color, old.category, old.size, old.season, old.notes, old.photo_path,
           old.item_type, old.attributes) then
      insert into public.item_events (item_id, item_name, box_id, action, actor_id)
      values (new.id, new.name, new.box_id, 'updated', auth.uid());
    end if;
    return new;

  else -- DELETE
    if exists (select 1 from public.boxes b where b.id = old.box_id) then
      insert into public.item_events (item_id, item_name, box_id, action, actor_id)
      values (old.id, old.name, old.box_id, 'removed', auth.uid());
    end if;
    return old;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- View: ricreate perché `b.*` / `s.*` sono espansi alla creazione
-- ---------------------------------------------------------------------------
drop view public.box_overview;
drop view public.box_share_members;

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

-- ---------------------------------------------------------------------------
-- search_items(p_query, p_type)
--  * p_type non null e non valido → 'invalid_type';
--  * query non vuota: come v1 (prefissi in AND + fallback ilike), con match anche
--    su attributes (author/model/serial); filtro per tipo se p_type non è null;
--  * query vuota + p_type: tutti gli oggetti leggibili di quel tipo, updated_at desc;
--  * query vuota + p_type null: nessun risultato;
--  * sempre max 50 righe; RLS applicata (security invoker).
-- ---------------------------------------------------------------------------
drop function public.search_items(text);

create function public.search_items(p_query text, p_type text default null)
returns table (
  id uuid,
  box_id uuid,
  name text,
  item_type text,
  attributes jsonb,
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
  if p_type is not null
     and p_type not in ('clothing', 'shoes_accessories', 'books', 'electronics',
                        'home_kitchen', 'toys_games', 'documents', 'other') then
    raise exception 'invalid_type';
  end if;

  if v_q = '' then
    if p_type is null then
      return;
    end if;

    return query
      select i.id, i.box_id, i.name, i.item_type, i.attributes, i.brand, i.color, i.category,
             i.size, i.season, i.notes, i.photo_path, i.created_by, i.created_at, i.updated_at,
             b.name as box_name, b.location as box_location
        from public.items i
        join public.boxes b on b.id = i.box_id
       where i.item_type = p_type
       order by i.updated_at desc
       limit 50;
    return;
  end if;

  select to_tsquery('simple'::regconfig, string_agg(w || ':*', ' & '))
    into v_tsquery
    from regexp_split_to_table(lower(public.immutable_unaccent(v_q)), '[^[:alnum:]]+') as w
   where w <> '';

  v_like := '%' || replace(replace(replace(public.immutable_unaccent(v_q), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
    select i.id, i.box_id, i.name, i.item_type, i.attributes, i.brand, i.color, i.category,
           i.size, i.season, i.notes, i.photo_path, i.created_by, i.created_at, i.updated_at,
           b.name as box_name, b.location as box_location
      from public.items i
      join public.boxes b on b.id = i.box_id
     where (p_type is null or i.item_type = p_type)
       and (
             (v_tsquery is not null and i.search @@ v_tsquery)
          or public.immutable_unaccent(i.name)     ilike v_like
          or public.immutable_unaccent(i.brand)    ilike v_like
          or public.immutable_unaccent(i.color)    ilike v_like
          or public.immutable_unaccent(i.category) ilike v_like
          or public.immutable_unaccent(i.attributes ->> 'author') ilike v_like
          or public.immutable_unaccent(i.attributes ->> 'model')  ilike v_like
          or public.immutable_unaccent(i.attributes ->> 'serial') ilike v_like
       )
     order by case when v_tsquery is not null then ts_rank(i.search, v_tsquery) else 0 end desc,
              (public.immutable_unaccent(i.name) ilike v_like) desc,
              i.updated_at desc
     limit 50;
end;
$$;

revoke all on function public.search_items(text, text) from public, anon;
grant execute on function public.search_items(text, text) to authenticated, service_role;
