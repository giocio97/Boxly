-- Boxly QA — generato da prelude + corpo test. Eseguire con: supabase test db
begin;
-- ---- QA prelude (duplicato in ogni file: ogni file gira in una transazione isolata) ----
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
create schema if not exists qa;
grant usage on schema qa to anon, authenticated;

-- Impersona un utente come farebbe PostgREST (role + JWT claims)
create or replace function qa.as_user(p_id uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
end $$;
create or replace function qa.as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
create or replace function qa.as_postgres() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
-- Esegue SQL e restituisce 'ok' oppure '<sqlstate>:<messaggio>'
create or replace function qa.try(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return 'ok';
exception when others then
  return sqlstate || ':' || sqlerrm;
end $$;
-- Numero di righe toccate da un DML (0 = filtrato da RLS)
create or replace function qa.affected(p_sql text) returns int language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end $$;
-- true se l'operazione è negata: errore 42501 oppure 0 righe toccate (filtrate da RLS)
create or replace function qa.denied(p_sql text) returns boolean language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n = 0;
exception when insufficient_privilege then
  return true;
end $$;
-- Id di un oggetto seed per nome (bypassa RLS)
create or replace function qa.item(p_name text) returns uuid language sql security definer
  set search_path = public as $$ select id from public.items where name = p_name or name ilike '%' || p_name || '%' order by (name = p_name) desc limit 1 $$;
grant execute on all functions in schema qa to anon, authenticated;

-- UUID fissi del seed (CONTRACT §5)
create or replace function qa.alice() returns uuid language sql immutable as $$ select '00000000-0000-0000-0000-00000000000a'::uuid $$;
create or replace function qa.bob()   returns uuid language sql immutable as $$ select '00000000-0000-0000-0000-00000000000b'::uuid $$;
create or replace function qa.carol() returns uuid language sql immutable as $$ select '00000000-0000-0000-0000-00000000000c'::uuid $$;
create or replace function qa.inverno() returns uuid language sql immutable as $$ select '11111111-1111-1111-1111-000000000001'::uuid $$;
create or replace function qa.estate()  returns uuid language sql immutable as $$ select '11111111-1111-1111-1111-000000000002'::uuid $$;
create or replace function qa.libri()   returns uuid language sql immutable as $$ select '11111111-1111-1111-1111-000000000003'::uuid $$;
grant execute on all functions in schema qa to anon, authenticated;
-- ---- fine prelude ----
select * from no_plan();

-- Storage policy bucket item-photos (CONTRACT §3)
-- path: <item_id>/<file>.jpg
-- La Storage API abilita i DELETE diretti con questa GUC; senza, storage.protect_delete li blocca per tutti.
set local storage.allow_delete_query = 'true';
select qa.as_user(qa.alice());
select is(qa.try(format($$insert into storage.objects(bucket_id, name, owner) values ('item-photos', %L, qa.alice())$$,
  qa.item('Maglione blu') || '/a.jpg')), 'ok', 'alice (owner) carica foto per un item di Inverno');
select qa.as_user(qa.bob());
select is(left(qa.try(format($$insert into storage.objects(bucket_id, name, owner) values ('item-photos', %L, qa.bob())$$,
  qa.item('Piumino nero') || '/b.jpg')), 5), '42501', 'bob (viewer) non carica foto in Inverno');
select is(qa.try(format($$insert into storage.objects(bucket_id, name, owner) values ('item-photos', %L, qa.bob())$$,
  qa.item('Costume rosso') || '/c.jpg')), 'ok', 'bob (editor) carica foto in Estate');
select is((select count(*)::int from storage.objects where bucket_id = 'item-photos' and name = qa.item('Maglione blu') || '/a.jpg'), 1,
  'bob (viewer) legge la foto di Inverno');
select ok(qa.denied(format($$delete from storage.objects where bucket_id = 'item-photos' and name = %L$$, qa.item('Maglione blu') || '/a.jpg')),
  'bob (viewer) non cancella la foto di Inverno');
select qa.as_user(qa.carol());
select is_empty($$select 1 from storage.objects where bucket_id = 'item-photos'$$, 'carol non vede foto');
select is(left(qa.try(format($$insert into storage.objects(bucket_id, name, owner) values ('item-photos', %L, qa.carol())$$,
  qa.item('Maglione blu') || '/x.jpg')), 5), '42501', 'carol non carica foto');
select ok(qa.denied($$delete from storage.objects where bucket_id = 'item-photos'$$), 'carol non cancella foto');
select qa.as_user(qa.alice());
select is(left(qa.try($$insert into storage.objects(bucket_id, name, owner) values ('item-photos', '99999999-9999-9999-9999-999999999999/x.jpg', qa.alice())$$), 5),
  '42501', 'upload rifiutato se l''item non esiste');
select isnt(qa.try($$insert into storage.objects(bucket_id, name, owner) values ('item-photos', 'not-a-uuid/x.jpg', qa.alice())$$), 'ok',
  'upload rifiutato con path non valido');
select is(qa.affected(format($$update storage.objects set metadata = '{}' where bucket_id = 'item-photos' and name = %L$$, qa.item('Costume rosso') || '/c.jpg')), 1,
  'alice (owner) aggiorna la foto caricata da bob');
select is(qa.affected(format($$delete from storage.objects where bucket_id = 'item-photos' and name = %L$$, qa.item('Maglione blu') || '/a.jpg')), 1,
  'alice cancella la propria foto');
select qa.as_anon();
select is_empty($$select 1 from storage.objects where bucket_id = 'item-photos'$$, 'anon non vede foto');

select * from finish();
rollback;
