import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import { apiFetch } from "../utils/api";
import {
  formatDistanceKm,
  formatExperience,
  formatGoal,
  formatTimePreference,
} from "../utils/display";
import { MatchItem } from "../utils/models";

export default function Matches() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [introLoadingId, setIntroLoadingId] = useState<number | null>(null);
  const [introByUserId, setIntroByUserId] = useState<Record<number, string>>({});
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

  async function generateIntro(userId: number) {
    setIntroLoadingId(userId);
    setError("");

    try {
      const response = await apiFetch(`/api/matches/${userId}/intro`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Could not generate an intro right now.");
        return;
      }

      setIntroByUserId((current) => ({
        ...current,
        [userId]: data.message,
      }));
    } catch {
      setError("Could not generate an intro right now.");
    } finally {
      setIntroLoadingId(null);
    }
  }

  function openChatWithIntro(userId: number) {
    const draftMessage = introByUserId[userId];

    navigate(`/chat/${userId}`, {
      state: draftMessage ? { draftMessage } : undefined,
    });
  }

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
          {matches.map((match) => {
            const reasons = match.reasons ?? match.compatibilityReasons ?? [];
            const tier = match.tier ?? match.matchLabel ?? "Compatible";

            return (
            <article key={match.user.id} className="card match-card">
              <div className="section-head">
                <div className="match-headline">
                  <Avatar name={match.user.name} avatarUrl={match.user.avatarUrl} size="md" />
                  <div>
                    <span className="eyebrow">{tier}</span>
                    <h2>{match.user.name}</h2>
                  </div>
                </div>
                <div className="score-pill">{match.score}%</div>
              </div>

              <p className="muted">
                {formatGoal(match.user.goal)} · {formatExperience(match.user.experience)} ·{" "}
                {formatTimePreference(match.user.preferredTime)}
              </p>

              <div className="chip-row">
                {match.user.gym && <span className="chip">{match.user.gym}</span>}
                {match.distanceKm !== null && match.distanceKm !== undefined && (
                  <span className="chip">{formatDistanceKm(match.distanceKm)}</span>
                )}
                {match.locationInsight && <span className="chip">{match.locationInsight}</span>}
                <span className="chip">Level {match.user.level}</span>
                <span className="chip">{match.user.streak} day streak</span>
              </div>

              <p>
                {match.user.bio?.trim() ||
                  "This athlete is ready to stay more consistent with the right training partner."}
              </p>

              <ul className="reason-list">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>

              {introByUserId[match.user.id] && (
                <div className="feedback success">
                  <strong>AI intro ready</strong>
                  <p>{introByUserId[match.user.id]}</p>
                </div>
              )}

              <div className="action-row">
                <button className="btn btn-primary" onClick={() => navigate(`/profile/${match.user.id}`)}>
                  View Profile
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => openChatWithIntro(match.user.id)}
                  disabled={!match.canChat}
                >
                  {match.canChat ? "Start Chat" : "Unlock at 60%"}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => generateIntro(match.user.id)}
                  disabled={!match.canChat || introLoadingId === match.user.id}
                >
                  {introLoadingId === match.user.id
                    ? "Thinking..."
                    : introByUserId[match.user.id]
                      ? "Regenerate Intro"
                      : "AI Intro"}
                </button>
                {match.mapsUrl && (
                  <a className="btn btn-secondary" href={match.mapsUrl} target="_blank" rel="noreferrer">
                    Open Map
                  </a>
                )}
              </div>
            </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
