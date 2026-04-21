import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #6c5ce7 0%, #a29bfe 100%)",
        color: "#fff",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          padding: "60px 40px",
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 40,
          alignItems: "center",
        }}
      >
        {/* LEFT: TEXT */}
        <div>
          <h1 style={{ fontSize: 42, marginBottom: 12 }}>
            GymBuddy <span style={{ opacity: 0.9 }}>AI</span>
          </h1>

          <p style={{ fontSize: 18, lineHeight: 1.6, opacity: 0.95 }}>
            An AI-powered platform that matches you with the
            <b> perfect gym partner </b>
            based on goals, timing, experience, and consistency.
          </p>

          <ul style={{ marginTop: 20, lineHeight: 1.8 }}>
            <li>🤖 Smart AI matching</li>
            <li>💬 Real-time chat</li>
            <li>🔥 Streak & consistency tracking</li>
            <li>🟢 Online status & typing indicators</li>
          </ul>

          <div style={{ marginTop: 30 }}>
            <button
              onClick={() => navigate("/register")}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                borderRadius: 12,
                border: "none",
                background: "#fff",
                color: "#6c5ce7",
                fontWeight: 600,
                cursor: "pointer",
                marginRight: 12,
              }}
            >
              Get Started
            </button>

            <button
              onClick={() => navigate("/login")}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                borderRadius: 12,
                border: "1px solid #fff",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Login
            </button>
          </div>

          <p
            style={{
              marginTop: 24,
              fontSize: 13,
              opacity: 0.85,
            }}
          >
            Built for consistency. Powered by AI.
          </p>
        </div>

        {/* RIGHT: VISUAL CARD */}
        <div
          style={{
            background: "rgba(255,255,255,0.15)",
            borderRadius: 20,
            padding: 30,
            backdropFilter: "blur(8px)",
          }}
        >
          <h3 style={{ marginBottom: 10 }}>How it works</h3>

          <ol style={{ lineHeight: 1.8 }}>
            <li>Create your fitness profile</li>
            <li>AI analyzes compatibility</li>
            <li>Get high-quality matches</li>
            <li>Chat & build consistency together</li>
          </ol>

          <div
            style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 14,
              background: "rgba(0,0,0,0.15)",
              fontSize: 14,
            }}
          >
            ⚡ No random swiping  
            <br />
            🎯 Goal-driven matching  
            <br />
            📈 Designed for long-term fitness
          </div>
        </div>
      </div>
    </div>
  );
}
