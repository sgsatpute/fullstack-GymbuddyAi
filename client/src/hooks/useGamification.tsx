import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import BadgeModal, { type EarnedBadge } from "../components/ui/BadgeModal";
import LevelUpModal, { type LevelUpPayload } from "../components/ui/LevelUpModal";
import XPToast, { type XPToastItem } from "../components/ui/XPToast";
import { connectSocket, socket } from "./useSocket";

type GamificationContextValue = {
  notifyXpGain: (amount: number, reason?: string) => void;
};

const GamificationContext = createContext<GamificationContextValue>({
  notifyXpGain: () => {},
});

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [xpToasts, setXpToasts] = useState<XPToastItem[]>([]);
  const [badge, setBadge] = useState<EarnedBadge | null>(null);
  const [levelUp, setLevelUp] = useState<LevelUpPayload | null>(null);

  const notifyXpGain = useCallback((amount: number, reason?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const item = { id, amount, reason };
    setXpToasts((current) => [item, ...current].slice(0, 3));
    window.setTimeout(() => {
      setXpToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    connectSocket();

    function handleXp(payload: { xpGained?: number; reason?: string }) {
      notifyXpGain(Number(payload.xpGained ?? 0), payload.reason);
    }

    function handleBadge(payload: EarnedBadge) {
      setBadge(payload);
    }

    function handleLevelUp(payload: LevelUpPayload) {
      setLevelUp(payload);
    }

    socket.on("xp-gained", handleXp);
    socket.on("badge-earned", handleBadge);
    socket.on("level-up", handleLevelUp);

    return () => {
      socket.off("xp-gained", handleXp);
      socket.off("badge-earned", handleBadge);
      socket.off("level-up", handleLevelUp);
    };
  }, [notifyXpGain]);

  return (
    <GamificationContext.Provider value={{ notifyXpGain }}>
      {children}
      <XPToast items={xpToasts} />
      <BadgeModal badge={badge} onClose={() => setBadge(null)} />
      <LevelUpModal levelUp={levelUp} onClose={() => setLevelUp(null)} />
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  return useContext(GamificationContext);
}
