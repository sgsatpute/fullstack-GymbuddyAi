import { ArrowRight, Bot, Flame, MessageCircle, Sparkles, Trophy, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import PageWrapper from "./PageWrapper";

const productHighlights = [
  {
    title: "Goal-based matching",
    copy: "Match with people who train at a similar time, gym, and level so planning stays realistic.",
  },
  {
    title: "Workout logging",
    copy: "Capture real training sessions, minutes, energy, and focus areas so progress becomes visible.",
  },
  {
    title: "AI coach support",
    copy: "Get weekly planning, quick coaching replies, and recovery guidance based on your actual momentum.",
  },
];

export default function Home() {
  return (
    <PageWrapper>
      <div className="page-grid landing-experience">
        <section className="hero-card landing-hero relative overflow-hidden min-h-[72vh]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,212,170,0.14),transparent_25%)]" />
          <div className="relative grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
            <div className="space-y-6">
              <span className="badge-pill bg-accent/15 text-accent">AI-powered gym matching</span>
              <div className="space-y-4">
                <h1 className="text-4xl font-bold leading-tight md:text-6xl">
                  Find your gym partner. Stay consistent. Get results.
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted md:text-lg">
                  GymBuddy AI combines matching, workout tracking, and a coach layer so the app can support a real routine, not just the first conversation.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/register" className="btn-primary flex items-center justify-center gap-2 sm:w-auto">
                  Get Started Free <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn-ghost flex items-center justify-center gap-2 sm:w-auto">
                  Login
                </Link>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {["Goal-based matching", "Workout logging", "Coach guidance"].map((item) => (
                  <div key={item} className="rounded-full border border-theme bg-white/5 px-4 py-2 text-sm text-white/85">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              {[
                {
                  title: "Compatibility scoring",
                  subtitle: "Shared gym, timing, and goals drive the match quality.",
                  accent: "bg-accent/15 text-accent",
                },
                {
                  title: "Coach plan ready",
                  subtitle: "Weekly training and recovery direction in one place.",
                  accent: "bg-emerald-500/15 text-emerald-300",
                },
                {
                  title: "Consistency tracking",
                  subtitle: "Streaks, XP, and logged sessions reinforce the habit.",
                  accent: "bg-amber-500/15 text-amber-300",
                },
              ].map((card, index) => (
                <motion.div
                  key={card.title}
                  className="card-glass"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 * index }}
                  style={{ transform: `translateY(${index * 8}px)` }}
                >
                  <div className={`badge-pill ${card.accent}`}>{card.title}</div>
                  <p className="mt-3 text-base font-semibold text-white">{card.subtitle}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="card">
          <p className="section-title">How it works</p>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Users, title: "Build your profile", copy: "Tell the app your goal, gym, city, and training time." },
              { icon: Bot, title: "AI finds your matches", copy: "Compatibility is based on routines, goals, experience, and consistency." },
              { icon: Flame, title: "Train together", copy: "Check in, chat, log sessions, and keep momentum visible." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="subtle-card space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                    <Icon size={20} />
                  </div>
                  <h2 className="text-lg font-semibold">{item.title}</h2>
                  <p className="text-sm leading-6 text-muted">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <p className="section-title">Why GymBuddy?</p>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { icon: Sparkles, title: "AI Matching", copy: "Smarter than swiping. It looks at real training compatibility." },
              { icon: MessageCircle, title: "Real-time Chat", copy: "Message your buddies instantly and keep training plans moving." },
              { icon: Flame, title: "Workout Tracking", copy: "Log sessions, keep streaks visible, and build a weekly rhythm." },
              { icon: Trophy, title: "Leaderboard", copy: "Compete with your gym or city and keep climbing." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="subtle-card flex gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-accent">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted">{item.copy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <p className="section-title">Built For Real Routines</p>
          <div className="grid gap-4 md:grid-cols-3">
            {productHighlights.map((item) => (
              <div key={item.title} className="subtle-card">
                <div className="mb-4 flex items-center gap-3">
                  <div className="avatar-frame h-11 w-11 text-sm font-semibold">
                    {item.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="tiny-muted">Product pillar</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-white/80">{item.copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="card text-center">
          <p className="section-title">Ready?</p>
          <h2 className="text-3xl font-semibold">Ready to find your gym buddy?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted">
            Create your profile, unlock your matches, and start building a routine with someone who actually fits your life.
          </p>
          <div className="mt-6 flex justify-center">
            <Link to="/register" className="btn-primary flex w-full max-w-xs items-center justify-center gap-2">
              Get Started Free <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
