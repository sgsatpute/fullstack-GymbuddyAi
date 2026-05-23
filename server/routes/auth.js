import express from "express";
import bcrypt from "bcryptjs";
import config from "../config.js";
import db from "../db.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  authLimiter,
  passwordResetLimiter,
} from "../middleware/rateLimit.js";
import {
  cleanupExpiredAuthArtifacts,
  clearRefreshTokenCookie,
  createPasswordResetOtp,
  getPasswordResetExpiryIso,
  getStoredRefreshTokenRecord,
  hashValue,
  issueSession,
  normalizeEmail,
  revokeAllUserRefreshTokens,
  revokeRefreshTokenById,
  revokeRefreshTokenFamily,
} from "../utils/authSession.js";
import { sendPasswordResetOtpEmail } from "../utils/mailer.js";

const router = express.Router();

function getRequestMeta(req) {
  return {
    ip: req.ip,
    userAgent: req.get("user-agent") ?? "unknown",
  };
}

function validatePassword(password) {
  return typeof password === "string" && password.trim().length >= 8;
}

function validateEmailFormat(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

router.post("/register", authLimiter, asyncHandler(async (req, res) => {
  cleanupExpiredAuthArtifacts();

  const name = (req.body.name ?? "").trim();
  const email = normalizeEmail(req.body.email);
  const password = req.body.password ?? "";

  if (!name || !email || !password) {
    throw new AppError("All fields required", 400, "VALIDATION_ERROR");
  }

  if (!validateEmailFormat(email)) {
    throw new AppError("Invalid email format", 400, "VALIDATION_ERROR");
  }

  if (!validatePassword(password)) {
    throw new AppError("Password must be at least 8 characters long", 400, "VALIDATION_ERROR");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let result;
  try {
    result = db.prepare(`
      INSERT INTO users (name, email, passwordHash)
      VALUES (?, ?, ?)
    `).run(name, email, passwordHash);
  } catch (error) {
    if (error.message.includes("UNIQUE")) {
      throw new AppError("Email already exists", 409, "DATABASE_ERROR");
    }
    throw error;
  }

  const user = db.prepare(`
    SELECT id, name, email
    FROM users
    WHERE id = ?
  `).get(result.lastInsertRowid);

  const session = issueSession({
    user,
    res,
    requestMeta: getRequestMeta(req),
  });

  res.status(201).json({
    success: true,
    data: { token: session.token },
    message: "Registration successful"
  });
}));

router.post("/login", authLimiter, asyncHandler(async (req, res) => {
  cleanupExpiredAuthArtifacts();

  const email = normalizeEmail(req.body.email);
  const password = req.body.password ?? "";

  if (!email || !password) {
    throw new AppError("Email and password required", 400, "VALIDATION_ERROR");
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) {
    throw new AppError("Invalid credentials", 401, "AUTHENTICATION_ERROR");
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError("Invalid credentials", 401, "AUTHENTICATION_ERROR");
  }

  db.prepare(`
    UPDATE users
    SET xp = COALESCE(xp, 0) + 2,
        level = CAST((COALESCE(xp, 0) + 2) / 100 AS INTEGER) + 1
    WHERE id = ?
  `).run(user.id);

  const session = issueSession({
    user,
    res,
    requestMeta: getRequestMeta(req),
  });

  res.json({
    success: true,
    data: { token: session.token },
    message: "Login successful"
  });
}));

router.post("/refresh", authLimiter, (req, res) => {
  cleanupExpiredAuthArtifacts();

  const refreshToken = req.cookies?.[config.refreshCookieName];
  if (!refreshToken) {
    return res.status(401).json({ error: "Missing refresh token" });
  }

  const tokenRecord = getStoredRefreshTokenRecord(refreshToken);
  if (!tokenRecord) {
    clearRefreshTokenCookie(res);
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  if (tokenRecord.revokedAt) {
    revokeRefreshTokenFamily(tokenRecord.userId, tokenRecord.tokenFamily);
    clearRefreshTokenCookie(res);
    return res.status(401).json({ error: "Refresh token has been revoked" });
  }

  if (new Date(tokenRecord.expiresAt) <= new Date()) {
    revokeRefreshTokenById(tokenRecord.id);
    clearRefreshTokenCookie(res);
    return res.status(401).json({ error: "Refresh token expired" });
  }

  const session = issueSession({
    user: {
      id: tokenRecord.userId,
      email: tokenRecord.email,
      name: tokenRecord.name,
    },
    res,
    requestMeta: getRequestMeta(req),
    rotateFromToken: tokenRecord,
  });

  res.json({ token: session.token });
});

router.post("/logout", (req, res) => {
  const refreshToken = req.cookies?.[config.refreshCookieName];

  if (refreshToken) {
    const tokenRecord = getStoredRefreshTokenRecord(refreshToken);
    if (tokenRecord) {
      revokeRefreshTokenById(tokenRecord.id);
    }
  }

  clearRefreshTokenCookie(res);
  res.json({ success: true });
});

router.post("/password-reset/request", passwordResetLimiter, async (req, res) => {
  cleanupExpiredAuthArtifacts();

  const email = normalizeEmail(req.body.email);
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const genericResponse = {
    success: true,
    message: "If an account exists for that email, a reset code has been sent.",
  };

  const user = db.prepare(`
    SELECT id, email, name
    FROM users
    WHERE email = ?
  `).get(email);

  if (!user) {
    return res.json(genericResponse);
  }

  db.prepare(`
    DELETE FROM password_reset_otps
    WHERE userId = ?
  `).run(user.id);

  const otp = createPasswordResetOtp();

  db.prepare(`
    INSERT INTO password_reset_otps (userId, codeHash, expiresAt)
    VALUES (?, ?, ?)
  `).run(user.id, hashValue(otp), getPasswordResetExpiryIso());

  await sendPasswordResetOtpEmail({
    to: user.email,
    name: user.name,
    otp,
  });

  res.json(genericResponse);
});

router.post("/password-reset/confirm", passwordResetLimiter, async (req, res) => {
  cleanupExpiredAuthArtifacts();

  const email = normalizeEmail(req.body.email);
  const otp = String(req.body.otp ?? "").trim();
  const newPassword = req.body.newPassword ?? "";

  if (!email || !otp || !newPassword) {
    return res.status(400).json({
      error: "Email, OTP, and new password are required",
    });
  }

  if (!validatePassword(newPassword)) {
    return res.status(400).json({
      error: "Password must be at least 8 characters long",
    });
  }

  const user = db.prepare(`
    SELECT id, email
    FROM users
    WHERE email = ?
  `).get(email);

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired reset code" });
  }

  const activeOtp = db.prepare(`
    SELECT id, codeHash, expiresAt, attempts
    FROM password_reset_otps
    WHERE userId = ? AND consumedAt IS NULL
    ORDER BY createdAt DESC
    LIMIT 1
  `).get(user.id);

  if (!activeOtp) {
    return res.status(400).json({ error: "Invalid or expired reset code" });
  }

  if (new Date(activeOtp.expiresAt) <= new Date()) {
    db.prepare(`
      UPDATE password_reset_otps
      SET consumedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(activeOtp.id);
    return res.status(400).json({ error: "Invalid or expired reset code" });
  }

  if (activeOtp.attempts >= 5) {
    db.prepare(`
      UPDATE password_reset_otps
      SET consumedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(activeOtp.id);
    return res.status(429).json({ error: "Too many invalid reset attempts" });
  }

  if (hashValue(otp) !== activeOtp.codeHash) {
    db.prepare(`
      UPDATE password_reset_otps
      SET attempts = attempts + 1
      WHERE id = ?
    `).run(activeOtp.id);
    return res.status(400).json({ error: "Invalid or expired reset code" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  db.prepare(`
    UPDATE users
    SET passwordHash = ?
    WHERE id = ?
  `).run(passwordHash, user.id);

  db.prepare(`
    UPDATE password_reset_otps
    SET consumedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(activeOtp.id);

  revokeAllUserRefreshTokens(user.id);
  clearRefreshTokenCookie(res);

  res.json({ success: true });
});

export default router;
