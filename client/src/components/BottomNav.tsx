import { useEffect, useState } from "react";
import { Home, Users, Bot, MessageCircle, User, UtensilsCrossed } from "lucide-react";
import { NavLink } from "react-router-dom";
import { apiFetch } from "../utils/api";
import { hasStoredToken } from "../utils/auth";

const tabs = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/matches", label: "Matches", icon: Users },
  { to: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { to: "/coach", label: "Coach", icon: Bot },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/profile/me", label: "Profile", icon: User },
];

export default function BottomNav() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!hasStoredToken()) {
      return;
    }

    apiFetch("/api/chat/unread-count")
      .then((response) => response.json())
      .then((data: { count?: number }) => setUnreadCount(data.count ?? 0))
      .catch(() => {});
  }, []);

  if (!hasStoredToken()) {
    return null;
  }

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;

        return (
          <NavLink key={tab.to} to={tab.to} className={({ isActive }) => `nav-tab ${isActive ? "active" : ""}`}>
            {({ isActive }) => (
              <>
                <div className="relative">
                  <Icon size={24} />
                  {tab.label === "Chat" && unreadCount > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </div>
                <span>{tab.label}</span>
                {isActive && <span className="nav-dot" />}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
