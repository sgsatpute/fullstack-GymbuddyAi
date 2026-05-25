import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from './App'
import { GamificationProvider } from "./hooks/useGamification";
import { isRemoteApiUrl, resolveApiUrl } from "./utils/runtime";
import './index.css'

const queryClient = new QueryClient();

// Adapt the new backend standard JSON API envelopes to legacy client expectations
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const input = args[0];
  const init = args[1];
  const originalUrl = typeof input === 'string' ? input : (input as Request).url;
  const resolvedUrl = typeof originalUrl === "string" ? resolveApiUrl(originalUrl) : originalUrl;
  const nextInit = isRemoteApiUrl(resolvedUrl)
    ? { ...init, credentials: "include" as RequestCredentials }
    : init;
  const nextInput = typeof input === "string" ? resolvedUrl : input;
  const response = await originalFetch(nextInput, nextInit);
  const url = resolvedUrl;

  if (url && url.includes('/api/')) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const cloned = response.clone();
      try {
        const json = await cloned.json();
        if (json && json.success === false && json.error && typeof json.error === "object") {
          const mockJson = { error: json.error.message, ...json };
          return new Response(JSON.stringify(mockJson), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
        if (json && json.success === true && json.data !== undefined) {
          return new Response(JSON.stringify(json.data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }
      } catch (e) {
        // Fall back to original response if parsing fails
      }
    }
  }
  return response;
};

ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <GamificationProvider>
        <App />
      </GamificationProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
