/**
 * GymBuddy AI - Comprehensive TypeScript Type Definitions
 * Centralized types for the entire frontend application
 */

// ============================================================================
// USER TYPES
// ============================================================================

/** Represents a user's profile in the system */
export interface UserProfile {
  id: number;
  name: string;
  email?: string;
  age?: number | null;
  bio?: string | null;
  avatarUrl?: string | null;
  gym?: string | null;
  city?: string | null;
  locationLabel?: string | null; // Exact gym/landmark address
  locationPlaceId?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  goal?: FitnessGoal | null;
  experience?: ExperienceLevel | null;
  preferredTime?: PreferredTime | null;
  consistency: number; // 0-100 percentage
  streak: number; // Current workout streak days
  xp: number;
  level: number;
  createdAt?: string;
  lastCheckIn?: string | null;
  checkedInToday?: boolean;
  profileComplete?: boolean;
  achievements?: Achievement[];
  badges?: Badge[];
  levelProgress?: LevelProgress;
  stats?: UserStats;
  checkinCount?: number;
  matchCount?: number;
  relationship?: UserRelationship;
}

/** User statistics and engagement metrics */
export interface UserStats {
  messagesSent: number;
  unreadMessages: number;
  totalCheckins: number;
  conversationCount: number;
}

/** Relationship status between users */
export interface UserRelationship {
  isSelf: boolean;
  hasMessaged: boolean;
  sameGym: boolean;
  blocked?: boolean;
}

/** User achievement progress */
export interface Achievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
  progressPercent: number;
}

/** User badge/reward */
export interface Badge {
  badgeType: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  earnedAt?: string;
}

/** User level and XP progress */
export interface LevelProgress {
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeededForNextLevel: number;
  levelProgressPercent: number;
}

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

/** Login form data */
export interface LoginForm {
  email: string;
  password: string;
}

/** Registration form data */
export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** Profile completion form */
export interface CompleteProfileForm {
  age?: number;
  gym?: string;
  city?: string;
  locationLabel?: string; // Gym address/landmark
  goal?: FitnessGoal;
  experience?: ExperienceLevel;
  preferredTime?: PreferredTime;
  bio?: string;
}

/** Authentication response from server */
export interface AuthResponse {
  token: string;
  user: UserProfile;
}

// ============================================================================
// CHAT & MESSAGING TYPES
// ============================================================================

/** A single chat message */
export interface ChatMessage {
  id?: number;
  senderId: number;
  receiverId: number;
  message: string;
  createdAt: string;
  seen?: number; // 0 = unseen, 1 = seen
  reactions?: MessageReaction[];
}

/** Conversation summary with latest message */
export interface ConversationSummary {
  userId: number;
  user: UserProfile;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageTime?: string;
  lastMessageSenderId: number;
  unreadCount: number;
  isBlocked?: boolean;
}

/** Message reaction (emoji count) */
export interface MessageReaction {
  emoji: string;
  count: number;
}

/** Send message form data */
export interface SendMessageForm {
  receiverId: number;
  message: string;
}

// ============================================================================
// MATCHING TYPES
// ============================================================================

/** A matched gym buddy */
export interface MatchItem {
  user: UserProfile;
  score: number; // 0-100 match percentage
  reasons: string[]; // Why they matched
  tier: string; // Match tier (perfect, great, good)
  canChat: boolean;
  distanceKm?: number | null;
  locationInsight?: string;
  mapsUrl?: string | null;
}

/** Match status enum */
export enum MatchStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  BLOCKED = "blocked",
}

// ============================================================================
// WORKOUT & COACH TYPES
// ============================================================================

/** A completed workout session */
export interface WorkoutSession {
  id: number;
  userId: number;
  sessionDate: string;
  workoutType: string;
  focusArea: string;
  durationMinutes: number;
  intensity: string;
  energy: number; // 1-5 scale
  notes?: string | null;
  createdAt: string;
}

/** Workout logging form */
export interface WorkoutForm {
  workoutType: string;
  focusArea: string;
  durationMinutes: number;
  intensity: string;
  energy: number;
  notes: string;
}

/** Summary of workout history and adherence */
export interface WorkoutSummary {
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
  workoutTypeBreakdown: Record<string, number>;
  weeklyRecoverySessions: number;
  checkinsLast7: number;
  daysSinceLastSession?: number | null;
  minutesTarget: number;
}

/** Overview of user's workouts */
export interface WorkoutOverview {
  summary: WorkoutSummary;
  recentWorkouts: WorkoutSession[];
}

/** Single day in coach plan */
export interface CoachPlanDay {
  day: number;
  dayLabel: string;
  scheduledFor: string;
  title: string;
  workoutType: string;
  focusArea: string;
  durationMinutes: number;
  intensity: string;
  objective: string;
}

/** Daily mission/goal from coach */
export interface CoachMission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  unit: string;
  completed: boolean;
  emphasis: string; // Importance level
}

/** Insight card from coach */
export interface CoachInsightCard {
  id: string;
  title: string;
  body: string;
  statLabel: string;
  statValue: string;
  tone: string;
}

/** Nutrition plan from coach */
export interface CoachNutritionPlan {
  headline: string;
  hydrationTargetLiters: number;
  meals: NutritionPlanMeal[];
  snackStrategy: string;
}

