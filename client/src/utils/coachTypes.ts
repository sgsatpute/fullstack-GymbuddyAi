import {
  CoachConversationMessage,
  CoachPlanResponse,
  WorkoutSummary,
  CoachPlanDay,
  CoachMission,
  CoachInsightCard,
  WorkoutSession,
  CoachPromptSuggestion,
  WorkoutOverview
} from "./models";

export interface CoachMessage extends CoachConversationMessage {}

export interface WorkoutPlan extends CoachPlanResponse {}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  description: string;
}

export interface CoachSession {
  summary: WorkoutSummary | null;
  recentWorkouts: WorkoutSession[];
  plan: CoachPlanResponse | null;
}

export type {
  CoachConversationMessage,
  CoachPlanResponse,
  WorkoutSummary,
  CoachPlanDay,
  CoachMission,
  CoachInsightCard,
  WorkoutSession,
  CoachPromptSuggestion,
  WorkoutOverview
};
