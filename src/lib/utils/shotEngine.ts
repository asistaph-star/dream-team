import { Player } from "../types/player";
import { getThreePtTendency } from "./playerIdentity";

export type ShotType = 
  | 'euroStep' | 'floater' | 'pullUpMid' | 'stepBackMid' | 'fingerRoll' | 'drivingLayup' | 'dunk' | 'fadeaway' | 'hookShot' | 'powerLayup' | 'bankShot' | 'putBack'
  | 'catchAndShoot' | 'stepBackThree' | 'pullUpThree' | 'cornerThree';

export const isThreePointer = (shot: ShotType): boolean => {
  return ['catchAndShoot', 'stepBackThree', 'pullUpThree', 'cornerThree'].includes(shot);
};

const applySmartFatigueShotWeights = (pool: Record<string, number>, staminaPct: number) => {
  if (staminaPct >= 70) return; // Full arsenal

  const heavyActions = ['dunk', 'powerLayup', 'drivingLayup', 'stepBackThree', 'stepBackMid', 'euroStep'];
  const safeActions = ['catchAndShoot', 'cornerThree', 'pullUpMid', 'floater'];

  if (staminaPct >= 40) {
    // Medium stamina: softer reduction on heavy, slight boost to safe
    heavyActions.forEach(shot => { if (pool[shot]) pool[shot] *= 0.80; });
    safeActions.forEach(shot => { if (pool[shot]) pool[shot] *= 1.10; });
  } else if (staminaPct >= 20) {
    // Low stamina: moderate reduction on heavy, strong boost to safe
    heavyActions.forEach(shot => { if (pool[shot]) pool[shot] *= 0.50; });
    safeActions.forEach(shot => { if (pool[shot]) pool[shot] *= 1.25; });
  } else {
    // Critical stamina: heavy reduction, but not totally disabled
    heavyActions.forEach(shot => { if (pool[shot]) pool[shot] *= 0.30; });
    safeActions.forEach(shot => { if (pool[shot]) pool[shot] *= 1.35; });
  }
};

