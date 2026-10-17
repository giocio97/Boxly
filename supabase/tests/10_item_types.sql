-- Stivo QA (v2) — generato da prelude + corpo test. Eseguire con: supabase test db
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

-- =====================================================================
-- v2.2 Tipi di oggetto: colonne, vincoli, RLS, storico, search_items, view, seed
-- =====================================================================

-- ---- Schema ----
select has_column('public', 'items', 'item_type', 'items.item_type');
select col_not_null('public', 'items', 'item_type', 'items.item_type not null');
select col_type_is('public', 'items', 'item_type', 'text', 'items.item_type è text');
select col_default_is('public', 'items', 'item_type', 'other', 'items.item_type default ''other''');
select has_column('public', 'items', 'attributes', 'items.attributes');
select col_not_null('public', 'items', 'attributes', 'items.attributes not null');
select col_type_is('public', 'items', 'attributes', 'jsonb', 'items.attributes è jsonb');
select has_column('public', 'boxes', 'default_item_type', 'boxes.default_item_type');
select col_is_null('public', 'boxes', 'default_item_type', 'boxes.default_item_type nullable');
select col_type_is('public', 'boxes', 'default_item_type', 'text', 'boxes.default_item_type è text');
select has_function('public', 'search_items', array['text','text'], 'search_items(p_query text, p_type text)');

-- ---- Seed v2 (CONTRACT v2.2) ----
select results_eq($$select id, default_item_type from boxes where id in (qa.inverno(), qa.estate(), qa.libri()) order by id$$,
  $$values (qa.inverno(), 'clothing'::text), (qa.estate(), 'clothing'::text), (qa.libri(), 'books'::text)$$, 'seed: default_item_type di Inverno, Estate, Libri');
select is_empty($$select name from items where box_id in (qa.inverno(), qa.estate()) and (item_type <> 'clothing' or attributes <> '{}')$$,
  'seed: oggetti di Inverno ed Estate tutti clothing con attributes {}');
select results_eq($$select item_type, attributes from items where name = 'Libro "Il nome della rosa"'$$,
  $$values ('books'::text, '{"author":"Umberto Eco"}'::jsonb)$$, 'seed: Il nome della rosa → books, author Umberto Eco');
select results_eq($$select box_id, item_type, attributes from items where name = 'Kindle Paperwhite'$$,
  $$values (qa.libri(), 'electronics'::text, '{"model":"Paperwhite 11","serial":"G000ABC123"}'::jsonb)$$, 'seed: Kindle Paperwhite in Libri, electronics, model+serial');
select ok(exists(select 1 from item_events where item_name = 'Kindle Paperwhite' and action = 'added' and box_id = qa.libri()), 'seed: evento added per il Kindle');

-- scatola di appoggio privata di alice (non condivisa: non inquina i risultati di bob)
select qa.as_postgres();
insert into boxes(id, owner_id, name) values ('44444444-0000-0000-0000-000000000001', qa.alice(), 'QA tmp');
create or replace function qa.tmp() returns uuid language sql immutable as $$ select '44444444-0000-0000-0000-000000000001'::uuid $$;
grant execute on function qa.tmp() to anon, authenticated;
-- default su insert senza tipo
insert into items(id, box_id, name, created_by) values ('33333333-0000-0000-0000-000000000001', qa.tmp(), 'Senza tipo', qa.alice());
select results_eq($$select item_type, attributes from items where id = '33333333-0000-0000-0000-000000000001'$$,
  $$values ('other'::text, '{}'::jsonb)$$, 'insert senza tipo → item_type other, attributes {}');

-- ---- Vincoli item_type ----
select is(qa.try(format($$insert into items(box_id, name, created_by, item_type) values (qa.tmp(), 'T %s', qa.alice(), %L)$$, t, t)), 'ok',
  'item_type valido accettato: ' || t)
  from unnest(array['clothing','shoes_accessories','books','electronics','home_kitchen','toys_games','documents','other']) t;
