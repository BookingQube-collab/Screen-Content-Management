# Vercel environment variables checklist (Urban Arena API)

Use this when `GET /` or `GET /api/health` returns `"database":"not_configured"`. That means **`DATABASE_URL` is missing or empty** on the **API** Vercel project (`artifacts/api-server` root), not the frontend project.

## Local `.env` vs Vercel

| Check | Your repo |
| --- | --- |
| Root `.env` has `DATABASE_URL` | Yes (do not commit) |
| Connection type in `.env` | **Direct** (`db.*.supabase.co`) — fine for local `pnpm db:push` |
| Vercel should use | **Pooler** (session mode, port **5432**) |

**Pooler URL format (replace `YOUR_PASSWORD` with the same password as in `.env`; never paste into git):**

```text
postgresql://postgres.fiozifqhhawsvvtjamfo:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

Username is `postgres.fiozifqhhawsvvtjamfo` (not plain `postgres`) for Supabase pooler.

## Dashboard steps (recommended)

1. Open [Vercel Dashboard](https://vercel.com/dashboard) and sign in with the account that owns **`screen-content-management-api-serve`** (or your API project name).
2. Select the **API** project (root directory `artifacts/api-server`).
3. **Settings** → **Environment Variables**.
4. **Add** → Name: `DATABASE_URL` → Value: pooler URI above → Environments: **Production** (and **Preview** if you use preview deploys) → Save.
5. **Add** → Name: `JWT_SECRET` → Value: same long random string as local `.env` (≥48 chars) → **Production** → Save.
6. **Deployments** → latest **Production** deployment → **⋯** → **Redeploy** (check “Use existing Build Cache” is OK).
7. After deploy finishes, open `https://YOUR-API.vercel.app/` — expect:

   ```json
   {"status":"ok","database":"configured"}
   ```

## CLI (optional)

Logged-in user on this machine: run `npx vercel whoami`. The Urban Arena API project may be under a **different** Vercel team than `rjdevil`; link the correct team first.

From repo:

```bash
cd artifacts/api-server
npx vercel link
# pick the API project and correct team
npx vercel env add DATABASE_URL production
# paste pooler URL when prompted (not echoed in shell history on some shells)
npx vercel env add JWT_SECRET production
npx vercel deploy --prod
```

Non-interactive (only if you already know project/team IDs):

```bash
npx vercel link --yes --project <project-name-or-id> --scope <team-slug>
echo "<pooler-url>" | npx vercel env add DATABASE_URL production
echo "<jwt-secret>" | npx vercel env add JWT_SECRET production
```

**Do not** commit `.env`, paste secrets into the repo, or log full `DATABASE_URL` in application code.

## Variable names (API project only)

| Name | Required |
| --- | --- |
| `DATABASE_URL` | **Yes** |
| `JWT_SECRET` | **Yes** |
| `SUPABASE_*`, `LOG_LEVEL`, GCS vars | Optional |

## How the app decides “configured”

`isDatabaseConfigured()` in `@workspace/db` returns true only when `process.env.DATABASE_URL` is non-empty after trim. No TCP connection at health check time.

## CLI status for this workspace

- `vercel` global: not on PATH; use `npx vercel`.
- `npx vercel whoami`: succeeded (account logged in).
- `vercel env ls` / `env add`: **not run** — `artifacts/api-server` is **not** linked to a Vercel project (API deployment not listed under team `rjdevil`). Set vars in the dashboard for the account that owns the live API URL.

## After changing env vars

Always **redeploy Production**. Existing serverless instances do not pick up new variables until a new deployment.
