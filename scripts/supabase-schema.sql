-- Urban Arena — Supabase schema fallback (generated from lib/db/src/schema/)
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- Safe to re-run: uses CREATE TABLE IF NOT EXISTS and idempotent constraint helpers.

BEGIN;

-- ── Base tables (no foreign keys) ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'super_admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_unique ON admin_users (email);

CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS locations_code_unique ON locations (code);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS settings_key_unique ON settings (key);

-- activities before screens (screen_id FK added after screens exists)
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  short_description TEXT,
  full_description TEXT,
  age_limit INTEGER NOT NULL DEFAULT 18,
  terms_and_conditions TEXT,
  logo_url TEXT,
  hero_image_url TEXT,
  hero_video_url TEXT,
  card_image_url TEXT,
  thumbnail_url TEXT,
  hero_gallery_urls TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  hide_info BOOLEAN NOT NULL DEFAULT false,
  hide_location_logo BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  cta_text TEXT NOT NULL DEFAULT 'Explore Now',
  location_id INTEGER,
  screen_id INTEGER,
  module_type TEXT,
  is_offline_enabled BOOLEAN NOT NULL DEFAULT false,
  video_playback TEXT NOT NULL DEFAULT 'once',
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS activities_slug_unique ON activities (slug);

CREATE TABLE IF NOT EXISTS screens (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  location_id INTEGER,
  module_type TEXT NOT NULL DEFAULT 'activity-screen',
  orientation TEXT NOT NULL DEFAULT 'landscape',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS screens_code_unique ON screens (code);

CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  location_id INTEGER,
  activity_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drive_assets (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  drive_file_id TEXT NOT NULL,
  drive_folder_id TEXT,
  file_url TEXT,
  mime_type TEXT,
  sync_status TEXT NOT NULL DEFAULT 'synced',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS drive_assets_drive_file_id_unique ON drive_assets (drive_file_id);

CREATE TABLE IF NOT EXISTS drive_folders (
  id SERIAL PRIMARY KEY,
  activity_id INTEGER NOT NULL,
  activity_name TEXT NOT NULL,
  location_name TEXT,
  root_folder_id TEXT,
  location_folder_id TEXT,
  activity_folder_id TEXT,
  video_folder_id TEXT,
  poster_folder_id TEXT,
  thumbnail_folder_id TEXT,
  logo_folder_id TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS drive_folders_activity_id_unique ON drive_folders (activity_id);

-- ── Foreign keys (idempotent) ───────────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE screens
    ADD CONSTRAINT screens_location_id_locations_id_fk
    FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activities
    ADD CONSTRAINT activities_location_id_locations_id_fk
    FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE activities
    ADD CONSTRAINT activities_screen_id_screens_id_fk
    FOREIGN KEY (screen_id) REFERENCES screens (id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE user_permissions
    ADD CONSTRAINT user_permissions_user_id_admin_users_id_fk
    FOREIGN KEY (user_id) REFERENCES admin_users (id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE user_permissions
    ADD CONSTRAINT user_permissions_location_id_locations_id_fk
    FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE user_permissions
    ADD CONSTRAINT user_permissions_activity_id_activities_id_fk
    FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE drive_assets
    ADD CONSTRAINT drive_assets_activity_id_activities_id_fk
    FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE drive_folders
    ADD CONSTRAINT drive_folders_activity_id_activities_id_fk
    FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
