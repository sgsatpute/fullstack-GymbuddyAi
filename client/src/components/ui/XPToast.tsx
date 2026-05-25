import { AnimatePresence, motion } from "framer-motion";

export type XPToastItem = {
  id: string;
  amount: number;
  reason?: string;
};

export default function XPToast({ items }: { items: XPToastItem[] }) {
  return (
    <div className="fixed bottom-24 right-4 z-50 flex w-72 flex-col gap-3">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: 80, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.94 }}
            className="card border-accent/40 bg-bg2/95 shadow-2xl"
          >
            <span className="eyebrow">XP gained</span>
            <div className="text-2xl font-bold text-accent2">+{item.amount} XP</div>
            {item.reason && <p className="muted">{item.reason.replaceAll("_", " ")}</p>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
