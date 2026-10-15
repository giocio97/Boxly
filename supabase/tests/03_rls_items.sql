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

-- RLS items (CONTRACT §3)
-- SELECT
select qa.as_user(qa.alice());
select set_eq($$select name from items$$, array['Maglione blu','Piumino nero','Sciarpa grigia','Costume rosso','Camicia lino bianca'], 'alice vede 5 oggetti');
select qa.as_user(qa.bob());
select is((select count(*)::int from items), 6, 'bob vede 6 oggetti');
select qa.as_user(qa.carol());
select is_empty($$select id from items$$, 'carol non vede oggetti');
select qa.as_anon();
select is_empty($$select id from items$$, 'anon non vede oggetti');

-- INSERT
select qa.as_user(qa.alice());
select is(qa.try($$insert into items(box_id, name) values (qa.inverno(), 'Guanti')$$), 'ok', 'alice aggiunge a Inverno');
select results_eq($$select created_by from items where name = 'Guanti'$$, array[qa.alice()], 'created_by default auth.uid()');
select is(left(qa.try($$insert into items(box_id, name, created_by) values (qa.inverno(), 'Spoof', qa.bob())$$), 5), '42501', 'alice non inserisce con created_by altrui');
select is(left(qa.try($$insert into items(box_id, name) values (qa.libri(), 'Intruso')$$), 5), '42501', 'alice non aggiunge a Libri');
select qa.as_user(qa.bob());
select is(qa.try($$insert into items(box_id, name) values (qa.estate(), 'Infradito')$$), 'ok', 'bob (editor) aggiunge a Estate');
select is(left(qa.try($$insert into items(box_id, name) values (qa.inverno(), 'Cappello')$$), 5), '42501', 'bob (viewer) non aggiunge a Inverno');
select is(qa.try($$insert into items(box_id, name) values (qa.libri(), 'Dune')$$), 'ok', 'bob (owner) aggiunge a Libri');
select qa.as_user(qa.carol());
select is(left(qa.try($$insert into items(box_id, name) values (qa.inverno(), 'X')$$), 5), '42501', 'carol non aggiunge a Inverno');
select is(left(qa.try($$insert into items(box_id, name) values (qa.estate(), 'X')$$), 5), '42501', 'carol non aggiunge a Estate');

-- UPDATE
select qa.as_user(qa.bob());
select ok(qa.denied(format($$update items set color = 'azzurro' where id = %L$$, qa.item('Maglione blu'))), 'bob (viewer) non modifica oggetti di Inverno');
select is(qa.affected(format($$update items set color = 'rosso fuoco' where id = %L$$, qa.item('Costume rosso'))), 1, 'bob (editor) modifica oggetti di Estate');
select is(left(qa.try(format($$update items set box_id = qa.inverno() where id = %L$$, qa.item('Camicia lino bianca'))), 5), '42501',
  'bob non sposta da Estate a Inverno (viewer sulla destinazione)');
select ok(qa.denied(format($$update items set box_id = qa.estate() where id = %L$$, qa.item('Sciarpa grigia'))),
  'bob non sposta da Inverno (viewer sull''origine)');
select is(qa.affected(format($$update items set box_id = qa.libri() where id = %L$$, qa.item('Camicia lino bianca'))), 1,
  'bob sposta da Estate (editor) a Libri (owner)');
select qa.as_user(qa.alice());
select is(left(qa.try(format($$update items set box_id = qa.libri() where id = %L$$, qa.item('Costume rosso'))), 5), '42501',
  'alice non sposta verso Libri (nessun accesso)');
select is(qa.affected(format($$update items set box_id = qa.estate() where id = %L$$, qa.item('Piumino nero'))), 1, 'alice sposta Inverno → Estate');
select qa.as_user(qa.carol());
select ok(qa.denied($$update items set notes = 'x' where true$$), 'carol non modifica oggetti');

-- DELETE
select qa.as_user(qa.carol());
select ok(qa.denied($$delete from items where true$$), 'carol non elimina oggetti');
select qa.as_user(qa.bob());
select ok(qa.denied(format($$delete from items where id = %L$$, qa.item('Maglione blu'))), 'bob (viewer) non elimina da Inverno');
select is(qa.affected(format($$delete from items where id = %L$$, qa.item('Costume rosso'))), 1, 'bob (editor) elimina da Estate');
select qa.as_user(qa.alice());
select ok(qa.denied(format($$delete from items where id = %L$$, qa.item('Il nome della rosa'))), 'alice non elimina da Libri');
select is(qa.affected(format($$delete from items where id = %L$$, qa.item('Maglione blu'))), 1, 'alice elimina da Inverno');

select * from finish();
rollback;
