/**
 * Verifica che lo strato api usi tabelle/view/RPC e parametri del contratto (CONTRACT §4)
 * e propaghi gli errori RPC (error.message = codice) — client Supabase mockato.
 */
const mockRpc = jest.fn();
const mockCalls: { table: string; ops: [string, unknown[]][] }[] = [];
let mockNext: { data: unknown; error: unknown } = { data: null, error: null };

function mockBuilder(table: string) {
  const rec = { table, ops: [] as [string, unknown[]][] };
  mockCalls.push(rec);
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'or', 'in', 'order', 'limit', 'single', 'maybeSingle']) {
    b[m] = (...args: unknown[]) => {
      rec.ops.push([m, args]);
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(mockNext).then(resolve, reject);
  return b;
}

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (t: string) => mockBuilder(t), rpc: (...a: unknown[]) => mockRpc(...a) },
  PHOTO_BUCKET: 'item-photos',
}));

import * as api from '@/lib/api';
import { errorMessage } from '@/lib/errors';

const BOX = '11111111-1111-1111-1111-000000000001';

beforeEach(() => {
  mockCalls.length = 0;
  mockRpc.mockReset();
  mockNext = { data: null, error: null };
});

describe('RPC', () => {
  it('shareBox → share_box con email trimmata', async () => {
    mockRpc.mockResolvedValue({ data: { box_id: BOX }, error: null });
    const r = await api.shareBox(BOX, '  carol@boxly.test ', 'viewer');
    expect(mockRpc).toHaveBeenCalledWith('share_box', { p_box_id: BOX, p_email: 'carol@boxly.test', p_role: 'viewer' });
    expect(r.error).toBeNull();
  });

  it.each(['not_owner', 'user_not_found', 'cannot_share_with_self', 'invalid_role'])(
    'shareBox propaga %s e il messaggio è tradotto',
    async (code) => {
      mockRpc.mockResolvedValue({ data: null, error: { message: code, code: 'P0001' } });
      const r = await api.shareBox(BOX, 'x@y.z', 'editor');
      expect(r.data).toBeNull();
      expect(r.error?.message).toBe(code);
      expect(errorMessage(r.error)).not.toMatch(/Qualcosa è andato storto/);
    },
  );

  it('revokeShare → revoke_share', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await api.revokeShare(BOX, 'u1');
    expect(mockRpc).toHaveBeenCalledWith('revoke_share', { p_box_id: BOX, p_user_id: 'u1' });
  });

  it('moveItem → move_item e forbidden', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'forbidden' } });
    const r = await api.moveItem('i1', BOX);
    expect(mockRpc).toHaveBeenCalledWith('move_item', { p_item_id: 'i1', p_to_box_id: BOX });
    expect(r.error?.message).toBe('forbidden');
  });

  it('searchItems → search_items, data null → []', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const r = await api.searchItems('maglione');
    expect(mockRpc).toHaveBeenCalledWith('search_items', { p_query: 'maglione', p_type: null });
    expect(r).toEqual({ data: [], error: null });
  });

  it('searchItems con tipo → p_type', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await api.searchItems('eco', 'books');
    expect(mockRpc).toHaveBeenCalledWith('search_items', { p_query: 'eco', p_type: 'books' });
  });

  it('searchItems query vuota + tipo → chiama comunque la RPC', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await api.searchItems('', 'clothing');
    expect(mockRpc).toHaveBeenCalledWith('search_items', { p_query: '', p_type: 'clothing' });
  });

  it('searchItems invalid_type → errore propagato', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'invalid_type' } });
    const r = await api.searchItems('x', 'furniture' as never);
    expect(r.error?.message).toBe('invalid_type');
  });
});

describe('query', () => {
  it('listBoxes usa la view box_overview ordinata per updated_at desc', async () => {
    mockNext = { data: [{ id: BOX }], error: null };
    const r = await api.listBoxes();
    expect(mockCalls[0].table).toBe('box_overview');
    expect(mockCalls[0].ops).toContainEqual(['order', ['updated_at', { ascending: false }]]);
    expect(r.data).toEqual([{ id: BOX }]);
  });

  it('getBox filtra per id con maybeSingle', async () => {
    await api.getBox(BOX);
    expect(mockCalls[0].table).toBe('box_overview');
    expect(mockCalls[0].ops).toContainEqual(['eq', ['id', BOX]]);
    expect(mockCalls[0].ops.map((o) => o[0])).toContain('maybeSingle');
  });

  it('createBox non invia owner_id (default auth.uid())', async () => {
    mockNext = { data: { id: 'new' }, error: null };
    await api.createBox({ name: 'Trasloco' });
    const insert = mockCalls[0].ops.find((o) => o[0] === 'insert');
    expect(mockCalls[0].table).toBe('boxes');
    expect(insert?.[1][0]).toEqual({ name: 'Trasloco' });
  });

  it('createItem non invia created_by', async () => {
    await api.createItem({ box_id: BOX, name: 'Guanti' });
    const insert = mockCalls[0].ops.find((o) => o[0] === 'insert');
    expect(insert?.[1][0]).not.toHaveProperty('created_by');
  });

  it('listShareMembers usa box_share_members', async () => {
    await api.listShareMembers(BOX);
    expect(mockCalls[0].table).toBe('box_share_members');
  });

  it('listEvents include eventi in uscita (from_box_id)', async () => {
    await api.listEvents(BOX);
    expect(mockCalls[0].table).toBe('item_events');
    expect(mockCalls[0].ops).toContainEqual(['or', [`box_id.eq.${BOX},from_box_id.eq.${BOX}`]]);
  });

  it('listProfiles con lista vuota non chiama il db', async () => {
    const r = await api.listProfiles([]);
    expect(mockCalls).toHaveLength(0);
    expect(r).toEqual({ data: [], error: null });
  });

  it('errore RLS propagato', async () => {
    mockNext = { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } };
    const r = await api.createItem({ box_id: BOX, name: 'X' });
    expect(r.data).toBeNull();
    expect(errorMessage(r.error)).toMatch(/permessi/);
  });
});
