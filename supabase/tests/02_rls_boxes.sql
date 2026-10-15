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

-- RLS boxes + box_role/can_* (CONTRACT §3)
-- box_role
select qa.as_user(qa.alice());
select results_eq($$select box_role(qa.inverno()), box_role(qa.estate()), box_role(qa.libri())$$,
  $$values ('owner'::text, 'owner'::text, null::text)$$, 'box_role alice');
select results_eq($$select can_read_box(qa.inverno()), can_edit_box(qa.inverno()), can_read_box(qa.libri()), can_edit_box(qa.libri())$$,
  $$values (true, true, false, false)$$, 'can_read/can_edit alice');
select qa.as_user(qa.bob());
select results_eq($$select box_role(qa.inverno()), box_role(qa.estate()), box_role(qa.libri())$$,
  $$values ('viewer'::text, 'editor'::text, 'owner'::text)$$, 'box_role bob');
select results_eq($$select can_read_box(qa.inverno()), can_edit_box(qa.inverno()), can_read_box(qa.estate()), can_edit_box(qa.estate())$$,
  $$values (true, false, true, true)$$, 'can_read/can_edit bob');
select qa.as_user(qa.carol());
select results_eq($$select box_role(qa.inverno()), box_role(qa.estate()), box_role(qa.libri())$$,
  $$values (null::text, null::text, null::text)$$, 'box_role carol tutto null');
select results_eq($$select can_read_box(qa.inverno()), can_edit_box(qa.estate())$$, $$values (false, false)$$, 'carol non legge né modifica');

-- SELECT
select qa.as_user(qa.alice());
select set_eq($$select id from boxes$$, array[qa.inverno(), qa.estate()], 'alice vede Inverno e Estate');
select qa.as_user(qa.bob());
select set_eq($$select id from boxes$$, array[qa.inverno(), qa.estate(), qa.libri()], 'bob vede 3 scatole');
select qa.as_user(qa.carol());
select is_empty($$select id from boxes$$, 'carol non vede scatole');
select qa.as_anon();
select is_empty($$select id from boxes$$, 'anon non vede scatole');

-- INSERT
select qa.as_user(qa.carol());
select is(qa.try($$insert into boxes(name) values ('Carol box')$$), 'ok', 'carol crea una propria scatola (owner_id default)');
select results_eq($$select owner_id from boxes where name = 'Carol box'$$, array[qa.carol()], 'owner_id = auth.uid() di default');
select is(left(qa.try($$insert into boxes(owner_id, name) values (qa.alice(), 'spoof')$$), 5), '42501', 'carol non crea scatole a nome di alice');
select qa.as_user(qa.bob());
select is(left(qa.try($$insert into boxes(owner_id, name) values (qa.alice(), 'spoof')$$), 5), '42501', 'bob non crea scatole a nome di alice');
select qa.as_anon();
select is(left(qa.try($$insert into boxes(owner_id, name) values (qa.alice(), 'anon')$$), 5), '42501', 'anon non crea scatole');

-- UPDATE
select qa.as_user(qa.alice());
select is(qa.affected($$update boxes set notes = 'a' where id = qa.inverno()$$), 1, 'alice (owner) aggiorna Inverno');
select ok(qa.denied($$update boxes set notes = 'a' where id = qa.libri()$$), 'alice non aggiorna Libri');
select qa.as_user(qa.bob());
select is(qa.affected($$update boxes set notes = 'b' where id = qa.estate()$$), 1, 'bob (editor) aggiorna Estate');
select ok(qa.denied($$update boxes set notes = 'b' where id = qa.inverno()$$), 'bob (viewer) non aggiorna Inverno');
select is(qa.affected($$update boxes set notes = 'b' where id = qa.libri()$$), 1, 'bob (owner) aggiorna Libri');
select qa.as_user(qa.carol());
select ok(qa.denied($$update boxes set notes = 'c' where id in (qa.inverno(), qa.estate(), qa.libri())$$), 'carol non aggiorna nessuna scatola');

-- owner_id immutabile
select qa.as_user(qa.alice());
select qa.try($$update boxes set owner_id = qa.bob() where id = qa.inverno()$$) is null as _ignored;
select qa.as_user(qa.bob());
select qa.try($$update boxes set owner_id = qa.bob() where id = qa.estate()$$) is null as _ignored;
select qa.as_postgres();
select results_eq($$select owner_id from boxes where id in (qa.inverno(), qa.estate())$$, array[qa.alice(), qa.alice()],
  'owner_id immutabile (owner ed editor non lo cambiano)');

-- DELETE
select qa.as_user(qa.bob());
select ok(qa.denied($$delete from boxes where id = qa.estate()$$), 'bob (editor) non elimina Estate');
select ok(qa.denied($$delete from boxes where id = qa.inverno()$$), 'bob (viewer) non elimina Inverno');
select qa.as_user(qa.carol());
select ok(qa.denied($$delete from boxes where id in (qa.inverno(), qa.estate(), qa.libri())$$), 'carol non elimina scatole altrui');
select qa.as_user(qa.alice());
select ok(qa.denied($$delete from boxes where id = qa.libri()$$), 'alice non elimina Libri');
select is(qa.affected($$delete from boxes where id = qa.inverno()$$), 1, 'alice elimina Inverno (con oggetti)');
select qa.as_user(qa.bob());
select is(qa.affected($$delete from boxes where id = qa.libri()$$), 1, 'bob elimina Libri (owner)');
select qa.as_postgres();
select is((select count(*)::int from items where box_id in (qa.inverno(), qa.libri())), 0, 'oggetti eliminati in cascata');
select is((select count(*)::int from box_shares where box_id = qa.inverno()), 0, 'condivisioni eliminate in cascata');

-- owner_id / created_by immutabili → forbidden
select qa.as_user(qa.alice());
select throws_ok($$update boxes set owner_id = qa.bob() where id = qa.estate()$$, 'P0001', 'forbidden', 'cambio owner_id → forbidden');
select throws_ok(format($$update items set created_by = qa.bob() where id = %L$$, qa.item('Costume rosso')), 'P0001', 'forbidden', 'cambio created_by → forbidden');
select qa.as_user(qa.carol());
select is(qa.try($$update profiles set email = 'x@x.it' where id = qa.carol()$$) <> 'ok', true, 'email del profilo non modificabile');

select * from finish();
rollback;
