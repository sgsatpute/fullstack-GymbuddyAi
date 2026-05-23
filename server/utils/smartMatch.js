/**
 * Smart Matchmaking Engine
 * 
 * Compatibility scoring based on 5 weighted factors:
 * - Goal compatibility (40%)
 * - Experience level (25%)
 * - Schedule alignment (20%)
 * - Age proximity (10%)
 * - Activity level (5%)
 * 
 * This provides more sophisticated matching than basic filtering.
 */

import db from "../db.js";

const WEIGHTS = {
  goal: 0.40,
  experience: 0.25,
  schedule: 0.20,
  age: 0.10,
  activity: 0.05,
};

/**
 * Calculates goal compatibility score (0-100)
 * Exact match: 100
 * No match: 0
 */
function calculateGoalCompatibility(goal1, goal2) {
  const normalize = (g) => String(g ?? "").trim().toLowerCase();
  const g1 = normalize(goal1);
  const g2 = normalize(goal2);

  if (!g1 || !g2) return 0;
  if (g1 === g2) return 100;

  // Related goals get partial credit
  const goalGroups = [
    ["muscle", "bulking", "gain"],
    ["weight_loss", "fat_loss", "cutting"],
    ["endurance", "cardio"],
    ["flexibility", "mobility", "yoga"],
    ["general", "fitness", "health"],
  ];

  for (const group of goalGroups) {
    const g1InGroup = group.includes(g1);
    const g2InGroup = group.includes(g2);
    if (g1InGroup && g2InGroup) return 60;
  }

  return 0;
}

/**
 * Calculates experience compatibility score (0-100)
 * Exact match: 100
 * Adjacent level: 70
 * Different level: 20
 */
function calculateExperienceCompatibility(exp1, exp2) {
  const normalize = (e) => String(e ?? "").trim().toLowerCase();
  const e1 = normalize(exp1);
  const e2 = normalize(exp2);

  if (!e1 || !e2) return 0;
  if (e1 === e2) return 100;

  const levels = ["beginner", "intermediate", "advanced"];
  const idx1 = levels.indexOf(e1);
  const idx2 = levels.indexOf(e2);

  if (idx1 === -1 || idx2 === -1) return 0;

  const diff = Math.abs(idx1 - idx2);
  if (diff === 1) return 70; // Adjacent levels (e.g., beginner → intermediate)
  return 20; // Non-adjacent (e.g., beginner → advanced)
}

/**
 * Calculates schedule alignment score (0-100)
 * Exact match: 100
 * Overlapping times: 70
 * No overlap: 20
 */
function calculateScheduleCompatibility(time1, time2) {
  const normalize = (t) => String(t ?? "").trim().toLowerCase();
  const t1 = normalize(time1);
  const t2 = normalize(time2);

  if (!t1 || !t2) return 0;
  if (t1 === t2) return 100;

  // Define time overlap rules
  const overlaps = {
    morning: ["morning", "afternoon", "flexible"],
    afternoon: ["morning", "afternoon", "flexible"],
    evening: ["evening", "night", "flexible"],
    night: ["evening", "night", "flexible"],
    flexible: ["morning", "afternoon", "evening", "night", "flexible"],
  };

  const schedule1Overlaps = overlaps[t1] || [];
  if (schedule1Overlaps.includes(t2)) return 70;

  return 20;
}

/**
 * Calculates age proximity score (0-100)
 * Same year: 100
 * Within 3 years: 80
 * Within 6 years: 50
 * Within 10 years: 20
 * >10 years: 0
 */
function calculateAgeCompatibility(age1, age2) {
  if (!Number.isFinite(age1) || !Number.isFinite(age2)) return 0;

  const gap = Math.abs(age1 - age2);
  if (gap === 0) return 100;
  if (gap <= 3) return 80;
  if (gap <= 6) return 50;
  if (gap <= 10) return 20;
  return 0;
}

/**
 * Calculates activity level compatibility (0-100)
 * Based on streak, consistency, and XP level
 * 
 * Determines if users have similar dedication levels
 */
