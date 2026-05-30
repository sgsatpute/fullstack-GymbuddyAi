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

  const podium = data.leaders.slice(0, 3);
  const rest = data.leaders.slice(3);

  return (
    <div className="page-stack leaderboard-experience">
      <section className="hero-panel leaderboard-hero">
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

      {podium.length > 0 && (
        <section className="podium-grid" aria-label="Top three leaderboard">
          {podium.map((user) => (
            <article key={user.id} className={`podium-card rank-${user.rank}`}>
              <span className="podium-rank">#{user.rank}</span>
              <h2>{user.name}</h2>
              <p>{user.xp} XP</p>
              <div className="chip-row">
                <span className="chip">Level {user.level}</span>
                <span className="chip">{user.streak} day streak</span>
              </div>
            </article>
          ))}
        </section>
      )}

      <div className="leaderboard-list-head">
        <div>
          <span className="eyebrow">Full ranking</span>
          <h2>People to chase this week</h2>
        </div>
        <span className="score-pill">{data.leaders.length} athletes</span>
      </div>

      <section className="grid-list">
        {(rest.length > 0 ? rest : data.leaders).map((user) => (
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
