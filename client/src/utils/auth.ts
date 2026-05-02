const TOKEN_KEY = "token";

type TokenPayload = {
  id?: number;
  exp?: number;
};

let refreshPromise: Promise<string | null> | null = null;

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function hasStoredToken() {
  return Boolean(getStoredToken());
}

export function getTokenPayload(): TokenPayload | null {
  const token = getStoredToken();
  if (!token) {
    return null;
  }

  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function getCurrentUserId() {
  const payload = getTokenPayload();
  return typeof payload?.id === "number" ? payload.id : null;
}

export function isTokenExpired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1])) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    return !payload.exp || payload.exp <= now;
  } catch {
    return true;
  }
}

export async function refreshSession() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      clearStoredToken();
      return null;
    }

    const data = await response.json();
    if (!data.token) {
      clearStoredToken();
      return null;
    }

    setStoredToken(data.token);
    return data.token as string;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function logoutSession() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  } finally {
    clearStoredToken();
  }
}
