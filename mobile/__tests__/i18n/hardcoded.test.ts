/**
 * CONTRACT v2.3: nessuna stringa visibile hardcoded fuori da src/i18n/locales.
 * Euristica statica sui sorgenti di mobile/src (esclusi locales/ e brand.ts):
 *  1. testo JSX letterale tra tag (`<AppText>Ciao</AppText>`);
 *  2. prop visibili con stringa letterale (`title="Salva"`, `placeholder='Es. M'`, `label={'Nome'}`);
 *  3. chiavi di opzioni/oggetti visibili con stringa letterale (`title: 'Profilo'`, `headerTitle: '…'`, `tabBarLabel: '…'`);
 *  4. qualsiasi stringa letterale con lettere accentate italiane, apostrofo tipografico o parole italiane frequenti;
 *  5. Alert.alert('…') con testo letterale.
 * Non sono segnalati: testID, nomi di icone, chiavi i18n (`t('a.b')`), URL, nomi di route, stili.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

const SRC = path.resolve(__dirname, '../../src');
const EXCLUDED_DIRS = [path.join(SRC, 'i18n', 'locales')];
const EXCLUDED_FILES = [path.join(SRC, 'lib', 'brand.ts')];

/** Eccezioni ammesse: nomi propri e simboli non traducibili (aggiungere qui con motivazione). */
const ALLOWED = new Set<string>([
  'Italiano', // nome della lingua: si mostra sempre nella lingua stessa
  'English',
  'Stivo',
  '·',
  '—',
  '–',
  '…',
  '×',
]);

const VISIBLE_PROPS = [
  'title',
  'label',
  'placeholder',
  'message',
  'subtitle',
  'submitLabel',
  'confirmLabel',
  'cancelLabel',
  'headerTitle',
  'headerBackTitle',
  'tabBarLabel',
  'accessibilityLabel',
  'accessibilityHint',
  'text',
  'hint',
  'emptyText',
];

const ITALIAN_WORDS =
  /\b(il|lo|la|gli|le|un|una|di|del|della|nel|nella|per|con|non|che|questo|questa|scatola|scatole|oggetto|oggetti|salva|annulla|elimina|modifica|accedi|registrati|cerca|nessun|nessuna|riprova|consenti|aggiungi|sposta|condividi|esci|profilo|lingua)\b/i;

function walk(dir: string): string[] {
  if (EXCLUDED_DIRS.some((d) => dir.startsWith(d))) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.d\.ts$/.test(e.name) && !EXCLUDED_FILES.includes(p)) return [p];
    return [];
  });
}

/** Rimuove i commenti senza toccare le stringhe con `//` dentro (es. `stivo://`). */
function stripComments(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[\s;{}(),])\/\/.*$/gm, '$1')
    .replace(/{\s*\/\*[\s\S]*?\*\/\s*}/g, '');
}

function hasLetters(s: string) {
  return /[A-Za-zÀ-ÿ]{2,}/.test(s);
}

function isWhitelisted(s: string) {
  const v = s.trim();
  if (!v || ALLOWED.has(v)) return true;
  if (!hasLetters(v)) return true; // simboli, numeri, punteggiatura
  return false;
}

/** Stringhe tecniche che contengono lettere ma non sono testo visibile. */
function looksTechnical(s: string) {
  const v = s.trim();
  return (
    /^[a-z0-9]+([._/-][a-z0-9[\]]+)+$/i.test(v) || // chiavi i18n, path, route, testID
    /^[a-z][a-zA-Z0-9]*$/.test(v) || // identificatori (nomi icone, valori enum)
    /^[a-z]+(-[a-z0-9]+)+$/.test(v) || // kebab-case (icone, testID)
    /^(https?|stivo|boxly|exp|file|data):/i.test(v) ||
    /^#[0-9a-f]{3,8}$/i.test(v) ||
    /^[A-Z_]+$/.test(v) || // costanti
    /^\/[\w[\]/().-]*$/.test(v) || // route expo-router: /box/[id]
    /^\([a-z]+\)(\/[\w[\]-]*)*$/.test(v) // gruppi: (tabs)/index
  );
}

interface Finding {
  file: string;
  line: number;
  kind: string;
  text: string;
}

function lineOf(code: string, index: number) {
  return code.slice(0, index).split('\n').length;
}

