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

-- RPC share_box / revoke_share / move_item (CONTRACT §4)
-- share_box: errori
select qa.as_user(qa.bob());
select throws_ok($$select share_box(qa.inverno(), 'carol@boxly.test', 'viewer')$$, 'P0001', 'not_owner', 'share_box: bob viewer → not_owner');
select throws_ok($$select share_box(qa.estate(), 'carol@boxly.test', 'viewer')$$, 'P0001', 'not_owner', 'share_box: bob editor → not_owner');
select qa.as_user(qa.carol());
select throws_ok($$select share_box(qa.inverno(), 'carol@boxly.test', 'editor')$$, 'P0001', 'not_owner', 'share_box: carol → not_owner');
select qa.as_user(qa.alice());
select throws_ok($$select share_box(qa.inverno(), 'carol@boxly.test', 'owner')$$, 'P0001', 'invalid_role', 'share_box: ruolo owner → invalid_role');
select throws_ok($$select share_box(qa.inverno(), 'carol@boxly.test', 'admin')$$, 'P0001', 'invalid_role', 'share_box: ruolo admin → invalid_role');
select throws_ok($$select share_box(qa.inverno(), 'nessuno@boxly.test', 'viewer')$$, 'P0001', 'user_not_found', 'share_box: email sconosciuta → user_not_found');
select throws_ok($$select share_box(qa.inverno(), 'alice@boxly.test', 'viewer')$$, 'P0001', 'cannot_share_with_self', 'share_box: se stessa → cannot_share_with_self');
select throws_ok($$select share_box(qa.inverno(), 'ALICE@Boxly.test', 'editor')$$, 'P0001', 'cannot_share_with_self', 'share_box: se stessa (maiuscole) → cannot_share_with_self');
select throws_ok($$select share_box(qa.libri(), 'carol@boxly.test', 'viewer')$$, 'P0001', 'not_owner', 'share_box: alice su Libri → not_owner');
select qa.as_anon();
select ok(qa.try($$select share_box(qa.inverno(), 'carol@boxly.test', 'viewer')$$) <> 'ok', 'share_box: anon non può condividere');

-- share_box: successo, case-insensitive, upsert
select qa.as_user(qa.alice());
select results_eq($$select (s).box_id, (s).user_id, (s).role from (select share_box(qa.inverno(), 'CAROL@Boxly.Test', 'viewer') s) x$$,
  $$values (qa.inverno(), qa.carol(), 'viewer'::text)$$, 'share_box: alice condivide Inverno con carol (email case-insensitive) e restituisce la riga');
select qa.as_user(qa.carol());
select results_eq($$select box_role(qa.inverno())$$, array['viewer'], 'carol ora è viewer su Inverno');
select set_eq($$select id from boxes$$, array[qa.inverno()], 'carol ora vede Inverno');
select is((select count(*)::int from items), 3, 'carol vede i 3 oggetti di Inverno');
select is(left(qa.try($$insert into items(box_id, name) values (qa.inverno(), 'X')$$), 5), '42501', 'carol viewer non aggiunge oggetti');
select qa.as_user(qa.alice());
select results_eq($$select (share_box(qa.inverno(), 'carol@boxly.test', 'editor')).role$$, array['editor'], 'share_box: upsert a editor');
select qa.as_postgres();
select is((select count(*)::int from box_shares where box_id = qa.inverno() and user_id = qa.carol()), 1, 'upsert: una sola riga');
select qa.as_user(qa.alice());
select results_eq($$select (share_box(qa.inverno(), 'bob@boxly.test', 'editor')).role$$, array['editor'], 'share_box: promuove bob a editor');
select qa.as_user(qa.bob());
select is(qa.affected(format($$update items set notes = 'ok' where id = %L$$, qa.item('Maglione blu'))), 1, 'bob ora modifica Inverno');
select qa.as_user(qa.alice());
select lives_ok($$select share_box(qa.inverno(), 'bob@boxly.test', 'viewer')$$, 'share_box: riporta bob a viewer');

-- revoke_share
select qa.as_user(qa.bob());
select throws_ok($$select revoke_share(qa.inverno(), qa.carol())$$, 'P0001', 'not_owner', 'revoke_share: bob revoca carol → not_owner');
select qa.as_user(qa.carol());
select throws_ok($$select revoke_share(qa.inverno(), qa.bob())$$, 'P0001', 'not_owner', 'revoke_share: carol revoca bob → not_owner');
select qa.as_user(qa.bob());
select throws_ok($$select revoke_share(qa.estate(), qa.carol())$$, 'P0001', 'not_owner', 'revoke_share: bob (editor) revoca altri su Estate → not_owner');
select qa.as_user(qa.alice());
select lives_ok($$select revoke_share(qa.inverno(), qa.carol())$$, 'revoke_share: alice revoca carol');
select qa.as_user(qa.carol());
select is_empty($$select id from boxes$$, 'carol non vede più Inverno');
select qa.as_user(qa.bob());
select lives_ok($$select revoke_share(qa.estate(), qa.bob())$$, 'revoke_share: bob abbandona Estate');
select set_eq($$select id from boxes$$, array[qa.inverno(), qa.libri()], 'bob non vede più Estate');
select qa.as_user(qa.alice());
select lives_ok($$select revoke_share(qa.inverno(), qa.bob())$$, 'revoke_share: alice revoca bob da Inverno');
select qa.as_user(qa.bob());
select set_eq($$select id from boxes$$, array[qa.libri()], 'bob vede solo Libri');
select qa.as_postgres();
select is((select count(*)::int from box_shares), 0, 'nessuna condivisione rimasta');

-- dettagli implementativi dichiarati da backend
select qa.as_user(qa.alice());
select lives_ok($$select revoke_share(qa.inverno(), qa.carol())$$, 'revoke_share su share inesistente è un no-op');
select qa.as_anon();
select throws_ok($$select revoke_share(qa.inverno(), qa.bob())$$, '42501', null, 'revoke_share non eseguibile da anon');
select throws_ok(format($$select move_item(%L, qa.estate())$$, qa.item('Maglione blu')), '42501', null, 'move_item non eseguibile da anon');
select qa.as_postgres();
select throws_ok($$insert into box_shares(box_id, user_id, role) values (qa.inverno(), qa.alice(), 'viewer')$$, 'P0001', 'cannot_share_with_self', 'trigger: owner non inseribile in box_shares');

select * from finish();
rollback;
