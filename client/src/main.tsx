import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from './App'
import { GamificationProvider } from "./hooks/useGamification";
import './index.css'

// Adapt the new backend standard JSON API envelopes to legacy client expectations
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch(...args);
  const url = typeof args[0] === 'string' ? args[0] : (args[0] as any).url;

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
    <QueryClientProvider client={new QueryClient()}>
      <GamificationProvider>
        <App />
      </GamificationProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
