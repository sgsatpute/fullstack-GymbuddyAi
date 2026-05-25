import { randomUUID } from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import anthropicCoach from "../utils/anthropic.js";
import db from "../db.js";
import auth from "../middleware/auth.js";
import {
  foodAnalysisLimiter,
  progressAnalysisLimiter,
} from "../middleware/rateLimit.js";
import {
  analyzeFoodImage,
  analyzeFoodText,
  analyzeNutritionPattern,
  generateMealPlan,
} from "../utils/foodAnalysis.js";
import { findIndianFoods } from "../utils/indianFoods.js";
import { logActivity } from "../utils/activity.js";
import { awardXP, XP_REWARDS } from "../utils/xpSystem.js";
import {
  getDailyNutritionTargets,
  getMealEntries,
  getNutritionHistory,
  getNutritionSummary,
  isValidMealType,
  normalizeMealEntry,
} from "../utils/nutrition.js";
import { toLocalDateString } from "../utils/fitness.js";
import { getCachedValue, setCachedValue } from "../utils/ttlCache.js";

const router = express.Router();
const foodUploadsDir = path.resolve(process.cwd(), "server", "uploads", "foods");
const searchCache = new Map();
const insightsCache = new Map();
const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000;
const INSIGHTS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

fs.mkdirSync(foodUploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
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

function buildNutritionOverview(userId, mealDate) {
  return {
    date: mealDate,
    summary: getNutritionSummary(userId, mealDate),
    meals: getMealEntries(userId, { mealDate }),
    history: getNutritionHistory(userId, 7).reverse(),
  };
}

function buildTodayPayload(userId, mealDate = toLocalDateString()) {
  const summary = getNutritionSummary(userId, mealDate);
  return {
    date: mealDate,
    entries: getMealEntries(userId, { mealDate }),
    totals: summary.totals,
    goalProgress: summary.progress,
    summary,
  };
}

function sanitizeQuery(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function searchOpenFoodFacts(query) {
  const cacheKey = sanitizeQuery(query);
  const cached = getCachedValue(searchCache, cacheKey);
  if (cached) {
    return cached;
  }

  const url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
    "&search_simple=1&action=process&json=1&page_size=10&fields=product_name,nutriments,serving_size,brands";

  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const results = Array.isArray(data?.products)
    ? data.products
        .map((product) => ({
          name: product.product_name,
          calories:
            Number(product?.nutriments?.["energy-kcal_serving"]) ||
            Number(product?.nutriments?.["energy-kcal_100g"]) ||
            0,
          protein:
            Number(product?.nutriments?.proteins_serving) ||
            Number(product?.nutriments?.proteins_100g) ||
            0,
          carbs:
            Number(product?.nutriments?.carbohydrates_serving) ||
            Number(product?.nutriments?.carbohydrates_100g) ||
            0,
          fat:
            Number(product?.nutriments?.fat_serving) ||
            Number(product?.nutriments?.fat_100g) ||
            0,
          servingSize: product.serving_size || "1 serving",
          brand: product.brands || "OpenFoodFacts",
          source: "openFoodFacts",
        }))
        .filter((product) => product.name)
    : [];

  setCachedValue(searchCache, cacheKey, results, SEARCH_CACHE_TTL_MS);

  return results;
}

function validateMeal(meal) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meal.mealDate)) {
    return "Provide a valid meal date";
  }
  if (!isValidMealType(meal.mealType)) {
    return "Choose a valid meal type";
  }
  if (meal.title.length < 2 || meal.title.length > 120) {
    return "Meal title should be 2 to 120 characters";
  }
  if (meal.calories <= 0) {
    return "Calories must be greater than zero";
  }
  if (meal.notes.length > 500) {
    return "Notes should stay under 500 characters";
  }
  return null;
}

