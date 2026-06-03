# Scripts

## Supabase database migration

Apply the Urban Arena schema to Supabase project **`fiozifqhhawsvvtjamfo`**.

### Quick apply (recommended if CLI push fails)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/fiozifqhhawsvvtjamfo/sql/new).
2. Copy all of **`scripts/supabase-schema.sql`** from this repo.
3. Paste into the editor and click **Run**.
4. Wait for a successful run (no errors).
5. In **Table Editor**, confirm **8** tables: `admin_users`, `user_permissions`, `activities`, `settings`, `locations`, `screens`, `drive_assets`, `drive_folders`.

See **`APPLY-SUPABASE.md`** for the same steps in one place.

### Apply from CLI (requires network to Supabase)

1. Supabase **Project Settings → Database** → copy connection URI.
2. Set `DATABASE_URL` in repo root `.env` (do **not** commit `.env`).
3. From repo root: `pnpm db:push`

| File | Purpose |
|------|---------|
| `supabase-schema.sql` | Idempotent migration (`IF NOT EXISTS`, FK guard) — **use this** |
| `urban-arena-schema.sql` | Original schema SQL (reference) |
| `APPLY-SUPABASE.md` | Copy-paste SQL Editor checklist |

Set `DATABASE_URL` in Vercel from the same Supabase database settings (never commit secrets).
