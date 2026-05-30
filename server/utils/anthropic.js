import config from "../config.js";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

function getContentText(content) {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) =>
      block?.type === "text" && typeof block.text === "string" ? block.text : ""
    )
    .join("")
    .trim();
}

function safeJsonParse(value) {
  const raw = String(value ?? "").trim();
  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch?.[1]?.trim() || raw;

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

function normalizeMessages(messages = []) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "assistant" : "user",
    content:
      typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? message.content
          : String(message.content ?? ""),
  }));
}

function getGeminiText(payload, { trim = true } = {}) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  const text = parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .join("");

  return trim ? text.trim() : text;
}

function toGeminiRole(role) {
  return role === "assistant" || role === "model" ? "model" : "user";
}

function toGeminiContents(messages = []) {
  return normalizeMessages(messages)
    .map((message) => ({
      role: toGeminiRole(message.role),
      parts: [{ text: message.content }],
    }))
    .filter((message) => message.parts[0].text.trim());
}

function buildFallbackWorkoutPlan(userProfile = {}) {
  const days = Math.min(7, Math.max(3, Number(userProfile.daysAvailable ?? 4)));
  const weeklySchedule = {
    monday: days >= 4 ? "Upper body strength" : "Full body session",
    tuesday: "Mobility and light cardio",
    wednesday: "Lower body strength",
    thursday: "Recovery walk or yoga",
    friday: "Push and pull compound work",
    saturday: days >= 5 ? "Conditioning session" : "Optional active recovery",
    sunday: "Full rest",
  };

  return {
    recommended_plan: "Balanced Strength Builder",
    confidence: 0.61,
    plan_id: 8,
    alternative_plans: [
      { plan: "Weight Loss HIIT Circuit", confidence: 0.22 },
      { plan: "Beginner Full Body 3x/week", confidence: 0.17 },
    ],
    weekly_schedule: weeklySchedule,
    key_exercises: ["Squat", "Romanian deadlift", "Bench press", "Row"],
    reasoning:
      "This fallback plan leans on simple strength work and recovery balance until the live coach model is available.",
  };
}

function buildFallbackProgress(userProfile = {}, weeklyStats = {}) {
  return {
    headline: `${userProfile.name ?? "Athlete"} is building momentum.`,
    summary:
      weeklyStats.workoutsThisWeek >= 3
        ? "You are stacking enough volume to move the goal forward."
        : "Consistency is the main lever right now.",
    wins: [
      `Current streak: ${weeklyStats.streak ?? 0} days`,
      `Workouts this month: ${weeklyStats.workoutsThisMonth ?? 0}`,
    ],
    recommendations: [
      "Protect your next training block on the calendar.",
      "Keep protein and sleep consistent for the next 7 days.",
    ],
  };
}

export class AnthropicCoach {
  constructor({
    anthropicApiKey = config.anthropicApiKey,
    geminiApiKey = config.geminiApiKey,
    provider = config.aiProvider,
    anthropicModel = config.anthropicModel,
    geminiModel = config.geminiModel,
  } = {}) {
    this.anthropicApiKey = anthropicApiKey;
    this.geminiApiKey = geminiApiKey;
    this.provider = provider;
    this.anthropicModel = anthropicModel;
    this.geminiModel = geminiModel;
    this.model = this.provider === "gemini" ? this.geminiModel : this.anthropicModel;
  }

  hasApiKey() {
    return this.provider === "gemini"
      ? Boolean(this.geminiApiKey)
      : Boolean(this.anthropicApiKey);
  }

  getProviderName() {
    if (!this.hasApiKey()) {
      return "fallback";
    }
    return this.provider === "gemini" ? "gemini" : "anthropic";
  }

  buildHeaders() {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  buildGeminiHeaders() {
    return {
      "Content-Type": "application/json",
      "x-goog-api-key": this.geminiApiKey,
    };
  }

  buildGeminiPayload({ system, messages, maxTokens = 350 }) {
    return {
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: toGeminiContents(messages),
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    };
  }

  async createAnthropicMessage({ system, messages, maxTokens = 350, stream = false }) {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: this.anthropicModel,
        system,
        max_tokens: maxTokens,
        messages: normalizeMessages(messages),
        stream,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic request failed with ${response.status}`);
    }

    return response;
  }

  async createGeminiMessage({ system, messages, maxTokens = 350, stream = false }) {
    const endpoint = stream ? "streamGenerateContent?alt=sse" : "generateContent";
    const response = await fetch(`${GEMINI_API_URL}/${this.geminiModel}:${endpoint}`, {
      method: "POST",
      headers: this.buildGeminiHeaders(),
      body: JSON.stringify(this.buildGeminiPayload({ system, messages, maxTokens })),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed with ${response.status}`);
    }

