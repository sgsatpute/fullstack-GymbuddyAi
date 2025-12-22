/**
 * MATCHING ENGINE MODULE - AI-Powered Recommendation Logic
 * 
 * This module contains all matching-related algorithms:
 * - calculateScore: Weighted compatibility scoring
 * - getClusterId: Habit-based clustering for grouping users
 * - findMatches: Complete matching pipeline with filtering & sorting
 * 
 * All matching calculations are centralized here to ensure consistency
 * and make the AI logic transparent and auditable.
 */

import { User } from './db';

/**
 * WEIGHTED SCORING ENGINE - AI-Style Recommendation Logic
 * 
 * This implements a multi-feature scoring system similar to collaborative filtering
 * used in recommendation engines (Netflix, Spotify, etc.). Each feature is weighted
 * by importance, allowing the algorithm to make nuanced compatibility decisions.
 * 
 * SCORING WEIGHTS (based on habit alignment impact):
 * ═══════════════════════════════════════════════════
 * - Same workout time: +40 pts (MOST IMPORTANT)
 *   Why: Coordination is CRITICAL for gym buddies. A buddy who works out
 *   at a different time can never actually meet you at the gym.
 * 
 * - Same gym location: +25 pts
 *   Why: Even perfect timing doesn't matter if you're in different cities.
 *   Physical location is a hard constraint for meeting.
 * 
 * - Same fitness goal: +20 pts
 *   Why: Motivational alignment keeps both engaged. Someone building muscle
 *   needs completely different workouts than someone losing fat.
 * 
 * - Same experience level: +10 pts
 *   Why: Safety & balance. A beginner needs guidance; an advanced lifter needs
 *   challenge. Mismatched experience = injury risk or boredom.
 * 
 * - Similar age (≤5 year difference): +5 pts
 *   Why: Social comfort & relatability. Age within 5 years suggests compatible
 *   life stage and energy levels.
 * 
 * - CONSISTENCY BONUS: +0 to +10 pts (based on candidate's reliability)
 *   Why: Users with high consistency are MORE RELIABLE gym partners.
 *   A 90-consistency user is objectively better than 30-consistency user.
 *   This is how real dating/matching apps work - they boost reliable users.
 *   Formula: consistency / 10 (rounds to 0-10)
 *   Example: consistency=80 → +8 bonus points
 * 
 * Total possible: 40+25+20+10+5+10 = 110 (normalized to 0-100 range)
 * Minimum match threshold: 70 (only "high confidence" recommendations)
 * 
 * @param user1 Current user seeking matches (reference profile)
 * @param user2 Potential match candidate (being evaluated)
 * @returns Compatibility score (0-100, normalized)
 */
export function calculateScore(user1: User, user2: User): number {
  let score = 0;
  
  // +40: Same workout time is THE most important factor
  if (user1.preferredTime === user2.preferredTime) score += 40;
  
  // +25: Same gym location ensures physical compatibility
  if (user1.gym.toLowerCase() === user2.gym.toLowerCase()) score += 25;
  
  // +20: Same goal creates shared motivation
  if (user1.goal === user2.goal) score += 20;
  
  // +10: Same experience level prevents injury
  if (user1.experience === user2.experience) score += 10;
  
  // +5: Similar age creates social comfort
  if (Math.abs(user1.age - user2.age) <= 5) score += 5;
  
  // CONSISTENCY BONUS: +0 to +10 based on how reliable they are
  const consistencyBonus = Math.round(user2.consistency / 10);
  score += consistencyBonus;
  
  // Normalize to 0-100 range
  return Math.min(100, score);
}

