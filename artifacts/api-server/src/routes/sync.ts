import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
const router: IRouter = Router();

const SYNC_SECRET = "ua-sync-2026-bootstrap";

const STAGING_ACTIVITIES = [
  { id: 4,  name: "Kids Trible",             slug: "kids-trible",          shortDescription: "Fun adventure zone for little explorers",                    fullDescription: "A supervised fun zone designed for the youngest adventurers. Safe, exciting, and full of discovery.",                                                         ageLimitVal: 3,  termsAndConditions: "1 free companion adult allowed for supervision only. Companion must stay with the child, follow socks/no-shoes rule.", heroImageUrl: "https://picsum.photos/seed/kids-playground/800/600",     heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/kids-playground/400/500",     isActive: true,  isFeatured: true,  sortOrder: 1,  ctaText: "Join the Fun" },
  { id: 5,  name: "AR Karting",              slug: "ar-karting",           shortDescription: "High-speed augmented reality go-karting",                     fullDescription: "Experience the thrill of karting enhanced with augmented reality. Race on real tracks with virtual overlays.",                                               ageLimitVal: 6,  termsAndConditions: "Companion may assist with entry, belt or helmet only; no riding unless ticketed.",                                   heroImageUrl: "https://picsum.photos/seed/go-kart-racing/800/600",      heroVideoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4", cardImageUrl: "https://picsum.photos/seed/go-kart-racing/400/500",      isActive: true,  isFeatured: true,  sortOrder: 2,  ctaText: "Race Now" },
  { id: 6,  name: "Ping Pong",               slug: "ping-pong",            shortDescription: "Competitive table tennis for all skill levels",               fullDescription: "Test your reflexes and agility on our professional ping pong tables. Open-play with flexible session times.",                                                ageLimitVal: 6,  termsAndConditions: "Open-play sports game; difficult to control if companion is inside.",                                               heroImageUrl: "https://picsum.photos/seed/table-tennis/800/600",        heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/table-tennis/400/500",        isActive: true,  isFeatured: false, sortOrder: 3,  ctaText: "Play Now" },
  { id: 7,  name: "Paintball",               slug: "paintball",            shortDescription: "Premium battle arena paintball experience",                   fullDescription: "Gear up and dominate the battle arena in our premium paintball sessions. Fully controlled, safe, and action-packed.",                                       ageLimitVal: 12, termsAndConditions: "Premium battle game; session controlled; companion entry should not be free.",                                    heroImageUrl: "https://picsum.photos/seed/paintball-game/800/600",      heroVideoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4",          cardImageUrl: "https://picsum.photos/seed/paintball-game/400/500",      isActive: true,  isFeatured: true,  sortOrder: 4,  ctaText: "Battle Now" },
  { id: 8,  name: "Laser Tag",               slug: "laser-tag",            shortDescription: "Futuristic laser combat in darkened arenas",                  fullDescription: "Enter the neon-lit laser tag arena and compete in team or solo missions. Strategic, fast, and incredibly fun.",                                               ageLimitVal: 6,  termsAndConditions: "Premium battle game; session controlled.",                                                                    heroImageUrl: "https://picsum.photos/seed/laser-tag-arena/800/600",     heroVideoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",          cardImageUrl: "https://picsum.photos/seed/laser-tag-arena/400/500",     isActive: true,  isFeatured: true,  sortOrder: 5,  ctaText: "Laser Up" },
  { id: 9,  name: "Bazooka",                 slug: "bazooka",              shortDescription: "High-energy foam bazooka battle zone",                        fullDescription: "Fire foam bazookas in our high-energy combat area. Great for team building and adrenaline-fueled fun.",                                                     ageLimitVal: 6,  termsAndConditions: "Premium battle game; session controlled.",                                                                    heroImageUrl: "https://picsum.photos/seed/foam-battle/800/600",         heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/foam-battle/400/500",         isActive: true,  isFeatured: false, sortOrder: 6,  ctaText: "Fire Away" },
  { id: 10, name: "Dartsee",                 slug: "dartsee",              shortDescription: "Electronic darts — aim, throw, score!",                       fullDescription: "Modern electronic darts boards in a premium setting. Perfect for competitive players and casual fun alike.",                                                  ageLimitVal: 12, termsAndConditions: "Companion could easily participate; keep paid access only.",                                                   heroImageUrl: "https://picsum.photos/seed/darts-game/800/600",          heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/darts-game/400/500",          isActive: true,  isFeatured: false, sortOrder: 7,  ctaText: "Throw Now" },
  { id: 11, name: "AR Racing",               slug: "ar-racing",            shortDescription: "Immersive augmented reality racing simulators",               fullDescription: "Race on world-famous tracks in our cutting-edge AR racing simulators. Competitive leaderboards and real-time multiplayer.",                                 ageLimitVal: 7,  termsAndConditions: "Competitive game; companion supervision from outside only.",                                                  heroImageUrl: "https://picsum.photos/seed/simulator-racing/800/600",    heroVideoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",              cardImageUrl: "https://picsum.photos/seed/simulator-racing/400/500",    isActive: true,  isFeatured: true,  sortOrder: 8,  ctaText: "Start Racing" },
  { id: 12, name: "Hoops",                   slug: "hoops",                shortDescription: "Basketball shooting games and challenges",                     fullDescription: "Score big on our basketball hoops arena. Solo challenges, multiplayer showdowns, and timed tournaments.",                                                   ageLimitVal: 6,  termsAndConditions: "Companion can supervise/guide younger kids, but may not play.",                                              heroImageUrl: "https://picsum.photos/seed/basketball-hoops/800/600",    heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/basketball-hoops/400/500",    isActive: true,  isFeatured: false, sortOrder: 9,  ctaText: "Shoot Now" },
  { id: 13, name: "Axe",                     slug: "axe-throwing",         shortDescription: "Axe throwing — the ultimate precision sport",                 fullDescription: "Channel your inner lumberjack in our supervised axe throwing lanes. Training provided, targets await.",                                                     ageLimitVal: 12, termsAndConditions: "Medium-risk activity; no free companion entry.",                                                             heroImageUrl: "https://picsum.photos/seed/axe-throwing/800/600",        heroVideoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",              cardImageUrl: "https://picsum.photos/seed/axe-throwing/400/500",        isActive: true,  isFeatured: false, sortOrder: 10, ctaText: "Throw Now" },
  { id: 14, name: "Archery",                 slug: "archery",              shortDescription: "Traditional archery in a safety-first range",                 fullDescription: "Learn and compete in our professional archery lanes. Beginners welcome with full equipment and instruction provided.",                                       ageLimitVal: 7,  termsAndConditions: "Safety-controlled area; no free companion access inside active lane.",                                        heroImageUrl: "https://picsum.photos/seed/archery-range/800/600",       heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/archery-range/400/500",       isActive: true,  isFeatured: false, sortOrder: 11, ctaText: "Aim Now" },
  { id: 15, name: "PS5",                     slug: "ps5-gaming",           shortDescription: "Next-gen PlayStation 5 gaming stations",                      fullDescription: "Play the latest PS5 titles on our premium gaming stations. Single and multiplayer modes available with a huge game library.",                                 ageLimitVal: 6,  termsAndConditions: "Companion may supervise only; no controller use without paid entry.",                                          heroImageUrl: "https://picsum.photos/seed/gaming-console/800/600",      heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/gaming-console/400/500",      isActive: true,  isFeatured: false, sortOrder: 12, ctaText: "Play Now" },
  { id: 16, name: "AR Hockey",               slug: "ar-hockey",            shortDescription: "Augmented reality air hockey reimagined",                     fullDescription: "Classic air hockey taken to the next level with AR overlays, power-ups, and dynamic visual effects.",                                                         ageLimitVal: 7,  termsAndConditions: "Companion could easily participate; keep paid access only.",                                                   heroImageUrl: "https://picsum.photos/seed/air-hockey-ar/800/600",       heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/air-hockey-ar/400/500",       isActive: true,  isFeatured: false, sortOrder: 13, ctaText: "Play Now" },
  { id: 17, name: "Billiards",               slug: "billiards",            shortDescription: "Classic pool tables in a premium setting",                    fullDescription: "Premium billiards experience with professional tables. Perfect for leisurely games or competitive play.",                                                      ageLimitVal: 14, termsAndConditions: "Premium area; charged separately.",                                                                          heroImageUrl: "https://picsum.photos/seed/billiards-pool/800/600",      heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/billiards-pool/400/500",      isActive: true,  isFeatured: false, sortOrder: 14, ctaText: "Rack Up" },
  { id: 18, name: "Projection Billiards",    slug: "projection-billiards", shortDescription: "Billiards with stunning projected visuals",                   fullDescription: "Experience billiards like never before — projection-mapped tables that transform every shot into a visual spectacle.",                                       ageLimitVal: 14, termsAndConditions: "Premium area; charged separately.",                                                                          heroImageUrl: "https://picsum.photos/seed/projection-pool/800/600",     heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/projection-pool/400/500",     isActive: true,  isFeatured: true,  sortOrder: 15, ctaText: "Play Now" },
  { id: 19, name: "Other Kids Arcade Games", slug: "kids-arcade",          shortDescription: "Classic arcade fun for the whole family",                     fullDescription: "A huge selection of kid-friendly arcade machines — from claw games to racing cabinets and everything in between.",                                           ageLimitVal: 3,  termsAndConditions: "Main kid-friendly area where companion policy is easiest to apply.",                                         heroImageUrl: "https://picsum.photos/seed/arcade-games-kids/800/600",   heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/arcade-games-kids/400/500",   isActive: true,  isFeatured: false, sortOrder: 16, ctaText: "Play Now" },
  { id: 20, name: "Mini Golf",               slug: "mini-golf",            shortDescription: "Themed mini golf course — putt your way to glory",            fullDescription: "Navigate our creative themed mini golf course. Great for families, dates, and group outings of all sizes.",                                                    ageLimitVal: 4,  termsAndConditions: "Companion may assist younger child; no playing unless ticketed.",                                           heroImageUrl: "https://picsum.photos/seed/mini-golf-course/800/600",    heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/mini-golf-course/400/500",    isActive: true,  isFeatured: false, sortOrder: 17, ctaText: "Putt Now" },
  { id: 21, name: "Speed Grid",              slug: "speed-grid",           shortDescription: "Physical agility grid challenge — beat the clock",            fullDescription: "Test your speed, agility, and reflexes on our physical Speed Grid course. Compete against friends or chase your personal best.",                              ageLimitVal: 4,  termsAndConditions: "Physical game; companion should supervise from outside only.",                                              heroImageUrl: "https://picsum.photos/seed/speed-agility-grid/800/600",  heroVideoUrl: null,                                                                                     cardImageUrl: "https://picsum.photos/seed/speed-agility-grid/400/500",  isActive: true,  isFeatured: false, sortOrder: 18, ctaText: "Go Fast" },
];

const STAGING_SETTINGS = [
  { key: "auto_slide",    value: "true" },
  { key: "brand_color",  value: "#e63535" },
  { key: "display_mode", value: "image_first" },
  { key: "footer_text",  value: "By continuing you agree to the Terms and all Conditions." },
  { key: "overlay_heading", value: "EXPLORE" },
  { key: "slide_interval",  value: "5" },
];

const ADMIN_PASSWORD_HASH = "$2b$10$83.5U/igmfRpMrwP8hb39OQogWVpv7EIAE1q4pnG1MtE27eAUEAEm";

router.post("/admin/sync-from-staging", async (req, res): Promise<void> => {
  const secret = req.headers["x-sync-secret"] as string | undefined;
  if (secret !== SYNC_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const results: string[] = [];

    await db.execute(sql`
      INSERT INTO activities
        (id, name, slug, short_description, full_description, age_limit,
         terms_and_conditions, hero_image_url, hero_video_url, card_image_url,
         is_active, is_featured, sort_order, cta_text)
      VALUES
        ${sql.join(
          STAGING_ACTIVITIES.map(a => sql`(
            ${a.id}, ${a.name}, ${a.slug}, ${a.shortDescription}, ${a.fullDescription},
            ${a.ageLimitVal}, ${a.termsAndConditions}, ${a.heroImageUrl}, ${a.heroVideoUrl},
            ${a.cardImageUrl}, ${a.isActive}, ${a.isFeatured}, ${a.sortOrder}, ${a.ctaText}
          )`),
          sql`, `
        )}
      ON CONFLICT (id) DO UPDATE SET
        name                = EXCLUDED.name,
        slug                = EXCLUDED.slug,
        short_description   = EXCLUDED.short_description,
        full_description    = EXCLUDED.full_description,
        age_limit           = EXCLUDED.age_limit,
        terms_and_conditions = EXCLUDED.terms_and_conditions,
        hero_image_url      = EXCLUDED.hero_image_url,
        hero_video_url      = EXCLUDED.hero_video_url,
        card_image_url      = EXCLUDED.card_image_url,
        is_active           = EXCLUDED.is_active,
        is_featured         = EXCLUDED.is_featured,
        sort_order          = EXCLUDED.sort_order,
        cta_text            = EXCLUDED.cta_text,
        updated_at          = NOW()
    `);
    results.push(`Upserted ${STAGING_ACTIVITIES.length} activities`);

    for (const s of STAGING_SETTINGS) {
      await db.execute(sql`
        INSERT INTO settings (key, value)
        VALUES (${s.key}, ${s.value})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `);
    }
    results.push(`Upserted ${STAGING_SETTINGS.length} settings`);

    await db.execute(sql`
      INSERT INTO admin_users (email, password_hash)
      VALUES ('admin@urbanarana.com', ${ADMIN_PASSWORD_HASH})
      ON CONFLICT (email) DO NOTHING
    `);
    results.push("Ensured admin user exists");

    await db.execute(sql`SELECT setval(pg_get_serial_sequence('activities','id'), GREATEST((SELECT MAX(id) FROM activities), 21))`);

    res.json({ success: true, results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
