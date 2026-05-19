import db from "../db.js";
import { logActivity } from "./activity.js";

export const BADGE_METADATA = {
  streak_3: {
    badgeType: "streak_3",
    name: "Warming Up",
    description: "Build a 3-day streak.",
    color: "#f97316",
    icon: "Flame",
  },
  streak_7: {
    badgeType: "streak_7",
    name: "Week Warrior",
    description: "Train for 7 days in a row.",
    color: "#fb7185",
    icon: "Flame",
  },
  streak_30: {
    badgeType: "streak_30",
    name: "Monthly Legend",
    description: "Hold a 30-day streak.",
    color: "#7c3aed",
    icon: "Calendar",
  },
  streak_100: {
    badgeType: "streak_100",
    name: "Unstoppable",
    description: "Reach a 100-day streak.",
    color: "#facc15",
    icon: "Trophy",
  },
  consistent_pro: {
    badgeType: "consistent_pro",
    name: "Consistency Pro",
    description: "Hit 90% consistency.",
    color: "#22c55e",
    icon: "TrendingUp",
  },
  first_checkin: {
    badgeType: "first_checkin",
    name: "First Step",
    description: "Complete your first workout check-in.",
    color: "#38bdf8",
    icon: "Footprints",
  },
  first_buddy: {
    badgeType: "first_buddy",
    name: "Found My Buddy",
    description: "Send your first chat message.",
    color: "#8b5cf6",
    icon: "MessageCircle",
  },
  early_bird: {
    badgeType: "early_bird",
    name: "Early Bird",
    description: "Check in before 9am five times.",
    color: "#f59e0b",
    icon: "Sunrise",
  },
  night_owl: {
    badgeType: "night_owl",
    name: "Night Owl",
    description: "Check in after 9pm five times.",
    color: "#60a5fa",
    icon: "Moon",
  },
  social: {
    badgeType: "social",
    name: "Social Butterfly",
    description: "Connect with three gym buddies.",
    color: "#10b981",
    icon: "Users",
  },
};

function getCheckinCount(userId) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM checkins
    WHERE userId = ?
  `).get(userId)?.count ?? 0;
}

function getEarlyBirdCount(userId) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM checkins
    WHERE userId = ? AND time(createdAt) < '09:00:00'
  `).get(userId)?.count ?? 0;
}

function getNightOwlCount(userId) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM checkins
    WHERE userId = ? AND time(createdAt) >= '21:00:00'
  `).get(userId)?.count ?? 0;
}

function getMessagesSentCount(userId) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM messages
    WHERE senderId = ?
  `).get(userId)?.count ?? 0;
}

function getSocialConnectionsCount(userId) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM (
      SELECT CASE
        WHEN senderId = ? THEN receiverId
        ELSE senderId
      END AS otherUserId
      FROM messages
      WHERE senderId = ? OR receiverId = ?
      GROUP BY otherUserId
    )
  `).get(userId, userId, userId)?.count ?? 0;
}

export function getBadgeStats(userId) {
  const user = db.prepare(`
    SELECT streak, consistency, level
    FROM users
    WHERE id = ?
  `).get(userId);

  return {
    streak: user?.streak ?? 0,
    consistency: user?.consistency ?? 0,
    level: user?.level ?? 1,
    totalCheckins: getCheckinCount(userId),
    messagesSent: getMessagesSentCount(userId),
    earlyBirdCheckins: getEarlyBirdCount(userId),
    nightOwlCheckins: getNightOwlCount(userId),
    socialConnections: getSocialConnectionsCount(userId),
  };
}

export function awardEligibleBadges(userId) {
  const stats = getBadgeStats(userId);
  const unlocks = [];

  if (stats.streak >= 3) unlocks.push("streak_3");
  if (stats.streak >= 7) unlocks.push("streak_7");
  if (stats.streak >= 30) unlocks.push("streak_30");
  if (stats.streak >= 100) unlocks.push("streak_100");
  if (stats.consistency >= 90) unlocks.push("consistent_pro");
  if (stats.totalCheckins >= 1) unlocks.push("first_checkin");
  if (stats.messagesSent >= 1) unlocks.push("first_buddy");
  if (stats.earlyBirdCheckins >= 5) unlocks.push("early_bird");
  if (stats.nightOwlCheckins >= 5) unlocks.push("night_owl");
  if (stats.socialConnections >= 3) unlocks.push("social");

  const insertBadge = db.prepare(`
    INSERT OR IGNORE INTO badges (userId, badgeType)
    VALUES (?, ?)
  `);

  const newlyEarnedBadges = [];
  for (const badgeType of unlocks) {
    const result = insertBadge.run(userId, badgeType);
    if (result.changes > 0) {
      newlyEarnedBadges.push(badgeType);
      logActivity(userId, "badge_earned", { badgeType });
    }
  }

  return newlyEarnedBadges;
}

export function getUserBadges(userId) {
  const rows = db.prepare(`
    SELECT badgeType, earnedAt
    FROM badges
    WHERE userId = ?
    ORDER BY datetime(earnedAt) DESC, id DESC
  `).all(userId);

  return rows.map((row) => ({
    badgeType: row.badgeType,
    earnedAt: row.earnedAt,
    ...BADGE_METADATA[row.badgeType],
  }));
}
