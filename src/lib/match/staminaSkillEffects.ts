export const DEBT_COLLECTOR_DRAIN = 45;
export const FIVE_MAN_SQUEEZE_BASE = 40;
export const FIVE_MAN_SQUEEZE_BOOSTED = 60;
export const HOOKED_TAX_DRAIN = 38;

/**
 * Returns Contact Tax base drain based on Paint Bully archetype level.
 */
export function getContactTaxDrain(paintBullyLevel: number): number {
  if (paintBullyLevel === 1) return 10;
  if (paintBullyLevel === 2) return 11;
  if (paintBullyLevel === 3) return 12;
  return 8;
}

/**
 * Returns Lung Burner base drain based on Paint Bully archetype level.
 */
export function getLungBurnerBaseDrain(paintBullyLevel: number): number {
  if (paintBullyLevel === 1) return 20;
  if (paintBullyLevel === 2) return 30;
  if (paintBullyLevel === 3) return 40;
  return 15;
}

/**
 * Calculates Lung Burner drain prior to anti-snowball scaling.
 * Adds +10 if the target has Debt, capped at 40.
 */
export function getLungBurnerDrain(paintBullyLevel: number, hasDebt: boolean): number {
  const base = getLungBurnerBaseDrain(paintBullyLevel);
  const preClampDrain = base + (hasDebt ? 10 : 0);
  return Math.min(40, preClampDrain);
}

/**
 * Applies anti-snowball low-stamina reduction.
 * Rounds the scaled result per original matchEngine implementation.
 */
export function applyAntiSnowballScaling(drain: number, defenderStaminaPct: number): number {
  if (defenderStaminaPct < 30) {
    return Math.round(drain * 0.30);
  } else if (defenderStaminaPct < 50) {
    return Math.round(drain * 0.60);
  }
  return drain;
}

/**
 * Returns Power Driver drain amount based on scale rating, capped at 36.
 */
export function getPowerDriverDrain(scale: number): number {
  return Math.min(36, 32 * scale);
}

/**
 * Returns Defensive Anchor pressure single-target drain amount, capped at 8.
 */
export function getDefensiveAnchorPressureDrain(scale: number): number {
  return Math.min(8, Math.round(6 * scale));
}

/**
 * Returns Defensive Anchor team-wide pressure drain amount, capped at 20.
 */
export function getDefensiveAnchorTeamPressureDrain(scale: number): number {
  return Math.min(20, Math.round(15 * scale));
}

/**
 * Returns Lock Chain on-ball pressure drain amount, capped at 12.
 */
export function getLockChainOnBallPressureDrain(scale: number): number {
  return Math.min(12, Math.round(9 * scale));
}
