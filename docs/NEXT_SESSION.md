# Boxly: ripartenza prossima sessione

> Leggi questo file per primo. Riassume lo stato al **2026-10-15** e il piano approvato per la **v2**.
> Contesto collegato: [CLAUDE.md](../CLAUDE.md) · [CONTRACT.md](CONTRACT.md) · [TEST_REPORT.md](TEST_REPORT.md) · [BRAND.md](../BRAND.md)

## Prompt per ripartire
Incolla questo all'inizio della nuova sessione:

```
Leggi docs/NEXT_SESSION.md e implementa la v2 di Boxly con gli agent teams
(backend, frontend, qa), seguendo la skill agent-teams e le lezioni in lessons.md.
Parti dalla Fase 0 (pre-flight + aggiornamento contratto) e poi avvia il team.
```

---

## 1. Stato attuale (v1, completata)
- **Repository:** https://github.com/giocio97/Boxly, ramo `main`, allineato.
- **Stack:** Expo SDK 57 (expo-router, React Native 0.86) + Supabase locale (Docker).
- **Funzioni:**
  - login email/password;
  - scatole e oggetti con foto;
  - QR `boxly://box/<id>` con etichetta stampabile 6×6 cm;
  - scanner;
  - condivisione viewer/editor;
  - storico;
  - ricerca testuale.
- **Test (v1):**

  | Suite | Risultato |
  |---|---|
  | Database (pgTAP) | 235/235 |
  | Jest | 123/123 |
  | Maestro iOS | 9/9 |
  | Maestro Android in Expo Go | 2/2 |
  | Manuale sul telefono fisico (fotocamera, scansione QR) | ✅ |

- **Utenti demo** (password `password123`):
  - `alice@boxly.test`
  - `bob@boxly.test`
  - `carol@boxly.test`

## 2. Come riavviare l'ambiente
```bash
# Backend (Docker Desktop acceso)
cd ~/Documents/myP && supabase start
supabase db reset                      # torna al seed (i test E2E lasciano dati "QA…")

# iOS: build nativa sul simulatore iPhone 17 Pro, Metro su 8081
cd mobile && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --device "iPhone 17 Pro"

# Android emulatore (Pixel_9_Pro_API_VanillaIceCream): Expo Go su 8082
npx expo start --go --android --port 8082          # poi exp://10.0.2.2:8082

# Telefono fisico (Samsung A02s, Android 12, Expo Go 57.0.9): solo cavo USB, Wi-Fi non necessario
EXPO_OFFLINE=1 npx expo start --go --port 8083 --clear
adb reverse tcp:8083 tcp:8083 && adb reverse tcp:54321 tcp:54321
adb shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:8083" host.exp.exponent

# Test
supabase test db
cd mobile && npm test && npx tsc --noEmit && npx expo lint
e2e/scripts/run-e2e.sh ios   |   e2e/scripts/run-e2e.sh android
```
`mobile/.env` non è nel repository. Contiene `EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` ed
`EXPO_PUBLIC_SUPABASE_ANON_KEY=<da supabase status>`.

## 3. Problemi noti e vincoli
- **Proxy aziendale (Cato Networks):**
  - fa TLS interception e risponde 403 a `plugins.gradle.org`, quindi **la build Android nativa non si può fare in locale**: Android gira in Expo Go;
  - non usare mirror non ufficiali; l'alternativa approvabile è EAS Build;
  - per la CLI Node a volte serve `NODE_EXTRA_CA_CERTS` con la root CA del proxy.
- **Expo Go:**
  - il deep link `boxly://` non funziona, perché usa `exp://`;
  - `resolveSupabaseUrl` (`mobile/src/lib/supabase.ts`) sostituisce `127.0.0.1` con `10.0.2.2` **solo sull'emulatore** Android. Sul telefono fisico (`Device.isDevice`) resta `127.0.0.1` e passa dal cavo USB con `adb reverse`. Modifica del 2026-10-16.
- **Git e account:**
  - il remote è `https://giocio97@github.com/giocio97/Boxly.git`, con email locale del repo `giociotta@gmail.com` e `http.postBuffer` alto;
  - il token GitHub fine-grained "boxly" (solo il repository Boxly, Contents in scrittura) **scade il 14/11/2026**;
  - **non toccare** la configurazione git globale né le credenziali di lavoro (`GiovanniCiotta`, Bitbucket, Jira).
