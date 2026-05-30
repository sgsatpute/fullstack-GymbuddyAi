import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Medal,
  MessageCircle,
  User as UserIcon,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import { logoutSession, hasStoredToken } from "../utils/auth";
import { apiFetch } from "../utils/api";
import { UserProfile } from "../utils/models";
import NotificationCenter from "./ui/NotificationCenter";

const accountLinks = [
  { to: "/profile/me", label: "Profile", icon: UserIcon },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/matches", label: "Matches", icon: Users },
  { to: "/inbox", label: "Inbox", icon: MessageCircle },
  { to: "/coach", label: "Coach", icon: Bot },
  { to: "/nutrition", label: "Nutrition", icon: UtensilsCrossed },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/body-progress", label: "Body Progress", icon: Activity },
  { to: "/leaderboard", label: "Leaderboard", icon: Medal },
];

export default function TopBar() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (!hasStoredToken()) {
      return;
    }

    apiFetch("/api/users/me")
      .then((response) => response.json())
      .then((data: UserProfile) => setUser(data))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await logoutSession();
    navigate("/login");
  }

  if (!hasStoredToken()) {
    return null;
  }

  return (
    <>
      <header className="topbar-mobile">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="mobile-brand-mark">
            <Bot size={18} />
          </div>
          <div>
            <div className="font-semibold text-white">GymBuddy AI</div>
            <div className="tiny-muted">Social fitness coach</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <NotificationCenter />
          <details className="relative">
            <summary className="mobile-profile-trigger">
              <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
              <ChevronDown size={14} />
            </summary>

            <div className="account-menu mobile-account-menu">
              {accountLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to} className="account-menu-link">
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
              <button onClick={handleLogout} className="account-menu-link danger" type="button">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </details>
        </div>
      </header>

    <header className="topbar-desktop">
      <Link to="/dashboard" className="flex items-center gap-3 font-semibold text-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/20 text-accent">
          <Bot size={20} />
        </div>
        <div>
          <div>GymBuddy AI</div>
          <div className="tiny-muted">Built for consistency</div>
        </div>
      </Link>

      <nav className="flex items-center gap-2">
        <NavLink to="/dashboard" className={({ isActive }) => `btn-ghost ${isActive ? "text-accent border-accent" : ""}`}>
          Dashboard
        </NavLink>
        <NavLink to="/matches" className={({ isActive }) => `btn-ghost ${isActive ? "text-accent border-accent" : ""}`}>
          Matches
        </NavLink>
        <NavLink to="/coach" className={({ isActive }) => `btn-ghost ${isActive ? "text-accent border-accent" : ""}`}>
          Coach
        </NavLink>
        <NavLink to="/nutrition" className={({ isActive }) => `btn-ghost ${isActive ? "text-accent border-accent" : ""}`}>
          Nutrition
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `btn-ghost ${isActive ? "text-accent border-accent" : ""}`}>
          Leaderboard
        </NavLink>
      </nav>

      <div className="flex items-center gap-2">
        <NotificationCenter />
        <details className="relative">
          <summary className="topbar-profile-trigger">
            <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
            <span>{user?.name ?? "Profile"}</span>
            <ChevronDown size={16} />
          </summary>

          <div className="account-menu desktop-account-menu">
            {accountLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="account-menu-link">
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
            <button onClick={handleLogout} className="account-menu-link danger" type="button">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </details>
      </div>
    </header>
    </>
  );
}
