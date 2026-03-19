import { db, adminUsersTable, activitiesTable, settingsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const existingAdmin = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, "admin@urbanarana.com"));
  if (existingAdmin.length === 0) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await db.insert(adminUsersTable).values({
      email: "admin@urbanarana.com",
      passwordHash,
    });
    console.log("Created admin user: admin@urbanarana.com / admin123");
  } else {
    console.log("Admin user already exists");
  }

  const existingActivities = await db.select().from(activitiesTable);
  if (existingActivities.length === 0) {
    await db.insert(activitiesTable).values([
      {
        name: "Tropical Paradise",
        slug: "tropical-paradise",
        shortDescription: "Escape to paradise",
        fullDescription: "Immerse yourself in the ultimate tropical experience with stunning beaches and crystal clear waters.",
        ageLimit: 18,
        termsAndConditions: "By continuing you agree to the Terms and all Conditions.",
        heroImageUrl: null,
        heroVideoUrl: null,
        cardImageUrl: "/images/placeholder-vr.png",
        thumbnailUrl: null,
        isActive: true,
        isFeatured: true,
        sortOrder: 1,
        ctaText: "Explore Now",
      },
      {
        name: "Amazing Aurora",
        slug: "amazing-aurora",
        shortDescription: "Northern lights experience",
        fullDescription: "Witness the breathtaking northern lights in our immersive aurora experience.",
        ageLimit: 16,
        termsAndConditions: "By continuing you agree to the Terms and all Conditions.",
        heroImageUrl: null,
        heroVideoUrl: null,
        cardImageUrl: "/images/placeholder-racing.png",
        thumbnailUrl: null,
        isActive: true,
        isFeatured: false,
        sortOrder: 2,
        ctaText: "Learn More",
      },
      {
        name: "Urban Racing",
        slug: "urban-racing",
        shortDescription: "High-speed city racing",
        fullDescription: "Race through the urban landscape at high speed in this pulse-pounding experience.",
        ageLimit: 16,
        termsAndConditions: "By continuing you agree to the Terms and all Conditions.",
        heroImageUrl: null,
        heroVideoUrl: null,
        cardImageUrl: "/images/bg-abstract-red.png",
        thumbnailUrl: null,
        isActive: true,
        isFeatured: false,
        sortOrder: 3,
        ctaText: "Race Now",
      },
    ]);
    console.log("Created 3 demo activities");
  } else {
    console.log("Activities already exist, skipping");
  }

  const defaultSettings = [
    { key: "overlay_heading", value: "EXPLORE" },
    { key: "footer_text", value: "By continuing you agree to the Terms and all Conditions." },
    { key: "auto_slide", value: "true" },
    { key: "slide_interval", value: "5" },
    { key: "display_mode", value: "image_first" },
    { key: "brand_color", value: "#e63535" },
  ];

  for (const setting of defaultSettings) {
    const existing = await db.select().from(settingsTable).where(eq(settingsTable.key, setting.key));
    if (existing.length === 0) {
      await db.insert(settingsTable).values(setting);
    }
  }
  console.log("Settings seeded");

  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