function scan(file: string): Finding[] {
  const raw = fs.readFileSync(file, 'utf8');
  const code = stripComments(raw);
  const rel = path.relative(SRC, file);
  const out: Finding[] = [];
  const add = (kind: string, index: number, text: string) => {
    if (isWhitelisted(text)) return;
    out.push({ file: rel, line: lineOf(code, index), kind, text: text.trim() });
  };

  if (file.endsWith('.tsx')) {
    // 1. testo JSX letterale: >Testo< (anche su più righe), ignorando espressioni {…}
    const jsxText = />([^<>{}`]*?[A-Za-zÀ-ÿ][^<>{}`]*?)</g;
    for (const m of code.matchAll(jsxText)) {
      const text = m[1];
      // scarta generics TS e confronti: devono comparire tag JSX attorno
      const before = code.slice(Math.max(0, m.index! - 200), m.index! + 1);
      const after = code.slice(m.index! + m[0].length - 1, m.index! + m[0].length + 2);
      if (!/<[A-Za-z][\w.]*(\s[^<>]*)?>$|<\/[\w.]*>$|\/>$/.test(before.replace(/\s+$/, ''))) continue;
      if (!/^<\/?[A-Za-z]/.test(after)) continue;
      if (/=>|&&|\|\||[;=()]|\?\s|\s:\s/.test(text)) continue; // espressioni JS (ternari ecc.), non testo
      if (looksTechnical(text)) continue;
      add('jsx-text', m.index!, text);
    }
    // 2. prop visibili con stringa letterale
    const propRe = new RegExp(`\\b(${VISIBLE_PROPS.join('|')})\\s*=\\s*\\{?\\s*(["'\`])((?:(?!\\2).)*)\\2`, 'g');
    for (const m of code.matchAll(propRe)) {
      if (looksTechnical(m[3])) continue;
      add(`prop ${m[1]}`, m.index!, m[3]);
    }
  }

  // 3. chiavi di oggetti visibili (opzioni di Stack.Screen / Tabs, Alert, config)
  const keyRe = new RegExp(`\\b(${VISIBLE_PROPS.join('|')})\\s*:\\s*(["'\`])((?:(?!\\2).)*)\\2`, 'g');
  for (const m of code.matchAll(keyRe)) {
    if (looksTechnical(m[3])) continue;
    add(`key ${m[1]}`, m.index!, m[3]);
  }

  // 4. stringhe letterali "italiane"
  const strRe = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  for (const m of code.matchAll(strRe)) {
    const s = m[2];
    if (!hasLetters(s) || looksTechnical(s)) continue;
    const prefix = code.slice(Math.max(0, m.index! - 40), m.index!);
    if (/\b(t|i18n\.t|require|import|from|jest\.mock|testID\s*=\s*\{?)\s*\(?\s*$/.test(prefix)) continue;
    if (/[àèéìòùÀÈÉÌÒÙ’]/.test(s) || (/\s/.test(s.trim()) && ITALIAN_WORDS.test(s))) add('stringa italiana', m.index!, s);
  }

  // 5. Alert.alert con testo letterale
  for (const m of code.matchAll(/Alert\.alert\(\s*(["'`])((?:(?!\1).)*)\1/g)) add('Alert.alert', m.index!, m[2]);

  // dedup (stessa riga e stesso testo trovati da regole diverse)
  const seen = new Set<string>();
  return out.filter((f) => {
    const k = `${f.line}|${f.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const FILES = walk(SRC);

describe('nessuna stringa visibile hardcoded (CONTRACT v2.3)', () => {
  it('trova i sorgenti', () => {
    expect(FILES.length).toBeGreaterThan(20);
    expect(FILES.some((f) => f.includes(`${path.sep}locales${path.sep}`))).toBe(false);
  });

  it('l’euristica riconosce i casi tipici (autotest)', () => {
    const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'qa-i18n-')), 'fixture.tsx');
    fs.writeFileSync(
      tmp,
      [
        "const a = <AppText>Ciao a tutti</AppText>;",
        "const b = <Button title=\"Salva\" testID=\"box-save\" icon=\"add-outline\" />;",
        "const c = { headerTitle: 'Profilo' };",
        "const d = <X label={t('auth.email')} placeholder={t('a.b')} />;",
        "const e = 'Qualcosa è andato storto.';",
        "// commento con testo italiano: è ignorato",
        "const f = router.push('/box/[id]');",
        "const g = 'stivo://box/';",
        "const h = <Text>{name}</Text>;",
        "const i = useState<string | null>(null);",
      ].join('\n'),
    );
    try {
      const texts = scan(tmp).map((f) => f.text);
      expect(texts).toEqual(expect.arrayContaining(['Ciao a tutti', 'Salva', 'Profilo', 'Qualcosa è andato storto.']));
      expect(texts).not.toEqual(expect.arrayContaining(['box-save']));
      expect(texts).not.toContain('add-outline');
      expect(texts).not.toContain('auth.email');
      expect(texts).not.toContain('/box/[id]');
      expect(texts).not.toContain('stivo://box/');
      expect(texts.some((t) => t.includes('commento'))).toBe(false);
      expect(texts).toHaveLength(4);
    } finally {
      fs.unlinkSync(tmp);
    }
  });

  it('nessun file di mobile/src contiene testo visibile non tradotto', () => {
    const findings = FILES.flatMap(scan).map((f) => `${f.file}:${f.line} [${f.kind}] ${JSON.stringify(f.text)}`);
    expect(findings).toEqual([]);
  });

  it('il nome del brand non è scritto a mano fuori da brand.ts', () => {
    const offenders = FILES.filter((f) => /(["'`>])[^"'`<]*\b(Stivo|Boxly)\b/.test(stripComments(fs.readFileSync(f, 'utf8')))).map((f) =>
      path.relative(SRC, f),
    );
    expect(offenders).toEqual([]);
  });
});
