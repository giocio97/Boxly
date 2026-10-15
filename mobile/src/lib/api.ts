import type {
  BoxOverview,
  BoxShareMember,
  InsertBox,
  InsertItem,
  Item,
  ItemEvent,
  ItemSearchResult,
  Profile,
  ShareRole,
} from '@shared/types';

import { supabase } from './supabase';

type Result<T> = { data: T; error: null } | { data: null; error: { message: string; code?: string } };

function wrap<T>(data: unknown, error: { message: string; code?: string } | null): Result<T> {
  if (error) return { data: null, error };
  return { data: data as T, error: null };
}

// ---------- Scatole ----------
export async function listBoxes(): Promise<Result<BoxOverview[]>> {
  const { data, error } = await supabase.from('box_overview').select('*').order('updated_at', { ascending: false });
  return wrap(data ?? [], error);
}

export async function getBox(id: string): Promise<Result<BoxOverview | null>> {
  const { data, error } = await supabase.from('box_overview').select('*').eq('id', id).maybeSingle();
  return wrap(data, error);
}

export async function createBox(input: InsertBox): Promise<Result<{ id: string }>> {
  const { data, error } = await supabase.from('boxes').insert(input).select('id').single();
  return wrap(data, error);
}

export async function updateBox(id: string, input: InsertBox): Promise<Result<null>> {
  const { error } = await supabase.from('boxes').update(input).eq('id', id);
  return wrap(null, error);
}

export async function deleteBox(id: string): Promise<Result<null>> {
  const { error } = await supabase.from('boxes').delete().eq('id', id);
  return wrap(null, error);
}

// ---------- Oggetti ----------
export async function listItems(boxId: string): Promise<Result<Item[]>> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false });
  return wrap(data ?? [], error);
}

export async function getItem(id: string): Promise<Result<Item | null>> {
  const { data, error } = await supabase.from('items').select('*').eq('id', id).maybeSingle();
  return wrap(data, error);
}

export async function createItem(input: InsertItem): Promise<Result<Item>> {
  const { data, error } = await supabase.from('items').insert(input).select('*').single();
  return wrap(data, error);
}

export async function updateItem(id: string, input: Partial<InsertItem>): Promise<Result<null>> {
  const { error } = await supabase.from('items').update(input).eq('id', id);
  return wrap(null, error);
}

export async function deleteItem(id: string): Promise<Result<null>> {
  const { error } = await supabase.from('items').delete().eq('id', id);
  return wrap(null, error);
}

export async function moveItem(itemId: string, toBoxId: string): Promise<Result<Item>> {
  const { data, error } = await supabase.rpc('move_item', { p_item_id: itemId, p_to_box_id: toBoxId });
  return wrap(data, error);
}

export async function searchItems(query: string): Promise<Result<ItemSearchResult[]>> {
  const { data, error } = await supabase.rpc('search_items', { p_query: query });
  return wrap(data ?? [], error);
}

// ---------- Condivisioni ----------
export async function listShareMembers(boxId: string): Promise<Result<BoxShareMember[]>> {
  const { data, error } = await supabase
    .from('box_share_members')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: true });
  return wrap(data ?? [], error);
}

export async function shareBox(boxId: string, email: string, role: ShareRole): Promise<Result<unknown>> {
  const { data, error } = await supabase.rpc('share_box', { p_box_id: boxId, p_email: email.trim(), p_role: role });
  return wrap(data, error);
}

export async function revokeShare(boxId: string, userId: string): Promise<Result<null>> {
  const { error } = await supabase.rpc('revoke_share', { p_box_id: boxId, p_user_id: userId });
  return wrap(null, error);
}

// ---------- Storico ----------
export async function listEvents(boxId: string): Promise<Result<ItemEvent[]>> {
  const { data, error } = await supabase
    .from('item_events')
    .select('*')
    .or(`box_id.eq.${boxId},from_box_id.eq.${boxId}`)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(200);
  return wrap(data ?? [], error);
}

export async function listProfiles(ids: string[]): Promise<Result<Profile[]>> {
  if (!ids.length) return { data: [], error: null };
  const { data, error } = await supabase.from('profiles').select('*').in('id', ids);
  return wrap(data ?? [], error);
}

export async function getMyProfile(userId: string): Promise<Result<Profile | null>> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return wrap(data, error);
}