- **Agent teams:**
  - nell'estensione VS Code gli agenti partono come subagent in background con nome, non come teammate;
  - `SendMessage` tra di loro funziona, ma non c'è una task list condivisa.

## 4. Decisioni prese per la v2
| Tema | Scelta |
|---|---|
| Tipi | Lista **fissa**, sia sull'**oggetto** sia sulla **scatola**: la scatola ha un tipo predefinito che precompila i nuovi oggetti, e ogni oggetto può cambiarlo |
| Lingue | **Italiano** (principale) + **inglese** (fallback), i18n a chiavi |
| Google | **OAuth via browser con Supabase** (funziona in Expo Go) |
| Tab bar | **Scansiona · (Scatole) · Profilo**: Scatole al centro, tondo Kraft in rilievo |
| Ricerca | Fuori dalla tab bar → **barra larga in cima** alla schermata Scatole, apre la schermata dei risultati. Lì andrà anche la futura ricerca AI |
| Nuova scatola | **Pillola larga flottante** in basso (absolute), sopra la lista e sopra la tab bar |
| Lingua | Sezione **Lingua** nel Profilo |

## 5. Piano v2

### Fase 0: lead
1. **Pre-flight:**
   - `supabase start`;
   - Metro e simulatori pronti;
   - `git ls-remote origin`;
   - credenziali Google in `supabase/.env` (§6);
   - `curl -I https://registry.npmjs.org` per verificare che il proxy lasci passare npm.
2. **Aggiornare `docs/CONTRACT.md`** (sezione "v2") e `shared/types.ts`:
   - `ItemType` = `clothing | shoes_accessories | books | electronics | home_kitchen | toys_games | documents | other`;
   - `items.item_type text not null default 'other'` con check;
   - `items.attributes jsonb not null default '{}'`;
   - `boxes.default_item_type text null` con lo stesso check;
   - **campi per tipo**:
     - comuni a tutti: nome, marca, colore, note, foto, `category` (sottocategoria libera);
     - `clothing` e `shoes_accessories`: in più taglia e stagione;
     - `books`: `attributes.author`;
     - `electronics`: `attributes.model` e `attributes.serial`;
     - gli altri tipi: solo i campi comuni;
   - `search_items(p_query text, p_type text default null)`, che cerca anche nei valori di `attributes`;
   - Google: `display_name` del profilo = `coalesce(display_name, full_name, name)` dai metadata;
   - nuove route e testID:
     - `home-search-bar` sostituisce `tab-search`;
     - `search` diventa una route di stack;
     - `item-type-<key>` e `box-type-<key>` per la scelta del tipo;
     - `lang-it` e `lang-en` per la lingua;
     - `login-google` e `signup-google` per Google;
     - `new-box-button` resta;
   - chiavi i18n nel formato `area.schermata.elemento`, per esempio `boxes.empty.title`, `errors.rpc.not_owner`, `itemTypes.books`, `seasons.winter`.

### Fase 1: agent team (stessa ownership di CLAUDE.md)
**backend**, in `supabase/`:
- migrazione `item_types`:
  - colonne e check;
  - tsvector `search` che include `attributes`;
  - trigger dello storico (`…003_history.sql:21`) aggiornato;
  - `search_items` (`…004_rpc_views.sql:110,143,152`) con filtro per tipo;
- seed: i capi esistenti diventano `clothing`; il libro diventa `books` con `attributes.author = "Umberto Eco"`;
- migrazione `google_profile`: trigger del profilo con i metadata Google;
- `config.toml`:
  - `[auth.external.google]` con `enabled = true`;
  - `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"` e `secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"`;
  - aggiungere `exp://**` alle redirect URL.

**frontend**, in `mobile/`, **in quest'ordine** perché i18n tocca quasi tutti i file:
1. **i18n:**
   - `npx expo install expo-localization`, poi `i18next` e `react-i18next`;
   - `src/i18n/index.ts`: lingua salvata (AsyncStorage `boxly.lang`), altrimenti quella del dispositivo se è it o en, altrimenti en; fallback en;
   - stringhe in `src/i18n/locales/{it,en}.json`;
   - estrarre tutte le stringhe dei circa 23 file con testo italiano, inclusi `lib/labels.ts`, `lib/errors.ts` (mappa `rpcMessages`), `lib/label.ts` (etichetta QR) e i titoli dello stack in `src/app/_layout.tsx`;
   - `formatDateTime` passa a `Intl` nella lingua attiva.
