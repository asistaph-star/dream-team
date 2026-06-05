// src/lib/match/attributeGameplayEffects.ts
// Pure gameplay modifiers for basketballIQ and hustle attributes
// Pure functions only: no Math.random(), no state/stat mutations, no side effects

/**
 * Calculates a multiplier for turnover chance based on player basketball IQ.
 * Higher IQ slightly lowers turnover chance.
 * Safe range: [0.94, 1.03], centered around 80 IQ.
 */
export function calculateBasketballIQTurnoverModifier(iq: number): number {
  // Center around 80. Every 10 points above 80 decreases turnover chance by ~1.2%.
  // Every 10 points below 80 increases turnover chance by ~1.2%.
  // Formula: 1.0 - (iq - 80) * 0.0012
  const rawMod = 1.0 - (iq - 80) * 0.0012;
  return Math.max(0.94, Math.min(1.03, rawMod));
}

/**
 * Calculates an additive modifier for shot quality under pressure based on shooter basketball IQ.
 * Applies only in pressure contexts (late clock, low stamina, heavy contest, broken play rescue).
 * Safe range: [-0.015, 0.015], centered around 80 IQ.
 */
export function calculateBasketballIQShotQualityModifier(
  iq: number,
  context: {
    isLateClock: boolean;
    isLowStamina: boolean;
    isHeavyContest: boolean;
    isBrokenPlayRescue: boolean;
  }
): number {
  const isUnderPressure =
    context.isLateClock ||
    context.isLowStamina ||
    context.isHeavyContest ||
    context.isBrokenPlayRescue;

  if (!isUnderPressure) {
    return 0.0;
  }

  // Formula: (iq - 80) * 0.0003
  // Clamps to [-0.015, +0.015]
  const rawMod = (iq - 80) * 0.0003;
  return Math.max(-0.015, Math.min(0.015, rawMod));
}

/**
 * Helper for Discipline Wall shot quality penalty scaling based on defender basketball IQ.
 * Replaces the previous onBall-derived formula.
 * Formula: 0.85 + (iq / 100) * 0.30 (same shape as original but using iq)
 */
export function calculateBasketballIQDisciplineScale(iq: number): number {
  return 0.85 + (iq / 100) * 0.30;
}

/**
 * Calculates a multiplier for rebound score based on player hustle.
 * Higher hustle slightly boosts rebound score.
 * Safe range: [0.97, 1.04], centered around 80 hustle.
 */
export function calculateHustleReboundModifier(hustle: number): number {
  // Every 10 points above 80 increases rebound score by ~0.8%.
  // Formula: 1.0 + (hustle - 80) * 0.0008
  const rawMod = 1.0 + (hustle - 80) * 0.0008;
  return Math.max(0.97, Math.min(1.04, rawMod));
}

/**
 * Calculates a multiplier for contested shot defensive effort based on defender hustle.
 * Higher hustle reduces shooter's quality.
 * Safe range: [0.98, 1.03], centered around 80 hustle.
 */
export function calculateHustleContestModifier(hustle: number): number {
  // Every 10 points above 80 increases contest effect (reducing shot chance) by ~0.6%.
  // Formula: 1.0 + (hustle - 80) * 0.0006
  const rawMod = 1.0 + (hustle - 80) * 0.0006;
  return Math.max(0.98, Math.min(1.03, rawMod));
}
