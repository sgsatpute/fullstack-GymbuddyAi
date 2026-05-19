import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Bot, Dumbbell, Send, Sparkles, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import {
  CoachConversationMessage,
  CoachPlanResponse,
  WorkoutOverview,
} from "../utils/models";
import {
  formatDateTime,
  formatEnergy,
  formatIntensity,
  formatMinutes,
  formatRelativeTime,
  formatShortDate,
  formatWorkoutType,
  titleCase,
} from "../utils/display";

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
  const navigate = useNavigate();
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

  async function loadPlan() {
    const response = await apiFetch("/api/coach/plan");
    const data = (await readJsonOrThrow(response)) as CoachPlanResponse;
    setPlan(data);
    return data;
  }

  async function loadWorkouts() {
    const response = await apiFetch("/api/workouts");
    const data = (await readJsonOrThrow(response)) as WorkoutOverview;
    setWorkouts(data);
    return data;
  }

  async function loadMessages() {
    const response = await apiFetch("/api/coach/messages");
    const data = (await readJsonOrThrow(response)) as CoachConversationMessage[];
    setMessages(data);
    return data;
  }

  useEffect(() => {
    Promise.all([loadPlan(), loadWorkouts(), loadMessages()])
      .catch(() => setError("Could not load your coaching workspace right now."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const adherenceTone = useMemo(() => {
    if (!summary) {
      return "";
    }

    if (summary.adherencePercent >= 100) {
      return "You are hitting your weekly target.";
    }

    if (summary.adherencePercent >= 70) {
      return "You are close to target. One more strong session keeps the week on track.";
    }

    return "This week still has room. Protect the next workout block on your calendar.";
  }, [summary]);

  async function refreshPlan() {
    setLoadingPlan(true);
    setError("");

    try {
      await loadPlan();
    } catch {
      setError("Could not refresh your coach plan.");
    } finally {
      setLoadingPlan(false);
    }
  }

  async function handleWorkoutSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoggingWorkout(true);
    setError("");
    setFeedback("");

    try {
      const response = await apiFetch("/api/workouts", {
        method: "POST",
        body: JSON.stringify(workoutForm),
      });
      const data = (await readJsonOrThrow(response)) as WorkoutOverview & {
        xpGained: number;
      };

      setWorkouts({
        summary: data.summary,
        recentWorkouts: data.recentWorkouts,
      });
      setWorkoutForm((current) => ({
        ...current,
        notes: "",
      }));
      setFeedback(`Workout logged. You earned +${data.xpGained} XP.`);
      loadPlan().catch(() => {});
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save that workout."
      );
    } finally {
      setLoggingWorkout(false);
    }
  }

  async function handleSendMessage(messageOverride?: string) {
    const message = (messageOverride ?? chatDraft).trim();
    if (!message || sendingMessage) {
      return;
    }

    const optimisticUserMessage: CoachConversationMessage = {
      id: Date.now(),
      role: "user",
      content: message,
      createdAt: new Date().toISOString(),
    };

    setSendingMessage(true);
    setError("");
    setChatDraft("");
    setMessages((current) => [...current, optimisticUserMessage]);

    try {
      const response = await apiFetch("/api/coach/message", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
      const data = (await readJsonOrThrow(response)) as { reply: string };

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: data.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
      loadPlan().catch(() => {});
    } catch (sendError) {
      setMessages((current) =>
        current.filter((entry) => entry.id !== optimisticUserMessage.id)
      );
      setChatDraft(message);
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Could not reach the coach right now."
      );
    } finally {
      setSendingMessage(false);
    }
  }

  function handleUsePrompt(message: string) {
    setChatDraft(message);
    setError("");
  }

  if (loading) {
    return <div className="page-section">Loading your coach, plan, and workout history...</div>;
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">Coach</span>
          <h1>Train with a plan that adapts to your week.</h1>
          <p>
            Log real sessions, track readiness, and use the coach whenever you want a sharper next move.
          </p>
          {summary && (
            <div className="chip-row">
              <span className="chip">{summary.readinessLabel}</span>
              <span className="chip">
                {summary.weeklySessions}/{summary.weeklyTargetSessions} weekly sessions
              </span>
              <span className="chip">{formatMinutes(summary.weeklyMinutes)}</span>
            </div>
          )}
        </div>

        <div className="hero-actions">
          <button className="btn btn-primary" onClick={refreshPlan} disabled={loadingPlan}>
            {loadingPlan ? "Refreshing..." : "Refresh Plan"}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </button>
        </div>
      </section>

      {(error || feedback) && (
        <div className={`feedback ${error ? "error" : "success"}`}>
          {error || feedback}
        </div>
      )}

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
            <p>{summary.totalMinutes28} minutes in the last 28 days</p>
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

      {plan && (
        <section className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Mission Control</span>
              <h2>What matters most this week</h2>
            </div>
            <span className="tiny-muted">
              {plan.generatedAt ? `Updated ${formatRelativeTime(plan.generatedAt)}` : ""}
            </span>
          </div>

          <div className="feedback success">
            <strong>{plan.celebrationMoment.title}</strong>
            <p>{plan.celebrationMoment.body}</p>
          </div>

          {plan.workoutMix.length > 0 && (
            <div className="chip-row">
              {plan.workoutMix.map((item) => (
                <span key={item.label} className="chip">
                  {item.label}: {item.count}
                </span>
              ))}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plan.dailyMissions.map((mission) => {
              const progressPercent = Math.min(
                100,
                Math.round((mission.progress / Math.max(mission.target, 1)) * 100)
              );

              return (
                <article key={mission.id} className="subtle-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="eyebrow">{mission.unit}</span>
                      <h3 className="text-base font-semibold">{mission.title}</h3>
                    </div>
                    <span className="chip">
                      {mission.progress}/{mission.target}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/80">{mission.description}</p>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {mission.completed ? "Completed" : `${mission.target - mission.progress > 0 ? mission.target - mission.progress : 0} ${mission.unit} remaining`}
                  </p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="two-column">
        <div className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Coach Summary</span>
              <h2>This week&apos;s direction</h2>
            </div>
            <span className="tiny-muted">
              {plan?.model === "anthropic+heuristics" ? "AI-enhanced" : "Heuristic plan"}
            </span>
          </div>
          <p>{plan?.coachNote || "Your coach note will appear here once the weekly plan loads."}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {plan?.insightCards.map((card) => (
              <article
                key={card.id}
                className={`subtle-card ${card.tone === "positive" ? "gradient-left" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/80">{card.body}</p>
                  </div>
                  <span className="chip">{card.statValue}</span>
                </div>
                <p className="mt-3 text-xs text-muted">{card.statLabel}</p>
              </article>
            ))}
          </div>
        </div>

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
                onChange={(event) =>
                  setWorkoutForm((current) => ({
                    ...current,
                    workoutType: event.target.value,
                  }))
                }
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
                onChange={(event) =>
                  setWorkoutForm((current) => ({
                    ...current,
                    focusArea: event.target.value,
                  }))
                }
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
                onChange={(event) =>
                  setWorkoutForm((current) => ({
                    ...current,
                    durationMinutes: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Intensity</span>
              <select
                value={workoutForm.intensity}
                onChange={(event) =>
                  setWorkoutForm((current) => ({
                    ...current,
                    intensity: event.target.value,
                  }))
                }
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
                onChange={(event) =>
                  setWorkoutForm((current) => ({
                    ...current,
                    energy: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="field field-full">
              <span>Notes</span>
              <textarea
                rows={4}
                value={workoutForm.notes}
                onChange={(event) =>
                  setWorkoutForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
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
      </section>

      {plan && (
        <section className="two-column">
          <div className="card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Nutrition Blueprint</span>
                <h2>Fuel to support the plan</h2>
              </div>
              <Sparkles size={18} />
            </div>

            <p>{plan.nutritionPlan.headline}</p>
            <div className="chip-row">
              <span className="chip">{plan.nutritionPlan.hydrationTargetLiters}L hydration target</span>
              <span className="chip">{plan.nutritionFocus}</span>
            </div>

            <div className="mt-5 grid gap-3">
              {plan.nutritionPlan.meals.map((meal) => (
                <article key={meal.label} className="subtle-card">
                  <h3 className="text-base font-semibold">{meal.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/85">{meal.idea}</p>
                  <p className="mt-2 text-xs text-muted">{meal.reason}</p>
                </article>
              ))}
            </div>

            <div className="feedback mt-4">
              <strong>Snack strategy</strong>
              <p>{plan.nutritionPlan.snackStrategy}</p>
            </div>
          </div>

          <div className="card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Rescue Plan</span>
                <h2>What to do when the week starts slipping</h2>
              </div>
              <Target size={18} />
            </div>

            <div className="feedback">
              <strong>{plan.streakRescue.headline}</strong>
              <p>{plan.streakRescue.body}</p>
            </div>

            <ul className="reason-list">
              {plan.streakRescue.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>

            <div className="subtle-card mt-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <ArrowUpRight size={16} />
                Recovery focus
              </div>
              <p className="mt-2 text-sm leading-6 text-white/80">
                {plan.recoveryFocus}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Weekly Plan</span>
            <h2>Seven days of structure</h2>
          </div>
          <span className="tiny-muted">
            {plan?.model === "anthropic+heuristics" ? "AI-enhanced" : "Heuristic plan"}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plan?.plan.map((day) => (
            <article key={`${day.day}-${day.scheduledFor}`} className="subtle-card flex h-full flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">{day.dayLabel}</span>
                  <h3 className="text-lg font-semibold">{day.title}</h3>
                  <p className="text-sm text-muted">{formatShortDate(day.scheduledFor)}</p>
                </div>
                <span className="chip">{formatWorkoutType(day.workoutType)}</span>
              </div>

              <div className="chip-row">
                <span className="chip">{formatMinutes(day.durationMinutes)}</span>
                <span className="chip">{formatIntensity(day.intensity)}</span>
                <span className="chip">{day.focusArea}</span>
              </div>

              <p className="text-sm leading-6 text-white/80">{day.objective}</p>
            </article>
          ))}
        </div>
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
                    <div className="text-sm text-muted">
                      {formatShortDate(workout.sessionDate)}
                    </div>
                  </div>
                  <div className="chip-row">
                    <span className="chip">{formatMinutes(workout.durationMinutes)}</span>
                    {workout.notes?.trim() && <span className="chip">Notes saved</span>}
                  </div>
                  {workout.notes?.trim() && (
                    <p className="mt-3 text-sm leading-6 text-white/80">{workout.notes}</p>
                  )}
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

        <div className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Coach Chat</span>
              <h2>Ask for the next best move</h2>
            </div>
            <Bot size={18} />
          </div>

          {plan?.quickPrompts?.length ? (
            <div className="chip-row">
              {plan.quickPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  className="chip"
                  onClick={() => handleUsePrompt(prompt.message)}
                  type="button"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="coach-chat-panel">
            <div className="coach-chat-scroll">
              {messages.length === 0 ? (
                <div className="feedback">
                  Ask about today&apos;s workout, your meal timing, or how to recover better this week.
                </div>
              ) : (
                messages.map((message) => (
                  <div key={`${message.id}-${message.createdAt}`} className={message.role === "assistant" ? "coach-chat-row ai" : "coach-chat-row user"}>
                    <div className={message.role === "assistant" ? "chat-bubble-ai" : "chat-bubble-user"}>
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="mt-2 text-[11px] opacity-70">
                        {formatDateTime(message.createdAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <div className="coach-chat-compose">
              <textarea
                rows={3}
                value={chatDraft}
                onChange={(event) => setChatDraft(event.target.value)}
                placeholder="Ask about training, recovery, meals, or how to adjust the plan..."
              />
              <div className="action-row">
                <button className="btn btn-primary" onClick={() => handleSendMessage()} disabled={sendingMessage}>
                  <Send size={16} />
                  {sendingMessage ? "Sending..." : "Send"}
                </button>
                {chatDraft.trim() && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleSendMessage(chatDraft)}
                    disabled={sendingMessage}
                  >
                    Send Prompt
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
