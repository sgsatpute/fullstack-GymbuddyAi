import db from "../db.js";
import { getDailyNutritionTargets } from "./nutrition.js";

export const BADGE_DEFINITIONS = [
  {
    id: "first-step",
    name: "First Step",
    description: "Build your first 1-day streak.",
    icon: "👟",
    category: "streak",
    xpReward: 25,
    condition: "Reach a 1 day streak",
  },
  {
    id: "week-warrior",
    name: "Week Warrior",
    description: "Stay active for 7 straight days.",
    icon: "🔥",
    category: "streak",
    xpReward: 100,
    condition: "Reach a 7 day streak",
  },
  {
    id: "iron-consistency",
    name: "Iron Consistency",
    description: "Hold a 30 day streak.",
    icon: "🧱",
    category: "streak",
    xpReward: 250,
    condition: "Reach a 30 day streak",
  },
  {
    id: "unstoppable",
    name: "Unstoppable",
    description: "Reach a 100 day streak.",
    icon: "⚡",
    category: "streak",
    xpReward: 1000,
    condition: "Reach a 100 day streak",
  },
  {
    id: "first-rep",
    name: "First Rep",
    description: "Log your first workout.",
    icon: "🏋️",
    category: "workout",
    xpReward: 40,
    condition: "Log 1 workout",
  },
  {
    id: "ten-reps",
    name: "Ten Reps",
    description: "Log 10 workouts.",
    icon: "💪",
    category: "workout",
    xpReward: 120,
    condition: "Log 10 workouts",
  },
  {
    id: "century",
    name: "Century",
    description: "Log 100 workouts.",
    icon: "🏆",
    category: "workout",
    xpReward: 600,
    condition: "Log 100 workouts",
  },
  {
    id: "beast-mode",
    name: "Beast Mode",
    description: "Train 5 days in a row.",
    icon: "🐅",
    category: "workout",
    xpReward: 220,
    condition: "Log workouts on 5 consecutive days",
  },
  {
    id: "found-your-tribe",
    name: "Found Your Tribe",
    description: "Make your first real match.",
    icon: "🤝",
    category: "social",
    xpReward: 80,
    condition: "Reach 1 match",
  },
  {
    id: "gym-squad",
    name: "Gym Squad",
    description: "Build a squad of 5 matches.",
    icon: "👥",
    category: "social",
    xpReward: 180,
    condition: "Reach 5 matches",
  },
  {
    id: "motivator",
    name: "Motivator",
    description: "Send 100 messages.",
    icon: "💬",
    category: "social",
    xpReward: 150,
    condition: "Send 100 messages",
  },
  {
    id: "community-pillar",
    name: "Community Pillar",
    description: "Reach 10 or more matches.",
    icon: "🏟️",
    category: "social",
    xpReward: 320,
    condition: "Reach 10 matches",
  },
  {
    id: "fuel-up",
    name: "Fuel Up",
    description: "Log your first meal.",
    icon: "🍎",
    category: "nutrition",
    xpReward: 40,
    condition: "Log 1 nutrition entry",
  },
  {
    id: "clean-eater",
    name: "Clean Eater",
    description: "Hit your protein target for 7 days.",
    icon: "🥗",
    category: "nutrition",
    xpReward: 200,
    condition: "Hit protein goal on 7 days",
  },
  {
    id: "macro-master",
    name: "Macro Master",
    description: "Hit your major nutrition goals for 30 days.",
    icon: "📊",
    category: "nutrition",
    xpReward: 500,
    condition: "Hit calorie and protein goals on 30 days",
  },
  {
    id: "top-100",
    name: "Top 100",
    description: "Enter the top 100 on the XP leaderboard.",
    icon: "🥉",
    category: "leaderboard",
    xpReward: 120,
    condition: "Reach XP rank 100 or better",
  },
  {
    id: "top-10",
    name: "Top 10",
    description: "Break into the top 10.",
    icon: "🥈",
    category: "leaderboard",
    xpReward: 320,
    condition: "Reach XP rank 10 or better",
  },
  {
    id: "champion",
    name: "Champion",
    description: "Take the number one leaderboard spot.",
    icon: "🥇",
    category: "leaderboard",
    xpReward: 1000,
    condition: "Reach XP rank 1",
  },
];

const BADGE_MAP = new Map(BADGE_DEFINITIONS.map((badge) => [badge.id, badge]));

