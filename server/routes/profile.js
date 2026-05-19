import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { awardEligibleBadges, BADGE_METADATA, getUserBadges } from "../utils/badges.js";
import { getLevelProgress } from "../utils/gamification.js";
import { buildTrainingLocationQuery, geocodeTrainingLocation } from "../utils/location.js";

const router = express.Router();

function getCheckinCount(userId) {
  return db.prepare(`
    SELECT COUNT(*) AS count
    FROM checkins
    WHERE userId = ?
  `).get(userId)?.count ?? 0;
}

function getMatchCount(userId) {
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

function getUserRecord(userId) {
  return db.prepare(`
    SELECT
      id,
      name,
      age,
      email,
      gym,
      goal,
      experience,
      preferredTime,
      city,
      consistency,
      streak,
      xp,
      level,
      bio,
      avatarUrl,
      locationLabel,
      locationPlaceId,
      locationLat,
      locationLng,
      createdAt
    FROM users
    WHERE id = ?
  `).get(userId);
}

router.get("/me", auth, (req, res) => {
  try {
    awardEligibleBadges(req.user.id);
    const user = getUserRecord(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      ...user,
      badges: getUserBadges(user.id),
      checkinCount: getCheckinCount(user.id),
      matchCount: getMatchCount(user.id),
      levelProgress: getLevelProgress(user.xp ?? 0),
      availableBadges: Object.values(BADGE_METADATA),
    });
  } catch {
    return res.status(500).json({ error: "Failed to load profile" });
  }
});

router.get("/:id", auth, (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    awardEligibleBadges(userId);
    const user = db.prepare(`
      SELECT
        id,
        name,
        gym,
        goal,
        experience,
        preferredTime,
        city,
        consistency,
        streak,
        xp,
        level,
        bio,
        avatarUrl,
        locationLabel,
        locationPlaceId,
        locationLat,
        locationLng,
        createdAt
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      ...user,
      badges: getUserBadges(userId),
      levelProgress: getLevelProgress(user.xp ?? 0),
    });
  } catch {
    return res.status(500).json({ error: "Failed to load public profile" });
  }
});

router.post("/update", auth, async (req, res) => {
  try {
    const { gym, goal, experience, preferredTime, city, age, bio, locationLabel } = req.body ?? {};
    const normalizedGym = String(gym ?? "").trim();
    const normalizedCity = String(city ?? "").trim();
    const normalizedLocationLabel = String(locationLabel ?? "").trim();
    const trainingLocationQuery = buildTrainingLocationQuery({
      locationLabel: normalizedLocationLabel,
      gym: normalizedGym,
      city: normalizedCity,
    });
    const geocodedLocation = await geocodeTrainingLocation(trainingLocationQuery);
    const storedLocationLabel =
      geocodedLocation?.locationLabel ||
      normalizedLocationLabel ||
      trainingLocationQuery ||
      null;

    db.prepare(`
      UPDATE users
      SET
        gym = ?,
        goal = ?,
        experience = ?,
        preferredTime = ?,
        city = ?,
        age = ?,
        bio = COALESCE(?, bio),
        locationLabel = ?,
        locationPlaceId = ?,
        locationLat = ?,
        locationLng = ?
      WHERE id = ?
    `).run(
      normalizedGym || null,
      String(goal ?? "").trim() || null,
      String(experience ?? "").trim() || null,
      String(preferredTime ?? "").trim() || null,
      normalizedCity || null,
      age ? Number(age) : null,
      bio !== undefined ? String(bio).trim() : null,
      storedLocationLabel,
      geocodedLocation?.locationPlaceId ?? null,
      geocodedLocation?.locationLat ?? null,
      geocodedLocation?.locationLng ?? null,
      req.user.id
    );

    const updatedUser = getUserRecord(req.user.id);
    return res.json({
      ...updatedUser,
      badges: getUserBadges(req.user.id),
      levelProgress: getLevelProgress(updatedUser?.xp ?? 0),
    });
  } catch {
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