2. **Tab bar** (`src/app/(tabs)/_layout.tsx`):
   - Scansiona · Scatole · Profilo;
   - Scatole con un `tabBarButton` custom, tondo da 64 px Kraft in rilievo, `testID tab-boxes`;
   - `(tabs)/search.tsx` diventa `src/app/search.tsx`, route di stack con autofocus;
   - `HomeSearchBar` (`home-search-bar`) in cima a `(tabs)/index.tsx`.
3. **Pulsante flottante:**
   - nuovo `FloatingActionButton` a pillola, posizionato in absolute, con `new-box-button`;
   - rimuoverlo dal `ListHeaderComponent` e aggiungere `paddingBottom` alla lista;
   - deve restare visibile anche con la lista vuota.
4. **Profilo → Lingua:** riusare `ChoiceChip` (`components/SeasonPicker.tsx:52`); il cambio è immediato e la scelta viene salvata.
5. **Tipi:**
   - registro `src/lib/itemTypes.ts` (chiave, icona Ionicons, chiave i18n, campi);
   - `components/ItemForm.tsx`: scelta del tipo e campi dinamici; i campi specifici vanno in `attributes`; il tipo viene precompilato da `box.default_item_type`;
   - form scatola con il tipo predefinito;
   - `ItemRow` con l'icona del tipo; la ricerca con chip per filtrare per tipo.
6. **Google:**
   - client Supabase con `flowType: 'pkce'`;
   - `signInWithGoogle()` in `lib/auth.tsx`: `signInWithOAuth({ provider: 'google', options: { redirectTo: Linking.createURL('auth/callback'), skipBrowserRedirect: true } })`, poi `WebBrowser.openAuthSessionAsync(url, redirectTo)`, poi `exchangeCodeForSession(code)`;
   - pulsante "Continua con Google" su login e signup.
7. `tsc --noEmit`, `expo lint`, prove su iOS, sull'emulatore e sul telefono.

**qa:**
- Jest:
  - setup con i18n inizializzato in `it`, così le asserzioni italiane esistenti restano valide;
  - aggiornare `itemForm.test.tsx:39` con `item_type` e `attributes`;
  - nuovi test: parità delle chiavi tra it ed en, senza chiavi vuote; nessun testo italiano hardcoded fuori da `locales/`; cambio lingua; campi dinamici per tipo; `signInWithGoogle` con `WebBrowser` mockato;
- pgTAP: `item_type` e `attributes` (check, RLS invariata, storico, ricerca per tipo e per autore); trigger del profilo Google;
- Maestro:
  - `tab-search` → `home-search-bar` in `02_login_ok`, `07_search` e negli smoke Android;
  - sostituire i selettori per testo con testID (`03_signup:26`, `android/subflows/open_expo:11`, `08_deeplink:36`, `04_…:62`);
  - nuovi flussi: oggetto di tipo Libro con autore → ricerca per autore; cambio lingua in English;
- Google: checklist manuale, perché la pagina di Google non è automatizzabile;
- `docs/TEST_REPORT.md` con una sezione v2.

### Verifica finale v2
- `supabase db reset && supabase test db`;
- `npm test`, `tsc`, `lint`;
- `run-e2e.sh ios` e `android`;
- manuale sul telefono:
  - login Google;
  - lingua it ↔ en;
  - un oggetto di ogni tipo;
  - pulsante flottante e Scatole al centro.

## 6. Prerequisiti da fare tu prima della sessione: login Google
1. Vai su https://console.cloud.google.com e crea il progetto **Boxly**.
2. **APIs & Services → OAuth consent screen**:
   - tipo **External**, stato **Testing**;
   - aggiungi la tua email Google tra i **Test users**.
3. **Credentials → Create credentials → OAuth client ID**:
   - tipo **Web application**;
   - in **Authorized redirect URIs** inserisci `http://127.0.0.1:54321/auth/v1/callback`.
