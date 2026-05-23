import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server/index.js";
import db from "../server/db.js";

describe("Messages API", () => {
  it("should send message successfully", async () => {
    // 1. Register two users
    const resA = await request(app)
      .post("/api/auth/register")
      .send({
        name: "User A",
        email: "usera@example.com",
        password: "password123",
      });
    const tokenA = resA.body.data.token;

    const resB = await request(app)
      .post("/api/auth/register")
      .send({
        name: "User B",
        email: "userb@example.com",
        password: "password123",
      });
    const userBId = db.prepare("SELECT id FROM users WHERE email = 'userb@example.com'").get().id;

    // 2. User A sends message to User B
    const sendRes = await request(app)
      .post(`/api/chat/${userBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ message: "Hello User B!" });

    expect(sendRes.status).toBe(200);
    expect(sendRes.body).toHaveProperty("ok", true);

    // Verify message exists in DB
    const dbMsg = db.prepare("SELECT * FROM messages WHERE senderId = ? AND receiverId = ?").get(
      db.prepare("SELECT id FROM users WHERE email = 'usera@example.com'").get().id,
      userBId
    );
    expect(dbMsg).toBeDefined();
    expect(dbMsg.message).toBe("Hello User B!");
  });

  it("should get message history between two users", async () => {
    // 1. Register User A and User B
    const resA = await request(app)
      .post("/api/auth/register")
      .send({
        name: "User C",
        email: "userc@example.com",
        password: "password123",
      });
    const tokenA = resA.body.data.token;
    const userCId = db.prepare("SELECT id FROM users WHERE email = 'userc@example.com'").get().id;

    await request(app)
      .post("/api/auth/register")
      .send({
        name: "User D",
        email: "userd@example.com",
        password: "password123",
      });
    const userDId = db.prepare("SELECT id FROM users WHERE email = 'userd@example.com'").get().id;

    // 2. Insert messages directly
    db.prepare("INSERT INTO messages (senderId, receiverId, message) VALUES (?, ?, 'First message')").run(userCId, userDId);
    db.prepare("INSERT INTO messages (senderId, receiverId, message) VALUES (?, ?, 'Second message')").run(userDId, userCId);

    // 3. Fetch history as User A (User C)
    const historyRes = await request(app)
      .get(`/api/chat/${userDId}`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body).toHaveProperty("messages");
    expect(historyRes.body.messages.length).toBe(2);
    expect(historyRes.body.messages[0].message).toBe("First message");
    expect(historyRes.body.messages[1].message).toBe("Second message");
    expect(historyRes.body).toHaveProperty("participant");
    expect(historyRes.body.participant.name).toBe("User D");
  });

  it("should reject sending empty message", async () => {
    const resA = await request(app)
      .post("/api/auth/register")
      .send({
        name: "User E",
        email: "usere@example.com",
        password: "password123",
      });
    const tokenA = resA.body.data.token;

    await request(app)
      .post("/api/auth/register")
      .send({
        name: "User F",
        email: "userf@example.com",
        password: "password123",
      });
    const userFId = db.prepare("SELECT id FROM users WHERE email = 'userf@example.com'").get().id;

    // Try to send empty message
    const sendRes = await request(app)
      .post(`/api/chat/${userFId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ message: "" });

    expect(sendRes.status).toBe(400);
    expect(sendRes.body).toHaveProperty("error");
  });
});
