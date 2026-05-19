import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { awardEligibleBadges } from "../utils/badges.js";
import { logActivity } from "../utils/activity.js";

const router = express.Router();

function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateFromLocalString(dateString) {
  const [year, month, day] = String(dateString).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function getYesterdayDateString(dateString) {
  const date = getDateFromLocalString(dateString);
  date.setDate(date.getDate() - 1);
  return toLocalDateString(date);
}

function getLast30DayWindow(endDateString) {
  const date = getDateFromLocalString(endDateString);
  date.setDate(date.getDate() - 29);
  return toLocalDateString(date);
}

function getCurrentWeekDates() {
  const today = new Date();
  const localDay = today.getDay();
  const mondayOffset = localDay === 0 ? -6 : 1 - localDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return toLocalDateString(date);
  });
}

router.post("/checkin", auth, (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const today = toLocalDateString(now);
    const nowIso = now.toISOString();

    const user = db.prepare(`
      SELECT id, streak, consistency, xp, level, lastCheckIn
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingCheckin = db.prepare(`
      SELECT id
      FROM checkins
      WHERE userId = ? AND checkInDate = ?
    `).get(userId, today);

    if (existingCheckin) {
      return res.json({
        alreadyCheckedIn: true,
        streak: user.streak ?? 0,
        consistency: user.consistency ?? 0,
        xp: user.xp ?? 0,
        xpGained: 0,
        newlyEarnedBadges: [],
      });
    }

    const yesterday = getYesterdayDateString(today);
    const newStreak = user.lastCheckIn === yesterday ? (user.streak ?? 0) + 1 : 1;

    const insertCheckin = db.prepare(`
      INSERT INTO checkins (userId, checkInDate, xpAwarded)
      VALUES (?, ?, ?)
    `);

    const countRecentCheckins = db.prepare(`
      SELECT COUNT(*) AS count
      FROM checkins
      WHERE userId = ? AND checkInDate BETWEEN ? AND ?
    `);

    const updateUser = db.prepare(`
      UPDATE users
      SET streak = ?,
          consistency = ?,
          xp = ?,
          level = ?,
          lastCheckIn = ?,
          lastCheckinTime = ?
      WHERE id = ?
    `);

    const finalizeCheckin = db.transaction(() => {
      insertCheckin.run(userId, today, 0);

      const totalRecentCheckins =
        countRecentCheckins.get(userId, getLast30DayWindow(today), today)?.count ?? 0;
      const newConsistency = Math.min(100, Math.round((totalRecentCheckins / 30) * 100));
      const xpGained =
        15 +
        (newStreak % 7 === 0 ? 5 : 0) +
        (newStreak % 30 === 0 ? 10 : 0);
      const newXp = (user.xp ?? 0) + xpGained;
      const newLevel = Math.floor(newXp / 100) + 1;

      updateUser.run(
        newStreak,
        newConsistency,
        newXp,
        newLevel,
        today,
        nowIso,
        userId
      );

      db.prepare(`
        UPDATE checkins
        SET xpAwarded = ?
        WHERE userId = ? AND checkInDate = ?
      `).run(xpGained, userId, today);

      const newlyEarnedBadges = awardEligibleBadges(userId);

      logActivity(userId, "checkin", {
        date: today,
        streak: newStreak,
        consistency: newConsistency,
        xpGained,
      });

      if (newLevel > (user.level ?? 1)) {
        logActivity(userId, "level_up", {
          previousLevel: user.level ?? 1,
          newLevel,
        });
      }

      return {
        success: true,
        alreadyCheckedIn: false,
        streak: newStreak,
        consistency: newConsistency,
        xp: newXp,
        level: newLevel,
        xpGained,
        newlyEarnedBadges,
      };
    });

    return res.json(finalizeCheckin());
  } catch (error) {
    return res.status(500).json({ error: "Failed to complete check-in" });
  }
});

router.get("/checkins/week", auth, (req, res) => {
  try {
    const dates = getCurrentWeekDates();
    const placeholders = dates.map(() => "?").join(", ");
    const rows = db.prepare(`
      SELECT checkInDate
      FROM checkins
      WHERE userId = ? AND checkInDate IN (${placeholders})
    `).all(req.user.id, ...dates);

    const checkedDates = new Set(rows.map((row) => row.checkInDate));

    return res.json({
      days: dates.map((date) => checkedDates.has(date)),
      dates,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch weekly check-ins" });
  }
});

export default router;
