import { ArrowUpRight, Sparkles, Target } from "lucide-react";
import { CoachPlanResponse } from "../../utils/coachTypes";
import {
  formatShortDate,
  formatRelativeTime,
  formatWorkoutType,
  formatMinutes,
  formatIntensity,
  titleCase,
} from "../../utils/display";

interface WorkoutPlanProps {
  plan: CoachPlanResponse | null;
}

export default function WorkoutPlan({ plan }: WorkoutPlanProps) {
  if (!plan) {
    return null;
  }

  return (
    <>
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

      <section className="two-column">
        <div className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Coach Summary</span>
              <h2>This week&apos;s direction</h2>
            </div>
            <span className="tiny-muted">
              {plan.model === "anthropic+heuristics" ? "AI-enhanced" : "Heuristic plan"}
            </span>
          </div>
          <p>{plan.coachNote || "Your coach note will appear here once the weekly plan loads."}</p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {plan.insightCards.map((card) => (
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

        <div className="card h-full">
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
              <span className="eyebrow">Weekly Plan</span>
              <h2>Seven days of structure</h2>
            </div>
            <span className="tiny-muted">
              {plan.model === "anthropic+heuristics" ? "AI-enhanced" : "Heuristic plan"}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            {plan.plan.map((day) => (
              <article key={`${day.day}-${day.scheduledFor}`} className="subtle-card flex h-full flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="eyebrow">{day.dayLabel}</span>
                    <h3 className="text-base font-semibold">{day.title}</h3>
                    <p className="text-xs text-muted">{formatShortDate(day.scheduledFor)}</p>
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
        </div>
      </section>
    </>
  );
}
