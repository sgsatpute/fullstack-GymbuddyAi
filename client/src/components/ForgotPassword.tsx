import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [requested, setRequested] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function requestResetCode() {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not send reset code");
        return;
      }

      setRequested(true);
      setMessage(data.message || "Check your email for the reset code.");
    } catch {
      setError("Could not send reset code");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReset() {
    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ email, otp, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Password reset failed");
        return;
      }

      setMessage("Password updated. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch {
      setError("Password reset failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">Secure recovery</span>
        <h1>Reset your password with a one-time code.</h1>
        <p className="muted">
          We’ll send a temporary OTP to your email. Use it to set a new password and regain access.
        </p>

        <div className="form-grid">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          {requested && (
            <>
              <label className="field">
                <span>Reset code</span>
                <input
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                />
              </label>

              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </label>
            </>
          )}
        </div>

        {message && <div className="feedback success">{message}</div>}
        {error && <div className="feedback error">{error}</div>}

        <div className="action-row">
          {!requested ? (
            <button className="btn btn-primary" onClick={requestResetCode} disabled={submitting}>
              {submitting ? "Sending..." : "Send Reset Code"}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={confirmReset} disabled={submitting}>
              {submitting ? "Updating..." : "Update Password"}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate("/login")}>
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}
