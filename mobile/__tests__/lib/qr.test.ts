import { boxQrValue, parseBoxQr, QR_PREFIX } from '@/lib/qr';

const INVERNO = '11111111-1111-1111-1111-000000000001';

describe('QR / deep link (CONTRACT §6)', () => {
  it('codifica boxly://box/<id>', () => {
    expect(QR_PREFIX).toBe('boxly://box/');
    expect(boxQrValue(INVERNO)).toBe(`boxly://box/${INVERNO}`);
  });

  it('round-trip encode → parse', () => {
    expect(parseBoxQr(boxQrValue(INVERNO))).toBe(INVERNO);
  });

  it.each([
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
    'boxly://item/' + INVERNO,
    'boxly://box/',
    'boxly://box/not-a-uuid',
    `boxly://box/${INVERNO}x`,
    `boxly://box/${INVERNO}/qr`,
    `http://boxly/box/${INVERNO}`,
    `xboxly://box/${INVERNO}`,
    `BOXLY://box/${INVERNO}`,
    INVERNO,
    `boxly://box/${INVERNO}?foo=1`,
    `boxly://box/../../${INVERNO}`,
  ])('rifiuta %j (QR non di Boxly)', (input) => {
    expect(parseBoxQr(input as string | null | undefined)).toBeNull();
  });
});
