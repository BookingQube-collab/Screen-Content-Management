# Apply schema to Supabase (manual)

Use this when `pnpm db:push` fails (e.g. connection timeout) or you prefer the dashboard.

**Project:** `fiozifqhhawsvvtjamfo`

## Steps (SQL Editor only)

1. Open the SQL Editor: https://supabase.com/dashboard/project/fiozifqhhawsvvtjamfo/sql/new
2. In this repo, open `scripts/supabase-schema.sql` and copy the **entire** file.
3. Paste into the SQL Editor.
4. Click **Run** (wait for success).
5. Open **Table Editor** and confirm **8** tables:
   - `admin_users`
   - `user_permissions`
   - `activities`
   - `settings`
   - `locations`
   - `screens`
   - `drive_assets`
   - `drive_folders`

The script is idempotent (`IF NOT EXISTS`); safe to run again.

## Optional: push from your machine

1. In Supabase: **Project Settings → Database** → copy the **URI** connection string.
2. Add to repo root `.env` (never commit): `DATABASE_URL=...` (use your database password from the dashboard).
3. From repo root: `pnpm db:push`

Do not commit `.env` or paste passwords into git.
