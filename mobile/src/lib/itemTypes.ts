import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ItemAttributes, ItemType } from '@shared/types';
import type { ComponentProps } from 'react';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Campo specifico di un tipo: `size`/`season` sono colonne, gli altri vanno in `attributes`. */
export type TypeField = 'size' | 'season' | keyof ItemAttributes;
export type AttributeKey = keyof ItemAttributes;

export interface ItemTypeDef {
  key: ItemType;
  icon: IconName;
  fields: TypeField[];
}

/** Registro dei tipi di oggetto (CONTRACT v2.2). L'etichetta è in i18n: `itemTypes.<key>`. */
export const ITEM_TYPES: ItemTypeDef[] = [
  { key: 'clothing', icon: 'shirt-outline', fields: ['size', 'season'] },
  { key: 'shoes_accessories', icon: 'footsteps-outline', fields: ['size', 'season'] },
  { key: 'books', icon: 'book-outline', fields: ['author'] },
  { key: 'electronics', icon: 'phone-portrait-outline', fields: ['model', 'serial'] },
  { key: 'home_kitchen', icon: 'restaurant-outline', fields: [] },
  { key: 'toys_games', icon: 'game-controller-outline', fields: [] },
  { key: 'documents', icon: 'document-text-outline', fields: [] },
  { key: 'other', icon: 'pricetag-outline', fields: [] },
];

export const ITEM_TYPE_KEYS: ItemType[] = ITEM_TYPES.map((t) => t.key);
export const ATTRIBUTE_KEYS: AttributeKey[] = ['author', 'model', 'serial'];
export const DEFAULT_ITEM_TYPE: ItemType = 'other';

const byKey = Object.fromEntries(ITEM_TYPES.map((t) => [t.key, t])) as Record<ItemType, ItemTypeDef>;

export function isItemType(v: unknown): v is ItemType {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(byKey, v);
}

/** Definizione del tipo; valori sconosciuti o mancanti → `other`. */
export function itemTypeDef(type: string | null | undefined): ItemTypeDef {
  return isItemType(type) ? byKey[type] : byKey[DEFAULT_ITEM_TYPE];
}

export function itemTypeIcon(type: string | null | undefined): IconName {
  return itemTypeDef(type).icon;
}

export function typeHasField(type: string | null | undefined, field: TypeField): boolean {
  return itemTypeDef(type).fields.includes(field);
}

/** Solo gli attributi previsti dal tipo, ripuliti (stringhe non vuote). */
export function cleanAttributes(type: ItemType, attrs: Partial<Record<AttributeKey, string | null | undefined>>): ItemAttributes {
  const out: ItemAttributes = {};
  for (const key of ATTRIBUTE_KEYS) {
    const v = (attrs[key] ?? '').trim();
    if (v && typeHasField(type, key)) out[key] = v;
  }
  return out;
}
