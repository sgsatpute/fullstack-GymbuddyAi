import { useEffect, useState } from "react";
import { Activity, Bot, ChevronDown, LayoutDashboard, LogOut, Medal, User as UserIcon, Users, UtensilsCrossed } from "lucide-react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import Avatar from "./Avatar";
import NotificationCenter from "./ui/NotificationCenter";
import { logoutSession, hasStoredToken } from "../utils/auth";
import { apiFetch } from "../utils/api";
import { UserProfile } from "../utils/models";

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
        <NavLink to="/groups" className={({ isActive }) => `btn-ghost ${isActive ? "text-accent border-accent" : ""}`}>
          Groups
        </NavLink>
        <NavLink to="/nutrition" className={({ isActive }) => `btn-ghost ${isActive ? "text-accent border-accent" : ""}`}>
          Nutrition
        </NavLink>
        <NavLink to="/leaderboard" className={({ isActive }) => `btn-ghost ${isActive ? "text-accent border-accent" : ""}`}>
          Leaderboard
        </NavLink>
      </nav>

      <div className="flex items-center gap-3">
        <NotificationCenter />
      <details className="relative">
        <summary className="list-none">
          <button className="btn-ghost flex items-center gap-3">
            <Avatar name={user?.name} avatarUrl={user?.avatarUrl} size="sm" />
            <span>{user?.name ?? "Profile"}</span>
            <ChevronDown size={16} />
          </button>
        </summary>

        <div className="absolute right-0 top-14 w-56 rounded-2xl border border-theme bg-surface p-2 shadow-2xl">
          <Link to="/profile/me" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white hover:bg-white/5">
            <UserIcon size={16} />
            Profile
          </Link>
          <Link to="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white hover:bg-white/5">
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link to="/matches" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white hover:bg-white/5">
            <Users size={16} />
            Matches
          </Link>
          <Link to="/nutrition" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white hover:bg-white/5">
            <UtensilsCrossed size={16} />
            Nutrition
          </Link>
          <Link to="/body-progress" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white hover:bg-white/5">
            <Activity size={16} />
            Body Progress
          </Link>
          <Link to="/leaderboard" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white hover:bg-white/5">
            <Medal size={16} />
            Leaderboard
          </Link>
          <button onClick={handleLogout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </details>
      </div>
    </header>
  );
}
