import Skeleton from "./Skeleton";

/**
 * Match Card Skeleton
 * Skeleton for a match card (avatar + 2 lines + button)
 */
export function MatchCardSkeleton() {
  return (
    <div className="card p-4 space-y-4">
      {/* Avatar circle + Name */}
      <div className="flex gap-3 items-start">
        <Skeleton width={56} height={56} borderRadius="50%" />
        <div className="flex-1 space-y-2">
          <Skeleton height={20} width="70%" />
          <Skeleton height={16} width="50%" />
        </div>
      </div>

      {/* Stats line */}
      <div className="flex gap-2">
        <Skeleton width="32%" height={20} borderRadius="6px" />
        <Skeleton width="32%" height={20} borderRadius="6px" />
        <Skeleton width="32%" height={20} borderRadius="6px" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Skeleton width="48%" height={40} borderRadius="6px" />
        <Skeleton width="48%" height={40} borderRadius="6px" />
      </div>
    </div>
  );
}

/**
 * Leaderboard Row Skeleton
 * Skeleton for a leaderboard entry
 */
export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg">
      {/* Rank */}
      <Skeleton width={24} height={20} />
      {/* Avatar */}
      <Skeleton width={40} height={40} borderRadius="50%" />
      {/* Name */}
      <div className="flex-1">
        <Skeleton width="60%" height={18} />
      </div>
      {/* Score */}
      <Skeleton width={50} height={20} />
    </div>
  );
}

/**
 * Message Skeleton
 * Skeleton for a chat message
 */
export function MessageSkeleton({ isUser }: { isUser?: boolean }) {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <Skeleton
        width="60%"
        height={60}
        borderRadius="12px"
        className={isUser ? "bg-blue-600/30" : ""}
      />
    </div>
  );
}

/**
 * Profile Skeleton
 * Skeleton for profile page
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      {/* Avatar and basic info */}
      <div className="card p-6 flex flex-col items-center gap-4">
        <Skeleton width={100} height={100} borderRadius="50%" />
        <Skeleton width="50%" height={24} />
        <Skeleton width="60%" height={16} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton height={80} borderRadius="8px" />
        <Skeleton height={80} borderRadius="8px" />
        <Skeleton height={80} borderRadius="8px" />
        <Skeleton height={80} borderRadius="8px" />
      </div>

      {/* Bio section */}
      <div className="card p-4 space-y-3">
        <Skeleton width="40%" height={18} />
        <Skeleton height={60} />
      </div>
    </div>
  );
}

/**
 * Nutrition Card Skeleton
 * Skeleton for a nutrition entry
 */
export function NutritionCardSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      {/* Title + time */}
      <div className="flex justify-between">
        <Skeleton width="50%" height={18} />
        <Skeleton width="20%" height={14} />
      </div>
      {/* Macros */}
      <div className="flex gap-2">
        <Skeleton width="20%" height={16} />
        <Skeleton width="20%" height={16} />
        <Skeleton width="20%" height={16} />
      </div>
      {/* Calories */}
      <Skeleton width="30%" height={20} />
    </div>
  );
}

/**
 * Coach Response Skeleton
 * Skeleton for AI coach response loading
 */
export function CoachResponseSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton height={20} width="100%" />
      <Skeleton height={20} width="95%" />
      <Skeleton height={20} width="90%" />
      <Skeleton height={20} width="80%" />
    </div>
  );
}
