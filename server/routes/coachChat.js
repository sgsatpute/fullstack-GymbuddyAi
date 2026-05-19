import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { requestAnthropicText } from "../utils/anthropic.js";
import {
  getRecentWorkoutSessions,
  getWorkoutSummary,
  toLocalDateString,
} from "../utils/fitness.js";
import { getNutritionSummary } from "../utils/nutrition.js";

const router = express.Router();

function buildFallbackReply(user, message, summary) {
  const goal = user.goal || "fitness";
  const lower = String(message ?? "").toLowerCase();

  if (lower.includes("eat") || lower.includes("diet") || lower.includes("meal")) {
    return [
      `For ${goal}, anchor each meal around protein first.`,
      "Add carbs around training and keep dinner simple.",
      "Stay consistent for 7 days before changing anything.",
    ].join("\n");
  }

  if (lower.includes("missed") || lower.includes("restart")) {
    return [
      `For your ${goal} goal, restart small today.`,
      "Do a 30-40 minute session at your usual training time.",
      "Your next 3 days matter more than the last 3 you missed.",
    ].join("\n");
  }

  return [
    `For ${goal}, your next best move is a focused session you can repeat.`,
    `Keep intensity matched to your ${user.experience || "current"} level.`,
    `Protect the ${user.streak || 0}-day streak by training ${user.preferredTime || "consistently"} today and aim at ${summary.nextSuggestedFocus || "your planned focus"}.`,
  ].join("\n");
}

router.get("/messages", auth, (req, res) => {
  try {
    const messages = db.prepare(`
      SELECT id, role, content, createdAt
      FROM coach_messages
      WHERE userId = ?
      ORDER BY datetime(createdAt) ASC, id ASC
      LIMIT 30
    `).all(req.user.id);

    res.json(messages);
  } catch {
    res.status(500).json({ error: "Failed to load coach messages" });
  }
});

router.post("/message", auth, async (req, res) => {
  try {
    const message = String(req.body?.message ?? "").trim();
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const user = db.prepare(`
      SELECT name, goal, experience, streak, consistency, preferredTime, level, xp
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    db.prepare(`
      INSERT INTO coach_messages (userId, role, content)
      VALUES (?, 'user', ?)
    `).run(req.user.id, message);

    const history = db.prepare(`
      SELECT role, content
      FROM coach_messages
      WHERE userId = ?
      ORDER BY datetime(createdAt) DESC, id DESC
      LIMIT 12
    `).all(req.user.id)
      .reverse()
      .map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

    const summary = getWorkoutSummary(req.user.id);
    const recentWorkouts = getRecentWorkoutSessions(req.user.id, 3);
    const nutritionSummary = getNutritionSummary(req.user.id, toLocalDateString());
    const fallbackText = buildFallbackReply(user, message, summary);
    const reply = await requestAnthropicText({
      system: `You are GymBuddy Coach, an expert personal trainer and sports nutritionist.
You know this user completely: Name=${user.name}, Goal=${user.goal}, Experience=${user.experience},
Streak=${user.streak} days, Consistency=${user.consistency}%, Level=${user.level}, Trains ${user.preferredTime}.
Recent training summary: ${summary.weeklySessions}/${summary.weeklyTargetSessions} sessions this week, ${summary.weeklyMinutes} minutes, readiness ${summary.readinessScore}, next suggested focus ${summary.nextSuggestedFocus}.
Today's nutrition summary: ${nutritionSummary.totals.calories}/${nutritionSummary.targets.calories} calories, ${nutritionSummary.totals.proteinGrams}/${nutritionSummary.targets.proteinGrams}g protein, ${nutritionSummary.totals.carbsGrams}/${nutritionSummary.targets.carbsGrams}g carbs, macro balance ${nutritionSummary.macroBalanceScore}/100.
Recent workouts: ${recentWorkouts.map((workout) => `${workout.sessionDate} ${workout.focusArea} ${workout.durationMinutes}m ${workout.intensity}`).join("; ") || "none yet"}.
Rules: Be specific and actionable. Use the user's actual goal in every answer.
Keep responses under 80 words. Use line breaks for readability.
Never say "I cannot" or "consult a doctor" unless genuinely dangerous.
Be like a real gym buddy coach: direct, motivating, knowledgeable.`,
      messages: history,
      maxTokens: 350,
      fallbackText,
    });

    db.prepare(`
      INSERT INTO coach_messages (userId, role, content)
      VALUES (?, 'assistant', ?)
    `).run(req.user.id, reply);

    res.json({ reply });
  } catch {
    res.status(500).json({ error: "Failed to generate coach reply" });
  }
});

export default router;
