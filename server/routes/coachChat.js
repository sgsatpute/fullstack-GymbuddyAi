import express from "express";
import anthropicCoach from "../utils/anthropic.js";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { buildUserContext } from "../utils/coachMemory.js";
import { coachMessageLimiter, progressAnalysisLimiter } from "../middleware/rateLimit.js";
import { getCachedValue, setCachedValue } from "../utils/ttlCache.js";

const router = express.Router();
const insightsCache = new Map();
const INSIGHTS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function estimateTokens(text) {
  return Math.max(1, Math.round(String(text ?? "").length / 4));
}

function clampRating(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(5, Math.max(1, Math.round(parsed))) : 3;
}

function buildFallbackReply(context, message) {
  const focus = context.summary?.nextSuggestedFocus ?? "your next planned session";
  if (String(message).toLowerCase().includes("meal")) {
    return `Keep meals simple around ${focus.toLowerCase()}: protein first, carbs near training, and one easy meal you can repeat tomorrow. Your next step: plan tonight's protein source now.`;
  }

  return `${context.userProfile.name}, your best move is to keep this week pointed at ${focus.toLowerCase()}. Stay direct, keep the session manageable, and let consistency do the work. Your next step: lock your next training time in your calendar.`;
}

function writeSseHeaders(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
}

function writeSseEvent(res, eventName, payload) {
  res.write(`event: ${eventName}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function getHistoryPayload(userId, page = 1, pageSize = 50) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 50));
  const offset = (safePage - 1) * safePageSize;

  const total = db.prepare(`
    SELECT COUNT(*) AS count
    FROM coach_messages
    WHERE userId = ?
  `).get(userId)?.count ?? 0;

  const messages = db.prepare(`
    SELECT id, role, content, tokens, createdAt
    FROM coach_messages
    WHERE userId = ?
    ORDER BY datetime(createdAt) DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(userId, safePageSize, offset)
    .reverse();

  return {
    page: safePage,
    pageSize: safePageSize,
    total,
    messages,
  };
}

router.get("/history", auth, async (req, res) => {
  try {
    res.json(await getHistoryPayload(req.user.id, req.query.page, req.query.pageSize));
  } catch {
    res.status(500).json({ error: "Failed to load coach history" });
  }
});

router.get("/messages", auth, async (req, res) => {
  try {
    const history = await getHistoryPayload(req.user.id, 1, 30);
    res.json(history.messages);
  } catch {
    res.status(500).json({ error: "Failed to load coach messages" });
  }
});

router.post("/message", auth, coachMessageLimiter, async (req, res) => {
  const message = String(req.body?.message ?? "").trim();
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const context = buildUserContext(req.user.id);
    const historyRows = db.prepare(`
      SELECT role, content
      FROM coach_messages
      WHERE userId = ?
      ORDER BY datetime(createdAt) DESC, id DESC
      LIMIT 10
    `).all(req.user.id)
      .reverse();

    const fallbackReply = buildFallbackReply(context, message);

    db.prepare(`
      INSERT INTO coach_messages (userId, role, content, tokens, createdAt)
      VALUES (?, 'user', ?, ?, ?)
    `).run(req.user.id, message, estimateTokens(message), new Date().toISOString());

    const wantsStream = String(req.headers.accept ?? "").includes("text/event-stream");
    if (!wantsStream) {
      const reply = await anthropicCoach.requestText({
        system: anthropicCoach.generateSystemPrompt(context.userProfile, context.userStats),
        messages: [...historyRows, { role: "user", content: message }],
        maxTokens: 350,
        fallbackText: fallbackReply,
      });

      db.prepare(`
        INSERT INTO coach_messages (userId, role, content, tokens, createdAt)
        VALUES (?, 'assistant', ?, ?, ?)
      `).run(req.user.id, reply, estimateTokens(reply), new Date().toISOString());

      return res.json({ reply });
    }

    writeSseHeaders(res);
    let fullReply = "";

    const reply = await anthropicCoach.streamChat(
      context.userProfile,
      context.userStats,
      historyRows,
      message,
      (chunk) => {
        fullReply += chunk;
        writeSseEvent(res, "chunk", { text: chunk });
      }
    );

    db.prepare(`
      INSERT INTO coach_messages (userId, role, content, tokens, createdAt)
      VALUES (?, 'assistant', ?, ?, ?)
    `).run(req.user.id, reply, estimateTokens(reply), new Date().toISOString());

    writeSseEvent(res, "done", { reply });
    res.end();
  } catch {
    res.status(500).json({ error: "Failed to generate coach reply" });
  }
});

router.post("/workout-plan", auth, async (req, res) => {
  try {
    const context = buildUserContext(req.user.id);
    const plan = await anthropicCoach.generateWorkoutPlan({
      ...context.userProfile,
      summary: context.summary,
      recentWorkouts: context.recentWorkouts,
    });

    db.prepare(`
      UPDATE workout_plans
      SET isActive = 0
      WHERE userId = ?
    `).run(req.user.id);

    db.prepare(`
      INSERT INTO workout_plans (userId, planData, generatedAt, isActive)
      VALUES (?, ?, ?, 1)
    `).run(req.user.id, JSON.stringify(plan), new Date().toISOString());

    res.json(plan);
  } catch {
    res.status(500).json({ error: "Failed to generate workout plan" });
  }
});

router.post("/daily-checkin", auth, async (req, res) => {
  try {
    const mood = clampRating(req.body?.mood);
    const energy = clampRating(req.body?.energy);
    const soreness = clampRating(req.body?.soreness);
    const context = buildUserContext(req.user.id);

    const fallbackAdvice = `${context.userProfile.name}, keep today's training honest: ${energy <= 2 || soreness >= 4 ? "pull intensity down and focus on recovery quality." : "stick to a manageable session and finish with a little mobility."} Your next step: decide whether today is a push day or recovery day before you head to the gym.`;

    const aiAdvice = await anthropicCoach.requestText({
      system: anthropicCoach.generateSystemPrompt(context.userProfile, context.userStats),
      messages: [
        {
          role: "user",
          content: `Daily check-in: mood ${mood}/5, energy ${energy}/5, soreness ${soreness}/5. Give short coaching advice.`,
        },
      ],
      maxTokens: 220,
      fallbackText: fallbackAdvice,
    });

    db.prepare(`
      INSERT INTO daily_checkins (userId, mood, energy, soreness, aiAdvice, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.id, mood, energy, soreness, aiAdvice, new Date().toISOString());

    res.json({ mood, energy, soreness, aiAdvice });
  } catch {
    res.status(500).json({ error: "Failed to save daily check-in" });
  }
});

router.get("/insights", auth, progressAnalysisLimiter, async (req, res) => {
  try {
    const cacheKey = `coach-insights:${req.user.id}`;
    const cached = getCachedValue(insightsCache, cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const context = buildUserContext(req.user.id);
    const payload = await anthropicCoach.analyzeProgress(context.userProfile, {
      ...context.userStats,
      workoutsThisWeek: context.summary.weeklySessions,
      weeklyMinutes: context.summary.weeklyMinutes,
      readinessScore: context.summary.readinessScore,
    });

    setCachedValue(insightsCache, cacheKey, payload, INSIGHTS_CACHE_TTL_MS);

    return res.json(payload);
  } catch {
    return res.status(500).json({ error: "Failed to load coach insights" });
  }
});

export default router;