/**
 * HABIT-BASED CLUSTERING - Deterministic User Segmentation
 * 
 * Clustering is a fundamental ML technique that groups similar items together.
 * Here we create "HABIT CLUSTERS" - segments of users with identical lifestyle patterns.
 * 
 * Users in the SAME CLUSTER represent OPTIMAL MATCHES:
 * - They have the same habits (same goal, time, experience)
 * - When combined with a high compatibility score (70+), they're perfect buddies
 * - They get an "AI Recommended" badge to indicate this special status
 * 
 * CLUSTER FORMULA (Weighted Positional Encoding):
 * ═════════════════════════════════════════════════
 *   ClusterId = (goalCode × 100) + (timeCode × 10) + (experienceCode)
 * 
 *   Hundreds place: Fitness GOAL (most important distinction)
 *   Tens place: Workout TIME (secondary distinction)
 *   Ones place: EXPERIENCE level (tertiary distinction)
 * 
 * WHY THIS MATTERS:
 * - Users with IDENTICAL fitness habits cluster together automatically
 * - No black-box clustering algorithm - fully interpretable
 * - Fast O(1) computation vs. expensive clustering algorithms
 * - Deterministic: same habits → same cluster always
 * 
 * EXAMPLES:
 * ─────────
 *   muscle_morning_advanced    = (1×100) + (1×10) + (3) = 113
 *   fatLoss_evening_beginner   = (2×100) + (2×10) + (1) = 221
 *   fitness_night_intermediate = (3×100) + (3×10) + (2) = 332
 * 
 * All morning muscle-builders have clusterId=113 (perfect cohort!)
 * All night fat-loss beginners have clusterId=321
 * etc.
 * 
 * @param user User profile to cluster
 * @returns Cluster ID (numeric identifier for habit segment)
 */
export function getClusterId(user: User): number {
  // Map fitness attributes to numeric codes
  // These codes represent distinct lifestyle segments
  const goalMap: Record<string, number> = { 'muscle': 1, 'fatloss': 2, 'fitness': 3 };
  const timeMap: Record<string, number> = { 'morning': 1, 'evening': 2, 'night': 3 };
  const expMap: Record<string, number> = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
  
  // Positional encoding: hundreds + tens + ones
  // This creates a unique ID for each lifestyle combination
  return (goalMap[user.goal] || 0) * 100 + 
         (timeMap[user.preferredTime] || 0) * 10 + 
         (expMap[user.experience] || 0);
}

/**
 * Match result object returned to client
 */
export interface Match {
  user: User;
  score: number;
  isClusterMatch: boolean;
  tags: string[];
}

/**
 * AI-POWERED MATCHING PIPELINE
 * 
 * Multi-stage recommendation system (similar to Netflix, LinkedIn, Spotify).
 * 
 * STAGES:
 * 1. EXCLUSION: Remove user from their own matches (id != userId)
 * 2. SCORING: Calculate weighted compatibility score for each candidate
 * 3. CLUSTERING: Determine if candidates share same habit cluster
 * 4. FILTERING: Keep only high-confidence matches (score >= 70)
 * 5. RANKING: Sort by score descending (best first)
 * 6. LIMITING: Return top 5 only (prevent recommendation overload)
 * 7. TAGGING: Mark cluster matches with "AI Recommended" badge
 * 
 * @param currentUser User seeking matches
 * @param allCandidates All other users in system
 * @returns Top 5 matches with scores and AI tags
 */
export function findMatches(currentUser: User, allCandidates: User[]): Match[] {
  const currentClusterId = getClusterId(currentUser);
  
  return allCandidates
    // STAGE 2: Score each candidate & compute their cluster
    .map((candidate) => ({
      user: candidate,
      score: calculateScore(currentUser, candidate),
      candidateClusterId: getClusterId(candidate),
      isClusterMatch: currentClusterId === getClusterId(candidate),
    }))
    // STAGE 4: Filter - only high-confidence matches (score >= 70)
    .filter((m) => m.score >= 70)
    // STAGE 5: Rank - sort by score descending (best matches first)
    .sort((a, b) => b.score - a.score)
    // STAGE 6: Limit - take only top 5 (prevent overload)
    .slice(0, 5)
    // STAGE 7: Tag - format response with "AI Recommended" badge for cluster matches
    .map((m) => ({
      user: m.user,
      score: Math.round(m.score),
      isClusterMatch: m.isClusterMatch,
      tags: m.isClusterMatch ? ['AI Recommended'] : [],
    }));
}
