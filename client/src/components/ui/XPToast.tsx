import { useEffect } from "react";
import { motion } from "framer-motion";

export type XPToastItem = {
  id: string;
  xpGained: number;
  reason?: string;
};

type XPToastProps = {
  toast: XPToastItem;
  onDone: (id: string) => void;
};

export default function XPToast({ toast, onDone }: XPToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDone(toast.id), 3000);
    return () => window.clearTimeout(timer);
  }, [onDone, toast.id]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 30, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, x: 30, y: 12 }}
      className="card-glass fixed bottom-5 right-5 z-[70] flex min-w-[220px] items-center justify-between gap-3"
    >
      <div>
        <div className="eyebrow">XP Gained</div>
        <strong>+{toast.xpGained} XP</strong>
      </div>
      <span className="chip">{toast.reason?.replace(/_/g, " ") || "progress"}</span>
    </motion.div>
  );
}
