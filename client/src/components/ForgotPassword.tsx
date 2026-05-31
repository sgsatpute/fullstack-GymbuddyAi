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
    if (!email.trim()) {
      setError("Enter the email address on your GymBuddy AI account.");
      return;
    }

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
      setMessage(data.message || "If that email exists, a reset code has been sent.");
    } catch {
      setError("Could not send the reset code. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReset() {
    if (!email.trim() || !otp.trim() || !newPassword) {
      setError("Enter your email, reset code, and new password.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

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

      setMessage("Password updated. Redirecting you to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch {
      setError("Password reset failed. Check the code and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand-panel">
        <span className="eyebrow">Account recovery</span>
        <h1>Get back to your training plan without losing momentum.</h1>
        <p>
          Use a one-time reset code to secure your account, then continue with your matches, coach, and logs.
        </p>
        <div className="auth-proof-grid">
          <span>Secure OTP</span>
          <span>Session reset</span>
          <span>Fast recovery</span>
          <span>Back to training</span>
        </div>
      </div>
      <div className="auth-card">
        <span className="eyebrow">Secure recovery</span>
        <h1>Reset your password safely.</h1>
        <p className="muted">
          Enter your account email. If it exists, we will send a short-lived code you can use to set a new password.
        </p>

        <div className="form-grid">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
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
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </label>

              <label className="field">
                <span>New password</span>
                <input
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
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
