-- Boxly — schema (CONTRACT §2)

create extension if not exists unaccent with schema extensions;

-- unaccent() è solo STABLE (dipende dal search_path per trovare il dizionario):
-- per usarla in una colonna generata serve una wrapper IMMUTABLE che fissa il
-- dizionario con nome qualificato.
create or replace function public.immutable_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null unique,
  display_name text,
  created_at   timestamptz not null default now()
);

-- Profilo creato automaticamente alla registrazione.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Dettaglio implementativo: se l'email cambia in auth.users la teniamo allineata
-- (share_box cerca per email).
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email and new.email is not null)
  execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- boxes
-- ---------------------------------------------------------------------------
create table public.boxes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- 1–80 caratteri; un nome di soli spazi non è valido.
  name       text not null check (char_length(btrim(name)) >= 1 and char_length(name) <= 80),
  location   text,
  season     text check (season in ('spring', 'summer', 'autumn', 'winter', 'all')),
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index boxes_owner_id_idx on public.boxes (owner_id);

create trigger boxes_set_updated_at
  before update on public.boxes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------------
create table public.items (
  id         uuid primary key default gen_random_uuid(),
  box_id     uuid not null references public.boxes (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) >= 1 and char_length(name) <= 120),
  brand      text,
  color      text,
  category   text,
  size       text,
  season     text check (season in ('spring', 'summer', 'autumn', 'winter', 'all')),
  notes      text,
  photo_path text,
  -- Nessuna FK: il contratto non la prevede (created_by è informativo).
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search     tsvector generated always as (
    to_tsvector(
      'simple'::regconfig,
      public.immutable_unaccent(
        coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(color, '') || ' ' ||
        coalesce(category, '') || ' ' || coalesce(size, '') || ' ' || coalesce(notes, '')
      )
    )
  ) stored
);

create index items_box_id_idx on public.items (box_id);
create index items_search_idx on public.items using gin (search);

create trigger items_set_updated_at
  before update on public.items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- box_shares
-- ---------------------------------------------------------------------------
create table public.box_shares (
  box_id     uuid not null references public.boxes (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role       text not null check (role in ('viewer', 'editor')),
  created_at timestamptz not null default now(),
  primary key (box_id, user_id)
);

create index box_shares_user_id_idx on public.box_shares (user_id);

-- L'owner non può comparire tra le condivisioni della propria scatola.
create or replace function public.box_shares_reject_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.boxes b where b.id = new.box_id and b.owner_id = new.user_id) then
    raise exception 'cannot_share_with_self';
  end if;
  return new;
end;
$$;

create trigger box_shares_reject_owner
  before insert or update on public.box_shares
  for each row execute function public.box_shares_reject_owner();

-- ---------------------------------------------------------------------------
-- item_events (scritta solo dai trigger, vedi migrazione history)
-- ---------------------------------------------------------------------------
create table public.item_events (
  id          bigserial primary key,
  item_id     uuid,  -- nessuna FK: l'evento sopravvive alla cancellazione dell'item
  item_name   text not null,
  box_id      uuid not null references public.boxes (id) on delete cascade,
  from_box_id uuid references public.boxes (id) on delete set null,
  action      text not null check (action in ('added', 'updated', 'moved', 'removed')),
  actor_id    uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create index item_events_box_id_idx on public.item_events (box_id, created_at desc);
create index item_events_from_box_id_idx on public.item_events (from_box_id);
create index item_events_item_id_idx on public.item_events (item_id);
