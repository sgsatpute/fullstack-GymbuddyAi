// client/src/components/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

type User = {
  id: number;
  name: string;
  streak: number;
  consistency: number;
  xp: number;
  level: number;
  profileComplete?: boolean;
};

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [coachTip, setCoachTip] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/api/users/me")
      .then(res => res.json())
      .then(setUser)
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiFetch("/api/coach/today")
      .then(res => res.json())
      .then(d => setCoachTip(d.message))
      .catch(() => {});
  }, []);

  if (!user) return <p style={{ padding: 40 }}>Loading dashboard...</p>;

  if (!user.profileComplete) {
    return (
      <div style={{ maxWidth: 500, margin: "80px auto", padding: 24 }}>
        <h2>Welcome, {user.name} 👋</h2>
        <p style={{ color: "#666", marginBottom: 20 }}>
          Complete your profile to unlock AI matching.
        </p>
        <button onClick={() => navigate("/complete-profile")} style={primaryBtn}>
          Complete Profile
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h2>Welcome, {user.name} 👋</h2>

      {/* LEVEL BADGE */}
      <div
        style={{
          display: "inline-block",
          padding: "6px 12px",
          borderRadius: 999,
          background: "#ffeaa7",
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        🏆 Level {user.level} · {user.xp} XP
      </div>

      <p style={{ color: "#666", marginBottom: 20 }}>
        Stay consistent. Your gym buddy is waiting 💪
      </p>

      <div style={card}>
        <strong>🤖 AI Coach</strong>
        <p>{coachTip || "Analyzing activity..."}</p>
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={label}>🔥 Streak</div>
            <div style={value}>{user.streak} days</div>
          </div>
          <div>
            <div style={label}>📈 Consistency</div>
            <div style={value}>{user.consistency}%</div>
          </div>
        </div>

        <div style={progressBg}>
          <div style={{ ...progressFill, width: `${user.consistency}%` }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => navigate("/matches")} style={{ ...primaryBtn, flex: 1 }}>
          Find Gym Buddies
        </button>
        <button
          onClick={() => {
            localStorage.removeItem("token");
            navigate("/login");
          }}
          style={secondaryBtn}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

/* styles unchanged */
const card = { border: "1px solid #ddd", borderRadius: 14, padding: 20, background: "#fff", marginBottom: 20 };
const label = { fontSize: 13, color: "#777" };
const value = { fontSize: 24, fontWeight: 600 };
const progressBg = { height: 10, background: "#eee", borderRadius: 8, overflow: "hidden" };
const progressFill = { height: "100%", background: "#6c5ce7" };
const primaryBtn = { padding: "10px 14px", borderRadius: 10, border: "none", background: "#6c5ce7", color: "#fff" };
const secondaryBtn = { padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" };
