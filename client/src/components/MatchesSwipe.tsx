import React, { useState } from "react";
import { motion } from "framer-motion";

type SwipeDirection = "left" | "right";

type SwipeUser = {
  id: number;
  name: string;
  age: number;
  avatar?: string;
  gym?: string;
  distance?: number;
  compatibility?: number;
  reasons?: string[];
  bio?: string;
  goal?: string;
  experience?: string;
  streak?: number;
  isOnline?: boolean;
};

type MatchCardProps = {
  user: SwipeUser;
  onSwipe?: (userId: number, direction: SwipeDirection) => void;
};

export function MatchCard({ user, onSwipe }: MatchCardProps) {
  const [exitX, setExitX] = useState(0);

  function handleSwipe(direction: SwipeDirection) {
    setExitX(direction === "right" ? 500 : -500);
    onSwipe?.(user.id, direction);
  }

  return (
    <motion.div
      className="absolute w-full cursor-grab overflow-hidden rounded-2xl bg-surface2 shadow-2xl active:cursor-grabbing"
      drag="x"
      dragConstraints={{ left: -300, right: 300 }}
      onDragEnd={(_event, info) => {
        if (info.offset.x > 100) {
          handleSwipe("right");
        } else if (info.offset.x < -100) {
          handleSwipe("left");
        }
      }}
      exit={{ x: exitX, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="relative h-96 w-full bg-gradient-to-b from-electric-500 to-navy-900">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">👤</div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

        {user.isOnline ? (
          <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1 text-sm">
            <div className="status-online" />
            Online
          </div>
        ) : null}

        <div className="absolute left-4 top-4 rounded-full bg-electric-500 px-3 py-1 text-sm font-bold text-white">
          {user.compatibility ?? 0}% Match
        </div>
      </div>

      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">
            {user.name}, {user.age}
          </h2>
          <p className="text-sm text-accent">
            {user.gym} • {user.distance ?? 0}km away
          </p>
        </div>

        <div className="mb-4 space-y-1">
          {user.reasons?.map((reason, index) => (
            <p key={`${reason}-${index}`} className="flex items-center gap-2 text-sm text-gray-400">
              <span className="text-electric-500">✓</span> {reason}
            </p>
          ))}
        </div>

        <p className="mb-4 line-clamp-2 text-sm text-gray-300">{user.bio}</p>

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-surface p-3 text-center">
          <div>
            <p className="text-xs text-gray-400">Goal</p>
            <p className="text-sm font-bold">{user.goal}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Level</p>
            <p className="text-sm font-bold">{user.experience}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Streak</p>
            <p className="text-sm font-bold">{user.streak}d 🔥</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleSwipe("left")}
            className="flex-1 rounded-lg bg-surface py-2 text-white transition hover:bg-surface2"
          >
            ✕ Pass
          </button>
          <button
            onClick={() => handleSwipe("right")}
            className="flex-1 rounded-lg bg-electric-500 py-2 font-bold text-white transition hover:bg-electric-600"
          >
            ❤ Like
          </button>
        </div>
      </div>
    </motion.div>
  );
}

type MatchesSwipeProps = {
  matches?: SwipeUser[];
};

export function MatchesSwipe({ matches = [] }: MatchesSwipeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayMatches] = useState(matches);

  function handleSwipe(userId: number, direction: SwipeDirection) {
    fetch(`/api/matches/${userId}/interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: direction === "right" ? "like" : "pass" }),
    }).catch(() => {});

    setCurrentIndex((current) => current + 1);
  }

  const current = displayMatches[currentIndex];
  if (!current) {
    return (
      <div className="flex h-96 flex-col items-center justify-center">
        <p className="mb-2 text-2xl font-bold">No more matches 👀</p>
        <p className="mb-6 text-gray-400">Check back tomorrow for more.</p>
        <button className="btn-primary">Browse All Users</button>
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-full w-full max-w-sm">
      <MatchCard user={current} onSwipe={handleSwipe} />
      <div className="mt-4 text-center text-sm text-gray-400">
        {currentIndex + 1} / {displayMatches.length}
      </div>
    </div>
  );
}

export default MatchesSwipe;
