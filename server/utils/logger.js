import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import config from "../config.js";

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, errors, json } = format;

const logDir = path.resolve(process.cwd(), "logs");

// Custom console format for local development
const consoleFormat = printf(({ level, message, timestamp, stack, requestId, ...metadata }) => {
  const reqIdStr = requestId ? ` [ReqID: ${requestId}]` : "";
  const metaStr = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : "";
  return `${timestamp} [${level}]${reqIdStr}: ${stack || message}${metaStr}`;
});

// JSON formatting for production file logs
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const logger = createLogger({
  level: config.nodeEnv === "development" ? "debug" : "info",
  format: fileFormat,
  transports: [],
});

if (config.nodeEnv === "development" || process.env.NODE_ENV === "test") {
  logger.add(
    new transports.Console({
      format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        colorize(),
        errors({ stack: true }),
        consoleFormat
      ),
    })
  );
} else {
  // Production daily rotates for error and combined logs
  logger.add(
    new DailyRotateFile({
      dirname: logDir,
      filename: "error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: "error",
    })
  );

  logger.add(
    new DailyRotateFile({
      dirname: logDir,
      filename: "combined-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    })
  );
}

export default logger;
