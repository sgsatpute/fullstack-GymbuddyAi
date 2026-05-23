import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../server/index.js";

describe("Authentication API", () => {
  const testUser = {
    name: "John Doe",
    email: "john@example.com",
    password: "password123",
  };

  it("should register a new user successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("token");
  });

  it("should reject registration with duplicate email", async () => {
    // Register first user
    await request(app)
      .post("/api/auth/register")
      .send(testUser);

    // Try registering again with same email
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Jane Doe",
        email: testUser.email,
        password: "password456",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("message");
  });

  it("should reject registration with invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Jane Doe",
        email: "invalidemail",
        password: "password123",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("email");
  });

  it("should reject registration with password less than 8 chars", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "short",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain("Password");
  });

  it("should login successfully with correct credentials", async () => {
    // Register first
    await request(app)
      .post("/api/auth/register")
      .send(testUser);

    // Login
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("token");
  });

  it("should reject login with wrong password", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(testUser);

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: "wrongpassword",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("message");
  });

  it("should reject login with non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "nonexistent@example.com",
        password: "somepassword",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty("message");
  });

  it("should return JWT token on successful login", async () => {
    await request(app)
      .post("/api/auth/register")
      .send(testUser);

    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTypeOf("string");
    // Verify it is a valid looking token (3 segments separated by dots)
    expect(res.body.data.token.split(".").length).toBe(3);
  });
});
