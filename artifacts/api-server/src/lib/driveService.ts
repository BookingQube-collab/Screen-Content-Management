/**
 * driveService.ts — Google Drive integration service.
 *
 * Uses a Google service account (stored as the setting "google_drive_service_account_key")
 * to create and sync activity asset folders in Google Drive.
 *
 * Folder structure (when activity has a location):
 *   Urban Arena/
 *     <Location Name>/
 *       <Activity Name>/
 *         video/
 *         poster/
 *         thumbnail/
 *         logo/
 *
 * Folder structure (when activity has NO location — backward compat):
 *   Urban Arena/
 *     <Activity Name>/
 *       video/
 *       poster/
 *       thumbnail/
 *       logo/
 *
 * How to configure:
 *   1. Create a GCP project and enable the Google Drive API.
 *   2. Create a Service Account and download the JSON key file.
 *   3. In Admin > Settings, paste the full JSON content into the
 *      "Google Drive Service Account Key" field.
 *   4. (Optional) In Admin > Settings, set "Google Drive Parent Folder ID"
 *      to an existing Drive folder ID; leave blank to use Drive root.
 *   5. Share that parent folder with the service account email address
 *      (visible in the JSON key as "client_email").
 */

import { google, drive_v3 } from "googleapis";
import { db } from "@workspace/db";
import { driveAssetsTable, driveFoldersTable, activitiesTable, locationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { settingsTable } from "@workspace/db";
import { uploadToGCS } from "./gcsUpload";
import { logger } from "./logger";

const ROOT_FOLDER_NAME = "Urban Arena";
const SUBFOLDER_TYPES = ["video", "poster", "thumbnail", "logo"] as const;
type AssetType = (typeof SUBFOLDER_TYPES)[number];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getDriveClient(): Promise<drive_v3.Drive> {
  const [keyRow] = await db
    .select({ value: settingsTable.value })
    .from(settingsTable)
    .where(eq(settingsTable.key, "google_drive_service_account_key"))
    .limit(1);

  if (!keyRow?.value) {
    throw new Error(
      "Google Drive service account key not configured. " +
      "Add it via Admin > Settings > Google Drive.",
    );
  }

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(keyRow.value);
  } catch {
    throw new Error("Google Drive service account key is not valid JSON.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return google.drive({ version: "v3", auth });
}

async function getParentFolderId(): Promise<string | null> {
  const [row] = await db
    .select({ value: settingsTable.value })
    .from(settingsTable)
    .where(eq(settingsTable.key, "google_drive_parent_folder_id"))
    .limit(1);
  return row?.value || null;
}

/** Find a folder by name inside a parent, or return null. */
async function findFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string | null,
): Promise<string | null> {
  const q = parentId
    ? `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    spaces: "drive",
  });

  return res.data.files?.[0]?.id ?? null;
}

/** Create a folder and return its ID. */
async function createFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string | null,
): Promise<string> {
  const meta: drive_v3.Schema$File = {
    name,
    mimeType: "application/vnd.google-apps.folder",
    ...(parentId ? { parents: [parentId] } : {}),
  };

  const res = await drive.files.create({
    requestBody: meta,
    fields: "id",
  });

  if (!res.data.id) throw new Error(`Failed to create folder "${name}"`);
  return res.data.id;
}

/** Find or create a folder (idempotent). */
async function ensureFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string | null,
): Promise<string> {
  const existing = await findFolder(drive, name, parentId);
  if (existing) return existing;
  return createFolder(drive, name, parentId);
}

// ── Public service functions ───────────────────────────────────────────────────

/**
 * createActivityDriveFolders — creates the full folder hierarchy for one activity.
 *
 * Structure WITH location (new):
 *   Urban Arena → <Location Name> → <Activity Name> → video/poster/thumbnail/logo
 *
 * Structure WITHOUT location (backward compat):
 *   Urban Arena → <Activity Name> → video/poster/thumbnail/logo
 *
 * Idempotent: skips creation if folders already exist.
 */
export async function createActivityDriveFolders(
  activityId: number,
  activityName: string,
  locationName?: string | null,
): Promise<{ success: boolean; message: string; folderId?: string }> {
  try {
    const drive = await getDriveClient();
    const parentFolderId = await getParentFolderId();

    // 1. Ensure top-level "Urban Arena" root folder
    const rootId = await ensureFolder(drive, ROOT_FOLDER_NAME, parentFolderId);

    // 2. If the activity has a location, ensure the location subfolder
    let locationFolderId: string | null = null;
    let actParentId = rootId; // parent for the activity folder

    if (locationName?.trim()) {
      locationFolderId = await ensureFolder(drive, locationName.trim(), rootId);
      actParentId = locationFolderId;
    }

    // 3. Ensure activity subfolder (inside location folder or directly in root)
    const actFolderId = await ensureFolder(drive, activityName, actParentId);

    // 4. Ensure each asset-type subfolder
    const subIds: Record<string, string> = {};
    for (const type of SUBFOLDER_TYPES) {
      subIds[type] = await ensureFolder(drive, type, actFolderId);
    }

    // 5. Upsert drive_folders record
    await db
      .insert(driveFoldersTable)
      .values({
        activityId,
        activityName,
        locationName: locationName?.trim() || null,
        rootFolderId: rootId,
        locationFolderId,
        activityFolderId: actFolderId,
        videoFolderId: subIds.video,
        posterFolderId: subIds.poster,
        thumbnailFolderId: subIds.thumbnail,
        logoFolderId: subIds.logo,
      })
      .onConflictDoUpdate({
        target: driveFoldersTable.activityId,
        set: {
          activityName,
          locationName: locationName?.trim() || null,
          rootFolderId: rootId,
          locationFolderId,
          activityFolderId: actFolderId,
          videoFolderId: subIds.video,
          posterFolderId: subIds.poster,
          thumbnailFolderId: subIds.thumbnail,
          logoFolderId: subIds.logo,
          updatedAt: new Date(),
        },
      });

    logger.info({ activityId, actFolderId, locationName }, "Drive folders created/verified");
    return { success: true, message: "Drive folders ready", folderId: actFolderId };
  } catch (err: any) {
    logger.error({ err: err.message, activityId }, "Drive folder creation failed");
    return { success: false, message: err.message };
  }
}

/**
 * Maps a Drive asset type to the corresponding activity URL column.
 *   video     → heroVideoUrl
 *   poster    → heroImageUrl
 *   thumbnail → cardImageUrl
 *   logo      → logoUrl
 */
const ASSET_TYPE_TO_ACTIVITY_FIELD: Record<AssetType, keyof typeof activitiesTable.$inferInsert> = {
  video:     "heroVideoUrl",
  poster:    "heroImageUrl",
  thumbnail: "cardImageUrl",
  logo:      "logoUrl",
};

/**
 * Download a Drive file as a Buffer using the service-account Drive client.
 */
async function downloadDriveFile(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<Buffer> {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" },
  );
  return Buffer.from(res.data as ArrayBuffer);
}

/**
 * syncActivityDriveAssets — fetches files from all 4 Drive subfolders for an
 * activity, downloads each file, uploads it to GCS Object Storage, and
 * upserts the GCS URL into drive_assets.
 *
 * After all files are processed, the activity record is updated so that the
 * first file of each type becomes the active media URL:
 *   video → heroVideoUrl  |  poster → heroImageUrl
 *   thumbnail → cardImageUrl  |  logo → logoUrl
 */
export async function syncActivityDriveAssets(
  activityId: number,
): Promise<{ success: boolean; message: string; synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  const firstUrlByType: Partial<Record<AssetType, string>> = {};
  const allPosterUrls: string[] = [];

  try {
    const [folderRecord] = await db
      .select()
      .from(driveFoldersTable)
      .where(eq(driveFoldersTable.activityId, activityId))
      .limit(1);

    if (!folderRecord) {
      return { success: false, message: "Drive folders not set up yet. Run Setup first.", synced: 0, errors: [] };
    }

    const drive = await getDriveClient();

    const folderMap: Record<AssetType, string | null> = {
      video:     folderRecord.videoFolderId,
      poster:    folderRecord.posterFolderId,
      thumbnail: folderRecord.thumbnailFolderId,
      logo:      folderRecord.logoFolderId,
    };

    for (const fileType of SUBFOLDER_TYPES) {
      const folderId = folderMap[fileType];
      if (!folderId) {
        errors.push(`No folder ID for type "${fileType}"`);
        continue;
      }

      let pageToken: string | undefined;
      do {
        const res = await drive.files.list({
          q: `'${folderId}' in parents and trashed=false`,
          fields: "nextPageToken, files(id, name, mimeType, size)",
          spaces: "drive",
          pageToken,
        });

        const files = res.data.files || [];
        pageToken = res.data.nextPageToken ?? undefined;

        for (const f of files) {
          if (!f.id || !f.name) continue;

          const mime = f.mimeType ?? "";
          if (mime.startsWith("application/vnd.google-apps")) {
            logger.info({ fileId: f.id, name: f.name }, "Skipping Google Workspace file");
            continue;
          }

          try {
            const buffer = await downloadDriveFile(drive, f.id);
            const filename = await uploadToGCS(buffer, f.name, mime || "application/octet-stream");
            const gcsUrl = `/api/uploads/files/${filename}`;

            await db
              .insert(driveAssetsTable)
              .values({
                activityId,
                fileType,
                fileName: f.name,
                driveFileId: f.id,
                driveFolderId: folderId,
                fileUrl: gcsUrl,
                mimeType: mime || null,
                syncStatus: "synced",
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: driveAssetsTable.driveFileId,
                set: {
                  fileName: f.name,
                  driveFolderId: folderId,
                  fileUrl: gcsUrl,
                  mimeType: mime || null,
                  syncStatus: "synced",
                  updatedAt: new Date(),
                },
              });

            synced++;

            if (!firstUrlByType[fileType]) {
              firstUrlByType[fileType] = gcsUrl;
            }
            if (fileType === "poster") {
              allPosterUrls.push(gcsUrl);
            }

            logger.info({ activityId, fileType, filename }, "Drive file synced to GCS");
          } catch (fileErr: any) {
            errors.push(`Failed to sync "${f.name}" (${fileType}): ${fileErr.message}`);
            logger.error({ err: fileErr.message, fileId: f.id }, "Drive file sync error");
          }
        }
      } while (pageToken);
    }

    const activityUpdate: Record<string, string> = {};
    for (const [type, url] of Object.entries(firstUrlByType) as [AssetType, string][]) {
      const field = ASSET_TYPE_TO_ACTIVITY_FIELD[type];
      if (field && url) {
        activityUpdate[field as string] = url;
      }
    }

    if (allPosterUrls.length > 0) {
      activityUpdate.heroGalleryUrls = JSON.stringify(allPosterUrls);
    }

    if (Object.keys(activityUpdate).length > 0) {
      await db
        .update(activitiesTable)
        .set(activityUpdate as any)
        .where(eq(activitiesTable.id, activityId));
      logger.info({ activityId, fields: Object.keys(activityUpdate) }, "Activity media fields updated from Drive sync");
    }

    await db
      .update(driveFoldersTable)
      .set({ lastSyncAt: new Date(), updatedAt: new Date() })
      .where(eq(driveFoldersTable.activityId, activityId));

    logger.info({ activityId, synced, errors: errors.length }, "Drive sync complete");
    return {
      success: errors.length === 0,
      message: errors.length ? `Synced with ${errors.length} errors` : "Sync successful",
      synced,
      errors,
    };
  } catch (err: any) {
    logger.error({ err: err.message, activityId }, "Drive sync failed");
    return { success: false, message: err.message, synced, errors: [...errors, err.message] };
  }
}

/**
 * getActivityDriveStatus — returns folder record + asset counts by type.
 */
export async function getActivityDriveStatus(activityId: number) {
  const [folderRecord] = await db
    .select()
    .from(driveFoldersTable)
    .where(eq(driveFoldersTable.activityId, activityId))
    .limit(1);

  const assets = await db
    .select()
    .from(driveAssetsTable)
    .where(eq(driveAssetsTable.activityId, activityId));

  const counts: Record<string, number> = {};
  for (const type of SUBFOLDER_TYPES) {
    counts[type] = assets.filter(a => a.fileType === type).length;
  }

  return { folderRecord: folderRecord ?? null, assets, counts };
}
