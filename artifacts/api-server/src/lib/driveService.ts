/**
 * driveService.ts — Google Drive integration service.
 *
 * Uses a Google service account (stored as the setting "google_drive_service_account_key")
 * to create and sync activity asset folders in Google Drive.
 *
 * Folder structure follows the admin panel hierarchy exactly:
 *
 *   E3 (parent folder configured in settings)/
 *     <Location Address — physical venue, e.g. "Doha Mall">/   ← only if address set
 *       <Location Name — event name, e.g. "Urban Arena">/
 *         <Activity Name>/
 *           video/
 *           poster/
 *           thumbnail/
 *           logo/
 *
 *   If the location has no address set, the venue level is skipped:
 *     <Location Name>/
 *       <Activity Name>/
 *         video/ poster/ thumbnail/ logo/
 *
 *   If the activity has no location at all, it goes directly under the root:
 *     <Activity Name>/
 *       video/ poster/ thumbnail/ logo/
 *
 * DB column mapping in drive_folders:
 *   rootFolderId     = venue folder (location.address level, e.g. "Doha Mall")
 *   locationFolderId = event folder  (location.name level,    e.g. "Urban Arena")
 *   activityFolderId = activity folder (e.g. "Kids Tribe")
 *
 * How to configure:
 *   1. Create a GCP project and enable the Google Drive API.
 *   2. Create a Service Account and download the JSON key file.
 *   3. In Admin > Settings, paste the full JSON content into the
 *      "Google Drive Service Account Key" field.
 *   4. REQUIRED: In Admin > Settings, set "Google Drive Parent Folder ID"
 *      to the Drive folder ID visible in your folder's URL.
 *      Without this the service account creates all folders in its own private
 *      Drive root, making them invisible and inaccessible to every user.
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

/**
 * Returns the configured parent (root) folder ID from settings.
 * Throws if not configured — folders must NEVER be created in the service
 * account's private Drive root (they would be invisible to all users).
 */
async function getParentFolderId(): Promise<string> {
  const [row] = await db
    .select({ value: settingsTable.value })
    .from(settingsTable)
    .where(eq(settingsTable.key, "google_drive_parent_folder_id"))
    .limit(1);
  const id = row?.value?.trim();
  if (!id) {
    throw new Error(
      "Google Drive Parent Folder ID is not configured. " +
      "Go to Admin → Settings → Google Drive Integration and paste the " +
      "folder ID from your Drive URL (drive.google.com/drive/folders/FOLDER_ID). " +
      "Without this, folders would be created in the service account's private Drive " +
      "and would be invisible to you.",
    );
  }
  return id;
}

/**
 * Find a folder by name strictly inside a specific parent.
 * parentId is REQUIRED — unconstrained Drive-wide name searches are forbidden
 * because they can match folders in the wrong location.
 */
async function findFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
): Promise<string | null> {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`;

  const res = await drive.files.list({
    q,
    fields: "files(id, name)",
    spaces: "drive",
  });

  return res.data.files?.[0]?.id ?? null;
}

/**
 * Create a folder inside a specific parent and return its ID.
 * parentId is REQUIRED — never creates in Drive root.
 */
async function createFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  if (!res.data.id) throw new Error(`Failed to create folder "${name}"`);
  return res.data.id;
}

/** Find or create a folder inside parentId (idempotent). */
async function ensureFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string,
): Promise<string> {
  const existing = await findFolder(drive, name, parentId);
  if (existing) return existing;
  return createFolder(drive, name, parentId);
}

// ── Public service functions ───────────────────────────────────────────────────

/**
 * ensureAllLocationFolders — ensures the top-two levels of the Drive hierarchy
 * exist for EVERY location, regardless of whether they have activities.
 *
 *   WITH address:  Root → <address> → <locationName>
 *   WITHOUT address: Root → <locationName>
 *
 * Idempotent — safe to call before every bulk sync.
 */
export async function ensureAllLocationFolders(): Promise<{
  success: boolean;
  results: Array<{ locationId: number; locationName: string; ok: boolean; message: string }>;
}> {
  const resultList: Array<{ locationId: number; locationName: string; ok: boolean; message: string }> = [];
  try {
    const drive = await getDriveClient();
    const parentFolderId = await getParentFolderId();

    const locations = await db
      .select({ id: locationsTable.id, name: locationsTable.name, address: locationsTable.address })
      .from(locationsTable);

    for (const loc of locations) {
      try {
        let addressFolderId: string | null = null;
        let eventParentId: string | null = parentFolderId;

        if (loc.address?.trim()) {
          addressFolderId = await ensureFolder(drive, loc.address.trim(), parentFolderId);
          eventParentId = addressFolderId;
        }

        const locationFolderId = await ensureFolder(drive, loc.name, eventParentId);

        resultList.push({ locationId: loc.id, locationName: loc.name, ok: true, message: "OK" });
        logger.info(
          {
            locationId: loc.id,
            locationName: loc.name,
            locationAddress: loc.address ?? null,
            addressFolderUrl: addressFolderId ? `https://drive.google.com/drive/folders/${addressFolderId}` : null,
            locationFolderUrl: `https://drive.google.com/drive/folders/${locationFolderId}`,
          },
          "Location Drive folders ensured",
        );
      } catch (err: any) {
        resultList.push({ locationId: loc.id, locationName: loc.name, ok: false, message: err.message });
        logger.error({ err: err.message, locationId: loc.id }, "Location Drive folder creation failed");
      }
    }

    return { success: true, results: resultList };
  } catch (err: any) {
    logger.error({ err: err.message }, "ensureAllLocationFolders failed");
    return { success: false, results: resultList };
  }
}

