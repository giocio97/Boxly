/** Brand v2.1: APP_NAME unico punto del nome, config Expo rinominata. */
import { APP_NAME } from '@/lib/brand';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require('../../app.json');

describe('brand Stivo (CONTRACT v2.1)', () => {
  it('APP_NAME = Stivo', () => {
    expect(APP_NAME).toBe('Stivo');
  });

  it('app.json: name, slug, scheme, bundle id', () => {
    const e = appJson.expo;
    expect(e.name).toBe('Stivo');
    expect(e.slug).toBe('stivo');
    expect(e.scheme).toEqual(['stivo', 'boxly']);
    expect(e.ios.bundleIdentifier).toBe('com.stivo.app');
    expect(e.android.package).toBe('com.stivo.app');
  });

  it('app.json: nessun testo di permesso cita ancora Boxly', () => {
    expect(JSON.stringify(appJson)).not.toMatch(/Boxly/);
  });
});