select is(left(qa.try($$insert into items(box_id, name, created_by, item_type) values (qa.tmp(), 'x', qa.alice(), 'furniture')$$), 5), '23514', 'item_type non valido rifiutato (furniture)');
select is(left(qa.try($$insert into items(box_id, name, created_by, item_type) values (qa.tmp(), 'x', qa.alice(), 'Books')$$), 5), '23514', 'item_type case-sensitive (Books rifiutato)');
select is(left(qa.try($$insert into items(box_id, name, created_by, item_type) values (qa.tmp(), 'x', qa.alice(), '')$$), 5), '23514', 'item_type vuoto rifiutato');
select is(left(qa.try($$insert into items(box_id, name, created_by, item_type) values (qa.tmp(), 'x', qa.alice(), null)$$), 5), '23502', 'item_type null rifiutato');
select is(left(qa.try($$update items set item_type = 'furniture' where name = 'Maglione blu'$$), 5), '23514', 'update a item_type non valido rifiutato');

-- ---- Vincoli attributes ----
select is(qa.try($$insert into items(box_id, name, created_by, item_type, attributes) values (qa.tmp(), 'x', qa.alice(), 'electronics', '{"author":"a","model":"m","serial":"s"}')$$), 'ok', 'attributes con author/model/serial stringa accettato');
select is(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), '{}')$$), 'ok', 'attributes {} accettato');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), '{"color":"rosso"}')$$), 5), '23514', 'chiave attributes non ammessa (color) rifiutata');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), '{"author":"a","isbn":"1"}')$$), 5), '23514', 'chiave ammessa + chiave non ammessa (isbn) rifiutata');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), '{"Author":"a"}')$$), 5), '23514', 'chiave case-sensitive (Author) rifiutata');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), '[]')$$), 5), '23514', 'attributes array rifiutato');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), '"testo"')$$), 5), '23514', 'attributes stringa JSON rifiutato');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), 'null'::jsonb)$$), 5), '23514', 'attributes JSON null rifiutato');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), null)$$), 5), '23502', 'attributes SQL null rifiutato');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), '{"author":1}')$$), 5), '23514', 'valore numerico in attributes rifiutato');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), '{"model":{"a":"b"}}')$$), 5), '23514', 'valore oggetto in attributes rifiutato');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), '{"serial":null}')$$), 5), '23514', 'valore null in attributes rifiutato');
select is(left(qa.try($$insert into items(box_id, name, created_by, attributes) values (qa.tmp(), 'x', qa.alice(), '{"serial":["a"]}')$$), 5), '23514', 'valore array in attributes rifiutato');

-- ---- Vincoli default_item_type ----
select is(qa.try($$insert into boxes(owner_id, name, default_item_type) values (qa.alice(), 'B null', null)$$), 'ok', 'default_item_type null accettato');
select is(qa.try(format($$insert into boxes(owner_id, name, default_item_type) values (qa.alice(), 'B %s', %L)$$, t, t)), 'ok',
  'default_item_type valido accettato: ' || t)
  from unnest(array['clothing','shoes_accessories','books','electronics','home_kitchen','toys_games','documents','other']) t;
select is(left(qa.try($$insert into boxes(owner_id, name, default_item_type) values (qa.alice(), 'x', 'furniture')$$), 5), '23514', 'default_item_type non valido rifiutato');
select is(left(qa.try($$insert into boxes(owner_id, name, default_item_type) values (qa.alice(), 'x', '')$$), 5), '23514', 'default_item_type vuoto rifiutato');
select ok((select default_item_type is null from boxes where name = 'B null'), 'nuova scatola senza default_item_type → null');

-- ---- Colonna search include attributes ----
select ok((select search @@ to_tsquery('simple', 'eco') from items where name = 'Libro "Il nome della rosa"'), 'items.search contiene attributes.author');
select ok((select search @@ to_tsquery('simple', 'g000abc123') from items where name = 'Kindle Paperwhite'), 'items.search contiene attributes.serial');

