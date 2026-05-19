const goalLabels: Record<string, string> = {
  muscle: "Muscle Gain",
  fatloss: "Fat Loss",
  fitness: "General Fitness",
};

const timeLabels: Record<string, string> = {
  morning: "Morning",
  evening: "Evening",
  night: "Night",
};

const experienceLabels: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const workoutTypeLabels: Record<string, string> = {
  strength: "Strength",
  cardio: "Cardio",
  hybrid: "Hybrid",
  mobility: "Mobility",
  recovery: "Recovery",
};

const intensityLabels: Record<string, string> = {
  low: "Low Intensity",
  moderate: "Moderate Intensity",
  high: "High Intensity",
};

const mealTypeLabels: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  preworkout: "Pre-Workout",
  postworkout: "Post-Workout",
};

export function formatGoal(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return goalLabels[value] ?? titleCase(value);
}

export function formatTimePreference(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return timeLabels[value] ?? titleCase(value);
}

export function formatExperience(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  return experienceLabels[value] ?? titleCase(value);
}

export function formatWorkoutType(value?: string | null) {
  if (!value) {
    return "Workout";
  }

  return workoutTypeLabels[value] ?? titleCase(value);
}

export function formatIntensity(value?: string | null) {
  if (!value) {
    return "Intensity not set";
  }

  return intensityLabels[value] ?? titleCase(value);
}

export function formatMealType(value?: string | null) {
  if (!value) {
    return "Meal";
  }

  return mealTypeLabels[value] ?? titleCase(value);
}

export function formatMinutes(value?: number | null) {
  if (!Number.isFinite(value)) {
    return "0 min";
  }

  return `${value} min`;
}

export function formatCalories(value?: number | null) {
  if (!Number.isFinite(value)) {
    return "0 kcal";
  }

  const safeValue = Number(value);
  return `${Math.round(safeValue)} kcal`;
}

export function formatGrams(value?: number | null, label = "g") {
  if (!Number.isFinite(value)) {
    return `0${label}`;
  }

  const safeValue = Number(value);
  const rounded = Math.round(safeValue * 10) / 10;
  return `${rounded}${label}`;
}

export function formatDistanceKm(value?: number | null) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return `${value} km away`;
}

export function formatEnergy(value?: number | null) {
  if (!Number.isFinite(value)) {
    return "Energy not set";
  }

  return `${value}/5 energy`;
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDate(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatRelativeTime(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) {
    return "now";
  }

  if (absMinutes < 60) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(diffDays, "day");
}

export function getGreetingFromTime() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function getFirstName(name?: string | null) {
  return String(name ?? "").trim().split(/\s+/)[0] || "there";
}

export function getDateDividerLabel(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfMessage = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfMessage.getTime()) / 86400000);

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Yesterday";
  }

  return formatShortDate(value);
}

export function titleCase(value?: string | null) {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getInitials(name?: string | null) {
  const safeName = String(name ?? "").trim();

  if (!safeName) {
    return "?";
  }

  const parts = safeName.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
