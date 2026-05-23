import "dotenv/config";
import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import fs from "fs";
import path from "path";
import { Server } from "socket.io";
import config from "./config.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import authRoutes from "./routes/auth.js";
import checkinRoutes from "./routes/checkin.js";
import userRoutes from "./routes/users.js";
import profileRoutes from "./routes/profile.js";
import matchRoutes from "./routes/matches.js";
import chatRoutes from "./routes/chat.js";
import reportRoutes from "./routes/report.js";
import uploadRoutes from "./routes/upload.js";
import coachChatRoutes from "./routes/coachChat.js";
import coachRoutes from "./routes/coach.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import workoutRoutes from "./routes/workouts.js";
import nutritionRoutes from "./routes/nutrition.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
const server = http.createServer(app);
const productionClientDir = path.resolve(process.cwd(), "dist", "public");
const avatarUploadsDir = path.resolve(process.cwd(), "server", "uploads", "avatars");
const foodUploadsDir = path.resolve(process.cwd(), "server", "uploads", "foods");

fs.mkdirSync(avatarUploadsDir, { recursive: true });
fs.mkdirSync(foodUploadsDir, { recursive: true });

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cookieParser());
app.use(express.json());
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

app.get("/api/health", (_, res) => res.json({ status: "OK" }));

app.use(errorHandler);

if (config.isProduction && fs.existsSync(productionClientDir)) {
  app.use(express.static(productionClientDir));

  app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
    res.sendFile(path.join(productionClientDir, "index.html"));
  });
}

const onlineUsers = new Map();

io.on("connection", (socket) => {
  socket.on("online", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("online-users", [...onlineUsers.keys()]);
  });

  socket.on("typing", ({ from, to }) => {
    const target = onlineUsers.get(to);
    if (target) {
      io.to(target).emit("typing", { from });
    }
  });

  socket.on("send-message", (message) => {
    const target = onlineUsers.get(message.receiverId);
    if (target) {
      io.to(target).emit("receive-message", message);
    }
  });

  socket.on("seen", ({ from, to }) => {
    const target = onlineUsers.get(from);
    if (target) {
      io.to(target).emit("seen", { by: to });
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    io.emit("online-users", [...onlineUsers.keys()]);
  });
});

if (process.env.NODE_ENV !== "test") {
  server.listen(config.port, () => {
    console.log(`Server + Socket running on http://localhost:${config.port}`);
  });
}

export { app, server };