-- ---- RLS invariata sulle nuove colonne ----
select qa.as_user(qa.bob());
select ok(qa.denied(format($$update items set item_type = 'other' where id = %L$$, qa.item('Maglione blu'))), 'bob (viewer Inverno) non cambia item_type');
select ok(qa.denied(format($$update items set attributes = '{"model":"x"}' where id = %L$$, qa.item('Sciarpa grigia'))), 'bob (viewer Inverno) non cambia attributes');
select is(qa.affected(format($$update items set item_type = 'shoes_accessories' where id = %L$$, qa.item('Costume rosso'))), 1, 'bob (editor Estate) cambia item_type');
select is(qa.affected(format($$update items set attributes = '{"model":"Bikini"}' where id = %L$$, qa.item('Costume rosso'))), 1, 'bob (editor Estate) cambia attributes');
select ok(qa.denied($$update boxes set default_item_type = 'books' where id = qa.inverno()$$), 'bob (viewer) non cambia default_item_type di Inverno');
select is(qa.affected($$update boxes set default_item_type = 'shoes_accessories' where id = qa.estate()$$), 1, 'bob (editor) cambia default_item_type di Estate');
select is(qa.affected($$update boxes set default_item_type = null where id = qa.libri()$$), 1, 'bob (owner) azzera default_item_type di Libri');
select is(qa.try($$insert into items(box_id, name, item_type, attributes) values (qa.libri(), 'Dune', 'books', '{"author":"Frank Herbert"}')$$), 'ok', 'bob inserisce un libro con autore');
select qa.as_user(qa.alice());
select ok(qa.denied($$update boxes set default_item_type = 'books' where id = qa.libri()$$), 'alice non cambia default_item_type di Libri');
select is(left(qa.try($$insert into items(box_id, name, item_type) values (qa.libri(), 'Intruso', 'books')$$), 5), '42501', 'alice non inserisce oggetti tipizzati in Libri');
select is_empty($$select attributes from items where box_id = qa.libri()$$, 'alice non legge attributes degli oggetti di Libri');
select qa.as_user(qa.carol());
select is_empty($$select item_type, attributes from items$$, 'carol non legge item_type/attributes');
select is_empty($$select default_item_type from boxes$$, 'carol non legge default_item_type');
select ok(qa.denied($$update items set item_type = 'other' where true$$), 'carol non cambia item_type');
select ok(qa.denied($$update boxes set default_item_type = 'other' where true$$), 'carol non cambia default_item_type');
select qa.as_anon();
select ok(qa.denied($$update items set attributes = '{}' where true$$), 'anon non cambia attributes');

-- ---- Storico: cambio tipo / attributes → updated ----
select qa.as_user(qa.alice());
select is((select count(*)::int from item_events where item_name = 'Piumino nero' and action = 'updated'), 0, 'Piumino: nessun updated iniziale');
update items set item_type = 'shoes_accessories' where name = 'Piumino nero';
select is((select count(*)::int from item_events where item_name = 'Piumino nero' and action = 'updated'), 1, 'cambio item_type → evento updated');
update items set attributes = '{"model":"Nuptse"}' where name = 'Piumino nero';
select is((select count(*)::int from item_events where item_name = 'Piumino nero' and action = 'updated'), 2, 'cambio attributes → evento updated');
select results_eq($$select action, actor_id, box_id from item_events where item_name = 'Piumino nero' order by id desc limit 1$$,
  $$values ('updated'::text, qa.alice(), qa.inverno())$$, 'evento updated con attore e scatola');
update items set attributes = '{"model":"Nuptse"}', item_type = 'shoes_accessories' where name = 'Piumino nero';
select is((select count(*)::int from item_events where item_name = 'Piumino nero' and action = 'updated'), 2, 'update no-op di tipo/attributes non genera eventi');
select lives_ok(format($$select move_item(%L, qa.estate())$$, qa.item('Piumino nero')), 'alice sposta Piumino in Estate');
update items set item_type = 'clothing', box_id = qa.inverno() where name = 'Piumino nero';
select results_eq($$select action from item_events where item_name = 'Piumino nero' order by id desc limit 2$$,
  array['moved','moved'], 'move + cambio tipo → solo moved');

