import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageCircle, Radar, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import MatchSpotlight from "./matches/MatchSpotlight";
import { apiFetch } from "../utils/api";
import { formatGoal } from "../utils/display";
import { MatchItem, UserProfile } from "../utils/models";

type MatchFilter = "all" | "near" | "sameGoal" | "morning" | "evening" | "online";

const filters: Array<{ id: MatchFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "near", label: "Near Me" },
  { id: "sameGoal", label: "Same Goal" },
  { id: "morning", label: "Morning" },
  { id: "evening", label: "Evening" },
  { id: "online", label: "Online Now" },
];

function normalizeOnlineStatus(payload: unknown) {
  const status: Record<number, boolean> = {};
  if (!payload || typeof payload !== "object") return status;

  Object.entries(payload as Record<string, unknown>).forEach(([id, value]) => {
    status[Number(id)] = Boolean(value);
  });

  return status;
}

export default function Matches() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [me, setMe] = useState<UserProfile | null>(null);
  const [onlineByUserId, setOnlineByUserId] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeFilter, setActiveFilter] = useState<MatchFilter>("all");
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);
  const [introLoadingId, setIntroLoadingId] = useState<number | null>(null);
  const [introByUserId, setIntroByUserId] = useState<Record<number, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    async function loadMatches() {
      try {
        const [matchResponse, profileResponse] = await Promise.all([
          apiFetch("/api/matches"),
          apiFetch("/api/users/me"),
        ]);

        if (!matchResponse.ok) {
          const data = await matchResponse.json().catch(() => ({}));
          if (data?.error === "PROFILE_INCOMPLETE") {
            navigate("/complete-profile");
            return;
          }
          throw new Error("Failed to load matches");
        }

        const data = (await matchResponse.json()) as MatchItem[];
        setMatches(data);

        if (profileResponse.ok) {
          setMe((await profileResponse.json()) as UserProfile);
        }

        const ids = data.map((match) => match.user.id).join(",");
        if (ids) {
          const onlineResponse = await apiFetch(`/api/users/online-status?ids=${ids}`);
          if (onlineResponse.ok) {
            setOnlineByUserId(normalizeOnlineStatus(await onlineResponse.json()));
          }
        }
      } catch {
        setError("Could not load your matches right now.");
      } finally {
        setLoading(false);
      }
    }

    loadMatches();
  }, [navigate]);

  const filteredMatches = useMemo(() => {
    return matches
      .filter((match) => !dismissedIds.includes(match.user.id))
      .filter((match) => {
        if (activeFilter === "near") return Number(match.distanceKm ?? 99) <= 5;
        if (activeFilter === "sameGoal") return Boolean(me?.goal && match.user.goal === me.goal);
        if (activeFilter === "morning") return match.user.preferredTime === "morning";
        if (activeFilter === "evening") return match.user.preferredTime === "evening";
        if (activeFilter === "online") return Boolean(onlineByUserId[match.user.id]);
        return true;
      });
  }, [activeFilter, dismissedIds, matches, me?.goal, onlineByUserId]);

  const activeMatch = filteredMatches[0];
  const nextMatches = filteredMatches.slice(1, 4);
  const bestScore = matches.reduce((best, match) => Math.max(best, match.score), 0);
  const nearbyCount = matches.filter((match) => Number(match.distanceKm ?? 99) <= 5).length;
  const chatReadyCount = matches.filter((match) => match.canChat).length;

  async function generateIntro(userId: number) {
    setIntroLoadingId(userId);
    setError("");
    setNotice("");

    try {
      const response = await apiFetch(`/api/matches/${userId}/intro`, { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Could not generate an intro right now.");
        return;
      }

      setIntroByUserId((current) => ({ ...current, [userId]: data.message }));
      setNotice("AI opener generated. Review it, then send when it feels natural.");
    } catch {
      setError("Could not generate an intro right now.");
    } finally {
      setIntroLoadingId(null);
    }
  }

  function skipMatch(userId: number) {
    setDismissedIds((current) => [...current, userId]);
    setNotice("Skipped locally. Refresh the deck if you want to bring profiles back.");
  }

  function openChat(match: MatchItem) {
    if (!match.canChat) {
      setError("This match needs a 60% compatibility score before chat unlocks.");
      return;
    }

    navigate(`/chat/${match.user.id}`, {
      state: introByUserId[match.user.id] ? { draftMessage: introByUserId[match.user.id] } : undefined,
    });
  }

  if (loading) {
    return <div className="page-section">Building your match deck...</div>;
  }

  return (
    <div className="page-stack matches-experience">
      <section className="matches-hero">
        <div className="matches-hero-copy">
          <span className="eyebrow">GymBuddy Discover</span>
          <h1>Find the person who makes training harder to skip.</h1>
          <p>
            Swipe through people ranked by goals, timing, experience, distance, and consistency signals.
          </p>
          <div className="match-hero-actions">
            <button className="btn btn-primary" type="button" onClick={() => navigate("/complete-profile")}>
              Tune Profile
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setDismissedIds([])}>
              <RotateCcw size={16} />
              Reset Deck
            </button>
          </div>
        </div>
        <div className="match-radar-card">
          <Radar size={24} />
          <strong>{matches.length}</strong>
          <span>profiles scanned</span>
          <div className="match-radar-line">
            <span>Best score</span>
            <b>{bestScore}%</b>
          </div>
          <div className="match-radar-line">
            <span>Near you</span>
            <b>{nearbyCount}</b>
          </div>
          <div className="match-radar-line">
            <span>Chat ready</span>
            <b>{chatReadyCount}</b>
          </div>
        </div>
      </section>

      <div className="filter-rail" role="tablist" aria-label="Match filters">
        {filters.map((filter) => (
          <button
            key={filter.id}
            className={`match-filter ${activeFilter === filter.id ? "active" : ""}`}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && <div className="feedback error">{error}</div>}
      {notice && !error && <div className="feedback success">{notice}</div>}

      {matches.length === 0 ? (
        <section className="card empty-state">
          <h2>No strong matches yet</h2>
          <p>Update your profile details or come back after more people complete their training setup.</p>
        </section>
      ) : !activeMatch ? (
        <section className="card empty-state">
          <h2>No profiles in this view</h2>
          <p>Try another filter or reset the deck to review skipped profiles again.</p>
          <button className="btn btn-primary" type="button" onClick={() => setDismissedIds([])}>
            Reset Deck
          </button>
        </section>
      ) : (
        <section className="match-deck-grid">
          <div className="match-deck-stage">
            <div className="match-stack-preview" aria-hidden="true">
              {nextMatches.map((match, index) => (
                <div key={match.user.id} className="match-stack-card" style={{ transform: `translateY(${(index + 1) * 12}px) scale(${1 - index * 0.035})` }} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              <MatchSpotlight
                match={activeMatch}
                online={Boolean(onlineByUserId[activeMatch.user.id])}
                intro={introByUserId[activeMatch.user.id]}
                introLoading={introLoadingId === activeMatch.user.id}
                onSkip={() => skipMatch(activeMatch.user.id)}
                onMessage={() => openChat(activeMatch)}
                onGenerateIntro={() => generateIntro(activeMatch.user.id)}
              />
            </AnimatePresence>
          </div>

          <aside className="match-side-panel">
            <div>
              <span className="eyebrow">Why this page matters</span>
              <h2>Make the next action obvious.</h2>
              <p>
                A good fitness social app should reduce friction: see fit, understand why, message fast.
              </p>
            </div>
            <div className="match-guidance-list">
              <span>Drag right or tap the heart to message.</span>
              <span>Drag left or tap X to skip this profile locally.</span>
              <span>Use AI Intro when you want a natural first message.</span>
            </div>
            <div className="match-mini-list">
              {filteredMatches.slice(0, 4).map((match) => (
                <button key={match.user.id} type="button" onClick={() => openChat(match)}>
                  <Avatar name={match.user.name} avatarUrl={match.user.avatarUrl} size="sm" />
                  <span>
                    <strong>{match.user.name}</strong>
                    <small>{match.score}% / {formatGoal(match.user.goal)}</small>
                  </span>
                  <MessageCircle size={16} />
                </button>
              ))}
            </div>
          </aside>
        </section>
      )}
    </div>
  );
}
