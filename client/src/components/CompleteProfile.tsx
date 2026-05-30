import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { UserProfile } from "../utils/models";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [age, setAge] = useState<number | "">("");
  const [gym, setGym] = useState("");
  const [city, setCity] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [goal, setGoal] = useState("muscle");
  const [experience, setExperience] = useState("beginner");
  const [preferredTime, setPreferredTime] = useState("morning");
  const [bio, setBio] = useState("");

  useEffect(() => {
    apiFetch("/api/users/me")
      .then((response) => response.json())
      .then((user: UserProfile) => {
        setProfile(user);
        if (user.age) setAge(user.age);
        if (user.gym) setGym(user.gym);
        if (user.city) setCity(user.city);
        if (user.locationLabel) setLocationLabel(user.locationLabel);
        if (user.goal) setGoal(user.goal);
        if (user.experience) setExperience(user.experience);
        if (user.preferredTime) setPreferredTime(user.preferredTime);
        if (user.bio) setBio(user.bio);
      })
      .catch(() => setError("Could not load your profile."))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setError("");

    if (!age || !gym || !city || !goal || !experience || !preferredTime) {
      setError("Please complete the required fields.");
      return;
    }

    setSaving(true);

    try {
      const response = await apiFetch("/api/users/profile", {
        method: "POST",
        body: JSON.stringify({ age, gym, city, goal, experience, preferredTime, bio, locationLabel }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Failed to save profile");
        return;
      }

      navigate("/dashboard");
    } catch {
      setError("Network error while saving profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="page-section">Loading your profile form...</div>;
  }

  return (
    <div className="page-stack onboarding-experience">
      <section className="hero-panel onboarding-hero">
        <div>
          <span className="eyebrow">Complete your profile</span>
          <h1>Help the matching system work harder for you.</h1>
          <p>
            The better your profile, the better the compatibility signals, trust, and conversation quality.
          </p>
        </div>
        <div className="profile-stepper" aria-label="Profile setup progress">
          <div className="step-card active">
            <strong>1</strong>
            <span>Account ready</span>
          </div>
          <div className="step-card active">
            <strong>2</strong>
            <span>Training profile</span>
          </div>
          <div className="step-card">
            <strong>3</strong>
            <span>Match deck</span>
          </div>
        </div>
      </section>

      <section className="card form-card">
        <div className="detail-list">
          <div>
            <span>Name</span>
            <strong>{profile?.name}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{profile?.email}</strong>
          </div>
        </div>

        <div className="form-grid two-up">
          <label className="field">
            <span>Age</span>
            <input
              type="number"
              min={13}
              value={age}
              onChange={(event) => {
                const value = event.target.value;
                setAge(value === "" ? "" : Number(value));
              }}
            />
          </label>

          <label className="field">
            <span>Gym / area</span>
            <input
              placeholder="FitZone Downtown"
              value={gym}
              onChange={(event) => setGym(event.target.value)}
            />
          </label>

          <label className="field">
            <span>City / neighborhood</span>
            <input
              placeholder="Mumbai, Andheri West"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>

          <label className="field field-full">
            <span>Exact training landmark or address</span>
            <input
              placeholder="Gold's Gym Lokhandwala or Andheri Sports Complex"
              value={locationLabel}
              onChange={(event) => setLocationLabel(event.target.value)}
            />
            <small className="tiny-muted">
              This helps the Maps-powered matcher estimate travel distance more accurately.
            </small>
          </label>

          <label className="field">
            <span>Goal</span>
            <select value={goal} onChange={(event) => setGoal(event.target.value)}>
              <option value="muscle">Muscle gain</option>
              <option value="fatloss">Fat loss</option>
              <option value="fitness">General fitness</option>
            </select>
          </label>

          <label className="field">
            <span>Experience</span>
            <select value={experience} onChange={(event) => setExperience(event.target.value)}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>

          <label className="field">
            <span>Preferred workout time</span>
            <select value={preferredTime} onChange={(event) => setPreferredTime(event.target.value)}>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </label>

          <label className="field field-full">
            <span>Bio</span>
            <textarea
              rows={4}
              placeholder="What kind of training partner helps you show up at your best?"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
          </label>
        </div>

        {error && <div className="feedback error">{error}</div>}

        <div className="action-row">
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
            {saving ? "Saving..." : "Save Profile"}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </section>
    </div>
  );
}
