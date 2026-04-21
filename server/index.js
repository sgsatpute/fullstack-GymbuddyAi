import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/users.js";
import matchRoutes from "./routes/matches.js";
import chatRoutes from "./routes/chat.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

const PORT = 5001;

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/chat", chatRoutes);

app.get("/api/health", (_, res) => res.json({ status: "OK" }));

/* ======================
   SOCKET STATE
   ====================== */
const onlineUsers = new Map();

io.on("connection", (socket) => {

  // USER ONLINE
  socket.on("online", (userId) => {
    onlineUsers.set(userId, socket.id);
    io.emit("online-users", [...onlineUsers.keys()]);
  });

  // TYPING INDICATOR
  socket.on("typing", ({ from, to }) => {
    const target = onlineUsers.get(to);
    if (target) {
      io.to(target).emit("typing", { from });
    }
  });

  // SEND MESSAGE (REAL TIME)
  socket.on("send-message", (msg) => {
    const target = onlineUsers.get(msg.receiverId);
    if (target) {
      io.to(target).emit("receive-message", msg);
    }
  });

  // ✅ READ RECEIPT (SEEN)
  socket.on("seen", ({ from, to }) => {
    const target = onlineUsers.get(from);
    if (target) {
      io.to(target).emit("seen", { by: to });
    }
  });

  // USER DISCONNECT
  socket.on("disconnect", () => {
    for (const [uid, sid] of onlineUsers.entries()) {
      if (sid === socket.id) {
        onlineUsers.delete(uid);
        break;
      }
    }
    io.emit("online-users", [...onlineUsers.keys()]);
  });
});

server.listen(PORT, () => {
  console.log(`🏋️ Server + Socket running on http://localhost:${PORT}`);
});
