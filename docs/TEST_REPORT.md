# Stivo (ex Boxly) — Test report

Owner: **qa** · Ultimo aggiornamento: 2026-10-17 · Fonte di verità: [CONTRACT.md](CONTRACT.md) (sezione **v2**)

# v2 (2026-10-17)

## Sintesi esecutiva

🟢 **VERDE.** Tutte le suite passano sull'ultimo giro, su database, Jest, iOS (build nativa `com.stivo.app`) e Android (Expo Go). I 2 bug trovati (BUG-101, BUG-102, entrambi frontend) sono chiusi e riverificati. Nessun bug sul backend.

Cosa copre la v2 del contratto:
- rinomina in Stivo, con QR `stivo://` e `boxly://` ancora accettato;
- tipi di oggetto con `attributes` e `default_item_type`;
- `search_items(p_query, p_type)`;
- i18n it/en con cambio lingua immediato;
- nuova navigazione: tab centrale, `home-search-bar`, ricerca come route di stack, pillola flottante;
- nuovi testID.

Il login Google è **fuori scope** della v2.

## Risultati per suite

| Suite | Strumento | Piattaforma | Totali | Passati | Falliti | Δ rispetto a v1 | Durata |
|---|---|---|---:|---:|---:|---|---:|
| Database (RLS, RPC, trigger, ricerca, view, storage, tipi) | pgTAP via `supabase test db` | Postgres locale (progetto `stivo`) | 358 (10 file) | 358 | 0 | +123 (nuovo `10_item_types.sql`, 122 test; v1 adeguati) | ~1 s |
| Unit + componenti + schermate + i18n | Jest 29 + RNTL 13 (jest-expo) | Node | 252 (22 suite) | 252 | 0 | +125 (7 suite nuove) | ~5 s |
| Typecheck (app + test) | `tsc --noEmit` | — | — | ✅ | — | — | — |
| E2E completa | Maestro 2.11 | **iOS** build nativa `com.stivo.app`, iPhone 17 Pro (lingua it) | 11 flussi | 11 | 0 | +2 flussi (10, 11) | 6 min 30 s |
| E2E smoke | Maestro 2.11 | **Android** Expo Go 57.0.9 `host.exp.exponent`, Pixel 9 Pro API 35 (locale en-US) | 2 flussi | 2 | 0 | smoke esteso (tab centrale, barra ricerca, filtro tipo, lingua) | 2 min 16 s |

Primo giro E2E iOS: 6/11 (5 falliti). Le cause:
- 4 flussi bloccati da BUG-101;
- 2 errori nei test, già corretti: un chip fuori schermo nello scroll orizzontale dei filtri.

Primo giro Android: 0/2, per un errore d'ambiente. Due istanze di Maestro in parallelo (iOS e Android) si contendevano l'adb server. Rieseguito da solo: 2/2.

## Copertura v2

### Database (`supabase/tests/10_item_types.sql` + adeguamenti v1)
| Area | Cosa verifica |
|---|---|
| Schema | `items.item_type` (text, not null, default `other`); `items.attributes` (jsonb, not null, default `{}`); `boxes.default_item_type` (nullable); `search_items(text,text)` presente, firma `(text)` rimossa, security invoker |
| Vincoli | Gli 8 tipi accettati su item e box. Rifiutati: tipo sconosciuto, maiuscole, stringa vuota, null. `attributes`: ammessi author/model/serial stringa e `{}`; rifiutati chiavi estranee (`color`, `isbn`, `Author`), array, stringa JSON, JSON null, SQL null, valori numerici/oggetto/array/null |
| Colonna `search` | Include `attributes.author` e `serial` |
| RLS sulle nuove colonne | Bob viewer non cambia tipo e attributes, bob editor sì. `default_item_type`: lo cambia solo chi può modificare la scatola. Alice e carol non leggono gli attributes di Libri. Anon negato |
| Storico | Cambio di `item_type` o `attributes` → `updated` (attore, scatola). Update no-op → nessun evento. Move + cambio tipo → solo `moved` |
| `search_items` | Per autore (`eco`, `umberto`, `ECO`, prefisso `herb`), seriale e prefisso, modello (anche multi-parola e dopo un update). Filtro `p_type` (positivo e negativo, null esplicito). Query vuota + tipo: tutti i leggibili del tipo, ordinati per `updated_at desc`, max 50; solo spazi = vuota. Query vuota senza tipo → `[]`. `invalid_type` per tipo sconosciuto o `''`. Carol non trova nulla; alice non vede Libri; anon → 42501 |
| View | `box_overview.default_item_type` per bob, valori aggiornati. `security_invoker` mantenuto su entrambe le view ricreate |
| Seed v2 | `default_item_type` di Inverno ed Estate = clothing, di Libri = books. Oggetti di Inverno ed Estate tutti clothing. "Il nome della rosa": books, `{"author":"Umberto Eco"}`. Kindle Paperwhite: electronics con model e serial, evento `added` |
| Test v1 adeguati | `01` firma a 2 argomenti e conteggio seed di Libri = 2. `03`: bob vede 7 oggetti. `08`: `box_overview` di Libri = 2. Le chiamate v1 a 1 argomento ora usano il default `p_type = null` |

