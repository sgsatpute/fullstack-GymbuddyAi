/**
 * Location and Matching Utilities for GymBuddy AI
 * Handles distance calculations, location formatting, and gym matching
 */

import { UserProfile, MatchItem } from "../utils/types";

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param lat1 - Latitude of first location
 * @param lon1 - Longitude of first location
 * @param lat2 - Latitude of second location
 * @param lon2 - Longitude of second location
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display
 * @param distanceKm - Distance in kilometers
 * @returns Formatted string like "2.3 km" or "450 m"
 */
export function formatLocationDistance(distanceKm: number): string {
  if (distanceKm < 0.5) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters}m away`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`;
  } else {
    return `${Math.round(distanceKm)} km away`;
  }
}

/**
 * Generate a location insight based on users' cities and gyms
 * @param userCity - Current user's city
 * @param matchCity - Matched user's city
 * @param userGym - Current user's gym/location label
 * @param matchGym - Matched user's gym/location label
 * @returns Human-readable location insight
 */
export function generateLocationInsight(
  userCity: string | undefined,
  matchCity: string | undefined,
  userGym: string | undefined,
  matchGym: string | undefined
): string {
  if (!matchCity) return "Location not set";

  if (userCity === matchCity) {
    if (userGym && matchGym) {
      return `Both train in ${matchCity}`;
    }
    return `Same city (${matchCity})`;
  }

  return `${matchCity} area`;
}

/**
 * Generate Google Maps URL for directions between two locations
 * @param userLocation - User's location label
 * @param matchLocation - Match's location label
 * @param userCity - User's city
 * @param matchCity - Match's city
 * @returns Google Maps URL
 */
export function generateMapsUrl(
  userLocation: string | undefined,
  matchLocation: string | undefined,
  userCity: string | undefined,
  matchCity: string | undefined
): string {
  const from = userLocation || userCity || "current location";
  const to = matchLocation || matchCity || "destination";

  const fromEncoded = encodeURIComponent(from);
  const toEncoded = encodeURIComponent(to);

  return `https://www.google.com/maps/dir/?api=1&origin=${fromEncoded}&destination=${toEncoded}`;
}

/**
 * Filter matches by distance
 * @param matches - Array of matches
 * @param maxDistanceKm - Maximum distance in kilometers
 * @returns Filtered matches within the distance threshold
 */
export function filterMatchesByDistance(
  matches: MatchItem[],
  maxDistanceKm: number
): MatchItem[] {
  return matches.filter((match) => {
    const distance = match.distanceKm || Infinity;
    return distance <= maxDistanceKm;
  });
}

/**
 * Sort matches by distance (closest first)
 * @param matches - Array of matches
 * @returns Matches sorted by distance
 */
export function sortMatchesByDistance(matches: MatchItem[]): MatchItem[] {
  return [...matches].sort((a, b) => {
    const distA = a.distanceKm || Infinity;
    const distB = b.distanceKm || Infinity;
    return distA - distB;
  });
}

/**
 * Group matches by city
 * @param matches - Array of matches
 * @returns Object with cities as keys and matches as values
 */
export function groupMatchesByCity(
  matches: MatchItem[]
): Record<string, MatchItem[]> {
  return matches.reduce((acc, match) => {
    const city = match.user.city || "Unknown";
    if (!acc[city]) {
      acc[city] = [];
    }
    acc[city].push(match);
    return acc;
  }, {} as Record<string, MatchItem[]>);
}

/**
 * Calculate distance score for match ranking
 * Closer matches get higher scores
 * @param distanceKm - Distance in kilometers
 * @param maxDistanceKm - Maximum distance to consider (default 50km)
 * @returns Score from 0-100
 */
export function calculateDistanceScore(
  distanceKm: number | null | undefined,
  maxDistanceKm: number = 50
): number {
  if (!distanceKm || distanceKm === null || distanceKm === undefined) {
    return 50; // Neutral score if distance unknown
  }

  if (distanceKm > maxDistanceKm) {
    return 0;
  }

  // Closer = higher score
  // 0 km = 100, 50 km = 0
  return Math.round(100 * (1 - distanceKm / maxDistanceKm));
}

/**
 * Create a message intro based on location proximity
 * @param userLocation - Current user's location/gym
 * @param userCity - Current user's city
 * @param matchName - Matched user's name
 * @param matchLocation - Matched user's location/gym
 * @param matchCity - Matched user's city
 * @returns Draft message text
 */
export function generateLocationIntroMessage(
  userLocation: string | undefined,
  userCity: string | undefined,
  matchName: string,
  matchLocation: string | undefined,
  matchCity: string | undefined
): string {
  const userLocDescription =
    userLocation || userCity || "my area";
  const matchLocDescription =
    matchLocation || matchCity || "your area";

  return `Hey ${matchName}! I noticed we both train around the same area (I'm at ${userLocDescription}, you're at ${matchLocDescription}). Want to sync up and hit a session together? 💪`;
}

/**
 * Distance range options for filtering
 */
export const DISTANCE_FILTERS = [
  { value: 5, label: "Within 5 km" },
  { value: 10, label: "Within 10 km" },
  { value: 25, label: "Within 25 km" },
  { value: 50, label: "Within 50 km" },
  { value: Infinity, label: "Anywhere" },
];

/**
 * Check if two users are in the same gym area
 * @param user1 - First user
 * @param user2 - Second user
 * @returns Boolean indicating if users are in the same general area
 */
export function isSameGymArea(
  user1: UserProfile,
  user2: UserProfile
): boolean {
  // Check if same city
  if (user1.city === user2.city && user1.city) {
    return true;
  }

  // Check if similar location labels
  if (
    user1.locationLabel &&
    user2.locationLabel &&
    user1.locationLabel.toLowerCase() === user2.locationLabel.toLowerCase()
  ) {
    return true;
  }

  return false;
}

/**
 * Create a location-aware match suggestion message
 * @param user1 - Current user
 * @param user2 - Matched user
 * @param distance - Distance in km
 * @returns Suggestion message
 */
export function createLocationSuggestion(
  user1: UserProfile,
  user2: UserProfile,
  distance: number | null
): string {
  if (!distance) {
    return `Connect with ${user2.name}`;
  }

  if (distance < 1) {
    return `${user2.name} is very close! Perfect for a quick session 🔥`;
  }

  if (distance < 5) {
    return `${user2.name} is nearby! Easy commute for training together 💪`;
  }

  if (distance < 25) {
    return `${user2.name} is in your area. Plan a training meet-up 🏋️`;
  }

  return `Connect with ${user2.name}`;
}
