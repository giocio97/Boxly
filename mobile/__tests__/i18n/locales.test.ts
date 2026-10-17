/** Risorse i18n (CONTRACT v2.3): parità di chiavi it/en, nessun valore vuoto, brand solo via {{app}}. */
import en from '@/i18n/locales/en.json';
import itJson from '@/i18n/locales/it.json';

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') out[key] = v;
    else if (v && typeof v === 'object') Object.assign(out, flatten(v, key));
    else out[key] = v as unknown as string; // valore non stringa: lo segnala il test sui tipi
  }
  return out;
}

const IT = flatten(itJson as Tree);
const EN = flatten(en as Tree);
const placeholders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('locales it/en', () => {
  it('hanno almeno qualche decina di chiavi', () => {
    expect(Object.keys(IT).length).toBeGreaterThan(50);
  });

  it('stesse chiavi in it.json ed en.json', () => {
    const onlyIt = Object.keys(IT).filter((k) => !(k in EN));
    const onlyEn = Object.keys(EN).filter((k) => !(k in IT));
    expect({ onlyIt, onlyEn }).toEqual({ onlyIt: [], onlyEn: [] });
  });

  it.each([
    ['it', IT],
    ['en', EN],
  ])('%s: tutti i valori sono stringhe non vuote', (_lang, dict) => {
    const bad = Object.entries(dict).filter(([, v]) => typeof v !== 'string' || v.trim() === '');
    expect(bad).toEqual([]);
  });

  it('stessi placeholder {{…}} in it ed en', () => {
    const diff = Object.keys(IT)
      .filter((k) => k in EN)
      .filter((k) => placeholders(IT[k]).join() !== placeholders(EN[k]).join());
    expect(diff).toEqual([]);
  });

  it('il nome del brand non è scritto a mano nei testi (si usa {{app}})', () => {
    const hard = Object.entries({ ...prefixed('it', IT), ...prefixed('en', EN) }).filter(([, v]) => /\b(Stivo|Boxly)\b/.test(v));
    expect(hard).toEqual([]);
  });

  it('en.json non è una copia dell’italiano (la maggior parte dei testi differisce)', () => {
    const keys = Object.keys(IT).filter((k) => k in EN);
    const same = keys.filter((k) => IT[k] === EN[k]);
    expect(same.length / keys.length).toBeLessThan(0.2);
  });

  it.each([
    'itemTypes.clothing',
    'itemTypes.shoes_accessories',
    'itemTypes.books',
    'itemTypes.electronics',
    'itemTypes.home_kitchen',
    'itemTypes.toys_games',
    'itemTypes.documents',
    'itemTypes.other',
    'seasons.spring',
    'seasons.summer',
    'seasons.autumn',
    'seasons.winter',
    'seasons.all',
    'roles.owner',
    'roles.editor',
    'roles.viewer',
    'errors.rpc.not_owner',
    'errors.rpc.forbidden',
    'errors.rpc.user_not_found',
    'errors.rpc.cannot_share_with_self',
    'errors.rpc.invalid_role',
    'errors.rpc.invalid_type',
  ])('chiave obbligatoria %s presente', (key) => {
    expect(IT[key]).toBeTruthy();
    expect(EN[key]).toBeTruthy();
  });

  it('etichette italiane dei tipi come da contratto', () => {
    expect([
      IT['itemTypes.clothing'],
      IT['itemTypes.shoes_accessories'],
      IT['itemTypes.books'],
      IT['itemTypes.electronics'],
      IT['itemTypes.home_kitchen'],
      IT['itemTypes.toys_games'],
      IT['itemTypes.documents'],
      IT['itemTypes.other'],
    ]).toEqual(['Vestiti', 'Scarpe e accessori', 'Libri', 'Elettronica', 'Casa e cucina', 'Giochi', 'Documenti', 'Altro']);
  });
});

function prefixed(lang: string, d: Record<string, string>) {
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [`${lang}:${k}`, v]));
}
