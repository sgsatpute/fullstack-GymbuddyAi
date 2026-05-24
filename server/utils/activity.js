import { trackActivity } from "./activityTracker.js";

export function logActivity(userId, actionType, metadata = null) {
  return trackActivity(userId, actionType, metadata);
}