interface NutritionPlanMeal {
  label: string;
  idea: string;
  reason: string;
}

/** Streak rescue plan when user is falling behind */
export interface StreakRescuePlan {
  headline: string;
  body: string;
  actions: string[];
}

/** Quick prompt suggestion for coach chat */
export interface CoachPromptSuggestion {
  label: string;
  message: string;
}

/** Activity feed item */
export interface CoachActivityItem {
  id: string;
  type: string;
  title: string;
  detail: string;
  createdAt: string;
}

/** Workout mix breakdown */
export interface WorkoutMixItem {
  label: string;
  count: number;
}

/** Celebration moment for achievements */
export interface CelebrationMoment {
  title: string;
  body: string;
}

/** Complete coach plan response from API */
export interface CoachPlanResponse {
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
}

/** Coach conversation message */
export interface CoachConversationMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

// ============================================================================
// NUTRITION TYPES
// ============================================================================

/** Single meal/food entry */
export interface MealEntry {
  id: number;
  userId: number;
  mealDate: string;
  mealType: string; // breakfast, lunch, dinner, snack
  title: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  notes?: string | null;
  imageUrl?: string | null;
  source: string; // manual, ai_analysis, etc
  createdAt: string;
}

/** Add meal form data */
export interface AddMealForm {
  mealType: string;
  title: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  notes?: string;
}

/** Food analysis form for AI */
export interface FoodAnalysisForm {
  description: string; // "I ate 2 rotis with dal"
}

/** AI estimate for food */
export interface FoodImageEstimate {
  title: string;
  mealType: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  confidence: string;
  notes: string;
}

/** Response from food analysis API */
export interface FoodImageAnalysisResponse {
  imageUrl?: string;
  aiUsed: boolean;
  manualReviewRequired: boolean;
  estimate: FoodImageEstimate;
}

/** Macro progress (consumed vs target) */
export interface NutritionMacroProgress {
  consumed: number;
  target: number;
  remaining: number;
  progressPercent: number;
}

/** Daily nutrition summary */
export interface NutritionSummary {
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
}

/** Historical nutrition data point */
export interface NutritionHistoryPoint {
  mealDate: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  mealCount: number;
}

/** Complete nutrition overview */
export interface NutritionOverview {
  date: string;
  summary: NutritionSummary;
  meals: MealEntry[];
  history: NutritionHistoryPoint[];
}

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

/** Leaderboard entry */
export interface LeaderboardEntry extends UserProfile {
  rank: number;
  score: number;
  pointsThisWeek: number;
}

/** Leaderboard data */
export interface LeaderboardData {
  entries: LeaderboardEntry[];
  userRank?: number;
  userScore?: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/** Generic API response wrapper */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
  message?: string;
}

/** Paginated API response */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Error response from API */
export interface ApiError {
  status: number;
  error: string;
  message?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// ENUMS
// ============================================================================

/** Fitness goals enum */
export enum FitnessGoal {
  MUSCLE_GAIN = "muscle",
  WEIGHT_LOSS = "weight_loss",
  ENDURANCE = "endurance",
  FLEXIBILITY = "flexibility",
  GENERAL_FITNESS = "general_fitness",
}

/** Experience level enum */
export enum ExperienceLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
}

/** Preferred training time enum */
export enum PreferredTime {
  MORNING = "morning",
  AFTERNOON = "afternoon",
  EVENING = "evening",
  NIGHT = "night",
}

/** Intensity levels */
export enum IntensityLevel {
  LOW = "low",
  MODERATE = "moderate",
  HIGH = "high",
}

/** Workout types */
export enum WorkoutType {
  STRENGTH = "strength",
  CARDIO = "cardio",
  HYBRID = "hybrid",
  MOBILITY = "mobility",
  RECOVERY = "recovery",
}

/** Meal types */
export enum MealType {
  BREAKFAST = "breakfast",
  LUNCH = "lunch",
  DINNER = "dinner",
  SNACK = "snack",
}

// ============================================================================
// FORM REQUEST TYPES
// ============================================================================

/** Complete profile request */
export interface CompleteProfileRequest extends CompleteProfileForm {
  userId: number;
}

/** Workout logging request */
export interface LogWorkoutRequest extends WorkoutForm {
  userId: number;
}

/** Meal logging request */
export interface LogMealRequest extends AddMealForm {
  userId: number;
}

/** Coach message request */
export interface CoachMessageRequest {
  message: string;
}

/** Match action request */
export interface MatchActionRequest {
  matchId: number;
  action: "accept" | "reject";
}

/** Block user request */
export interface BlockUserRequest {
  userId: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/** Pagination params */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/** Sort params */
export interface SortParams {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

/** Date range filter */
export interface DateRangeFilter {
  startDate: string;
  endDate: string;
}

/** Loading state for async operations */
export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: unknown | null;
}

/** Toast notification */
export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  duration?: number;
}

// ============================================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================================

export type {
  CoachPlanDay as CoachDayPlan,
  CoachMission as CoachGoal,
  WorkoutSession as Workout,
  MealEntry as Meal,
  LeaderboardEntry as LeaderboardUser,
};
