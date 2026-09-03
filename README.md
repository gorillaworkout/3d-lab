# 3D Lab + Kas

Admin-only web app for Bayu: one photo → Tripo image-to-3D (no texture) → rotatable preview, GLB + STL download, print quote (**perkiraan**), persisted jobs, and a cash book.

Not in v0: customer payments/shipping/printer queue, mesh editor, required multi-photo photogrammetry, resin/multi-material, self-host GPU, 9Router as 3D engine, chat.

## Stack

- Next.js App Router (Vercel-ready)
- Firebase Auth / Firestore / Storage **pattern** (optional until you add keys)
- `TripoProvider` adapter (swap Meshy later without UI changes)
- Local `.data/` JSON + files when Firebase Admin is missing (fine for demo; ephemeral on Vercel)

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Unauthenticated users are redirected to `/login` by middleware (no admin chrome).

### Environment

Copy names from `.env.example`. **Never put secrets in `NEXT_PUBLIC_*` or the browser bundle.**

| Variable | Where | Purpose |
| --- | --- | --- |
| `TRIPO_API_KEY` | server only | Live image-to-3D |
| `MOCK_TRIPO=1` | server only | Fake labeled cube GLB |
| `SESSION_SECRET` | server only | HMAC session cookie |
| `ADMIN_EMAIL` | server only | Optional allowlist |
| `DEV_AUTH_BYPASS=1` | server, **ignored in production** | Demo login + huge banner |
| `NEXT_PUBLIC_FIREBASE_*` | public Firebase web config | Google / email login |
| `FIREBASE_ADMIN_*` | server only | Firestore + Storage persist |

Do not invent Firebase or Tripo credentials. Paste values from your own consoles.

### Firebase

1. Create a Firebase project (Google + Email/Password).
2. Add a web app; copy the public config into `NEXT_PUBLIC_FIREBASE_*`.
3. Create the single admin user (Bayu) in Authentication — no public signup in this app.
4. For production persist: download a service account, set `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (escape newlines as `\n`), and `FIREBASE_STORAGE_BUCKET`.
5. Firestore collections used: `jobs`, `kas`, `settings/app`. Storage paths: `jobs/{id}/photo.*`, `model.glb`, `model.stl`.

Without Firebase: `/login` explains the empty config. Production stays closed. Development can set `DEV_AUTH_BYPASS=1` for a demo session with a large warning banner.

### Tripo

Live path (server-side only):

- Upload: `POST https://openapi.tripo3d.ai/v3/files`
- Generate: `POST https://openapi.tripo3d.ai/v3/generation/image-to-model` with `model: v3.1-20260211`, `texture: false`, `pbr: false`
- Poll: `GET https://openapi.tripo3d.ai/v3/tasks/{task_id}`
- Balance: `GET https://openapi.tripo3d.ai/v3/account/balance`

Default without `TRIPO_API_KEY`: generate refuses with **Butuh TRIPO_API_KEY di environment server**.  
`MOCK_TRIPO=1` produces a clearly labeled fake 20 mm cube GLB (~20 mock credits so kas auto-expense can be demoed). Failed generate with `credits_consumed = 0` does **not** write kas.

GLB→STL is converted on the server. Volume/HPP runs only after a watertight check (manifold-equivalent: merge verts, two-manifold edges, consistent winding, signed volume). If that fails the job is marked **perlu perbaikan** — grams/HPP are not faked.

### Vercel

1. Import this repo.
2. Set the same env vars (Production + Preview).
3. Deploy. Add Firebase Admin if you need durable jobs/kas/files.

## Routes

- `/login`
- `/` dashboard (recent jobs, credits if API provides them, kas this month)
- `/jobs/new` upload + generate
- `/jobs/:id` preview, quote, downloads, mark printed
- `/kas` list + in/out
- `/settings` prices & markup

## Quote (always labeled perkiraan)

- PLA density `1.24 g/cm³`
- Scale mesh so tallest side = target height (mm)
- `gram_estimasi = volume_cm3 × (infill/100) × 1.24 × support_factor`
- `HPP = (gram × filament_price_per_g) + (estimasi_jam × machine_cost_per_hour) + packing`
- `harga_jual_usulan = max(HPP × markup, min_sell_price)`
- `estimasi_jam` v0: `max(0.25, volume_cm3 / 15)` — not G-code

Unit test: `npm test`.

Kas auto expense: `credits_consumed × $0.01 × usd_idr` when `credits_consumed > 0`.

## Blocked without keys

| Missing | What still works | What is blocked |
| --- | --- | --- |
| Firebase client | Login empty-state; demo bypass in **dev only** | Real Google/email auth |
| Firebase Admin | Local `.data/` on one machine | Durable persist on Vercel |
| `TRIPO_API_KEY` | Quote, kas, settings, job records, UI | Live generate (unless `MOCK_TRIPO=1`) |
| Both Tripo options | Clear Indonesian error on generate | Mesh from a photo |

## Scripts

```bash
npm run dev
npm run build
npm test
```