-- ---- search_items(p_query, p_type) ----
select qa.as_user(qa.bob());
select results_eq($$select name, item_type, attributes->>'author', box_name from search_items('eco')$$,
  $$values ('Libro "Il nome della rosa"'::text, 'books'::text, 'Umberto Eco'::text, 'Libri'::text)$$, 'bob trova "Il nome della rosa" per autore ("eco")');
select ok(exists(select 1 from search_items('umberto') where name = 'Libro "Il nome della rosa"'), 'ricerca per nome dell''autore ("umberto")');
select ok(exists(select 1 from search_items('ECO') where name = 'Libro "Il nome della rosa"'), 'ricerca per autore case-insensitive');
select ok(exists(select 1 from search_items('herb') where name = 'Dune'), 'ricerca per prefisso dell''autore ("herb")');
select ok(exists(select 1 from search_items('g000abc123') where name = 'Kindle Paperwhite'), 'ricerca per seriale');
select ok(exists(select 1 from search_items('G000ABC') where name = 'Kindle Paperwhite'), 'ricerca per prefisso del seriale');
insert into items(box_id, name, item_type, attributes) values (qa.libri(), 'Cuffie', 'electronics', '{"model":"Zentrix 700"}');
select ok(exists(select 1 from search_items('zentrix') where name = 'Cuffie'), 'ricerca per modello ("zentrix")');
select ok(exists(select 1 from search_items('zentrix 700') where name = 'Cuffie'), 'ricerca per modello multi-parola');
select ok(exists(select 1 from search_items('bikini') where name = 'Costume rosso'), 'ricerca per modello aggiornato via update');
-- filtro p_type
select results_eq($$select name from search_items('eco', 'books')$$, array['Libro "Il nome della rosa"'], 'eco + books → il libro');
select is_empty($$select 1 from search_items('eco', 'electronics')$$, 'eco + electronics → vuoto');
select ok(exists(select 1 from search_items('maglione', 'clothing') where name = 'Maglione blu'), 'maglione + clothing → Maglione blu');
select is_empty($$select 1 from search_items('maglione', 'books')$$, 'maglione + books → vuoto');
select ok(exists(select 1 from search_items('maglione', null) where name = 'Maglione blu'), 'p_type null esplicito = nessun filtro');
select ok(not exists(select 1 from search_items('a', 'books') where item_type <> 'books'), 'con p_type, nessun risultato di altro tipo');
-- query vuota + tipo
select set_eq($$select name from search_items('', 'books')$$, array['Libro "Il nome della rosa"','Dune'], 'query vuota + books → tutti i libri leggibili da bob');
select set_eq($$select name from search_items('', 'electronics')$$, array['Kindle Paperwhite','Cuffie'], 'query vuota + electronics → Kindle e Cuffie');
select set_eq($$select name from search_items('   ', 'books')$$, array['Libro "Il nome della rosa"','Dune'], 'query di soli spazi + tipo = query vuota + tipo');
select is_empty($$select 1 from search_items('', 'documents')$$, 'query vuota + tipo senza oggetti → vuoto');
select set_eq($$select name from search_items('', 'clothing')$$, array['Maglione blu','Piumino nero','Sciarpa grigia','Camicia lino bianca'],
  'query vuota + clothing → oggetti clothing di Inverno ed Estate (Costume ora shoes_accessories)');
