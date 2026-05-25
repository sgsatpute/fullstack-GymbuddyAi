import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config.js";
import db from "../db.js";

function toIsoAfterDays(days) {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry.toISOString();
}

function toIsoAfterMinutes(minutes) {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + minutes);
  return expiry.toISOString();
}

export function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(email) {
  return (email ?? "").trim().toLowerCase();
}

export function createAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.accessTokenTtl }
  );
}

export function createPasswordResetOtp() {
  const max = 10 ** config.passwordResetOtpLength;
  const min = 10 ** (config.passwordResetOtpLength - 1);
  return String(crypto.randomInt(min, max));
}

export function getPasswordResetExpiryIso() {
  return toIsoAfterMinutes(config.passwordResetOtpTtlMinutes);
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString("hex");
}

function getRefreshCookieOptions() {
  return {
    httpOnly: true,
    sameSite: config.refreshCookieSameSite,
    secure: config.isProduction,
    path: "/api/auth",
    maxAge: config.refreshTokenDays * 24 * 60 * 60 * 1000,
  };
}

export function setRefreshTokenCookie(res, token) {
  res.cookie(config.refreshCookieName, token, getRefreshCookieOptions());
}

export function clearRefreshTokenCookie(res) {
  res.clearCookie(config.refreshCookieName, {
    ...getRefreshCookieOptions(),
    maxAge: undefined,
  });
}

export function cleanupExpiredAuthArtifacts() {
  const now = new Date().toISOString();

  db.prepare(`
    DELETE FROM refresh_tokens
    WHERE expiresAt <= ?
  `).run(now);

  db.prepare(`
    DELETE FROM password_reset_otps
    WHERE expiresAt <= ? OR consumedAt IS NOT NULL
  `).run(now);
}

export function revokeRefreshTokenById(tokenId, replacedByTokenHash = null) {
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE refresh_tokens
    SET revokedAt = COALESCE(revokedAt, ?),
        replacedByTokenHash = COALESCE(?, replacedByTokenHash),
        lastUsedAt = ?
    WHERE id = ?
  `).run(now, replacedByTokenHash, now, tokenId);
}

export function revokeRefreshTokenFamily(userId, tokenFamily) {
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE refresh_tokens
    SET revokedAt = COALESCE(revokedAt, ?)
    WHERE userId = ? AND tokenFamily = ? AND revokedAt IS NULL
  `).run(now, userId, tokenFamily);
}

export function revokeAllUserRefreshTokens(userId) {
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE refresh_tokens
    SET revokedAt = COALESCE(revokedAt, ?)
    WHERE userId = ? AND revokedAt IS NULL
  `).run(now, userId);
}

export function getStoredRefreshTokenRecord(refreshToken) {
  const tokenHash = hashValue(refreshToken);

  return db.prepare(`
    SELECT
      rt.id,
      rt.userId,
      rt.tokenHash,
      rt.tokenFamily,
      rt.expiresAt,
      rt.revokedAt,
      rt.replacedByTokenHash,
      u.email,
      u.name
    FROM refresh_tokens rt
    JOIN users u ON u.id = rt.userId
    WHERE rt.tokenHash = ?
  `).get(tokenHash);
}

export function issueSession({ user, res, requestMeta, rotateFromToken }) {
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashValue(refreshToken);
  const tokenFamily = rotateFromToken?.tokenFamily ?? crypto.randomUUID();
  const expiresAt = toIsoAfterDays(config.refreshTokenDays);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO refresh_tokens (
      userId,
      tokenHash,
      tokenFamily,
      userAgent,
      ipAddress,
      expiresAt,
      lastUsedAt
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    user.id,
    refreshTokenHash,
    tokenFamily,
    requestMeta.userAgent,
    requestMeta.ip,
    expiresAt,
    now
  );

  if (rotateFromToken) {
    revokeRefreshTokenById(rotateFromToken.id, refreshTokenHash);
  }

  setRefreshTokenCookie(res, refreshToken);

  return {
    token: createAccessToken(user),
  };
}
