import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { formatExperience, formatGoal, formatTimePreference } from "../utils/display";
import { Achievement, UserProfile } from "../utils/models";

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [coachTip, setCoachTip] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [checkInPending, setCheckInPending] = useState(false);
  const navigate = useNavigate();

  async function loadUser() {
    const response = await apiFetch("/api/users/me");
    const data = await response.json();
    setUser(data);
  }

  useEffect(() => {
    loadUser().catch(() => {});
  }, []);

  useEffect(() => {
    apiFetch("/api/coach/today")
      .then((response) => response.json())
      .then((data) => setCoachTip(data.message))
      .catch(() => {});
  }, []);

  const highlightedAchievements = useMemo(
    () => (user?.achievements ?? []).slice(0, 4),
    [user]
  );

  async function handleDailyCheckIn() {
    if (!user || user.checkedInToday || checkInPending) {
      return;
    }

    setCheckInPending(true);
    setCheckInMessage("");

    try {
      const response = await apiFetch("/api/checkin", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setCheckInMessage(data.error || "Could not complete your check-in.");
        return;
      }

      await loadUser();
      setCheckInMessage(data.message || "Daily check-in complete.");
    } catch {
      setCheckInMessage("Could not complete your check-in.");
    } finally {
      setCheckInPending(false);
    }
  }

  if (!user) {
    return <div className="page-section">Loading your dashboard...</div>;
  }

  if (!user.profileComplete) {
    return (
      <div className="page-stack">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">Finish setup</span>
            <h1>Complete your training profile, {user.name}.</h1>
            <p>
              The app can already protect your account, but it needs your training details before it can deliver useful matching.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => navigate("/complete-profile")}>
            Complete Profile
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1>Welcome back, {user.name}.</h1>
          <p>
            {formatGoal(user.goal)} · {formatExperience(user.experience)} · {formatTimePreference(user.preferredTime)}
            {user.gym ? ` · ${user.gym}` : ""}
          </p>
          <div className="chip-row">
            <span className="chip">Level {user.level}</span>
            <span className="chip">{user.xp} XP total</span>
            <span className="chip">{user.streak} day streak</span>
          </div>
        </div>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => navigate("/matches")}>
            Find Matches
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/inbox")}>
            Open Inbox
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <div className="card stat-card">
          <span className="eyebrow">Level progress</span>
          <strong>
            {user.levelProgress?.xpIntoLevel ?? 0} / 100 XP
          </strong>
          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${user.levelProgress?.levelProgressPercent ?? 0}%` }}
            />
          </div>
          <p>{user.levelProgress?.xpNeededForNextLevel ?? 0} XP to next level</p>
        </div>
        <div className="card stat-card">
          <span className="eyebrow">Conversations</span>
          <strong>{user.stats?.conversationCount ?? 0}</strong>
          <p>{user.stats?.unreadMessages ?? 0} unread right now</p>
        </div>
        <div className="card stat-card">
          <span className="eyebrow">Daily streak</span>
          <strong>{user.streak} days</strong>
          <p>{user.stats?.totalCheckins ?? 0} total check-ins</p>
        </div>
        <div className="card stat-card">
          <span className="eyebrow">Consistency</span>
          <strong>{user.consistency}%</strong>
          <p>{user.stats?.messagesSent ?? 0} messages sent</p>
        </div>
      </section>

      <section className="two-column">
        <div className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Daily action</span>
              <h2>Check in and reinforce the habit.</h2>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleDailyCheckIn}
              disabled={Boolean(user.checkedInToday) || checkInPending}
            >
              {user.checkedInToday
                ? "Checked In Today"
                : checkInPending
                  ? "Checking In..."
                  : "Daily Check-In"}
            </button>
          </div>

          <p className="muted">
            Daily check-ins keep your streak alive, unlock more achievements, and build visible momentum for future matches.
          </p>

          {checkInMessage && (
            <div className={`feedback ${checkInMessage.toLowerCase().includes("could not") ? "error" : "success"}`}>
              {checkInMessage}
            </div>
          )}

          <div className="progress compact">
            <div className="progress-fill" style={{ width: `${user.consistency}%` }} />
          </div>
          <p className="muted">Consistency score updates after every successful check-in.</p>
        </div>

        <div className="card">
          <span className="eyebrow">Coach tip</span>
          <h2>Today’s recommendation</h2>
          <p>{coachTip || "Analyzing your recent momentum..."}</p>
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Achievements</span>
            <h2>Visible progress signals</h2>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate(`/profile/${user.id}`)}>
            View Full Profile
          </button>
        </div>

        <div className="achievement-grid">
          {highlightedAchievements.map((achievement: Achievement) => (
            <article
              key={achievement.key}
              className={`achievement-card ${achievement.unlocked ? "achievement-unlocked" : ""}`}
            >
              <strong>{achievement.title}</strong>
              <p>{achievement.description}</p>
              <div className="progress compact">
                <div className="progress-fill" style={{ width: `${achievement.progressPercent}%` }} />
              </div>
              <span className="muted">
                {achievement.progress}/{achievement.target}
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
