/**
 * uploads.ts — Persistent file upload route using Replit Object Storage (GCS).
 *
 * Production uses GCS-backed Object Storage (DEFAULT_OBJECT_STORAGE_BUCKET_ID).
 * Local dev without that env var falls back to artifacts/api-server/uploads/.
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
import {
  uploadToGCS,
  isObjectStorageConfigured,
  uploadFileExists,
  getUploadContentType,
  createUploadReadStream,
} from "../lib/gcsUpload";
import { logger } from "../lib/logger";

const router: IRouter = Router();

if (!isObjectStorageConfigured()) {
  logger.warn(
    "DEFAULT_OBJECT_STORAGE_BUCKET_ID not set — using local uploads/ directory for dev",
  );
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

/** Serve a file from Object Storage or the local uploads/ fallback. */
router.get("/uploads/files/:filename", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const filename = path.basename(raw);

  try {
    const exists = await uploadFileExists(filename);
    if (!exists) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    res.setHeader("Content-Type", getUploadContentType(filename));
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    createUploadReadStream(filename)
      .on("error", (err) => {
        logger.error({ err: err.message, filename }, "Upload read stream error");
        if (!res.headersSent) res.status(500).end();
      })
      .pipe(res);
  } catch (err: any) {
    logger.error({ err: err.message, filename }, "Error serving uploaded file");
    res.status(500).json({ error: "Could not retrieve file" });
  }
});

export default router;
