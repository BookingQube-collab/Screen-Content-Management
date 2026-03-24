/**
 * uploads.ts — Persistent file upload route using Replit Object Storage (GCS).
 *
 * Root cause of disappearing files:
 *   The previous implementation stored files on the local disk (process.cwd()/uploads).
 *   Replit's container filesystem is ephemeral — every restart/redeploy wipes it.
 *   Fix: files are now uploaded to GCS-backed Object Storage which persists forever.
 *
 * API surface is unchanged from the old implementation:
 *   POST /api/uploads/image           — upload an image, returns { url, filename }
 *   POST /api/uploads/video           — upload a video,  returns { url, filename }
 *   GET  /api/uploads/files/:filename — serve a file from Object Storage
 */

import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import { requireAuth } from "./auth";
import { objectStorageClient } from "../lib/objectStorage";
import { uploadToGCS } from "../lib/gcsUpload";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

if (!BUCKET_ID) {
  logger.warn("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set — uploads will fail");
}

function getBucket() {
  if (!BUCKET_ID) throw new Error("Object Storage not configured");
  return objectStorageClient.bucket(BUCKET_ID);
}

// Use memory storage — buffer is held in RAM briefly then pushed to GCS.
const memoryStorage = multer.memoryStorage();

const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Invalid image type"));
      return;
    }
    cb(null, true);
  },
});

const videoUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Invalid video type"));
      return;
    }
    cb(null, true);
  },
});

router.post("/uploads/image", requireAuth, imageUpload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No image file uploaded or invalid type" });
    return;
  }
  try {
    const filename = await uploadToGCS(req.file.buffer, req.file.originalname, req.file.mimetype);
    const url = `/api/uploads/files/${filename}`;
    res.json({ url, filename });
  } catch (err: any) {
    logger.error({ err: err.message }, "Image upload to Object Storage failed");
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

router.post("/uploads/video", requireAuth, videoUpload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No video file uploaded or invalid type" });
    return;
  }
  try {
    const filename = await uploadToGCS(req.file.buffer, req.file.originalname, req.file.mimetype);
    const url = `/api/uploads/files/${filename}`;
    res.json({ url, filename });
  } catch (err: any) {
    logger.error({ err: err.message }, "Video upload to Object Storage failed");
    res.status(500).json({ error: "Upload failed: " + err.message });
  }
});

/** Serve a file from GCS by streaming it back to the client. */
router.get("/uploads/files/:filename", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const filename = path.basename(raw);
  const storagePath = `uploads/${filename}`;

  try {
    const bucket = getBucket();
    const file = bucket.file(storagePath);
    const [exists] = await file.exists();

    if (!exists) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType as string | undefined) || "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    file.createReadStream()
      .on("error", (err) => {
        logger.error({ err: err.message, storagePath }, "GCS read stream error");
        if (!res.headersSent) res.status(500).end();
      })
      .pipe(res);
  } catch (err: any) {
    logger.error({ err: err.message, storagePath }, "Error serving file from Object Storage");
    res.status(500).json({ error: "Could not retrieve file" });
  }
});

export default router;
