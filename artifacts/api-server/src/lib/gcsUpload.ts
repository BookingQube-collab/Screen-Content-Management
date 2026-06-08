/**
 * gcsUpload.ts — shared helper for persisting uploaded media.
 * Uses GCS when DEFAULT_OBJECT_STORAGE_BUCKET_ID is set (Vercel / Replit).
 * Falls back to a local uploads/ directory for local dev without GCP credentials.
 */

import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { objectStorageClient } from "./objectStorage";
import { logger } from "./logger";

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
const LOCAL_UPLOAD_DIR =
  process.env.LOCAL_UPLOAD_DIR || path.join(process.cwd(), "uploads");

export function isObjectStorageConfigured(): boolean {
  return !!BUCKET_ID;
}

function getBucket() {
  if (!BUCKET_ID) throw new Error("Object Storage not configured — DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return objectStorageClient.bucket(BUCKET_ID);
}

function localFilePath(filename: string): string {
  return path.join(LOCAL_UPLOAD_DIR, filename);
}

function contentTypeFromFilename(filename: string): string {
  switch (path.extname(filename).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".ogg":
      return "video/ogg";
    case ".mov":
      return "video/quicktime";
    default:
      return "application/octet-stream";
  }
}

/**
 * Upload a Buffer under the `uploads/` prefix.
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

  if (BUCKET_ID) {
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

  await fsp.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await fsp.writeFile(localFilePath(filename), buffer);
  logger.warn(
    { filename, dir: LOCAL_UPLOAD_DIR, size: buffer.length },
    "Object Storage not configured — saved file to local uploads directory",
  );
  return filename;
}

export async function uploadFileExists(filename: string): Promise<boolean> {
  if (BUCKET_ID) {
    const file = getBucket().file(`uploads/${filename}`);
    const [exists] = await file.exists();
    return exists;
  }

  return fs.existsSync(localFilePath(filename));
}

export function getUploadContentType(filename: string): string {
  return contentTypeFromFilename(filename);
}

export function createUploadReadStream(filename: string): NodeJS.ReadableStream {
  if (BUCKET_ID) {
    return getBucket().file(`uploads/${filename}`).createReadStream();
  }

  return fs.createReadStream(localFilePath(filename));
}
