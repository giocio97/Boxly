# Boxly — Contratto tecnico

Owner: **lead**. Il team lo legge, non lo modifica. Per un cambio: messaggio al lead con
motivazione. Tipi TypeScript: [`shared/types.ts`](../shared/types.ts).

## 1. Ambiente locale
- Supabase locale (`supabase start`): API `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`,
  DB `postgresql://postgres:postgres@127.0.0.1:54322/postgres`, Inbucket (email) `:54324`.
- Auth: email + password, **conferma email disattivata** in locale (`enable_confirmations = false`).
- App: variabili in `mobile/.env` → `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  (da `supabase status`). Su emulatore Android l'host è `10.0.2.2` invece di `127.0.0.1`:
  il client sostituisce l'host quando `Platform.OS === 'android'`.

## 2. Schema (schema `public`)
| Tabella | Colonne | Note |
|---|---|---|
| `profiles` | `id uuid pk → auth.users on delete cascade`, `email text unique not null`, `display_name text`, `created_at` | creata da trigger su `auth.users` insert (`display_name` da `raw_user_meta_data->>'display_name'`) |
| `boxes` | `id uuid pk default gen_random_uuid()`, `owner_id uuid not null default auth.uid() → profiles`, `name text not null` (1–80 char), `location text`, `season text`, `notes text`, `created_at`, `updated_at` | `season` ∈ `spring,summer,autumn,winter,all` o null |
| `items` | `id uuid pk`, `box_id uuid not null → boxes on delete cascade`, `name text not null` (1–120), `brand`, `color`, `category`, `size`, `season`, `notes`, `photo_path text`, `created_by uuid not null default auth.uid()`, `created_at`, `updated_at`, `search tsvector generated` | `search` = to_tsvector('simple', unaccent di name/brand/color/category/size/notes), indice GIN |
| `box_shares` | `box_id → boxes on delete cascade`, `user_id → profiles on delete cascade`, `role text` ∈ `viewer,editor`, `created_at`, **pk (box_id, user_id)** | l'owner non può comparire qui |
| `item_events` | `id bigserial pk`, `item_id uuid` (nessuna FK, sopravvive alla cancellazione), `item_name text not null`, `box_id uuid not null → boxes on delete cascade`, `from_box_id uuid` (null; FK `on delete set null`), `action text` ∈ `added,updated,moved,removed`, `actor_id uuid default auth.uid()`, `created_at` | scritta **solo da trigger** su `items` |

`updated_at` aggiornato da trigger su `boxes` e `items`.

Storico (trigger `after insert/update/delete on items`):
- insert → `added` (box_id = box dell'item)
- update con `box_id` cambiato → `moved` (box_id = destinazione, from_box_id = origine)
- update di altri campi → `updated`
- delete → `removed` (non scrivere l'evento se la scatola stessa è in cancellazione)

## 3. Permessi (RLS attiva su tutte le tabelle)
Helper `security definer stable`: `public.box_role(box_id uuid) returns text`
→ `'owner' | 'editor' | 'viewer' | null` per `auth.uid()`.
`can_read_box(id)` = role non null; `can_edit_box(id)` = role in (`owner`,`editor`).

| Risorsa | select | insert | update | delete |
|---|---|---|---|---|
| `profiles` | se stesso + utenti che condividono con me almeno una scatola (owner o share) | trigger | solo se stesso | — |
| `boxes` | `can_read_box` | `owner_id = auth.uid()` | `can_edit_box` (owner_id immutabile) | solo owner |
| `items` | `can_read_box(box_id)` | `can_edit_box(box_id)` e `created_by = auth.uid()` | `can_edit_box` su box vecchia **e** nuova | `can_edit_box` |
| `box_shares` | `can_read_box(box_id)` | solo via RPC | solo via RPC | via RPC; l'utente può rimuovere se stesso |
| `item_events` | `can_read_box(box_id)` o `can_read_box(from_box_id)` | nessuno (trigger) | nessuno | nessuno |

Storage bucket **`item-photos`** (privato). Path `<item_id>/<nomefile>.jpg`.
Lettura: `can_read_box` della scatola dell'item `(storage.foldername(name))[1]::uuid`.
Scrittura e cancellazione: `can_edit_box` della stessa scatola. L'item deve esistere prima
dell'upload. Flusso app: insert item → upload foto → update `photo_path`.
L'app mostra le foto con `createSignedUrl` (60 min).
Prima del caricamento l'app ridimensiona ogni foto a **≤1600 px sul lato lungo** e la salva in **JPEG al 70%**
(`preparePhoto` in `mobile/src/lib/photos.ts`); dimensione tipica 150–400 KB.

## 4. RPC e view
| Nome | Firma | Comportamento |
|---|---|---|
| `share_box` | `(p_box_id uuid, p_email text, p_role text) → box_shares` | solo owner (`not_owner`); `invalid_role`; email case-insensitive → `user_not_found`; se stessi → `cannot_share_with_self`; upsert del ruolo |
| `revoke_share` | `(p_box_id uuid, p_user_id uuid) → void` | owner, oppure l'utente stesso (abbandona); altrimenti `not_owner` |
| `move_item` | `(p_item_id uuid, p_to_box_id uuid) → items` | edit su entrambe le scatole, altrimenti `forbidden` |
| `search_items` | `(p_query text) → setof (items.* + box_name, box_location)` | `security invoker`; match full-text (prefix) **oppure** `ilike` su name/brand/color/category; max 50, ordinati per rilevanza |
| view `box_overview` | `boxes.* + my_role, item_count, owner_email` | `security_invoker = true`, ordinata per `updated_at desc` |
| view `box_share_members` | `box_shares.* + email, display_name` | `security_invoker = true` |

Gli errori RPC usano `raise exception '<codice>'`, quindi `error.message` è uguale al codice (vedi `RpcErrorCode`).

## 5. Dati demo (`supabase/seed.sql`, UUID fissi)
| Utente | Email / password | UUID |
|---|---|---|
| Alice | `alice@boxly.test` / `password123` | `00000000-0000-0000-0000-00000000000a` |
| Bob | `bob@boxly.test` / `password123` | `00000000-0000-0000-0000-00000000000b` |
| Carol (nessun accesso) | `carol@boxly.test` / `password123` | `00000000-0000-0000-0000-00000000000c` |

| Scatola | UUID | Owner | Condivisa | Contenuto |
|---|---|---|---|---|
| Inverno 2025 (Cantina, winter) | `11111111-1111-1111-1111-000000000001` | Alice | Bob **viewer** | Maglione blu (Uniqlo, blu, M), Piumino nero (The North Face), Sciarpa grigia |
| Estate (Armadio camera, summer) | `11111111-1111-1111-1111-000000000002` | Alice | Bob **editor** | Costume rosso, Camicia lino bianca |
| Libri (Garage, all) | `11111111-1111-1111-1111-000000000003` | Bob | — | Libro "Il nome della rosa" |

Gli utenti seed devono poter fare login: righe in `auth.users` con password bcrypt e
`auth.identities` (provider `email`).

## 6. App mobile (`mobile/`, expo-router)
Schema deep link `boxly`. Il QR codifica `boxly://box/<box_id>`. Lo scanner accetta solo
questo prefisso; un QR diverso mostra "Questo QR non è di Boxly".

