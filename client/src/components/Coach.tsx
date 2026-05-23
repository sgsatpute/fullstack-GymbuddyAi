import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Dumbbell } from "lucide-react";
import { apiFetch } from "../utils/api";
import { CoachPlanResponse, WorkoutOverview, CoachConversationMessage } from "../utils/coachTypes";
import {
  formatShortDate,
  formatMinutes,
  formatWorkoutType,
  formatIntensity,
  formatEnergy,
  formatDateTime,
  titleCase,
} from "../utils/display";
import CoachHeader from "./coach/CoachHeader";
import WorkoutPlan from "./coach/WorkoutPlan";
import CoachChat from "./coach/CoachChat";

const initialWorkoutForm = {
  workoutType: "strength",
  focusArea: "Full Body Strength",
  durationMinutes: 45,
  intensity: "moderate",
  energy: 4,
  notes: "",
};

async function readJsonOrThrow(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "Request failed");
  }
  return data;
}

export default function Coach() {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [loggingWorkout, setLoggingWorkout] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [plan, setPlan] = useState<CoachPlanResponse | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutOverview | null>(null);
  const [messages, setMessages] = useState<CoachConversationMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [workoutForm, setWorkoutForm] = useState(initialWorkoutForm);

  const summary = plan?.summary ?? workouts?.summary ?? null;
  const recentWorkouts = workouts?.recentWorkouts ?? [];

  const loadPlan = async () => setPlan((await readJsonOrThrow(await apiFetch("/api/coach/plan"))) as CoachPlanResponse);
  const loadWorkouts = async () => setWorkouts((await readJsonOrThrow(await apiFetch("/api/workouts"))) as WorkoutOverview);
  const loadMessages = async () => setMessages((await readJsonOrThrow(await apiFetch("/api/coach/messages"))) as CoachConversationMessage[]);

  useEffect(() => {
    Promise.all([loadPlan(), loadWorkouts(), loadMessages()])
      .catch(() => setError("Could not load your coaching workspace right now."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const adherenceTone = useMemo(() => {
    if (!summary) return "";
    if (summary.adherencePercent >= 100) return "You are hitting your weekly target.";
    if (summary.adherencePercent >= 70) return "You are close to target. One more strong session keeps the week on track.";
    return "This week still has room. Protect the next workout block on your calendar.";
  }, [summary]);

  const refreshPlan = async () => {
    setLoadingPlan(true);
    setError("");
    try {
      await loadPlan();
    } catch {
      setError("Could not refresh your coach plan.");
    } finally {
      setLoadingPlan(false);
    }
  };

  const handleWorkoutSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingWorkout(true);
    setError("");
    setFeedback("");
    try {
      const res = await apiFetch("/api/workouts", { method: "POST", body: JSON.stringify(workoutForm) });
      const data = (await readJsonOrThrow(res)) as WorkoutOverview & { xpGained: number };
      setWorkouts({ summary: data.summary, recentWorkouts: data.recentWorkouts });
      setWorkoutForm((current) => ({ ...current, notes: "" }));
      setFeedback(`Workout logged. You earned +${data.xpGained} XP.`);
      loadPlan().catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that workout.");
    } finally {
      setLoggingWorkout(false);
    }
  };

  const handleSendMessage = async (messageOverride?: string) => {
    const message = (messageOverride ?? chatDraft).trim();
    if (!message || sendingMessage) return;

    const optimisticMsg: CoachConversationMessage = {
      id: Date.now(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };

    setSendingMessage(true);
    setError("");
    setChatDraft("");
    setMessages((current) => [...current, optimisticMsg]);

    try {
      const res = await apiFetch("/api/coach/message", { method: "POST", body: JSON.stringify({ message }) });
      const data = (await readJsonOrThrow(res)) as { reply: string };
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", content: data.reply, createdAt: new Date().toISOString() },
      ]);
      loadPlan().catch(() => {});
    } catch (e) {
      setMessages((current) => current.filter((entry) => entry.id !== optimisticMsg.id));
      setChatDraft(message);
      setError(e instanceof Error ? e.message : "Could not reach the coach right now.");
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return <div className="page-section">Loading your coach, plan, and workout history...</div>;
  }

  return (
    <div className="page-stack">
      <CoachHeader summary={summary} onRefresh={refreshPlan} isRefreshing={loadingPlan} />

      {(error || feedback) && <div className={`feedback ${error ? "error" : "success"}`}>{error || feedback}</div>}

      {summary && (
        <section className="stats-grid">
          <div className="card stat-card">
            <span className="eyebrow">Readiness</span>
            <strong>{summary.readinessScore}</strong>
            <p>{summary.readinessLabel}</p>
          </div>
          <div className="card stat-card">
            <span className="eyebrow">Weekly Minutes</span>
            <strong>{summary.weeklyMinutes}</strong>
            <p>{summary.totalMinutes28} mins in 28 days</p>
          </div>
          <div className="card stat-card">
            <span className="eyebrow">Adherence</span>
            <strong>{summary.adherencePercent}%</strong>
            <p>{adherenceTone}</p>
          </div>
          <div className="card stat-card">
            <span className="eyebrow">Next Focus</span>
            <strong>{titleCase(summary.nextSuggestedFocus)}</strong>
            <p>{summary.lastSessionAt ? `Last session ${formatShortDate(summary.lastSessionAt)}` : "No workout logged yet"}</p>
          </div>
        </section>
      )}

      <WorkoutPlan plan={plan} />

      <section className="two-column">
        <div className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Workout Log</span>
              <h2>Capture the session while it&apos;s fresh.</h2>
            </div>
            <Dumbbell size={18} />
          </div>

          <form className="form-grid two-up" onSubmit={handleWorkoutSubmit}>
            <label className="field">
              <span>Workout type</span>
              <select
                value={workoutForm.workoutType}
                onChange={(e) => setWorkoutForm((current) => ({ ...current, workoutType: e.target.value }))}
              >
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="hybrid">Hybrid</option>
                <option value="mobility">Mobility</option>
                <option value="recovery">Recovery</option>
              </select>
            </label>

            <label className="field">
              <span>Focus area</span>
              <input
                value={workoutForm.focusArea}
                onChange={(e) => setWorkoutForm((current) => ({ ...current, focusArea: e.target.value }))}
                placeholder="Upper body strength"
              />
            </label>

            <label className="field">
              <span>Duration (minutes)</span>
              <input
                type="number"
                min={10}
                max={240}
                value={workoutForm.durationMinutes}
                onChange={(e) => setWorkoutForm((current) => ({ ...current, durationMinutes: Number(e.target.value) }))}
              />
            </label>

            <label className="field">
              <span>Intensity</span>
              <select
                value={workoutForm.intensity}
                onChange={(e) => setWorkoutForm((current) => ({ ...current, intensity: e.target.value }))}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </label>

            <label className="field">
              <span>Energy (1-5)</span>
              <input
                type="number"
                min={1}
                max={5}
                value={workoutForm.energy}
                onChange={(e) => setWorkoutForm((current) => ({ ...current, energy: Number(e.target.value) }))}
              />
            </label>

            <label className="field field-full">
              <span>Notes</span>
              <textarea
                rows={4}
                value={workoutForm.notes}
                onChange={(e) => setWorkoutForm((current) => ({ ...current, notes: e.target.value }))}
                placeholder="Anything worth remembering about this session?"
              />
            </label>

            <div className="action-row field-full">
              <button className="btn btn-primary" type="submit" disabled={loggingWorkout}>
                {loggingWorkout ? "Saving Workout..." : "Log Workout"}
              </button>
            </div>
          </form>
        </div>

        <CoachChat
          messages={messages}
          sendingMessage={sendingMessage}
          chatDraft={chatDraft}
          setChatDraft={setChatDraft}
          onSendMessage={handleSendMessage}
          quickPrompts={plan?.quickPrompts}
          onUsePrompt={(msg) => {
            setChatDraft(msg);
            setError("");
          }}
          bottomRef={bottomRef}
        />
      </section>

      <section className="two-column">
        <div className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Recent Sessions</span>
              <h2>Momentum you can actually see</h2>
            </div>
          </div>

          {recentWorkouts.length === 0 ? (
            <div className="feedback">
              Log your first workout here and the coach will start adapting your weekly plan around real training data.
            </div>
          ) : (
            <div className="space-y-3">
              {recentWorkouts.map((workout) => (
                <article key={workout.id} className="subtle-card">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold">{workout.focusArea}</h3>
                      <p className="text-sm text-muted">
                        {formatWorkoutType(workout.workoutType)} / {formatIntensity(workout.intensity)} / {formatEnergy(workout.energy)}
                      </p>
                    </div>
                    <div className="text-sm text-muted">{formatShortDate(workout.sessionDate)}</div>
                  </div>
                  <div className="chip-row">
                    <span className="chip">{formatMinutes(workout.durationMinutes)}</span>
                    {workout.notes?.trim() && <span className="chip">Notes saved</span>}
                  </div>
                  {workout.notes?.trim() && <p className="mt-3 text-sm leading-6 text-white/80">{workout.notes}</p>}
                </article>
              ))}
            </div>
          )}

          {plan && (
            <div className="mt-5">
              <div className="section-head">
                <div>
                  <span className="eyebrow">Activity Feed</span>
                  <h2>Proof that the work is stacking</h2>
                </div>
              </div>

              <div className="space-y-3">
                {plan.activityFeed.map((item) => (
                  <article key={item.id} className="subtle-card">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold">{item.title}</h3>
                        <p className="text-sm leading-6 text-white/80">{item.detail}</p>
                      </div>
                      <div className="text-xs text-muted">{formatDateTime(item.createdAt)}</div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
