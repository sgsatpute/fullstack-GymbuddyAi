export type Achievement = {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
  progressPercent: number;
};

export type Badge = {
  badgeType: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  earnedAt?: string;
};

export type LevelProgress = {
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeededForNextLevel: number;
  levelProgressPercent: number;
};

export type UserStats = {
  messagesSent: number;
  unreadMessages: number;
  totalCheckins: number;
  conversationCount: number;
};

export type WorkoutSession = {
  id: number;
  userId: number;
  sessionDate: string;
  workoutType: string;
  focusArea: string;
  durationMinutes: number;
  intensity: string;
  energy: number;
  notes?: string | null;
  createdAt: string;
};

export type WorkoutSummary = {
  weeklySessions: number;
  weeklyTargetSessions: number;
  adherencePercent: number;
  weeklyMinutes: number;
  averageEnergy: number;
  totalSessions28: number;
  totalMinutes28: number;
  lastSessionAt?: string | null;
  mostCommonFocus?: string | null;
  readinessScore: number;
  readinessLabel: string;
  nextSuggestedFocus: string;
  workoutTypeBreakdown: {
    strength: number;
    cardio: number;
    hybrid: number;
    mobility: number;
    recovery: number;
  };
  weeklyRecoverySessions: number;
  checkinsLast7: number;
  daysSinceLastSession?: number | null;
  minutesTarget: number;
};

export type WorkoutOverview = {
  summary: WorkoutSummary;
  recentWorkouts: WorkoutSession[];
};

export type CoachPlanDay = {
  day: number;
  dayLabel: string;
  scheduledFor: string;
  title: string;
  workoutType: string;
  focusArea: string;
  durationMinutes: number;
  intensity: string;
  objective: string;
};

export type CoachMission = {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  completed: boolean;
  emphasis: string;
};

export type CoachInsightCard = {
  id: string;
  title: string;
  body: string;
  statLabel: string;
  statValue: string;
  tone: string;
};

export type NutritionPlanMeal = {
  label: string;
  idea: string;
  reason: string;
};

export type CoachNutritionPlan = {
  headline: string;
  hydrationTargetLiters: number;
  meals: NutritionPlanMeal[];
  snackStrategy: string;
};

export type StreakRescuePlan = {
  headline: string;
  body: string;
  actions: string[];
};

export type CoachPromptSuggestion = {
  label: string;
  message: string;
};

export type CoachActivityItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  createdAt: string;
};

export type WorkoutMixItem = {
  label: string;
  count: number;
};

export type CelebrationMoment = {
  title: string;
  body: string;
};

export type CoachPlanResponse = {
  generatedAt: string;
  model: string;
  summary: WorkoutSummary;
  plan: CoachPlanDay[];
  coachNote: string;
  nutritionFocus: string;
  recoveryFocus: string;
  nutritionPlan: CoachNutritionPlan;
  dailyMissions: CoachMission[];
  insightCards: CoachInsightCard[];
  streakRescue: StreakRescuePlan;
  quickPrompts: CoachPromptSuggestion[];
  activityFeed: CoachActivityItem[];
  workoutMix: WorkoutMixItem[];
  celebrationMoment: CelebrationMoment;
};

export type CoachConversationMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type UserProfile = {
  id: number;
  name: string;
  avatarUrl?: string | null;
  age?: number | null;
  email?: string;
  gym?: string | null;
  goal?: string | null;
  experience?: string | null;
  preferredTime?: string | null;
  city?: string | null;
  consistency: number;
  streak: number;
  xp: number;
  level: number;
  bio?: string | null;
  locationLabel?: string | null;
  locationPlaceId?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  createdAt?: string;
  lastCheckIn?: string | null;
  lastCheckinTime?: string | null;
  checkedInToday?: boolean;
  profileComplete?: boolean;
  achievements?: Achievement[];
  badges?: Badge[];
  levelProgress?: LevelProgress;
  stats?: UserStats;
  checkinCount?: number;
  matchCount?: number;
  availableBadges?: Badge[];
  relationship?: {
    isSelf: boolean;
    hasMessaged: boolean;
    sameGym: boolean;
  };
};

export type MatchItem = {
  user: UserProfile;
  score: number;
  reasons: string[];
  tier: string;
  canChat: boolean;
  distanceKm?: number | null;
  locationInsight?: string;
  mapsUrl?: string | null;
};

export type MealEntry = {
  id: number;
  userId: number;
  mealDate: string;
  mealType: string;
  title: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  notes?: string | null;
  imageUrl?: string | null;
  source: string;
  createdAt: string;
};

export type NutritionMacroProgress = {
  consumed: number;
  target: number;
  remaining: number;
  progressPercent: number;
};

export type NutritionSummary = {
  date: string;
  totals: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    fiberGrams: number;
  };
  targets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    fiberGrams: number;
  };
  progress: {
    calories: NutritionMacroProgress;
    proteinGrams: NutritionMacroProgress;
    carbsGrams: NutritionMacroProgress;
    fatGrams: NutritionMacroProgress;
    fiberGrams: NutritionMacroProgress;
  };
  mealCount: number;
  mealTypeBreakdown: Record<string, number>;
  macroBalanceScore: number;
  coachHeadline: string;
};

export type NutritionHistoryPoint = {
  mealDate: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  mealCount: number;
};

export type NutritionOverview = {
  date: string;
  summary: NutritionSummary;
  meals: MealEntry[];
  history: NutritionHistoryPoint[];
};

export type FoodImageEstimate = {
  title: string;
  mealType: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  confidence: string;
  notes: string;
};

export type FoodImageAnalysisResponse = {
  imageUrl: string;
  aiUsed: boolean;
  manualReviewRequired: boolean;
  estimate: FoodImageEstimate;
};

export type ConversationSummary = {
  userId: number;
  user: UserProfile;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageTime?: string;
  lastMessageSenderId: number;
  unreadCount: number;
};

export type MessageReaction = {
  emoji: string;
  count: number;
};

export type ChatMessage = {
  id?: number;
  senderId: number;
  receiverId: number;
  message: string;
  createdAt: string;
  seen?: number;
  reactions?: MessageReaction[];
};
