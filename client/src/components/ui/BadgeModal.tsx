import { useEffect } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";

type BadgeModalProps = {
  badge: null | {
    id?: string;
    name: string;
    description: string;
    icon: string;
    xpReward: number;
  };
  onClose: () => void;
};

export default function BadgeModal({ badge, onClose }: BadgeModalProps) {
  useEffect(() => {
    if (!badge) {
      return;
    }

    confetti({ particleCount: 90, spread: 70, origin: { y: 0.65 } });
    const timer = window.setTimeout(onClose, 4000);
    return () => window.clearTimeout(timer);
  }, [badge, onClose]);

  return (
    <AnimatePresence>
      {badge ? (
        <motion.div
          key={badge.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-6"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            className="hero-card max-w-sm text-center"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="text-6xl">{badge.icon}</div>
            <div className="eyebrow mt-4">New Achievement!</div>
            <h2 className="mt-2 text-2xl font-semibold">{badge.name}</h2>
            <p className="mt-3 text-sm text-white/80">{badge.description}</p>
            <div className="chip-row justify-center">
              <span className="chip">+{badge.xpReward} XP</span>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
