import db from "../db.js";

const realtimeState = {
  io: null,
  onlineUsers: new Map(),
};

function normalizeUserId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function setRealtimeServer(io, onlineUsers = new Map()) {
  realtimeState.io = io;
  realtimeState.onlineUsers = onlineUsers;
}

export function getRealtimeServer() {
  return realtimeState.io;
}

export function attachOnlineUser(userId, socketId) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || !socketId) {
    return null;
  }

  realtimeState.onlineUsers.set(normalizedUserId, socketId);
  return normalizedUserId;
}

export function detachOnlineSocket(socketId) {
  for (const [userId, storedSocketId] of realtimeState.onlineUsers.entries()) {
    if (storedSocketId === socketId) {
      realtimeState.onlineUsers.delete(userId);
      return userId;
    }
  }

  return null;
}

export function getOnlineUsers() {
  return realtimeState.onlineUsers;
}

export function isUserOnline(userId) {
  return realtimeState.onlineUsers.has(Number(userId));
}

export function getOnlineStatusMap(ids = []) {
  return ids.reduce((accumulator, id) => {
    const normalizedId = Number(id);
    if (Number.isInteger(normalizedId)) {
      accumulator[normalizedId] = isUserOnline(normalizedId);
    }
    return accumulator;
  }, {});
}

export function emitToUser(userId, eventName, payload) {
  const socketId = realtimeState.onlineUsers.get(Number(userId));
  if (!realtimeState.io || !socketId) {
    return false;
  }

  realtimeState.io.to(socketId).emit(eventName, payload);
  return true;
}

export function emitToUsers(userIds, eventName, payload) {
  for (const userId of userIds) {
    emitToUser(userId, eventName, payload);
  }
}

export function broadcast(eventName, payload) {
  if (!realtimeState.io) {
    return false;
  }

  realtimeState.io.emit(eventName, payload);
  return true;
}

export function createNotification(userId, notification) {
  const createdAt = new Date().toISOString();
  const payload = {
    type: notification.type ?? "message",
    title: notification.title ?? "GymBuddy AI",
    body: notification.body ?? "",
    link: notification.link ?? null,
    data: notification.data ?? null,
    createdAt,
  };

  const result = db.prepare(`
    INSERT INTO notifications (userId, type, title, body, link, data, read, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    userId,
    payload.type,
    payload.title,
    payload.body,
    payload.link,
    payload.data ? JSON.stringify(payload.data) : null,
    createdAt
  );

  emitToUser(userId, "notification", {
    id: Number(result.lastInsertRowid),
    ...payload,
    read: 0,
  });

  return {
    id: Number(result.lastInsertRowid),
    userId,
    read: 0,
    ...payload,
  };
}
