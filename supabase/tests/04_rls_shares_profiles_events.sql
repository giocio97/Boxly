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

-- RLS box_shares, profiles, item_events (CONTRACT §3)
-- box_shares SELECT
select qa.as_user(qa.alice());
select is((select count(*)::int from box_shares), 2, 'alice vede le 2 condivisioni delle sue scatole');
select qa.as_user(qa.bob());
select is((select count(*)::int from box_shares), 2, 'bob vede le condivisioni delle scatole che legge');
select qa.as_user(qa.carol());
select is_empty($$select * from box_shares$$, 'carol non vede condivisioni');

-- box_shares scrittura diretta: solo via RPC
select qa.as_user(qa.alice());
select is(left(qa.try($$insert into box_shares(box_id, user_id, role) values (qa.inverno(), qa.carol(), 'viewer')$$), 5), '42501',
  'alice non inserisce condivisioni direttamente (solo RPC)');
select ok(qa.denied($$update box_shares set role = 'editor' where box_id = qa.inverno()$$), 'alice non aggiorna condivisioni direttamente');
select qa.as_user(qa.bob());
select ok(qa.denied($$update box_shares set role = 'editor' where box_id = qa.inverno()$$), 'bob non si auto-promuove a editor');
select is(left(qa.try($$insert into box_shares(box_id, user_id, role) values (qa.libri(), qa.carol(), 'viewer')$$), 5), '42501',
  'bob (owner Libri) non inserisce condivisioni direttamente');
select qa.as_user(qa.carol());
select is(left(qa.try($$insert into box_shares(box_id, user_id, role) values (qa.inverno(), qa.carol(), 'editor')$$), 5), '42501',
  'carol non si auto-condivide Inverno');
select ok(qa.denied($$delete from box_shares where true$$), 'carol non elimina condivisioni');
select qa.as_postgres();
select is((select count(*)::int from box_shares), 2, 'condivisioni intatte');
select qa.as_user(qa.bob());
select results_eq($$select role from box_shares where box_id = qa.inverno() and user_id = qa.bob()$$, array['viewer'], 'bob resta viewer su Inverno');

-- profiles
select qa.as_user(qa.alice());
select set_eq($$select email from profiles$$, array['alice@boxly.test','bob@boxly.test'], 'alice vede se stessa + bob');
select qa.as_user(qa.bob());
select set_eq($$select email from profiles$$, array['alice@boxly.test','bob@boxly.test'], 'bob vede se stesso + alice');
select qa.as_user(qa.carol());
select set_eq($$select email from profiles$$, array['carol@boxly.test'], 'carol vede solo se stessa');
select is(qa.affected($$update profiles set display_name = 'Carolina' where id = qa.carol()$$), 1, 'carol aggiorna il proprio profilo');
select ok(qa.denied($$update profiles set display_name = 'hack' where id = qa.alice()$$), 'carol non aggiorna il profilo di alice');
select qa.as_user(qa.bob());
select ok(qa.denied($$update profiles set display_name = 'hack' where id = qa.alice()$$), 'bob non aggiorna il profilo di alice');
select ok(qa.denied($$delete from profiles where id = qa.bob()$$), 'bob non elimina profili');
select qa.as_anon();
select is_empty($$select * from profiles$$, 'anon non vede profili');

-- item_events
select qa.as_user(qa.alice());
select ok((select count(*) from item_events) > 0, 'alice vede eventi (seed added)');
select ok(not exists(select 1 from item_events where box_id = qa.libri() or from_box_id = qa.libri()), 'alice non vede eventi di Libri');
select qa.as_user(qa.carol());
select is_empty($$select * from item_events$$, 'carol non vede eventi');
select qa.as_user(qa.alice());
select is(left(qa.try($$insert into item_events(item_name, box_id, action) values ('fake', qa.inverno(), 'added')$$), 5), '42501',
  'alice non scrive eventi direttamente');
select ok(qa.denied($$update item_events set item_name = 'x' where true$$), 'alice non aggiorna eventi');
select ok(qa.denied($$delete from item_events where true$$), 'alice non elimina eventi');
select qa.as_user(qa.bob());
select is(left(qa.try($$insert into item_events(item_name, box_id, action) values ('fake', qa.libri(), 'added')$$), 5), '42501',
  'bob (owner Libri) non scrive eventi direttamente');
select ok(qa.denied($$delete from item_events where true$$), 'bob non elimina eventi');
-- visibilità via from_box_id: bob sposta Camicia da Estate a Libri; alice vede l'evento grazie a from_box_id
select qa.as_user(qa.bob());
select lives_ok(format($$select move_item(%L, qa.libri())$$, qa.item('Camicia lino bianca')), 'bob sposta Camicia Estate → Libri');
select qa.as_user(qa.alice());
select results_eq($$select action, from_box_id from item_events where box_id = qa.libri()$$,
  $$values ('moved'::text, qa.estate())$$, 'alice vede l''evento moved verso Libri tramite from_box_id (e non gli altri di Libri)');

-- box_shares DELETE diretto: l'utente può rimuovere solo se stesso (CONTRACT §3)
select qa.as_user(qa.alice());
select ok(qa.denied($$delete from box_shares where box_id = qa.inverno() and user_id = qa.bob()$$), 'alice non elimina direttamente la share di bob (deve usare revoke_share)');
select qa.as_user(qa.bob());
select is(qa.affected($$delete from box_shares where box_id = qa.inverno() and user_id = qa.bob()$$), 1, 'bob elimina direttamente la propria share (abbandona)');
select is_empty($$select 1 from boxes where id = qa.inverno()$$, 'bob non vede più Inverno');

select * from finish();
rollback;
