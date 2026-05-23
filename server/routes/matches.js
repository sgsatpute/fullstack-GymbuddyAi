import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { getBlockedUserIds } from "../utils/relationships.js";
import { requestAnthropicText } from "../utils/anthropic.js";
import { buildMapsDirectionsLink, calculateDistanceKm } from "../utils/location.js";
import {
  rankMatches,
  getMatchBreakdown,
  logMatchInteraction,
} from "../utils/smartMatch.js";

const router = express.Router();

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

router.get("/", auth, (req, res) => {
  const userId = req.user.id;

  // Use smart matching engine
  const result = rankMatches(userId, 50);

  if (result.error) {
    return res.status(result.error === "PROFILE_INCOMPLETE" ? 400 : 404).json({
      error: result.error,
    });
  }

  // Enhance matches with location insights and additional data
  const enhancedMatches = result.matches.map((match) => {
    const distanceKm = calculateDistanceKm(
      { locationLat: req.user.locationLat, locationLng: req.user.locationLng },
      { locationLat: match.locationLat, locationLng: match.locationLng }
    );

    const mapsUrl = buildMapsDirectionsLink({
      locationLabel: match.locationLabel,
      city: match.city,
    });

    return {
      user: match,
      score: match.compatibility,
      tier: match.tier,
      canChat: match.canChat,
      reasons: match.tier === "Elite match" ? ["Perfect compatibility"] : [],
      distanceKm,
      locationInsight: match.locationLabel || match.city || "",
      mapsUrl,
    };
  });

  res.json(enhancedMatches);
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

    const breakdown = getMatchBreakdown(myId, otherId);
    const fallbackText = `Hey ${other.name}, looks like we both ${String(breakdown?.reasons?.[0] ?? "train on a similar schedule").toLowerCase()}. Want to team up for a session sometime?`;
    const message = await requestAnthropicText({
      system: "Write short, casual, friendly gym buddy intro messages. One sentence only. No emojis.",
      messages: [
        {
          role: "user",
          content: `Write intro from ${me.name} to ${other.name}. They both ${breakdown?.reasons?.[0] ?? "have similar training goals"}, train ${me.preferredTime}, goal: ${me.goal}.`,
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

router.get("/:id/compatibility", auth, (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = Number(req.params.id);

    if (!Number.isInteger(otherId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const breakdown = getMatchBreakdown(myId, otherId);
    if (!breakdown) {
      return res.status(404).json({ error: "User not found" });
    }

    logMatchInteraction(myId, otherId, "view");
    res.json(breakdown);
  } catch {
    res.status(500).json({ error: "Failed to get compatibility" });
  }
});

router.post("/:id/interaction", auth, (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = Number(req.params.id);
    const { action } = req.body;

    if (!Number.isInteger(otherId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    if (!["view", "like", "pass", "message"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    logMatchInteraction(myId, otherId, action);
    res.json({ success: true, action, timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: "Failed to log interaction" });
  }
});

export default router;
