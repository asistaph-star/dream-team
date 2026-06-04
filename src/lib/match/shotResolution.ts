import { getFoulStaminaModifier } from "./foulSystem";
import { getStaminaMod } from "../utils/matchTypes";

export interface ShotScoringChanceParams {
  finalChance: number;
  staminaMod: number;
  formRating: number;
  clutchMod: number;
  effectiveZoneMod: number;
  effectivePressMod: number;
  usageMod: number;
  individual3ptMod: number;
  additiveBonus: number;
  difficultyMod: number;
  decisionWeightMod: number;
  maxCeilingLimit: number;
}

export function getHomeCourtBoost(rarity: string, crowdEnergy: number, rallyMode: boolean): number {
  const base: Record<string, number> = {
    'Mythic':    0.005,
    'Legendary': 0.010,
    'Epic':      0.015,
    'Rare':      0.020,
    'Common':    0.025,
  };
  const rarityBoost = base[rarity] ?? 0.015;
  const energyScaled = rarityBoost * crowdEnergy;
  const rallyBonus = rallyMode ? 0.01 : 0.00;
  return Math.min(0.025, energyScaled + rallyBonus);
}

export function getAwayPenalty(rarity: string, crowdEnergy: number, rallyMode: boolean): number {
  const base: Record<string, number> = {
    'Mythic':    0.005,
    'Legendary': 0.008,
    'Epic':      0.010,
    'Rare':      0.012,
    'Common':    0.015,
  };
  const rarityPenalty = base[rarity] ?? 0.010;
  const energyScaled = rarityPenalty * crowdEnergy;
  const rallyPenalty = rallyMode ? 0.01 : 0.00;
  return Math.min(0.020, energyScaled + rallyPenalty);
}

export function getClutchMod(
  clutchRating: number,
  situationActive: boolean,
  intensity: 'high' | 'medium' | 'none' | 'normal' | undefined,
  currentForm: number
): number {
  if (!situationActive) return 1.0;
  const intensityMult = intensity === 'high' ? 1.4 : 1.0;
  const formAmplification = currentForm >= 1.10 ? 0.03 : currentForm <= 0.90 ? -0.02 : 0.00;
  const staminaOverride = 0.04;
  const totalMod = 1.0 + (clutchRating * intensityMult) + formAmplification + staminaOverride;
  return Math.max(0.88, Math.min(1.20, totalMod));
}

export function getAssistChance(assistRating: number): number {
  return Math.max(0.38, Math.min(0.72, 0.38 + (assistRating / 330)));
}

export function calculateAndOneChance(
  is3PT: boolean,
  opponentAvgStamina: number,
  finishingRating: number
): number {
  const baseRate = is3PT ? 0.01 : 0.03;
  const foulStamMod = getFoulStaminaModifier(opponentAvgStamina);
  const finishingMod = 0.85 + (finishingRating / 100) * 0.30;
  const chance = baseRate * foulStamMod * finishingMod;
  return Math.min(0.15, chance);
}

export function calculateUserPutbackChance(params: {
  offEff: number;
  defEff: number;
  teamAvgStamina: number;
  momentumBonus: number;
  playerStaminaMod: number;
  formRating: number;
  decisionWeightMod: number;
  glassTouchActive: boolean;
  glassStrikeBoost: number;
}): number {
  const baseRatio = params.offEff / ((params.offEff + params.defEff) || 1);
  const staminaMod = getStaminaMod(params.teamAvgStamina);
  const coreVal = baseRatio * staminaMod * params.momentumBonus * params.playerStaminaMod * params.formRating * params.decisionWeightMod;
  const glassTouchBonus = params.glassTouchActive ? 0.035 : 0;
  const total = coreVal + glassTouchBonus + params.glassStrikeBoost;
  return Math.max(0.20, Math.min(0.80, total));
}

export function calculateAiPutbackChance(params: {
  offEff: number;
  defEff: number;
  teamAvgStamina: number;
  playerStaminaMod: number;
  formRating: number;
  glassTouchActive: boolean;
  glassStrikeBoost: number;
}): number {
  const baseRatio = params.offEff / ((params.offEff + params.defEff) || 1);
  const clampedBase = Math.max(0.30, Math.min(0.80, baseRatio));
  const staminaMod = getStaminaMod(params.teamAvgStamina);
  const glassTouchBonus = params.glassTouchActive ? 0.035 : 0;
  return clampedBase * staminaMod * params.playerStaminaMod * params.formRating + glassTouchBonus + params.glassStrikeBoost;
}

export function calculateFinalScoringChance(params: ShotScoringChanceParams): number {
  const baseAdjusted = params.finalChance *
                       params.staminaMod *
                       params.formRating *
                       params.clutchMod *
                       params.effectiveZoneMod *
                       params.effectivePressMod *
                       params.usageMod;
  const withDecision = baseAdjusted * params.decisionWeightMod;
  const with3PTMod = withDecision * params.individual3ptMod;
  const total = with3PTMod + params.additiveBonus + params.difficultyMod;
  return Math.max(0.15, Math.min(params.maxCeilingLimit, total));
}
