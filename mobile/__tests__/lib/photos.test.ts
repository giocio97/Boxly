import { ImageManipulator } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { base64ToArrayBuffer, MAX_PHOTO_SIDE, pickFromLibrary, preparePhoto } from '@/lib/photos';

jest.mock('@/lib/supabase', () => ({ supabase: {}, PHOTO_BUCKET: 'item-photos' }));

const mockSave = jest.fn();
const mockResize = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
  ImageManipulator: { manipulate: jest.fn() },
}));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue({ uri: 'file:///out.jpg', width: 0, height: 0, base64: 'QUJD' });
  const image = { saveAsync: mockSave, release: jest.fn() };
  const context = { resize: mockResize, renderAsync: jest.fn().mockResolvedValue(image), release: jest.fn() };
  mockResize.mockReturnValue(context);
  (ImageManipulator.manipulate as jest.Mock).mockReturnValue(context);
});

describe('preparePhoto (≤1600 px, JPEG 70%)', () => {
  it('orizzontale grande → larghezza 1600', async () => {
    await preparePhoto({ uri: 'file:///a.jpg', width: 4000, height: 3000 });
    expect(mockResize).toHaveBeenCalledWith({ width: MAX_PHOTO_SIDE });
  });

  it('verticale grande → altezza 1600', async () => {
    await preparePhoto({ uri: 'file:///a.jpg', width: 3000, height: 4000 });
    expect(mockResize).toHaveBeenCalledWith({ height: MAX_PHOTO_SIDE });
  });

  it('piccola → nessun resize, solo ricompressa in JPEG', async () => {
    const out = await preparePhoto({ uri: 'file:///a.jpg', width: 800, height: 600 });
    expect(mockResize).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith({ compress: 0.7, format: 'jpeg', base64: true });
    expect(out).toEqual({ uri: 'file:///out.jpg', base64: 'QUJD' });
  });

  it('errore di elaborazione → messaggio chiaro dal picker', async () => {
    (ImagePicker.requestMediaLibraryPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', width: 4000, height: 3000 }],
    });
    mockSave.mockRejectedValue(new Error('boom'));
    await expect(pickFromLibrary()).resolves.toEqual({ error: 'Non riesco a preparare la foto. Riprova.' });
  });
});

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
