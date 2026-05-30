import type { CSSProperties } from "react";
import { motion, type PanInfo, useMotionValue, useTransform } from "framer-motion";
import { Clock, Dumbbell, Heart, MapPin, Sparkles, UserRound, X } from "lucide-react";
import Avatar from "../Avatar";
import {
  formatDistanceKm,
  formatExperience,
  formatGoal,
  formatTimePreference,
} from "../../utils/display";
import { MatchItem } from "../../utils/models";

function getReasons(match: MatchItem) {
  return match.reasons ?? match.compatibilityReasons ?? [];
}

function getTier(match: MatchItem) {
  return match.tier ?? match.matchLabel ?? "Compatible";
}

function getScoreTone(score: number) {
  if (score >= 80) return "elite";
  if (score >= 65) return "strong";
  return "warm";
}

type MatchSpotlightProps = {
  match: MatchItem;
  online: boolean;
  intro?: string;
  introLoading: boolean;
  onSkip: () => void;
  onMessage: () => void;
  onGenerateIntro: () => void;
};

export default function MatchSpotlight({
  match,
  online,
  intro,
  introLoading,
  onSkip,
  onMessage,
  onGenerateIntro,
}: MatchSpotlightProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 0, 220], [-10, 0, 10]);
  const connectOpacity = useTransform(x, [30, 160], [0, 1]);
  const skipOpacity = useTransform(x, [-160, -30], [1, 0]);
  const reasons = getReasons(match).slice(0, 4);
  const tone = getScoreTone(match.score);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x > 130) {
      onMessage();
      return;
    }
    if (info.offset.x < -130) {
      onSkip();
    }
  }

  return (
    <motion.article
      key={match.user.id}
      className="match-spotlight-card"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
    >
      <motion.div className="swipe-overlay connect" style={{ opacity: connectOpacity }}>
        Connect
      </motion.div>
      <motion.div className="swipe-overlay skip" style={{ opacity: skipOpacity }}>
        Skip
      </motion.div>

      <div className="match-card-topline">
        <span className="match-live-signal">
          <span className={online ? "online-dot live" : "online-dot"} />
          {online ? "Active now" : "Ready when schedules align"}
        </span>
        <span className={`match-tier ${tone}`}>{getTier(match)}</span>
      </div>

      <div className="match-profile-hero">
        <div className="match-avatar-wrap">
          <Avatar name={match.user.name} avatarUrl={match.user.avatarUrl} size="lg" />
          {online && <span className="match-avatar-online" />}
        </div>
        <div>
          <h2>{match.user.name}</h2>
          <p>
            {match.user.age ? `${match.user.age} yrs` : "Age hidden"} / {match.user.city || "Nearby athlete"}
          </p>
        </div>
      </div>

      <div className="match-action-dock">
        <button className="match-round-action danger" type="button" onClick={onSkip} aria-label="Skip match">
          <X size={22} />
        </button>
        <button className="btn btn-secondary" type="button" onClick={onGenerateIntro} disabled={!match.canChat || introLoading}>
          <Sparkles size={16} />
          {introLoading ? "Writing..." : intro ? "Rewrite" : "AI Intro"}
        </button>
        <button className="match-round-action love" type="button" onClick={onMessage} aria-label="Message match">
          <Heart size={22} />
        </button>
      </div>

      <div className={`compatibility-ring ${tone}`} style={{ "--score": match.score } as CSSProperties}>
        <strong>{match.score}%</strong>
        <span>Match</span>
      </div>

      <div className="match-signal-grid">
        <span>
          <Dumbbell size={16} />
          {formatGoal(match.user.goal)}
        </span>
        <span>
          <UserRound size={16} />
          {formatExperience(match.user.experience)}
        </span>
        <span>
          <Clock size={16} />
          {formatTimePreference(match.user.preferredTime)}
        </span>
        <span>
          <MapPin size={16} />
          {match.distanceKm !== null && match.distanceKm !== undefined
            ? formatDistanceKm(match.distanceKm)
            : match.user.gym || "Gym not shared"}
        </span>
      </div>

      <p className="match-bio">
        {match.user.bio?.trim() ||
          "Looking for a training partner who can keep the week honest and make workouts feel less solo."}
      </p>

      <div className="match-reason-cloud">
        {reasons.length > 0 ? (
          reasons.map((reason) => <span key={reason}>{reason}</span>)
        ) : (
          <span>Compatible training rhythm</span>
        )}
      </div>

      {intro && (
        <div className="match-intro-card">
          <strong>AI opener ready</strong>
          <p>{intro}</p>
        </div>
      )}

    </motion.article>
  );
}
