# Stivo (ex Boxly)

App mobile (Expo + Supabase locale) per catalogare oggetti nelle scatole e ritrovarli con un QR.
Brand: [BRAND.md](BRAND.md) · Contratto tecnico: [docs/CONTRACT.md](docs/CONTRACT.md) (**leggi la sezione v2**) · Tipi: [shared/types.ts](shared/types.ts)

## Ownership dei file (agent team)
| Area | Owner |
|---|---|
| `BRAND.md`, `CLAUDE.md`, `docs/CONTRACT.md`, `shared/` | lead |
| `supabase/` (escluso `supabase/tests/`) | backend |
| `mobile/` (escluso `mobile/__tests__/`) | frontend (inclusi package.json e config Jest) |
| `mobile/__tests__/`, `supabase/tests/`, `e2e/`, `docs/TEST_REPORT.md` | qa |

Non modificare file di altri: manda un messaggio all'owner. Cambi al contratto → lead.

## Comandi
- Backend: `supabase start` · `supabase db reset` (migrazioni + seed) · `supabase test db` · `supabase status`
- App: `cd mobile && npx expo run:ios` / `npx expo run:android` · `npm test` · `npx tsc --noEmit`
- E2E: `maestro test e2e/` (app già installata sul simulatore)
- Simulatori: iOS "iPhone 17 Pro", Android AVD "Pixel_9_Pro_API_VanillaIceCream"

## Convenzioni
- Testi UI **solo** in `mobile/src/i18n/locales/{it,en}.json` (it principale, en fallback), tono da BRAND.md. Il nome dell'app solo via `APP_NAME` / `{{app}}`. TypeScript strict.
- Import da `shared/` solo `import type`.
- Nessun segreto nel repo oltre alle chiavi locali di Supabase (demo).