function insertMeal(userId, meal) {
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
    userId,
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

  logActivity(userId, "meal_logged", {
    mealType: meal.mealType,
    title: meal.title,
    calories: meal.calories,
    proteinGrams: meal.proteinGrams,
    source: meal.source,
  });
  awardXP(userId, XP_REWARDS.log_nutrition, "log_nutrition");

  return savedMeal;
}

router.get("/", auth, (req, res) => {
  try {
    const mealDate = getSafeDate(req.query?.date);
    res.json(buildNutritionOverview(req.user.id, mealDate));
  } catch {
    res.status(500).json({ error: "Failed to load nutrition data" });
  }
});

router.post("/", auth, (req, res) => {
  try {
    const meal = normalizeMealEntry(req.body);
    const error = validateMeal(meal);
    if (error) {
      return res.status(400).json({ error });
    }

    insertMeal(req.user.id, meal);
    res.status(201).json(buildNutritionOverview(req.user.id, meal.mealDate));
  } catch {
    res.status(500).json({ error: "Failed to save meal" });
  }
});

router.get("/search", auth, async (req, res) => {
  try {
    const query = String(req.query.q ?? "").trim();
    if (!query) {
      return res.json([]);
    }

    const indianMatches = findIndianFoods(query);
    if (indianMatches.length > 0) {
      return res.json(indianMatches);
    }

    return res.json(await searchOpenFoodFacts(query));
  } catch {
    return res.status(500).json({ error: "Failed to search food database" });
  }
});

router.post("/analyze-text", auth, foodAnalysisLimiter, async (req, res) => {
  try {
    const description = String(req.body?.description ?? "").trim();
    if (!description) {
      return res.status(400).json({ error: "Food description is required" });
    }

    const user = db.prepare(`
      SELECT goal
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    const analysis = await analyzeFoodText(description, user?.goal ?? "fitness");
    return res.json(analysis);
  } catch {
    return res.status(500).json({ error: "Failed to analyze meal description" });
  }
});

router.post("/log", auth, (req, res) => {
  try {
    const meal = normalizeMealEntry(req.body);
    const error = validateMeal(meal);
    if (error) {
      return res.status(400).json({ error });
    }

    const savedMeal = insertMeal(req.user.id, meal);
    return res.status(201).json({
      meal: savedMeal,
      ...buildTodayPayload(req.user.id, meal.mealDate),
    });
  } catch {
    return res.status(500).json({ error: "Failed to log nutrition entry" });
  }
});

router.get("/today", auth, (req, res) => {
  try {
    res.json(buildTodayPayload(req.user.id, getSafeDate(req.query?.date)));
  } catch {
    res.status(500).json({ error: "Failed to load today's nutrition" });
  }
});

router.get("/history", auth, (req, res) => {
  try {
    res.json(getNutritionHistory(req.user.id, 30).reverse());
  } catch {
    res.status(500).json({ error: "Failed to load nutrition history" });
  }
});

router.get("/weekly-insights", auth, progressAnalysisLimiter, async (req, res) => {
  try {
    const cacheKey = `nutrition-insights:${req.user.id}`;
    const cached = getCachedValue(insightsCache, cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const entries = getNutritionHistory(req.user.id, 7).reverse();
    const user = db.prepare(`
      SELECT goal
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    const payload = await analyzeNutritionPattern(entries, user?.goal ?? "fitness");
    setCachedValue(insightsCache, cacheKey, payload, INSIGHTS_CACHE_TTL_MS);

    return res.json(payload);
  } catch {
    return res.status(500).json({ error: "Failed to load weekly nutrition insights" });
  }
});

router.post("/meal-plan", auth, async (req, res) => {
  try {
    const user = db.prepare(`
      SELECT name, age, goal, experience, preferredTime, city
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    const caloricGoal =
      Number(req.body?.caloricGoal) ||
      getDailyNutritionTargets(user).calories;

    res.json(await generateMealPlan(user, caloricGoal));
  } catch {
    res.status(500).json({ error: "Failed to build meal plan" });
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
