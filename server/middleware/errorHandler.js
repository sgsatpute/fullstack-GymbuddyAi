import config from "../config.js";

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let code = err.code || "INTERNAL_SERVER_ERROR";

  // Log error with timestamp
  console.error(`[${new Date().toISOString()}] Error: ${message}`, err.stack);

  // Customize responses based on error types
  if (err.name === "ValidationError" || err.name === "ZodError") {
    statusCode = 400;
    code = "VALIDATION_ERROR";
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Invalid or expired authentication token";
    code = "AUTHENTICATION_ERROR";
  } else if (err.message && err.message.includes("UNIQUE constraint failed")) {
    statusCode = 409;
    message = "Database conflict: Resource already exists";
    code = "DATABASE_ERROR";
  } else if (err.code === "SQLITE_ERROR") {
    statusCode = 400;
    code = "DATABASE_ERROR";
  }

  const response = {
    success: false,
    error: {
      message,
      code,
      statusCode,
    },
  };

  // Show stack in development
  if (process.env.NODE_ENV !== "production") {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