function calculateActivityCompatibility(user1, user2) {
  const getActivityLevel = (user) => {
    const streak = user.streak ?? 0;
    const xp = user.xp ?? 0;
    const consistency = user.consistency ?? 0;

    const streakScore = Math.min(streak / 30, 1) * 40; // Max 40 points
    const xpScore = Math.min(xp / 1000, 1) * 40; // Max 40 points
    const consistencyScore = (consistency ?? 0) * 20; // Max 20 points

    return streakScore + xpScore + consistencyScore;
  };

  const activity1 = getActivityLevel(user1);
  const activity2 = getActivityLevel(user2);

  const gap = Math.abs(activity1 - activity2);
  if (gap <= 10) return 100; // Same activity level
  if (gap <= 25) return 75;
  if (gap <= 50) return 50;
  if (gap <= 75) return 25;
  return 0;
}

/**
 * Main compatibility scoring function
 * Returns weighted score (0-100)
 */
export function calculateCompatibilityScore(user1, user2) {
  const goalScore = calculateGoalCompatibility(user1.goal, user2.goal);
  const experienceScore = calculateExperienceCompatibility(
    user1.experience,
    user2.experience
  );
  const scheduleScore = calculateScheduleCompatibility(
    user1.preferredTime,
    user2.preferredTime
  );
  const ageScore = calculateAgeCompatibility(user1.age, user2.age);
  const activityScore = calculateActivityCompatibility(user1, user2);

  const totalScore =
    goalScore * WEIGHTS.goal +
    experienceScore * WEIGHTS.experience +
    scheduleScore * WEIGHTS.schedule +
    ageScore * WEIGHTS.age +
    activityScore * WEIGHTS.activity;

  return Math.round(totalScore);
}

/**
 * Determines match tier based on compatibility score
 */
function getMatchTier(score) {
  if (score >= 85) return "Elite match";
  if (score >= 72) return "Strong match";
  if (score >= 60) return "Good fit";
  if (score >= 50) return "Potential fit";
  return "Not compatible";
}

/**
 * Ranks matches by compatibility and returns top N
 * Applies filtering to exclude blocked users, incomplete profiles
 */
export function rankMatches(myId, limit = 20) {
  const blockedUserIds = getBlockedUserIds(myId);

  const me = db
    .prepare(
      `
    SELECT id, name, age, gym, city, goal, experience, preferredTime, 
           streak, consistency, xp, level, bio, avatarUrl, 
           locationLabel, locationLat, locationLng
    FROM users
    WHERE id = ?
  `
    )
    .get(myId);

  if (!me) return { error: "User not found", matches: [] };

  const required = ["age", "gym", "goal", "experience", "preferredTime"];
  const incomplete = required.some(
    (key) => me[key] === null || me[key] === undefined || me[key] === ""
  );

  if (incomplete) {
    return { error: "PROFILE_INCOMPLETE", matches: [] };
  }

  const placeholders = blockedUserIds.map(() => "?").join(", ");
  const othersQuery = `
    SELECT id, name, age, gym, city, goal, experience, preferredTime, 
           streak, consistency, xp, level, bio, avatarUrl, 
           locationLabel, locationLat, locationLng
    FROM users
    WHERE id != ?
      ${blockedUserIds.length > 0 ? `AND id NOT IN (${placeholders})` : ""}
      AND age IS NOT NULL
      AND gym IS NOT NULL
      AND goal IS NOT NULL
      AND experience IS NOT NULL
      AND preferredTime IS NOT NULL
  `;

  const others = db.prepare(othersQuery).all(myId, ...blockedUserIds);

  const matches = others
    .map((other) => {
      const compatibilityScore = calculateCompatibilityScore(me, other);
      const tier = getMatchTier(compatibilityScore);
      const canChat = compatibilityScore >= 60;

      return {
        id: other.id,
        name: other.name,
        age: other.age,
        bio: other.bio,
        avatarUrl: other.avatarUrl,
        goal: other.goal,
        experience: other.experience,
        preferredTime: other.preferredTime,
        gym: other.gym,
        city: other.city,
        level: other.level,
        xp: other.xp,
        streak: other.streak,
        compatibility: compatibilityScore,
        tier,
        canChat,
        locationLabel: other.locationLabel,
        locationLat: other.locationLat,
        locationLng: other.locationLng,
      };
    })
    .sort((a, b) => b.compatibility - a.compatibility)
    .slice(0, limit);

  return { matches };
}

