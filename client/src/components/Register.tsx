import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setStoredToken } from "../utils/auth";
import { getAuthToken } from "../utils/authResponse";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit() {
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      const token = getAuthToken(data);
      if (!token) {
        setError("Account created, but the server did not return a session token.");
        return;
      }

      setStoredToken(token);
      navigate("/complete-profile");
    } catch {
      setError("Unable to reach the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <span className="eyebrow">Start strong</span>
        <h1>Build a profile that unlocks better partners and better coaching.</h1>
        <p>
          Your goal, training time, gym, and experience level power the compatibility engine.
        </p>
        <div className="auth-proof-grid">
          <span>Compatibility score</span>
          <span>Coach memory</span>
          <span>Groups</span>
          <span>Progress tracking</span>
        </div>
      </div>
      <div className="auth-card">
        <span className="eyebrow">Create account</span>
        <h1>Start building your fitness support system.</h1>
        <p className="muted">
          Sign up, complete your training profile, and get better-quality match recommendations.
        </p>

        <div className="form-grid">
          <label className="field">
            <span>Full name</span>
            <input
              placeholder="Your name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

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
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
        </div>

        {error && <div className="feedback error">{error}</div>}

        <div className="action-row">
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </div>

        <p className="auth-switch">
          Already registered?{" "}
          <button type="button" className="text-link" onClick={() => navigate("/login")}>
            Login
          </button>
        </p>
      </div>
    </div>
  );
}
