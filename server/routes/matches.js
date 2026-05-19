import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { getBlockedUserIds } from "../utils/relationships.js";
import { requestAnthropicText } from "../utils/anthropic.js";
import { buildMapsDirectionsLink, calculateDistanceKm } from "../utils/location.js";

const router = express.Router();

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function buildMatch(me, other) {
  let score = 25;
  const reasons = [];
  const sameGym =
    normalize(me.gym) && normalize(me.gym) === normalize(other.gym);
  const sameCity =
    normalize(me.city) && normalize(me.city) === normalize(other.city);
  const distanceKm = calculateDistanceKm(me, other);

  if (sameGym) {
    score += 28;
    reasons.push("Same gym or training location");
  }

  if (!sameGym && distanceKm !== null) {
    if (distanceKm <= 2) {
      score += 18;
      reasons.push("Very close training locations");
    } else if (distanceKm <= 6) {
      score += 14;
      reasons.push("Close enough to train together easily");
    } else if (distanceKm <= 12) {
      score += 9;
      reasons.push("Reasonable commute between training spots");
    } else if (distanceKm <= 20) {
      score += 4;
    }
  } else if (!sameGym && sameCity) {
    score += 6;
    reasons.push("Same city or neighborhood");
  }

  if (normalize(me.goal) && normalize(me.goal) === normalize(other.goal)) {
    score += 22;
    reasons.push("Aligned fitness goal");
  }

  if (normalize(me.experience) && normalize(me.experience) === normalize(other.experience)) {
    score += 16;
    reasons.push("Similar experience level");
  }

  if (
    normalize(me.preferredTime) &&
    normalize(me.preferredTime) === normalize(other.preferredTime)
  ) {
    score += 16;
    reasons.push("Workout schedules line up");
  }

  if (Number.isFinite(me.age) && Number.isFinite(other.age)) {
    const ageGap = Math.abs(me.age - other.age);
    if (ageGap <= 3) {
      score += 8;
      reasons.push("Very similar age range");
    } else if (ageGap <= 6) {
      score += 4;
    }
  }

  const streakGap = Math.abs((me.streak ?? 0) - (other.streak ?? 0));
  if (streakGap <= 3) {
    score += 5;
    reasons.push("Consistency is on a similar track");
  }

  const compatibility = Math.min(99, Math.max(0, score));
  let tier = "Potential fit";

  if (compatibility >= 85) {
    tier = "Elite match";
  } else if (compatibility >= 72) {
    tier = "Strong match";
  } else if (compatibility >= 60) {
    tier = "Good fit";
  }

  return {
    score: compatibility,
    reasons,
    tier,
    canChat: compatibility >= 60,
    distanceKm,
    locationInsight:
      distanceKm !== null
        ? other.locationLabel || other.city || `${distanceKm} km apart`
        : sameCity
          ? "Same city"
          : other.locationLabel || other.city || "",
    mapsUrl: buildMapsDirectionsLink(other),
  };
}

router.get("/", auth, (req, res) => {
  const userId = req.user.id;
  const blockedUserIds = getBlockedUserIds(userId);

  const me = db.prepare(`
    SELECT id, name, age, gym, city, goal, experience, preferredTime, streak, consistency, xp, level, bio, avatarUrl, locationLabel, locationLat, locationLng
    FROM users
    WHERE id = ?
  `).get(userId);

  if (!me) {
    return res.status(404).json({ error: "User not found" });
  }

  const required = ["age", "gym", "goal", "experience", "preferredTime"];
  const incomplete = required.some((key) => me[key] === null || me[key] === undefined || me[key] === "");

  if (incomplete) {
    return res.status(400).json({ error: "PROFILE_INCOMPLETE" });
  }

  const placeholders = blockedUserIds.map(() => "?").join(", ");
  const othersQuery = `
    SELECT id, name, age, gym, city, goal, experience, preferredTime, streak, consistency, xp, level, bio, avatarUrl, locationLabel, locationLat, locationLng
    FROM users
    WHERE id != ?
      ${blockedUserIds.length > 0 ? `AND id NOT IN (${placeholders})` : ""}
      AND age IS NOT NULL
      AND gym IS NOT NULL
      AND goal IS NOT NULL
      AND experience IS NOT NULL
      AND preferredTime IS NOT NULL
  `;

  const others = db.prepare(othersQuery).all(userId, ...blockedUserIds);

  const matches = others
    .map((other) => {
      const match = buildMatch(me, other);
      return {
        user: other,
        ...match,
      };
    })
    .sort((a, b) => b.score - a.score);

  res.json(matches);
});

router.post("/:id/intro", auth, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = Number(req.params.id);

    if (!Number.isInteger(otherId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const blockedUserIds = getBlockedUserIds(myId);
    if (blockedUserIds.includes(otherId)) {
      return res.status(403).json({ error: "This user is unavailable." });
    }

    const me = db.prepare(`
      SELECT id, name, age, gym, city, goal, experience, preferredTime, streak, consistency, xp, level, bio, avatarUrl, locationLabel, locationLat, locationLng
      FROM users
      WHERE id = ?
    `).get(myId);

    const other = db.prepare(`
      SELECT id, name, age, gym, city, goal, experience, preferredTime, streak, consistency, xp, level, bio, avatarUrl, locationLabel, locationLat, locationLng
      FROM users
      WHERE id = ?
    `).get(otherId);

    if (!me || !other) {
      return res.status(404).json({ error: "User not found" });
    }

    const match = buildMatch(me, other);
    const fallbackText = `Hey ${other.name}, looks like we both ${String(match.reasons[0] ?? "train on a similar schedule").toLowerCase()}. Want to team up for a session sometime?`;
    const message = await requestAnthropicText({
      system: "Write short, casual, friendly gym buddy intro messages. One sentence only. No emojis.",
      messages: [
        {
          role: "user",
          content: `Write intro from ${me.name} to ${other.name}. They both ${match.reasons[0] ?? "have similar training goals"}, train ${me.preferredTime}, goal: ${me.goal}.`,
        },
      ],
      maxTokens: 80,
      fallbackText,
    });

    res.json({ message });
  } catch {
    res.status(500).json({ error: "Failed to generate intro" });
  }
});

export default router;
