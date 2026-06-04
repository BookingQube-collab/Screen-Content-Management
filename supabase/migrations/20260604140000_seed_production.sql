-- Urban Arena - PRODUCTION Database Seed (idempotent)
-- scripts/seed-production.sql + supabase/migrations/20260604140000_seed_production.sql
-- Run after 20260604120000_urban_arena_schema.sql

-- ================================================================
-- Urban Arena â€” PRODUCTION Database Seed
-- Generated: 2026-06-04
--
-- Run order: schema.sql â†’ seed-production.sql
--
-- âš ï¸  NOTES:
--   â€¢ Passwords are bcrypt hashes â€” reset via Admin panel after import
--   â€¢ logo_url / hero_image_url values starting with /api/uploads/files/
--     are uploaded files on the production server â€” they will appear
--     broken in a local environment unless you re-upload the same files
--   â€¢ drive_folders and drive_assets are empty in production
-- ================================================================

-- Allow inserting explicit IDs (disable FK checks during load)
SET session_replication_role = replica;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 1. LOCATIONS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO locations (id, name, code, address, logo_url, is_active, created_at, updated_at) VALUES
  (1, 'Urban Arena',         'UA-DM',  'Doha Mall',   NULL, true, '2026-03-22 15:19:03.172834+00', '2026-03-22 17:09:22.251+00'),
  (3, 'InflataPark',         'INF-CC', 'City Center', NULL, true, '2026-03-22 15:41:31.39201+00',  '2026-03-22 15:41:31.39201+00'),
  (4, 'Kids Driving School', 'KDS-CC', 'City Center', NULL, true, '2026-03-22 15:41:56.975804+00', '2026-03-22 15:41:56.975804+00') ON CONFLICT (id) DO NOTHING;

SELECT setval('locations_id_seq', (SELECT MAX(id) FROM locations));

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 2. SCREENS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO screens (id, name, code, location_id, module_type, orientation, is_active, notes, created_at, updated_at) VALUES
  (1, 'Ticketing Counter', 'TAB-ENT-1', 1, 'activity-screen', 'landscape', true, NULL, '2026-03-22 15:20:01.306556+00', '2026-03-22 15:20:01.306556+00'),
  (2, 'Entrance TV 1',     'TV-ENT-01', 1, 'activity-screen', 'landscape', true, NULL, '2026-03-22 15:20:02.302581+00', '2026-03-24 12:54:08.627+00') ON CONFLICT (id) DO NOTHING;

SELECT setval('screens_id_seq', (SELECT MAX(id) FROM screens));

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 3. ADMIN USERS
-- Default password hash = "admin123"
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO admin_users (id, email, password_hash, name, role, created_at) VALUES
  (1, 'admin@urbanarena.com', '$2b$10$83.5U/igmfRpMrwP8hb39OQogWVpv7EIAE1q4pnG1MtE27eAUEAEm', NULL,   'super_admin', '2026-03-19 21:39:15.945199+00'),
  (4, 'mary@e3.com',          '$2b$10$S296MIxcW.rgqat0.IuPLuXl2plQZVR5uIKi6YChrSUTbLTvbHMhW', 'Mary', 'user',        '2026-03-25 16:01:19.018063+00') ON CONFLICT (id) DO NOTHING;

SELECT setval('admin_users_id_seq', (SELECT MAX(id) FROM admin_users));

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 4. USER PERMISSIONS
-- mary@e3.com â†’ InflataPark (location_id = 3)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO user_permissions (id, user_id, location_id, activity_id, created_at) VALUES
  (1, 4, 3, NULL, '2026-03-25 16:01:19.247013+00') ON CONFLICT (id) DO NOTHING;

SELECT setval('user_permissions_id_seq', (SELECT MAX(id) FROM user_permissions));

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 5. SETTINGS
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO settings (key, value) VALUES
  ('admin_title_part1',  'E'),
  ('admin_title_part2',  '3'),
  ('auto_slide',         'true'),
  ('brand_color',        '#e63535'),
  ('display_mode',       'image_first'),
  ('display_title_part1','E'),
  ('display_title_part2','3'),
  ('footer_text',        'By continuing you agree to the Terms and all Conditions.'),
  ('logo_url',           ''),
  ('overlay_heading',    'EXPLORE'),
  ('slide_interval',     '5')
ON CONFLICT (key) DO NOTHING;

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- 6. ACTIVITIES  (19 rows)
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
INSERT INTO activities (
  id, name, slug, short_description, full_description,
  age_limit, terms_and_conditions,
  logo_url, hero_image_url, hero_video_url, card_image_url, hero_gallery_urls,
  is_active, is_featured, sort_order, cta_text,
  location_id, screen_id, module_type,
  is_offline_enabled, video_playback, hide_info, hide_location_logo,
  valid_from, valid_to,
  created_at, updated_at
) VALUES

