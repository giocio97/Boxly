import { boxQrValue, LEGACY_QR_PREFIX, parseBoxQr, QR_PREFIX } from '@/lib/qr';

const INVERNO = '11111111-1111-1111-1111-000000000001';

describe('QR / deep link (CONTRACT v2.1)', () => {
  it('genera stivo://box/<id>', () => {
    expect(QR_PREFIX).toBe('stivo://box/');
    expect(boxQrValue(INVERNO)).toBe(`stivo://box/${INVERNO}`);
  });

  it('il prefisso legacy è boxly://box/', () => {
    expect(LEGACY_QR_PREFIX).toBe('boxly://box/');
  });

  it('round-trip encode → parse', () => {
    expect(parseBoxQr(boxQrValue(INVERNO))).toBe(INVERNO);
  });

  it.each([
    [`stivo://box/${INVERNO}`, INVERNO],
    [`  stivo://box/${INVERNO}\n`, INVERNO],
    [`stivo://box/${INVERNO}/`, INVERNO],
    [`stivo://box/${INVERNO.toUpperCase()}`, INVERNO],
    // etichette stampate prima della rinomina
    [`boxly://box/${INVERNO}`, INVERNO],
    [`  boxly://box/${INVERNO}\n`, INVERNO],
    [`boxly://box/${INVERNO}/`, INVERNO],
    [`boxly://box/${INVERNO.toUpperCase()}`, INVERNO],
  ])('accetta %j', (input, expected) => {
    expect(parseBoxQr(input)).toBe(expected);
  });

  it.each([
    null,
    undefined,
    '',
    'https://example.com',
    'stivo://item/' + INVERNO,
    'stivo://box/',
    'stivo://box/not-a-uuid',
    `stivo://box/${INVERNO}x`,
    `stivo://box/${INVERNO}/qr`,
    `stivo://box/${INVERNO}?foo=1`,
    `stivo://box/../../${INVERNO}`,
    `http://stivo/box/${INVERNO}`,
    `xstivo://box/${INVERNO}`,
    `STIVO://box/${INVERNO}`,
    'boxly://item/' + INVERNO,
    'boxly://box/',
    'boxly://box/not-a-uuid',
    `boxly://box/${INVERNO}/qr`,
    `xboxly://box/${INVERNO}`,
    `BOXLY://box/${INVERNO}`,
    `stivoboxly://box/${INVERNO}`,
    `exp://box/${INVERNO}`,
    INVERNO,
  ])('rifiuta %j (QR non dell’app)', (input) => {
    expect(parseBoxQr(input as string | null | undefined)).toBeNull();
  });
});
