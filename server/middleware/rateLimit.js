import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import config from "../config.js";

const baseLimiterConfig = {
  windowMs: config.rateLimitWindowMs,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
};

function buildUserKey(req) {
  return req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req);
}

export const apiLimiter = rateLimit({
  ...baseLimiterConfig,
  max: config.rateLimitMaxRequests,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

export const authLimiter = rateLimit({
  ...baseLimiterConfig,
  max: config.authRateLimitMaxRequests,
  message: {
    error: "Too many authentication attempts. Please try again later.",
  },
});

export const passwordResetLimiter = rateLimit({
  ...baseLimiterConfig,
  max: config.passwordResetRateLimitMaxRequests,
  message: {
    error: "Too many password reset attempts. Please try again later.",
  },
});

export const coachMessageLimiter = rateLimit({
  ...baseLimiterConfig,
  max: 30,
  keyGenerator: buildUserKey,
  message: {
    error: "Coach message limit reached. Please try again later.",
  },
});

export const foodAnalysisLimiter = rateLimit({
  ...baseLimiterConfig,
  max: 20,
  keyGenerator: buildUserKey,
  message: {
    error: "Food analysis limit reached. Please try again later.",
  },
});

export const progressAnalysisLimiter = rateLimit({
  ...baseLimiterConfig,
  windowMs: 24 * 60 * 60 * 1000,
  max: 5,
  keyGenerator: buildUserKey,
  message: {
    error: "Progress analysis limit reached for today.",
  },
});
