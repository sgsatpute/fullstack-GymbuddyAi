import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageErrorFallbackProps {
  error: Error;
  onRetry?: () => void;
}

/**
 * PageErrorFallback Component
 * Reusable error display component for individual pages or sections
 */
export default function PageErrorFallback({
  error,
  onRetry,
}: PageErrorFallbackProps) {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="page-section flex items-center justify-center min-h-96">
      <div className="max-w-md w-full">
        <div className="text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="bg-red-500/20 p-3 rounded-full">
              <AlertTriangle className="text-red-500" size={32} />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-2">
            Failed to Load This Page
          </h2>

          {/* Error Message */}
          <p className="text-slate-300 mb-4">
            {error?.message ||
              "An unexpected error occurred. Please try again."}
          </p>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
              >
                <RefreshCw size={16} />
                Retry
              </button>
            )}
            <button
              onClick={handleGoHome}
              className={`${
                onRetry ? "flex-1" : "w-full"
              } flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2 px-4 rounded transition`}
            >
              <Home size={16} />
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
