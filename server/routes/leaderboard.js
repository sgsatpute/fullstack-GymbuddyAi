import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

function toLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodStart(period) {
  const now = new Date();
  if (period === "week") {
    now.setDate(now.getDate() - 7);
    return toLocalDateString(now);
  }

  if (period === "month") {
    now.setDate(now.getDate() - 30);
    return toLocalDateString(now);
  }

  return null;
}

router.get("/", auth, (req, res) => {
  try {
    const gym = String(req.query.gym ?? "").trim().toLowerCase();
    const city = String(req.query.city ?? "").trim().toLowerCase();
    const period = String(req.query.period ?? "all").toLowerCase();
    const periodStart = getPeriodStart(period);

    const users = db.prepare(`
      SELECT id, name, xp, level, streak, consistency, avatarUrl, gym, city, lastCheckIn
      FROM users
      ORDER BY xp DESC, streak DESC, consistency DESC, name ASC
    `).all();

    const filteredUsers = users.filter((user) => {
      if (gym && !String(user.gym ?? "").toLowerCase().includes(gym)) {
        return false;
      }
      if (city && !String(user.city ?? "").toLowerCase().includes(city)) {
        return false;
      }
      if (periodStart && (!user.lastCheckIn || String(user.lastCheckIn) < periodStart)) {
        return false;
      }
      return true;
    });

    const ranked = filteredUsers.map((user, index) => ({
      ...user,
      rank: index + 1,
    }));

    const currentUserRank = ranked.find((user) => user.id === req.user.id) ?? null;

    res.json({
      users: ranked.slice(0, 50),
      leaders: ranked.slice(0, 50),
      currentUserRank,
      total: ranked.length,
      filters: {
        gym,
        city,
        period,
      },
    });
  } catch {
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

export default router;
