import { useNavigate } from "react-router-dom";
import { WorkoutSummary } from "../../utils/coachTypes";
import { formatMinutes } from "../../utils/display";

interface CoachHeaderProps {
  summary: WorkoutSummary | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  coachName?: string;
  status?: string;
}

export default function CoachHeader({
  summary,
  onRefresh,
  isRefreshing,
  coachName = "Alex",
  status = "Active"
}: CoachHeaderProps) {
  const navigate = useNavigate();

  return (
    <section className="hero-panel">
      <div>
        <span className="eyebrow">Coach {coachName} • {status}</span>
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
        <button className="btn btn-primary" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? "Refreshing..." : "Refresh Plan"}
        </button>
        <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </button>
      </div>
    </section>
  );
}
