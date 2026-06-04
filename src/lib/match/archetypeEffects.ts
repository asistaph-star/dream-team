import { Player } from "../types/player";
import {
  getCalmRating,
  getStaminaRating,
  getAssistRating,
  getOnBallDefenseRating,
  getStrengthRating,
  getStealRating
} from "../utils/playerIdentity";

/**
 * Computes player capability score for Bench Captain.
 */
export function getBenchCaptainIdentity(player: Player): number {
  return (getCalmRating(player) + getStaminaRating(player) + getAssistRating(player)) / 3;
}

/**
 * Calculates recovery amount and form stabilization for Bench Captain.
 */
export function calculateBenchCaptainRecovery(
  leaderIdentity: number,
  leaderCalmRating: number
): { staminaRecover: number; formStabilize: number } {
  const scale = 0.85 + (leaderIdentity / 100) * 0.30;
  const staminaRecover = Math.min(8, Math.round(6 * scale));
  const formStabilize = Math.min(0.008, 0.004 + (leaderCalmRating / 100) * 0.004);
  return { staminaRecover, formStabilize };
}

/**
 * Computes player capability score for Defensive Anchor.
 */
export function getDefensiveAnchorIdentity(player: Player): number {
  return (getOnBallDefenseRating(player) + getStaminaRating(player) + getStrengthRating(player) + getStealRating(player)) / 4;
}

/**
 * Calculates defensive anchor trigger scale based on Paint Bully level.
 */
export function calculateDefensiveAnchorTriggerScale(identity: number, level: number): number {
  let triggerMultiplier = 1.0;
  if (level === 2) triggerMultiplier = 1.15;
  else if (level === 3) triggerMultiplier = 1.30;
  const baseScale = 0.90 + (identity / 100) * 0.20;
  return baseScale * triggerMultiplier;
}

/**
 * Calculates defensive anchor leader scale.
 */
export function calculateDefensiveAnchorLeaderScale(leaderIdentity: number): number {
  return 0.90 + (leaderIdentity / 100) * 0.20;
}

/**
 * Calculates team leadership reduction from opposing leadership.
 */
export function calculateDefensiveAnchorLeadershipReduction(counterIdentity: number): number {
  return Math.min(0.20, 0.10 + (counterIdentity / 100) * 0.10);
}

/**
 * Calculates target player resistance based on stamina rating.
 */
export function calculateDefensiveAnchorTargetResistance(staminaRating: number): number {
  return (staminaRating / 100) * 0.15;
}

/**
 * Computes player capability score for Pressure Coach.
 */
export function getPressureCoachIdentity(player: Player): number {
  return (getAssistRating(player) + getOnBallDefenseRating(player) + getStaminaRating(player)) / 3;
}

/**
 * Calculates trigger scale for Pressure Coach.
 */
export function calculatePressureCoachScale(identity: number): number {
  return 0.90 + (identity / 100) * 0.20;
}

/**
 * Computes player capability score for Enforcer Lift.
 */
export function getEnforcerIdentity(player: Player): number {
  return (getOnBallDefenseRating(player) + getStrengthRating(player) + getStaminaRating(player)) / 3;
}

/**
 * Calculates scale multiplier for Enforcer Lift recovery.
 */
export function calculateEnforcerScale(bestEnforcer: number): number {
  return 0.85 + (bestEnforcer / 100) * 0.30;
}
