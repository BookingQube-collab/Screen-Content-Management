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

## Wrong account vs correct (this workspace)

| | Team / scope | Vercel project | Production URL |
| --- | --- | --- | --- |
| **Wrong (cleaned)** | `rjdevil` (RJDEVIL) | `api-server` | (none / not the live API) |
| **Correct (target)** | `e3urbanarena-8919` Hobby team (sign in with that account; slug from `npx vercel teams ls`) | `screen-content-management-api-serve` | `https://screen-content-management-api-serve.vercel.app` |

CLI on this machine (`npx vercel whoami` → `pathakrajan0-2635`) only lists team **`rjdevil`**. The correct Hobby team is **not** visible until you log in with the account that owns `screen-content-management-api-serve`.

### What was done locally

- Env vars were removed from **`rjdevil/api-server`** (`vercel env rm … -y` for production, preview, development).
- `artifacts/api-server/.vercel/` was deleted (wrong link: `projectName` `api-server`, `orgId` `team_FZZkZEpOQkr8E8IWFVFAB9Kt`).

### Remove secrets from the wrong project (manual)

If vars reappear on the wrong project:

```powershell
cd artifacts/api-server
npx vercel link --yes --project api-server --scope rjdevil
$vars = 'DATABASE_URL','JWT_SECRET','SUPABASE_URL','SUPABASE_PROJECT_REF','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','SUPABASE_ANON_KEY'
foreach ($v in $vars) { foreach ($e in 'production','preview','development') { npx vercel env rm $v $e -y } }
Remove-Item -Recurse -Force .vercel
```

### Push to the correct project (one-time)

1. `npx vercel logout` then `npx vercel login` (browser) with the **e3urbanarena** / Hobby account.
2. `npx vercel teams ls` — note the **team slug** (not `rjdevil`).
3. From repo root:

```powershell
cd artifacts/api-server
pwsh -File ../../scripts/push-api-vercel-env.ps1 -Scope <correct-team-slug>
```

The script reads root `.env`, converts **direct** `DATABASE_URL` to **session pooler** (`aws-1-ap-south-1.pooler.supabase.com:5432`), sets all seven variables on production + preview + development, then `vercel deploy --prod`.

Or link manually:

```powershell
cd artifacts/api-server
npx vercel link --yes --project screen-content-management-api-serve --scope <correct-team-slug>
# then env add per variable, or run push-api-vercel-env.ps1
```

`artifacts/api-server/.vercel` is listed in that folder's `.gitignore` — do not commit it.

## Blocked deployment (CLI `vercel deploy --prod`)

If the dashboard shows **Blocked** (deployment id prefix e.g. `7S6iUGYT7`) while another **Production / Ready** deployment exists from **Git**, the CLI production upload was rejected and never replaced your live app.

### What we saw on this project

| Deployment | Source | `readyState` | Production aliases |
| --- | --- | --- | --- |
| `dpl_ASAWY3hQiVYWm7fWe7jBUiBGcEbV` (e.g. commit `48e9db7`) | Git (`master`) | **Ready** | `screen-content-management-api-serve-gold.vercel.app`, git branch URL |
| `dpl_7S6iUGYT756K7ge7DPgGpFRH26x5` | `vercel deploy` CLI | **BLOCKED** | team preview URL only; build output empty |

`npx vercel inspect <blocked-url> --format=json` shows `"readyState": "BLOCKED"`. CLI summary may show `UNKNOWN`. This is normal when a **Git-connected** project blocks or supersedes manual CLI production deploys (deployment protection / production source policy).

### What you should do

1. **Treat Git Production as canonical** — live traffic should stay on the **Ready** deployment from `master` (e.g. `48e9db7`). No action required for the blocked row unless you wanted that CLI build.
2. **Ignore or remove the blocked deployment** — Dashboard → **Deployments** → blocked row → **⋯** → cancel/delete if offered; it does not serve production when Ready exists.
3. **Redeploy from Git only** — push to `master`, or Dashboard → open the **Ready** deployment → **Redeploy** (same commit). Do **not** rely on `npx vercel deploy --prod` for this API project.
4. **Env changes** — set variables in **Settings → Environment Variables**, then **Redeploy** the latest **Ready** Git deployment (not a new CLI deploy).
5. **If you must use CLI for production** (unusual) — Project **Settings → Deployment Protection** (and related Git/production rules): allow CLI deploys or use a [protection bypass](https://vercel.com/docs/deployment-protection) token. Prefer Git push on Hobby teams with Git integration.

### Inspect locally (correct team linked)

```powershell
cd artifacts/api-server
npx vercel link   # screen-content-management-api-serve @ e3urbanarena-8919
npx vercel inspect https://screen-content-management-api-serve-<hash>.vercel.app --format=json
npx vercel ls screen-content-management-api-serve
```

Use the full deployment URL from the dashboard; short ids like `7S6iUGYT7` alone may not resolve in the CLI.

### After changing env vars

Always **redeploy Production** from the **Ready Git** deployment. Existing serverless instances do not pick up new variables until a new deployment.

