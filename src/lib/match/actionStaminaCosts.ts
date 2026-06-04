import { STAMINA_CONFIG } from "./staminaConfig";
import { ShotType } from "../utils/shotEngine";

export type ShotStaminaOutcome = 'make' | 'miss' | 'block' | 'foul';

export type DefensiveEffortType = 'failedBlock' | 'failedSteal' | 'pressChase' | 'trapRotation';

export interface ShotContextParams {
  staminaPct: number;
  outcome: ShotStaminaOutcome;
  isClutch: boolean;
  quarter: number;
  pace: 'fastbreak' | 'early_offense' | 'oreb' | 'late_clock' | 'normal';
  context?: 'normal' | 'oreb';
  usageMod: number;
  isBackToBack: boolean;
  facedDefense: string;
}

export function isRimShot(shotType: ShotType): boolean {
  return (
    shotType === 'euroStep' || shotType === 'floater' || shotType === 'fingerRoll' ||
    shotType === 'drivingLayup' || shotType === 'dunk' || shotType === 'powerLayup' ||
    shotType === 'hookShot' || shotType === 'putBack'
  );
}

export function isHeavyShot(shotType: ShotType): boolean {
  return (
    shotType === 'stepBackMid' || shotType === 'stepBackThree' || shotType === 'fadeaway'
  );
}

export function isPullUpShot(shotType: ShotType): boolean {
  return (
    shotType === 'pullUpMid' || shotType === 'pullUpThree'
  );
}

export function getShotBaseCost(shotType: ShotType, outcome: ShotStaminaOutcome): number {
  if (isRimShot(shotType)) {
    if (outcome === 'block') return shotType === 'dunk' ? STAMINA_CONFIG.rim.blockedDunk : STAMINA_CONFIG.rim.blockedLayup;
    if (shotType === 'dunk') return STAMINA_CONFIG.rim.dunk;
    if (shotType === 'putBack') return STAMINA_CONFIG.rebounding.putbackAttempt;
    if (shotType === 'powerLayup' || shotType === 'hookShot') return STAMINA_CONFIG.rim.contactFinish;
    return STAMINA_CONFIG.rim.layup;
  }
  if (outcome === 'block') return STAMINA_CONFIG.shooting.blockedJumper;
  if (shotType === 'catchAndShoot' || shotType === 'cornerThree') return STAMINA_CONFIG.shooting.openCatchShoot;
  if (isHeavyShot(shotType)) return STAMINA_CONFIG.shooting.stepBackOrFadeaway;
  if (isPullUpShot(shotType)) return STAMINA_CONFIG.shooting.pullUp;
  return STAMINA_CONFIG.shooting.normalJumper;
}

export function getDefensiveCost(outcome: ShotStaminaOutcome, is3PT: boolean): number {
  if (outcome === 'block') return STAMINA_CONFIG.defense.successfulBlock;
  if (outcome === 'foul') return STAMINA_CONFIG.defense.jumpContest + STAMINA_CONFIG.defense.foul;
  if (outcome === 'miss') return is3PT ? STAMINA_CONFIG.defense.hardCloseout : STAMINA_CONFIG.defense.jumpContest;
  return is3PT ? STAMINA_CONFIG.defense.hardCloseout : STAMINA_CONFIG.defense.lightContest;
}

export function getDefensiveEffortCost(type: DefensiveEffortType): number {
  if (type === 'failedBlock') return STAMINA_CONFIG.defense.failedBlock;
  if (type === 'failedSteal') return STAMINA_CONFIG.defense.failedSteal;
  if (type === 'trapRotation') return STAMINA_CONFIG.defense.trapRotation;
  return STAMINA_CONFIG.defense.pressChase;
}

export function getContextMultiplier(params: ShotContextParams): number {
  let mult = 1;
  const { staminaPct, outcome, isClutch, quarter, pace, context, usageMod, isBackToBack, facedDefense } = params;

  if (outcome === 'make') mult *= STAMINA_CONFIG.modifiers.make;
  if (outcome === 'miss') mult *= STAMINA_CONFIG.modifiers.miss;
  if (outcome === 'foul') mult *= STAMINA_CONFIG.modifiers.foul;
  if (outcome === 'block') mult *= STAMINA_CONFIG.modifiers.block;
  if (isClutch) mult *= STAMINA_CONFIG.modifiers.clutchTime;
  if (quarter >= 5) mult *= STAMINA_CONFIG.modifiers.overtime;
  if (pace === 'fastbreak' || pace === 'early_offense') mult *= STAMINA_CONFIG.modifiers.transition;
  if (pace === 'late_clock') mult *= STAMINA_CONFIG.modifiers.lateClock;
  if (context === 'oreb') mult *= STAMINA_CONFIG.modifiers.orebSecondChance;
  if (staminaPct < 45) mult *= STAMINA_CONFIG.modifiers.alreadyTired;
  if (staminaPct < 30) mult *= STAMINA_CONFIG.modifiers.exhausted;
  if (usageMod < 0.95) mult *= STAMINA_CONFIG.modifiers.highUsage;
  if (isBackToBack) mult *= STAMINA_CONFIG.modifiers.backToBackPossession;
  if (facedDefense === 'Full-Court Press' || facedDefense === 'Full-court press') mult *= STAMINA_CONFIG.modifiers.fullCourtPress;

  return Math.max(0.75, Math.min(1.95, mult));
}
