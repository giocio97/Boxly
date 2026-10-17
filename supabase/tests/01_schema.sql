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

-- Schema, RLS, helper e bucket (CONTRACT §2-§4)
select has_table('public', t, 'tabella ' || t || ' esiste')
  from unnest(array['profiles','boxes','items','box_shares','item_events']) t;
select ok((select relrowsecurity from pg_class where oid = ('public.' || t)::regclass), 'RLS attiva su ' || t)
  from unnest(array['profiles','boxes','items','box_shares','item_events']) t;
select has_view('public', 'box_overview', 'view box_overview');
select has_view('public', 'box_share_members', 'view box_share_members');
select ok(coalesce((select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.box_overview'::regclass), false),
  'box_overview è security_invoker');
select ok(coalesce((select 'security_invoker=true' = any(reloptions) from pg_class where oid = 'public.box_share_members'::regclass), false),
  'box_share_members è security_invoker');
select has_function('public', 'box_role', array['uuid'], 'box_role(uuid)');
select has_function('public', 'can_read_box', array['uuid'], 'can_read_box(uuid)');
select has_function('public', 'can_edit_box', array['uuid'], 'can_edit_box(uuid)');
select has_function('public', 'share_box', array['uuid','text','text'], 'share_box(uuid,text,text)');
select has_function('public', 'revoke_share', array['uuid','uuid'], 'revoke_share(uuid,uuid)');
select has_function('public', 'move_item', array['uuid','uuid'], 'move_item(uuid,uuid)');
select has_function('public', 'search_items', array['text','text'], 'search_items(text,text) (v2)');
select hasnt_function('public', 'search_items', array['text'], 'search_items(text) a 1 argomento rimossa (v2)');
select ok((select prosecdef from pg_proc where oid = 'public.box_role(uuid)'::regprocedure), 'box_role è security definer');
select is((select provolatile::text from pg_proc where oid = 'public.box_role(uuid)'::regprocedure), 's', 'box_role è stable');
select ok(not (select prosecdef from pg_proc where oid = 'public.search_items(text,text)'::regprocedure), 'search_items è security invoker');
select has_column('public', 'items', 'search', 'items.search (tsvector generated)');
select is((select attgenerated::text from pg_attribute where attrelid = 'public.items'::regclass and attname = 'search'), 's', 'items.search è generated stored');
select ok(exists(select 1 from pg_index i join pg_class c on c.oid = i.indexrelid join pg_am a on a.oid = c.relam
  where i.indrelid = 'public.items'::regclass and a.amname = 'gin'), 'indice GIN su items');
select col_is_pk('public', 'box_shares', array['box_id','user_id'], 'pk (box_id,user_id) su box_shares');

-- Vincoli
select is(qa.try($$insert into boxes(owner_id,name) values (qa.alice(), '')$$) like '23514%', true, 'name scatola vuoto rifiutato');
select is(qa.try($$insert into boxes(owner_id,name) values (qa.alice(), repeat('x',81))$$) like '23514%', true, 'name scatola >80 rifiutato');
select is(qa.try($$insert into boxes(owner_id,name) values (qa.alice(), repeat('x',80))$$), 'ok', 'name scatola di 80 accettato');
select is(qa.try($$insert into boxes(owner_id,name,season) values (qa.alice(), 'x', 'monsoon')$$) like '23514%', true, 'season non valida rifiutata');
select is(qa.try($$insert into items(box_id,name,created_by) values (qa.inverno(), repeat('x',121), qa.alice())$$) like '23514%', true, 'name item >120 rifiutato');
select is(qa.try($$insert into items(box_id,name,created_by,season) values (qa.inverno(), 'x', qa.alice(), 'nope')$$) like '23514%', true, 'season item non valida rifiutata');
select is(qa.try($$insert into box_shares(box_id,user_id,role) values (qa.libri(), qa.carol(), 'owner')$$) like '23514%', true, 'role share non valido rifiutato');
select isnt(qa.try($$insert into box_shares(box_id,user_id,role) values (qa.inverno(), qa.alice(), 'viewer')$$), 'ok', 'owner non può comparire in box_shares');
select is(qa.try($$insert into item_events(item_name,box_id,action) values ('x', qa.inverno(), 'exploded')$$) like '23514%', true, 'action evento non valida rifiutata');

-- Seed (CONTRACT §5)
select results_eq($$select email from profiles order by email$$,
  array['alice@boxly.test','bob@boxly.test','carol@boxly.test']::text[], 'seed: 3 profili');
select ok(exists(select 1 from auth.identities where user_id = qa.alice() and provider = 'email'), 'seed: identity email per alice');
select ok((select encrypted_password = crypt('password123', encrypted_password) from auth.users where id = qa.bob()), 'seed: password bcrypt di bob = password123');
select results_eq($$select name, owner_id, location, season from boxes where id in (qa.inverno(), qa.estate(), qa.libri()) order by id$$,
  $$values ('Inverno 2025', qa.alice(), 'Cantina', 'winter'), ('Estate', qa.alice(), 'Armadio camera', 'summer'), ('Libri', qa.bob(), 'Garage', 'all')$$,
  'seed: 3 scatole con owner/luogo/stagione');
select results_eq($$select box_id, user_id, role from box_shares order by box_id$$,
  $$values (qa.inverno(), qa.bob(), 'viewer'), (qa.estate(), qa.bob(), 'editor')$$, 'seed: condivisioni bob');
select results_eq($$select box_id, count(*)::int from items group by box_id order by box_id$$,
  $$values (qa.inverno(), 3), (qa.estate(), 2), (qa.libri(), 2)$$, 'seed: numero oggetti per scatola (v2: + Kindle in Libri)');
select results_eq($$select brand, color, size from items where name = 'Maglione blu'$$,
  $$values ('Uniqlo'::text, 'blu'::text, 'M'::text)$$, 'seed: Maglione blu completo');

-- Trigger profilo su signup
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-0000000000dd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        'dave@boxly.test', '{"display_name":"Dave"}', now(), now());
select results_eq($$select email, display_name from profiles where id = '00000000-0000-0000-0000-0000000000dd'$$,
  $$values ('dave@boxly.test'::text, 'Dave'::text)$$, 'trigger signup crea profilo con display_name');

-- Bucket
select results_eq($$select public from storage.buckets where id = 'item-photos'$$, array[false], 'bucket item-photos esiste ed è privato');

-- updated_at
select qa.as_postgres();
update boxes set updated_at = '2000-01-01' where id = qa.libri();
update boxes set notes = 'touch' where id = qa.libri();
select ok((select updated_at > '2001-01-01' from boxes where id = qa.libri()), 'trigger updated_at su boxes');
update items set updated_at = '2000-01-01' where name = 'Sciarpa grigia';
update items set notes = 'touch' where name = 'Sciarpa grigia';
select ok((select updated_at > '2001-01-01' from items where name = 'Sciarpa grigia'), 'trigger updated_at su items');

select * from finish();
rollback;
