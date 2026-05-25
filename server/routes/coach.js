import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import anthropicCoach, { requestAnthropicText } from "../utils/anthropic.js";
import { buildUserContext } from "../utils/coachMemory.js";
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
  try {
    const context = buildUserContext(req.user.id);
    const fallbackText =
      context.summary.readinessScore >= 70
        ? "Momentum looks solid today. Aim for one focused session and finish with a clean cooldown."
        : "Today is about preserving the habit. Keep the workout simple and leave with energy still in the tank.";

    const message = await anthropicCoach.requestText({
      system: anthropicCoach.generateSystemPrompt(context.userProfile, context.userStats),
      messages: [
        {
          role: "user",
          content: "Give me one short daily training recommendation for today.",
        },
      ],
      maxTokens: 160,
      fallbackText,
    });

    return res.json({ message });
  } catch {
    return res.json({
      message: "Recovery is still progress. Keep the habit alive with light movement today.",
    });
  }
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
