import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { requestAnthropicText } from "../utils/anthropic.js";
import { buildMapsDirectionsLink, calculateDistanceKm } from "../utils/location.js";
import { getBlockedUserIds } from "../utils/relationships.js";
import {
  getMatchBreakdown,
  logMatchInteraction,
  rankMatches,
} from "../utils/smartMatch.js";

const router = express.Router();

function mapMatchForResponse(currentUser, match) {
  const distanceKm = calculateDistanceKm(
    {
      locationLat: currentUser.locationLat,
      locationLng: currentUser.locationLng,
    },
    {
      locationLat: match.locationLat,
      locationLng: match.locationLng,
    }
  );

  return {
    user: match,
    score: match.compatibility,
    matchLabel: match.matchLabel,
    compatibilityReasons: match.compatibilityReasons,
    breakdown: match.breakdown,
    canChat: match.canChat,
    distanceKm,
    locationInsight: match.locationLabel || match.city || "",
    mapsUrl: buildMapsDirectionsLink({
      locationLabel: match.locationLabel,
      city: match.city,
    }),
  };
}

router.get("/", auth, (req, res) => {
  const ranking = rankMatches(req.user.id, 20);

  if (ranking.error) {
    const statusCode = ranking.error === "PROFILE_INCOMPLETE" ? 400 : 404;
    return res.status(statusCode).json({
      error: ranking.error,
      missingFields: ranking.missingFields ?? [],
    });
  }

  const currentUser = db.prepare(`
    SELECT id, locationLat, locationLng
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  const payload = ranking.matches.map((match) => mapMatchForResponse(currentUser, match));
  res.json(payload);
});

router.post("/:id/intro", auth, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = Number(req.params.id);

    if (!Number.isInteger(otherId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    if (getBlockedUserIds(myId).includes(otherId)) {
      return res.status(403).json({ error: "This user is unavailable." });
    }

    const me = db.prepare(`
      SELECT id, name, goal, experience, preferredTime
      FROM users
      WHERE id = ?
    `).get(myId);

    const other = db.prepare(`
      SELECT id, name
      FROM users
      WHERE id = ?
    `).get(otherId);

    if (!me || !other) {
      return res.status(404).json({ error: "User not found" });
    }

    const breakdown = getMatchBreakdown(myId, otherId);
    const headline =
      breakdown?.compatibilityReasons?.[0] ??
      breakdown?.reasons?.[0] ??
      "train on a similar schedule";
    const fallbackText = `Hey ${other.name}, looks like we both ${String(headline).toLowerCase()}. Want to get a session in this week?`;

    const message = await requestAnthropicText({
      system: "Write one short, casual gym buddy intro message. No emojis. Keep it warm and natural.",
      messages: [
        {
          role: "user",
          content: `Write an intro from ${me.name} to ${other.name}. Match reason: ${headline}. Goal: ${me.goal}. Preferred time: ${me.preferredTime}.`,
        },
      ],
      maxTokens: 90,
      fallbackText,
    });

    res.json({ message });
  } catch {
    res.status(500).json({ error: "Failed to generate intro" });
  }
});

function handleCompatibilityRequest(req, res) {
  try {
    const otherId = Number(req.params.userId ?? req.params.id);

    if (!Number.isInteger(otherId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    const breakdown = getMatchBreakdown(req.user.id, otherId);
    if (!breakdown) {
      return res.status(404).json({ error: "User not found" });
    }

    logMatchInteraction(req.user.id, otherId, "view");
    return res.json(breakdown);
  } catch {
    return res.status(500).json({ error: "Failed to get compatibility" });
  }
}

router.get("/compatibility/:userId", auth, handleCompatibilityRequest);
router.get("/:id/compatibility", auth, handleCompatibilityRequest);

router.post("/:id/interaction", auth, (req, res) => {
  try {
    const otherId = Number(req.params.id);
    const action = String(req.body?.action ?? "").trim();

    if (!Number.isInteger(otherId)) {
      return res.status(400).json({ error: "Invalid user id" });
    }

    if (!["view", "like", "pass", "message"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    logMatchInteraction(req.user.id, otherId, action);
    res.json({ success: true, action, timestamp: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: "Failed to log interaction" });
  }
});

export default router;