/**
 * Gets match breakdown for detailed view
 * Shows component scores and reasons
 */
export function getMatchBreakdown(userId1, userId2) {
  const user1 = db
    .prepare(
      `
    SELECT id, name, age, gym, city, goal, experience, preferredTime,
           streak, consistency, xp, level
    FROM users
    WHERE id = ?
  `
    )
    .get(userId1);

  const user2 = db
    .prepare(
      `
    SELECT id, name, age, gym, city, goal, experience, preferredTime,
           streak, consistency, xp, level
    FROM users
    WHERE id = ?
  `
    )
    .get(userId2);

  if (!user1 || !user2) return null;

  const goalScore = calculateGoalCompatibility(user1.goal, user2.goal);
  const experienceScore = calculateExperienceCompatibility(
    user1.experience,
    user2.experience
  );
  const scheduleScore = calculateScheduleCompatibility(
    user1.preferredTime,
    user2.preferredTime
  );
  const ageScore = calculateAgeCompatibility(user1.age, user2.age);
  const activityScore = calculateActivityCompatibility(user1, user2);

  const totalScore = calculateCompatibilityScore(user1, user2);
  const tier = getMatchTier(totalScore);

  const reasons = [];
  if (goalScore === 100) reasons.push("Identical fitness goals");
  else if (goalScore >= 60) reasons.push("Compatible fitness goals");

  if (experienceScore === 100) reasons.push("Same experience level");
  else if (experienceScore >= 70) reasons.push("Compatible experience");

  if (scheduleScore === 100) reasons.push("Perfect schedule alignment");
  else if (scheduleScore >= 70) reasons.push("Good schedule overlap");

  if (ageScore >= 80) reasons.push("Very similar age");
  else if (ageScore >= 50) reasons.push("Similar age range");

  if (activityScore >= 75) reasons.push("Similar dedication levels");

  return {
    totalScore,
    tier,
    reasons,
    breakdown: {
      goal: {
        score: goalScore,
        weight: WEIGHTS.goal,
        weighted: Math.round(goalScore * WEIGHTS.goal),
      },
      experience: {
        score: experienceScore,
        weight: WEIGHTS.experience,
        weighted: Math.round(experienceScore * WEIGHTS.experience),
      },
      schedule: {
        score: scheduleScore,
        weight: WEIGHTS.schedule,
        weighted: Math.round(scheduleScore * WEIGHTS.schedule),
      },
      age: {
        score: ageScore,
        weight: WEIGHTS.age,
        weighted: Math.round(ageScore * WEIGHTS.age),
      },
      activity: {
        score: activityScore,
        weight: WEIGHTS.activity,
        weighted: Math.round(activityScore * WEIGHTS.activity),
      },
    },
  };
}

/**
 * Helper function to get blocked user IDs
 * (Imported from relationships.js but defined here for completeness)
 */
function getBlockedUserIds(userId) {
  try {
    const result = db
      .prepare(
        `
      SELECT blockedUserId FROM blocked_users
      WHERE userId = ?
    `
      )
      .all(userId);
    return result.map((row) => row.blockedUserId);
  } catch {
    return [];
  }
}

/**
 * Track user match activity for analytics
 */
export function logMatchInteraction(viewerId, viewedId, action) {
  try {
    const timestamp = new Date().toISOString();
    db.prepare(
      `
      INSERT OR IGNORE INTO match_interactions 
        (viewerId, viewedId, action, createdAt)
      VALUES (?, ?, ?, ?)
    `
    ).run(viewerId, viewedId, action, timestamp);
  } catch (err) {
    console.error("Failed to log match interaction:", err);
  }
}

/**
 * Gets user's match history (viewed/liked/passed)
 */
export function getUserMatchHistory(userId, action = null, limit = 50) {
  let query = `
    SELECT viewedId, action, createdAt
    FROM match_interactions
    WHERE viewerId = ?
  `;

  if (action) {
    query += ` AND action = ?`;
  }

  query += ` ORDER BY createdAt DESC LIMIT ?`;

  const params = action ? [userId, action, limit] : [userId, limit];
  return db.prepare(query).all(...params);
}

export default {
  calculateCompatibilityScore,
  rankMatches,
  getMatchBreakdown,
  logMatchInteraction,
  getUserMatchHistory,
  WEIGHTS,
};
