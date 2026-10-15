// Helper condivisi per i test di schermata (non è un file di test: non termina in .test.tsx)
import type { BoxOverview, BoxRole } from '@shared/types';

export const ALICE = '00000000-0000-0000-0000-00000000000a';
export const BOB = '00000000-0000-0000-0000-00000000000b';
export const CAROL = '00000000-0000-0000-0000-00000000000c';
export const INVERNO = '11111111-1111-1111-1111-000000000001';

export function box(role: BoxRole, extra: Partial<BoxOverview> = {}): BoxOverview {
  return {
    id: INVERNO,
    owner_id: ALICE,
    name: 'Inverno 2025',
    location: 'Cantina',
    season: 'winter',
    notes: null,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    my_role: role,
    item_count: 1,
    owner_email: 'alice@boxly.test',
    ...extra,
  };
}

export const maglione = {
  id: '22222222-2222-2222-2222-000000000001',
  box_id: INVERNO,
  name: 'Maglione blu',
  brand: 'Uniqlo',
  color: 'blu',
  category: null,
  size: 'M',
  season: 'winter',
  notes: null,
  photo_path: null,
  created_by: ALICE,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};
