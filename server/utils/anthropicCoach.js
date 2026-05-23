/**
 * PROMPT 3: Anthropic Claude Coach with Streaming
 * Server-Sent Events for real-time streaming responses
 * Conversation memory system with context injection
 */

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const COACH_SYSTEM_PROMPT = `You are GymBuddy's AI Coach - an expert fitness trainer and motivator.
Your role is to provide personalized fitness guidance, motivation, and support.

Key traits:
- Friendly, encouraging, and motivating tone
- Expert knowledge in fitness, strength, nutrition, and recovery
- Personalized recommendations based on user's profile
- Short, conversational responses (2-3 sentences usually)
- Use practical, actionable advice
- Celebrate user's progress and consistency

When responding:
1. Reference the user's profile (goals, experience, preferences)
2. Provide specific, actionable recommendations
3. Use motivational language appropriate to their experience level
4. Keep responses concise and conversational`;

class AnthropicCoach {
  constructor() {
    this.client = client;
  }

  /**
   * Build context from user profile for better coaching
   */
  buildContextPrompt(userProfile) {
    const {
      name = "Friend",
      goal = "fitness",
      experience = "intermediate",
      streak = 0,
      xp = 0,
      level = 1,
      bio = "",
    } = userProfile;

    return `User Profile:
- Name: ${name}
- Goal: ${goal}
- Experience: ${experience}
- Current Streak: ${streak} days
- Total XP: ${xp}
- Level: ${level}
- Bio: ${bio}

Provide coaching tailored to this profile.`;
  }

  /**
   * Stream a coaching message with context
   */
  async streamCoachMessage(userMessage, conversationHistory, userProfile) {
    const contextPrompt = this.buildContextPrompt(userProfile);

    const messages = [
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: userMessage,
      },
    ];

    const systemPrompt = `${COACH_SYSTEM_PROMPT}\n\n${contextPrompt}`;

    try {
      return await this.client.messages.stream({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        system: systemPrompt,
        messages,
      });
    } catch (error) {
      console.error("Claude API error:", error);
      throw error;
    }
  }

  /**
   * Generate a complete coaching response without streaming
   */
  async getCoachMessage(userMessage, conversationHistory, userProfile) {
    const contextPrompt = this.buildContextPrompt(userProfile);

    const messages = [
      ...conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: "user",
        content: userMessage,
      },
    ];

    const systemPrompt = `${COACH_SYSTEM_PROMPT}\n\n${contextPrompt}`;

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        system: systemPrompt,
        messages,
      });

      return response.content[0].text;
    } catch (error) {
      console.error("Claude API error:", error);
      return "I'm having trouble responding right now. Please try again!";
    }
  }

  /**
   * Generate personalized workout recommendations
   */
  async getWorkoutRecommendation(userProfile, focusArea) {
    const contextPrompt = this.buildContextPrompt(userProfile);

    const userMessage = `Based on my profile and the focus area "${focusArea}", what workout would you recommend for today? Include:
1. Specific exercises (3-5)
2. Sets and reps
3. Duration
4. Tips for good form`;

    const systemPrompt = `${COACH_SYSTEM_PROMPT}\n\n${contextPrompt}`;

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 800,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      return response.content[0].text;
    } catch (error) {
      console.error("Claude API error:", error);
      return "Unable to generate workout recommendation";
    }
  }

  /**
   * Generate nutrition/meal suggestions
   */
  async getNutritionAdvice(userProfile, mealContext) {
    const contextPrompt = this.buildContextPrompt(userProfile);

    const userMessage = `For my goal of "${userProfile.goal}", what nutrition tips do you have for ${mealContext}? Be specific and practical.`;

    const systemPrompt = `${COACH_SYSTEM_PROMPT}\n\n${contextPrompt}`;

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      return response.content[0].text;
    } catch (error) {
      console.error("Claude API error:", error);
      return "Unable to generate nutrition advice";
    }
  }

  /**
   * Generate daily motivation message
   */
  async getDailyMotivation(userProfile) {
    const contextPrompt = this.buildContextPrompt(userProfile);

    const userMessage =
      "Give me a short, powerful motivational message for my workout today. Keep it to 2-3 sentences and make it personal.";

    const systemPrompt = `${COACH_SYSTEM_PROMPT}\n\n${contextPrompt}`;

    try {
      const response = await this.client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 200,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      });

      return response.content[0].text;
    } catch (error) {
      console.error("Claude API error:", error);
      return "Keep pushing! Every rep counts!";
    }
  }
}

export default new AnthropicCoach();
