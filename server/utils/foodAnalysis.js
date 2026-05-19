import { hasAnthropicApiKey, requestAnthropicVisionText } from "./anthropic.js";
import { inferMealTypeFromClock } from "./nutrition.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeText(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function sanitizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeEstimate(raw = {}, fallbackMealType) {
  return {
    title: sanitizeText(raw.title, "Meal photo"),
    mealType: sanitizeText(raw.mealType, fallbackMealType).toLowerCase(),
    calories: Math.round(clamp(sanitizeNumber(raw.calories, 0), 0, 20000)),
    proteinGrams: clamp(sanitizeNumber(raw.proteinGrams, 0), 0, 9999),
    carbsGrams: clamp(sanitizeNumber(raw.carbsGrams, 0), 0, 9999),
    fatGrams: clamp(sanitizeNumber(raw.fatGrams, 0), 0, 9999),
    fiberGrams: clamp(sanitizeNumber(raw.fiberGrams, 0), 0, 9999),
    confidence: sanitizeText(raw.confidence, "low"),
    notes: sanitizeText(raw.notes, "Estimate generated from the visible meal only."),
  };
}

function extractJsonObject(text) {
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

export async function analyzeFoodImage({
  buffer,
  mediaType,
  mealHint,
}) {
  const fallbackMealType = inferMealTypeFromClock();

  if (!hasAnthropicApiKey()) {
    return {
      aiUsed: false,
      manualReviewRequired: true,
      estimate: sanitizeEstimate(
        {
          title: mealHint || "Meal photo",
          mealType: fallbackMealType,
          notes:
            "Automatic photo analysis is ready, but it needs ANTHROPIC_API_KEY in the environment before nutrition estimates can be generated.",
        },
        fallbackMealType
      ),
    };
  }

  const responseText = await requestAnthropicVisionText({
    system:
      "You are a sports nutrition analyst. Estimate the visible meal conservatively and return JSON only.",
    prompt: `Look at this food photo${mealHint ? ` and use this hint: ${mealHint}.` : "."}
Return only valid JSON with these keys:
{
  "title": string,
  "mealType": "breakfast" | "lunch" | "dinner" | "snack" | "preworkout" | "postworkout",
  "calories": number,
  "proteinGrams": number,
  "carbsGrams": number,
  "fatGrams": number,
  "fiberGrams": number,
  "confidence": "low" | "medium" | "high",
  "notes": string
}
Use visible ingredients only. Be honest when uncertain.`,
    mediaType,
    imageBase64: buffer.toString("base64"),
    maxTokens: 350,
    fallbackText: "",
  });

  const parsed = extractJsonObject(responseText);
  if (!parsed) {
    return {
      aiUsed: false,
      manualReviewRequired: true,
      estimate: sanitizeEstimate(
        {
          title: mealHint || "Meal photo",
          mealType: fallbackMealType,
          notes:
            "The food photo uploaded correctly, but the AI estimate was unclear. You can still log this meal manually.",
        },
        fallbackMealType
      ),
    };
  }

  return {
    aiUsed: true,
    manualReviewRequired: false,
    estimate: sanitizeEstimate(parsed, fallbackMealType),
  };
}
