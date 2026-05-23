import crypto from "crypto";
import logger from "../utils/logger.js";

const requestLogger = (req, res, next) => {
  // Skip logging for health check endpoints
  if (req.originalUrl === "/api/health" || req.path === "/api/health" || req.path === "/health") {
    return next();
  }

  const requestId = crypto.randomUUID();
  req.id = requestId; // Attach requestId to request object for downstream logging

  const start = Date.now();

  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`Response completed: ${req.method} ${req.originalUrl} ${res.statusCode}`, {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
};

export default requestLogger;
