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

export function titleCase(value?: string | null) {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