-- sort_order 0 â€” Welcome screen with gallery
(22, 'TV Screen 1', 'asd', 'sds', '',
  18, '',
  NULL, NULL, NULL, NULL,
  '["/api/uploads/files/1774358318903-jawqjys14f.png","/api/uploads/files/1774358319621-sr3233j2t4.png","/api/uploads/files/1774358320272-yterhg5topa.png","/api/uploads/files/1774358321015-6zpljhipcf9.png"]',
  true, false, 0, 'Explore Now',
  1, 2, 'welcome-screen',
  true, 'once', true, false, NULL, NULL,
  '2026-03-24 13:02:34.448927+00', '2026-03-25 17:55:23.63+00'),

-- sort_order 1
(4, 'Kids Trible', 'kids-trible',
  'Fun adventure zone for little explorers',
  'A supervised fun zone designed for the youngest adventurers. Safe, exciting, and full of discovery.',
  3, '1 free companion adult allowed for supervision only. Companion must stay with the child, follow socks/no-shoes rule.',
  NULL,
  'https://picsum.photos/seed/kids-playground/800/600', NULL,
  'https://picsum.photos/seed/kids-playground/400/500', NULL,
  true, true, 1, 'Join the Fun',
  3, 2, 'promo-slider',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-24 12:20:33.727+00'),

-- sort_order 2
(5, 'AR Karting', 'ar-karting',
  'High-speed augmented reality go-karting',
  'Experience the thrill of karting enhanced with augmented reality. Race on real tracks with virtual overlays.',
  6, 'Companion may assist with entry, belt or helmet only; no riding unless ticketed.',
  NULL,
  'https://picsum.photos/seed/go-kart-racing/800/600', NULL,
  'https://picsum.photos/seed/go-kart-racing/400/500', NULL,
  true, true, 2, 'Race Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-24 12:48:54.766+00'),

-- sort_order 3
(6, 'Ping Pong', 'ping-pong',
  'Competitive table tennis for all skill levels',
  'Test your reflexes and agility on our professional ping pong tables. Open-play with flexible session times.',
  6, 'Open-play sports game; difficult to control if companion is inside.',
  NULL,
  'https://picsum.photos/seed/table-tennis/800/600', NULL,
  'https://picsum.photos/seed/table-tennis/400/500', NULL,
  true, false, 3, 'Play Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:08:31.52+00'),

-- sort_order 4
(7, 'Paintball', 'paintball',
  'Premium battle arena paintball experience',
  'Gear up and dominate the battle arena in our premium paintball sessions. Fully controlled, safe, and action-packed.',
  12, 'Premium battle game; session controlled; companion entry should not be free.',
  NULL,
  'https://picsum.photos/seed/paintball-game/800/600',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
  'https://picsum.photos/seed/paintball-game/400/500', NULL,
  true, true, 4, 'Battle Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:08:44.251+00'),

-- sort_order 5
(8, 'Laser Tag', 'laser-tag',
  'Futuristic laser combat in darkened arenas',
  'Enter the neon-lit laser tag arena and compete in team or solo missions. Strategic, fast, and incredibly fun.',
  6, 'Premium battle game; session controlled.',
  NULL,
  'https://picsum.photos/seed/laser-tag-arena/800/600',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
  'https://picsum.photos/seed/laser-tag-arena/400/500', NULL,
  true, true, 5, 'Laser Up',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:08:59.318+00'),

-- sort_order 6
(9, 'Bazooka', 'bazooka',
  'High-energy foam bazooka battle zone',
  'Fire foam bazookas in our high-energy combat area. Great for team building and adrenaline-fueled fun.',
  6, 'Premium battle game; session controlled.',
  NULL,
  'https://picsum.photos/seed/foam-battle/800/600', NULL,
  'https://picsum.photos/seed/foam-battle/400/500', NULL,
  true, false, 6, 'Fire Away',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:09:18.566+00'),

-- sort_order 7
(10, 'Dartsee', 'dartsee',
  'Electronic darts â€” aim, throw, score!',
  'Modern electronic darts boards in a premium setting. Perfect for competitive players and casual fun alike.',
  12, 'Companion could easily participate; keep paid access only.',
  NULL,
  'https://picsum.photos/seed/darts-game/800/600', NULL,
  'https://picsum.photos/seed/darts-game/400/500', NULL,
  true, false, 7, 'Throw Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:09:32.712+00'),

-- sort_order 8
(11, 'AR Racing', 'ar-racing',
  'Immersive augmented reality racing simulators',
  'Race on world-famous tracks in our cutting-edge AR racing simulators. Competitive leaderboards and real-time multiplayer.',
  7, 'Competitive game; companion supervision from outside only.',
  NULL,
  'https://picsum.photos/seed/simulator-racing/800/600',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://picsum.photos/seed/simulator-racing/400/500', NULL,
  true, true, 8, 'Start Racing',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:09:45.475+00'),

-- sort_order 9
(12, 'Hoops', 'hoops',
  'Basketball shooting games and challenges',
  'Score big on our basketball hoops arena. Solo challenges, multiplayer showdowns, and timed tournaments.',
  6, 'Companion can supervise/guide younger kids, but may not play.',
  NULL,
  'https://picsum.photos/seed/basketball-hoops/800/600', NULL,
  'https://picsum.photos/seed/basketball-hoops/400/500', NULL,
  true, false, 9, 'Shoot Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:10:00.281+00'),

-- sort_order 10
(13, 'Axe', 'axe-throwing',
  'Axe throwing â€” the ultimate precision sport',
  'Channel your inner lumberjack in our supervised axe throwing lanes. Training provided, targets await.',
  12, 'Medium-risk activity; no free companion entry.',
  NULL,
  'https://picsum.photos/seed/axe-throwing/800/600',
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://picsum.photos/seed/axe-throwing/400/500', NULL,
  true, false, 10, 'Throw Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:10:14.601+00'),

-- sort_order 11
(14, 'Archery', 'archery',
  'Traditional archery in a safety-first range',
  'Learn and compete in our professional archery lanes. Beginners welcome with full equipment and instruction provided.',
  7, 'Safety-controlled area; no free companion access inside active lane.',
  NULL,
  'https://picsum.photos/seed/archery-range/800/600', NULL,
  'https://picsum.photos/seed/archery-range/400/500', NULL,
  true, false, 11, 'Aim Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:10:53.598+00'),

-- sort_order 12
(15, 'PS5', 'ps5-gaming',
  'Next-gen PlayStation 5 gaming stations',
  'Play the latest PS5 titles on our premium gaming stations. Single and multiplayer modes available with a huge game library.',
  6, 'Companion may supervise only; no controller use without paid entry.',
  NULL,
  'https://picsum.photos/seed/gaming-console/800/600', NULL,
  'https://picsum.photos/seed/gaming-console/400/500', NULL,
  true, false, 12, 'Play Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:10:14.601+00'),

-- sort_order 13
(16, 'AR Hockey', 'ar-hockey',
  'Augmented reality air hockey reimagined',
  'Classic air hockey taken to the next level with AR overlays, power-ups, and dynamic visual effects.',
  7, 'Companion could easily participate; keep paid access only.',
  NULL,
  'https://picsum.photos/seed/air-hockey-ar/800/600', NULL,
  'https://picsum.photos/seed/air-hockey-ar/400/500', NULL,
  true, false, 13, 'Play Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:10:14.601+00'),

-- sort_order 14
(17, 'Billiards', 'billiards',
  'Classic pool tables in a premium setting',
  'Premium billiards experience with professional tables. Perfect for leisurely games or competitive play.',
  14, 'Premium area; charged separately.',
  NULL,
  'https://picsum.photos/seed/billiards-pool/800/600', NULL,
  'https://picsum.photos/seed/billiards-pool/400/500', NULL,
  true, false, 14, 'Rack Up',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:10:14.601+00'),

-- sort_order 15
(18, 'Projection Billiards', 'projection-billiards',
  'Billiards with stunning projected visuals',
  'Experience billiards like never before â€” projection-mapped tables that transform every shot into a visual spectacle.',
  14, 'Premium area; charged separately.',
  NULL,
  'https://picsum.photos/seed/projection-pool/800/600', NULL,
  'https://picsum.photos/seed/projection-pool/400/500', NULL,
  true, true, 15, 'Play Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:10:14.601+00'),

-- sort_order 16
(19, 'Other Kids Arcade Games', 'kids-arcade',
  'Classic arcade fun for the whole family',
  'A huge selection of kid-friendly arcade machines â€” from claw games to racing cabinets and everything in between.',
  3, 'Main kid-friendly area where companion policy is easiest to apply.',
  NULL,
  'https://picsum.photos/seed/arcade-games-kids/800/600', NULL,
  'https://picsum.photos/seed/arcade-games-kids/400/500', NULL,
  true, false, 16, 'Play Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:10:14.601+00'),

-- sort_order 17
(20, 'Mini Golf', 'mini-golf',
  'Themed mini golf course â€” putt your way to glory',
  'Navigate our creative themed mini golf course. Great for families, dates, and group outings of all sizes.',
  4, 'Companion may assist younger child; no playing unless ticketed.',
  NULL,
  'https://picsum.photos/seed/mini-golf-course/800/600', NULL,
  'https://picsum.photos/seed/mini-golf-course/400/500', NULL,
  true, false, 17, 'Putt Now',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:10:14.601+00'),

-- sort_order 18
(21, 'Speed Grid', 'speed-grid',
  'Physical agility grid challenge â€” beat the clock',
  'Test your speed, agility, and reflexes on our physical Speed Grid course. Compete against friends or chase your personal best.',
  4, 'Physical game; companion should supervise from outside only.',
  NULL,
  'https://picsum.photos/seed/speed-agility-grid/800/600', NULL,
  'https://picsum.photos/seed/speed-agility-grid/400/500', NULL,
  true, false, 18, 'Go Fast',
  1, 1, 'vertical-kiosk',
  true, 'once', false, false, NULL, NULL,
  '2026-03-19 22:12:39.695753+00', '2026-03-22 16:10:14.601+00') ON CONFLICT (id) DO NOTHING;

SELECT setval('activities_id_seq', (SELECT MAX(id) FROM activities));

-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- drive_folders and drive_assets are empty in production
-- â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

-- Re-enable FK checks
SET session_replication_role = DEFAULT;
