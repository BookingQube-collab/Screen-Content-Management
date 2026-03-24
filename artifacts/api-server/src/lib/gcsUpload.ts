/**
 * gcsUpload.ts — shared helper for uploading a Buffer to Replit Object Storage (GCS).
 * Used by both the uploads route and the Drive sync service.
 */

import path from "path";
import { objectStorageClient } from "./objectStorage";
import { logger } from "./logger";

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;

function getBucket() {
  if (!BUCKET_ID) throw new Error("Object Storage not configured — DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return objectStorageClient.bucket(BUCKET_ID);
}

/**
 * Upload a Buffer to GCS under the `uploads/` prefix.
 * Returns the bare filename (no directory prefix), suitable for
 * building the URL `/api/uploads/files/<filename>`.
 */
export async function uploadToGCS(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const ext = path.extname(originalName) || "";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const storagePath = `uploads/${filename}`;

  const bucket = getBucket();
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: { contentType: mimeType },
    resumable: false,
  });

  logger.info({ storagePath, size: buffer.length }, "File saved to Object Storage");
  return filename;
}