4. Copia **Client ID** e **Client secret** in `supabase/.env`. Il file non va nel repository e i valori non vanno incollati in chat:
   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
   ```
5. Su Android, perché il browser raggiunga Supabase, usa `adb reverse tcp:54321 tcp:54321`, sia sull'emulatore sia sul telefono.

## 7. Decisioni aperte (rimandate dall'utente il 2026-10-16)

### A. Nome dell'app: da decidere prima della pubblicazione sugli store
"Boxly" è già usato. Nella categoria i nomi con "box" sono saturi: Boxy, Boxie, SmartBox, BoxQR, Box Radar, Packed, BoxtUp.
Rosa preliminare: per nessuno di questi nomi la ricerca web ha trovato app di inventario o scatole con lo stesso nome. Marchi e domini **non** sono ancora verificati.

| Nome | Origine | Nota |
|---|---|---|
| **Dovè** | "Dov'è?" | Si lega alla ricerca AI; da verificare la somiglianza con il marchio Dove (Unilever) |
| **Stivo** | da "stivare" | Breve e internazionale |
| **Ripò** | da "riporre" | L'accento fa da firma grafica |
| **Scatolì** | "scatolina" | Molto italiano |

Altri candidati: Kartò, Ordo, Dentro (dal payoff), Inscatola, Ritrovo.

**Verifiche sul nome scelto:**
- marchi su EUIPO (TMview) e UIBM, classi 9 e 42;
- domini .app, .it, .com;
- App Store e Google Play;
- profili social.

**Checklist per la rinomina:**
- `mobile/app.json`: `name`, `slug`, `scheme`, `ios.bundleIdentifier` e `android.package` (oggi `com.boxly.app`).
- Prefisso del QR `boxly://box/`: l'app deve continuare ad accettare **anche il vecchio prefisso**, per le etichette già stampate.
- `BRAND.md`, icona e wordmark.
- Testi UI, oggi italiani inline; dalla v2 nelle chiavi i18n.
- `supabase/config.toml`: `project_id` e `additional_redirect_urls`.
- `appId` in Maestro (`e2e/`), `CLAUDE.md`, `docs/CONTRACT.md`.
- Repository GitHub: lo rinomina l'utente, poi `git remote set-url origin https://giocio97@github.com/giocio97/<nuovo>.git`.

Conviene farla **prima** della v2 o insieme alla parte i18n, così le stringhe si toccano una volta sola.

### B. Hosting del backend in produzione: da decidere prima del rilascio
Docker non serve solo in locale. In locale fa girare Supabase; in produzione le opzioni sono:

| Opzione | Costo indicativo | Pro | Contro |
|---|---|---|---|
| **Supabase Cloud, regione UE (Francoforte)**, consigliato | Free per i test; Pro circa 25 $/mese | Nessun server da gestire; backup, aggiornamenti e sicurezza inclusi; pubblicazione con `supabase link` + `supabase db push`; Edge Functions per la futura ricerca AI | Il piano Free mette in pausa il progetto dopo circa una settimana di inattività; costo fisso con utenti reali |
| **VPS con Docker** (es. Hetzner), Supabase self-hosted | circa 5-10 €/mese | Costa meno; controllo totale | Backup, aggiornamenti, HTTPS, sicurezza e monitoraggio a carico tuo |

- I prezzi vengono da blog di terze parti: **riverificarli su https://supabase.com/pricing**.
- Impatto sull'app:
  - in produzione `EXPO_PUBLIC_SUPABASE_URL` e la chiave anon puntano al progetto cloud;
  - le redirect di Google OAuth vanno aggiornate con l'URL cloud;
  - il seed demo non va pubblicato.

## 8. Roadmap successiva (fuori dalla v2)
- **Ricerca AI** "dov'è il maglione blu?": Supabase Edge Function + Claude (`claude-sonnet-5-5`) con un tool `search_items`, partendo dalla nuova barra di ricerca.
- **Rilascio sugli store**: `docs/RELEASE.md` con EAS Build/Submit, account Apple (99 $/anno) e Google Play (25 $), Supabase cloud, privacy policy.
- **Build Android nativa** via EAS, finché il proxy blocca Gradle in locale.
- Da `TEST_REPORT.md`, ancora non coperti:
  - concorrenza tra utenti;
  - scadenza delle signed URL;
  - accessibilità e tema scuro sistematici;
  - iPhone fisico.
