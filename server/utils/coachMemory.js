import db from "../db.js";
import { getRecentWorkoutSessions, getWorkoutSummary } from "./fitness.js";

function getMatchCount(userId) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM (
      SELECT DISTINCT
        CASE
          WHEN senderId = ? THEN receiverId
          ELSE senderId
        END AS partnerId
      FROM messages
      WHERE senderId = ? OR receiverId = ?
    )
  `).get(userId, userId, userId)?.count ?? 0;
}

function getLeaderboardRank(userId) {
  const rows = db.prepare(`
    SELECT id
    FROM users
    ORDER BY xp DESC, streak DESC, name ASC
  `).all();

  const index = rows.findIndex((row) => row.id === userId);
  return index === -1 ? null : index + 1;
}

export function buildUserContext(userId) {
  const profile = db.prepare(`
    SELECT
      id,
      name,
      age,
      city,
      goal,
      experience,
      preferredTime,
      gym,
      locationLabel,
      streak,
      xp,
      level,
      consistency,
      lastActiveAt
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!profile) {
    throw new Error("User not found");
  }

  const workoutsThisMonth = db.prepare(`
    SELECT COUNT(*) AS count
    FROM workout_sessions
    WHERE userId = ? AND sessionDate >= date('now', '-30 day')
  `).get(userId)?.count ?? 0;

  const summary = getWorkoutSummary(userId);
  const recentWorkouts = getRecentWorkoutSessions(userId, 5);
  const matchesCount = getMatchCount(userId);
  const leaderboardRank = getLeaderboardRank(userId);

  return {
    userProfile: {
      ...profile,
      daysAvailable: Math.max(3, Math.min(6, summary.weeklyTargetSessions)),
      workoutsThisMonth,
    },
    userStats: {
      streak: profile.streak ?? 0,
      workoutsThisMonth,
      leaderboardRank,
      matchesCount,
      readinessScore: summary.readinessScore,
      weeklySessions: summary.weeklySessions,
      weeklyMinutes: summary.weeklyMinutes,
      nextSuggestedFocus: summary.nextSuggestedFocus,
      lastActivity: profile.lastActiveAt ?? null,
    },
    recentWorkouts,
    summary,
    cleanSummary: `${profile.name} is a ${profile.age ?? "unknown age"} year old ${profile.experience} athlete in ${profile.city || "their city"} training for ${profile.goal}. Preferred time: ${profile.preferredTime}. Gym: ${profile.locationLabel || profile.gym || "not set"}. Current streak: ${profile.streak ?? 0} days. Matches: ${matchesCount}. Workouts this month: ${workoutsThisMonth}. Weekly sessions: ${summary.weeklySessions}/${summary.weeklyTargetSessions}. Next focus: ${summary.nextSuggestedFocus}.`,
  };
}
