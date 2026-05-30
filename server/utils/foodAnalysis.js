import anthropicCoach, {
  hasConfiguredAi,
  requestAnthropicVisionText,
} from "./anthropic.js";
import { inferMealTypeFromClock } from "./nutrition.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function extractJson(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) {
    return null;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function sanitizeFood(food = {}) {
  return {
    name: toText(food.name, "Food item"),
    portion: toText(food.portion, "1 serving"),
    calories: Math.round(clamp(toNumber(food.calories), 0, 2500)),
    protein: clamp(toNumber(food.protein), 0, 300),
    carbs: clamp(toNumber(food.carbs), 0, 400),
    fat: clamp(toNumber(food.fat), 0, 200),
  };
}

function fallbackFoodAnalysis(description, userGoal) {
  const mealType = inferMealTypeFromClock();
  return {
    foods: [
      {
        name: toText(description, "Meal entry"),
        portion: "1 serving",
        calories: 450,
        protein: userGoal === "muscle" ? 30 : 22,
        carbs: 45,
        fat: 14,
      },
    ],
    total: {
      calories: 450,
      protein: userGoal === "muscle" ? 30 : 22,
      carbs: 45,
      fat: 14,
    },
    mealType,
    healthScore: 7,
    goalAlignment:
      userGoal === "muscle"
        ? "Decent starting meal for muscle gain if protein stays high through the rest of the day."
        : "Solid meal if the rest of the day stays protein-forward and portion-aware.",
    suggestions: [
      "Add a clear protein source if this meal felt light on protein.",
      "Keep the next meal simple and repeatable.",
    ],
  };
}

function sanitizeFoodAnalysis(raw = {}, fallback = fallbackFoodAnalysis("", "fitness")) {
  const foods = Array.isArray(raw.foods) && raw.foods.length > 0
    ? raw.foods.map(sanitizeFood)
    : fallback.foods;
  const total = raw.total ?? fallback.total;

  return {
    foods,
    total: {
      calories: Math.round(clamp(toNumber(total.calories, fallback.total.calories), 0, 5000)),
      protein: clamp(toNumber(total.protein, fallback.total.protein), 0, 500),
      carbs: clamp(toNumber(total.carbs, fallback.total.carbs), 0, 700),
      fat: clamp(toNumber(total.fat, fallback.total.fat), 0, 300),
    },
    mealType: toText(raw.mealType, fallback.mealType).toLowerCase(),
    healthScore: clamp(toNumber(raw.healthScore, fallback.healthScore), 1, 10),
    goalAlignment: toText(raw.goalAlignment, fallback.goalAlignment),
    suggestions:
      Array.isArray(raw.suggestions) && raw.suggestions.length > 0
        ? raw.suggestions.map((item) => toText(item)).filter(Boolean).slice(0, 3)
        : fallback.suggestions,
  };
}

export async function analyzeFoodText(description, userGoal = "fitness") {
  const fallback = fallbackFoodAnalysis(description, userGoal);
  if (!hasConfiguredAi()) {
    return fallback;
  }

  const responseText = await anthropicCoach.requestText({
    system:
      "You are a sports nutrition coach. Return valid JSON only. Do not include markdown fences.",
    messages: [
      {
        role: "user",
        content: `Analyze this meal description for a user whose goal is ${userGoal}: ${description}
Return JSON with keys foods, total, mealType, healthScore, goalAlignment, suggestions.`,
      },
    ],
    maxTokens: 500,
    fallbackText: JSON.stringify(fallback),
  });

  return sanitizeFoodAnalysis(extractJson(responseText), fallback);
}

export async function analyzeNutritionPattern(last7DaysEntries, userGoal = "fitness") {
  const fallback = {
    headline: "Nutrition pattern analysis",
    deficiencies: ["Consistency is the biggest lever right now."],
    recommendations: [
      "Keep protein more even across the day.",
      "Decide one meal you can repeat every day this week.",
    ],
  };

  if (!hasConfiguredAi()) {
    return fallback;
  }

  return anthropicCoach.requestJson({
    system:
      "You are a nutrition analyst. Return valid JSON only with keys headline, deficiencies, recommendations.",
    prompt: `Review this 7 day nutrition pattern for a ${userGoal} goal:
${JSON.stringify(last7DaysEntries)}
Identify major deficiencies and actionable next steps.`,
    fallbackValue: fallback,
    maxTokens: 450,
  });
}

export async function generateMealPlan(userProfile = {}, caloricGoal = 2200) {
  const fallback = {
    breakfast: "Greek yogurt, fruit, oats, and nuts",
    lunch: "Rice bowl with lean protein, vegetables, and dal",
    dinner: "Protein-rich curry with roti and salad",
    snacks: ["Fruit with yogurt", "Paneer or boiled eggs"],
    calories: caloricGoal,
    notes: "Repeatable meals win. Keep protein present in every meal.",
  };

  if (!hasConfiguredAi()) {
    return fallback;
  }

  return anthropicCoach.requestJson({
    system:
      "You are a sports nutrition planner. Return valid JSON only with breakfast, lunch, dinner, snacks, calories, notes.",
    prompt: `Build a full day meal plan for:
${JSON.stringify(userProfile)}
Target calories: ${caloricGoal}
Include 2 snacks and keep it practical.`,
    fallbackValue: fallback,
    maxTokens: 550,
  });
}

export async function analyzeFoodImage({ buffer, mediaType, mealHint }) {
  const fallbackMealType = inferMealTypeFromClock();

  if (!hasConfiguredAi()) {
    return {
      aiUsed: false,
      manualReviewRequired: true,
      estimate: {
        title: mealHint || "Meal photo",
        mealType: fallbackMealType,
        calories: 0,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
        fiberGrams: 0,
        confidence: "low",
        notes:
          "Automatic photo analysis is available once GEMINI_API_KEY or ANTHROPIC_API_KEY is configured.",
      },
    };
  }

  const responseText = await requestAnthropicVisionText({
    system:
      "You are a sports nutrition analyst. Estimate the visible meal conservatively and return JSON only.",
    prompt: `Look at this food photo${mealHint ? ` and use this hint: ${mealHint}.` : "."}
Return valid JSON with title, mealType, calories, proteinGrams, carbsGrams, fatGrams, fiberGrams, confidence, notes.`,
    mediaType,
    imageBase64: buffer.toString("base64"),
    maxTokens: 350,
    fallbackText: "",
  });

  const parsed = extractJson(responseText);
  if (!parsed) {
    return {
      aiUsed: false,
      manualReviewRequired: true,
      estimate: {
        title: mealHint || "Meal photo",
        mealType: fallbackMealType,
        calories: 0,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
        fiberGrams: 0,
        confidence: "low",
        notes: "The meal photo uploaded correctly, but the estimate needs manual review.",
      },
    };
  }

  return {
    aiUsed: true,
    manualReviewRequired: false,
    estimate: {
      title: toText(parsed.title, mealHint || "Meal photo"),
      mealType: toText(parsed.mealType, fallbackMealType).toLowerCase(),
      calories: Math.round(clamp(toNumber(parsed.calories), 0, 3000)),
      proteinGrams: clamp(toNumber(parsed.proteinGrams), 0, 300),
      carbsGrams: clamp(toNumber(parsed.carbsGrams), 0, 400),
      fatGrams: clamp(toNumber(parsed.fatGrams), 0, 250),
      fiberGrams: clamp(toNumber(parsed.fiberGrams), 0, 100),
      confidence: toText(parsed.confidence, "medium"),
      notes: toText(parsed.notes, "AI estimate generated from visible ingredients."),
    },
  };
}
