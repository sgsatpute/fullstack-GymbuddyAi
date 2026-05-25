export function getLevelProgress(xp = 0) {
  const normalizedXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const levels = [
    { level: 1, title: "Gym Newbie", minXp: 0, maxXp: 499 },
    { level: 2, title: "Regular", minXp: 500, maxXp: 1499 },
    { level: 3, title: "Dedicated", minXp: 1500, maxXp: 3499 },
    { level: 4, title: "Athlete", minXp: 3500, maxXp: 6999 },
    { level: 5, title: "Elite", minXp: 7000, maxXp: 14999 },
    { level: 6, title: "Legend", minXp: 15000, maxXp: Number.MAX_SAFE_INTEGER },
  ];
  const currentLevel = levels.findLast((item) => normalizedXp >= item.minXp) ?? levels[0];
  const nextLevel = levels.find((item) => item.level === currentLevel.level + 1) ?? null;
  const levelStartXp = currentLevel.minXp;
  const nextLevelXp = nextLevel?.minXp ?? currentLevel.maxXp;
  const xpIntoLevel = normalizedXp - levelStartXp;
  const span = nextLevel ? nextLevel.minXp - levelStartXp : Math.max(1, currentLevel.maxXp - levelStartXp + 1);
  const xpNeededForNextLevel = nextLevel ? Math.max(0, nextLevel.minXp - normalizedXp) : 0;
  const levelProgressPercent = nextLevel ? Math.min(100, Math.round((xpIntoLevel / span) * 100)) : 100;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    levelStartXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeededForNextLevel,
    levelProgressPercent,
  };
}

export function buildAchievements({
  streak = 0,
  messagesSent = 0,
  totalCheckins = 0,
  consistency = 0,
  level = 1,
}) {
  const definitions = [
    {
      key: "first-checkin",
      title: "First Check-In",
      description: "Complete your first daily check-in.",
      icon: "Pulse",
      value: totalCheckins,
      target: 1,
    },
    {
      key: "streak-7",
      title: "7-Day Streak",
      description: "Train consistently for a full week.",
      icon: "Flame",
      value: streak,
      target: 7,
    },
    {
      key: "streak-30",
      title: "30-Day Streak",
      description: "Build a month-long training habit.",
      icon: "Calendar",
      value: streak,
      target: 30,
    },
    {
      key: "first-chat",
      title: "First Conversation",
      description: "Send your first message to a gym buddy.",
      icon: "MessageSquare",
      value: messagesSent,
      target: 1,
    },
    {
      key: "ten-messages",
      title: "Conversation Builder",
      description: "Send 10 messages to your buddies.",
      icon: "MessagesSquare",
      value: messagesSent,
      target: 10,
    },
    {
      key: "consistency-50",
      title: "Consistency 50",
      description: "Reach 50% consistency.",
      icon: "TrendingUp",
      value: consistency,
      target: 50,
    },
    {
      key: "level-5",
      title: "Level 5 Athlete",
      description: "Earn enough XP to reach level 5.",
      icon: "Trophy",
      value: level,
      target: 5,
    },
  ];

  return definitions.map((achievement) => ({
    ...achievement,
    unlocked: achievement.value >= achievement.target,
    progress: Math.min(achievement.value, achievement.target),
    progressPercent: Math.min(
      100,
      Math.round((Math.min(achievement.value, achievement.target) / achievement.target) * 100)
    ),
  }));
}
