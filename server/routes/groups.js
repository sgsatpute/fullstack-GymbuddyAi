import crypto from "crypto";
import express from "express";
import db from "../db.js";
import auth from "../middleware/auth.js";
import { createNotification } from "../utils/realtime.js";

const router = express.Router();

function createInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function getGroupMemberIds(groupId) {
  return db.prepare(`
    SELECT userId
    FROM group_members
    WHERE groupId = ?
  `).all(groupId).map((row) => row.userId);
}

function requireGroupMembership(groupId, userId) {
  return db.prepare(`
    SELECT id, role
    FROM group_members
    WHERE groupId = ? AND userId = ?
  `).get(groupId, userId);
}

function getMatchedUserIds(userId) {
  return db.prepare(`
    SELECT DISTINCT
      CASE
        WHEN senderId = ? THEN receiverId
        ELSE senderId
      END AS partnerId
    FROM messages
    WHERE senderId = ? OR receiverId = ?
  `).all(userId, userId, userId).map((row) => row.partnerId);
}

router.post("/create", auth, (req, res) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const description = String(req.body?.description ?? "").trim();
    const goal = String(req.body?.goal ?? "").trim();
    const maxMembers = Math.min(6, Math.max(2, Number(req.body?.maxMembers ?? 6)));
    const invitedUserIds = Array.isArray(req.body?.invitedUserIds)
      ? req.body.invitedUserIds.map(Number).filter(Number.isInteger)
      : [];

    if (!name || !goal) {
      return res.status(400).json({ error: "Name and goal are required" });
    }

    const matchedUserIds = new Set(getMatchedUserIds(req.user.id));
    const invalidInvite = invitedUserIds.find((userId) => !matchedUserIds.has(userId));
    if (invalidInvite) {
      return res.status(400).json({ error: "Groups can only invite matched users" });
    }

    let inviteCode = createInviteCode();
    while (db.prepare("SELECT id FROM groups WHERE inviteCode = ?").get(inviteCode)) {
      inviteCode = createInviteCode();
    }

    const createdAt = new Date().toISOString();
    const groupResult = db.prepare(`
      INSERT INTO groups (name, description, goal, adminId, inviteCode, maxMembers, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, description || null, goal, req.user.id, inviteCode, maxMembers, createdAt);

    const groupId = Number(groupResult.lastInsertRowid);
    db.prepare(`
      INSERT INTO group_members (groupId, userId, role, joinedAt)
      VALUES (?, ?, 'admin', ?)
    `).run(groupId, req.user.id, createdAt);

    for (const invitedUserId of invitedUserIds.slice(0, maxMembers - 1)) {
      db.prepare(`
        INSERT OR IGNORE INTO group_members (groupId, userId, role, joinedAt)
        VALUES (?, ?, 'member', ?)
      `).run(groupId, invitedUserId, createdAt);

      createNotification(invitedUserId, {
        type: "new_match",
        title: "New gym group invite",
        body: `${name} is ready for you to join.`,
        link: "/groups",
        data: { groupId, inviteCode },
      });
    }

    const group = db.prepare(`
      SELECT *
      FROM groups
      WHERE id = ?
    `).get(groupId);

    return res.status(201).json(group);
  } catch {
    return res.status(500).json({ error: "Failed to create group" });
  }
});

router.post("/join", auth, (req, res) => {
  try {
    const inviteCode = String(req.body?.inviteCode ?? "").trim().toUpperCase();
    if (!inviteCode) {
      return res.status(400).json({ error: "Invite code is required" });
    }

    const group = db.prepare(`
      SELECT *
      FROM groups
      WHERE inviteCode = ?
    `).get(inviteCode);

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    const memberCount = db.prepare(`
      SELECT COUNT(*) AS count
      FROM group_members
      WHERE groupId = ?
    `).get(group.id)?.count ?? 0;

    if (memberCount >= group.maxMembers) {
      return res.status(400).json({ error: "This group is already full" });
    }

    db.prepare(`
      INSERT OR IGNORE INTO group_members (groupId, userId, role, joinedAt)
      VALUES (?, ?, 'member', ?)
    `).run(group.id, req.user.id, new Date().toISOString());

    return res.json({ success: true, group });
  } catch {
    return res.status(500).json({ error: "Failed to join group" });
  }
});

router.get("/my-groups", auth, (req, res) => {
  try {
    const groups = db.prepare(`
      SELECT g.*
      FROM groups g
      JOIN group_members gm ON gm.groupId = g.id
      WHERE gm.userId = ?
      ORDER BY datetime(g.createdAt) DESC
    `).all(req.user.id);

    const payload = groups.map((group) => {
      const members = db.prepare(`
        SELECT u.id, u.name, u.avatarUrl, gm.role, gm.joinedAt
        FROM group_members gm
        JOIN users u ON u.id = gm.userId
        WHERE gm.groupId = ?
        ORDER BY gm.role = 'admin' DESC, datetime(gm.joinedAt) ASC
      `).all(group.id);

      const recentActivity = db.prepare(`
        SELECT actionType, metadata, createdAt
        FROM activity_log
        WHERE userId IN (
          SELECT userId FROM group_members WHERE groupId = ?
        )
        ORDER BY datetime(createdAt) DESC
        LIMIT 5
      `).all(group.id);

      return {
        ...group,
        members,
        recentActivity,
      };
    });

    return res.json(payload);
  } catch {
    return res.status(500).json({ error: "Failed to load groups" });
  }
});

router.get("/:id/feed", auth, (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    const membership = requireGroupMembership(groupId, req.user.id);
    if (!membership) {
      return res.status(403).json({ error: "You are not in this group" });
    }

    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(25, Math.max(5, Number(req.query.pageSize ?? 15)));
    const offset = (page - 1) * pageSize;
    const memberIds = getGroupMemberIds(groupId);
    const placeholders = memberIds.map(() => "?").join(", ");

    const workoutFeed = memberIds.length
      ? db.prepare(`
          SELECT
            ws.id,
            ws.userId,
            u.name,
            'workout' AS type,
            ws.focusArea AS title,
            ws.workoutType AS detail,
            ws.createdAt
          FROM workout_sessions ws
          JOIN users u ON u.id = ws.userId
          WHERE ws.userId IN (${placeholders})
        `).all(...memberIds)
      : [];

    const activityFeed = memberIds.length
      ? db.prepare(`
          SELECT
            al.id,
            al.userId,
            u.name,
            al.actionType AS type,
            al.actionType AS title,
            al.metadata AS detail,
            al.createdAt
          FROM activity_log al
          JOIN users u ON u.id = al.userId
          WHERE al.userId IN (${placeholders})
        `).all(...memberIds)
      : [];

    const combined = [...workoutFeed, ...activityFeed]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(offset, offset + pageSize);

    return res.json({
      page,
      pageSize,
      feed: combined,
    });
  } catch {
    return res.status(500).json({ error: "Failed to load group feed" });
  }
});

router.post("/:id/challenge", auth, (req, res) => {
  try {
    const groupId = Number(req.params.id);
    const membership = requireGroupMembership(groupId, req.user.id);
    if (!membership || membership.role !== "admin") {
      return res.status(403).json({ error: "Only group admins can create challenges" });
    }

    const name = String(req.body?.name ?? "").trim();
    const description = String(req.body?.description ?? "").trim();
    const type = String(req.body?.type ?? "").trim();
    const endDate = String(req.body?.endDate ?? "").trim();
    const weeklyReset = req.body?.weeklyReset ? 1 : 0;

    if (!name || !type || !endDate) {
      return res.status(400).json({ error: "Challenge name, type, and end date are required" });
    }

    const result = db.prepare(`
      INSERT INTO group_challenges (groupId, name, description, type, endDate, weeklyReset, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(groupId, name, description || null, type, endDate, weeklyReset, new Date().toISOString());

    return res.status(201).json({
      id: Number(result.lastInsertRowid),
      groupId,
      name,
      description,
      type,
      endDate,
      weeklyReset: Boolean(weeklyReset),
    });
  } catch {
    return res.status(500).json({ error: "Failed to create group challenge" });
  }
});

