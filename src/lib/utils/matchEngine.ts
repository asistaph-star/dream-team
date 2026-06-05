import { Player } from "../types/player";
import {
  Difficulty, MatchState,
  createInitialMatchState, getStaminaMod, getPlayerStaminaMod, getStaminaPercent, getPlayerMaxStamina, computeTeamScore, computeEffective, avgStamina, OFFENSIVE_STRATEGIES, DEFENSIVE_STRATEGIES, formatClock, clampForm, emptyStats, getShotZoneModifier, getMatchupBonus, getShotClockReset, getSkillHolders, hasSkillStack, getEnteredPlayerIds, resolveFlagrantFoul, translateOffIQBoost, translateDefIQBoost, isStrategyRevertBlocked, getEffectiveRevertThreshold, isSkillBlocked, getSkillRate
} from "./matchTypes";
import { STAMINA_CONFIG } from "../match/staminaConfig";
import { mockAiTeams } from "../match/mockTeams";
import {
  getIndividualThreePointShotMod,
  isShaiGilgeousAlexander,
  getFlopFoulPressureBonus,
  getGlassStrikeOrebBoost,
  getGlassStrikePutbackBoost,
  getStaminaCostScale,
  getCounterModifier,
  getSubtleStrategyHint
} from "../match/matchHelpers";
import { generatePreMatchInjuries, calibrateLineupForInjuries } from "../match/injuryHelpers";
import {
  FOUL_W,
  getPositionFoulWeight,
  getFoulStaminaModifier,
  getClutchRatingByRarity,
  calculateCrowdNoisePenalty,
  calculateFreeThrowChance,
  calculateBaseShootingFoulChance,
  calculateFoulDrawModifier,
  calculateFlopIdentityScale,
  calculateFourPointBaitIdentityScale,
  calculateComposureIdentityScale,
  calculateCleanContestIdentityScale,
  calculateDisciplineScale,
  calculateFourPointBaitBoost
} from "../match/foulSystem";
import { simulateTick as simulateTickImpl } from "../match/engine/matchTick";

// Re-export everything the UI needs
export type { Difficulty, PlayerMatchStats, MatchEvent, MatchState } from "./matchTypes";
export { createInitialMatchState, getStaminaMod, getPlayerStaminaMod, getStaminaPercent, getPlayerMaxStamina, computeTeamScore, computeEffective, avgStamina, OFFENSIVE_STRATEGIES, DEFENSIVE_STRATEGIES, formatClock, clampForm, emptyStats, getShotZoneModifier, getMatchupBonus, getShotClockReset, getSkillHolders, hasSkillStack, getEnteredPlayerIds, resolveFlagrantFoul, translateOffIQBoost, translateDefIQBoost, isStrategyRevertBlocked, getEffectiveRevertThreshold, isSkillBlocked, getSkillRate } from "./matchTypes";
export { STAMINA_CONFIG } from "../match/staminaConfig";
export { mockAiTeams } from "../match/mockTeams";
export {
  getIndividualThreePointShotMod,
  isShaiGilgeousAlexander,
  getFlopFoulPressureBonus,
  getGlassStrikeOrebBoost,
  getGlassStrikePutbackBoost,
  getStaminaCostScale,
  getCounterModifier,
  getSubtleStrategyHint
} from "../match/matchHelpers";
export { generatePreMatchInjuries, calibrateLineupForInjuries } from "../match/injuryHelpers";
export {
  FOUL_W,
  getPositionFoulWeight,
  getFoulStaminaModifier,
  getClutchRatingByRarity,
  calculateCrowdNoisePenalty,
  calculateFreeThrowChance,
  calculateBaseShootingFoulChance,
  calculateFoulDrawModifier,
  calculateFlopIdentityScale,
  calculateFourPointBaitIdentityScale,
  calculateComposureIdentityScale,
  calculateCleanContestIdentityScale,
  calculateDisciplineScale,
  calculateFourPointBaitBoost
} from "../match/foulSystem";

export function simulateTick(
  state: MatchState,
  userOff: number, userDef: number,
  aiTeamObj: typeof mockAiTeams[Difficulty],
  userLineup: Player[],
  allUserRoster: Player[]
): MatchState {
  return simulateTickImpl(state, userOff, userDef, aiTeamObj, userLineup, allUserRoster);
}
