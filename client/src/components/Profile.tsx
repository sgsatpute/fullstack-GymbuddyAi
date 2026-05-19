import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Avatar from "./Avatar";
import { apiFetch } from "../utils/api";
import { getCurrentUserId } from "../utils/auth";
import { formatExperience, formatGoal, formatShortDate, formatTimePreference } from "../utils/display";
import { Achievement, UserProfile } from "../utils/models";

export default function Profile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiIntro, setAiIntro] = useState("");
  const [aiIntroLoading, setAiIntroLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("User not found");
      setLoading(false);
      return;
    }

    apiFetch(`/api/users/${id}`)
      .then((response) => response.json())
      .then((data: UserProfile) => setProfile(data))
      .catch(() => setError("Could not load this profile right now."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleGenerateIntro() {
    if (!profile) {
      return;
    }

    setAiIntroLoading(true);
    setError("");

    try {
      const response = await apiFetch(`/api/matches/${profile.id}/intro`, {
        method: "POST",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Could not generate an intro right now.");
        return;
      }

      setAiIntro(data.message || "");
    } catch {
      setError("Could not generate an intro right now.");
    } finally {
      setAiIntroLoading(false);
    }
  }

  if (loading) {
    return <div className="page-section">Loading profile...</div>;
  }

  if (error || !profile) {
    return <div className="feedback error">{error || "Profile not found."}</div>;
  }

  const isSelf = profile.relationship?.isSelf ?? currentUserId === profile.id;
  const achievements = profile.achievements ?? [];
  const locationMapUrl =
    profile.locationLat !== null &&
    profile.locationLat !== undefined &&
    profile.locationLng !== null &&
    profile.locationLng !== undefined
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${profile.locationLat},${profile.locationLng}`)}`
      : null;

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-profile">
          <Avatar name={profile.name} avatarUrl={profile.avatarUrl} size="lg" />
          <div>
            <span className="eyebrow">{isSelf ? "My profile" : "Public profile"}</span>
            <h1>{profile.name}</h1>
            <p>
              {profile.bio?.trim()
                ? profile.bio
                : `${profile.name} is building consistency with a ${formatGoal(profile.goal).toLowerCase()} focus.`}
            </p>
            <div className="chip-row">
              <span className="chip">{formatGoal(profile.goal)}</span>
              <span className="chip">{formatExperience(profile.experience)}</span>
              <span className="chip">{formatTimePreference(profile.preferredTime)}</span>
              {profile.gym && <span className="chip">{profile.gym}</span>}
              {profile.locationLabel && <span className="chip">{profile.locationLabel}</span>}
            </div>
          </div>
        </div>

        <div className="hero-actions">
          {isSelf ? (
            <button className="btn btn-primary" onClick={() => navigate("/complete-profile")}>
              Edit Profile
            </button>
          ) : (
            <>
              <button
                className="btn btn-primary"
                onClick={() =>
                  navigate(`/chat/${profile.id}`, {
                    state: aiIntro ? { draftMessage: aiIntro } : undefined,
                  })
                }
              >
                {profile.relationship?.hasMessaged ? "Open Chat" : "Start Conversation"}
              </button>
              {!profile.relationship?.hasMessaged && (
                <button className="btn btn-secondary" onClick={handleGenerateIntro} disabled={aiIntroLoading}>
                  {aiIntroLoading ? "Thinking..." : aiIntro ? "Regenerate AI Intro" : "AI Intro"}
                </button>
              )}
            </>
          )}
          <button className="btn btn-secondary" onClick={() => navigate("/matches")}>
            Back to Matches
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <div className="card stat-card">
          <span className="eyebrow">Level</span>
          <strong>{profile.level}</strong>
          <p>{profile.xp} XP earned</p>
        </div>
        <div className="card stat-card">
          <span className="eyebrow">Streak</span>
          <strong>{profile.streak} days</strong>
          <p>Consistency matters</p>
        </div>
        <div className="card stat-card">
          <span className="eyebrow">Consistency</span>
          <strong>{profile.consistency}%</strong>
          <p>Built through daily follow-through</p>
        </div>
        <div className="card stat-card">
          <span className="eyebrow">Joined</span>
          <strong>{formatShortDate(profile.createdAt) || "Recently"}</strong>
          <p>Part of the GymBuddy AI community</p>
        </div>
      </section>

      <section className="two-column">
        <div className="card">
          <h2>Training Snapshot</h2>
          <div className="detail-list">
            <div>
              <span>Primary goal</span>
              <strong>{formatGoal(profile.goal)}</strong>
            </div>
            <div>
              <span>Experience</span>
              <strong>{formatExperience(profile.experience)}</strong>
            </div>
            <div>
              <span>Preferred time</span>
              <strong>{formatTimePreference(profile.preferredTime)}</strong>
            </div>
            <div>
              <span>Gym / location</span>
              <strong>{profile.gym || "Not shared"}</strong>
            </div>
            <div>
              <span>Exact training area</span>
              <strong>{profile.locationLabel || profile.city || "Not shared"}</strong>
            </div>
          </div>

          {!isSelf && profile.relationship?.sameGym && (
            <div className="feedback success">
              You both train at the same gym or location, which is a strong signal for coordination.
            </div>
          )}

          {locationMapUrl && (
            <div className="action-row">
              <a className="btn btn-secondary" href={locationMapUrl} target="_blank" rel="noreferrer">
                Open Training Location
              </a>
            </div>
          )}

          {!isSelf && aiIntro && (
            <div className="feedback success">
              <strong>AI intro ready</strong>
              <p>{aiIntro}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Achievements</h2>
          <div className="achievement-list">
            {achievements.map((achievement: Achievement) => (
              <div
                key={achievement.key}
                className={`achievement-item ${achievement.unlocked ? "achievement-unlocked" : ""}`}
              >
                <div>
                  <strong>{achievement.title}</strong>
                  <p>{achievement.description}</p>
                </div>
                <span>{achievement.progress}/{achievement.target}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