-- now() è costante nella transazione: forziamo updated_at con i trigger utente disattivati
select qa.as_postgres();
alter table items disable trigger user;
update items set updated_at = '2030-01-01' where name = 'Libro "Il nome della rosa"';
update items set updated_at = '2029-01-01' where name = 'Dune';
select qa.as_user(qa.bob());
select results_eq($$select name from search_items('', 'books')$$, array['Libro "Il nome della rosa"', 'Dune'], 'query vuota + tipo ordinata per updated_at desc (1)');
select qa.as_postgres();
update items set updated_at = '2031-01-01' where name = 'Dune';
select qa.as_user(qa.bob());
select results_eq($$select name from search_items('', 'books')$$, array['Dune', 'Libro "Il nome della rosa"'], 'query vuota + tipo ordinata per updated_at desc (2)');
select qa.as_postgres();
alter table items enable trigger user;
select qa.as_user(qa.bob());
-- query vuota senza tipo
select is_empty($$select 1 from search_items('', null)$$, 'query vuota + p_type null → vuoto');
select is_empty($$select 1 from search_items('')$$, 'query vuota senza p_type → vuoto');
-- tipo non valido
select throws_ok($$select * from search_items('maglione', 'furniture')$$, 'P0001', 'invalid_type', 'p_type non valido → invalid_type');
select throws_ok($$select * from search_items('', 'furniture')$$, 'P0001', 'invalid_type', 'query vuota + p_type non valido → invalid_type');
select throws_ok($$select * from search_items('maglione', '')$$, 'P0001', 'invalid_type', 'p_type stringa vuota → invalid_type');
-- utente senza accesso
select qa.as_user(qa.carol());
select is_empty($$select 1 from search_items('eco')$$, 'carol: "eco" → niente');
select is_empty($$select 1 from search_items('g000abc123')$$, 'carol: seriale → niente');
select is_empty($$select 1 from search_items('', 'books')$$, 'carol: query vuota + books → niente');
select is_empty($$select 1 from search_items('', 'clothing')$$, 'carol: query vuota + clothing → niente');
select is_empty($$select 1 from search_items('maglione', 'clothing')$$, 'carol: maglione + clothing → niente');
-- alice non vede gli oggetti di Libri
select qa.as_user(qa.alice());
select is_empty($$select 1 from search_items('eco')$$, 'alice: "eco" → niente (Libri è di bob)');
select is_empty($$select 1 from search_items('', 'electronics') where box_id = qa.libri()$$, 'alice: query vuota + electronics → niente di Libri (solo i suoi)');
-- anon
select qa.as_anon();
select is(left(qa.try($$select * from search_items('eco', 'books')$$), 5), '42501', 'anon: search_items negata');
-- limite 50 su query vuota + tipo
select qa.as_postgres();
insert into items(box_id, name, created_by, item_type) select qa.estate(), 'Gioco ' || g, qa.alice(), 'toys_games' from generate_series(1, 60) g;
select qa.as_user(qa.alice());
select is((select count(*)::int from search_items('', 'toys_games')), 50, 'query vuota + tipo: max 50 risultati');
select is((select count(*)::int from search_items('gioco', 'toys_games')), 50, 'query + tipo: max 50 risultati');

-- ---- View ----
select has_column('public', 'box_overview', 'default_item_type', 'box_overview espone default_item_type');
select ok(coalesce((select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.box_overview'::regclass), false),
  'box_overview resta security_invoker dopo la ricreazione');
select ok(coalesce((select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.box_share_members'::regclass), false),
  'box_share_members resta security_invoker dopo la ricreazione');
select qa.as_user(qa.bob());
select results_eq($$select id, default_item_type, my_role from box_overview where id in (qa.inverno(), qa.estate(), qa.libri()) order by id$$,
  $$values (qa.inverno(), 'clothing'::text, 'viewer'::text), (qa.estate(), 'shoes_accessories'::text, 'editor'::text), (qa.libri(), null::text, 'owner'::text)$$,
  'box_overview per bob: default_item_type aggiornato e ruoli');
select qa.as_user(qa.carol());
select is_empty($$select default_item_type from box_overview$$, 'box_overview: carol non vede nulla');

select * from finish();
rollback;
