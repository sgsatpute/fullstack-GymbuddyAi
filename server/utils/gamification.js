export function getLevelProgress(xp = 0) {
  const normalizedXp = Number.isFinite(xp) ? Math.max(0, xp) : 0;
  const level = Math.floor(normalizedXp / 100) + 1;
  const levelStartXp = (level - 1) * 100;
  const nextLevelXp = level * 100;
  const xpIntoLevel = normalizedXp - levelStartXp;
  const xpNeededForNextLevel = Math.max(0, nextLevelXp - normalizedXp);
  const levelProgressPercent = Math.min(100, Math.round((xpIntoLevel / 100) * 100));

  return {
    level,
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
