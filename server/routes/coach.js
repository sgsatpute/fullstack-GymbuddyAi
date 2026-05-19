import { execFile } from "child_process";
import express from "express";
import path from "path";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { requestAnthropicText } from "../utils/anthropic.js";
import {
  buildCelebrationMoment,
  buildCoachPlan,
  buildDailyMissions,
  buildInsightCards,
  buildNutritionPlan,
  buildQuickPrompts,
  buildStreakRescuePlan,
  buildWorkoutMixItems,
  getCoachNoteFallback,
  getNutritionFocus,
  getRecentCoachActivity,
  getRecentWorkoutSessions,
  getRecoveryFocus,
  getWorkoutSummary,
} from "../utils/fitness.js";

const router = express.Router();

router.get("/today", auth, async (req, res) => {
  const user = db.prepare(`
    SELECT streak, consistency, goal
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const engagement = user.streak >= 5 ? "high" : user.streak >= 2 ? "medium" : "low";
  const goalMap = { muscle: 0, fatloss: 1, fitness: 2 };
  const engMap = { low: 0, medium: 1, high: 2 };

  const features = [
    user.streak ?? 0,
    user.consistency ?? 0,
    goalMap[user.goal] ?? 2,
    engMap[engagement],
  ];

  const scriptDir = path.resolve(process.cwd(), "server", "ml");
  const script = path.join(scriptDir, "coach_predict.py");

  execFile("python", [script, JSON.stringify(features)], { cwd: scriptDir }, (error, stdout) => {
    if (error) {
      return res.json({
        message: "Recovery is still progress. Keep the habit alive with light movement today.",
      });
    }

    const actionMap = {
      train_hard: "Your momentum is strong today. Go for a focused strength session.",
      train_light: "Keep the streak alive with a lighter workout and crisp form.",
      cardio: "A cardio-focused session is a great fit for today's energy.",
      walk: "Active recovery works today. A solid walk still counts.",
      mobility: "Mobility and stretching will help you stay consistent long-term.",
      rest: "Recovery day. Rest well so you can come back stronger tomorrow.",
    };

    res.json({
      message:
        actionMap[stdout.trim()] ??
        "Stay consistent today, even if the session is short.",
    });
  });
});

router.get("/plan", auth, async (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, name, goal, experience, preferredTime, streak, consistency, level, xp
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const summary = getWorkoutSummary(req.user.id);
    const recentWorkouts = getRecentWorkoutSessions(req.user.id, 4);
    const plan = buildCoachPlan(user, summary);
    const activityFeed = getRecentCoachActivity(req.user.id, 8);
    const dailyMissions = buildDailyMissions(user, summary);
    const insightCards = buildInsightCards(user, summary);
    const nutritionPlan = buildNutritionPlan(user, summary);
    const streakRescue = buildStreakRescuePlan(user, summary);
    const quickPrompts = buildQuickPrompts(user, summary);
    const workoutMix = buildWorkoutMixItems(summary);
    const celebrationMoment = buildCelebrationMoment(user, summary, activityFeed);
    const fallbackCoachNote = getCoachNoteFallback(user, summary);

    const coachNote = await requestAnthropicText({
      system: "You are an expert strength and conditioning coach. Write short, practical plan summaries. Keep them under 90 words.",
      messages: [
        {
          role: "user",
          content: `User: ${user.name}. Goal: ${user.goal}. Experience: ${user.experience}. Preferred time: ${user.preferredTime}. Streak: ${user.streak}. Weekly sessions: ${summary.weeklySessions}/${summary.weeklyTargetSessions}. Weekly minutes: ${summary.weeklyMinutes}. Readiness: ${summary.readinessScore}. Next focus: ${summary.nextSuggestedFocus}. Recent workouts: ${recentWorkouts.map((workout) => `${workout.sessionDate} ${workout.focusArea} ${workout.durationMinutes}m ${workout.intensity}`).join("; ") || "none yet"}. Give a coach note for the upcoming week.`,
        },
      ],
      maxTokens: 180,
      fallbackText: fallbackCoachNote,
    });

    res.json({
      generatedAt: new Date().toISOString(),
      model: process.env.ANTHROPIC_API_KEY ? "anthropic+heuristics" : "heuristics",
      summary,
      plan,
      coachNote,
      nutritionFocus: getNutritionFocus(user.goal),
      recoveryFocus: getRecoveryFocus(summary),
      nutritionPlan,
      dailyMissions,
      insightCards,
      streakRescue,
      quickPrompts,
      activityFeed,
      workoutMix,
      celebrationMoment,
    });
  } catch {
    res.status(500).json({ error: "Failed to build coach plan" });
  }
});

export default router;