router.get("/:id/leaderboard", auth, (req, res) => {
  try {
    const groupId = Number(req.params.id);
    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    const membership = requireGroupMembership(groupId, req.user.id);
    if (!membership) {
      return res.status(403).json({ error: "You are not in this group" });
    }

    const weeklyReset = String(req.query.weeklyReset ?? "") === "true";
    const users = db.prepare(`
      SELECT u.id, u.name, u.avatarUrl, u.xp, u.streak
      FROM group_members gm
      JOIN users u ON u.id = gm.userId
      WHERE gm.groupId = ?
      ORDER BY u.xp DESC, u.streak DESC, u.name ASC
    `).all(groupId);

    const workoutCounts = new Map(
      db.prepare(`
        SELECT userId, COUNT(*) AS count
        FROM workout_sessions
        WHERE userId IN (
          SELECT userId FROM group_members WHERE groupId = ?
        )
          ${weeklyReset ? "AND sessionDate >= date('now', '-7 day')" : ""}
        GROUP BY userId
      `).all(groupId).map((row) => [row.userId, row.count])
    );

    const leaderboard = users.map((user, index) => ({
      ...user,
      rank: index + 1,
      workouts: workoutCounts.get(user.id) ?? 0,
    }));

    return res.json({
      weeklyReset,
      leaderboard,
    });
  } catch {
    return res.status(500).json({ error: "Failed to load group leaderboard" });
  }
});

export default router;
