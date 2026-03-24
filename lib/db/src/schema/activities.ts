import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activitiesTable = pgTable("activities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  shortDescription: text("short_description"),
  fullDescription: text("full_description"),
  ageLimit: integer("age_limit").notNull().default(18),
  termsAndConditions: text("terms_and_conditions"),
  logoUrl: text("logo_url"),
  heroImageUrl: text("hero_image_url"),
  heroVideoUrl: text("hero_video_url"),
  cardImageUrl: text("card_image_url"),
  thumbnailUrl: text("thumbnail_url"),
  heroGalleryUrls: text("hero_gallery_urls"),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  hideInfo: boolean("hide_info").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  ctaText: text("cta_text").notNull().default("Explore Now"),
  // Screen assignment fields (optional — null means show everywhere)
  locationId: integer("location_id"),
  screenId: integer("screen_id"),
  moduleType: text("module_type"),
  isOfflineEnabled: boolean("is_offline_enabled").notNull().default(false),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  validTo: timestamp("valid_to", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertActivitySchema = createInsertSchema(activitiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activitiesTable.$inferSelect;
