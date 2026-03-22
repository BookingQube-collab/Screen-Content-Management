import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { locationsTable } from "./locations";

export const screensTable = pgTable("screens", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  locationId: integer("location_id").references(() => locationsTable.id, { onDelete: "set null" }),
  moduleType: text("module_type").notNull().default("activity-screen"),
  orientation: text("orientation").notNull().default("landscape"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertScreenSchema = createInsertSchema(screensTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScreen = z.infer<typeof insertScreenSchema>;
export type Screen = typeof screensTable.$inferSelect;
