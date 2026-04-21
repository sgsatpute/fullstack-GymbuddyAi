// client/src/components/CompleteProfile.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";

export default function CompleteProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gym, setGym] = useState("");
  const [goal, setGoal] = useState("muscle");
  const [experience, setExperience] = useState("beginner");
  const [preferredTime, setPreferredTime] = useState("morning");

  useEffect(() => {
    // load current user profile (if any)
    apiFetch("/api/users/me")
      .then(r => r.json())
      .then((u) => {
        setName(u.name || "");
        if (u.age) setAge(u.age);
        if (u.gym) setGym(u.gym);
        if (u.goal) setGoal(u.goal);
        if (u.experience) setExperience(u.experience);
        if (u.preferredTime) setPreferredTime(u.preferredTime);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile() {
    setError("");
    if (!age || !gym || !goal || !experience || !preferredTime) {
      setError("Please fill all required fields.");
      return;
    }

    setSaving(true);

    try {
      const res = await apiFetch("/api/users/profile", {
        method: "POST",
        body: JSON.stringify({ age, gym, goal, experience, preferredTime }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to save profile");
        setSaving(false);
        return;
      }

      // success -> go to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError("Network error while saving profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 520, margin: "48px auto", padding: 20 }}>
      <h2>Complete Your Profile</h2>
      <p style={{ color: "#666" }}>
        Tell us about your gym and goals so we can find the best buddies.
      </p>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 13 }}>Full Name</label>
        <input value={name} readOnly style={{ ...inputStyle, background: "#f8f8f8" }} />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 13 }}>Age</label>
        <input
          type="number"
          value={age}
          onChange={e => setAge(Number(e.target.value))}
          style={inputStyle}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 13 }}>Gym / Location</label>
        <input value={gym} onChange={e => setGym(e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13 }}>Goal</label>
          <select value={goal} onChange={e => setGoal(e.target.value)} style={inputStyle}>
            <option value="muscle">Muscle gain</option>
            <option value="fatloss">Fat loss</option>
            <option value="fitness">General fitness</option>
          </select>
        </div>

        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 13 }}>Experience</label>
          <select value={experience} onChange={e => setExperience(e.target.value)} style={inputStyle}>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontSize: 13 }}>Preferred Workout Time</label>
        <select value={preferredTime} onChange={e => setPreferredTime(e.target.value)} style={inputStyle}>
          <option value="morning">Morning</option>
          <option value="evening">Evening</option>
          <option value="night">Night</option>
        </select>
      </div>

      {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button onClick={saveProfile} disabled={saving} style={primaryBtn}>
          {saving ? "Saving..." : "Save & Continue"}
        </button>

        <button
          onClick={() => navigate("/dashboard")}
          style={{ padding: "10px 14px", borderRadius: 8 }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  marginTop: 6,
  borderRadius: 8,
  border: "1px solid #ccc",
};

const primaryBtn: React.CSSProperties = {
  flex: 1,
  padding: "10px 14px",
  borderRadius: 8,
  border: "none",
  background: "#6c5ce7",
  color: "#fff",
  cursor: "pointer",
};
