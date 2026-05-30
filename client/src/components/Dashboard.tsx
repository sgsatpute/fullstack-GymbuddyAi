import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import { apiFetch } from "../utils/api";
import {
  formatCalories,
  formatDateTime,
  formatExperience,
  formatGoal,
  formatGrams,
  formatIntensity,
  formatMinutes,
  formatTimePreference,
  formatWorkoutType,
} from "../utils/display";
import {
  Achievement,
  NutritionOverview,
  UserProfile,
  WorkoutOverview,
} from "../utils/models";

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [coachTip, setCoachTip] = useState("");
  const [checkInMessage, setCheckInMessage] = useState("");
  const [checkInPending, setCheckInPending] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [avatarPending, setAvatarPending] = useState(false);
  const [displayStreak, setDisplayStreak] = useState(0);
  const [displayedConsistency, setDisplayedConsistency] = useState(0);
  const [justCheckedIn, setJustCheckedIn] = useState(false);
  const [workoutOverview, setWorkoutOverview] = useState<WorkoutOverview | null>(null);
  const [nutritionOverview, setNutritionOverview] = useState<NutritionOverview | null>(null);
  const streakTimerRef = useRef<number | null>(null);
  const checkInHighlightRef = useRef<number | null>(null);
  const firstLoadRef = useRef(true);
  const navigate = useNavigate();

  async function loadUser() {
    const response = await apiFetch("/api/users/me");
    const data = (await response.json()) as UserProfile;
    setUser(data);

    if (firstLoadRef.current) {
      setDisplayStreak(data.streak ?? 0);
      setDisplayedConsistency(data.consistency ?? 0);
      firstLoadRef.current = false;
    }

    return data;
  }

  async function loadNutrition() {
    try {
      const response = await apiFetch("/api/nutrition");
      const data = (await response.json()) as NutritionOverview;
      setNutritionOverview(data);
    } catch {
      setNutritionOverview(null);
    }
  }

  useEffect(() => {
    loadUser().catch(() => {});
  }, []);

  useEffect(() => {
    apiFetch("/api/coach/today")
      .then((response) => response.json())
      .then((data: { message?: string }) => setCoachTip(data.message ?? ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    apiFetch("/api/workouts")
      .then((response) => response.json())
      .then((data: WorkoutOverview) => setWorkoutOverview(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadNutrition().catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      if (streakTimerRef.current) {
        window.clearInterval(streakTimerRef.current);
      }
      if (checkInHighlightRef.current) {
        window.clearTimeout(checkInHighlightRef.current);
      }
    };
  }, []);

  const highlightedAchievements = useMemo(
    () => (user?.achievements ?? []).slice(0, 4),
    [user]
  );
  const levelProgress = user?.levelProgress;
  const levelTargetXp =
    levelProgress && levelProgress.nextLevelXp > levelProgress.levelStartXp
      ? levelProgress.nextLevelXp - levelProgress.levelStartXp
      : 100;
  const workoutSummary = workoutOverview?.summary;
  const recentWorkouts = workoutOverview?.recentWorkouts ?? [];

  function animateStreakIncrement(from: number, to: number) {
    if (streakTimerRef.current) {
      window.clearInterval(streakTimerRef.current);
      streakTimerRef.current = null;
    }

    if (to <= from) {
      setDisplayStreak(to);
      return;
    }

    let current = from;
    setDisplayStreak(from);

    streakTimerRef.current = window.setInterval(() => {
      current += 1;
      setDisplayStreak(current);

      if (current >= to && streakTimerRef.current) {
        window.clearInterval(streakTimerRef.current);
        streakTimerRef.current = null;
      }
    }, 220);
  }

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

      const previousStreak = user.streak ?? 0;
      await loadUser();
      animateStreakIncrement(previousStreak, data.streak ?? previousStreak);
      setDisplayedConsistency(data.consistency ?? user.consistency ?? 0);
      setJustCheckedIn(true);
      if (checkInHighlightRef.current) {
        window.clearTimeout(checkInHighlightRef.current);
      }
      checkInHighlightRef.current = window.setTimeout(() => {
        setJustCheckedIn(false);
        checkInHighlightRef.current = null;
      }, 1400);
      setCheckInMessage(data.message || "Daily check-in complete.");
    } catch {
      setCheckInMessage("Could not complete your check-in.");
    } finally {
      setCheckInPending(false);
    }
  }

  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setAvatarPending(true);
    setAvatarMessage("");

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await apiFetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setAvatarMessage(data.error || "Could not upload your profile photo.");
        return;
      }

      setUser((current) => (current ? { ...current, avatarUrl: data.avatarUrl } : current));
      setAvatarMessage("Profile photo updated.");
    } catch {
      setAvatarMessage("Could not upload your profile photo.");
    } finally {
      setAvatarPending(false);
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
              The app can protect your account already, but it still needs your training details before it can deliver useful matching.
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
        <div className="hero-profile">
          <Avatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <div>
            <span className="eyebrow">Dashboard</span>
            <h1>Welcome back, {user.name}.</h1>
            <p>
              {formatGoal(user.goal)} · {formatExperience(user.experience)} ·{" "}
              {formatTimePreference(user.preferredTime)}
              {user.gym ? ` · ${user.gym}` : ""}
            </p>
            <div className="chip-row">
              <span className="chip">Level {user.level}</span>
              <span className="chip">{user.xp} XP total</span>
              <span className="chip">{displayStreak} day streak</span>
            </div>
            <div className="action-row hero-inline-actions">
              <label className="btn btn-secondary btn-compact file-button">
                {avatarPending ? "Uploading..." : "Update Photo"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={avatarPending}
                />
              </label>
              <button className="btn btn-secondary btn-compact" onClick={() => navigate(`/profile/${user.id}`)}>
                View Public Profile
              </button>
            </div>
            {avatarMessage && (
              <div className={`feedback ${avatarMessage.toLowerCase().includes("could not") ? "error" : "success"}`}>
                {avatarMessage}
              </div>
            )}
          </div>
        </div>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => navigate("/matches")}>
            Find Matches
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/coach")}>
            Open Coach
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/nutrition")}>
            Open Nutrition
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/inbox")}>
            Open Inbox
          </button>
        </div>
      </section>

      <section className="stats-grid">
        <div className="card stat-card">
          <span className="eyebrow">Level progress</span>
          <strong>{levelProgress?.xpIntoLevel ?? 0} / {levelTargetXp} XP</strong>
          <div className="progress">
            <div
              className="progress-fill"
              style={{ width: `${levelProgress?.levelProgressPercent ?? 0}%` }}
            />
          </div>
          <p>{levelProgress?.xpNeededForNextLevel ?? 0} XP to next level</p>
        </div>
        <div className="card stat-card">
          <span className="eyebrow">Conversations</span>
          <strong>{user.stats?.conversationCount ?? 0}</strong>
          <p>{user.stats?.unreadMessages ?? 0} unread right now</p>
        </div>
        <div className="card stat-card">
          <span className="eyebrow">Daily streak</span>
          <strong className={justCheckedIn ? "streak-bump" : ""}>{displayStreak} days</strong>
          <p>{user.stats?.totalCheckins ?? 0} total check-ins</p>
        </div>
        <div className="card stat-card">
          <span className="eyebrow">Consistency</span>
          <strong>{displayedConsistency}%</strong>
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
            <div className="checkin-cta">
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
              {user.checkedInToday && <span className="status-inline status-success">Checked in today</span>}
            </div>
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
            <div className="progress-fill" style={{ width: `${displayedConsistency}%` }} />
          </div>
          <p className="muted">Consistency score updates after every successful check-in.</p>
        </div>

        <div className="card">
          <span className="eyebrow">Coach tip</span>
          <h2>Today&apos;s recommendation</h2>
          <p>{coachTip || "Analyzing your recent momentum..."}</p>
        </div>
      </section>

      {nutritionOverview?.summary && (
        <section className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Nutrition Snapshot</span>
              <h2>How today&apos;s meals are supporting training</h2>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate("/nutrition")}>
              Open Tracker
            </button>
          </div>

          <div className="stats-grid">
            <div className="card stat-card">
              <span className="eyebrow">Calories</span>
              <strong>{formatCalories(nutritionOverview.summary.totals.calories)}</strong>
              <p>{formatCalories(nutritionOverview.summary.progress.calories.remaining)} remaining</p>
            </div>
            <div className="card stat-card">
              <span className="eyebrow">Protein</span>
              <strong>{formatGrams(nutritionOverview.summary.totals.proteinGrams)}</strong>
              <p>{formatGrams(nutritionOverview.summary.progress.proteinGrams.remaining)} remaining</p>
            </div>
            <div className="card stat-card">
              <span className="eyebrow">Meals logged</span>
              <strong>{nutritionOverview.summary.mealCount}</strong>
              <p>{nutritionOverview.summary.coachHeadline}</p>
            </div>
            <div className="card stat-card">
              <span className="eyebrow">Macro balance</span>
              <strong>{nutritionOverview.summary.macroBalanceScore}/100</strong>
              <p>Keep protein and calories aligned with your goal</p>
            </div>
          </div>
        </section>
      )}

      {workoutSummary && (
        <section className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Training Momentum</span>
              <h2>What your recent work says</h2>
            </div>
            <button className="btn btn-secondary" onClick={() => navigate("/coach")}>
              Open Full Coach
            </button>
          </div>

          <div className="stats-grid">
            <div className="card stat-card">
              <span className="eyebrow">Weekly sessions</span>
              <strong>
                {workoutSummary.weeklySessions}/{workoutSummary.weeklyTargetSessions}
              </strong>
              <p>{workoutSummary.adherencePercent}% target adherence</p>
            </div>
            <div className="card stat-card">
              <span className="eyebrow">Weekly minutes</span>
              <strong>{formatMinutes(workoutSummary.weeklyMinutes)}</strong>
              <p>{workoutSummary.totalMinutes28} minutes in the last 28 days</p>
            </div>
            <div className="card stat-card">
              <span className="eyebrow">Readiness</span>
              <strong>{workoutSummary.readinessScore}</strong>
              <p>{workoutSummary.readinessLabel}</p>
            </div>
            <div className="card stat-card">
              <span className="eyebrow">Next focus</span>
              <strong>{workoutSummary.nextSuggestedFocus}</strong>
              <p>{workoutSummary.lastSessionAt ? `Last session ${workoutSummary.lastSessionAt}` : "No session logged yet"}</p>
            </div>
          </div>

          {recentWorkouts.length > 0 ? (
            <div className="space-y-3">
              {recentWorkouts.slice(0, 3).map((workout) => (
                <article key={workout.id} className="subtle-card">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{workout.focusArea}</h3>
                      <p className="muted">
                        {formatWorkoutType(workout.workoutType)} / {formatIntensity(workout.intensity)} /{" "}
                        {formatMinutes(workout.durationMinutes)}
                      </p>
                    </div>
                    <div className="muted">{formatDateTime(workout.createdAt)}</div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="feedback">
              Start logging workouts in the Coach tab so your plan and readiness reflect real training.
            </div>
          )}
        </section>
      )}

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
