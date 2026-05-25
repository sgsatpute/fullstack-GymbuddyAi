import { useEffect } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";

export type EarnedBadge = {
  id?: string;
  name: string;
  description: string;
  icon?: string;
  xpReward?: number;
};

type BadgeModalProps = {
  badge: EarnedBadge | null;
  onClose: () => void;
};

export default function BadgeModal({ badge, onClose }: BadgeModalProps) {
  useEffect(() => {
    if (!badge) {
      return;
    }

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.72 } });
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [badge, onClose]);

  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="card max-w-md text-center"
            initial={{ y: 40, scale: 0.9 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={(event) => event.stopPropagation()}
          >
            <motion.div
              className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-accent/20 text-5xl"
              initial={{ scale: 0.4, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
            >
              {badge.icon || "*"}
            </motion.div>
            <span className="eyebrow">New Achievement!</span>
            <h2>{badge.name}</h2>
            <p>{badge.description}</p>
            <div className="feedback success">+{badge.xpReward ?? 0} XP reward</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
