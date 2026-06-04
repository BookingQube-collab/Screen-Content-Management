# Supabase (Urban Arena)

**Linked project:** `fiozifqhhawsvvtjamfo`  
**Dashboard:** https://supabase.com/dashboard/project/fiozifqhhawsvvtjamfo

This app uses **Drizzle + `pg`** with `DATABASE_URL` only (no `@supabase/supabase-js` in the API yet).

## Schema source of truth

| Path | Role |
| --- | --- |
| `scripts/supabase-schema.sql` | **Canonical** idempotent SQL — edit here first |
| `supabase/migrations/*.sql` | Copy for Supabase CLI / `supabase db push`; keep in sync with `scripts/supabase-schema.sql` |
| `lib/db/src/schema/` | Drizzle models — use `pnpm db:push` from repo root |

After changing `scripts/supabase-schema.sql`, copy the file into a new timestamped migration under `supabase/migrations/` (or replace the latest migration if not yet applied remotely).

## CLI (optional)

Install: https://supabase.com/docs/guides/cli

```bash
supabase login
pnpm supabase:link   # supabase link --project-ref fiozifqhhawsvvtjamfo
```

`supabase init` was not run in CI (CLI may be missing locally); `config.toml` is committed for link/migrations workflows.

## Apply schema

1. **Drizzle:** root `.env` with `DATABASE_URL` → `pnpm db:push`
2. **Dashboard:** paste `scripts/supabase-schema.sql` — see [scripts/APPLY-SUPABASE.md](../scripts/APPLY-SUPABASE.md)
3. **CLI:** `supabase db push` after link (uses `supabase/migrations/`)

Do not commit `.env` or API keys.
