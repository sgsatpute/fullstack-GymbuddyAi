import db from "../db.js";

const MEAL_TYPES = new Set([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "preworkout",
  "postworkout",
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundToSingleDecimal(value) {
  return Math.round(value * 10) / 10;
}

function sanitizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function sanitizeMacro(value) {
  return roundToSingleDecimal(clamp(sanitizeNumber(value, 0), 0, 9999));
}

function sanitizeCalories(value) {
  return Math.round(clamp(sanitizeNumber(value, 0), 0, 20000));
}

export function isValidMealType(value) {
  return MEAL_TYPES.has(String(value ?? "").trim().toLowerCase());
}

export function inferMealTypeFromClock() {
  const hour = new Date().getHours();
  if (hour < 10) {
    return "breakfast";
  }
  if (hour < 14) {
    return "lunch";
  }
  if (hour < 18) {
    return "snack";
  }
  return "dinner";
}

export function getDailyNutritionTargets(user = {}) {
  const baseTargetsByGoal = {
    muscle: {
      calories: 2700,
      proteinGrams: 165,
      carbsGrams: 320,
      fatGrams: 80,
      fiberGrams: 32,
    },
    fatloss: {
      calories: 2200,
      proteinGrams: 170,
      carbsGrams: 210,
      fatGrams: 70,
      fiberGrams: 34,
    },
    fitness: {
      calories: 2400,
      proteinGrams: 150,
      carbsGrams: 260,
      fatGrams: 75,
      fiberGrams: 30,
    },
  };

  const target = {
    ...(baseTargetsByGoal[user.goal] ?? baseTargetsByGoal.fitness),
  };

  if (user.experience === "advanced") {
    target.calories += 180;
    target.carbsGrams += 25;
    target.proteinGrams += 10;
  } else if (user.experience === "beginner") {
    target.calories -= 120;
    target.carbsGrams -= 15;
  }

  if (user.preferredTime === "morning") {
    target.carbsGrams += 10;
  }

  return target;
}

export function normalizeMealEntry(input = {}) {
  return {
    mealDate: String(input.mealDate ?? "").trim(),
    mealType: String(input.mealType ?? inferMealTypeFromClock())
      .trim()
      .toLowerCase(),
    title: String(input.title ?? "").trim(),
    calories: sanitizeCalories(input.calories),
    proteinGrams: sanitizeMacro(input.proteinGrams),
    carbsGrams: sanitizeMacro(input.carbsGrams),
    fatGrams: sanitizeMacro(input.fatGrams),
    fiberGrams: sanitizeMacro(input.fiberGrams),
    notes: String(input.notes ?? "").trim(),
    imageUrl: String(input.imageUrl ?? "").trim() || null,
    source: String(input.source ?? "manual").trim().toLowerCase() || "manual",
  };
}

export function getMealEntries(userId, options = {}) {
  const limit = Number.isFinite(options.limit) ? options.limit : 20;
  const mealDate = String(options.mealDate ?? "").trim();

  if (mealDate) {
    return db.prepare(`
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
      WHERE userId = ? AND mealDate = ?
      ORDER BY datetime(createdAt) DESC, id DESC
    `).all(userId, mealDate);
  }

  return db.prepare(`
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
    WHERE userId = ?
    ORDER BY mealDate DESC, datetime(createdAt) DESC, id DESC
    LIMIT ?
  `).all(userId, limit);
}

function buildMacroProgress(consumed, target) {
  const progressPercent =
    target > 0 ? clamp(Math.round((consumed / target) * 100), 0, 200) : 0;

  return {
    consumed: roundToSingleDecimal(consumed),
    target: roundToSingleDecimal(target),
    remaining: roundToSingleDecimal(Math.max(0, target - consumed)),
    progressPercent,
  };
}

function getMealTypeBreakdown(entries) {
  const breakdown = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
    preworkout: 0,
    postworkout: 0,
  };

  for (const entry of entries) {
    const key = String(entry.mealType ?? "").trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(breakdown, key)) {
      breakdown[key] += 1;
    }
  }

  return breakdown;
}