### Jest (`mobile/__tests__/`)
| File | Cosa verifica |
|---|---|
| `i18n/locales.test.ts` (nuovo) | Stesse chiavi in it.json ed en.json, nessun valore vuoto, stessi placeholder `{{…}}`. Il brand non è scritto a mano (si usa `{{app}}`). en non è una copia dell'it. Chiavi obbligatorie (`itemTypes.*`, `seasons.*`, `roles.*`, `errors.rpc.*` compreso `invalid_type`). Etichette italiane dei tipi come da contratto |
| `i18n/hardcoded.test.ts` (nuovo) | Euristica statica su `mobile/src` (esclusi `locales/` e `brand.ts`) che cerca: testo JSX letterale, prop visibili (`title`, `label`, `placeholder`, `message`, `accessibilityLabel`…) con stringa letterale, chiavi di opzioni (`headerTitle`, `tabBarLabel`…), stringhe con accenti, apostrofo tipografico o parole italiane frequenti, `Alert.alert` letterale. Ignora testID, icone, route, URL, chiavi i18n e commenti. Ha un autotest con casi positivi e negativi. Al primo giro trovava 99 stringhe; ora 0 |
| `i18n/language.test.tsx` (nuovo) | Lingua iniziale `it` nei test; `LANG_KEY = stivo.lang`. Cambio it → en → it con aggiornamento immediato di un testo renderizzato, salvataggio in AsyncStorage, `loadSavedLanguage` (valori non validi ignorati). `{{app}}` → Stivo in entrambe le lingue, fallback en. Lingua del dispositivo: it → it; en, fr, de → en |
| `lib/itemTypes.test.ts` (nuovo) | Registro degli 8 tipi in ordine. Campi per tipo (size/season, author, model/serial, nessuno), icone, `isItemType` (rifiuta le chiavi del prototype), fallback `other`. `cleanAttributes` (solo le chiavi del tipo, trim, vuoti rimossi) |
| `lib/brand.test.ts` (nuovo) | `APP_NAME = 'Stivo'`. `app.json`: name, slug, scheme `["stivo","boxly"]`, bundle id e package `com.stivo.app`, nessun "Boxly" residuo |
| `screens/search.test.tsx` (nuovo) | Input + chip "Tutti" + 8 tipi. Nessuna RPC a riposo. Ricerca per autore → risultato → `/item/[id]`. Solo chip → `('', tipo)`. Query + tipo e poi "Tutti". `search-empty`. `invalid_type` tradotto |
| `screens/homeProfile.test.tsx` (nuovo) | `new-box-button` e `home-search-bar` visibili anche a lista vuota; navigazione verso `/search` e `/box/new`. Profilo: chip `lang-it`/`lang-en`; English cambia subito i testi e salva `stivo.lang`, poi torna in Italiano |
| `screens/itemForm.test.tsx` (riscritto) | Chip per gli 8 tipi, default `other`. Campi dinamici per ognuno degli 8 tipi. Cambio di tipo via chip. Payload: libro con autore; elettronica con seriale vuoto rimosso; clothing → books azzera size e season; books → other svuota `attributes`; precompilazione in modifica; nessuna chiave estranea |
| `screens/forms.test.tsx` | BoxForm: `box-type-none` + 8 chip, `default_item_type` nel payload (e null con "nessuno"), precompilazione in modifica |
| Adeguati | `qr` (genera `stivo://`, accetta anche `boxly://`, 23 casi rifiutati); `scan` (stivo e legacy, "non è di Stivo"); `label` (wordmark Stivo, stagione tradotta in en); `api` (`search_items` con `p_type` sempre presente); `errors` (+`invalid_type`); `boxDetail` (`item-type-icon-<id>` con etichetta tradotta, autore nella riga); `share`, `smoke`, `mocks` |

