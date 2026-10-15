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

-- RPC move_item (CONTRACT §4)
select qa.as_user(qa.bob());
select throws_ok(format($$select move_item(%L, qa.libri())$$, qa.item('Maglione blu')), 'P0001', 'forbidden', 'move_item: bob da Inverno (viewer) → forbidden');
select throws_ok(format($$select move_item(%L, qa.inverno())$$, qa.item('Costume rosso')), 'P0001', 'forbidden', 'move_item: bob verso Inverno (viewer) → forbidden');
select qa.as_user(qa.carol());
select throws_ok(format($$select move_item(%L, qa.estate())$$, qa.item('Maglione blu')), 'P0001', 'forbidden', 'move_item: carol → forbidden');
select qa.as_user(qa.alice());
select throws_ok(format($$select move_item(%L, qa.libri())$$, qa.item('Maglione blu')), 'P0001', 'forbidden', 'move_item: alice verso Libri → forbidden');
select throws_ok(format($$select move_item(%L, qa.inverno())$$, qa.item('nome della rosa')), 'P0001', 'forbidden', 'move_item: alice da Libri → forbidden');
select qa.as_postgres();
select results_eq($$select box_id from items where name = 'Maglione blu'$$, array[qa.inverno()], 'dopo i forbidden il maglione è ancora in Inverno');

select qa.as_user(qa.alice());
select results_eq(format($$select (m).box_id, (m).name from (select move_item(%L, qa.estate()) m) x$$, qa.item('Maglione blu')),
  $$values (qa.estate(), 'Maglione blu'::text)$$, 'move_item: alice Inverno → Estate restituisce l''item aggiornato');
select results_eq($$select action, box_id, from_box_id, actor_id from item_events where item_name = 'Maglione blu' and action = 'moved'$$,
  $$values ('moved'::text, qa.estate(), qa.inverno(), qa.alice())$$, 'move_item: evento moved con from/to e actor');
select qa.as_user(qa.bob());
select results_eq(format($$select (move_item(%L, qa.libri())).box_id$$, qa.item('Maglione blu')), array[qa.libri()],
  'move_item: bob Estate (editor) → Libri (owner)');
select qa.as_user(qa.alice());
select is_empty(format($$select 1 from items where id = %L$$, qa.item('Maglione blu')), 'alice non vede più il maglione (ora in Libri)');

select * from finish();
rollback;
