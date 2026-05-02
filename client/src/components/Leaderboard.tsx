import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { UserProfile } from "../utils/models";

type LeaderboardResponse = {
  leaders: Array<UserProfile & { rank: number }>;
  currentUserRank: (UserProfile & { rank: number | null }) | null;
};

export default function Leaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/leaderboard")
      .then((response) => response.json())
      .then((payload: LeaderboardResponse) => setData(payload))
      .catch(() => setError("Could not load the leaderboard right now."));
  }, []);

  if (error) {
    return <div className="feedback error">{error}</div>;
  }

  if (!data) {
    return <div className="page-section">Loading leaderboard...</div>;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Leaderboard</span>
          <h1>Celebrate the people showing up consistently.</h1>
          <p>XP, streak, and consistency all influence the ranking, so this rewards actual habit-building.</p>
        </div>
        {data.currentUserRank && (
          <div className="rank-panel">
            <span className="eyebrow">Your rank</span>
            <strong>#{data.currentUserRank.rank ?? "-"}</strong>
            <p>{data.currentUserRank.xp} XP</p>
          </div>
        )}
      </section>

      <section className="grid-list">
        {data.leaders.map((user) => (
          <article key={user.id} className="card leaderboard-card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Rank #{user.rank}</span>
                <h2>{user.name}</h2>
              </div>
              <div className="score-pill">{user.xp} XP</div>
            </div>
            <p className="muted">
              {user.goal ? `${user.goal} · ` : ""}
              {user.gym || "Gym location not shared"}
            </p>
            <div className="chip-row">
              <span className="chip">Level {user.level}</span>
              <span className="chip">{user.streak} day streak</span>
              <span className="chip">{user.consistency}% consistency</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
