import { useEffect } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";

type LevelUpModalProps = {
  levelUp: null | {
    level: number;
    title: string;
    nextTitle?: string | null;
  };
  onClose: () => void;
};

const unlockedFeatures = [
  "Sharper leaderboard visibility",
  "More profile prestige",
  "Bigger momentum on your streak",
];

export default function LevelUpModal({ levelUp, onClose }: LevelUpModalProps) {
  useEffect(() => {
    if (!levelUp) {
      return;
    }

    confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [levelUp, onClose]);

  return (
    <AnimatePresence>
      {levelUp ? (
        <motion.div
          key={levelUp.level}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] flex items-center justify-center bg-black/75 p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="hero-card max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="eyebrow">Level Up</div>
            <h2 className="mt-2 text-3xl font-semibold">Level {levelUp.level}</h2>
            <p className="mt-1 text-lg text-white/85">{levelUp.title}</p>
            <div className="mt-5 space-y-2">
              {unlockedFeatures.map((feature) => (
                <div key={feature} className="chip">
                  {feature}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
