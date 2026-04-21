// client/src/components/Register.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submit() {
    setError("");

    // Register
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    // Auto-login so user gets a token and can complete profile immediately
    try {
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        // fallback: send to login page if auto-login fails
        navigate("/login");
        return;
      }

      localStorage.setItem("token", loginData.token);
      // Go to profile completion page
      navigate("/complete-profile");
    } catch (err) {
      // If anything goes wrong, send user to login
      navigate("/login");
    }
  }

  return (
    <div
      style={{
        maxWidth: 420,
        margin: "80px auto",
        padding: 24,
        borderRadius: 14,
        border: "1px solid #ddd",
        background: "#fff",
      }}
    >
      <h2 style={{ marginBottom: 4 }}>Create Profile 🏋️</h2>
      <p style={{ color: "#666", marginBottom: 20 }}>Join GymBuddy AI</p>

      <input
        placeholder="Full Name"
        value={name}
        onChange={e => setName(e.target.value)}
        style={inputStyle}
      />

      <input
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={inputStyle}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        style={inputStyle}
      />

      <button onClick={submit} style={primaryBtn}>
        Create Account
      </button>

      {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}

      <p style={{ marginTop: 16, fontSize: 14 }}>
        Already registered?{" "}
        <span
          style={{ color: "#6c5ce7", cursor: "pointer" }}
          onClick={() => navigate("/login")}
        >
          Login
        </span>
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginBottom: 12,
  borderRadius: 10,
  border: "1px solid #ccc",
};

const primaryBtn: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: 10,
  border: "none",
  background: "#6c5ce7",
  color: "#fff",
  cursor: "pointer",
};
