/**
 * driveService.ts — Google Drive integration service.
 *
 * Uses a Google service account (stored as the setting "google_drive_service_account_key")
 * to create and sync activity asset folders in Google Drive.
 *
 * Folder structure:
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
import { driveAssetsTable, driveFoldersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { settingsTable } from "@workspace/db";
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
 * Idempotent: skips creation if folders already exist.
 * Returns the saved DriveFolder record.
 */
export async function createActivityDriveFolders(
  activityId: number,
  activityName: string,
): Promise<{ success: boolean; message: string; folderId?: string }> {
  try {
    const drive = await getDriveClient();
    const parentFolderId = await getParentFolderId();

    // 1. Ensure top-level "Urban Arena" folder
    const rootId = await ensureFolder(drive, ROOT_FOLDER_NAME, parentFolderId);

    // 2. Ensure activity subfolder
    const actFolderId = await ensureFolder(drive, activityName, rootId);

    // 3. Ensure each asset-type subfolder
    const subIds: Record<string, string> = {};
    for (const type of SUBFOLDER_TYPES) {
      subIds[type] = await ensureFolder(drive, type, actFolderId);
    }

    // 4. Upsert drive_folders record
    await db
      .insert(driveFoldersTable)
      .values({
        activityId,
        activityName,
        rootFolderId: rootId,
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
          rootFolderId: rootId,
          activityFolderId: actFolderId,
          videoFolderId: subIds.video,
          posterFolderId: subIds.poster,
          thumbnailFolderId: subIds.thumbnail,
          logoFolderId: subIds.logo,
          updatedAt: new Date(),
        },
      });

    logger.info({ activityId, actFolderId }, "Drive folders created/verified");
    return { success: true, message: "Drive folders ready", folderId: actFolderId };
  } catch (err: any) {
    logger.error({ err: err.message, activityId }, "Drive folder creation failed");
    return { success: false, message: err.message };
  }
}

/**
 * syncActivityDriveAssets — fetches files from all 4 Drive subfolders for an
 * activity and upserts them into drive_assets. Uses drive_file_id as unique key
 * to prevent duplicates.
 */
export async function syncActivityDriveAssets(
  activityId: number,
): Promise<{ success: boolean; message: string; synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

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
          fields: "nextPageToken, files(id, name, mimeType, webContentLink, webViewLink)",
          spaces: "drive",
          pageToken,
        });

        const files = res.data.files || [];
        pageToken = res.data.nextPageToken ?? undefined;

        for (const f of files) {
          if (!f.id || !f.name) continue;

          // Construct a direct download URL (requires service account share)
          const fileUrl = `https://drive.google.com/uc?export=download&id=${f.id}`;

          try {
            await db
              .insert(driveAssetsTable)
              .values({
                activityId,
                fileType,
                fileName: f.name,
                driveFileId: f.id,
                driveFolderId: folderId,
                fileUrl,
                mimeType: f.mimeType ?? null,
                syncStatus: "synced",
                updatedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: driveAssetsTable.driveFileId,
                set: {
                  fileName: f.name,
                  driveFolderId: folderId,
                  fileUrl,
                  mimeType: f.mimeType ?? null,
                  syncStatus: "synced",
                  updatedAt: new Date(),
                },
              });
            synced++;
          } catch (dbErr: any) {
            errors.push(`DB upsert failed for file ${f.name}: ${dbErr.message}`);
          }
        }
      } while (pageToken);
    }

    // Update last sync time
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
