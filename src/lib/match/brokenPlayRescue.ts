import { Player } from "../types/player";
import {
  getCalmRating,
  getHandleRating,
  getSpeedRating
} from "../utils/playerIdentity";

/**
 * Computes player capability score for Broken Play Rescue.
 * Uses calm, handle, and speed.
 */
export function getBrokenPlayRescueIdentity(player: Player): number {
  return (getCalmRating(player) + getHandleRating(player) + getSpeedRating(player)) / 3;
}

/**
 * Calculates trigger scale multiplier for Broken Play Rescue.
 * 
 * Safe trigger scale:
 *   scale = 0.35 + (identity / 100) * 0.25
 *   If tired (stamina < 50), scale is reduced by 35%.
 * 
 * Pure: no RNG, no mutations.
 */
export function calculateBrokenPlayRescueChanceScale(
  identity: number,
  staminaPct: number
): number {
  let scale = 0.35 + (identity / 100) * 0.25;
  if (staminaPct < 50) {
    scale *= 0.65;
  }
  return scale;
}

/**
 * Calculates stamina cost for a Broken Play Rescue attempt.
 * 
 * Safe stamina cost:
 *   cost = max(12, round(25 - (identity / 100) * 8))
 *   If tired (stamina < 50), cost is increased by 25%.
 * 
 * Pure: no RNG, no mutations.
 */
export function calculateBrokenPlayRescueStaminaCost(
  identity: number,
  staminaPct: number
): number {
  let cost = Math.max(12, Math.round(25 - (identity / 100) * 8));
  if (staminaPct < 50) {
    cost = Math.round(cost * 1.25);
  }
  return cost;
}

/**
 * Calculates shooting penalty (subtracted from shot quality) for the rescued attempt.
 * 
 * Safe shot penalty:
 *   penalty = max(0.12, 0.20 - (identity / 100) * 0.05)
 *   If tired (stamina < 50), penalty is increased by 0.04 (making the shot even harder).
 * 
 * Pure: no RNG, no mutations.
 */
export function calculateBrokenPlayRescueShotPenalty(
  identity: number,
  staminaPct: number
): number {
  let penalty = Math.max(0.12, 0.20 - (identity / 100) * 0.05);
  if (staminaPct < 50) {
    penalty += 0.04;
  }
  return penalty;
}
