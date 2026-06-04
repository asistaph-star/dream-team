// src/lib/match/foulSystem.ts
// Pure foul and free throw mathematical formulas — no RNG, no state mutations

import { Player } from "../types/player";

/** Static position weights for foul committer selection */
export const FOUL_W: Record<string, number> = {
  PG: 1.4, SG: 1.2, SF: 1.0, PF: 0.8, C: 0.6
};

/** Returns the position-based foul weight */
export function getPositionFoulWeight(position: string): number {
  return FOUL_W[position] ?? 1.0;
}

/** Computes stamina modifier for foul chances based on defender average stamina */
export function getFoulStaminaModifier(avgStamina: number): number {
  return avgStamina >= 70 ? 1.0 : avgStamina >= 50 ? 1.12 : avgStamina >= 30 ? 1.28 : 1.45;
}

/** Returns the clutch rating value based on player rarity */
export function getClutchRatingByRarity(rarity?: string): number {
  if (!rarity) return 0.00;
  const base: Record<string, number> = {
    'Mythic':    0.13,
    'Legendary': 0.09,
    'Epic':      0.04,
    'Rare':      0.00,
    'Common':   -0.03,
  };
  return base[rarity] ?? 0.00;
}

/**
 * Calculates the crowd noise penalty for away team free throw shooters.
 */
export function calculateCrowdNoisePenalty(
  rarity: string | undefined,
  crowdEnergy: number,
  clutchActive: boolean,
  clutchIntensity: string
): number {
  const base = 0.03;
  const energyPenalty = base * crowdEnergy;
  const clutchAmplifier = clutchActive ? 2.0
    : clutchIntensity === 'medium' ? 1.5
    : 1.0;

  const rarityResistance: Record<string, number> = {
    'Mythic':    0.30,
    'Legendary': 0.45,
    'Epic':      0.60,
    'Rare':      0.75,
    'Common':    0.90,
  };
  const resistance = rarityResistance[rarity ?? 'Common'] ?? 0.90;
  return energyPenalty * clutchAmplifier * resistance;
}

/**
 * Calculates the free throw success probability.
 * Clamped between [0.50, 0.95].
 */
export function calculateFreeThrowChance(
  ftRating: number,
  staminaMod: number,
  formRating: number,
  clutchActive: boolean,
  clutchIntensity: string,
  isAway: boolean,
  crowdEnergy: number,
  rarity: string | undefined
): number {
  const normalizedFt = ftRating > 100 ? 60 + ((ftRating - 100) * 0.45) : ftRating;
  const baseChance = Math.min(0.90, Math.max(0.62, 0.74 + (normalizedFt - 75) * 0.0025));

  let penalty = 0;
  if (staminaMod >= 1.0) penalty = 0;
  else if (staminaMod >= 0.95) penalty = -0.03;
  else if (staminaMod >= 0.88) penalty = -0.07;
  else if (staminaMod >= 0.80) penalty = -0.11;
  else penalty = -0.15;

  const hotBonus = formRating >= 1.10 ? 0.05 : 0;
  
  const ftClutchRating = getClutchRatingByRarity(rarity);
  const clutchBonus = clutchActive
    ? ftClutchRating * (clutchIntensity === 'high' ? 1.3 : 1.0)
    : 0;

  const crowdNoisePenalty = isAway
    ? calculateCrowdNoisePenalty(rarity, crowdEnergy, clutchActive, clutchIntensity)
    : 0;

  return Math.max(0.50, Math.min(0.95, baseChance + penalty + hotBonus + clutchBonus - crowdNoisePenalty));
}

/**
 * Calculates base shooting foul probability before special skill modifiers.
 */
export function calculateBaseShootingFoulChance(
  is3PT: boolean,
  defAvgStamina: number,
  foulDrawTendency: number,
  clutchActive: boolean,
  shooterRarity?: string
): number {
  const foulStamMod = getFoulStaminaModifier(defAvgStamina);
  const foulDrawMod = 0.90 + foulDrawTendency * 0.25;
  const clutchFoulBoost = clutchActive ? getClutchRatingByRarity(shooterRarity) * 0.5 : 0;

  return ((is3PT ? 0.044 : 0.086) * foulStamMod * foulDrawMod) + clutchFoulBoost;
}

/** Helper for Foul Magnet and base foul draw scaling */
export function calculateFoulDrawModifier(foulDrawTendency: number): number {
  return 0.90 + foulDrawTendency * 0.25;
}

/** Helper for Flop X activation scaling */
export function calculateFlopIdentityScale(foulDrawTendency: number): number {
  return 0.90 + foulDrawTendency * 0.20;
}

/** Helper for Four-Point Bait X activation scaling */
export function calculateFourPointBaitIdentityScale(threePtRating: number, foulDrawTendency: number): number {
  const identity = (threePtRating + foulDrawTendency * 100) / 2;
  return 0.90 + (identity / 100) * 0.20;
}

/** Helper for Composure Shield activation scaling */
export function calculateComposureIdentityScale(calmRating: number): number {
  return 0.90 + (calmRating / 100) * 0.20;
}

/** Helper for Clean Challenge activation scaling */
export function calculateCleanContestIdentityScale(onBallDefenseRating: number, blockRating: number): number {
  const identity = (onBallDefenseRating + blockRating) / 2;
  return 0.90 + (identity / 100) * 0.20;
}

/** Helper for Discipline Wall shot quality penalty scaling */
export function calculateDisciplineScale(maxRating: number): number {
  return 0.85 + (maxRating / 100) * 0.30;
}

/** Computes the dynamic hybrid synergy boost for Four-Point Bait X */
export function calculateFourPointBaitBoost(shootingLevel: number, foulDrawLevel: number): number {
  return (shootingLevel >= 1 && foulDrawLevel >= 1) ? 0.090 : (shootingLevel >= 1 || foulDrawLevel >= 1) ? 0.045 : 0.020;
}
