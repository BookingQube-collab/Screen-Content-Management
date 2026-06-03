# Scripts

## Supabase database migration

Apply the Urban Arena schema to Supabase project **`fiozifqhhawsvvtjamfo`**:

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/fiozifqhhawsvvtjamfo/sql/new).
2. Paste the contents of **`supabase-schema.sql`** (idempotent; safe to re-run).
3. Click **Run**.
4. In **Table Editor**, confirm these 8 tables exist:
   `admin_users`, `user_permissions`, `activities`, `settings`, `locations`, `screens`, `drive_assets`, `drive_folders`.

| File | Purpose |
|------|---------|
| `supabase-schema.sql` | Idempotent migration (`IF NOT EXISTS`, FK guard) — **use this** |
| `urban-arena-schema.sql` | Original schema SQL (exact copy for reference) |

Set `DATABASE_URL` in local `.env` and Vercel from **Project Settings → Database** (do not commit `.env`).
