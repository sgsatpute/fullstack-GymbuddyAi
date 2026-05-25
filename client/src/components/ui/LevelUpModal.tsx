import { useEffect } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";

export type LevelUpPayload = {
  level: number;
  title?: string;
  previousLevel?: number;
};

type LevelUpModalProps = {
  levelUp: LevelUpPayload | null;
  onClose: () => void;
};

export default function LevelUpModal({ levelUp, onClose }: LevelUpModalProps) {
  useEffect(() => {
    if (!levelUp) {
      return;
    }

    confetti({ particleCount: 120, spread: 90, origin: { y: 0.65 } });
    const timer = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timer);
  }, [levelUp, onClose]);

  return (
    <AnimatePresence>
      {levelUp && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="card max-w-md text-center"
            initial={{ y: 36, scale: 0.92 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 36, scale: 0.92 }}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="eyebrow">Level up</span>
            <div className="my-5 flex items-center justify-center gap-4">
              <span className="chip">Level {levelUp.previousLevel ?? levelUp.level - 1}</span>
              <span className="text-accent2">to</span>
              <span className="chip border-accent text-accent">Level {levelUp.level}</span>
            </div>
            <h2>{levelUp.title || "New fitness tier unlocked"}</h2>
            <p>More leaderboard pressure, stronger profile signals, and higher status are now unlocked.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
