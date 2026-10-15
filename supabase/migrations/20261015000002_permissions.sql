-- Boxly — permessi: helper, RLS, storage (CONTRACT §3)

-- ---------------------------------------------------------------------------
-- Helper (security definer: leggono boxes/box_shares senza passare da RLS,
-- così le policy non vanno in ricorsione).
-- ---------------------------------------------------------------------------
create or replace function public.box_role(box_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when b.owner_id = auth.uid() then 'owner'
           else (select s.role
                   from public.box_shares s
                  where s.box_id = b.id and s.user_id = auth.uid())
         end
    from public.boxes b
   where b.id = box_role.box_id
     and auth.uid() is not null
$$;

create or replace function public.can_read_box(box_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select public.box_role(can_read_box.box_id) is not null $$;

create or replace function public.can_edit_box(box_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(public.box_role(can_edit_box.box_id) in ('owner', 'editor'), false) $$;

-- true se l'utente corrente e p_user_id hanno entrambi un ruolo (owner o share)
-- su almeno una stessa scatola. Usata dalla policy select di profiles.
-- Dettaglio: include anche due utenti a cui è condivisa la stessa scatola
-- (serve a box_share_members, leggibile da chi può leggere la scatola).
create or replace function public.shares_box_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select b.id from public.boxes b where b.owner_id = auth.uid()
    union
    select s.box_id from public.box_shares s where s.user_id = auth.uid()
  ), theirs as (
    select b.id from public.boxes b where b.owner_id = p_user_id
    union
    select s.box_id from public.box_shares s where s.user_id = p_user_id
  )
  select auth.uid() is not null
     and exists (select 1 from mine join theirs using (id))
$$;

-- Box della foto: primo segmento del path `<item_id>/<file>` → items.box_id.
-- Path malformato → null (quindi nessun permesso).
create or replace function public.item_photo_box_id(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_item_id uuid;
  v_box_id  uuid;
begin
  begin
    v_item_id := (storage.foldername(object_name))[1]::uuid;
  exception when invalid_text_representation then
    return null;
  end;
  select i.box_id into v_box_id from public.items i where i.id = v_item_id;
  return v_box_id;
end;
$$;

revoke all on function public.box_role(uuid), public.can_read_box(uuid), public.can_edit_box(uuid),
  public.shares_box_with(uuid), public.item_photo_box_id(text) from public;
grant execute on function public.box_role(uuid), public.can_read_box(uuid), public.can_edit_box(uuid),
  public.shares_box_with(uuid), public.item_photo_box_id(text) to anon, authenticated, service_role;
grant execute on function public.immutable_unaccent(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Colonne immutabili
-- ---------------------------------------------------------------------------
-- boxes.owner_id immutabile (contratto). Dettaglio: anche items.created_by.
-- Il trigger scatta solo se il valore cambia, così un update che reinvia
-- l'intera riga non fallisce.
create or replace function public.boxes_owner_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'forbidden';
  end if;
  return new;
end;
$$;

create trigger boxes_owner_immutable
  before update on public.boxes
  for each row execute function public.boxes_owner_immutable();

create or replace function public.items_created_by_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'forbidden';
  end if;
  return new;
end;
$$;

create trigger items_created_by_immutable
  before update on public.items
  for each row execute function public.items_created_by_immutable();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.boxes       enable row level security;
alter table public.items       enable row level security;
alter table public.box_shares  enable row level security;
alter table public.item_events enable row level security;

-- profiles ------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_box_with(id));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Dettaglio: l'utente può modificare solo display_name (email/id sono gestiti
-- da auth e usati da share_box).
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- boxes ---------------------------------------------------------------------
-- `owner_id = auth.uid()` esplicito: in un INSERT ... RETURNING la funzione
-- can_read_box (stable, snapshot dell'istruzione) non vede ancora la nuova riga.
create policy boxes_select on public.boxes
  for select to authenticated
  using (owner_id = auth.uid() or public.can_read_box(id));

create policy boxes_insert on public.boxes
  for insert to authenticated
  with check (owner_id = auth.uid());

create policy boxes_update on public.boxes
  for update to authenticated
  using (public.can_edit_box(id))
  with check (public.can_edit_box(id));

create policy boxes_delete on public.boxes
  for delete to authenticated
  using (owner_id = auth.uid());

-- items ---------------------------------------------------------------------
create policy items_select on public.items
  for select to authenticated
  using (public.can_read_box(box_id));

create policy items_insert on public.items
  for insert to authenticated
  with check (public.can_edit_box(box_id) and created_by = auth.uid());

-- using = scatola vecchia, with check = scatola nuova
create policy items_update on public.items
  for update to authenticated
  using (public.can_edit_box(box_id))
  with check (public.can_edit_box(box_id));

create policy items_delete on public.items
  for delete to authenticated
  using (public.can_edit_box(box_id));

-- box_shares ----------------------------------------------------------------
create policy box_shares_select on public.box_shares
  for select to authenticated
  using (public.can_read_box(box_id));

-- insert/update solo via RPC (security definer): nessuna policy.
-- delete diretto: solo l'utente stesso (abbandona); l'owner usa revoke_share.
create policy box_shares_delete_self on public.box_shares
  for delete to authenticated
  using (user_id = auth.uid());

revoke insert, update on public.box_shares from anon, authenticated;

-- item_events ---------------------------------------------------------------
create policy item_events_select on public.item_events
  for select to authenticated
  using (public.can_read_box(box_id) or public.can_read_box(from_box_id));

revoke insert, update, delete on public.item_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: bucket privato item-photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('item-photos', 'item-photos', false, 10485760)  -- 10 MB
on conflict (id) do nothing;

create policy item_photos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'item-photos' and public.can_read_box(public.item_photo_box_id(name)));

create policy item_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'item-photos' and public.can_edit_box(public.item_photo_box_id(name)));

create policy item_photos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'item-photos' and public.can_edit_box(public.item_photo_box_id(name)))
  with check (bucket_id = 'item-photos' and public.can_edit_box(public.item_photo_box_id(name)));

create policy item_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'item-photos' and public.can_edit_box(public.item_photo_box_id(name)));
