// Stivo (ex Boxly) — contratto dati condiviso (owner: lead). Vedi docs/CONTRACT.md (sezione v2).
// Importare SOLO con `import type` (Metro non risolve file fuori da mobile/,
// ma gli import di soli tipi vengono rimossi dalla compilazione).

export type UUID = string;
export type ISODate = string;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter' | 'all';
export type ShareRole = 'viewer' | 'editor';
export type BoxRole = 'owner' | ShareRole;
export type ItemEventAction = 'added' | 'updated' | 'moved' | 'removed';

/** Tipi di oggetto (CONTRACT v2.2). */
export type ItemType =
  | 'clothing'
  | 'shoes_accessories'
  | 'books'
  | 'electronics'
  | 'home_kitchen'
  | 'toys_games'
  | 'documents'
  | 'other';

/** Campi specifici per tipo, salvati in `items.attributes`. */
export interface ItemAttributes {
  author?: string;
  model?: string;
  serial?: string;
}

export interface Profile {
  id: UUID;
  email: string;
  display_name: string | null;
  created_at: ISODate;
}

export interface Box {
  id: UUID;
  owner_id: UUID;
  name: string;
  location: string | null;
  season: Season | null;
  notes: string | null;
  default_item_type: ItemType | null;
  created_at: ISODate;
  updated_at: ISODate;
}

/** Riga della view `box_overview` (security_invoker: rispetta RLS). */
export interface BoxOverview extends Box {
  my_role: BoxRole;
  item_count: number;
  owner_email: string;
}

export interface Item {
  id: UUID;
  box_id: UUID;
  name: string;
  item_type: ItemType;
  attributes: ItemAttributes;
  brand: string | null;
  color: string | null;
  category: string | null;
  size: string | null;
  season: Season | null;
  notes: string | null;
  /** Path nel bucket `item-photos`: `<item_id>/<file>.jpg` */
  photo_path: string | null;
  created_by: UUID;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface BoxShare {
  box_id: UUID;
  user_id: UUID;
  role: ShareRole;
  created_at: ISODate;
}

/** Riga della view `box_share_members` (condivisioni con email). */
export interface BoxShareMember extends BoxShare {
  email: string;
  display_name: string | null;
}

export interface ItemEvent {
  id: number;
  item_id: UUID | null;
  item_name: string;
  box_id: UUID;
  from_box_id: UUID | null;
  action: ItemEventAction;
  actor_id: UUID | null;
  created_at: ISODate;
}

/** Riga restituita da rpc('search_items'). */
export interface ItemSearchResult extends Item {
  box_name: string;
  box_location: string | null;
}

export type InsertBox = Pick<Box, 'name'> & Partial<Pick<Box, 'location' | 'season' | 'notes' | 'default_item_type'>>;
export type InsertItem = Pick<Item, 'box_id' | 'name'> &
  Partial<Pick<Item, 'item_type' | 'attributes' | 'brand' | 'color' | 'category' | 'size' | 'season' | 'notes' | 'photo_path'>>;

/** Codici errore sollevati dalle RPC (testo di `error.message`). */
export type RpcErrorCode =
  | 'not_owner'
  | 'forbidden'
  | 'user_not_found'
  | 'cannot_share_with_self'
  | 'invalid_role'
  | 'invalid_type';

/** Valore codificato nel QR di una scatola: `stivo://box/<box_id>` (CONTRACT v2.1). Lo scanner accetta anche il legacy `boxly://box/<id>`. */
export type BoxQrValue = `stivo://box/${UUID}`;
export type LegacyBoxQrValue = `boxly://box/${UUID}`;
