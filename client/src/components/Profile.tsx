import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

  if (loading) {
    return <div className="page-section">Loading profile...</div>;
  }

  if (error || !profile) {
    return <div className="feedback error">{error || "Profile not found."}</div>;
  }

  const isSelf = profile.relationship?.isSelf ?? currentUserId === profile.id;
  const achievements = profile.achievements ?? [];

  return (
    <div className="page-stack">
      <section className="hero-panel">
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
          </div>
        </div>

        <div className="hero-actions">
          {isSelf ? (
            <button className="btn btn-primary" onClick={() => navigate("/complete-profile")}>
              Edit Profile
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate(`/chat/${profile.id}`)}>
              {profile.relationship?.hasMessaged ? "Open Chat" : "Start Conversation"}
            </button>
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
          </div>

          {!isSelf && profile.relationship?.sameGym && (
            <div className="feedback success">
              You both train at the same gym or location, which is a strong signal for coordination.
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
