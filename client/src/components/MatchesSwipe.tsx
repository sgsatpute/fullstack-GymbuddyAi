/**
 * PROMPT 6: Matches Swipe Cards
 * Tinder-style swipeable match cards with Framer Motion
 */

import React, { useState } from "react";
import { motion } from "framer-motion";

export const MatchCard = ({ user, onSwipe }) => {
  const [exitX, setExitX] = useState(0);

  const handleSwipe = (direction) => {
    setExitX(direction === "right" ? 500 : -500);
    onSwipe?.(user.id, direction);
  };

  return (
    <motion.div
      className="absolute w-full bg-surface2 rounded-2xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing"
      drag="x"
      dragConstraints={{ left: -300, right: 300 }}
      onDragEnd={(e, info) => {
        if (info.offset.x > 100) {
          handleSwipe("right");
        } else if (info.offset.x < -100) {
          handleSwipe("left");
        }
      }}
      exit={{ x: exitX, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {/* Image */}
      <div className="relative w-full h-96 bg-gradient-to-b from-electric-500 to-navy-900">
        {user.avatar ? (
          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">👤</div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

        {/* Online Status */}
        {user.isOnline && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">
            <div className="status-online"></div>
            Online
          </div>
        )}

        {/* Compatibility Score */}
        <div className="absolute top-4 left-4 bg-electric-500 text-white px-3 py-1 rounded-full font-bold text-sm">
          {user.compatibility}% Match
        </div>
      </div>

      {/* Info Section */}
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">
            {user.name}, {user.age}
          </h2>
          <p className="text-accent text-sm">{user.gym} • {user.distance}km away</p>
        </div>

        {/* Compatibility Reasons */}
        <div className="mb-4 space-y-1">
          {user.reasons?.map((reason, i) => (
            <p key={i} className="text-sm text-gray-400 flex items-center gap-2">
              <span className="text-electric-500">✓</span> {reason}
            </p>
          ))}
        </div>

        {/* Bio */}
        <p className="text-sm text-gray-300 line-clamp-2 mb-4">{user.bio}</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-surface rounded-lg text-center">
          <div>
            <p className="text-xs text-gray-400">Goal</p>
            <p className="font-bold text-sm">{user.goal}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Level</p>
            <p className="font-bold text-sm">{user.experience}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Streak</p>
            <p className="font-bold text-sm">{user.streak}d 🔥</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => handleSwipe("left")}
            className="flex-1 py-2 bg-surface rounded-lg hover:bg-surface2 transition text-white"
          >
            ✕ Pass
          </button>
          <button
            onClick={() => handleSwipe("right")}
            className="flex-1 py-2 bg-electric-500 rounded-lg hover:bg-electric-600 transition text-white font-bold"
          >
            ❤ Like
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const MatchesSwipe = ({ matches = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayMatches, setDisplayMatches] = useState(matches);

  const handleSwipe = (userId, direction) => {
    // Track interaction
    fetch(`/api/matches/${userId}/interaction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: direction === "right" ? "like" : "pass" }),
    });

    // Move to next match
    if (direction === "right" && Math.random() > 0.3) {
      // Show confetti for matches
      showConfetti();
    }

    setCurrentIndex(currentIndex + 1);
  };

  const showConfetti = () => {
    const confetti = document.createElement("div");
    confetti.textContent = "✨";
    confetti.style.position = "fixed";
    confetti.style.left = Math.random() * window.innerWidth + "px";
    confetti.style.top = "50%";
    confetti.style.fontSize = "2rem";
    confetti.style.pointerEvents = "none";
    document.body.appendChild(confetti);

    // Animate
    let y = window.innerHeight / 2;
    const animate = () => {
      y -= 3;
      confetti.style.top = y + "px";
      if (y > -50) requestAnimationFrame(animate);
      else document.body.removeChild(confetti);
    };
    animate();
  };

  const current = displayMatches[currentIndex];

  if (!current) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <p className="text-2xl font-bold mb-2">No more matches 👀</p>
        <p className="text-gray-400 mb-6">Check back tomorrow for more!</p>
        <button className="btn-primary">Browse All Users</button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full max-w-sm mx-auto">
      <MatchCard user={current} onSwipe={handleSwipe} />
      <div className="mt-4 text-center text-sm text-gray-400">
        {currentIndex + 1} / {displayMatches.length}
      </div>
    </div>
  );
};

export default MatchesSwipe;
