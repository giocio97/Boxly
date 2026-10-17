import i18n from '@/i18n';
import en from '@/i18n/locales/en.json';
import { LABEL_PT, labelHtml, qrSvg } from '@/lib/label';

const BOX = { id: '11111111-1111-1111-1111-000000000001', name: 'Inverno 2025', location: 'Cantina', season: 'winter' as const };

describe('etichetta QR stampabile (BRAND.md)', () => {
  it('6 cm ≈ 170 pt', () => {
    expect(LABEL_PT).toBe(170);
  });

  it('contiene nome, luogo · stagione, wordmark e un QR SVG', () => {
    const html = labelHtml(BOX, true);
    expect(html).toContain('Inverno 2025');
    expect(html).toContain('Cantina · Inverno');
    expect(html).toContain('>Stivo<');
    expect(html).not.toMatch(/Boxly/);
    expect(html).toContain('<svg');
    expect(html).toContain('size: 6cm 6cm');
  });

  it('pagina A4 con bordo di ritaglio quando non è PDF etichetta', () => {
    expect(labelHtml(BOX, false)).toContain('size: A4');
  });

  it('esegue l’escape del nome (niente HTML iniettato)', () => {
    const html = labelHtml({ ...BOX, name: '<img src=x onerror=alert(1)> & "c"' }, true);
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&amp;');
  });

  it('senza luogo/stagione non stampa separatori', () => {
    const html = labelHtml({ ...BOX, location: null, season: null }, true);
    expect(html).toMatch(/<div class="meta"><\/div>/);
  });

  it('QR deterministico e diverso per scatole diverse', () => {
    const a = qrSvg('stivo://box/' + BOX.id, '3cm');
    expect(qrSvg('stivo://box/' + BOX.id, '3cm')).toBe(a);
    expect(qrSvg('stivo://box/11111111-1111-1111-1111-000000000002', '3cm')).not.toBe(a);
    expect(a).toMatch(/^<svg[^>]+viewBox="0 0 (\d+) \1"/);
  });

  it('in inglese la stagione dell’etichetta è tradotta (v2.3)', async () => {
    await i18n.changeLanguage('en');
    try {
      expect(labelHtml(BOX, true)).toContain(`Cantina · ${en.seasons.winter}`);
    } finally {
      await i18n.changeLanguage('it');
    }
  });
});
