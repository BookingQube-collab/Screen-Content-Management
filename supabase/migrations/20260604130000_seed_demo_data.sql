-- Urban Arena — demo seed data (idempotent)
-- Run after 20260604120000_urban_arena_schema.sql

-- Admin (admin@yourdomain.com / admin123)
INSERT INTO "admin_users" ("email", "password_hash", "name", "role")
VALUES (
  'admin@yourdomain.com',
  '$2b$10$6OkL7IS/fQvHLEcCn0hfnuUwTOBCO6XshdW7LPaKsTd2btPXCEzNi',
  'Admin',
  'super_admin'
)
ON CONFLICT ("email") DO UPDATE SET
  "password_hash" = EXCLUDED."password_hash",
  "name" = EXCLUDED."name",
  "role" = EXCLUDED."role",
  "updated_at" = now();

-- Location: Urban Arena (UA01)
INSERT INTO "locations" ("name", "code")
VALUES ('Urban Arena', 'UA01')
ON CONFLICT ("code") DO NOTHING;

-- Screen: SCR01 → location UA01
INSERT INTO "screens" ("name", "code", "location_id")
VALUES (
  'SCR01',
  'SCR01',
  (SELECT "id" FROM "locations" WHERE "code" = 'UA01' LIMIT 1)
)
ON CONFLICT ("code") DO NOTHING;

-- Activity: VR Racing (linked to UA01 / SCR01)
INSERT INTO "activities" (
  "name",
  "slug",
  "short_description",
  "is_active",
  "is_featured",
  "sort_order",
  "location_id",
  "screen_id"
)
VALUES (
  'VR Racing',
  'vr-racing',
  'High-speed VR racing experience',
  true,
  true,
  1,
  (SELECT "id" FROM "locations" WHERE "code" = 'UA01' LIMIT 1),
  (SELECT "id" FROM "screens" WHERE "code" = 'SCR01' LIMIT 1)
)
ON CONFLICT ("slug") DO NOTHING;

-- Settings (upsert by key)
INSERT INTO "settings" ("key", "value") VALUES
  ('overlay_heading', 'EXPLORE'),
  ('footer_text', 'By continuing you agree to the Terms and all Conditions.'),
  ('auto_slide', 'true'),
  ('slide_interval', '5'),
  ('display_mode', 'image_first'),
  ('brand_color', '#e63535')
ON CONFLICT ("key") DO UPDATE SET
  "value" = EXCLUDED."value",
  "updated_at" = now();