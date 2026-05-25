import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { logActivity } from "../utils/activity.js";
import { createNotification, emitToUser } from "../utils/realtime.js";
import { awardXP, XP_REWARDS } from "../utils/xpSystem.js";
import {
  getRecentWorkoutSessions,
  getWorkoutSummary,
  isValidIntensity,
  isValidWorkoutType,
  normalizeWorkoutEntry,
} from "../utils/fitness.js";

const router = express.Router();

function getPartnerIds(userId) {
  return db.prepare(`
    SELECT DISTINCT
      CASE
        WHEN senderId = ? THEN receiverId
        ELSE senderId
      END AS partnerId
    FROM messages
    WHERE senderId = ? OR receiverId = ?
  `).all(userId, userId, userId)
    .map((row) => row.partnerId);
}

function calculateWorkoutXp(durationMinutes, intensity, energy) {
  const intensityBonus = {
    low: 4,
    moderate: 6,
    high: 8,
  };

  return Math.max(
    8,
    Math.min(
      26,
      Math.round(durationMinutes / 12) + (intensityBonus[intensity] ?? 5) + Math.max(0, energy - 3)
    )
  );
}

router.get("/", auth, (req, res) => {
  try {
    res.json({
      summary: getWorkoutSummary(req.user.id),
      recentWorkouts: getRecentWorkoutSessions(req.user.id, 8),
    });
  } catch {
    res.status(500).json({ error: "Failed to load workout data" });
  }
});

router.post("/", auth, (req, res) => {
  try {
    const workout = normalizeWorkoutEntry(req.body);

    if (!isValidWorkoutType(workout.workoutType)) {
      return res.status(400).json({ error: "Select a valid workout type" });
    }

    if (!isValidIntensity(workout.intensity)) {
      return res.status(400).json({ error: "Select a valid intensity" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(workout.sessionDate)) {
      return res.status(400).json({ error: "Provide a valid session date" });
    }

    if (!Number.isFinite(workout.durationMinutes) || workout.durationMinutes < 10 || workout.durationMinutes > 240) {
      return res.status(400).json({ error: "Duration must be between 10 and 240 minutes" });
    }

    if (!Number.isFinite(workout.energy) || workout.energy < 1 || workout.energy > 5) {
      return res.status(400).json({ error: "Energy must be between 1 and 5" });
    }

    if (workout.focusArea.length < 3 || workout.focusArea.length > 80) {
      return res.status(400).json({ error: "Focus area should be 3 to 80 characters" });
    }

    if (workout.notes.length > 500) {
      return res.status(400).json({ error: "Notes should stay under 500 characters" });
    }

    const insert = db.prepare(`
      INSERT INTO workout_sessions (
        userId,
        sessionDate,
        workoutType,
        focusArea,
        durationMinutes,
        intensity,
        energy,
        notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      req.user.id,
      workout.sessionDate,
      workout.workoutType,
      workout.focusArea,
      workout.durationMinutes,
      workout.intensity,
      workout.energy,
      workout.notes || null
    );

    const heuristicXp = calculateWorkoutXp(
      workout.durationMinutes,
      workout.intensity,
      workout.energy
    );
    const xpAward = awardXP(
      req.user.id,
      Math.max(XP_REWARDS.log_workout, heuristicXp),
      "log_workout"
    );

    logActivity(req.user.id, "workout_logged", {
      workoutType: workout.workoutType,
      focusArea: workout.focusArea,
      durationMinutes: workout.durationMinutes,
      intensity: workout.intensity,
      energy: workout.energy,
      xpGained: xpAward.xpGained,
    });

    const actor = db.prepare(`
      SELECT name
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    for (const partnerId of getPartnerIds(req.user.id)) {
      const payload = {
        userId: req.user.id,
        name: actor?.name ?? "Your partner",
        activityType: "workout_logged",
        message: `${actor?.name ?? "Your partner"} completed ${workout.focusArea} 💪`,
      };

      emitToUser(partnerId, "partner-activity", payload);
      createNotification(partnerId, {
        type: "partner_active",
        title: "Your gym buddy trained",
        body: payload.message,
        link: `/chat/${req.user.id}`,
        data: payload,
      });
    }

    const savedWorkout = db.prepare(`
      SELECT
        id,
        userId,
        sessionDate,
        workoutType,
        focusArea,
        durationMinutes,
        intensity,
        energy,
        notes,
        createdAt
      FROM workout_sessions
      WHERE id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      workout: savedWorkout,
      xpGained: xpAward.xpGained,
      level: xpAward.newLevel,
      summary: getWorkoutSummary(req.user.id),
      recentWorkouts: getRecentWorkoutSessions(req.user.id, 8),
    });
  } catch {
    res.status(500).json({ error: "Failed to save workout" });
  }
});

export default router;
