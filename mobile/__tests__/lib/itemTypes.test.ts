/** Registro dei tipi di oggetto (CONTRACT v2.2). */
import type { ItemType } from '@shared/types';

import {
  ATTRIBUTE_KEYS,
  cleanAttributes,
  DEFAULT_ITEM_TYPE,
  isItemType,
  ITEM_TYPE_KEYS,
  ITEM_TYPES,
  itemTypeDef,
  itemTypeIcon,
  typeHasField,
} from '@/lib/itemTypes';

const ALL: ItemType[] = ['clothing', 'shoes_accessories', 'books', 'electronics', 'home_kitchen', 'toys_games', 'documents', 'other'];

describe('registro tipi', () => {
  it('contiene esattamente gli 8 tipi del contratto, nell’ordine', () => {
    expect(ITEM_TYPE_KEYS).toEqual(ALL);
    expect(new Set(ITEM_TYPES.map((t) => t.key)).size).toBe(8);
  });

  it('default = other, chiavi attributes = author/model/serial', () => {
    expect(DEFAULT_ITEM_TYPE).toBe('other');
    expect([...ATTRIBUTE_KEYS].sort()).toEqual(['author', 'model', 'serial']);
  });

  it.each<[ItemType, string[]]>([
    ['clothing', ['size', 'season']],
    ['shoes_accessories', ['size', 'season']],
    ['books', ['author']],
    ['electronics', ['model', 'serial']],
    ['home_kitchen', []],
    ['toys_games', []],
    ['documents', []],
    ['other', []],
  ])('%s → campi %j', (type, fields) => {
    expect([...itemTypeDef(type).fields].sort()).toEqual([...fields].sort());
    for (const f of ['size', 'season', 'author', 'model', 'serial'] as const) {
      expect(typeHasField(type, f)).toBe(fields.includes(f));
    }
  });

  it('ogni tipo ha un’icona', () => {
    for (const t of ALL) expect(itemTypeIcon(t)).toMatch(/\S/);
  });

  it('isItemType', () => {
    for (const t of ALL) expect(isItemType(t)).toBe(true);
    for (const v of ['furniture', 'Books', '', null, undefined, 1, 'toString', '__proto__']) expect(isItemType(v)).toBe(false);
  });

  it('tipo sconosciuto o mancante → definizione di other', () => {
    expect(itemTypeDef('furniture').key).toBe('other');
    expect(itemTypeDef(null).key).toBe('other');
    expect(itemTypeDef(undefined).key).toBe('other');
    expect(itemTypeDef('constructor').key).toBe('other');
  });
});

describe('cleanAttributes', () => {
  const all = { author: ' Umberto Eco ', model: 'Paperwhite 11', serial: 'G000ABC123' };

  it('books tiene solo author (trim)', () => {
    expect(cleanAttributes('books', all)).toEqual({ author: 'Umberto Eco' });
  });

  it('electronics tiene model e serial', () => {
    expect(cleanAttributes('electronics', all)).toEqual({ model: 'Paperwhite 11', serial: 'G000ABC123' });
  });

  it.each<ItemType>(['clothing', 'shoes_accessories', 'home_kitchen', 'toys_games', 'documents', 'other'])('%s → {}', (t) => {
    expect(cleanAttributes(t, all)).toEqual({});
  });

  it('stringhe vuote, spazi e null vengono rimossi', () => {
    expect(cleanAttributes('electronics', { model: '   ', serial: null })).toEqual({});
    expect(cleanAttributes('books', { author: '' })).toEqual({});
  });

  it('chiavi estranee ignorate', () => {
    expect(cleanAttributes('books', { author: 'A', color: 'rosso' } as never)).toEqual({ author: 'A' });
  });
});
