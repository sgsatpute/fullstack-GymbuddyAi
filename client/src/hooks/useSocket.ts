import { useEffect } from "react";
import { io } from "socket.io-client";
import { getCurrentUserId, getStoredToken, hasStoredToken } from "../utils/auth";

const socket = io("/", {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
});

function syncAuth() {
  socket.auth = {
    token: getStoredToken() ?? "",
  };
}

export function ensureSocketConnection() {
  if (!hasStoredToken()) {
    return socket;
  }

  syncAuth();
  if (!socket.connected) {
    socket.connect();
  }

  const userId = getCurrentUserId();
  if (userId) {
    socket.emit("presence:online", userId);
    socket.emit("online", userId);
  }

  return socket;
}

export function disconnectSocket() {
  socket.disconnect();
}

export function emitTyping(from: number, to: number, typing = true) {
  ensureSocketConnection();
  socket.emit(typing ? "typing-start" : "typing-stop", { from, to });
}

export function emitSeen(by: number, withUserId: number) {
  ensureSocketConnection();
  socket.emit("messages-seen", { by, withUserId });
  socket.emit("seen", { from: withUserId, to: by });
}

export function onPartnerActivity(callback: (payload: any) => void) {
  socket.on("partner-activity", callback);
  return () => socket.off("partner-activity", callback);
}

export function onNotification(callback: (payload: any) => void) {
  socket.on("notification", callback);
  return () => socket.off("notification", callback);
}

export function onLeaderboardUpdate(callback: (payload: any) => void) {
  socket.on("leaderboard-update", callback);
  return () => socket.off("leaderboard-update", callback);
}

export function useSocket() {
  useEffect(() => {
    ensureSocketConnection();
    return () => {
      socket.off("connect_error");
    };
  }, []);

  return socket;
}

export { socket };