| Route | Schermata |
|---|---|
| `(auth)/login`, `(auth)/signup` | accesso / registrazione |
| `(tabs)/index` | le mie scatole (mie + condivise) |
| `(tabs)/scan` | scanner QR |
| `(tabs)/search` | ricerca oggetti |
| `(tabs)/profile` | profilo, logout |
| `box/new`, `box/[id]/edit` | crea / modifica scatola |
| `box/[id]` | dettaglio: oggetti, ruolo, azioni |
| `box/[id]/qr` | QR + stampa/condividi etichetta |
| `box/[id]/share` | condivisioni (solo owner modifica) |
| `box/[id]/history` | storico |
| `item/new?boxId=` , `item/[id]` | nuovo oggetto / dettaglio-modifica-sposta-elimina |

Utenti non loggati → redirect a login. Il deep link a una scatola dopo il login apre quella scatola.

### testID (obbligatori: li usano i test Maestro scritti in parallelo)
- Login: `login-email`, `login-password`, `login-submit`, `goto-signup`, `auth-error`
- Signup: `signup-name`, `signup-email`, `signup-password`, `signup-submit`
- Tab bar: `tab-boxes`, `tab-scan`, `tab-search`, `tab-profile`
- Lista: `box-list`, `box-card-<boxId>`, `new-box-button`, `empty-boxes`
- Form scatola: `box-name-input`, `box-location-input`, `box-season-<season>`, `box-notes-input`, `box-save`
- Dettaglio: `box-title`, `role-badge`, `item-list`, `item-row-<itemId>`, `add-item-button`,
  `show-qr-button`, `share-button`, `history-button`, `edit-box-button`, `delete-box-button`, `empty-items`
- QR: `qr-code`, `print-label-button`, `share-qr-button`
- Condivisione: `share-email-input`, `share-role-viewer`, `share-role-editor`, `share-submit`,
  `share-row-<userId>`, `revoke-<userId>`, `share-error`
- Storico: `history-list`, `history-row-<eventId>`
- Form oggetto: `item-photo-camera`, `item-photo-library`, `item-photo-preview`, `item-name-input`,
  `item-brand-input`, `item-color-input`, `item-category-input`, `item-size-input`,
  `item-season-<season>`, `item-notes-input`, `item-save`
- Dettaglio oggetto: `item-edit-button`, `item-move-button`, `item-delete-button`, `move-target-<boxId>`
- Ricerca: `search-input`, `search-result-<itemId>`, `search-empty`
- Profilo: `profile-email`, `logout-button`
- Dialoghi di conferma: `confirm-yes`, `confirm-no`

Per i ruoli `viewer` i pulsanti di modifica **non sono renderizzati** (non basta disabilitarli).
