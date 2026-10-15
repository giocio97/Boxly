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

-- Trigger storico su items (CONTRACT §2)
select qa.as_user(qa.alice());
insert into items(id, box_id, name, color) values ('22222222-0000-0000-0000-000000000001', qa.inverno(), 'Guanti', 'nero');
select results_eq($$select action, item_name, box_id, from_box_id, actor_id from item_events where item_id = '22222222-0000-0000-0000-000000000001'$$,
  $$values ('added'::text, 'Guanti'::text, qa.inverno(), null::uuid, qa.alice())$$, 'insert → added');
update items set color = 'grigio' where id = '22222222-0000-0000-0000-000000000001';
select results_eq($$select action from item_events where item_id = '22222222-0000-0000-0000-000000000001' order by id$$,
  array['added','updated'], 'update campi → updated');
update items set box_id = qa.estate() where id = '22222222-0000-0000-0000-000000000001';
select results_eq($$select action, box_id, from_box_id from item_events where item_id = '22222222-0000-0000-0000-000000000001' order by id desc limit 1$$,
  $$values ('moved'::text, qa.estate(), qa.inverno())$$, 'update box_id → moved (box_id destinazione, from origine)');
select is((select count(*)::int from item_events where item_id = '22222222-0000-0000-0000-000000000001' and action = 'updated'), 1,
  'uno spostamento non genera anche un evento updated');

-- bob (editor su Estate) modifica: actor = bob
select qa.as_user(qa.bob());
update items set size = 'L' where id = '22222222-0000-0000-0000-000000000001';
select results_eq($$select action, actor_id from item_events where item_id = '22222222-0000-0000-0000-000000000001' order by id desc limit 1$$,
  $$values ('updated'::text, qa.bob())$$, 'actor_id = utente che modifica');

-- delete → removed, l'evento sopravvive all'item
select qa.as_user(qa.alice());
delete from items where id = '22222222-0000-0000-0000-000000000001';
select results_eq($$select action, item_name, box_id from item_events where item_id = '22222222-0000-0000-0000-000000000001' order by id desc limit 1$$,
  $$values ('removed'::text, 'Guanti'::text, qa.estate())$$, 'delete → removed (evento sopravvive all''item)');
select results_eq($$select action from item_events where item_id = '22222222-0000-0000-0000-000000000001' order by id$$,
  array['added','updated','moved','updated','removed'], 'storico completo nell''ordine atteso');
select is((select count(*)::int from items where id = '22222222-0000-0000-0000-000000000001'), 0, 'item eliminato');

-- update senza modifiche reali non genera 'updated'
select qa.as_user(qa.alice());
select qa.affected(format($$update items set name = name where id = %L$$, qa.item('Costume rosso'))) is null as _ignored;
select is((select count(*)::int from item_events where item_name = 'Costume rosso' and action = 'updated'), 0, 'update no-op non genera updated');
-- spostamento che cambia anche altri campi → solo moved
select qa.affected(format($$update items set box_id = qa.estate(), notes = 'spostato' where id = %L$$, qa.item('Piumino nero'))) is null as _ignored;
select results_eq($$select action from item_events where item_name = 'Piumino nero' order by id$$, array['added','moved'], 'move + altri campi → solo moved');


-- spostamento Inverno → Estate, poi cancellazione di Inverno: from_box_id diventa null
select qa.as_user(qa.alice());
select move_item(qa.item('Sciarpa grigia'), qa.estate());
select lives_ok($$delete from boxes where id = qa.inverno()$$, 'eliminare una scatola con oggetti non fallisce (nessun evento removed in conflitto)');
select qa.as_postgres();
select is((select count(*)::int from item_events where box_id = qa.inverno()), 0, 'eventi della scatola eliminata rimossi in cascata');
select results_eq($$select from_box_id from item_events where item_name = 'Sciarpa grigia' and action = 'moved'$$,
  array[null::uuid], 'from_box_id → null quando la scatola di origine viene eliminata');
select is((select count(*)::int from item_events where action = 'removed' and item_name in ('Maglione blu','Piumino nero')), 0,
  'nessun evento removed per gli oggetti cancellati con la scatola');

-- seed: gli oggetti seed hanno un evento added
select is((select count(*)::int from item_events where action = 'added' and box_id = qa.estate()) >= 2, true, 'seed: eventi added per Estate');

select * from finish();
rollback;
