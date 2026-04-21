import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

export default function Leaderboard() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/api/leaderboard")
      .then(res => res.json())
      .then(setUsers)
      .catch(() => {});
  }, []);

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 20 }}>
      <h2>🏆 Leaderboard</h2>

      {users.map((u, i) => (
        <div key={i} style={{ padding: 10, borderBottom: "1px solid #eee" }}>
          #{i + 1} <strong>{u.name}</strong> — Level {u.level} ({u.xp} XP)
        </div>
      ))}
    </div>
  );
}