function getUserBaseStats(userId) {
  const user = db.prepare(`
    SELECT id, goal, preferredTime, streak, xp, level, consistency
    FROM users
    WHERE id = ?
  `).get(userId) ?? {
    streak: 0,
    xp: 0,
    level: 1,
    goal: "fitness",
    preferredTime: "morning",
  };

  const workoutCount = db.prepare(`
    SELECT COUNT(*) AS count
    FROM workout_sessions
    WHERE userId = ?
  `).get(userId)?.count ?? 0;

  const messageCount = db.prepare(`
    SELECT COUNT(*) AS count
    FROM messages
    WHERE senderId = ?
  `).get(userId)?.count ?? 0;

  const nutritionCount = db.prepare(`
    SELECT COUNT(*) AS count
    FROM meal_entries
    WHERE userId = ?
  `).get(userId)?.count ?? 0;

  const matchCount = db.prepare(`
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

  return {
    ...user,
    workoutCount,
    messageCount,
    nutritionCount,
    matchCount,
  };
}

function getConsecutiveWorkoutDays(userId) {
  const rows = db.prepare(`
    SELECT DISTINCT sessionDate
    FROM workout_sessions
    WHERE userId = ?
    ORDER BY sessionDate DESC
  `).all(userId);

  let streak = 0;
  let cursor = null;

  for (const row of rows) {
    const date = new Date(`${row.sessionDate}T00:00:00`);
    if (!cursor) {
      streak = 1;
      cursor = date;
      continue;
    }

    const expected = new Date(cursor);
    expected.setDate(expected.getDate() - 1);
    if (row.sessionDate === expected.toISOString().slice(0, 10)) {
      streak += 1;
      cursor = new Date(`${row.sessionDate}T00:00:00`);
      continue;
    }

    break;
  }

  return streak;
}

function getLeaderboardRank(userId) {
  const users = db.prepare(`
    SELECT id
    FROM users
    ORDER BY xp DESC, streak DESC, name ASC
  `).all();

  const index = users.findIndex((row) => row.id === userId);
  return index === -1 ? null : index + 1;
}

function getNutritionCompliance(userId) {
  const user = db.prepare(`
    SELECT goal, experience, preferredTime
    FROM users
    WHERE id = ?
  `).get(userId) ?? {};
  const targets = getDailyNutritionTargets(user);

  const days = db.prepare(`
    SELECT
      mealDate,
      SUM(calories) AS calories,
      SUM(proteinGrams) AS proteinGrams
    FROM meal_entries
    WHERE userId = ?
    GROUP BY mealDate
  `).all(userId);

  let proteinHitDays = 0;
  let allGoalHitDays = 0;

  for (const day of days) {
    const calories = Number(day.calories ?? 0);
    const protein = Number(day.proteinGrams ?? 0);
    const proteinHit = protein >= targets.proteinGrams * 0.9;
    const calorieHit =
      calories >= targets.calories * 0.8 && calories <= targets.calories * 1.15;

    if (proteinHit) {
      proteinHitDays += 1;
    }
    if (proteinHit && calorieHit) {
      allGoalHitDays += 1;
    }
  }

  return {
    proteinHitDays,
    allGoalHitDays,
  };
}

function buildBadgeStatus(userId) {
  const stats = getUserBaseStats(userId);
  const workoutStreak = getConsecutiveWorkoutDays(userId);
  const leaderboardRank = getLeaderboardRank(userId);
  const nutrition = getNutritionCompliance(userId);

  const progress = {
    "first-step": stats.streak,
    "week-warrior": stats.streak,
    "iron-consistency": stats.streak,
    unstoppable: stats.streak,
    "first-rep": stats.workoutCount,
    "ten-reps": stats.workoutCount,
    century: stats.workoutCount,
    "beast-mode": workoutStreak,
    "found-your-tribe": stats.matchCount,
    "gym-squad": stats.matchCount,
    motivator: stats.messageCount,
    "community-pillar": stats.matchCount,
    "fuel-up": stats.nutritionCount,
    "clean-eater": nutrition.proteinHitDays,
    "macro-master": nutrition.allGoalHitDays,
    "top-100": leaderboardRank ? Math.max(0, 101 - leaderboardRank) : 0,
    "top-10": leaderboardRank ? Math.max(0, 11 - leaderboardRank) : 0,
    champion: leaderboardRank === 1 ? 1 : 0,
  };

  const targets = {
    "first-step": 1,
    "week-warrior": 7,
    "iron-consistency": 30,
    unstoppable: 100,
    "first-rep": 1,
    "ten-reps": 10,
    century: 100,
    "beast-mode": 5,
    "found-your-tribe": 1,
    "gym-squad": 5,
    motivator: 100,
    "community-pillar": 10,
    "fuel-up": 1,
    "clean-eater": 7,
    "macro-master": 30,
    "top-100": 1,
    "top-10": 1,
    champion: 1,
  };

  return { stats, progress, targets, leaderboardRank };
}

function syncLegacyBadgeTable(userId, badge) {
  db.prepare(`
    INSERT OR IGNORE INTO badges (userId, badgeType, earnedAt)
    VALUES (?, ?, ?)
  `).run(userId, badge.id, new Date().toISOString());
}

export function getAllBadges() {
  return BADGE_DEFINITIONS;
}

export function awardEligibleBadges(userId) {
  const status = buildBadgeStatus(userId);
  const insertBadge = db.prepare(`
    INSERT OR IGNORE INTO user_badges (
      userId,
      badgeId,
      badgeName,
      category,
      description,
      icon,
      xpReward,
      earnedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const earned = [];
  for (const badge of BADGE_DEFINITIONS) {
    const target = status.targets[badge.id] ?? 1;
    const progress = status.progress[badge.id] ?? 0;
    if (progress < target) {
      continue;
    }

    const earnedAt = new Date().toISOString();
    const result = insertBadge.run(
      userId,
      badge.id,
      badge.name,
      badge.category,
      badge.description,
      badge.icon,
      badge.xpReward,
      earnedAt
    );

    if (result.changes > 0) {
      syncLegacyBadgeTable(userId, badge);
      earned.push({
        ...badge,
        earnedAt,
      });
    }
  }

  return earned;
}

export function getUserBadges(userId) {
  return db.prepare(`
    SELECT
      badgeId AS badgeType,
      badgeId,
      badgeName AS name,
      description,
      icon,
      category,
      xpReward,
      earnedAt
    FROM user_badges
    WHERE userId = ?
    ORDER BY datetime(earnedAt) DESC, id DESC
  `).all(userId);
}

export function getBadgeStatusList(userId) {
  const earnedIds = new Set(getUserBadges(userId).map((badge) => badge.badgeId));
  const status = buildBadgeStatus(userId);

  return BADGE_DEFINITIONS.map((badge) => {
    const target = status.targets[badge.id] ?? 1;
    const progress = status.progress[badge.id] ?? 0;
    return {
      ...badge,
      badgeType: badge.id,
      earned: earnedIds.has(badge.id),
      progress,
      target,
    };
  });
}

export function getBadgeById(badgeId) {
  return BADGE_MAP.get(badgeId) ?? null;
}
