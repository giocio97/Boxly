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

-- search_items e view (CONTRACT §4; v2: chiamate a 1 argomento usano il default p_type = null)
select qa.as_user(qa.alice());
select results_eq($$select name, box_name, box_location from search_items('maglione blu')$$,
  $$values ('Maglione blu'::text, 'Inverno 2025'::text, 'Cantina'::text)$$, 'alice trova "maglione blu" in Inverno 2025 / Cantina');
select ok(exists(select 1 from search_items('magl') where name = 'Maglione blu'), 'ricerca per prefisso "magl"');
select ok(exists(select 1 from search_items('MAGLIONE') where name = 'Maglione blu'), 'ricerca case-insensitive');
select ok(exists(select 1 from search_items('uniqlo') where name = 'Maglione blu'), 'ricerca per brand');
select ok(exists(select 1 from search_items('north face') where name = 'Piumino nero'), 'ricerca per brand multi-parola');
select ok(exists(select 1 from search_items('aglio') where name = 'Maglione blu'), 'ilike a metà parola ("aglio")');
select is_empty($$select 1 from search_items('rosa')$$, 'alice non trova il libro di bob');
select is_empty($$select 1 from search_items('zzzznonesiste')$$, 'nessun risultato per testo inesistente');
select qa.as_user(qa.bob());
select results_eq($$select name, box_name from search_items('maglione blu')$$,
  $$values ('Maglione blu'::text, 'Inverno 2025'::text)$$, 'bob (viewer) trova "maglione blu"');
select ok(exists(select 1 from search_items('rosa')), 'bob trova il proprio libro');
select qa.as_user(qa.carol());
select is_empty($$select 1 from search_items('maglione blu')$$, 'carol non trova nulla');
select is_empty($$select 1 from search_items('maglione')$$, 'carol non trova nulla (singola parola)');
-- accenti (unaccent)
select qa.as_user(qa.alice());
insert into items(box_id, name, notes) values (qa.estate(), 'Felpa', 'perfetta per l''università');
select ok(exists(select 1 from search_items('universita') where name = 'Felpa'), 'ricerca senza accento trova testo accentato (unaccent)');
-- limite 50
select qa.as_postgres();
insert into items(box_id, name, created_by) select qa.estate(), 'Calzino ' || g, qa.alice() from generate_series(1, 60) g;
select qa.as_user(qa.alice());
select is((select count(*)::int from search_items('calzino')), 50, 'max 50 risultati');

-- box_overview
select qa.as_user(qa.bob());
select results_eq($$select id, my_role, item_count::int, owner_email from box_overview order by id$$,
  $$values (qa.inverno(), 'viewer'::text, 3, 'alice@boxly.test'::text),
           (qa.estate(), 'editor'::text, 63, 'alice@boxly.test'::text),
           (qa.libri(), 'owner'::text, 2, 'bob@boxly.test'::text)$$, 'box_overview per bob: ruoli, conteggi, owner_email');
select qa.as_user(qa.carol());
select is_empty($$select 1 from box_overview$$, 'box_overview vuota per carol');
select qa.as_user(qa.alice());
update boxes set notes = 'recente' where id = qa.inverno();
select results_eq($$select id from box_overview limit 1$$, array[qa.inverno()], 'box_overview ordinata per updated_at desc');

-- box_share_members
select qa.as_user(qa.alice());
select set_eq($$select box_id, user_id, role, email from box_share_members$$,
  $$values (qa.inverno(), qa.bob(), 'viewer'::text, 'bob@boxly.test'::text), (qa.estate(), qa.bob(), 'editor'::text, 'bob@boxly.test'::text)$$,
  'box_share_members per alice con email');
select qa.as_user(qa.carol());
select is_empty($$select 1 from box_share_members$$, 'box_share_members vuota per carol');

select qa.as_user(qa.alice());
select is_empty($$select 1 from search_items('')$$, 'search_items vuota → nessun risultato');
select is_empty($$select 1 from search_items('   ')$$, 'search_items solo spazi → nessun risultato');
select lives_ok($$select * from search_items('maglione & | ! :* (')$$, 'search_items con caratteri speciali tsquery non va in errore');
select lives_ok($$select * from search_items('%_')$$, 'search_items con caratteri jolly ilike non va in errore');
select is_empty($$select 1 from search_items('%')$$, 'search_items("%") non restituisce tutto');

select * from finish();
rollback;
