import crypto from "crypto";
import logger from "../utils/logger.js";

const requestLogger = (req, res, next) => {
  if (req.originalUrl === "/api/health" || req.path === "/api/health" || req.path === "/health") {
    return next();
  }

  const requestId = crypto.randomUUID();
  req.id = requestId;
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const responseTime = Number(process.hrtime.bigint() - start) / 1_000_000;
    const payload = {
      requestId,
      userId: req.user?.id ?? null,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: Number(responseTime.toFixed(2)),
    };

    const level = responseTime > 500 ? "warn" : "info";
    logger[level](payload, "request completed");
  });

  next();
};

export default requestLogger;
