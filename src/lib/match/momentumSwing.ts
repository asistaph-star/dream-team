import { Player } from "../types/player";
import {
  getCalmRating,
  getStaminaRating,
  getAssistRating
} from "../utils/playerIdentity";

/**
 * Computes player capability score for Momentum Swing.
 * Uses calm, assist, and stamina ratings -- same identity helpers
 * listed in skillFamilies.ts for MOMENTUM_SWING.
 */
export function getMomentumSwingIdentity(player: Player): number {
  return (getCalmRating(player) + getAssistRating(player) + getStaminaRating(player)) / 3;
}

/**
 * Calculates recovery amounts for Momentum Swing stabilization.
 *
 * Follows the same scaling pattern as calculateBenchCaptainRecovery:
 *   scale = base + (identity / 100) * range
 *   staminaRecover = min(cap, floor(base * scale))
 *   formRecover = min(cap, base + (calmRating / 100) * range)
 *
 * Safe caps:
 *   stamina: 5-8 (capped at 8)
 *   form: +0.010 to +0.016 (capped at 0.016)
 *
 * Pure: no RNG, no mutations.
 */
export function calculateMomentumSwingRecovery(
  identity: number,
  calmRating: number
): { staminaRecover: number; formRecover: number } {
  const scale = 0.85 + (identity / 100) * 0.30;
  const staminaRecover = Math.min(8, Math.round(5 * scale));
  const formRecover = Math.min(0.016, 0.010 + (calmRating / 100) * 0.006);
  return { staminaRecover, formRecover };
}

/**
 * Determines whether the Momentum Swing skill should be eligible to trigger
 * based on the previous play outcome. Only defensive momentum events qualify.
 *
 * Pure: no RNG, no side effects.
 */
export function shouldMomentumSwingTrigger(lastPlayCategory: string | undefined): boolean {
  if (!lastPlayCategory) return false;
  return lastPlayCategory === "steal" || lastPlayCategory === "block" || lastPlayCategory === "turnover";
}