    return response;
  }

  async createMessage(options) {
    if (this.provider === "gemini") {
      return this.createGeminiMessage(options);
    }
    return this.createAnthropicMessage(options);
  }

  generateSystemPrompt(userProfile = {}, userStats = {}) {
    return `You are Alex, a personal fitness coach on GymBuddy AI.
You are coaching ${userProfile.name ?? "the member"}, a ${userProfile.age ?? "unknown"}-year-old ${userProfile.experience ?? "intermediate"}
level gym-goer in ${userProfile.city ?? "their city"} whose goal is ${userProfile.goal ?? "general fitness"}.
They train at ${userProfile.locationLabel ?? userProfile.gym ?? "their gym"}, prefer ${userProfile.preferredTime ?? "consistent"} workouts,
and have ${userProfile.daysAvailable ?? userProfile.days ?? 4} days available per week.
Current stats: workouts this month ${userStats.workoutsThisMonth ?? 0}, streak ${userStats.streak ?? 0} days,
leaderboard rank ${userStats.leaderboardRank ?? "unranked"}.
Personality: motivating, direct, knowledgeable.
Keep responses under 150 words unless asked for a plan.
Use their name occasionally. Reference their city or gym when useful.
Always end with one actionable next step.`;
  }

  async requestText({ system, messages, maxTokens = 350, fallbackText = "" }) {
    if (!this.hasApiKey()) {
      return fallbackText;
    }

    try {
      const response = await this.createMessage({
        system,
        messages,
        maxTokens,
      });
      const data = await response.json();
      const text =
        this.provider === "gemini"
          ? getGeminiText(data)
          : getContentText(data?.content);
      return text || fallbackText;
    } catch {
      return fallbackText;
    }
  }

  async streamChat(userProfile, userStats, history, newMessage, onChunk) {
    const fallbackText =
      "You have momentum to build. Lock in your next workout block and keep the next step simple.";

    if (!this.hasApiKey()) {
      onChunk?.(fallbackText);
      return fallbackText;
    }

    try {
      const response = await this.createMessage({
        system: this.generateSystemPrompt(userProfile, userStats),
        messages: [...normalizeMessages(history).slice(-10), { role: "user", content: newMessage }],
        maxTokens: 700,
        stream: true,
      });

      if (!response.body) {
        onChunk?.(fallbackText);
        return fallbackText;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

        let boundaryIndex = buffer.indexOf("\n\n");
        while (boundaryIndex !== -1) {
          const rawEvent = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);
          boundaryIndex = buffer.indexOf("\n\n");

          const lines = rawEvent
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

          const eventName = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
          const dataText = lines
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.replace("data:", "").trimStart())
            .join("\n")
            .trim();

          if (!dataText || dataText === "[DONE]") {
            continue;
          }

          const payload = safeJsonParse(dataText);
          const chunk = this.provider === "gemini"
            ? getGeminiText(payload, { trim: false })
            : (
                payload?.delta?.text ??
                (eventName === "content_block_delta" ? payload?.delta?.text : "") ??
                ""
              );

          if (chunk) {
            fullText += chunk;
            onChunk?.(chunk);
          }
        }

        if (done) {
          break;
        }
      }

      if (!fullText.trim()) {
        onChunk?.(fallbackText);
        return fallbackText;
      }

      return fullText.trim();
    } catch {
      onChunk?.(fallbackText);
      return fallbackText;
    }
  }

  async requestJson({ system, prompt, fallbackValue, maxTokens = 600 }) {
    const fallbackText = JSON.stringify(fallbackValue);
    const text = await this.requestText({
      system,
      messages: [{ role: "user", content: prompt }],
      maxTokens,
      fallbackText,
    });

    const parsed = safeJsonParse(text);
    return parsed ?? fallbackValue;
  }

  async generateWorkoutPlan(userProfile = {}) {
    return this.requestJson({
      system:
        "You are an elite fitness programming coach. Return valid JSON only. No markdown or prose outside JSON.",
      prompt: `Create a personalized workout plan for this user:
${JSON.stringify(userProfile, null, 2)}
Return JSON with keys recommended_plan, confidence, plan_id, alternative_plans, weekly_schedule, key_exercises, reasoning.`,
      fallbackValue: buildFallbackWorkoutPlan(userProfile),
      maxTokens: 700,
    });
  }

  async analyzeProgress(userProfile = {}, weeklyStats = {}) {
    return this.requestJson({
      system:
        "You are a progress analysis coach. Return valid JSON only with headline, summary, wins, recommendations.",
      prompt: `Analyze this fitness progress:
User: ${JSON.stringify(userProfile)}
Weekly stats: ${JSON.stringify(weeklyStats)}
Keep it specific and motivating.`,
      fallbackValue: buildFallbackProgress(userProfile, weeklyStats),
      maxTokens: 500,
    });
  }

  async visionText({ system, prompt, mediaType, imageBase64, maxTokens = 350, fallbackText = "" }) {
    if (!this.hasApiKey()) {
      return fallbackText;
    }

    try {
      if (this.provider === "gemini") {
        const response = await fetch(`${GEMINI_API_URL}/${this.geminiModel}:generateContent`, {
          method: "POST",
          headers: this.buildGeminiHeaders(),
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: system }],
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: mediaType,
                      data: imageBase64,
                    },
                  },
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: 0.3,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Gemini vision request failed with ${response.status}`);
        }

        const data = await response.json();
        return getGeminiText(data) || fallbackText;
      }

      const response = await this.createMessage({
        system,
        maxTokens,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });

      const data = await response.json();
      return getContentText(data?.content) || fallbackText;
    } catch {
      return fallbackText;
    }
  }
}

const defaultCoach = new AnthropicCoach();

export function hasAnthropicApiKey() {
  return defaultCoach.hasApiKey();
}

export function hasConfiguredAi() {
  return defaultCoach.hasApiKey();
}

export async function requestAnthropicText({
  system,
  messages,
  maxTokens,
  fallbackText,
}) {
  return defaultCoach.requestText({
    system,
    messages,
    maxTokens,
    fallbackText,
  });
}

export async function requestAnthropicVisionText({
  system,
  prompt,
  mediaType,
  imageBase64,
  maxTokens,
  fallbackText,
}) {
  return defaultCoach.visionText({
    system,
    prompt,
    mediaType,
    imageBase64,
    maxTokens,
    fallbackText,
  });
}

export default defaultCoach;
