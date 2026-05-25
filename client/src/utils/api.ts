import {
  clearStoredToken,
  getStoredToken,
  isTokenExpired,
  refreshSession,
} from "./auth";

function redirectToLogin() {
  window.location.href = "/login";
}

async function getValidToken() {
  const token = getStoredToken();

  if (!token) {
    return refreshSession();
  }

  if (isTokenExpired(token)) {
    return refreshSession();
  }

  return token;
}

function buildHeaders(options: RequestInit, token: string) {
  const headers = new Headers(options.headers ?? {});

  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return headers;
}

async function doFetch(url: string, options: RequestInit, token: string) {
  return fetch(url, {
    ...options,
    headers: buildHeaders(options, token),
    credentials: "same-origin",
  });
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  let token = await getValidToken();

  if (!token) {
    clearStoredToken();
    redirectToLogin();
    throw new Error("No active session");
  }

  let response = await doFetch(url, options, token);

  if (response.status === 401) {
    token = await refreshSession();

    if (!token) {
      clearStoredToken();
      redirectToLogin();
      throw new Error("Unauthorized");
    }

    response = await doFetch(url, options, token);
  }

  if (response.status === 401) {
    clearStoredToken();
    redirectToLogin();
    throw new Error("Unauthorized");
  }

  return response;
}
