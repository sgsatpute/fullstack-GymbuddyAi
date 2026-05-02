import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();
const DAILY_XP_REWARD = 10;

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

router.post("/", auth, (req, res) => {
  const user = db.prepare(`
    SELECT id, streak, consistency, xp, level, lastCheckIn
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const today = getTodayDate();
  const existingCheckin = db.prepare(`
    SELECT id
    FROM checkins
    WHERE userId = ? AND checkInDate = ?
  `).get(user.id, today);

  if (existingCheckin) {
    return res.json({
      success: true,
      alreadyCheckedIn: true,
      xpAwarded: 0,
      user: {
        streak: user.streak ?? 0,
        consistency: user.consistency ?? 0,
        xp: user.xp ?? 0,
        level: user.level ?? 1,
        checkedInToday: true,
        lastCheckIn: user.lastCheckIn ?? today,
      },
      message: "You have already checked in today.",
    });
  }

  const yesterday = getYesterdayDate();
  const nextStreak = user.lastCheckIn === yesterday ? (user.streak ?? 0) + 1 : 1;
  const consistencyIncrease = 5 + Math.floor(nextStreak / 7);
  const nextConsistency = Math.min(100, (user.consistency ?? 0) + consistencyIncrease);
  const nextXp = (user.xp ?? 0) + DAILY_XP_REWARD;
  const nextLevel = Math.floor(nextXp / 100) + 1;

  const insertCheckin = db.prepare(`
    INSERT INTO checkins (userId, checkInDate, xpAwarded)
    VALUES (?, ?, ?)
  `);

  const updateUser = db.prepare(`
    UPDATE users
    SET streak = ?,
        consistency = ?,
        xp = ?,
        level = ?,
        lastCheckIn = ?
    WHERE id = ?
  `);

  const transaction = db.transaction(() => {
    insertCheckin.run(user.id, today, DAILY_XP_REWARD);
    updateUser.run(
      nextStreak,
      nextConsistency,
      nextXp,
      nextLevel,
      today,
      user.id
    );
  });

  try {
    transaction();
  } catch (error) {
    if (String(error?.message ?? "").includes("UNIQUE")) {
      return res.json({
        success: true,
        alreadyCheckedIn: true,
        xpAwarded: 0,
        user: {
          streak: user.streak ?? 0,
          consistency: user.consistency ?? 0,
          xp: user.xp ?? 0,
          level: user.level ?? 1,
          checkedInToday: true,
          lastCheckIn: user.lastCheckIn ?? today,
        },
        message: "You have already checked in today.",
      });
    }

    throw error;
  }

  res.json({
    success: true,
    alreadyCheckedIn: false,
    xpAwarded: DAILY_XP_REWARD,
    user: {
      streak: nextStreak,
      consistency: nextConsistency,
      xp: nextXp,
      level: nextLevel,
      checkedInToday: true,
      lastCheckIn: today,
    },
    message: `Daily check-in complete. +${DAILY_XP_REWARD} XP earned.`,
  });
});

export default router;
