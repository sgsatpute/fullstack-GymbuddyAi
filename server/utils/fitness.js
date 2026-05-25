import db from "../db.js";

const WORKOUT_TYPES = new Set([
  "strength",
  "cardio",
  "hybrid",
  "mobility",
  "recovery",
]);

const INTENSITY_LEVELS = new Set([
  "low",
  "moderate",
  "high",
]);

const DEFAULT_FOCUS_BY_TYPE = {
  strength: "Full Body Strength",
  cardio: "Cardio Conditioning",
  hybrid: "Strength + Conditioning",
  mobility: "Mobility Flow",
  recovery: "Recovery Session",
};

const NUTRITION_FOCUS_BY_GOAL = {
  muscle:
    "Keep protein high across 3 to 4 meals and put most of your carbs around training so performance and recovery both stay strong.",
  fatloss:
    "Keep protein anchored at every meal, use high-fiber carbs strategically, and let your hardest sessions guide when you eat more energy.",
  fitness:
    "Build meals around protein, produce, and steady carbs so your energy stays predictable for both work and training.",
};

const WORKOUT_BREAKDOWN_TEMPLATE = {
  strength: 0,
  cardio: 0,
  hybrid: 0,
  mobility: 0,
  recovery: 0,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundToSingleDecimal(value) {
  return Math.round(value * 10) / 10;
}

function titleCase(value) {
  return String(value ?? "")
    .trim()
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseJson(value) {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

export function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalDateString(date);
}

function getWeeklyTargetSessions(goal, experience) {
  const baseByGoal = {
    muscle: 4,
    fatloss: 5,
    fitness: 4,
  };

  const base = baseByGoal[goal] ?? 4;

  if (experience === "beginner") {
    return Math.max(3, base - 1);
  }

  if (experience === "advanced") {
    return Math.min(6, base + 1);
  }

  return base;
}

function getBaseDurationMinutes(experience) {
  if (experience === "advanced") {
    return 70;
  }

  if (experience === "intermediate") {
    return 55;
  }

  return 40;
}

function getWeeklyMinuteTarget(goal, experience) {
  const base = getWeeklyTargetSessions(goal, experience) * getBaseDurationMinutes(experience);

  if (goal === "fatloss") {
    return base + 25;
  }

  if (goal === "muscle") {
    return base + 10;
  }

  return base;
}

function getDurationForPlanItem(experience, workoutType) {
  const base = getBaseDurationMinutes(experience);

  if (workoutType === "recovery" || workoutType === "mobility") {
    return Math.max(25, base - 18);
  }

  if (workoutType === "cardio") {
    return Math.max(30, base - 5);
  }

  if (workoutType === "hybrid") {
    return base + 5;
  }

  return base;
}

function getTemplateByGoal(goal) {
  if (goal === "fatloss") {
    return [
      {
        title: "Full-Body Strength",
        workoutType: "strength",
        focusArea: "Full Body Strength",
        intensity: "moderate",
        objective: "Use compound lifts and crisp rest periods to protect muscle while pushing work capacity.",
      },
      {
        title: "Intervals + Core",
        workoutType: "cardio",
        focusArea: "Intervals and Core",
        intensity: "high",
        objective: "Use short, hard intervals and finish with core work that keeps posture strong.",
      },
      {
        title: "Lower Body + Steps",
        workoutType: "strength",
        focusArea: "Lower Body Strength",
        intensity: "moderate",
        objective: "Train legs with control, then add low-intensity steps to keep output high.",
      },
      {
        title: "Mobility Reset",
        workoutType: "mobility",
        focusArea: "Mobility and Recovery",
        intensity: "low",
        objective: "Open hips, ankles, and thoracic spine so the next hard session feels better.",
      },
      {
        title: "Upper Body Circuit",
        workoutType: "hybrid",
        focusArea: "Upper Body Circuit",
        intensity: "moderate",
        objective: "Blend pushing, pulling, and short rests so strength and conditioning both improve.",
      },
      {
        title: "Long Cardio Base",
        workoutType: "cardio",
        focusArea: "Zone 2 Cardio",
        intensity: "moderate",
        objective: "Stay conversational and build a bigger aerobic base without beating yourself up.",
      },
      {
        title: "Recovery Walk",
        workoutType: "recovery",
        focusArea: "Recovery Walk and Stretch",
        intensity: "low",
        objective: "Use easy movement to stay active while keeping fatigue under control.",
      },
    ];
  }

  if (goal === "fitness") {
    return [
      {
        title: "Full-Body Strength",
        workoutType: "strength",
        focusArea: "Full Body Strength",
        intensity: "moderate",
        objective: "Train all major patterns with clean, repeatable form.",
      },
      {
        title: "Cardio Base",
        workoutType: "cardio",
        focusArea: "Cardio Endurance",
        intensity: "moderate",
        objective: "Build steady endurance that supports both training and daily energy.",
      },
      {
        title: "Upper Body Technique",
        workoutType: "strength",
        focusArea: "Upper Body Strength",
        intensity: "moderate",
        objective: "Own the basics and leave a little in the tank so consistency stays easy.",
      },
      {
        title: "Lower Body + Core",
        workoutType: "strength",
        focusArea: "Lower Body and Core",
        intensity: "moderate",
        objective: "Strengthen the legs and trunk so your whole week feels more athletic.",
      },
      {
        title: "Mobility Flow",
        workoutType: "mobility",
        focusArea: "Mobility and Movement Quality",
        intensity: "low",
        objective: "Use controlled mobility to improve range and reduce stiffness.",
      },
      {
        title: "Mixed Conditioning",
        workoutType: "hybrid",
        focusArea: "Mixed Conditioning",
        intensity: "high",
        objective: "Blend short strength blocks with conditioning to keep training interesting and useful.",
      },
      {
        title: "Long Walk + Reset",
        workoutType: "recovery",
        focusArea: "Walk and Recovery",
        intensity: "low",
        objective: "Lock in a lighter day so the next week starts with fresh legs and focus.",
      },
    ];
  }

  return [
    {
      title: "Upper Body Strength",
      workoutType: "strength",
      focusArea: "Upper Body Strength",
      intensity: "moderate",
      objective: "Focus on pressing and pulling with progressive overload and clean execution.",
    },
    {
      title: "Lower Body Strength",
      workoutType: "strength",
      focusArea: "Lower Body Strength",
      intensity: "moderate",
      objective: "Drive leg strength with squats, hinges, and controlled accessory work.",
    },
    {
      title: "Active Recovery",
      workoutType: "recovery",
      focusArea: "Walk and Mobility",
      intensity: "low",
      objective: "Keep blood flowing without adding fatigue so the next session feels sharp.",
    },
    {
      title: "Pull + Posterior Chain",
      workoutType: "strength",
      focusArea: "Back and Posterior Chain",
      intensity: "high",
      objective: "Prioritize rows, pull variations, and posterior chain volume that supports growth.",
    },
    {
      title: "Hypertrophy Volume",
      workoutType: "hybrid",
      focusArea: "Chest, Shoulders, and Arms",
      intensity: "moderate",
      objective: "Chase quality volume and short rests to create a strong muscle-building signal.",
    },
    {
      title: "Conditioning Finishers",
      workoutType: "cardio",
      focusArea: "Conditioning and Core",
      intensity: "moderate",
      objective: "Improve engine capacity so your lifting and recovery both get better.",
    },
    {
      title: "Mobility + Rest",
      workoutType: "mobility",
      focusArea: "Mobility and Tissue Care",
      intensity: "low",
      objective: "Use a lower-stress day to recover and protect your next hard lift.",
    },
  ];
}

function rotatePlanTowardFocus(plan, nextFocus) {
  if (!nextFocus) {
    return plan;
  }

  const safeFocus = nextFocus.toLowerCase();
  const index = plan.findIndex((item) =>
    `${item.title} ${item.focusArea}`.toLowerCase().includes(safeFocus)
  );

  if (index <= 0) {
    return plan;
  }

  return [...plan.slice(index), ...plan.slice(0, index)];
}

function getDayLabel(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  return {
    dayLabel: new Intl.DateTimeFormat(undefined, {
      weekday: "short",
    }).format(date),
    scheduledFor: toLocalDateString(date),
  };
}

function buildWorkoutBreakdown(workouts) {
  const breakdown = { ...WORKOUT_BREAKDOWN_TEMPLATE };

  for (const workout of workouts) {
    const key = String(workout.workoutType ?? "").trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(breakdown, key)) {
      breakdown[key] += 1;
    }
  }

  return breakdown;
}

function getMostCommonFocus(workouts) {
  if (workouts.length === 0) {
    return null;
  }

  const counts = new Map();
  for (const workout of workouts) {
    const key = String(workout.focusArea ?? "").trim();
    if (!key) {
      continue;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function inferNextFocus(goal, recentWorkouts) {
  const lastWorkout = recentWorkouts[0];

  if (!lastWorkout) {
    if (goal === "fatloss") {
      return "Full Body Strength";
    }

    if (goal === "fitness") {
      return "Mixed Conditioning";
    }

    return "Upper Body Strength";
  }

  const lastFocus = String(lastWorkout.focusArea ?? "").toLowerCase();
  const lastType = String(lastWorkout.workoutType ?? "").toLowerCase();

  if (lastFocus.includes("upper")) {
    return "Lower Body Strength";
  }

  if (lastFocus.includes("lower") || lastFocus.includes("leg")) {
    return "Upper Body Strength";
  }

  if (lastFocus.includes("push")) {
    return "Pull Session";
  }

  if (lastFocus.includes("pull") || lastFocus.includes("back")) {
    return "Lower Body Strength";
  }

  if (lastType === "cardio") {
    return "Strength Session";
  }

  if (lastType === "recovery" || lastType === "mobility") {
    return goal === "muscle" ? "Upper Body Strength" : "Full Body Strength";
  }

  if (goal === "fatloss") {
    return "Intervals and Core";
  }

  if (goal === "fitness") {
    return "Mixed Conditioning";
  }

  return "Hypertrophy Volume";
}

function getReadinessLabel(score) {
  if (score >= 82) {
    return "Push Day Ready";
  }

  if (score >= 65) {
    return "Steady and Trainable";
  }

  return "Recovery-Focused";
}

function getDaysSinceDate(dateString) {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.max(0, Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000));
}

function getCheckinsLast7(userId) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM checkins
    WHERE userId = ? AND checkInDate BETWEEN ? AND ?
  `).get(userId, getDateDaysAgo(6), toLocalDateString())?.count ?? 0;
}

function getRecoverySessionCount(workouts) {
  return workouts.filter((workout) =>
    workout.workoutType === "recovery" ||
    workout.workoutType === "mobility" ||
    workout.intensity === "low"
  ).length;
}

function getGoalAlignmentInsight(user, summary) {
  const workoutMix = summary.workoutTypeBreakdown;
  const strengthLeanSessions = workoutMix.strength + workoutMix.hybrid;
  const cardioLeanSessions = workoutMix.cardio + workoutMix.hybrid;

  if (user.goal === "muscle") {
    return strengthLeanSessions >= 2
      ? {
          title: "Goal alignment",
          body: "Your recent training mix gives a muscle-building goal enough strength exposure to keep paying off.",
          statLabel: "Strength-leaning sessions",
          statValue: String(strengthLeanSessions),
          tone: "positive",
        }
      : {
          title: "Goal alignment",
          body: "Your goal says muscle gain, but this week needs more strength-dominant work to fully support it.",
          statLabel: "Strength-leaning sessions",
          statValue: String(strengthLeanSessions),
          tone: "watch",
        };
  }

  if (user.goal === "fatloss") {
    return cardioLeanSessions >= 2
      ? {
          title: "Goal alignment",
          body: "You are stacking enough conditioning work to support a fat-loss phase without abandoning strength.",
          statLabel: "Conditioning-leaning sessions",
          statValue: String(cardioLeanSessions),
          tone: "positive",
        }
      : {
          title: "Goal alignment",
          body: "Your fat-loss goal will move faster if you add one more cardio or hybrid session this week.",
          statLabel: "Conditioning-leaning sessions",
          statValue: String(cardioLeanSessions),
          tone: "watch",
        };
  }

  const balancedCount = Object.values(workoutMix).filter((count) => count > 0).length;
  return balancedCount >= 3
    ? {
        title: "Goal alignment",
        body: "The current mix looks balanced enough for a general fitness goal and should keep training interesting.",
        statLabel: "Workout types this week",
        statValue: String(balancedCount),
        tone: "positive",
      }
    : {
        title: "Goal alignment",
        body: "General fitness usually improves faster with a more varied week, so add one different training stimulus.",
        statLabel: "Workout types this week",
        statValue: String(balancedCount),
        tone: "watch",
      };
}

function getActivityFeedFallback(userId, limit) {
  return getRecentWorkoutSessions(userId, limit).map((workout) => ({
    id: `workout-${workout.id}`,
    type: "workout",
    title: `Logged ${titleCase(workout.workoutType)} session`,
    detail: `${workout.focusArea} / ${workout.durationMinutes} min / ${titleCase(workout.intensity)}`,
    createdAt: workout.createdAt,
  }));
}

export function isValidWorkoutType(value) {
  return WORKOUT_TYPES.has(String(value ?? "").trim().toLowerCase());
}

export function isValidIntensity(value) {
  return INTENSITY_LEVELS.has(String(value ?? "").trim().toLowerCase());
}

export function normalizeWorkoutEntry(input = {}) {
  const workoutType = String(input.workoutType ?? "")
    .trim()
    .toLowerCase();
  const intensity = String(input.intensity ?? "")
    .trim()
    .toLowerCase();
  const focusArea = String(input.focusArea ?? "").trim();
  const sessionDate = String(input.sessionDate ?? "").trim() || toLocalDateString();
  const durationMinutes = Number(input.durationMinutes);
  const energy = Number(input.energy);
  const notes = String(input.notes ?? "").trim();

  return {
    workoutType,
    intensity,
    focusArea: focusArea || DEFAULT_FOCUS_BY_TYPE[workoutType] || DEFAULT_FOCUS_BY_TYPE.strength,
    sessionDate,
    durationMinutes,
    energy,
    notes,
  };
}

export function getRecentWorkoutSessions(userId, limit = 6) {
  return db.prepare(`
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
    WHERE userId = ?
    ORDER BY sessionDate DESC, id DESC
    LIMIT ?
  `).all(userId, limit);
}

export function getWorkoutSummary(userId) {
  const user = db.prepare(`
    SELECT goal, experience, streak
    FROM users
    WHERE id = ?
  `).get(userId);

  const weeklyRows = db.prepare(`
    SELECT durationMinutes, energy, focusArea, intensity, workoutType, sessionDate
    FROM workout_sessions
    WHERE userId = ? AND sessionDate BETWEEN ? AND ?
    ORDER BY sessionDate DESC, id DESC
  `).all(userId, getDateDaysAgo(6), toLocalDateString());

  const monthlyRows = db.prepare(`
    SELECT durationMinutes
    FROM workout_sessions
    WHERE userId = ? AND sessionDate BETWEEN ? AND ?
  `).all(userId, getDateDaysAgo(27), toLocalDateString());

  const recentWorkouts = getRecentWorkoutSessions(userId, 6);
  const weeklySessions = weeklyRows.length;
  const weeklyMinutes = weeklyRows.reduce((total, workout) => total + (workout.durationMinutes ?? 0), 0);
  const averageEnergy =
    weeklyRows.length > 0
      ? roundToSingleDecimal(
          weeklyRows.reduce((total, workout) => total + (workout.energy ?? 0), 0) / weeklyRows.length
        )
      : 0;
  const weeklyTargetSessions = getWeeklyTargetSessions(user?.goal, user?.experience);
  const minutesTarget = getWeeklyMinuteTarget(user?.goal, user?.experience);
  const adherencePercent =
    weeklyTargetSessions > 0
      ? clamp(Math.round((weeklySessions / weeklyTargetSessions) * 100), 0, 100)
      : 0;
  const monthlyMinutes = monthlyRows.reduce((total, workout) => total + (workout.durationMinutes ?? 0), 0);
  const mostCommonFocus = getMostCommonFocus(weeklyRows);
  const nextSuggestedFocus = inferNextFocus(user?.goal, recentWorkouts);
  const workoutTypeBreakdown = buildWorkoutBreakdown(weeklyRows);
  const weeklyRecoverySessions = getRecoverySessionCount(weeklyRows);
  const checkinsLast7 = getCheckinsLast7(userId);
  const daysSinceLastSession = getDaysSinceDate(recentWorkouts[0]?.sessionDate ?? null);
  const workloadScore = weeklyRows.reduce((total, workout) => {
    if (workout.intensity === "high") {
      return total + 3;
    }
    if (workout.intensity === "moderate") {
      return total + 2;
    }
    return total + 1;
  }, 0);
  const readinessScore = clamp(
    66 +
      Math.round((averageEnergy - 3) * 8) +
      (user?.streak >= 7 ? 6 : user?.streak >= 3 ? 3 : 0) -
      (workloadScore >= 14 ? 10 : workloadScore >= 10 ? 5 : 0),
    38,
    95
  );

  return {
    weeklySessions,
    weeklyTargetSessions,
    adherencePercent,
    weeklyMinutes,
    averageEnergy,
    totalSessions28: monthlyRows.length,
    totalMinutes28: monthlyMinutes,
    lastSessionAt: recentWorkouts[0]?.sessionDate ?? null,
    mostCommonFocus,
    readinessScore,
    readinessLabel: getReadinessLabel(readinessScore),
    nextSuggestedFocus,
    workoutTypeBreakdown,
    weeklyRecoverySessions,
    checkinsLast7,
    daysSinceLastSession,
    minutesTarget,
  };
}

export function buildCoachPlan(user, summary) {
  const rotatedPlan = rotatePlanTowardFocus(
    getTemplateByGoal(user?.goal),
    summary?.nextSuggestedFocus
  );

  return rotatedPlan.map((item, index) => {
    const { dayLabel, scheduledFor } = getDayLabel(index);

    return {
      day: index + 1,
      dayLabel,
      scheduledFor,
      title: item.title,
      workoutType: item.workoutType,
      focusArea: item.focusArea,
      durationMinutes: getDurationForPlanItem(user?.experience, item.workoutType),
      intensity: item.intensity,
      objective: item.objective,
    };
  });
}

export function getNutritionFocus(goal) {
  return NUTRITION_FOCUS_BY_GOAL[goal] ?? NUTRITION_FOCUS_BY_GOAL.fitness;
}

export function getRecoveryFocus(summary) {
  if ((summary?.readinessScore ?? 0) >= 82) {
    return "You have room to push training quality right now, but keep one lighter session in the next 48 hours so momentum stays sustainable.";
  }

  if ((summary?.readinessScore ?? 0) >= 65) {
    return "Stay in the middle lane this week: clean technique, moderate effort, and protect your sleep so consistency stays easy.";
  }

  return "Your recovery is asking for attention. Pull intensity down, keep walking, hydrate, and give yourself an earlier bedtime before the next hard session.";
}

export function getCoachNoteFallback(user, summary) {
  return `You are ${summary.weeklySessions}/${summary.weeklyTargetSessions} sessions into the week with a readiness score of ${summary.readinessScore}. Keep your ${user.preferredTime || "planned"} training slot protected and aim your next session at ${summary.nextSuggestedFocus}.`;
}

export function getRecentCoachActivity(userId, limit = 8) {
  const rows = db.prepare(`
    SELECT id, actionType, metadata, createdAt
    FROM activity_log
    WHERE userId = ?
    ORDER BY datetime(createdAt) DESC, id DESC
    LIMIT ?
  `).all(userId, limit);

  if (rows.length === 0) {
    return getActivityFeedFallback(userId, limit);
  }

  return rows.map((row) => {
    const metadata = parseJson(row.metadata);

    if (row.actionType === "workout_logged") {
      return {
        id: `activity-${row.id}`,
        type: "workout",
        title: `Logged ${titleCase(metadata.workoutType || "workout")} session`,
        detail: `${metadata.focusArea || "Focused work"} / ${metadata.durationMinutes ?? 0} min / ${titleCase(metadata.intensity || "moderate")}`,
        createdAt: row.createdAt,
      };
    }

    if (row.actionType === "checkin") {
      return {
        id: `activity-${row.id}`,
        type: "checkin",
        title: "Checked in",
        detail: `Streak at ${metadata.streak ?? 0} days / consistency ${metadata.consistency ?? 0}%`,
        createdAt: row.createdAt,
      };
    }

    if (row.actionType === "badge_earned") {
      return {
        id: `activity-${row.id}`,
        type: "badge",
        title: "Unlocked a badge",
        detail: titleCase(metadata.badgeType || "new milestone"),
        createdAt: row.createdAt,
      };
    }

    if (row.actionType === "level_up") {
      return {
        id: `activity-${row.id}`,
        type: "level",
        title: "Levelled up",
        detail: `Reached level ${metadata.newLevel ?? ""}`.trim(),
        createdAt: row.createdAt,
      };
    }

    if (row.actionType === "message_sent") {
      return {
        id: `activity-${row.id}`,
        type: "social",
        title: "Kept a conversation moving",
        detail: "A social rep still supports consistency.",
        createdAt: row.createdAt,
      };
    }

    if (row.actionType === "meal_logged") {
      return {
        id: `activity-${row.id}`,
        type: "nutrition",
        title: "Logged a meal",
        detail: `${titleCase(metadata.mealType || "meal")} / ${metadata.calories ?? 0} kcal / ${metadata.proteinGrams ?? 0}g protein`,
        createdAt: row.createdAt,
      };
    }

    return {
      id: `activity-${row.id}`,
      type: row.actionType,
      title: titleCase(row.actionType),
      detail: "Progress recorded.",
      createdAt: row.createdAt,
    };
  });
}

export function buildDailyMissions(user, summary) {
  const recoveryTarget = (summary.readinessScore ?? 0) < 65 ? 2 : 1;
  const checkinTarget = 5;

  return [
    {
      id: "sessions",
      title: "Hit weekly sessions",
      description: "Keep your main training promise to yourself this week.",
      progress: summary.weeklySessions,
      target: summary.weeklyTargetSessions,
      unit: "sessions",
      completed: summary.weeklySessions >= summary.weeklyTargetSessions,
      emphasis: summary.adherencePercent >= 100 ? "complete" : "primary",
    },
    {
      id: "minutes",
      title: "Accumulate useful minutes",
      description: `Stack enough total work to support a ${titleCase(user.goal)} goal.`,
      progress: summary.weeklyMinutes,
      target: summary.minutesTarget,
      unit: "min",
      completed: summary.weeklyMinutes >= summary.minutesTarget,
      emphasis: summary.weeklyMinutes >= summary.minutesTarget ? "complete" : "secondary",
    },
    {
      id: "checkins",
      title: "Protect the habit",
      description: "Show up in the app often enough that momentum stays visible.",
      progress: summary.checkinsLast7,
      target: checkinTarget,
      unit: "check-ins",
      completed: summary.checkinsLast7 >= checkinTarget,
      emphasis: summary.checkinsLast7 >= checkinTarget ? "complete" : "secondary",
    },
    {
      id: "recovery",
      title: "Build recovery into the plan",
      description:
        summary.readinessScore < 65
          ? "You need low-stress recovery blocks this week, not just more grind."
          : "Keep at least one lighter session so the next hard workout stays productive.",
      progress: summary.weeklyRecoverySessions,
      target: recoveryTarget,
      unit: "sessions",
      completed: summary.weeklyRecoverySessions >= recoveryTarget,
      emphasis: summary.weeklyRecoverySessions >= recoveryTarget ? "complete" : "watch",
    },
  ];
}

export function buildInsightCards(user, summary) {
  const momentumCard =
    summary.adherencePercent >= 100
      ? {
          id: "momentum",
          title: "Momentum",
          body: "You are already meeting this week's session target, so the job is protecting quality and recovery.",
          statLabel: "Weekly sessions",
          statValue: `${summary.weeklySessions}/${summary.weeklyTargetSessions}`,
          tone: "positive",
        }
      : summary.adherencePercent >= 70
        ? {
            id: "momentum",
            title: "Momentum",
            body: "You are close to target. One more purposeful workout keeps the week looking sharp.",
            statLabel: "Weekly sessions",
            statValue: `${summary.weeklySessions}/${summary.weeklyTargetSessions}`,
            tone: "neutral",
          }
        : {
            id: "momentum",
            title: "Momentum",
            body: "The plan still has open space. Lock the next session into your calendar before the day gets noisy.",
            statLabel: "Weekly sessions",
            statValue: `${summary.weeklySessions}/${summary.weeklyTargetSessions}`,
            tone: "watch",
          };

  const recoveryCard =
    summary.readinessScore >= 82
      ? {
          id: "recovery",
          title: "Recovery signal",
          body: "Readiness is high enough to push quality today, but keep one lighter block nearby so you do not overspend energy.",
          statLabel: "Average energy",
          statValue: `${summary.averageEnergy}/5`,
          tone: "positive",
        }
      : summary.readinessScore >= 65
        ? {
            id: "recovery",
            title: "Recovery signal",
            body: "You are trainable, but staying in the moderate lane will probably give you the best next three days.",
            statLabel: "Average energy",
            statValue: `${summary.averageEnergy}/5`,
            tone: "neutral",
          }
        : {
            id: "recovery",
            title: "Recovery signal",
            body: "This is a lower-energy window. Keep the habit alive, but reduce intensity and win with a smaller session.",
            statLabel: "Average energy",
            statValue: `${summary.averageEnergy}/5`,
            tone: "watch",
          };

  const habitCard =
    summary.daysSinceLastSession === null
      ? {
          id: "habit",
          title: "Habit signal",
          body: "Once you log the first session, the coach will start adapting everything around your real training rhythm.",
          statLabel: "Days since last session",
          statValue: "N/A",
          tone: "neutral",
        }
      : summary.daysSinceLastSession <= 1
        ? {
            id: "habit",
            title: "Habit signal",
            body: "You trained recently enough that momentum is still alive. Protect the next slot and keep the chain moving.",
            statLabel: "Days since last session",
            statValue: summary.daysSinceLastSession === 0 ? "Today" : "1 day",
            tone: "positive",
          }
        : summary.daysSinceLastSession <= 3
          ? {
              id: "habit",
              title: "Habit signal",
              body: "You are still within range, but another delay will make restart friction much higher.",
              statLabel: "Days since last session",
              statValue: `${summary.daysSinceLastSession} days`,
              tone: "neutral",
            }
          : {
              id: "habit",
              title: "Habit signal",
              body: "The gap is long enough that the next session should be about re-entry, not punishment.",
              statLabel: "Days since last session",
              statValue: `${summary.daysSinceLastSession} days`,
              tone: "watch",
            };

  return [
    momentumCard,
    getGoalAlignmentInsight(user, summary),
    recoveryCard,
    habitCard,
  ];
}

export function buildNutritionPlan(user, summary) {
  const hydrationTargetLiters = roundToSingleDecimal(
    (user.goal === "muscle" ? 3.2 : user.goal === "fatloss" ? 3.0 : 2.8) +
      (summary.weeklyMinutes >= 220 ? 0.3 : 0)
  );

  if (user.preferredTime === "morning") {
    return {
      headline: "Fuel the morning session without making the first meal too heavy.",
      hydrationTargetLiters,
      meals: [
        {
          label: "Early fuel",
          idea: "Banana plus Greek yogurt, or toast plus eggs if you wake up hungry.",
          reason: "Easy carbs and protein make the morning session feel more stable.",
        },
        {
          label: "Post-workout breakfast",
          idea: "Oats with whey and fruit, or eggs with potatoes and fruit.",
          reason: "Refill energy early so recovery starts before the workday gets away from you.",
        },
        {
          label: "Lunch anchor",
          idea: "Rice, chicken, vegetables, and one easy sauce you can repeat.",
          reason: "A simple repeatable lunch is the easiest way to protect consistency.",
        },
        {
          label: "Dinner closeout",
          idea: "Lean protein, vegetables, and enough carbs to keep tomorrow's session supported.",
          reason: "The evening meal should help tomorrow feel easier, not just today feel full.",
        },
      ],
      snackStrategy: "Keep one protein-first snack ready for the afternoon so energy does not crash.",
    };
  }

  if (user.preferredTime === "night") {
    return {
      headline: "Use the daytime meals to set up a strong late session without feeling flat by evening.",
      hydrationTargetLiters,
      meals: [
        {
          label: "Breakfast anchor",
          idea: "Protein-rich breakfast with eggs, yogurt, oats, or fruit.",
          reason: "The night workout still depends on what you do early in the day.",
        },
        {
          label: "Lunch base",
          idea: "A balanced meal with protein, rice or potatoes, vegetables, and fruit.",
          reason: "This keeps energy steady instead of leaving everything to the pre-workout window.",
        },
        {
          label: "Pre-workout meal",
          idea: "Light protein plus carbs 90 to 150 minutes before training.",
          reason: "A cleaner pre-workout meal usually performs better than a huge late dinner.",
        },
        {
          label: "Post-workout dinner",
          idea: "Protein, easy carbs, and a lighter fat load after training.",
          reason: "You want recovery without making sleep worse.",
        },
      ],
      snackStrategy: "If evening hunger gets messy, plan the pre-workout snack instead of improvising it.",
    };
  }

  return {
    headline: "Let the earlier meals support a stronger evening session and a calmer recovery window.",
    hydrationTargetLiters,
    meals: [
      {
        label: "Breakfast",
        idea: "Protein plus a steady carb source like oats, toast, or fruit.",
        reason: "Strong evenings still start with stable energy in the morning.",
      },
      {
        label: "Lunch",
        idea: "Repeatable protein-carb-vegetable bowl you can prepare quickly.",
        reason: "Predictable lunches reduce bad decisions later when energy drops.",
      },
      {
        label: "Pre-workout snack",
        idea: "Fruit and yogurt, cereal and milk, or toast with nut butter.",
        reason: "This is just enough fuel to train well without weighing you down.",
      },
      {
        label: "Dinner",
        idea: "Protein-heavy plate with smart carbs after training.",
        reason: "Post-workout dinner is a recovery tool, not just the last meal of the day.",
      },
    ],
    snackStrategy: "On busy days, default to protein plus fruit before training rather than skipping fuel.",
  };
}

export function buildStreakRescuePlan(user, summary) {
  if (summary.weeklySessions === 0 || (summary.daysSinceLastSession ?? 0) >= 4) {
    return {
      headline: "Streak Rescue Mode",
      body: "Forget the perfect week. The only job now is a 20 to 30 minute win that proves you are back in motion.",
      actions: [
        `Do a ${String(summary.nextSuggestedFocus).toLowerCase()} session for 20 to 30 minutes.`,
        "Check in right after training so the habit stays visible.",
        "Protect the next training slot before you go to sleep tonight.",
      ],
    };
  }

  if (summary.readinessScore < 65) {
    return {
      headline: "Low-Energy Rescue",
      body: "Keep the habit alive, but reduce the demand. Today is about preserving momentum, not chasing a heroic session.",
      actions: [
        "Switch to mobility, recovery, or an easy cardio block.",
        "Keep the session short enough that finishing feels realistic.",
        "Eat a solid protein-heavy meal and aim for an earlier bedtime.",
      ],
    };
  }

  return {
    headline: "Momentum Protection",
    body: "You are in a decent place right now. The next win is not more thinking, it is getting the next session onto the calendar.",
    actions: [
      "Choose the exact day and time for the next session.",
      "Use the coach note to decide the workout focus now, not later.",
      "Keep one lighter recovery block in the week so quality stays high.",
    ],
  };
}

export function buildQuickPrompts(user, summary) {
  return [
    {
      label: "Adjust today",
      message: `Adjust today's workout for my ${summary.readinessLabel.toLowerCase()} readiness and ${user.preferredTime} training slot.`,
    },
    {
      label: "Meal timing",
      message: `Give me a simple meal plan around my ${user.preferredTime} workout for a ${user.goal} goal.`,
    },
    {
      label: "Busy day",
      message: `Build me a focused 20-minute ${summary.nextSuggestedFocus} session for today.`,
    },
    {
      label: "Restart plan",
      message: `I need a restart plan that keeps momentum alive without overwhelming me this week.`,
    },
  ];
}

export function buildWorkoutMixItems(summary) {
  return Object.entries(summary.workoutTypeBreakdown)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => ({
      label: titleCase(label),
      count,
    }));
}

export function buildCelebrationMoment(user, summary, activityFeed) {
  const recentBadge = activityFeed.find((item) => item.type === "badge");

  if (recentBadge) {
    return {
      title: "Recent win",
      body: `${recentBadge.detail} is the kind of visible progress that makes the routine feel real.`,
    };
  }

  if (summary.weeklySessions >= summary.weeklyTargetSessions) {
    return {
      title: "Target already hit",
      body: "You have already met the weekly session target. The new challenge is protecting quality and recovery.",
    };
  }

  if ((user.streak ?? 0) >= 7) {
    return {
      title: "Streak momentum",
      body: `A ${user.streak}-day streak means the habit is becoming part of your identity, not just a task list item.`,
    };
  }

  if ((user.level ?? 1) >= 3) {
    return {
      title: "Level progress",
      body: `You are already level ${user.level}, which means this is more than a fresh start now.`,
    };
  }

  return {
    title: "Progress signal",
    body: "Every logged session makes the coach smarter and the next decision easier.",
  };
}
