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
import matchRoutes from "./routes/matches.js";
import chatRoutes from "./routes/chat.js";
import coachRoutes from "./routes/coach.js";
import leaderboardRoutes from "./routes/leaderboard.js";

const app = express();
const server = http.createServer(app);
const productionClientDir = path.resolve(process.cwd(), "dist", "public");

const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(cookieParser());
app.use(express.json());
app.use("/api", apiLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/checkin", checkinRoutes);
app.use("/api/users", userRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/coach", coachRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

app.get("/api/health", (_, res) => res.json({ status: "OK" }));

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

server.listen(config.port, () => {
  console.log(`Server + Socket running on http://localhost:${config.port}`);
});
