-- Urban Arena — full database schema
-- Run in Supabase Dashboard → SQL Editor for project fiozifqhhawsvvtjamfo

CREATE TABLE "admin_users" (
  "id" serial PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "password_hash" text NOT NULL,
  "name" text,
  "role" text DEFAULT 'super_admin' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);

CREATE TABLE "user_permissions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "location_id" integer,
  "activity_id" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "activities" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "short_description" text,
  "full_description" text,
  "age_limit" integer DEFAULT 18 NOT NULL,
  "terms_and_conditions" text,
  "logo_url" text,
  "hero_image_url" text,
  "hero_video_url" text,
  "card_image_url" text,
  "thumbnail_url" text,
  "hero_gallery_urls" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_featured" boolean DEFAULT false NOT NULL,
  "hide_info" boolean DEFAULT false NOT NULL,
  "hide_location_logo" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "cta_text" text DEFAULT 'Explore Now' NOT NULL,
  "location_id" integer,
  "screen_id" integer,
  "module_type" text,
  "is_offline_enabled" boolean DEFAULT false NOT NULL,
  "video_playback" text DEFAULT 'once' NOT NULL,
  "valid_from" timestamp with time zone,
  "valid_to" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "activities_slug_unique" UNIQUE("slug")
);

CREATE TABLE "settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "key" text NOT NULL,
  "value" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "settings_key_unique" UNIQUE("key")
);

CREATE TABLE "locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "address" text,
  "logo_url" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "locations_code_unique" UNIQUE("code")
);

CREATE TABLE "screens" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "code" text NOT NULL,
  "location_id" integer,
  "module_type" text DEFAULT 'activity-screen' NOT NULL,
  "orientation" text DEFAULT 'landscape' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "screens_code_unique" UNIQUE("code")
);

CREATE TABLE "drive_assets" (
  "id" serial PRIMARY KEY NOT NULL,
  "activity_id" integer NOT NULL,
  "file_type" text NOT NULL,
  "file_name" text NOT NULL,
  "drive_file_id" text NOT NULL,
  "drive_folder_id" text,
  "file_url" text,
  "mime_type" text,
  "sync_status" text DEFAULT 'synced' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "drive_assets_drive_file_id_unique" UNIQUE("drive_file_id")
);

CREATE TABLE "drive_folders" (
  "id" serial PRIMARY KEY NOT NULL,
  "activity_id" integer NOT NULL,
  "activity_name" text NOT NULL,
  "location_name" text,
  "root_folder_id" text,
  "location_folder_id" text,
  "activity_folder_id" text,
  "video_folder_id" text,
  "poster_folder_id" text,
  "thumbnail_folder_id" text,
  "logo_folder_id" text,
  "last_sync_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "drive_folders_activity_id_unique" UNIQUE("activity_id")
);

ALTER TABLE "screens"
  ADD CONSTRAINT "screens_location_id_locations_id_fk"
  FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE set null ON UPDATE no action;
