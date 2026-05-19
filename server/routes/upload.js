import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();
const uploadDir = path.resolve(process.cwd(), "server", "uploads", "avatars");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir);
  },
  filename: (req, _file, callback) => {
    callback(null, `${req.user.id}.jpg`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new Error("Only JPEG, PNG, or WebP uploads are allowed"));
      return;
    }

    callback(null, true);
  },
});

router.post("/avatar", auth, (req, res) => {
  upload.single("avatar")(req, res, (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || "Upload failed" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Avatar file is required" });
    }

    const avatarUrl = `/avatars/${req.user.id}.jpg`;

    db.prepare(`
      UPDATE users
      SET avatarUrl = ?
      WHERE id = ?
    `).run(avatarUrl, req.user.id);

    res.json({ avatarUrl });
  });
});

export default router;
