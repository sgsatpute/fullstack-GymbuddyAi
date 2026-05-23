import { useCallback } from "react";

interface UseErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
}

/**
 * useErrorHandler Hook
 * Handles async errors that ErrorBoundary cannot catch (e.g., API errors)
 * Shows toast notifications and logs errors in development
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { showToast = true, logError = true } = options;

  const handleError = useCallback(
    (error: Error | string, context?: string) => {
      const errorMessage =
        typeof error === "string" ? error : error.message;

      // Log in development
      if (logError && process.env.NODE_ENV === "development") {
        console.error(context ? `[${context}]` : "[Error]", errorMessage);
      }

      // Show toast notification
      if (showToast) {
        // You can integrate this with your toast notification system
        // For now, we'll use a simple alert in development
        if (process.env.NODE_ENV === "development") {
          console.warn("Error notification:", errorMessage);
        }
      }

      return errorMessage;
    },
    [showToast, logError]
  );

  const handleApiError = useCallback(
    (response: Response) => {
      const statusText = response.statusText || "Request Failed";
      const status = response.status;

      let userMessage = "An error occurred. Please try again.";

      // Provide user-friendly messages based on status
      switch (status) {
        case 400:
          userMessage = "Invalid request. Please check your input.";
          break;
        case 401:
          userMessage = "Your session has expired. Please log in again.";
          break;
        case 403:
          userMessage = "You don't have permission to perform this action.";
          break;
        case 404:
          userMessage = "The resource was not found.";
          break;
        case 429:
          userMessage = "Too many requests. Please try again later.";
          break;
        case 500:
          userMessage = "Server error. Our team is working on it.";
          break;
        case 503:
          userMessage = "Service temporarily unavailable. Please try again.";
          break;
        default:
          userMessage = `Error: ${statusText}`;
      }

      if (logError && process.env.NODE_ENV === "development") {
        console.error(`[API Error ${status}]`, userMessage);
      }

      return userMessage;
    },
    [logError]
  );

  const handleAsyncError = useCallback(
    async (promise: Promise<any>, context?: string) => {
      try {
        return await promise;
      } catch (error) {
        const message = handleError(error instanceof Error ? error : new Error(String(error)), context);
        throw new Error(message);
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleApiError,
    handleAsyncError,
  };
}
