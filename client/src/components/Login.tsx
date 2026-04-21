import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleLogin() {
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    navigate("/dashboard");
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
      <h2 style={{ marginBottom: 4 }}>Welcome Back 👋</h2>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Login to find your gym buddy
      </p>

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

      <button onClick={handleLogin} style={primaryBtn}>
        Login
      </button>

      {error && (
        <p style={{ color: "red", marginTop: 12 }}>{error}</p>
      )}

      <p style={{ marginTop: 16, fontSize: 14 }}>
        New here?{" "}
        <span
          style={{ color: "#6c5ce7", cursor: "pointer" }}
          onClick={() => navigate("/register")}
        >
          Create account
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
