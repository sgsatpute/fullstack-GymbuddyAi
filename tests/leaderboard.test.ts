import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server/index.js";
import db from "../server/db.js";

describe("Leaderboard API", () => {
  it("should return leaderboard without auth (401)", async () => {
    const res = await request(app).get("/api/leaderboard");
    expect(res.status).toBe(401);
  });

  it("should return top 10 users with valid token", async () => {
    // 1. Create a user
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
    const token = regRes.body.data.token;

    // 2. Insert multiple users directly into database with different XP values
    for (let i = 1; i <= 15; i++) {
      db.prepare(`
        INSERT INTO users (name, email, passwordHash, xp, streak, consistency)
        VALUES (?, ?, 'hash', ?, 0, 0)
      `).run(`User ${i}`, `user${i}@example.com`, i * 10);
    }

    // 3. Request leaderboard
    const res = await request(app)
      .get("/api/leaderboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("users");
    expect(res.body).toHaveProperty("leaders");
    expect(res.body.users.length).toBeLessThanOrEqual(50);
    expect(res.body.total).toBe(16);
  });

  it("should return users sorted by score descending", async () => {
    // 1. Create user and get token
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Test User 2",
        email: "test2@example.com",
        password: "password123",
      });
    const token = regRes.body.data.token;

    // 2. Insert users with different XP
    db.prepare("INSERT INTO users (name, email, passwordHash, xp) VALUES ('Low XP', 'low@example.com', 'hash', 10)").run();
    db.prepare("INSERT INTO users (name, email, passwordHash, xp) VALUES ('High XP', 'high@example.com', 'hash', 100)").run();
    db.prepare("INSERT INTO users (name, email, passwordHash, xp) VALUES ('Mid XP', 'mid@example.com', 'hash', 50)").run();

    // 3. Get leaderboard
    const res = await request(app)
      .get("/api/leaderboard")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    const users = res.body.users;
    
    // Find positions of the users we inserted
    const highUser = users.find((u: any) => u.name === "High XP");
    const midUser = users.find((u: any) => u.name === "Mid XP");
    const lowUser = users.find((u: any) => u.name === "Low XP");

    expect(highUser.rank).toBeLessThan(midUser.rank);
    expect(midUser.rank).toBeLessThan(lowUser.rank);
    
    // Verify sorting order directly
    for (let i = 0; i < users.length - 1; i++) {
      expect(users[i].xp).toBeGreaterThanOrEqual(users[i + 1].xp);
    }
  });
});
