import db from "../db.js";
import { getBlockedUserIds as getRelationshipBlockedUserIds } from "./relationships.js";
import { getUserActivityScore } from "./activityTracker.js";

export const WEIGHTS = {
  goal: 0.4,
  experience: 0.25,
  schedule: 0.2,
  age: 0.1,
  activity: 0.05,
};

const EXPERIENCE_LEVELS = ["beginner", "intermediate", "advanced"];
const SCHEDULE_LEVELS = ["morning", "afternoon", "evening", "night"];

function normalizeGoal(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  const aliases = {
    bulking: "muscle",
    gain: "muscle",
    muscle_gain: "muscle",
    fat_loss: "weight_loss",
    cutting: "weight_loss",
    cardio: "endurance",
    mobility: "flexibility",
    yoga: "flexibility",
    health: "fitness",
    general: "fitness",
  };

  return aliases[raw] ?? raw;
}

function normalizeExperience(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeSchedule(value) {
  return String(value ?? "").trim().toLowerCase();
}

function calculateGoalCompatibility(goal1, goal2) {
  const g1 = normalizeGoal(goal1);
  const g2 = normalizeGoal(goal2);

  if (!g1 || !g2) {
    return 0;
  }

  if (g1 === g2) {
    return 100;
  }

  if (g1 === "flexibility" || g2 === "flexibility") {
    return 40;
  }

  const matrix = {
    "endurance|muscle": 60,
    "endurance|weight_loss": 80,
    "muscle|weight_loss": 50,
  };

  return matrix[[g1, g2].sort().join("|")] ?? 45;
}

function calculateExperienceCompatibility(exp1, exp2) {
  const left = EXPERIENCE_LEVELS.indexOf(normalizeExperience(exp1));
  const right = EXPERIENCE_LEVELS.indexOf(normalizeExperience(exp2));

  if (left === -1 || right === -1) {
    return 0;
  }

  const difference = Math.abs(left - right);
  if (difference === 0) {
    return 100;
  }
  if (difference === 1) {
    return 70;
  }
  return 30;
}

function calculateScheduleCompatibility(time1, time2) {
  const left = normalizeSchedule(time1);
  const right = normalizeSchedule(time2);

  if (!left || !right) {
    return 0;
  }

  if (left === right) {
    return 100;
  }

  if (left === "flexible" || right === "flexible") {
    return 40;
  }

  const leftIndex = SCHEDULE_LEVELS.indexOf(left);
  const rightIndex = SCHEDULE_LEVELS.indexOf(right);
  if (leftIndex === -1 || rightIndex === -1) {
    return 0;
  }

  return Math.abs(leftIndex - rightIndex) === 1 ? 40 : 0;
}

function calculateAgeCompatibility(age1, age2) {
  if (!Number.isFinite(Number(age1)) || !Number.isFinite(Number(age2))) {
    return 0;
  }

  const difference = Math.abs(Number(age1) - Number(age2));
  if (difference <= 3) {
    return 100;
  }
  if (difference <= 5) {
    return 80;
  }
  if (difference <= 10) {
    return 60;
  }
  return 30;
}

function ensureActivitySnapshot(user) {
  if (!user?.id) {
    return {
      ...user,
      activitySnapshot: { activeLast7Days: false, score: 0 },
    };
  }

  if (user.activitySnapshot) {
    return user;
  }

  return {
    ...user,
    activitySnapshot: getUserActivityScore(user.id),
  };
}

function calculateActivityCompatibility(user1, user2) {
  const left = ensureActivitySnapshot(user1).activitySnapshot;
  const right = ensureActivitySnapshot(user2).activitySnapshot;

  if (left.activeLast7Days && right.activeLast7Days) {
    return 100;
  }
  if (left.activeLast7Days || right.activeLast7Days) {
    return 50;
  }
  return 0;
}

function getMatchLabel(score) {
  if (score >= 90) {
    return "Perfect";
  }
  if (score >= 75) {
    return "Great";
  }
  if (score >= 60) {
    return "Good";
  }
  if (score >= 45) {
    return "Possible";
  }
  return "Low";
}

function buildCompatibilityReasons(user1, user2, scores) {
  const reasons = [];

  if (scores.goal === 100) {
    reasons.push("Same fitness goal");
  } else if (scores.goal >= 80) {
    reasons.push("Strong goal alignment");
  }

  if (scores.schedule === 100) {
    reasons.push("Same schedule");
  } else if (scores.schedule >= 40) {
    reasons.push("Similar schedule");
  }

  if (scores.experience >= 70) {
    reasons.push("Similar experience");
  }

  if (scores.age >= 80) {
    reasons.push("Close age range");
  }

  if (scores.activity === 100) {
    reasons.push("Both active this week");
  } else if (scores.activity === 50) {
    reasons.push("One of you has fresh momentum");
  }

  if (
    String(user1.city ?? "").trim() &&
    String(user1.city ?? "").trim().toLowerCase() ===
      String(user2.city ?? "").trim().toLowerCase()
  ) {
    reasons.push("Same city");
  }

  return reasons.slice(0, 4);
}

function getRequiredProfileFields(user) {
  return ["age", "gym", "goal", "experience", "preferredTime"].filter(
    (field) => user?.[field] === null || user?.[field] === undefined || user?.[field] === ""
  );
}

function haveUsersAlreadyMatched(userId1, userId2) {
  const message = db.prepare(`
    SELECT id
    FROM messages
    WHERE
      (senderId = ? AND receiverId = ?)
      OR
      (senderId = ? AND receiverId = ?)
    LIMIT 1
  `).get(userId1, userId2, userId2, userId1);

  if (message) {
    return true;
  }

  const matched = db.prepare(`
    SELECT id
    FROM match_feedback
    WHERE
      ((userA = ? AND userB = ?) OR (userA = ? AND userB = ?))
      AND label = 1
    LIMIT 1
  `).get(userId1, userId2, userId2, userId1);

  return Boolean(matched);
}

function loadRankCandidates(currentUserId) {
  const blockedUserIds = getRelationshipBlockedUserIds(currentUserId);
  const currentUser = db.prepare(`
    SELECT
      id,
      name,
      age,
      gym,
      city,
      goal,
      experience,
      preferredTime,
      streak,
      consistency,
      xp,
      level,
      bio,
      avatarUrl,
      locationLabel,
      locationLat,
      locationLng,
      lastActiveAt
    FROM users
    WHERE id = ?
  `).get(currentUserId);

  if (!currentUser) {
    return { error: "USER_NOT_FOUND", currentUser: null, candidates: [] };
  }

  const placeholders = blockedUserIds.map(() => "?").join(", ");
  const candidates = db.prepare(`
    SELECT
      id,
      name,
      age,
      gym,
      city,
      goal,
      experience,
      preferredTime,
      streak,
      consistency,
      xp,
      level,
      bio,
      avatarUrl,
      locationLabel,
      locationLat,
      locationLng,
      lastActiveAt
    FROM users
    WHERE id != ?
      ${blockedUserIds.length ? `AND id NOT IN (${placeholders})` : ""}
  `).all(currentUserId, ...blockedUserIds);

  return { currentUser, candidates };
}

export function calculateCompatibility(userA, userB) {
  const left = ensureActivitySnapshot(userA);
  const right = ensureActivitySnapshot(userB);

  const breakdown = {
    goal: calculateGoalCompatibility(left.goal, right.goal),
    experience: calculateExperienceCompatibility(left.experience, right.experience),
    schedule: calculateScheduleCompatibility(left.preferredTime, right.preferredTime),
    age: calculateAgeCompatibility(left.age, right.age),
    activity: calculateActivityCompatibility(left, right),
  };

  const score = Math.round(
    breakdown.goal * WEIGHTS.goal +
      breakdown.experience * WEIGHTS.experience +
      breakdown.schedule * WEIGHTS.schedule +
      breakdown.age * WEIGHTS.age +
      breakdown.activity * WEIGHTS.activity
  );

  return {
    score,
    breakdown,
    matchLabel: getMatchLabel(score),
    compatibilityReasons: buildCompatibilityReasons(left, right, breakdown),
  };
}

export function calculateCompatibilityScore(userA, userB) {
  return calculateCompatibility(userA, userB).score;
}

export function rankMatches(currentUserOrId, allUsersOrLimit = [], options = {}) {
  let currentUser = currentUserOrId;
  let candidates = Array.isArray(allUsersOrLimit) ? allUsersOrLimit : null;
  const limit =
    typeof allUsersOrLimit === "number"
      ? allUsersOrLimit
      : Number(options.limit ?? 20);

  if (typeof currentUserOrId === "number") {
    const loaded = loadRankCandidates(currentUserOrId);
    if (loaded.error) {
      return { error: loaded.error, matches: [] };
    }
    currentUser = loaded.currentUser;
    candidates = loaded.candidates;
  }

  const missingFields = getRequiredProfileFields(currentUser);
  if (missingFields.length > 0) {
    return { error: "PROFILE_INCOMPLETE", missingFields, matches: [] };
  }

  const matches = (candidates ?? [])
    .filter((candidate) => getRequiredProfileFields(candidate).length === 0)
    .filter((candidate) => !haveUsersAlreadyMatched(currentUser.id, candidate.id))
    .map((candidate) => {
      const compatibility = calculateCompatibility(currentUser, candidate);
      return {
        ...candidate,
        compatibility: compatibility.score,
        matchLabel: compatibility.matchLabel,
        compatibilityReasons: compatibility.compatibilityReasons,
        breakdown: compatibility.breakdown,
        canChat: compatibility.score >= 60,
      };
    })
    .sort((left, right) => right.compatibility - left.compatibility)
    .slice(0, Math.min(20, limit));

  return { matches };
}

export function getMatchBreakdown(userId1, userId2) {
  const user1 = db.prepare(`
    SELECT id, name, age, gym, city, goal, experience, preferredTime, lastActiveAt
    FROM users
    WHERE id = ?
  `).get(userId1);

  const user2 = db.prepare(`
    SELECT id, name, age, gym, city, goal, experience, preferredTime, lastActiveAt
    FROM users
    WHERE id = ?
  `).get(userId2);

  if (!user1 || !user2) {
    return null;
  }

  const compatibility = calculateCompatibility(user1, user2);
  return {
    totalScore: compatibility.score,
    score: compatibility.score,
    tier: compatibility.matchLabel,
    matchLabel: compatibility.matchLabel,
    reasons: compatibility.compatibilityReasons,
    compatibilityReasons: compatibility.compatibilityReasons,
    breakdown: compatibility.breakdown,
  };
}

export function logMatchInteraction(viewerId, viewedId, action) {
  try {
    db.prepare(`
      INSERT INTO match_interactions (viewerId, viewedId, action, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(viewerId, viewedId, action, new Date().toISOString());
  } catch {
    return null;
  }
  return true;
}

export function getUserMatchHistory(userId, action = null, limit = 50) {
  let query = `
    SELECT viewedId, action, createdAt
    FROM match_interactions
    WHERE viewerId = ?
  `;

  if (action) {
    query += " AND action = ?";
  }

  query += " ORDER BY datetime(createdAt) DESC, id DESC LIMIT ?";

  const params = action ? [userId, action, limit] : [userId, limit];
  return db.prepare(query).all(...params);
}

export default {
  WEIGHTS,
  calculateCompatibility,
  calculateCompatibilityScore,
  rankMatches,
  getMatchBreakdown,
  logMatchInteraction,
  getUserMatchHistory,
};
