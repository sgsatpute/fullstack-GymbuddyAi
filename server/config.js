import dotenv from "dotenv";
import path from "path";

dotenv.config();
const projectRoot = process.cwd();

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolveDbPath(dbPath) {
  if (!dbPath) {
    return path.resolve(projectRoot, "server", "gymbuddy.db");
  }

  return path.isAbsolute(dbPath)
    ? dbPath
    : path.resolve(projectRoot, dbPath);
}

const nodeEnv = process.env.NODE_ENV ?? "development";

const config = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: parsePositiveInt(process.env.PORT, 5001),
  jwtSecret: requireEnv("JWT_SECRET"),
  dbPath: resolveDbPath(process.env.DB_PATH),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenDays: parsePositiveInt(process.env.REFRESH_TOKEN_DAYS, 7),
  refreshCookieName: "gymbuddy_refresh",
  passwordResetOtpTtlMinutes: parsePositiveInt(
    process.env.PASSWORD_RESET_OTP_TTL_MINUTES,
    10
  ),
  passwordResetOtpLength: parsePositiveInt(
    process.env.PASSWORD_RESET_OTP_LENGTH,
    6
  ),
  rateLimitWindowMs: parsePositiveInt(
    process.env.RATE_LIMIT_WINDOW_MS,
    15 * 60 * 1000
  ),
  rateLimitMaxRequests: parsePositiveInt(
    process.env.RATE_LIMIT_MAX_REQUESTS,
    200
  ),
  authRateLimitMaxRequests: parsePositiveInt(
    process.env.AUTH_RATE_LIMIT_MAX_REQUESTS,
    10
  ),
  passwordResetRateLimitMaxRequests: parsePositiveInt(
    process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS,
    5
  ),
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: parsePositiveInt(process.env.SMTP_PORT, 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "GymBuddy AI <no-reply@gymbuddy.ai>",
};

export default config;
