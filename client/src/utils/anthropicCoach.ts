/**
 * Anthropic Claude Integration for GymBuddy AI Coach
 * Handles all interactions with the Anthropic Claude API
 * for personalized fitness coaching
 */

import { UserProfile } from "../utils/types";

interface CoachMessageRequest {
  message: string;
  userContext?: UserProfile;
}

interface CoachMessageResponse {
  reply: string;
  tokensUsed?: {
    input: number;
    output: number;
  };
}

interface WorkoutPlanRequest {
  userProfile: UserProfile;
  workoutHistory?: Array<{
    date: string;
    type: string;
    duration: number;
  }>;
}

/**
 * Generate personalized system prompt for Claude based on user profile
 * This is the key to making the AI coach feel personalized and context-aware
 */
export function generateCoachSystemPrompt(userProfile: UserProfile): string {
  const goals = userProfile.goal || "general fitness";
  const experience = userProfile.experience || "beginner";
  const city = userProfile.city || "your area";
  const preferredTime = userProfile.preferredTime || "flexible";
  const age = userProfile.age || "unknown";

  return `You are Alex, an experienced personal fitness coach for GymBuddy AI.

USER PROFILE:
- Name: ${userProfile.name}
- Age: ${age}
- Location: ${city}${userProfile.locationLabel ? ` (${userProfile.locationLabel})` : ""}
- Fitness Goal: ${goals}
- Experience Level: ${experience}
- Preferred Training Time: ${preferredTime}
- Current Streak: ${userProfile.streak} days
- Level: ${userProfile.level}
- Bio: ${userProfile.bio || "Not provided"}

YOUR COACHING APPROACH:
1. **Personalized Guidance**: Provide fitness advice tailored to their goal and experience level
2. **Local Awareness**: Suggest gyms and training locations in their area (${city})
3. **Realistic Goals**: Create achievable workout plans based on their schedule (${preferredTime})
4. **Motivation**: Acknowledge their ${userProfile.streak}-day streak and encourage consistency
5. **Form & Safety**: Prioritize proper form and injury prevention
6. **Progressive Overload**: Suggest incremental improvements to their training
7. **Recovery**: Include rest day advice and recovery strategies
8. **Nutrition**: Provide basic nutritional guidance (they can log meals in the app)
9. **Mental Health**: Acknowledge the mental benefits of training

COACHING STYLE:
- Encouraging but honest
- Use their name (${userProfile.name})
- Reference their goal (${goals}) frequently
- Acknowledge their experience level (${experience})
- Keep responses concise (2-4 paragraphs max)
- Ask clarifying questions when needed
- Celebrate small wins

RESPONSE GUIDELINES:
- For beginners (${experience === "beginner" ? "THEM" : "others"}): Focus on form, consistency, and building habits
- For intermediates: Focus on progression, periodization, and injury prevention
- For advanced: Focus on optimization, specialty training, and detailed programming
- For muscle gain: Emphasize progressive overload and protein
- For weight loss: Emphasize caloric balance and consistency
- For endurance: Emphasize aerobic capacity and pacing
- For flexibility: Emphasize mobility work and stretching

When they ask about specific exercises, provide:
1. Clear setup and form cues
2. Suggested sets/reps for their level
3. Common mistakes to avoid
4. Progression options

When they ask for workout plans:
1. Ask about their available time per week
2. Ask about equipment access
3. Create a balanced plan matching their goal
4. Include warm-up and cool-down
5. Suggest local gyms in ${city} if relevant

Remember: Your goal is to help them achieve ${goals} while keeping them safe and motivated.`;
}

/**
 * Generate system prompt specifically for creating workout plans
 */
export function generateWorkoutPlanPrompt(userProfile: UserProfile): string {
  return `You are creating a personalized weekly workout plan for ${userProfile.name}.

Their Profile:
- Goal: ${userProfile.goal}
- Experience: ${userProfile.experience}
- Location: ${userProfile.city}${userProfile.locationLabel ? ` (${userProfile.locationLabel})` : ""}
- Training Time: ${userProfile.preferredTime}

Create a realistic, specific, and actionable workout plan that:
1. Takes into account their experience level
2. Aligns with their fitness goal
3. Can be done at local gyms in ${userProfile.city}
4. Fits their preferred training time (${userProfile.preferredTime})
5. Balances intensity, volume, and recovery

Format the plan clearly with:
- Day by day breakdown
- Exercises with sets, reps, and rest periods
- Clear progression cues
- Recovery day suggestions
- Nutritional tips to support the goal

Keep it achievable for a ${userProfile.experience} level athlete.`;
}