export function getNutritionSummary(userId, mealDate) {
  const user = db.prepare(`
    SELECT goal, experience, preferredTime
    FROM users
    WHERE id = ?
  `).get(userId) ?? {};

  const entries = getMealEntries(userId, { mealDate });
  const targets = getDailyNutritionTargets(user);
  const totals = entries.reduce(
    (accumulator, entry) => ({
      calories: accumulator.calories + sanitizeCalories(entry.calories),
      proteinGrams: accumulator.proteinGrams + sanitizeMacro(entry.proteinGrams),
      carbsGrams: accumulator.carbsGrams + sanitizeMacro(entry.carbsGrams),
      fatGrams: accumulator.fatGrams + sanitizeMacro(entry.fatGrams),
      fiberGrams: accumulator.fiberGrams + sanitizeMacro(entry.fiberGrams),
    }),
    {
      calories: 0,
      proteinGrams: 0,
      carbsGrams: 0,
      fatGrams: 0,
      fiberGrams: 0,
    }
  );

  const calorieProgress = buildMacroProgress(totals.calories, targets.calories);
  const proteinProgress = buildMacroProgress(totals.proteinGrams, targets.proteinGrams);
  const carbsProgress = buildMacroProgress(totals.carbsGrams, targets.carbsGrams);
  const fatProgress = buildMacroProgress(totals.fatGrams, targets.fatGrams);
  const fiberProgress = buildMacroProgress(totals.fiberGrams, targets.fiberGrams);
  const proteinGoalHit = proteinProgress.progressPercent >= 90;
  const calorieWindowHit =
    calorieProgress.progressPercent >= 80 && calorieProgress.progressPercent <= 115;
  const macroBalanceScore = clamp(
    Math.round(
      (proteinGoalHit ? 40 : proteinProgress.progressPercent * 0.35) +
        (calorieWindowHit ? 30 : 10) +
        Math.min(15, carbsProgress.progressPercent * 0.12) +
        Math.min(15, fiberProgress.progressPercent * 0.2)
    ),
    0,
    100
  );

  return {
    date: mealDate,
    totals: {
      calories: sanitizeCalories(totals.calories),
      proteinGrams: roundToSingleDecimal(totals.proteinGrams),
      carbsGrams: roundToSingleDecimal(totals.carbsGrams),
      fatGrams: roundToSingleDecimal(totals.fatGrams),
      fiberGrams: roundToSingleDecimal(totals.fiberGrams),
    },
    targets,
    progress: {
      calories: calorieProgress,
      proteinGrams: proteinProgress,
      carbsGrams: carbsProgress,
      fatGrams: fatProgress,
      fiberGrams: fiberProgress,
    },
    mealCount: entries.length,
    mealTypeBreakdown: getMealTypeBreakdown(entries),
    macroBalanceScore,
    coachHeadline:
      proteinGoalHit && calorieWindowHit
        ? "Protein and calories are supporting the goal well today."
        : proteinProgress.progressPercent < 70
          ? "Protein is the easiest lever to improve the day right now."
          : calorieProgress.progressPercent < 70
            ? "You are under target so far, which may hurt performance if training is still ahead."
            : "Macros are moving, but a cleaner final meal can make the day land better.",
  };
}

export function getNutritionHistory(userId, days = 7) {
  return db.prepare(`
    SELECT
      mealDate,
      SUM(calories) AS calories,
      ROUND(SUM(proteinGrams), 1) AS proteinGrams,
      ROUND(SUM(carbsGrams), 1) AS carbsGrams,
      ROUND(SUM(fatGrams), 1) AS fatGrams,
      ROUND(SUM(fiberGrams), 1) AS fiberGrams,
      COUNT(*) AS mealCount
    FROM meal_entries
    WHERE userId = ?
    GROUP BY mealDate
    ORDER BY mealDate DESC
    LIMIT ?
  `).all(userId, days);
}
