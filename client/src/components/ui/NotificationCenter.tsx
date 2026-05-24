import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useGamification } from "../../hooks/useGamification";

function timeAgo(value: string) {
  const delta = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (delta < 60) {
    return `${delta}m ago`;
  }
  const hours = Math.floor(delta / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useGamification();
  const items = useMemo(() => notifications.slice(0, 12), [notifications]);

  return (
    <div className="relative">
      <button className="btn-ghost relative" onClick={() => setOpen((current) => !current)}>
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 top-14 z-[75] w-[320px] rounded-3xl border border-theme bg-surface p-3 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="eyebrow">Notifications</div>
                <strong>Recent updates</strong>
              </div>
              <button className="btn-ghost text-xs" onClick={() => void markAllRead()}>
                Mark all read
              </button>
            </div>

            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {items.length === 0 ? (
                <div className="feedback">You are all caught up.</div>
              ) : (
                items.map((item) => (
                  <article key={item.id} className={`subtle-card ${item.read ? "" : "gradient-left"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="text-sm">{item.title}</strong>
                        <p className="mt-1 text-sm text-white/75">{item.body}</p>
                      </div>
                      <span className="tiny-muted whitespace-nowrap">{timeAgo(item.createdAt)}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
