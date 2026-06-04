import { Player } from "../types/player";
import { getDriveTendency, getPullUpTendency } from "../utils/playerIdentity";

export interface ShotIntentWeights {
  driveMultiplier: number;
  pullUpMultiplier: number;
}

/**
 * Calculates multipliers for shot selection based on player tendencies and stamina.
 * High driveTendency boosts rim/drive shots.
 * High pullUpTendency boosts pull-up jumpers.
 * Low stamina scales down the tendency boosts.
 */
export function calculateShotIntentWeights(
  player: Player,
  staminaPct: number
): ShotIntentWeights {
  let driveTendency = getDriveTendency(player);
  let pullUpTendency = getPullUpTendency(player);

  // Safeguard in case attributes are specified on a 0-100 scale
  if (driveTendency > 1.0) driveTendency /= 100;
  if (pullUpTendency > 1.0) pullUpTendency /= 100;

  driveTendency = Math.max(0, Math.min(1, driveTendency));
  pullUpTendency = Math.max(0, Math.min(1, pullUpTendency));

  // Stepped stamina decay scaling matching existing fatigue buckets:
  // - staminaPct >= 70: full boost
  // - staminaPct >= 40: 0.75 boost
  // - staminaPct >= 20: 0.50 boost
  // - staminaPct < 20:  0.25 boost
  let staminaFactor = 1.0;
  if (staminaPct < 20) {
    staminaFactor = 0.25;
  } else if (staminaPct < 40) {
    staminaFactor = 0.50;
  } else if (staminaPct < 70) {
    staminaFactor = 0.75;
  }

  const driveBoost = driveTendency * staminaFactor;
  const pullUpBoost = pullUpTendency * staminaFactor;

  // Soft weighting: clamp modifiers to prevent extreme pool inflation
  // Maximum multiplier of 2.2x (at maximum tendency and full stamina)
  const driveMultiplier = Math.max(1.0, Math.min(2.5, 1.0 + driveBoost * 1.2));
  const pullUpMultiplier = Math.max(1.0, Math.min(2.5, 1.0 + pullUpBoost * 1.2));

  return {
    driveMultiplier,
    pullUpMultiplier,
  };
}