### E2E (Maestro)

Su iOS il simulatore è in italiano, quindi l'app parte in it. Su Android l'emulatore è en-US, quindi parte in en (comportamento corretto da contratto). Per questo i flussi usano testID; il testo compare solo per dati utente, dialoghi di sistema o per verificare proprio la lingua.

| Flusso (`e2e/`) | iOS (build nativa) | Android (Expo Go) |
|---|:---:|:---:|
| 01 Login con password errata → `auth-error` | ✅ | ✅ (smoke) |
| 02 Login alice → lista; tab `tab-scan` · `tab-boxes` · `tab-profile`, niente `tab-search`, `home-search-bar` e `new-box-button` | ✅ | ✅ (smoke) |
| 03 Registrazione → lista vuota con `new-box-button` e `home-search-bar` visibili → apre "Nuova scatola" | ✅ | — |
| 04 Crea scatola → oggetto con foto → QR | ✅ | — |
| 05 Condivisione alice → carol in sola lettura, revoca | ✅ | — |
| 06 Ruoli bob (viewer / editor) | ✅ | ✅ (solo viewer) |
| 07 Ricerca da `home-search-bar`: "maglione", filtro Vestiti (resta), filtro Scarpe e accessori (`search-empty`), dettaglio, nessun risultato | ✅ | ✅ (smoke, filtro Vestiti) |
| 08 Deep link `stivo://box/…0001` e legacy `boxly://box/…0001` → Inverno 2025; `stivo://` prima del login → Estate dopo il login | ✅ | ⚠️ non testabile in Expo Go |
| 09 Profilo, logout, sessione non ripristinata | ✅ | ✅ (smoke) |
| **10** (nuovo) Scatola con tipo predefinito Libri → l'oggetto nasce come libro (`item-author-input` visibile, `item-size-input` no) → autore → `item-type-icon` → la ricerca per autore lo trova; con il filtro Vestiti sparisce | ✅ | — |
| **11** (nuovo) Profilo: `lang-en` → "Log out", Scatole in inglese, riavvio → resta in inglese, `lang-it` → "Esci" | ✅ | ✅ (smoke: en → it → en) |
| Dettaglio scatola → QR, `item-type-icon` nella riga | ✅ | ✅ (smoke) |

Altre modifiche E2E:
- `appId` → `com.stivo.app` in tutti i flussi e subflow;
- i selettori sui testi UI sostituiti da testID (righe seed `item-row-2222…0001`, risultati `search-result-2222…0001`, `item-edit-button`);
- 03 chiude la tastiera con un tocco a coordinate invece che sul testo;
- `scripts/run-e2e.sh` e `android/subflows/open_expo.yaml` aggiornati (Stivo, testi di attesa in it ed en).

## Bug trovati (v2)

| ID | Severità | Owner | Descrizione | Stato |
|---|---|---|---|---|
| BUG-101 | Alta | frontend | iOS (dev build): dopo il login un toast LogBox ("Open debugger to view warnings") copriva la tab bar e il footer dei form. Il primo tap su `tab-profile` o `box-save` andava perso: 4 flussi E2E rossi (04, 09, 10, 11). Causa: warning di expo-linking "multiple possible URI schemes" dovuto ai due schemi `stivo` e `boxly` richiesti dal contratto | ✅ Silenziato in modo mirato (`LogBox.ignoreLogs` in `_layout.tsx`, commentato; non eliminabile alla fonte perché expo-router chiama `Linking.createURL` senza schema). iOS 11/11 |
| BUG-102 | Bassa | frontend | Profilo: la tagline "Stivo · Sai sempre cosa c'è dentro." finiva sotto il pulsante centrale `tab-boxes` in rilievo | ✅ Corretto (padding inferiore), verificato a schermo |

