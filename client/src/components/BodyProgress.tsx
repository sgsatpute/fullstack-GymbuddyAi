import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../utils/api";
import { formatShortDate } from "../utils/display";

type BodyMetricEntry = {
  id: number;
  weight: number;
  bodyFat?: number | null;
  chest?: number | null;
  waist?: number | null;
  hips?: number | null;
  arms?: number | null;
  mood: number;
  energy: number;
  sleepHours: number;
  waterGlasses: number;
  loggedAt: string;
};

type ProgressPayload = {
  firstEntry: BodyMetricEntry | null;
  latestEntry: BodyMetricEntry | null;
  deltas?: {
    weight: number;
    bodyFat: number | null;
  };
  summary: string;
};

const today = new Date().toISOString().slice(0, 10);

const initialForm = {
  weight: "",
  bodyFat: "",
  waist: "",
  mood: 3,
  energy: 3,
  sleepHours: 7,
  waterGlasses: 6,
  date: today,
};

function optionalNumber(value: string) {
  return value === "" ? undefined : Number(value);
}

export default function BodyProgress() {
  const [entries, setEntries] = useState<BodyMetricEntry[]>([]);
  const [progress, setProgress] = useState<ProgressPayload | null>(null);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadProgress() {
    const [historyResponse, progressResponse] = await Promise.all([
      apiFetch("/api/checkin/body-metrics/history"),
      apiFetch("/api/checkin/body-metrics/progress"),
    ]);

    if (!historyResponse.ok || !progressResponse.ok) {
      throw new Error("Failed to load body progress");
    }

    setEntries(await historyResponse.json());
    setProgress(await progressResponse.json());
  }

  useEffect(() => {
    loadProgress()
      .catch(() => setMessage("Could not load body progress right now."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const response = await apiFetch("/api/checkin/body-metrics", {
        method: "POST",
        body: JSON.stringify({
          weight: Number(form.weight),
          bodyFat: optionalNumber(form.bodyFat),
          waist: optionalNumber(form.waist),
          mood: form.mood,
          energy: form.energy,
          sleepHours: form.sleepHours,
          waterGlasses: form.waterGlasses,
          date: form.date,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Could not save body metrics.");
        return;
      }

      setForm({ ...initialForm, date: today });
      setMessage("Body metrics saved.");
      await loadProgress();
    } catch {
      setMessage("Could not save body metrics.");
    }
  }

  if (loading) {
    return <div className="page-section">Loading body progress...</div>;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Body progress</span>
          <h1>Track trend lines, not daily noise.</h1>
          <p>Log body metrics and compare your first and latest entries against your current training goal.</p>
        </div>
      </section>

      {message && (
        <div className={`feedback ${message.toLowerCase().includes("could not") ? "error" : "success"}`}>
          {message}
        </div>
      )}

      <section className="two-column">
        <form className="card form-card" onSubmit={handleSubmit}>
          <span className="eyebrow">New entry</span>
          <div className="form-grid">
            <label>
              <span>Date</span>
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
            </label>
            <label>
              <span>Weight</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={form.weight}
                onChange={(event) => setForm({ ...form, weight: event.target.value })}
                required
              />
            </label>
            <label>
              <span>Body fat %</span>
              <input
                type="number"
                min="1"
                max="80"
                step="0.1"
                value={form.bodyFat}
                onChange={(event) => setForm({ ...form, bodyFat: event.target.value })}
              />
            </label>
            <label>
              <span>Waist</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={form.waist}
                onChange={(event) => setForm({ ...form, waist: event.target.value })}
              />
            </label>
            <label>
              <span>Mood</span>
              <input
                type="number"
                min={1}
                max={5}
                value={form.mood}
                onChange={(event) => setForm({ ...form, mood: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>Energy</span>
              <input
                type="number"
                min={1}
                max={5}
                value={form.energy}
                onChange={(event) => setForm({ ...form, energy: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>Sleep hours</span>
              <input
                type="number"
                min="0"
                max="24"
                step="0.5"
                value={form.sleepHours}
                onChange={(event) => setForm({ ...form, sleepHours: Number(event.target.value) })}
              />
            </label>
            <label>
              <span>Water glasses</span>
              <input
                type="number"
                min={0}
                value={form.waterGlasses}
                onChange={(event) => setForm({ ...form, waterGlasses: Number(event.target.value) })}
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit">
            Save Metrics
          </button>
        </form>

        <section className="card">
          <span className="eyebrow">AI summary</span>
          <h2>{progress?.latestEntry ? "Progress overview" : "Add two entries"}</h2>
          <p>{progress?.summary || "Body progress analysis will appear after enough entries are logged."}</p>
          {progress?.deltas && (
            <div className="stats-grid">
              <div className="card stat-card">
                <span className="eyebrow">Weight change</span>
                <strong>{progress.deltas.weight.toFixed(1)}</strong>
                <p>kg from first entry</p>
              </div>
              <div className="card stat-card">
                <span className="eyebrow">Body fat change</span>
                <strong>
                  {progress.deltas.bodyFat === null ? "N/A" : progress.deltas.bodyFat.toFixed(1)}
                </strong>
                <p>percentage points</p>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <span className="eyebrow">History</span>
            <h2>Recent body metrics</h2>
          </div>
        </div>

        {entries.length === 0 ? (
          <p className="muted">No body metric entries yet.</p>
        ) : (
          <div className="grid-list">
            {entries.slice(-6).reverse().map((entry) => (
              <article key={entry.id} className="subtle-card">
                <h3>{formatShortDate(entry.loggedAt)}</h3>
                <div className="chip-row">
                  <span className="chip">{entry.weight} kg</span>
                  {entry.bodyFat !== null && entry.bodyFat !== undefined && (
                    <span className="chip">{entry.bodyFat}% body fat</span>
                  )}
                  <span className="chip">Mood {entry.mood}/5</span>
                  <span className="chip">Energy {entry.energy}/5</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