/**
 * Generate prompt for analyzing user's fitness progress
 */
export function generateProgressAnalysisPrompt(
  userProfile: UserProfile,
  stats: {
    weeklySessions: number;
    adherencePercent: number;
    totalMinutes: number;
    recentWorkouts: any[];
  }
): string {
  return `Analyze the fitness progress of ${userProfile.name}:

Current Stats:
- Workouts this week: ${stats.weeklySessions}
- Adherence: ${stats.adherencePercent}%
- Total minutes trained: ${stats.totalMinutes}
- Goal: ${userProfile.goal}
- Streak: ${userProfile.streak} days

Recent Activity:
${stats.recentWorkouts.map((w) => `- ${w.focusArea} (${w.durationMinutes} min, ${w.intensity})`).join("\n")}

Provide:
1. A brief assessment of their progress
2. What's working well
3. Areas for improvement
4. Specific actionable recommendations
5. Motivation to keep their ${userProfile.streak}-day streak going

Keep it concise and positive.`;
}

/**
 * Make a request to Claude API for coaching
 * This is called by the backend, which handles the actual API key
 */
export async function askCoach(
  request: CoachMessageRequest
): Promise<CoachMessageResponse> {
  try {
    const response = await fetch("/api/coach/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: request.message,
        userContext: request.userContext,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to get coach response");
    }

    return await response.json();
  } catch (error) {
    console.error("Error asking coach:", error);
    throw error;
  }
}

/**
 * Generate a complete workout plan via Claude
 */
export async function generateWorkoutPlan(
  request: WorkoutPlanRequest
): Promise<{ plan: string }> {
  try {
    const response = await fetch("/api/coach/workout-plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userProfile: request.userProfile,
        workoutHistory: request.workoutHistory,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to generate workout plan");
    }

    return await response.json();
  } catch (error) {
    console.error("Error generating workout plan:", error);
    throw error;
  }
}

/**
 * Analyze user's progress and provide insights
 */
export async function analyzeProgress(userProfile: UserProfile): Promise<{ analysis: string }> {
  try {
    const response = await fetch("/api/coach/analyze-progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: userProfile.id }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Failed to analyze progress");
    }

    return await response.json();
  } catch (error) {
    console.error("Error analyzing progress:", error);
    throw error;
  }
}

/**
 * Handle streaming responses from Claude
 * Useful for real-time updates to the user
 */
export async function* streamCoachResponse(message: string): AsyncGenerator<string> {
  try {
    const response = await fetch("/api/coach/message-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      throw new Error("Failed to stream coach response");
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Response body not readable");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last incomplete line in buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          if (data.token) {
            yield data.token;
          }
        }
      }
    }

    // Handle any remaining buffer
    if (buffer) {
      const data = JSON.parse(buffer.slice(6));
      if (data.token) {
        yield data.token;
      }
    }
  } catch (error) {
    console.error("Error streaming coach response:", error);
    throw error;
  }
}

/**
 * Example usage of the coach API
 * Shows how to integrate Claude coaching in the frontend
 */
export const coachExamples = {
  /**
   * Ask a simple question
   */
  askQuestion: async (message: string, user: UserProfile) => {
    return askCoach({
      message,
      userContext: user,
    });
  },

  /**
   * Generate a workout plan
   */
  createPlan: async (user: UserProfile) => {
    return generateWorkoutPlan({
      userProfile: user,
    });
  },

  /**
   * Get progress analysis
   */
  checkProgress: async (user: UserProfile) => {
    return analyzeProgress(user);
  },

  /**
   * Stream a response for real-time updates
   */
  streamResponse: async (message: string) => {
    const generator = streamCoachResponse(message);
    let fullResponse = "";

    for await (const chunk of generator) {
      fullResponse += chunk;
      // Update UI here with fullResponse
    }

    return fullResponse;
  },
};