Note, non bug:
- Gli errori segnalati da backend in `10_item_types.sql` erano dei test: il nome seed è `Libro "Il nome della rosa"`, e gli insert di prova di alice finivano nei suoi risultati. Un test sull'ordinamento era non deterministico perché `now()` è costante nella transazione; ora forza `updated_at` in modo esplicito.
- Sul simulatore c'era ancora la vecchia app `com.boxly.app`, che registra lo schema `boxly://`. È stata disinstallata, così il test del link legacy apre davvero Stivo.

## Limiti (v2)
- **Login Google**: fuori scope della v2, non testato.
- **Android solo in Expo Go**, come in v1 (Gradle bloccato dal proxy). Esclusi:
  - deep link `stivo://` e `boxly://`;
  - selezione della foto;
  - nome e icona nativi `com.stivo.app`.

  Il cambio lingua su Android è coperto. La lingua scelta resta salvata in AsyncStorage di Expo Go tra un giro e l'altro.
- **Persistenza della lingua al riavvio**: verificata su iOS, con la sessione ripristinata. Il ramo "schermata di login già in inglese dopo il riavvio" è nel flusso 11 come ramo condizionale, ma in questo giro non è stato eseguito.
- **Chip dei tipi fuori schermo**: i filtri oltre il terzo (Libri, Elettronica…) richiedono uno scroll orizzontale. Gli E2E usano i chip sempre visibili; gli altri sono coperti in Jest e pgTAP.
- **Euristica sulle stringhe hardcoded**: è statica e approssimata. Non vede testi costruiti dinamicamente fuori da `t()`, né stringhe inglesi senza parole italiane. Va affiancata alla revisione del codice.
- **Etichetta PDF in inglese**: verificata solo nell'HTML in Jest (stagione tradotta), non su stampa reale.
- Restano validi i limiti della v1 (fotocamera reale, stampa fisica, concorrenza, accessibilità, prestazioni).