export function generateShot(player: Player, formRating: number, staminaPct: number, is3PTBaseCheck?: boolean, pace?: 'fastbreak' | 'early_offense' | 'oreb' | 'late_clock' | 'normal'): { type: ShotType, is3PT: boolean } {
  // Step 1: Base Position Weights
  const base2PT: Record<string, Record<string, number>> = {
    PG: { euroStep: 30, floater: 25, pullUpMid: 20, fingerRoll: 15, drivingLayup: 10, dunk: 5, fadeaway: 3, hookShot: 1, powerLayup: 1 },
    SG: { pullUpMid: 30, stepBackMid: 25, drivingLayup: 20, floater: 15, euroStep: 10, dunk: 8, fadeaway: 5, hookShot: 2, powerLayup: 1 },
    SF: { drivingLayup: 30, fadeaway: 25, pullUpMid: 20, hookShot: 15, euroStep: 10, dunk: 12, floater: 5, putBack: 3, powerLayup: 2 },
    PF: { fadeaway: 30, powerLayup: 25, pullUpMid: 20, hookShot: 15, putBack: 10, dunk: 12, euroStep: 5, drivingLayup: 3 },
    C:  { dunk: 30, hookShot: 25, putBack: 20, powerLayup: 15, bankShot: 10, euroStep: 3, fadeaway: 3, floater: 2 }
  };

  const base3PT: Record<string, Record<string, number>> = {
    PG: { catchAndShoot: 35, stepBackThree: 35, pullUpThree: 30, cornerThree: 20 },
    SG: { catchAndShoot: 40, cornerThree: 35, stepBackThree: 25, pullUpThree: 15 },
    SF: { cornerThree: 40, catchAndShoot: 35, pullUpThree: 25, stepBackThree: 10 },
    PF: { catchAndShoot: 50, cornerThree: 35, pullUpThree: 15, stepBackThree: 5 },
    C:  { catchAndShoot: 60, cornerThree: 40, pullUpThree: 5, stepBackThree: 2 }
  };

  const threePointTendency = getThreePtTendency(player);
  const is3PT = is3PTBaseCheck ?? (Math.random() < threePointTendency);
  const pool = is3PT ? { ...base3PT[player.position] } : { ...base2PT[player.position] };

  // Determine top 3 shots to exclude from outlier boost
  const sortedShots = Object.entries(pool).sort((a, b) => b[1] - a[1]);
  const top3 = sortedShots.slice(0, 3).map(s => s[0]);
  const outlierShots = Object.keys(pool).filter(s => !top3.includes(s));

  // Step 2: Rarity Modifier
  const rarityOutlierBoost: Record<string, number> = { Common: 0.0, Rare: 0.3, Epic: 0.6, Legendary: 1.0, Mythic: 2.0 };
  const boost = rarityOutlierBoost[player.rarity] || 0;
  outlierShots.forEach(shot => {
    if (pool[shot]) pool[shot] += pool[shot] * boost;
  });

  // Step 3: Form Rating Shift
  const hotBoostShots = ['stepBackMid', 'stepBackThree', 'fadeaway', 'pullUpMid', 'pullUpThree'];
  const coldReduceShots = ['stepBackMid', 'stepBackThree', 'fadeaway', 'pullUpThree'];
  const coldBoostShots = ['catchAndShoot', 'drivingLayup', 'floater', 'cornerThree'];

  if (formRating >= 1.15) {
    hotBoostShots.forEach(shot => { if (pool[shot]) pool[shot] *= 1.8; });
  } else if (formRating >= 1.10) {
    hotBoostShots.forEach(shot => { if (pool[shot]) pool[shot] *= 1.4; });
  } else if (formRating <= 0.90) {
    coldReduceShots.forEach(shot => { if (pool[shot]) pool[shot] *= 0.5; });
    coldBoostShots.forEach(shot => { if (pool[shot]) pool[shot] *= 1.3; });
  }

  // Step 4: Sub-Stat Gates (shooting, speed, strength)
  const shootingBoost = player.shooting / 80;
  ['pullUpThree', 'stepBackThree', 'pullUpMid', 'stepBackMid', 'fadeaway', 'catchAndShoot'].forEach(shot => {
    if (pool[shot]) pool[shot] *= shootingBoost;
  });

  const speedBoost = player.speed / 80;
  ['euroStep', 'drivingLayup', 'floater', 'fingerRoll'].forEach(shot => {
    if (pool[shot]) pool[shot] *= speedBoost;
  });

  const strengthBoost = player.strength / 80;
  ['powerLayup', 'dunk', 'hookShot', 'putBack', 'bankShot'].forEach(shot => {
    if (pool[shot]) pool[shot] *= strengthBoost;
  });

  // Step 4.5: Pace Context Modifiers (Connected Engine)
  if (pace === 'fastbreak') {
    ['euroStep', 'drivingLayup', 'dunk'].forEach(shot => { if (pool[shot]) pool[shot] *= 4.0; });
  } else if (pace === 'early_offense') {
    ['euroStep', 'drivingLayup', 'dunk', 'pullUpMid', 'catchAndShoot'].forEach(shot => { if (pool[shot]) pool[shot] *= 2.5; });
  } else if (pace === 'oreb') {
    ['putBack', 'hookShot'].forEach(shot => { if (pool[shot]) pool[shot] *= 5.0; });
  } else if (pace === 'late_clock') {
    ['stepBackThree', 'pullUpThree', 'fadeaway', 'pullUpMid'].forEach(shot => { if (pool[shot]) pool[shot] *= 3.0; });
  }

  // Step 4.75: Smart Fatigue Filter (Stamina Context)
  applySmartFatigueShotWeights(pool, staminaPct);

  // Step 5: Final Selection (Weighted Random)
  const totalWeight = Object.values(pool).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  let selectedShot = Object.keys(pool)[0] as ShotType;

  for (const [shot, weight] of Object.entries(pool)) {
    random -= weight;
    if (random <= 0) {
      selectedShot = shot as ShotType;
      break;
    }
  }

  return { type: selectedShot, is3PT };
}
