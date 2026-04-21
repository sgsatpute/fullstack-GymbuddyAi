function isTokenExpired(token: string) {
  try {
    // Decode JWT payload
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);

    return payload.exp < now;
  } catch {
    // If token is malformed, treat as expired
    return true;
  }
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("token");

  // 🔐 NO TOKEN → LOGOUT
  if (!token) {
    window.location.href = "/login";
    throw new Error("No token");
  }

  // 🔐 EXPIRED TOKEN → AUTO LOGOUT
  if (isTokenExpired(token)) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Token expired");
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  // 🔐 BACKEND REJECTED TOKEN
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  return res;
}
