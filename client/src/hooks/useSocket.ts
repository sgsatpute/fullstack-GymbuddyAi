import { io } from "socket.io-client";
import { getStoredToken } from "../utils/auth";
import { getSocketUrl } from "../utils/runtime";

export const socket = io(getSocketUrl(), {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 8000,
  withCredentials: true,
  auth: (callback) => {
    callback({ token: getStoredToken() });
  },
});

type Unsubscribe = () => void;

function subscribe<T>(eventName: string, handler: (payload: T) => void): Unsubscribe {
  socket.on(eventName, handler);
  return () => socket.off(eventName, handler);
}

export function connectSocket() {
  socket.auth = { token: getStoredToken() };
  if (!socket.connected) {
    socket.connect();
  }
}

export function onPartnerActivity(handler: (payload: unknown) => void) {
  return subscribe("partner-activity", handler);
}

export function onNotification(handler: (payload: unknown) => void) {
  return subscribe("notification", handler);
}

export function onLeaderboardUpdate(handler: (payload: unknown) => void) {
  return subscribe("leaderboard-update", handler);
}

export function emitTyping(from: number, to: number, typing = true) {
  socket.emit(typing ? "typing-start" : "typing-stop", { from, to });
}

export function emitSeen(by: number, withUserId: number) {
  socket.emit("messages-seen", { by, withUserId });
}
