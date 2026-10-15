import { base64ToArrayBuffer } from '@/lib/photos';

jest.mock('@/lib/supabase', () => ({ supabase: {}, PHOTO_BUCKET: 'item-photos' }));

function bytes(b64: string) {
  return Array.from(new Uint8Array(base64ToArrayBuffer(b64)));
}

describe('base64ToArrayBuffer', () => {
  it.each([
    ['', []],
    ['TQ==', [77]],
    ['TWE=', [77, 97]],
    ['TWFu', [77, 97, 110]],
    ['/9j/4A==', [0xff, 0xd8, 0xff, 0xe0]],
  ])('%j', (input, expected) => {
    expect(bytes(input)).toEqual(expected);
  });

  it('coincide con Buffer su dati casuali (anche con a capo)', () => {
    const src = Buffer.from(Array.from({ length: 1000 }, (_, i) => (i * 37 + 11) % 256));
    const b64 = src.toString('base64').replace(/(.{76})/g, '$1\n');
    expect(bytes(b64)).toEqual(Array.from(src));
  });
});
