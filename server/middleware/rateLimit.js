import rateLimit from "express-rate-limit";
import config from "../config.js";

const baseLimiterConfig = {
  windowMs: config.rateLimitWindowMs,
  standardHeaders: true,
  legacyHeaders: false,
};

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
