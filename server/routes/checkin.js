import express from "express";
import anthropicCoach from "../utils/anthropic.js";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { progressAnalysisLimiter } from "../middleware/rateLimit.js";
import { logActivity } from "../utils/activity.js";
import { buildUserContext } from "../utils/coachMemory.js";
import { updateStreak } from "../utils/streakSystem.js";
import { awardXP } from "../utils/xpSystem.js";

const router = express.Router();

function toLocalDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function getDateFromLocalString(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function getCurrentWeekDates() {
  const today = new Date();
  const localDay = today.getDay();
  const mondayOffset = localDay === 0 ? -6 : 1 - localDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toLocalDateString(date);
  });
}

function getLast90DayDate() {
  const date = new Date();
  date.setDate(date.getDate() - 90);
  return toLocalDateString(date);
}

function clampScale(value, min = 1, max = 5, fallback = 3) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function clampNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

router.post("/checkin", auth, (req, res) => {
  try {
    const userId = req.user.id;
    const today = toLocalDateString();
    const existingCheckin = db.prepare(`
      SELECT id
      FROM checkins
      WHERE userId = ? AND checkInDate = ?
    `).get(userId, today);

    const user = db.prepare(`
      SELECT streak, xp, level
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (existingCheckin) {
      return res.json({
        alreadyCheckedIn: true,
        streak: Number(user.streak ?? 0),
        xp: Number(user.xp ?? 0),
        level: Number(user.level ?? 1),
        xpGained: 0,
        newlyEarnedBadges: [],
      });
    }

    const streakResult = updateStreak(userId, today);
    const baseAward = awardXP(userId, 15, "checkin");
    let bonusAward = { xpGained: 0, badgesEarned: [] };
    if (streakResult.streak > 0 && streakResult.streak % 7 === 0) {
      bonusAward = awardXP(userId, 500, "7day_streak_bonus");
    }

    const totalXpAwarded = baseAward.xpGained + bonusAward.xpGained;
    db.prepare(`
      INSERT INTO checkins (userId, checkInDate, xpAwarded, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(userId, today, totalXpAwarded, new Date().toISOString());

    const refreshed = db.prepare(`
      SELECT streak, consistency, xp, level
      FROM users
      WHERE id = ?
    `).get(userId);

    logActivity(userId, "checkin", {
      date: today,
      streak: streakResult.streak,
      usedFreeze: streakResult.usedFreeze,
      xpGained: totalXpAwarded,
    });

    return res.json({
      success: true,
      alreadyCheckedIn: false,
      streak: Number(refreshed?.streak ?? streakResult.streak),
      consistency: Number(refreshed?.consistency ?? 0),
      xp: Number(refreshed?.xp ?? 0),
      level: Number(refreshed?.level ?? 1),
      xpGained: totalXpAwarded,
      newlyEarnedBadges: [
        ...(baseAward.badgesEarned ?? []),
        ...(bonusAward.badgesEarned ?? []),
      ],
      usedFreeze: streakResult.usedFreeze,
    });
  } catch {
    return res.status(500).json({ error: "Failed to complete check-in" });
  }
});

router.get("/checkins/week", auth, (req, res) => {
  try {
    const dates = getCurrentWeekDates();
    const placeholders = dates.map(() => "?").join(", ");
    const rows = db.prepare(`
      SELECT checkInDate
      FROM checkins
      WHERE userId = ? AND checkInDate IN (${placeholders})
    `).all(req.user.id, ...dates);

    const checkedDates = new Set(rows.map((row) => row.checkInDate));
    return res.json({
      days: dates.map((date) => checkedDates.has(date)),
      dates,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch weekly check-ins" });
  }
});

router.post("/checkin/body-metrics", auth, (req, res) => {
  try {
    const payload = {
      weight: clampNumber(req.body?.weight),
      bodyFat: req.body?.bodyFat === undefined ? null : clampNumber(req.body?.bodyFat),
      chest: req.body?.chest === undefined ? null : clampNumber(req.body?.chest),
      waist: req.body?.waist === undefined ? null : clampNumber(req.body?.waist),
      hips: req.body?.hips === undefined ? null : clampNumber(req.body?.hips),
      arms: req.body?.arms === undefined ? null : clampNumber(req.body?.arms),
      mood: clampScale(req.body?.mood),
      energy: clampScale(req.body?.energy),
      sleepHours: clampNumber(req.body?.sleepHours, 7),
      waterGlasses: Math.max(0, Math.round(clampNumber(req.body?.waterGlasses, 6))),
      loggedAt: /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.date ?? ""))
        ? String(req.body.date)
        : toLocalDateString(),
    };

    if (!payload.weight || payload.weight <= 0) {
      return res.status(400).json({ error: "Weight is required" });
    }

    db.prepare(`
      INSERT INTO body_metrics (
        userId,
        weight,
        bodyFat,
        chest,
        waist,
        hips,
        arms,
        mood,
        energy,
        sleepHours,
        waterGlasses,
        loggedAt,
        createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      payload.weight,
      payload.bodyFat,
      payload.chest,
      payload.waist,
      payload.hips,
      payload.arms,
      payload.mood,
      payload.energy,
      payload.sleepHours,
      payload.waterGlasses,
      payload.loggedAt,
      new Date().toISOString()
    );

    return res.status(201).json({ success: true, ...payload });
  } catch {
    return res.status(500).json({ error: "Failed to save body metrics" });
  }
});

router.get("/checkin/body-metrics/history", auth, (req, res) => {
  try {
    const history = db.prepare(`
      SELECT *
      FROM body_metrics
      WHERE userId = ? AND loggedAt >= ?
      ORDER BY loggedAt ASC, id ASC
    `).all(req.user.id, getLast90DayDate());

    return res.json(history);
  } catch {
    return res.status(500).json({ error: "Failed to load body metrics history" });
  }
});

router.get("/checkin/body-metrics/progress", auth, progressAnalysisLimiter, async (req, res) => {
  try {
    const firstEntry = db.prepare(`
      SELECT *
      FROM body_metrics
      WHERE userId = ?
      ORDER BY loggedAt ASC, id ASC
      LIMIT 1
    `).get(req.user.id);

    const latestEntry = db.prepare(`
      SELECT *
      FROM body_metrics
      WHERE userId = ?
      ORDER BY loggedAt DESC, id DESC
      LIMIT 1
    `).get(req.user.id);

    if (!firstEntry || !latestEntry || firstEntry.id === latestEntry.id) {
      return res.json({
        summary: "Log at least two body metric entries to unlock progress analysis.",
        firstEntry: firstEntry ?? null,
        latestEntry: latestEntry ?? null,
      });
    }

    const context = buildUserContext(req.user.id);

    const fallbackSummary = `${context.userProfile.name} moved from ${firstEntry.weight} kg to ${latestEntry.weight} kg. Keep watching weekly trend lines instead of day-to-day noise.`;
    const summary = await anthropicCoach.requestText({
      system:
        "You are a fitness progress coach. Keep responses under 120 words and end with one actionable next step.",
      messages: [
        {
          role: "user",
          content: `Compare these body metric entries and summarize progress:
First: ${JSON.stringify(firstEntry)}
Latest: ${JSON.stringify(latestEntry)}
User goal: ${context.userProfile.goal}`,
        },
      ],
      maxTokens: 240,
      fallbackText: fallbackSummary,
    });

    return res.json({
      firstEntry,
      latestEntry,
      deltas: {
        weight: Number(latestEntry.weight) - Number(firstEntry.weight),
        bodyFat:
          latestEntry.bodyFat !== null && firstEntry.bodyFat !== null
            ? Number(latestEntry.bodyFat) - Number(firstEntry.bodyFat)
            : null,
      },
      summary,
    });
  } catch {
    return res.status(500).json({ error: "Failed to build body progress summary" });
  }
});

export default router;
