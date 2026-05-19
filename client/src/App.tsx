import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import Chat from "./components/Chat";
import Coach from "./components/Coach";
import CompleteProfile from "./components/CompleteProfile";
import Dashboard from "./components/Dashboard";
import ForgotPassword from "./components/ForgotPassword";
import Home from "./components/Home";
import Inbox from "./components/Inbox";
import Leaderboard from "./components/Leaderboard";
import Login from "./components/Login";
import Matches from "./components/Matches";
import Nutrition from "./components/Nutrition";
import Profile from "./components/Profile";
import Register from "./components/Register";
import { getCurrentUserId, hasStoredToken } from "./utils/auth";

function Protected({ children }: { children: JSX.Element }) {
  return hasStoredToken() ? children : <Navigate to="/login" replace />;
}

function ProtectedShell({ children }: { children: JSX.Element }) {
  return (
    <Protected>
      <AppShell>{children}</AppShell>
    </Protected>
  );
}

function MyProfileRedirect() {
  const userId = getCurrentUserId();
  return userId ? <Navigate to={`/profile/${userId}`} replace /> : <Navigate to="/dashboard" replace />;
}

export default function App() {
  const loggedIn = hasStoredToken();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={loggedIn ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={loggedIn ? <Navigate to="/dashboard" replace /> : <Register />} />
        <Route path="/forgot-password" element={loggedIn ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedShell>
              <Dashboard />
            </ProtectedShell>
          }
        />
        <Route
          path="/complete-profile"
          element={
            <ProtectedShell>
              <CompleteProfile />
            </ProtectedShell>
          }
        />
        <Route
          path="/matches"
          element={
            <ProtectedShell>
              <Matches />
            </ProtectedShell>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedShell>
              <Leaderboard />
            </ProtectedShell>
          }
        />
        <Route
          path="/coach"
          element={
            <ProtectedShell>
              <Coach />
            </ProtectedShell>
          }
        />
        <Route
          path="/nutrition"
          element={
            <ProtectedShell>
              <Nutrition />
            </ProtectedShell>
          }
        />
        <Route
          path="/inbox"
          element={
            <ProtectedShell>
              <Inbox />
            </ProtectedShell>
          }
        />
        <Route path="/chat" element={<Navigate to="/inbox" replace />} />
        <Route
          path="/chat/:id"
          element={
            <ProtectedShell>
              <Chat />
            </ProtectedShell>
          }
        />
        <Route path="/profile/me" element={<MyProfileRedirect />} />
        <Route path="/profile" element={<MyProfileRedirect />} />
        <Route
          path="/profile/:id"
          element={
            <ProtectedShell>
              <Profile />
            </ProtectedShell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
