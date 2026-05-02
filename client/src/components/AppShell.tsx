import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logoutSession, getCurrentUserId } from "../utils/auth";

type AppShellProps = {
  children: ReactNode;
};

export default function AppShell({ children }: AppShellProps) {
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  async function handleLogout() {
    await logoutSession();
    navigate("/login");
  }

  return (
    <div className="shell">
      <header className="shell-header">
        <div className="shell-brand">
          <NavLink to="/dashboard" className="brand-mark">
            GymBuddy AI
          </NavLink>
          <p>Train with the right person, stay consistent, and keep your streak alive.</p>
        </div>

        <nav className="shell-nav">
          <NavLink to="/dashboard" className="shell-link">
            Dashboard
          </NavLink>
          <NavLink to="/matches" className="shell-link">
            Matches
          </NavLink>
          <NavLink to="/inbox" className="shell-link">
            Inbox
          </NavLink>
          <NavLink to="/leaderboard" className="shell-link">
            Leaderboard
          </NavLink>
          {userId && (
            <NavLink to={`/profile/${userId}`} className="shell-link">
              My Profile
            </NavLink>
          )}
        </nav>

        <button className="btn btn-secondary btn-compact" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="shell-main">{children}</main>
    </div>
  );
}
