import { randomUUID } from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { logActivity } from "../utils/activity.js";
import { analyzeFoodImage } from "../utils/foodAnalysis.js";
import {
  getMealEntries,
  getNutritionHistory,
  getNutritionSummary,
  isValidMealType,
  normalizeMealEntry,
} from "../utils/nutrition.js";
import { toLocalDateString } from "../utils/fitness.js";

const router = express.Router();
const foodUploadsDir = path.resolve(process.cwd(), "server", "uploads", "foods");

fs.mkdirSync(foodUploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 6 * 1024 * 1024,
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

function getSafeDate(value) {
  const date = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : toLocalDateString();
}

function getExtensionFromMimeType(mimeType) {
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "jpg";
}

function buildNutritionPayload(userId, mealDate) {
  return {
    date: mealDate,
    summary: getNutritionSummary(userId, mealDate),
    meals: getMealEntries(userId, { mealDate }),
    history: getNutritionHistory(userId, 7).reverse(),
  };
}

router.get("/", auth, (req, res) => {
  try {
    const mealDate = getSafeDate(req.query?.date);
    res.json(buildNutritionPayload(req.user.id, mealDate));
  } catch {
    res.status(500).json({ error: "Failed to load nutrition data" });
  }
});

router.post("/", auth, (req, res) => {
  try {
    const meal = normalizeMealEntry(req.body);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(meal.mealDate)) {
      return res.status(400).json({ error: "Provide a valid meal date" });
    }

    if (!isValidMealType(meal.mealType)) {
      return res.status(400).json({ error: "Choose a valid meal type" });
    }

    if (meal.title.length < 2 || meal.title.length > 80) {
      return res.status(400).json({ error: "Meal title should be 2 to 80 characters" });
    }

    if (meal.calories <= 0) {
      return res.status(400).json({ error: "Calories must be greater than zero" });
    }

    if (meal.notes.length > 500) {
      return res.status(400).json({ error: "Notes should stay under 500 characters" });
    }

    const result = db.prepare(`
      INSERT INTO meal_entries (
        userId,
        mealDate,
        mealType,
        title,
        calories,
        proteinGrams,
        carbsGrams,
        fatGrams,
        fiberGrams,
        notes,
        imageUrl,
        source
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      meal.mealDate,
      meal.mealType,
      meal.title,
      meal.calories,
      meal.proteinGrams,
      meal.carbsGrams,
      meal.fatGrams,
      meal.fiberGrams,
      meal.notes || null,
      meal.imageUrl,
      meal.source
    );

    logActivity(req.user.id, "meal_logged", {
      mealType: meal.mealType,
      title: meal.title,
      calories: meal.calories,
      proteinGrams: meal.proteinGrams,
      source: meal.source,
    });

    const savedMeal = db.prepare(`
      SELECT
        id,
        userId,
        mealDate,
        mealType,
        title,
        calories,
        proteinGrams,
        carbsGrams,
        fatGrams,
        fiberGrams,
        notes,
        imageUrl,
        source,
        createdAt
      FROM meal_entries
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      meal: savedMeal,
      ...buildNutritionPayload(req.user.id, meal.mealDate),
    });
  } catch {
    res.status(500).json({ error: "Failed to save meal" });
  }
});

router.post("/analyze-image", auth, (req, res) => {
  upload.single("food")(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ error: error.message || "Upload failed" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Food image is required" });
    }

    try {
      const extension = getExtensionFromMimeType(req.file.mimetype);
      const filename = `${req.user.id}-${randomUUID()}.${extension}`;
      const absolutePath = path.join(foodUploadsDir, filename);
      fs.writeFileSync(absolutePath, req.file.buffer);

      const imageUrl = `/foods/${filename}`;
      const analysis = await analyzeFoodImage({
        buffer: req.file.buffer,
        mediaType: req.file.mimetype,
        mealHint: req.body?.mealHint,
      });

      res.json({
        imageUrl,
        ...analysis,
      });
    } catch {
      res.status(500).json({ error: "Failed to analyze food image" });
    }
  });
});

export default router;