/**
 * createActivityDriveFolders — creates the full 3-level folder hierarchy for one activity.
 *
 * Folder structure follows the admin panel data exactly:
 *
 *   WITH location address (physical venue):
 *     <Root (E3)> → <locationAddress (Doha Mall)> → <locationName (Urban Arena)> → <activityName> → subfolders
 *
 *   WITH location but NO address:
 *     <Root (E3)> → <locationName (Urban Arena)> → <activityName> → subfolders
 *
 *   WITHOUT location (backward compat):
 *     <Root (E3)> → <activityName> → subfolders
 *
 * DB column mapping:
 *   rootFolderId     = venue folder (locationAddress level)  — null when no address
 *   locationFolderId = event folder (locationName level)     — null when no location
 *   activityFolderId = activity folder
 *
 * Idempotent: reuses existing folders, creates only what is missing.
 */
export async function createActivityDriveFolders(
  activityId: number,
  activityName: string,
  locationName?: string | null,
  locationAddress?: string | null,
): Promise<{ success: boolean; message: string; folderId?: string }> {
  try {
    const drive = await getDriveClient();
    const parentFolderId = await getParentFolderId();

    // ── Step 1: Venue folder (location.address level) ──────────────────────────
    // Only created when the location has an address (e.g. "Doha Mall").
    let venueFolderId: string | null = null;
    // eventParentId starts at the configured root and may be narrowed to the venue folder
    let eventParentId: string = parentFolderId;

    if (locationAddress?.trim()) {
      venueFolderId = await ensureFolder(drive, locationAddress.trim(), parentFolderId);
      eventParentId = venueFolderId;
    }

    // ── Step 2: Event folder (location.name level, e.g. "Urban Arena") ─────────
    // Only created when the activity belongs to a location.
    let eventFolderId: string | null = null;
    // actParentId starts at the venue/root level and may be narrowed to the event folder
    let actParentId: string = eventParentId;

    if (locationName?.trim()) {
      eventFolderId = await ensureFolder(drive, locationName.trim(), eventParentId);
      actParentId = eventFolderId;
    }

    // ── Step 3: Activity folder (e.g. "Kids Tribe") ────────────────────────────
    const actFolderId = await ensureFolder(drive, activityName, actParentId);

    // ── Step 4: Media subfolders inside the activity folder ────────────────────
    const subIds: Record<string, string> = {};
    for (const type of SUBFOLDER_TYPES) {
      subIds[type] = await ensureFolder(drive, type, actFolderId);
    }

    // ── Step 5: Upsert drive_folders record ────────────────────────────────────
    //   rootFolderId     = venue folder ("Doha Mall") or null
    //   locationFolderId = event folder ("Urban Arena") or null
    //   activityFolderId = activity folder ("Kids Tribe")
    await db
      .insert(driveFoldersTable)
      .values({
        activityId,
        activityName,
        locationName: locationName?.trim() || null,
        rootFolderId: venueFolderId,
        locationFolderId: eventFolderId,
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
          rootFolderId: venueFolderId,
          locationFolderId: eventFolderId,
          activityFolderId: actFolderId,
          videoFolderId: subIds.video,
          posterFolderId: subIds.poster,
          thumbnailFolderId: subIds.thumbnail,
          logoFolderId: subIds.logo,
          updatedAt: new Date(),
        },
      });

    logger.info(
      {
        activityId,
        locationAddress,
        venueFolderId,
        locationName,
        eventFolderId,
        activityName,
        actFolderId,
        venueUrl: venueFolderId ? `https://drive.google.com/drive/folders/${venueFolderId}` : null,
        eventUrl: eventFolderId ? `https://drive.google.com/drive/folders/${eventFolderId}` : null,
        activityUrl: `https://drive.google.com/drive/folders/${actFolderId}`,
      },
      "Drive folders created/verified",
    );
    return {
      success: true,
      message: "Drive folders ready",
      folderId: actFolderId,
      venueFolderId,
      eventFolderId,
      venueUrl: venueFolderId ? `https://drive.google.com/drive/folders/${venueFolderId}` : null,
      eventUrl: eventFolderId ? `https://drive.google.com/drive/folders/${eventFolderId}` : null,
      activityUrl: `https://drive.google.com/drive/folders/${actFolderId}`,
    };
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