## Screenshot E2E (v2)
- **iOS**: [02](../e2e/screenshots/ios/02_box_list_alice.png) · [03](../e2e/screenshots/ios/03_signup_empty.png) · [07a](../e2e/screenshots/ios/07a_search_maglione.png) · [08a stivo://](../e2e/screenshots/ios/08a_deeplink_stivo_inverno.png) · [08b boxly:// legacy](../e2e/screenshots/ios/08b_deeplink_boxly_legacy.png) · [08c dopo il login](../e2e/screenshots/ios/08c_deeplink_after_login.png) · [10a form libro](../e2e/screenshots/ios/10a_item_book_author.png) · [10b](../e2e/screenshots/ios/10b_box_with_book.png) · [10c ricerca per autore](../e2e/screenshots/ios/10c_search_by_author.png) · [11a profilo EN](../e2e/screenshots/ios/11a_profile_english.png) · [11b scatole EN](../e2e/screenshots/ios/11b_boxes_english.png) · [11d profilo IT](../e2e/screenshots/ios/11d_profile_italiano.png)
- **Android**: [lista](../e2e/screenshots/android/android_02_box_list.png) · [dettaglio](../e2e/screenshots/android/android_03_box_detail.png) · [ricerca](../e2e/screenshots/android/android_05_search.png) · [lingua IT](../e2e/screenshots/android/android_06_lang_it.png) · [logout](../e2e/screenshots/android/android_07_logged_out.png) · [bob viewer](../e2e/screenshots/android/android_08_bob_viewer.png)

I comandi per rieseguire sono invariati: vedi [in fondo](#comandi-per-rieseguire). Prima di ogni giro E2E serve `supabase db reset`. Non lanciare iOS e Android in parallelo.

---

# v1 (2026-10-15) — storico

> Sezione originale della v1 (app "Boxly"), lasciata come storico. Nomi, schemi e testID sono quelli della v1.
> Gli screenshot con lo stesso nome file sono stati sovrascritti dal giro v2. Le versioni v1 sono nella storia git (commit `b01532e`).

## Sintesi esecutiva

🟢 **VERDE.** Tutte le suite passano sull'ultimo giro: database, unit/componenti, E2E iOS su build nativa, smoke Android in Expo Go. Nessun bug aperto.

- Il database rispetta per intero la matrice permessi del contratto (§3) per alice, bob, carol e anon. Verificati anche RPC e codici errore (§4), storico, ricerca, view e policy dello storage.
- I 5 bug trovati (tutti frontend) sono corretti e riverificati. Al backend non è stato segnalato nessun bug.
- Android gira in **Expo Go**, non in build nativa: la build Gradle è bloccata dal proxy aziendale (decisione dell'utente). Su Android quindi c'è uno smoke del percorso principale, non la suite completa (vedi [Limiti](#limiti-e-cose-non-testate)).

## Risultati per suite

| Suite | Strumento | Piattaforma | Totali | Passati | Falliti | Saltati | Durata |
|---|---|---|---:|---:|---:|---:|---:|
| Database (RLS, RPC, trigger, ricerca, view, storage) | pgTAP via `supabase test db` | Postgres locale (Supabase CLI 2.121) | 235 (9 file) | 235 | 0 | 0 | ~1 s (+2 s container) |
| Unit + componenti + schermate | Jest 29 + RNTL 13 (jest-expo) | Node | 123 (15 suite) | 123 | 0 | 0 | ~4 s |
| E2E completa | Maestro 2.11 | **iOS** build nativa `com.boxly.app` — iPhone 17 Pro, iOS 26.3 | 9 flussi | 9 | 0 | 0 | 5 min 09 s |
| E2E smoke | Maestro 2.11 | **Android** Expo Go `host.exp.exponent` — Pixel 9 Pro API 35 | 2 flussi | 2 | 0 | 0 | 1 min 36 s |
| Manuale su dispositivo fisico | a mano (utente) | **Android** Expo Go 57.0.9 — Samsung Galaxy A02s, Android 12 | 2 verifiche | 2 | 0 | 0 | — |

### Test manuali su dispositivo fisico (2026-10-15)
| Verifica | Esito |
|---|---|
| Scatto foto con la fotocamera reale nel form oggetto (`item-photo-camera`) | ✅ funziona |
| Scansione con la fotocamera reale del QR di una scatola (mostrato sullo schermo del simulatore iOS) → apre la scatola corretta | ✅ funziona |

### Copertura E2E per piattaforma

| Flusso (`e2e/`) | iOS (build nativa) | Android (Expo Go) |
|---|:---:|:---:|
| 01 Login con password errata → `auth-error` | ✅ | ✅ (smoke) |
| 02 Login alice → lista: mie + condivise, Libri non visibile | ✅ | ✅ (smoke) |
| 03 Registrazione → lista vuota | ✅ | — |
| 04 Crea scatola → oggetto con foto dalla libreria → QR | ✅ | — |
| 05 Condivisione: alice → carol in sola lettura (+ errore `user_not_found`), carol vede ma niente `add-item-button`, revoca | ✅ | — |
| 06 Ruoli bob: viewer su Inverno, editor su Estate | ✅ | ✅ (solo viewer) |
| 07 Ricerca "maglione" + nessun risultato | ✅ | ✅ (smoke) |
| 08 Deep link `boxly://box/1111…0001` (da loggato e prima del login) | ✅ | ⚠️ non testabile in Expo Go |
| 09 Profilo, logout, sessione non ripristinata al riavvio | ✅ | ✅ (smoke) |
| Dettaglio scatola → QR | ✅ (04) | ✅ (smoke) |

### Cosa copre il database (pgTAP, `supabase/tests/`)

| File | Contenuto |
|---|---|
| `01_schema.sql` | Tabelle, RLS attiva, view `security_invoker`, helper `security definer stable`, colonna `search` generata + GIN, vincoli (lunghezze, stagioni, ruoli, azioni), seed del §5 (utenti con bcrypt e identity, scatole, condivisioni, oggetti), trigger profilo su signup, bucket privato, `updated_at` |
| `02_rls_boxes.sql` | `box_role`, `can_read_box`, `can_edit_box` per i 3 utenti. Select, insert, update e delete su `boxes` per owner, editor, viewer, carol e anon. `owner_id` e `created_by` immutabili (`forbidden`). Cancellazione a cascata |
| `03_rls_items.sql` | Matrice completa su `items`, compreso lo spostamento con permesso su **entrambe** le scatole e il vincolo `created_by = auth.uid()` |
| `04_rls_shares_profiles_events.sql` | `box_shares`: insert e update solo via RPC, delete diretta solo di se stessi. `profiles`: visibilità tra chi condivide e update solo di sé. `item_events`: sola lettura, visibili anche tramite `from_box_id` |
| `05_rpc.sql` | `share_box`: `not_owner` (viewer, editor, carol, su scatola altrui), `invalid_role`, `user_not_found`, `cannot_share_with_self` (anche con maiuscole), email case-insensitive, upsert del ruolo, anon. `revoke_share`: owner, uscita volontaria, `not_owner`, no-op |
| `06_move_item.sql` | `move_item`: `forbidden` in tutte le combinazioni senza permesso, successo e riga restituita, evento `moved` |
| `07_history.sql` | Trigger `added`, `updated`, `moved`, `removed`. Attore, ordine, l'evento sopravvive all'oggetto, update no-op senza evento, move + altri campi = solo `moved`, cancellazione scatola senza `removed`, `from_box_id → null` |
| `08_search_views.sql` | `search_items`: "maglione blu" trovato da alice e bob, nulla per carol. Prefisso, maiuscole, brand, ricerca a metà parola, accenti (unaccent), max 50, input vuoto o con caratteri speciali. `box_overview` (ruolo, conteggi, ordinamento), `box_share_members` |
| `09_storage.sql` | Bucket `item-photos`: upload owner/editor ✓, viewer/carol ✗. Lettura per chi legge la scatola. Delete e update solo per chi può modificare. Path verso un item inesistente o non valido rifiutato. Anon |

Smoke HTTP aggiuntivo, eseguito a mano con curl:
- login GoTrue dei 3 utenti seed;
- upload storage: editor 200, viewer 403;
- signed URL e delete tramite API;
- errore RPC via PostgREST con `message = "not_owner"`.

### Copertura Jest (`mobile/__tests__/`)

| Area | File di test | Cosa verifica |
|---|---|---|
| QR / deep link | `lib/qr.test.ts`, `screens/scan.test.tsx` | Encode/decode di `boxly://box/<uuid>`, 15 QR non validi rifiutati, "Questo QR non è di Boxly", nessuna doppia navigazione, inserimento manuale senza fotocamera |
| Errori RPC | `lib/errors.test.ts`, `lib/api.test.ts` | Ogni `RpcErrorCode` ha un messaggio italiano distinto; errori auth, rete, RLS e fallback; le chiavi del prototype non vengono mappate (BUG-001). Parametri esatti delle RPC del §4 |
| Ruoli | `screens/boxDetail.test.tsx`, `screens/itemDetail.test.tsx`, `screens/share.test.tsx` | owner, editor e viewer: i pulsanti di modifica **non renderizzati** per il viewer. Destinazioni di spostamento filtrate. Form di condivisione solo per l'owner. "Esci" per sé stessi |
| Form | `screens/forms.test.tsx`, `screens/itemForm.test.tsx` | Login (campi vuoti, credenziali errate), BoxForm (nome obbligatorio, max 80, trim, null), ItemForm (nome obbligatorio, max 120, foto, permesso negato, annullamento) |
| Varie | `lib/labels`, `lib/label`, `lib/photos`, `lib/supabaseUrl`, `components/` | Etichetta 6×6 con escape HTML, base64, host `10.0.2.2` su Android, componenti base |

Copertura (Istanbul):

| Ambito | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| File caricati dai test | 74.1 % | 71.5 % | 65.1 % | 76.2 % |
| Tutto `mobile/src` | 50.2 % | 51.2 % | 43.4 % | 52.2 % |

Le schermate senza unit test sono coperte dall'E2E: lista, ricerca, profilo, QR, storico, `new`/`edit` e i layout di navigazione.

## Bug trovati

| ID | Severità | Owner | Descrizione | Stato |
|---|---|---|---|---|
| BUG-001 | Bassa | frontend | `errorMessage({message:'toString'})` restituiva una funzione (`in` usato sul prototype) | ✅ Corretto (`hasOwnProperty`), riverificato in Jest |
| BUG-002 | Media | frontend | iOS: registrazione impossibile. L'overlay "Password sicura automatica" (`textContentType="newPassword"`) bloccava l'invio, senza feedback all'utente | ✅ Corretto (`oneTimeCode` su iOS, feedback garantito), `03_signup` verde |
| BUG-003 | Bassa | frontend | iOS: nei form (registrazione, scatola, oggetto) campi successivi e pulsante Salva restavano sotto la tastiera. Un tocco finiva sui tasti, nel campo sbagliato (nome salvato come "Cappotto cammelloyZaradbeige") | ✅ Corretto (scroll al campo attivo + footer Salva fisso sopra la tastiera), riverificato a tastiera aperta |
| BUG-004 | Alta | frontend | Android (Expo Go): la tab bar non rispondeva ai tocchi (toast di LogBox sopra la tab bar), quindi niente Cerca/Profilo/logout | ✅ Corretto, smoke Android 2/2 |
| BUG-005 | Bassa | frontend | LogBox rosso "Can't perform a React state update on a component that hasn't mounted yet" all'avvio via `exp://`. Viene da expo-router, non dal codice dell'app | ✅ Silenziato in modo mirato (`LogBox.ignoreLogs`, commentato in `_layout.tsx`) |

Note, non bug:
- Il dialogo di sistema iOS "Vuoi salvare la password?" dopo il login viene chiuso dal sottoflusso `subflows/login.yaml`.
- Nei test pgTAP il DELETE diretto su `storage.objects` richiede `storage.allow_delete_query`. È la protezione di Supabase; l'app cancella tramite la Storage API.

## Limiti e cose non testate

- **Android in Expo Go, non in build nativa.** Il proxy aziendale blocca Gradle (`plugins.gradle.org` 403). Sono quindi esclusi:
  - deep link `boxly://` (in Expo Go l'app vive sotto `exp://`);
  - selezione della foto dalla libreria;
  - icona e splash nativi;
  - permessi nativi dell'app.

  Su Android coperti: login ok/errato, lista, dettaglio, QR, ricerca, ruolo viewer, logout. Da ripetere con `npx expo run:android` quando il proxy lo permette.
- **Fotocamera reale.** ~~Non testata sui simulatori.~~ Verificata a mano su dispositivo fisico Android (Samsung Galaxy A02s, Expo Go): scatto foto e scansione QR funzionano. Resta non verificata su un iPhone fisico e non automatizzata (Maestro non ha accesso alla fotocamera).
- **Stampa e condivisione fisica dell'etichetta.** `print-label-button` e `share-qr-button` sono verificati solo come presenti. La stampa reale e il foglio di condivisione di sistema non sono testati. Il contenuto HTML dell'etichetta 6×6 è testato in Jest.
- **Contenuto ottico del QR.** Nessun decoder automatico nei test; il valore codificato è verificato in unit test (`boxQrValue`, SVG deterministico per id). La lettura ottica end-to-end è stata verificata a mano: il QR mostrato dall'app iOS, letto dal telefono Android, apre la scatola giusta.
- **Concorrenza e realtime.** Non coperti: modifiche simultanee di due utenti, scadenza delle signed URL dopo 60 min, refresh del token.
- **Accessibilità e tema scuro.** Non verificati in modo sistematico. Nota a margine: le card espongono un'unica etichetta di accessibilità che unisce i testi.
- **Prestazioni.** Ricerca e liste sono state provate solo sui dati seed (più 60 oggetti nel test del limite a 50).

## Screenshot E2E

Generati da `takeScreenshot` e raccolti da `e2e/scripts/run-e2e.sh` in `e2e/screenshots/<piattaforma>/`.

**iOS (build nativa)**

| Passo | Screenshot |
|---|---|
| Login errato | [01_login_error](../e2e/screenshots/ios/01_login_error.png) |
| Lista di alice | [02_box_list_alice](../e2e/screenshots/ios/02_box_list_alice.png) |
| Registrazione → lista vuota | [03_signup_empty](../e2e/screenshots/ios/03_signup_empty.png) |
| Form scatola, form oggetto, scatola con oggetto e foto, QR | [04a](../e2e/screenshots/ios/04a_box_form.png) · [04b](../e2e/screenshots/ios/04b_item_form.png) · [04c](../e2e/screenshots/ios/04c_box_with_item.png) · [04d](../e2e/screenshots/ios/04d_qr.png) |
| Condivisione: errore, condivisa con carol, carol in sola lettura | [05a](../e2e/screenshots/ios/05a_share_error.png) · [05b](../e2e/screenshots/ios/05b_shared_with_carol.png) · [05c](../e2e/screenshots/ios/05c_carol_readonly.png) |
| Bob viewer / editor | [06a](../e2e/screenshots/ios/06a_bob_viewer.png) · [06b](../e2e/screenshots/ios/06b_bob_editor.png) |
| Ricerca "maglione" / nessun risultato | [07a](../e2e/screenshots/ios/07a_search_maglione.png) · [07b](../e2e/screenshots/ios/07b_search_empty.png) |
| Deep link da loggato / dopo il login | [08a](../e2e/screenshots/ios/08a_deeplink_inverno.png) · [08b](../e2e/screenshots/ios/08b_deeplink_after_login.png) |
| Profilo / logout | [09a](../e2e/screenshots/ios/09a_profile.png) · [09b](../e2e/screenshots/ios/09b_logged_out.png) |

**Android (Expo Go)**

[login errato](../e2e/screenshots/android/android_01_login_error.png) · [lista](../e2e/screenshots/android/android_02_box_list.png) · [dettaglio](../e2e/screenshots/android/android_03_box_detail.png) · [QR](../e2e/screenshots/android/android_04_qr.png) · [ricerca](../e2e/screenshots/android/android_05_search.png) · [logout](../e2e/screenshots/android/android_06_logged_out.png) · [bob viewer](../e2e/screenshots/android/android_07_bob_viewer.png)

I report JUnit e gli artefatti di debug di Maestro sono in `e2e/reports/<piattaforma>/<timestamp>/`. Sono generati: conviene aggiungere `e2e/reports/` al `.gitignore` (owner: lead).

## Comandi per rieseguire

```bash
# 0. Backend
supabase start
supabase db reset            # migrazioni + seed: farlo prima di ogni giro E2E

# 1. Database (pgTAP)
supabase test db

# 2. Jest
cd mobile && npm test
npx jest --coverage --collectCoverageFrom='src/**/*.{ts,tsx}'   # copertura su tutto src

# 3. E2E iOS (build nativa già installata, Metro su :8081)
#    cd mobile && npx expo run:ios   (se l'app non è installata)
e2e/scripts/run-e2e.sh ios
#    in alternativa: maestro --device <UDID iPhone 17 Pro> test e2e/

# 4. E2E Android (Expo Go, dev server su :8082 → exp://10.0.2.2:8082)
#    cd mobile && npx expo start --port 8082
e2e/scripts/run-e2e.sh android
#    in alternativa: maestro --device emulator-5554 test e2e/android/
```

Lo script `run-e2e.sh` fa tre cose:
- precarica `e2e/fixtures/maglione.jpg` nella libreria del dispositivo (`scripts/preload-media.sh`: `xcrun simctl addmedia` / `adb push`);
- esegue i flussi sul dispositivo giusto: con iOS e Android accesi insieme, Maestro senza `--device` può scegliere quello sbagliato;
- copia gli screenshot in `e2e/screenshots/`.
