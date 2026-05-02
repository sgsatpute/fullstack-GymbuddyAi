import { useNavigate } from "react-router-dom";
import { hasStoredToken } from "../utils/auth";

const features = [
  {
    title: "Meaningful matching",
    copy: "We score compatibility using goals, training schedule, experience, location, and consistency patterns.",
  },
  {
    title: "Daily accountability",
    copy: "Check in, build streaks, collect XP, and stay motivated with feedback that actually reflects your progress.",
  },
  {
    title: "Real conversation flow",
    copy: "Inbox, unread counts, live chat, and profile trust signals make it easier to turn a match into a routine.",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const loggedIn = hasStoredToken();

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-copy">
          <span className="eyebrow">Deploy-ready fitness social product</span>
          <h1>Find the gym partner who keeps your habit alive.</h1>
          <p>
            GymBuddy AI helps people train more consistently by pairing them with compatible partners,
            tracking momentum, and making it easier to stay accountable together.
          </p>

          <div className="hero-actions">
            <button className="btn btn-primary" onClick={() => navigate(loggedIn ? "/dashboard" : "/register")}>
              {loggedIn ? "Open Dashboard" : "Create Account"}
            </button>
            <button className="btn btn-secondary" onClick={() => navigate(loggedIn ? "/matches" : "/login")}>
              {loggedIn ? "Browse Matches" : "Login"}
            </button>
          </div>

          <div className="chip-row">
            <span className="chip">AI-based compatibility</span>
            <span className="chip">Daily streak system</span>
            <span className="chip">Live messaging</span>
          </div>
        </div>

        <div className="hero-showcase">
          <div className="showcase-card accent-panel">
            <span className="eyebrow">Today’s value</span>
            <strong>Turn intent into routine.</strong>
            <p>Better partner fit, better follow-through, better odds of actually showing up.</p>
          </div>
          <div className="showcase-grid">
            <div className="showcase-card">
              <strong>Compatibility first</strong>
              <p>No random swiping. Every match explains why it fits.</p>
            </div>
            <div className="showcase-card">
              <strong>Progress loop</strong>
              <p>XP, streaks, achievements, and leaderboard energy keep users engaged.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="feature-grid">
        {features.map((feature) => (
          <article key={feature.title} className="card feature-card">
            <h2>{feature.title}</h2>
            <p>{feature.copy}</p>
          </article>
        ))}
      </section>

      <section className="card roadmap-card">
        <div>
          <span className="eyebrow">How it works</span>
          <h2>From sign-up to consistency loop</h2>
        </div>
        <div className="step-grid">
          <div>
            <strong>1. Set your training profile</strong>
            <p>Tell the app your goal, gym, preferred time, experience, and training style.</p>
          </div>
          <div>
            <strong>2. Review quality matches</strong>
            <p>See compatibility explanations, view public profiles, and start conversations with confidence.</p>
          </div>
          <div>
            <strong>3. Stay accountable together</strong>
            <p>Check in daily, build streaks, and keep the relationship active through real chat and progress signals.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
