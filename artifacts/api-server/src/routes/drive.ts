/**
 * drive.ts — Google Drive integration routes.
 *
 * All routes are admin-protected.
 *
 * POST /api/admin/drive/:activityId/setup
 *   Create (or verify) the Drive folder structure for an activity.
 *
 * POST /api/admin/drive/:activityId/sync
 *   Fetch files from Drive folders and upsert into drive_assets table.
 *
 * GET  /api/admin/drive/:activityId/status
 *   Return folder record, asset counts per type, and last sync time.
 *
 * GET  /api/admin/drive/:activityId/assets
 *   Return all synced DriveAsset records for an activity.
 */

import { Router, type IRouter } from "express";
import { requireAuth } from "./auth";
import {
  createActivityDriveFolders,
  syncActivityDriveAssets,
  getActivityDriveStatus,
} from "../lib/driveService";
import { db } from "@workspace/db";
import { driveAssetsTable, driveFoldersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/admin/drive/:activityId/setup", requireAuth, async (req, res): Promise<void> => {
  const activityId = Number(req.params.activityId);
  const { activityName } = req.body as { activityName?: string };

  if (!activityName?.trim()) {
    res.status(400).json({ error: "activityName is required in request body" });
    return;
  }

  logger.info({ activityId, activityName }, "Drive setup requested");
  const result = await createActivityDriveFolders(activityId, activityName.trim());
  res.status(result.success ? 200 : 500).json(result);
});

router.post("/admin/drive/:activityId/sync", requireAuth, async (req, res): Promise<void> => {
  const activityId = Number(req.params.activityId);
  logger.info({ activityId }, "Drive sync requested");
  const result = await syncActivityDriveAssets(activityId);
  res.status(result.success ? 200 : 500).json(result);
});

router.get("/admin/drive/:activityId/status", requireAuth, async (req, res): Promise<void> => {
  const activityId = Number(req.params.activityId);
  const status = await getActivityDriveStatus(activityId);
  res.json(status);
});

router.get("/admin/drive/:activityId/assets", requireAuth, async (req, res): Promise<void> => {
  const activityId = Number(req.params.activityId);
  const assets = await db
    .select()
    .from(driveAssetsTable)
    .where(eq(driveAssetsTable.activityId, activityId))
    .orderBy(driveAssetsTable.fileType, driveAssetsTable.fileName);
  res.json(assets);
});

/**
 * GET /api/admin/drive/summary
 * Returns an aggregate overview of all Drive folders + assets for the dashboard.
 */
router.get("/admin/drive/summary", requireAuth, async (req, res): Promise<void> => {
  const [folders, assets] = await Promise.all([
    db.select().from(driveFoldersTable),
    db.select().from(driveAssetsTable),
  ]);

  const FILE_TYPES = ["video", "poster", "thumbnail", "logo"] as const;

  const perActivity = folders.map(folder => {
    const actAssets = assets.filter(a => a.activityId === folder.activityId);
    const fileCounts: Record<string, number> = {};
    for (const t of FILE_TYPES) {
      fileCounts[t] = actAssets.filter(a => a.fileType === t).length;
    }
    const totalFiles = Object.values(fileCounts).reduce((s, n) => s + n, 0);
    return {
      activityId: folder.activityId,
      activityName: folder.activityName,
      activityFolderId: folder.activityFolderId,
      hasFolders: !!folder.activityFolderId,
      lastSyncAt: folder.lastSyncAt,
      fileCounts,
      totalFiles,
    };
  }).sort((a, b) => b.totalFiles - a.totalFiles);

  const totals: Record<string, number> = { total: assets.length };
  for (const t of FILE_TYPES) {
    totals[t] = assets.filter(a => a.fileType === t).length;
  }

  res.json({
    folderCount: folders.filter(f => !!f.activityFolderId).length,
    syncedCount: perActivity.filter(a => a.lastSyncAt !== null).length,
    totalAssets: assets.length,
    totals,
    perActivity,
  });
});

export default router;
