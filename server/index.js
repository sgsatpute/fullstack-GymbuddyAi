import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { Server } from "socket.io";
import config from "./config.js";
import db from "./db.js";
import authRoutes from "./routes/auth.js";
import checkinRoutes from "./routes/checkin.js";
import chatRoutes from "./routes/chat.js";
import coachChatRoutes from "./routes/coachChat.js";
import coachRoutes from "./routes/coach.js";
import gamificationRoutes from "./routes/gamification.js";
import groupRoutes from "./routes/groups.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import matchRoutes from "./routes/matches.js";
import notificationRoutes from "./routes/notifications.js";
import nutritionRoutes from "./routes/nutrition.js";
import profileRoutes from "./routes/profile.js";
import reportRoutes from "./routes/report.js";
import uploadRoutes from "./routes/upload.js";
import userRoutes from "./routes/users.js";
import workoutRoutes from "./routes/workouts.js";
import errorHandler from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import requestLogger from "./middleware/requestLogger.js";
import {
  attachOnlineUser,
  broadcast,
  detachOnlineSocket,
  emitToUser,
  getOnlineUsers,
  setRealtimeServer,
} from "./utils/realtime.js";

const app = express();
const server = http.createServer(app);

function isOriginAllowed(origin) {
  if (!origin) {
    return true;
  }

  if (config.corsOrigins.includes(origin)) {
    return true;
  }

  if (!config.isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
    return true;
  }

  return false;
}

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin));
    },
    credentials: true,
  },
});

const productionClientDir = path.resolve(process.cwd(), "dist", "public");
const avatarUploadsDir = path.resolve(process.cwd(), "server", "uploads", "avatars");
const foodUploadsDir = path.resolve(process.cwd(), "server", "uploads", "foods");
const packageJson = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")
);
const onlineUsers = new Map();
const typingTimers = new Map();

setRealtimeServer(io, onlineUsers);
fs.mkdirSync(avatarUploadsDir, { recursive: true });
fs.mkdirSync(foodUploadsDir, { recursive: true });

function updatePresence(userId, fields) {
  const entries = Object.entries(fields);
  const setters = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value);

  db.prepare(`
    UPDATE users
    SET ${setters}
    WHERE id = ?
  `).run(...values, userId);
}

function scheduleTypingStop(from, to) {
  const key = `${from}:${to}`;
  const existing = typingTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }

  typingTimers.set(
    key,
    setTimeout(() => {
      emitToUser(to, "typing-stop", { from });
      emitToUser(to, "typing", { from, typing: false });
      typingTimers.delete(key);
    }, 3000)
  );
}

app.use(cookieParser());
app.use((req, res, next) => {
  const origin = req.get("origin");

  if (origin && isOriginAllowed(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});
app.use(express.json());
app.use(requestLogger);
app.use("/api", apiLimiter);
app.use("/avatars", express.static(avatarUploadsDir));
app.use("/foods", express.static(foodUploadsDir));

app.use("/api/auth", authRoutes);
app.use("/api", checkinRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/coach", coachChatRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/notifications", notificationRoutes);

function sendHealth(_req, res) {
  let database = "disconnected";
  try {
    db.prepare("SELECT 1").get();
    database = "connected";
  } catch {
    database = "disconnected";
  }

  res.json({
    status: "ok",
    version: packageJson.version,
    uptime: Math.floor(process.uptime()),
    database,
    timestamp: new Date().toISOString(),
  });
}

app.get("/api/health", sendHealth);
app.get("/health", sendHealth);

app.use(errorHandler);

if (config.isProduction && fs.existsSync(productionClientDir)) {
  app.use(express.static(productionClientDir));
  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(productionClientDir, "index.html"));
  });
}

io.on("connection", (socket) => {
  function registerOnline(userId) {
    const normalizedUserId = attachOnlineUser(userId, socket.id);
    if (!normalizedUserId) {
      return;
    }

    socket.data.userId = normalizedUserId;
    const now = new Date().toISOString();
    updatePresence(normalizedUserId, {
      lastActiveAt: now,
      lastSeenAt: now,
    });

    broadcast("user-online", { userId: normalizedUserId, online: true });
    io.emit("online-users", [...getOnlineUsers().keys()]);
  }

  socket.on("online", registerOnline);
  socket.on("presence:online", registerOnline);

  socket.on("typing-start", ({ from, to }) => {
    if (!from || !to) {
      return;
    }
    emitToUser(to, "typing-start", { from });
    emitToUser(to, "typing", { from, typing: true });
    scheduleTypingStop(from, to);
  });

  socket.on("typing-stop", ({ from, to }) => {
    if (!from || !to) {
      return;
    }

    emitToUser(to, "typing-stop", { from });
    emitToUser(to, "typing", { from, typing: false });
    const key = `${from}:${to}`;
    const existing = typingTimers.get(key);
    if (existing) {
      clearTimeout(existing);
      typingTimers.delete(key);
    }
  });

  socket.on("typing", ({ from, to }) => {
    if (!from || !to) {
      return;
    }
    emitToUser(to, "typing-start", { from });
    emitToUser(to, "typing", { from, typing: true });
    scheduleTypingStop(from, to);
  });

  // Triggered after a direct message is saved and should be delivered live.
  socket.on("send-message", (message) => {
    if (!message?.receiverId) {
      return;
    }

    emitToUser(message.receiverId, "receive-message", message);
    emitToUser(message.senderId, "message-delivered", {
      receiverId: message.receiverId,
      deliveredAt: new Date().toISOString(),
    });
  });

  // Triggered when a conversation opens and all pending messages should become seen.
  socket.on("messages-seen", ({ by, withUserId }) => {
    if (!by || !withUserId) {
      return;
    }

    const seenAt = new Date().toISOString();
    db.prepare(`
      UPDATE messages
      SET seen = 1, seenAt = ?
      WHERE receiverId = ? AND senderId = ? AND COALESCE(seen, 0) = 0
    `).run(seenAt, by, withUserId);

    emitToUser(withUserId, "messages-seen", {
      by,
      withUserId,
      seenAt,
    });
    emitToUser(withUserId, "seen", { by });
  });

  socket.on("seen", ({ from, to }) => {
    if (!from || !to) {
      return;
    }

    emitToUser(from, "messages-seen", {
      by: to,
      withUserId: from,
      seenAt: new Date().toISOString(),
    });
    emitToUser(from, "seen", { by: to });
  });

  socket.on("join-group", (groupId) => {
    if (groupId) {
      socket.join(`group:${groupId}`);
    }
  });

  // Triggered when a saved group message or activity should fan out to members.
  socket.on("group-message", ({ groupId, message }) => {
    if (groupId && message) {
      io.to(`group:${groupId}`).emit("group-message", message);
    }
  });

  socket.on("disconnect", () => {
    const userId = detachOnlineSocket(socket.id);
    if (!userId) {
      return;
    }

    updatePresence(userId, {
      lastSeenAt: new Date().toISOString(),
    });

    broadcast("user-online", { userId, online: false });
    io.emit("online-users", [...getOnlineUsers().keys()]);
  });
});

if (process.env.NODE_ENV !== "test") {
  server.listen(config.port, () => {
    console.log(`Server + Socket running on http://localhost:${config.port}`);
  });
}

export { app, io, onlineUsers, server };
