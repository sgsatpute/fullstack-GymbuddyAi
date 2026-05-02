import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setStoredToken } from "../utils/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin() {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        return;
      }

      setStoredToken(data.token);
      navigate("/dashboard");
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">Welcome back</span>
        <h1>Pick up your training momentum.</h1>
        <p className="muted">
          Login to see your streak, unread messages, AI coach tip, and latest matches.
        </p>

        <div className="form-grid">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>

        {error && <div className="feedback error">{error}</div>}

        <div className="action-row">
          <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
            {loading ? "Logging In..." : "Login"}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/forgot-password")}>
            Forgot Password
          </button>
        </div>

        <p className="auth-switch">
          New here?{" "}
          <button type="button" className="text-link" onClick={() => navigate("/register")}>
            Create an account
          </button>
        </p>
      </div>
    </div>
  );
}
