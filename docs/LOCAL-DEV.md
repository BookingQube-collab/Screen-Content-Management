# Local development (Urban Arena)

## Ports

| Service | Default port | Base URL |
| --- | --- | --- |
| **Urban Arena UI** (Vite, `artifacts/urban-arena`) | **24725** | http://localhost:24725 |
| **API** (`artifacts/api-server`) | **8080** | http://localhost:8080 |

Use **24725** for the UI so it does not conflict with other projects on **3000**. The API stays on **8080** (see root `.env.example` `PORT=8080`).

On **Vercel**, the frontend project still sets `PORT=3000` at **build** time only ([DEPLOY.md](../DEPLOY.md)); that value is not your local dev URL.

## Quick start

1. Copy [.env.example](../.env.example) → `.env` in the **repo root** and fill `DATABASE_URL`, `JWT_SECRET`, `PORT=8080`.
2. From the repo root, run **`pnpm dev`** (starts API + UI in parallel). Use **pnpm**, not `npm run dev` (root has no npm `dev` script).

Individual services (optional):

- **API only:** `pnpm run dev:api` (loads root `.env` via `--env-file`)
- **UI only:** `pnpm run dev:ui` (UI on port **24725**, `BASE_PATH=/`)

Legacy filters still work: `pnpm --filter @workspace/api-server run dev` and `pnpm --filter @workspace/urban-arena run dev`.

Vite proxies browser requests from `/api/*` to `http://localhost:8080` (see `artifacts/urban-arena/vite.config.ts`).

## Useful URLs (UI on 24725)

| Page | URL |
| --- | --- |
| Kiosk display | http://localhost:24725/display |
| Display config | http://localhost:24725/display/config |
| Admin login | http://localhost:24725/admin/login |
| API health (via proxy) | http://localhost:24725/api/health |

Demo admin (after `pnpm --filter @workspace/scripts run seed`): `admin@urbanarana.com` / `admin123`.

## Overrides

| Variable | When |
| --- | --- |
| `VITE_DEV_PORT` | Change UI port locally (e.g. `24726`) |
| `PORT` in `.env` | API listen port only (`8080`); ignored by Vite on local Windows unless `REPL_ID` is set (Replit uses `PORT=24725` for the web service) |

## Replit

Replit sets `PORT=24725` in [artifacts/urban-arena/.replit-artifact/artifact.toml](../artifacts/urban-arena/.replit-artifact/artifact.toml); same port as local CLI default.
