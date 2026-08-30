import { Router } from "express";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { adminRequired } from "../middleware/auth.js";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../../uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(
      ext,
    )
      ? ext
      : ".jpg";
    const name = `menu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const mime = String(file.mimetype || "").toLowerCase();
    const name = String(file.originalname || "").toLowerCase();
    const okMime = mime.startsWith("image/");
    const okExt = /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp)$/i.test(name);
    if (okMime || okExt) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image files are allowed."));
  },
});

router.post("/", adminRequired, (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
          ? "Image is too large (max 8MB)."
          : err.message || "Upload failed.";
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No image file received." });
    }
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({
      ok: true,
      url,
      filename: req.file.filename,
      size: req.file.size,
    });
  });
});

export default router;
export { uploadsDir };
