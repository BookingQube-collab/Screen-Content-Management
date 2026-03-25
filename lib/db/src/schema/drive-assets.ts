/**
 * drive-assets.ts — Schema for Google Drive synced activity assets.
 *
 * Each row represents one file synced from Google Drive into the system.
 * drive_file_id is used as a unique key to prevent duplicate entries.
 */

import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const driveAssetsTable = pgTable("drive_assets", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull(),
  // Type of asset: video | poster | thumbnail | logo
  fileType: text("file_type").notNull(),
  fileName: text("file_name").notNull(),
  driveFileId: text("drive_file_id").notNull().unique(),
  driveFolderId: text("drive_folder_id"),
  // Public URL or proxy URL for this file
  fileUrl: text("file_url"),
  mimeType: text("mime_type"),
  syncStatus: text("sync_status").notNull().default("synced"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DriveAsset = typeof driveAssetsTable.$inferSelect;

// ── Drive folder registry: tracks which Drive folder ID maps to each activity ──

export const driveFoldersTable = pgTable("drive_folders", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull().unique(),
  activityName: text("activity_name").notNull(),
  locationName: text("location_name"),           // optional: when activity belongs to a location
  rootFolderId: text("root_folder_id"),           // Urban Arena folder
  locationFolderId: text("location_folder_id"),  // Location subfolder (new)
  activityFolderId: text("activity_folder_id"),  // e.g. Kids Tribe folder
  videoFolderId: text("video_folder_id"),
  posterFolderId: text("poster_folder_id"),
  thumbnailFolderId: text("thumbnail_folder_id"),
  logoFolderId: text("logo_folder_id"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DriveFolder = typeof driveFoldersTable.$inferSelect;
