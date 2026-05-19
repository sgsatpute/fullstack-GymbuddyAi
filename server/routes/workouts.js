import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { logActivity } from "../utils/activity.js";
import {
  getRecentWorkoutSessions,
  getWorkoutSummary,
  isValidIntensity,
  isValidWorkoutType,
  normalizeWorkoutEntry,
} from "../utils/fitness.js";

const router = express.Router();

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

    const xpGained = calculateWorkoutXp(
      workout.durationMinutes,
      workout.intensity,
      workout.energy
    );

    const user = db.prepare(`
      SELECT xp, level
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    const nextXp = (user?.xp ?? 0) + xpGained;
    const nextLevel = Math.floor(nextXp / 100) + 1;

    db.prepare(`
      UPDATE users
      SET xp = ?, level = ?
      WHERE id = ?
    `).run(nextXp, nextLevel, req.user.id);

    logActivity(req.user.id, "workout_logged", {
      workoutType: workout.workoutType,
      focusArea: workout.focusArea,
      durationMinutes: workout.durationMinutes,
      intensity: workout.intensity,
      energy: workout.energy,
      xpGained,
    });

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
      xpGained,
      level: nextLevel,
      summary: getWorkoutSummary(req.user.id),
      recentWorkouts: getRecentWorkoutSessions(req.user.id, 8),
    });
  } catch {
    res.status(500).json({ error: "Failed to save workout" });
  }
});

export default router;
