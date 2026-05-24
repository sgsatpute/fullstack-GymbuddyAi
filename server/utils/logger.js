import pino from "pino";
import config from "../config.js";

const transport =
  config.nodeEnv === "development" || process.env.NODE_ENV === "test"
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined;

const logger = pino({
  level: config.nodeEnv === "development" ? "debug" : "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  base: undefined,
}, transport ? pino.transport(transport) : undefined);

export default logger;
