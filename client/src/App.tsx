import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";

import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import Matches from "./components/Matches";
import Chat from "./components/Chat";
import CompleteProfile from "./components/CompleteProfile";
import Leaderboard from "./components/Leaderboard"; // ✅ NEW

function isAuth() {
  return !!localStorage.getItem("token");
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

function Protected({ children }: { children: JSX.Element }) {
  return isAuth() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const loggedIn = isAuth();

  return (
    <BrowserRouter>
      {/* NAVBAR */}
      <nav
        style={{
          padding: 16,
          background: "#2f3542",
          display: "flex",
          gap: 16,
          alignItems: "center",
        }}
      >
        <Link to="/" style={{ color: "#a29bfe" }}>
          Home
        </Link>

        {!loggedIn && (
          <>
            <Link to="/register" style={{ color: "#a29bfe" }}>
              Register
            </Link>
            <Link to="/login" style={{ color: "#a29bfe" }}>
              Login
            </Link>
          </>
        )}

        {loggedIn && (
          <>
            <Link to="/dashboard" style={{ color: "#a29bfe" }}>
              Dashboard
            </Link>
            <Link to="/matches" style={{ color: "#a29bfe" }}>
              Matches
            </Link>
            <Link to="/leaderboard" style={{ color: "#a29bfe" }}>
              Leaderboard
            </Link>
            <Link to="/chat" style={{ color: "#a29bfe" }}>
              Chat
            </Link>
            <button
              onClick={logout}
              style={{
                color: "#a29bfe",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </>
        )}
      </nav>

      {/* ROUTES */}
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/login"
          element={loggedIn ? <Navigate to="/dashboard" /> : <Login />}
        />

        <Route
          path="/register"
          element={loggedIn ? <Navigate to="/dashboard" /> : <Register />}
        />

        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />

        {/* PROFILE COMPLETION */}
        <Route
          path="/complete-profile"
          element={
            <Protected>
              <CompleteProfile />
            </Protected>
          }
        />

        <Route
          path="/matches"
          element={
            <Protected>
              <Matches />
            </Protected>
          }
        />

        <Route
          path="/leaderboard"
          element={
            <Protected>
              <Leaderboard />
            </Protected>
          }
        />

        <Route
          path="/chat"
          element={
            <Protected>
              <Chat />
            </Protected>
          }
        />

        <Route
          path="/chat/:id"
          element={
            <Protected>
              <Chat />
            </Protected>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
