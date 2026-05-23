/**
 * PROMPT 3: Coach Streaming Endpoints
 * Server-Sent Events for real-time Claude responses
 */

import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import anthropicCoach from "../utils/anthropicCoach.js";

const router = express.Router();

/**
 * POST /api/coach/message
 * Send message to coach with streaming response
 * Uses Server-Sent Events for real-time streaming
 */
router.post("/message", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get user profile
    const user = db
      .prepare(
        `
      SELECT id, name, age, goal, experience, streak, xp, level, bio
      FROM users
      WHERE id = ?
    `
      )
      .get(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get recent conversation history (last 10 messages)
    const conversationHistory = db
      .prepare(
        `
      SELECT role, content FROM coach_messages
      WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT 10
    `
      )
      .all(userId)
      .reverse();

    // Set up SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    try {
      // Stream response from Claude
      const stream = await anthropicCoach.streamCoachMessage(
        message,
        conversationHistory,
        user
      );

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          const text = event.delta.text;
          fullResponse += text;

          // Send text chunk to client
          res.write(`data: ${JSON.stringify({ type: "text", content: text })}\n\n`);
        }
      }

      // Save user message to database
      const timestamp = new Date().toISOString();
      db.prepare(
        `
        INSERT INTO coach_messages (userId, role, content, createdAt)
        VALUES (?, ?, ?, ?)
      `
      ).run(userId, "user", message, timestamp);

      // Save coach response to database
      db.prepare(
        `
        INSERT INTO coach_messages (userId, role, content, createdAt)
        VALUES (?, ?, ?, ?)
      `
      ).run(userId, "assistant", fullResponse, timestamp);

      // Signal completion
      res.write(
        `data: ${JSON.stringify({
          type: "complete",
          message_id: `msg_${Date.now()}`,
        })}\n\n`
      );
      res.end();
    } catch (streamError) {
      console.error("Streaming error:", streamError);
      res.write(
        `data: ${JSON.stringify({ type: "error", error: "Streaming failed" })}\n\n`
      );
      res.end();
    }
  } catch (error) {
    console.error("Coach message error:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

/**
 * GET /api/coach/history
 * Get conversation history for user
 */
router.get("/history", auth, (req, res) => {
  try {
    const userId = req.user.id;
    const limit = req.query.limit || 50;

    const messages = db
      .prepare(
        `
      SELECT id, role, content, createdAt
      FROM coach_messages
      WHERE userId = ?
      ORDER BY createdAt DESC
      LIMIT ?
    `
      )
      .all(userId, parseInt(limit))
      .reverse();

    res.json({ messages });
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

/**
 * POST /api/coach/clear-history
 * Clear coach conversation history
 */
router.post("/clear-history", auth, (req, res) => {
  try {
    const userId = req.user.id;

    db.prepare(`DELETE FROM coach_messages WHERE userId = ?`).run(userId);

    res.json({ success: true, message: "History cleared" });
  } catch (error) {
    console.error("Clear history error:", error);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

/**
 * POST /api/coach/workout-recommendation
 * Get personalized workout recommendation
 */
router.post("/workout-recommendation", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { focusArea = "general" } = req.body;

    const user = db
      .prepare(
        `
      SELECT id, name, goal, experience, streak, xp, level, bio
      FROM users
      WHERE id = ?
    `
      )
      .get(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const recommendation = await anthropicCoach.getWorkoutRecommendation(
      user,
      focusArea
    );

    res.json({
      focusArea,
      recommendation,
    });
  } catch (error) {
    console.error("Workout recommendation error:", error);
    res.status(500).json({ error: "Failed to generate recommendation" });
  }
});

/**
 * GET /api/coach/daily-motivation
 * Get daily motivation message
 */
router.get("/daily-motivation", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = db
      .prepare(
        `
      SELECT id, name, goal, experience, streak, xp, level
      FROM users
      WHERE id = ?
    `
      )
      .get(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const motivation = await anthropicCoach.getDailyMotivation(user);

    res.json({
      motivation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Daily motivation error:", error);
    res.status(500).json({ error: "Failed to generate motivation" });
  }
});

export default router;
