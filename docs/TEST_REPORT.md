# Boxly — Test report

Owner: **qa** · Data: 2026-10-15 · Fonte di verità: [CONTRACT.md](CONTRACT.md)

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
- **Fotocamera reale.** Né lo scatto (`item-photo-camera`) né la lettura di un QR con la fotocamera sono testati: i simulatori non hanno fotocamera. La logica dello scanner è coperta in Jest (CameraView mockata) e con l'inserimento manuale del codice.
- **Stampa e condivisione fisica dell'etichetta.** `print-label-button` e `share-qr-button` sono verificati solo come presenti. La stampa reale e il foglio di condivisione di sistema non sono testati. Il contenuto HTML dell'etichetta 6×6 è testato in Jest.
- **Contenuto ottico del QR.** Il QR non viene decodificato dall'immagine (manca un decoder). Il valore codificato è verificato in unit test: `boxQrValue` e SVG deterministico per id.
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
