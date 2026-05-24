import React, {
  createContext,
  createElement,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import BadgeModal from "../components/ui/BadgeModal";
import LevelUpModal from "../components/ui/LevelUpModal";
import XPToast, { XPToastItem } from "../components/ui/XPToast";
import { apiFetch } from "../utils/api";
import {
  ensureSocketConnection,
  onLeaderboardUpdate,
  onNotification,
  socket,
} from "./useSocket";
import { getCurrentUserId, hasStoredToken } from "../utils/auth";

type NotificationItem = {
  id: number;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  read: number;
  createdAt: string;
};

type GamificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
};

const GamificationContext = createContext<GamificationContextValue | null>(null);

function appendNotification(
  current: NotificationItem[] | undefined,
  item: NotificationItem
) {
  return [item, ...(current ?? [])].slice(0, 50);
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [xpToasts, setXpToasts] = useState<XPToastItem[]>([]);
  const [badge, setBadge] = useState<any>(null);
  const [levelUp, setLevelUp] = useState<any>(null);

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await apiFetch("/api/notifications");
      return (await response.json()) as NotificationItem[];
    },
    enabled: hasStoredToken(),
    refetchInterval: 30000,
    initialData: [] as NotificationItem[],
  });

  useEffect(() => {
    if (!hasStoredToken()) {
      return;
    }

    ensureSocketConnection();
    const userId = getCurrentUserId();
    if (userId) {
      socket.emit("presence:online", userId);
      socket.emit("online", userId);
    }

    function handleXpGained(payload: { xpGained: number; reason?: string }) {
      const toast: XPToastItem = {
        id: `${Date.now()}-${Math.random()}`,
        xpGained: payload.xpGained,
        reason: payload.reason,
      };
      setXpToasts((current) => [...current, toast].slice(-3));
    }

    function handleBadgeEarned(payload: any) {
      setBadge(payload);
    }

    function handleLevelUp(payload: any) {
      setLevelUp(payload);
    }

    function handleNotification(payload: NotificationItem) {
      queryClient.setQueryData<NotificationItem[]>(["notifications"], (current) =>
        appendNotification(current, payload)
      );
    }

    const notificationCleanup = onNotification(handleNotification);
    const leaderboardCleanup = onLeaderboardUpdate(() => {
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] }).catch(() => {});
    });

    socket.on("xp-gained", handleXpGained);
    socket.on("badge-earned", handleBadgeEarned);
    socket.on("level-up", handleLevelUp);

    return () => {
      notificationCleanup();
      leaderboardCleanup();
      socket.off("xp-gained", handleXpGained);
      socket.off("badge-earned", handleBadgeEarned);
      socket.off("level-up", handleLevelUp);
    };
  }, [queryClient]);

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((item) => !item.read).length;

  const value = useMemo<GamificationContextValue>(
    () => ({
      notifications,
      unreadCount,
      markAllRead: async () => {
        await apiFetch("/api/notifications/read-all", { method: "PUT" });
        queryClient.setQueryData<NotificationItem[]>(["notifications"], (current) =>
          (current ?? []).map((item) => ({ ...item, read: 1 }))
        );
      },
    }),
    [notifications, queryClient, unreadCount]
  );

  return createElement(
    GamificationContext.Provider,
    { value },
    children,
    createElement(
      AnimatePresence,
      null,
      xpToasts.map((toast) =>
        createElement(XPToast, {
          key: toast.id,
          toast,
          onDone: (id: string) =>
            setXpToasts((current) => current.filter((entry) => entry.id !== id)),
        })
      )
    ),
    createElement(BadgeModal, {
      badge,
      onClose: () => setBadge(null),
    }),
    createElement(LevelUpModal, {
      levelUp,
      onClose: () => setLevelUp(null),
    })
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamification must be used within GamificationProvider");
  }
  return context;
}
