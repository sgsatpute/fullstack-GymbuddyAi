import { FormEvent, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";

type BodyMetric = {
  id: number;
  weight: number;
  mood: number;
  energy: number;
  waterGlasses: number;
  loggedAt: string;
};

export default function BodyProgress() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    weight: "",
    mood: "3",
    energy: "3",
    sleepHours: "7",
    waterGlasses: "6",
  });
  const [message, setMessage] = useState("");

  const historyQuery = useQuery({
    queryKey: ["body-progress-history"],
    queryFn: async () => {
      const response = await apiFetch("/api/checkin/body-metrics/history");
      return (await response.json()) as BodyMetric[];
    },
  });

  const progressQuery = useQuery({
    queryKey: ["body-progress-summary"],
    queryFn: async () => {
      const response = await apiFetch("/api/checkin/body-metrics/progress");
      return response.json();
    },
  });

  const logMetric = useMutation({
    mutationFn: async () => {
      const response = await apiFetch("/api/checkin/body-metrics", {
        method: "POST",
        body: JSON.stringify({
          weight: Number(form.weight),
          mood: Number(form.mood),
          energy: Number(form.energy),
          sleepHours: Number(form.sleepHours),
          waterGlasses: Number(form.waterGlasses),
          date: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not save body metrics");
      }
      return response.json();
    },
    onSuccess: () => {
      setMessage("Body metrics saved.");
      setForm((current) => ({ ...current, weight: "" }));
      queryClient.invalidateQueries({ queryKey: ["body-progress-history"] }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ["body-progress-summary"] }).catch(() => {});
    },
    onError: (error: Error) => setMessage(error.message),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    logMetric.mutate();
  }

  const history = historyQuery.data ?? [];
  const chartData = useMemo(
    () =>
      history.map((entry) => ({
        date: entry.loggedAt.slice(5),
        weight: entry.weight,
      })),
    [history]
  );

  return (
    <div className="page-stack">
      <motion.section className="hero-panel" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <span className="eyebrow">Body Progress</span>
          <h1>See change in trend lines, not single-day noise.</h1>
          <p>Track weight, mood, sleep, and hydration together so your progress story has context.</p>
        </div>
        <div className="chip-row">
          <span className="chip">{history.length} entries</span>
          <span className="chip">90 day view</span>
        </div>
      </motion.section>

      {message ? <div className="feedback">{message}</div> : null}

      <section className="two-column">
        <form className="card form-card" onSubmit={handleSubmit}>
          <div>
            <span className="eyebrow">Quick Check-in</span>
            <h2>Log today’s snapshot</h2>
          </div>
          <div className="form-grid two-up">
            <label className="field">
              <span>Weight (kg)</span>
              <input type="number" value={form.weight} onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))} />
            </label>
            <label className="field">
              <span>Mood</span>
              <input type="range" min={1} max={5} value={form.mood} onChange={(event) => setForm((current) => ({ ...current, mood: event.target.value }))} />
            </label>
            <label className="field">
              <span>Energy</span>
              <input type="range" min={1} max={5} value={form.energy} onChange={(event) => setForm((current) => ({ ...current, energy: event.target.value }))} />
            </label>
            <label className="field">
              <span>Sleep hours</span>
              <input type="number" value={form.sleepHours} onChange={(event) => setForm((current) => ({ ...current, sleepHours: event.target.value }))} />
            </label>
            <label className="field">
              <span>Water glasses</span>
              <input type="number" value={form.waterGlasses} onChange={(event) => setForm((current) => ({ ...current, waterGlasses: event.target.value }))} />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={logMetric.isPending}>
            {logMetric.isPending ? "Saving..." : "Save Check-in"}
          </button>
        </form>

        <div className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">AI Insight</span>
              <h2>Progress summary</h2>
            </div>
          </div>
          <p>{progressQuery.data?.summary || "Log at least two entries to unlock the AI summary."}</p>
          {progressQuery.data?.deltas ? (
            <div className="chip-row">
              <span className="chip">Weight delta: {progressQuery.data.deltas.weight} kg</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="section-head">
          <div>
            <span className="eyebrow">90 Day Trend</span>
            <h2>Weight trend</h2>
          </div>
        </div>
        <div style={{ height: 280 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.45)" />
              <YAxis stroke="rgba(255,255,255,0.45)" />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="var(--accent2)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
