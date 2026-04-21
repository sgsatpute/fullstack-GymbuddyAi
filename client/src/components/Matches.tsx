// client/src/components/Matches.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { socket } from "../utils/socket";

type Match = {
  user: { id: number; name: string };
  score: number;
  reasons?: string[];
  canChat: boolean;
};

export default function Matches() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [online, setOnline] = useState<number[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    apiFetch("/api/matches")
      .then(async (res) => {
        if (!res.ok) {
          // If server says profile is incomplete -> redirect to completion
          const d = await res.json().catch(() => ({}));
          if (d && d.error && d.error === "PROFILE_INCOMPLETE") {
            navigate("/complete-profile");
            return;
          }
          throw new Error("Failed to load matches");
        }
        return res.json();
      })
      .then((data: Match[]) => {
        if (!cancelled) setMatches(data);
      })
      .catch(() => {});

    // socket online (optional)
    socket.connect();
    const token = localStorage.getItem("token");
    let myId = null;
    if (token) {
      try {
        myId = JSON.parse(atob(token.split(".")[1])).id;
        socket.emit("online", myId);
      } catch {}
    }

    socket.on("online-users", (users: number[]) => setOnline(users || []));

    return () => {
      cancelled = true;
      socket.off("online-users");
      socket.disconnect();
    };
  }, [navigate]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Matches</h2>
      {matches.length === 0 && <p>No matches found.</p>}

      {matches.map((m) => (
        <div key={m.user.id} style={{ marginBottom: 14 }}>
          <strong>{m.user.name}</strong> — {m.score}%
          {online.includes(m.user.id) && <span style={{ color: "green", marginLeft: 6 }}>● Online</span>}

          {m.canChat ? (
            <div>
              <button style={{ marginTop: 6 }} onClick={() => navigate(`/chat/${m.user.id}`)}>Start Chat</button>
            </div>
          ) : (
            <p style={{ color: "gray" }}>Chat locked (score &lt; 60%)</p>
          )}

          {m.reasons && (
            <ul>
              {m.reasons.map((r, idx) => <li key={idx}>{r}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
