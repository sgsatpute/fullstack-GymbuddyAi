// Configuration for production deployment
// This file shows how to update your API and Socket configuration for deployed environments

// 1. Update client/src/utils/api.ts to support environment-based API URLs
// Add this at the top of the file:

const API_BASE_URL = (() => {
  if (import.meta.env.MODE === 'production') {
    // Get from environment variable set during build
    return import.meta.env.VITE_API_URL || window.location.origin;
  }
  // Development uses relative URLs (proxied through Vite)
  return '';
})();

// 2. Update client/src/utils/socket.ts to use environment-based URLs

// Before:
// export const socket = io("/", {
//   autoConnect: false,
// });

// After:
const SOCKET_URL = import.meta.env.MODE === 'production' 
  ? import.meta.env.VITE_API_URL || window.location.origin
  : '/';

// 3. Add to client/.env.production
VITE_API_URL=https://your-backend-domain.com

// 4. Add to client/vite.config.ts for development:
// The existing proxy configuration already handles this:
// server: {
//   proxy: {
//     '/api': { target: 'http://localhost:5001', ... }
//   }
// }

export { API_BASE_URL, SOCKET_URL };
