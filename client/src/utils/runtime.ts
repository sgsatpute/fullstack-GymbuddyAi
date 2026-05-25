const rawApiBaseUrl = import.meta.env.VITE_API_URL ?? "";

export const API_BASE_URL = rawApiBaseUrl.replace(/\/$/, "");

export function resolveApiUrl(url: string) {
  if (!API_BASE_URL || !url.startsWith("/api")) {
    return url;
  }

  return `${API_BASE_URL}${url}`;
}

export function getSocketUrl() {
  return API_BASE_URL || "/";
}

export function isRemoteApiUrl(url: string) {
  return Boolean(API_BASE_URL && url.startsWith(API_BASE_URL));
}
