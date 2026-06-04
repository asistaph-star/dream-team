import { Player } from "../types/player";
import { getBlockRating, getStrengthRating, getStaminaRating, getOnBallDefenseRating } from "../utils/playerIdentity";

/**
 * Calculates block chance for a defender trying to swat a shot.
 */
export function calculateBlockChance(
  blockRating: number,
  rimWardenTriggered: boolean,
  playerStaminaMod: number
): number {
  const baseBlockChance = (blockRating / 100) * (rimWardenTriggered ? 0.095 : 0.055);
  return baseBlockChance * playerStaminaMod;
}

/**
 * Computes the defensive capability score used by Sky Wall.
 */
export function getSkyWallIdentity(player: Player): number {
  return (getBlockRating(player) + getStrengthRating(player) + getStaminaRating(player) + getOnBallDefenseRating(player)) / 4;
}

/**
 * Calculates scale, penalty, and stamina drain for Sky Wall vertical contests.
 */
export function calculateSkyWallScale(identity: number): { scale: number; penalty: number; baseDrain: number } {
  const scale = 0.90 + (identity / 100) * 0.20;
  const penalty = Math.min(0.013, 0.008 + (identity / 100) * 0.004);
  const baseDrain = Math.min(10, Math.round(7 * scale));
  return { scale, penalty, baseDrain };
}
