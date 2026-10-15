-- Boxly — storico item_events (CONTRACT §2)

create or replace function public.log_item_event()
returns trigger
language plpgsql
security definer  -- item_events non ha policy di insert
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.item_events (item_id, item_name, box_id, action, actor_id)
    values (new.id, new.name, new.box_id, 'added', auth.uid());
    return new;

  elsif tg_op = 'UPDATE' then
    if new.box_id is distinct from old.box_id then
      -- Dettaglio: uno spostamento con altri campi modificati insieme genera
      -- un solo evento 'moved'.
      insert into public.item_events (item_id, item_name, box_id, from_box_id, action, actor_id)
      values (new.id, new.name, new.box_id, old.box_id, 'moved', auth.uid());
    elsif (new.name, new.brand, new.color, new.category, new.size, new.season, new.notes, new.photo_path)
          is distinct from
          (old.name, old.brand, old.color, old.category, old.size, old.season, old.notes, old.photo_path) then
      insert into public.item_events (item_id, item_name, box_id, action, actor_id)
      values (new.id, new.name, new.box_id, 'updated', auth.uid());
    end if;
    -- Dettaglio: un update senza modifiche reali non genera eventi.
    return new;

  else -- DELETE
    -- Se la scatola è in cancellazione (delete a cascata) la riga in boxes non
    -- è più visibile: non scriviamo l'evento (verrebbe comunque cancellato
    -- e violerebbe la FK).
    if exists (select 1 from public.boxes b where b.id = old.box_id) then
      insert into public.item_events (item_id, item_name, box_id, action, actor_id)
      values (old.id, old.name, old.box_id, 'removed', auth.uid());
    end if;
    return old;
  end if;
end;
$$;

create trigger items_log_event
  after insert or update or delete on public.items
  for each row execute function public.log_item_event();
