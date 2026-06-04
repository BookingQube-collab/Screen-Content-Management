# Supabase integration

Project **fiozifqhhawsvvtjamfo** — Postgres only via `DATABASE_URL` (Drizzle ORM).

## Environment variables

See [.env.example](../.env.example). Required for the API:

- `DATABASE_URL` — Supabase Postgres (pooler on Vercel; direct or pooler locally)
- `JWT_SECRET` — admin JWT signing (not Supabase Auth)

Optional (documentation / future client SDK):

- `SUPABASE_URL` — `https://fiozifqhhawsvvtjamfo.supabase.co`
- `SUPABASE_PROJECT_REF` — `fiozifqhhawsvvtjamfo`

Publishable and secret API keys are **not** required for the current Express + Drizzle stack.

## Deploy

[Vercel env vars](../DEPLOY.md): `DATABASE_URL`, `JWT_SECRET`, optional `SUPABASE_URL`.

## Repo layout

- `supabase/config.toml` — CLI config, `project_id` = project ref
- `supabase/migrations/` — SQL migrations (synced from `scripts/supabase-schema.sql`)
- [supabase/README.md](../supabase/README.md) — schema workflow
