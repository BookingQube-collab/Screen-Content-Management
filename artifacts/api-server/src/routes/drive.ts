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
import { driveAssetsTable } from "@workspace/db";
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

export default router;
