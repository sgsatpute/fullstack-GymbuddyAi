/**
 * PROMPT 9: Real-time Features
 * Presence system, typing indicators, read receipts, notifications
 * Uses Socket.io
 */

import db from "../db.js";

export class RealtimeManager {
  constructor(io) {
    this.io = io;
    this.userSessions = new Map(); // userId -> { socketId, lastSeen, status }
    this.typingUsers = new Set(); // userId:conversationId
  }

  /**
   * User comes online
   */
  userOnline(userId, socketId) {
    this.userSessions.set(userId, {
      socketId,
      lastSeen: new Date().toISOString(),
      status: "online",
    });

    // Broadcast to all connected users
    this.io.emit("user:online", { userId, timestamp: new Date().toISOString() });

    // Update database
    db.prepare("UPDATE users SET lastCheckinTime = ? WHERE id = ?").run(
      new Date().toISOString(),
      userId
    );
  }

  /**
   * User goes offline
   */
  userOffline(userId) {
    const session = this.userSessions.get(userId);
    if (session) {
      session.status = "idle";
      session.lastSeen = new Date().toISOString();

      this.io.emit("user:offline", {
        userId,
        lastSeen: session.lastSeen,
      });
    }
  }

  /**
   * Get user online status
   */
  getUserStatus(userId) {
    const session = this.userSessions.get(userId);
    if (!session) return "offline";
    return session.status;
  }

  /**
   * Broadcast typing indicator
   */
  userTyping(userId, conversationId) {
    const typingKey = `${userId}:${conversationId}`;
    this.typingUsers.add(typingKey);

    this.io.to(`conversation:${conversationId}`).emit("user:typing", {
      userId,
      typing: true,
    });

    // Auto-clear after 3 seconds
    setTimeout(() => {
      this.typingUsers.delete(typingKey);
      this.io.to(`conversation:${conversationId}`).emit("user:typing", {
        userId,
        typing: false,
      });
    }, 3000);
  }

  /**
   * Mark message as read
   */
  markMessageRead(messageId, readBy) {
    db.prepare(
      "UPDATE messages SET seen = 1, readAt = ? WHERE id = ? AND receiverId = ?"
    ).run(new Date().toISOString(), messageId, readBy);

    // Broadcast read receipt
    const message = db.prepare("SELECT senderId, receiverId FROM messages WHERE id = ?").get(messageId);

    this.io.to(`user:${message.senderId}`).emit("message:read", {
      messageId,
      readBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send notification to user
   */
  notifyUser(userId, notification) {
    const session = this.userSessions.get(userId);
    if (session) {
      this.io.to(session.socketId).emit("notification", {
        ...notification,
        timestamp: new Date().toISOString(),
      });
    }

    // Save to database for history
    db.prepare(`
      INSERT INTO notifications (userId, type, message, data, read, createdAt)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(
      userId,
      notification.type,
      notification.message,
      JSON.stringify(notification.data || {}),
      new Date().toISOString()
    );
  }

  /**
   * Broadcast activity update (leaderboard change, level up, etc.)
   */
  broadcastActivity(activity) {
    this.io.emit("activity:broadcast", {
      ...activity,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get online users
   */
  getOnlineUsers() {
    const onlineUsers = [];
    this.userSessions.forEach((session, userId) => {
      if (session.status === "online") {
        onlineUsers.push({
          userId,
          lastSeen: session.lastSeen,
        });
      }
    });
    return onlineUsers;
  }
}

/**
 * Initialize Socket.io event handlers
 */
export function initializeRealtimeHandlers(io) {
  const realtimeManager = new RealtimeManager(io);

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // User authentication and online status
    socket.on("user:authenticate", (userId) => {
      socket.join(`user:${userId}`);
      socket.join(`notifications:${userId}`);
      realtimeManager.userOnline(userId, socket.id);
      console.log(`[Socket] User ${userId} authenticated`);
    });

    // Chat room joining
    socket.on("chat:join", (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      socket.broadcast.to(`conversation:${conversationId}`).emit("chat:user-joined", {
        timestamp: new Date().toISOString(),
      });
    });

    // Message received
    socket.on("message:send", (data) => {
      const { conversationId, messageId } = data;
      socket.broadcast.to(`conversation:${conversationId}`).emit("message:new", {
        messageId,
        ...data,
        timestamp: new Date().toISOString(),
      });
    });

    // Typing indicator
    socket.on("user:typing", (data) => {
      const { userId, conversationId } = data;
      realtimeManager.userTyping(userId, conversationId);
    });

    // Message read receipt
    socket.on("message:read", (data) => {
      const { messageId, readBy } = data;
      realtimeManager.markMessageRead(messageId, readBy);
    });

    // Leaderboard update
    socket.on("leaderboard:update", (data) => {
      io.emit("leaderboard:updated", data);
    });

    // Match event
    socket.on("match:new", (data) => {
      const { userId, matchUserId } = data;
      socket.broadcast.to(`user:${userId}`).emit("notification", {
        type: "match",
        message: "You have a new match!",
        data,
      });
      socket.broadcast.to(`user:${matchUserId}`).emit("notification", {
        type: "match",
        message: "You have a new match!",
        data,
      });
    });

    // Level up notification
    socket.on("user:level-up", (data) => {
      const { userId, newLevel } = data;
      io.emit("activity:broadcast", {
        type: "level-up",
        userId,
        newLevel,
        message: `${data.userName} reached Level ${newLevel}! 🚀`,
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return realtimeManager;
}

export default RealtimeManager;
