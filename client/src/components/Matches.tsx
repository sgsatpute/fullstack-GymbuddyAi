import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { formatExperience, formatGoal, formatTimePreference } from "../utils/display";
import { MatchItem } from "../utils/models";

export default function Matches() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/api/matches")
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (data?.error === "PROFILE_INCOMPLETE") {
            navigate("/complete-profile");
            return null;
          }
          throw new Error("Failed to load matches");
        }

        return response.json();
      })
      .then((data: MatchItem[] | null) => {
        if (data) {
          setMatches(data);
        }
      })
      .catch(() => setError("Could not load your matches right now."))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return <div className="page-section">Finding your best gym matches...</div>;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Matches</span>
          <h1>People who fit your training rhythm.</h1>
          <p>
            Each match is scored from a mix of goals, training schedule, consistency, and shared location signals.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate("/complete-profile")}>
          Update Profile
        </button>
      </section>

      {error && <div className="feedback error">{error}</div>}

      {matches.length === 0 ? (
        <section className="card empty-state">
          <h2>No strong matches yet</h2>
          <p>Try refining your profile or come back after more people complete their training details.</p>
        </section>
      ) : (
        <section className="grid-list">
          {matches.map((match) => (
            <article key={match.user.id} className="card match-card">
              <div className="section-head">
                <div>
                  <span className="eyebrow">{match.tier}</span>
                  <h2>{match.user.name}</h2>
                </div>
                <div className="score-pill">{match.score}%</div>
              </div>

              <p className="muted">
                {formatGoal(match.user.goal)} · {formatExperience(match.user.experience)} · {formatTimePreference(match.user.preferredTime)}
              </p>

              <div className="chip-row">
                {match.user.gym && <span className="chip">{match.user.gym}</span>}
                <span className="chip">Level {match.user.level}</span>
                <span className="chip">{match.user.streak} day streak</span>
              </div>

              <p>{match.user.bio?.trim() || "This athlete is ready to stay more consistent with the right training partner."}</p>

              <ul className="reason-list">
                {match.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>

              <div className="action-row">
                <button className="btn btn-primary" onClick={() => navigate(`/profile/${match.user.id}`)}>
                  View Profile
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate(`/chat/${match.user.id}`)}
                  disabled={!match.canChat}
                >
                  {match.canChat ? "Start Chat" : "Unlock at 60%"}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
