import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { apiFetch } from "../../utils/api";
import { formatRelativeTime } from "../../utils/display";
import { onNotification } from "../../hooks/useSocket";

type NotificationItem = {
  id?: number;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read?: number;
  createdAt: string;
};

function iconForType(type: string) {
  const icons: Record<string, string> = {
    new_match: "M",
    message: "C",
    partner_active: "A",
    streak_reminder: "S",
    badge_earned: "B",
    level_up: "L",
  };
  return icons[type] ?? "!";
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    apiFetch("/api/notifications")
      .then((response) => response.json())
      .then((data: NotificationItem[]) => setItems(data))
      .catch(() => {});

    return onNotification((payload) => {
      const notification = payload as NotificationItem;
      setItems((current) => [notification, ...current].slice(0, 50));
    });
  }, []);

  const unreadCount = items.filter((item) => !item.read).length;

  async function markAllRead() {
    await apiFetch("/api/notifications/read-all", { method: "PUT" });
    setItems((current) => current.map((item) => ({ ...item, read: 1 })));
  }

  return (
    <div className="relative">
      <button className="btn-ghost relative" onClick={() => setOpen((value) => !value)} aria-label="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 rounded-full bg-accent2 px-1.5 text-xs text-bg">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-theme bg-surface p-3 shadow-2xl"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <div className="section-head">
              <div>
                <span className="eyebrow">Notifications</span>
                <strong>{unreadCount} unread</strong>
              </div>
              <button className="btn-ghost" onClick={markAllRead} aria-label="Mark all read">
                <CheckCheck size={17} />
              </button>
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto">
              {items.length === 0 ? (
                <p className="muted">No notifications yet.</p>
              ) : (
                items.map((item, index) => {
                  const body = (
                    <div className={`subtle-card ${item.read ? "opacity-70" : ""}`}>
                      <div className="flex gap-3">
                        <span className="chip">{iconForType(item.type)}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <p className="muted">{item.body}</p>
                          <span className="tiny-muted">{formatRelativeTime(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  );

                  return item.link ? (
                    <Link key={item.id ?? `${item.createdAt}-${index}`} to={item.link} onClick={() => setOpen(false)}>
                      {body}
                    </Link>
                  ) : (
                    <div key={item.id ?? `${item.createdAt}-${index}`}>{body}</div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
