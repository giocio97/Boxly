# Stivo (ex Boxly): riepilogo e checklist

Aggiornato al 2026-10-17 · Repository: https://github.com/giocio97/Boxly

## Cos'è Boxly
App mobile per catalogare cosa metti nelle scatole (cambio stagione, trasloco, cantina).
Fotografi gli oggetti, li inserisci nella scatola, l'app genera un QR da attaccare alla scatola:
lo scansioni e vedi cosa c'è dentro. Ogni utente ha il suo account e può condividere le scatole
in sola lettura o in modifica.
Payoff: *Sai sempre cosa c'è dentro.*

## Cosa è stato fatto

### Preparazione
- Guida per usare gli agent teams, come skill (`~/.claude/skills/agent-teams/`), con il registro delle lezioni apprese.
- Identità del brand: nome **Boxly**, palette Kraft + Teal, font Inter, tono di voce ([BRAND.md](../BRAND.md)).
- Contratto tecnico unico per tutto il team, con database, permessi, schermate e testID ([CONTRACT.md](CONTRACT.md)).

### Sviluppo, con un team di 3 agenti
| Agente | Lavoro |
|---|---|
| **backend** | Supabase locale: tabelle, permessi owner/editor/viewer, storico automatico, foto, ricerca, condivisione, dati demo |
| **frontend** | App Expo: login, scatole, oggetti con foto, QR ed etichetta stampabile, scanner, condivisione, storico, ricerca, profilo, tema chiaro/scuro |
| **qa** | Test del database, test unitari, test end-to-end su iOS e Android, report dei test |

### Test ([TEST_REPORT.md](TEST_REPORT.md))
| Suite | Risultato |
|---|---|
| Database (permessi, storico, ricerca) | ✅ 235/235 |
| Test unitari app (Jest) | ✅ 123/123 |
| End-to-end iOS (build nativa) | ✅ 9/9 |
| End-to-end Android (Expo Go, emulatore) | ✅ 2/2 |
| Manuali su Samsung A02s: fotocamera e scansione QR | ✅ 2/2 |

5 bug trovati da qa, tutti corretti.

### Dove gira
- **iOS:** build nativa sul simulatore iPhone 17 Pro.
- **Android:** Expo Go sull'emulatore Pixel 9 Pro e sul telefono fisico Samsung A02s. La build nativa è bloccata dal proxy aziendale.

### Pubblicazione
- Codice su GitHub (`giocio97/Boxly`), con commit firmati da `giociotta@gmail.com`, solo in questo progetto.
- La configurazione git di lavoro, Bitbucket e Jira **non sono stati toccati**.

### Pianificazione v2
- Piano approvato e file di ripartenza: [NEXT_SESSION.md](NEXT_SESSION.md).

## Checklist

### v1: fatto
- [x] Guida agent teams + registro delle lezioni
- [x] Nome, brand e palette
- [x] Contratto tecnico (database, permessi, schermate, testID)
- [x] Backend Supabase locale con dati demo
- [x] Login email/password
- [x] Scatole: crea, modifica, elimina
- [x] Oggetti con foto (fotocamera e galleria)
- [x] QR per scatola + etichetta stampabile 6×6 cm
- [x] Scanner QR
- [x] Condivisione in sola lettura / modifica
- [x] Storico dei movimenti
- [x] Ricerca testuale
- [x] App su simulatore iOS
- [x] App su emulatore Android (Expo Go)
- [x] App su telefono Android fisico (Expo Go)
- [x] Test automatici tutti verdi + report
- [x] Test manuali di fotocamera e QR su dispositivo reale
- [x] Push su GitHub
- [x] Condivisione dell'etichetta in PDF funzionante su Android (Expo Go)
- [x] Telefono fisico collegato solo via USB (`adb reverse`), senza Wi-Fi
- [x] Foto ridimensionate prima del caricamento (≤1600 px, JPEG 70%)

### Da fare tu prima della prossima sessione
- [ ] Creare il client OAuth "Web application" su Google Cloud ([NEXT_SESSION.md §6](NEXT_SESSION.md))
- [ ] Inserire Client ID e Secret in `supabase/.env`
- [ ] Rinnovare il token GitHub "boxly" prima della scadenza del **14/11/2026**
- [ ] Verificare l'email Bitbucket sul cambio SSH (sospetta frode: non cliccare i link, eventualmente chiedere all'IT)

### v2: fatto il 2026-10-17 (test: pgTAP 358/358, Jest 252/252, Maestro iOS 11/11, Android Expo Go 2/2)
- [x] Tipi di oggetto (Vestiti, Scarpe e accessori, Libri, Elettronica, Casa e cucina, Giochi, Documenti, Altro) su oggetto e scatola
- [x] Campi specifici per tipo (es. autore per i libri, modello e seriale per l'elettronica)
- [x] Traduzione con i18n a chiavi: italiano + inglese
- [x] Sezione Lingua nel profilo
- [ ] Login con Google: **rimandato** (servono le credenziali Google Cloud, NEXT_SESSION.md §6)
- [x] Tab bar Scansiona · (Scatole) · Profilo, con Scatole al centro in rilievo
- [x] Barra di ricerca larga in cima alla schermata Scatole
- [x] Pulsante "Nuova scatola" flottante sopra la lista
- [x] Test aggiornati + sezione v2 nel report

### Dopo la v2
- [x] Scegliere il nome definitivo: **Stivo** (verifica preliminare: nessuna app omonima; `stivo.it` e `stivo.app` già registrati)
- [ ] Verifica ufficiale del marchio "Stivo" su EUIPO e UIBM e scelta del dominio (es. `getstivo.app`, `stivoapp.com`)
- [x] Rinominare l'app in Stivo (codice, QR `stivo://` con compatibilità `boxly://`, bundle id `com.stivo.app`, Supabase `stivo`)
- [ ] Rinominare il repository GitHub da `Boxly` a `Stivo` (lo fai tu), poi aggiornare il remote
- [ ] Scegliere l'hosting del backend (Supabase Cloud UE consigliato, NEXT_SESSION.md §7B) e pubblicare le migrazioni
- [ ] Placeholder del form oggetto adattati al tipo (oggi esempi di vestiti per tutti i tipi)
- [ ] Permessi nativi iOS tradotti (`locales` in app.json, serve build nativa)
- [ ] Ricerca AI "dov'è il maglione blu?"
- [ ] Guida al rilascio sugli store (EAS, account Apple e Google Play)
- [ ] Build Android nativa via EAS
- [ ] Test su iPhone fisico
- [ ] Accessibilità e tema scuro verificati sistematicamente
