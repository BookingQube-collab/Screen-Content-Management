import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "./auth";

const router: IRouter = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const videoUpload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.post("/uploads/image", requireAuth, imageUpload.single("file"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ error: "No image file uploaded or invalid type" });
    return;
  }
  const url = `/api/uploads/files/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

router.post("/uploads/video", requireAuth, videoUpload.single("file"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ error: "No video file uploaded or invalid type" });
    return;
  }
  const url = `/api/uploads/files/${req.file.filename}`;
  res.json({ url, filename: req.file.filename });
});

router.get("/uploads/files/:filename", (req, res): void => {
  const raw = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const filename = path.basename(raw);
  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(filePath);
});

export default router;
