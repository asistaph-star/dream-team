import { Player } from "../types/player";

export const clamp01 = (value: number): number => {
  return Math.max(0, Math.min(1, value));
};

// -----------------------------------------------------------------------------
// Rating Helpers (Core Gameplay Attribute Fallbacks)
// -----------------------------------------------------------------------------

export const getSpeedRating = (player: Player): number => {
  return player.speed ?? player.offense;
};

export const getStrengthRating = (player: Player): number => {
  return player.strength ?? player.defense;
};

export const getOffenseRating = (player: Player): number => {
  return player.offense;
};

export const getThreePtRating = (player: Player): number => {
  return player.threePt ?? player.shooting;
};

export const getTwoPtRating = (player: Player): number => {
  return player.twoPt ?? player.shooting;
};

export const getFreeThrowRating = (player: Player): number => {
  return player.freeThrow ?? player.shooting;
};

export const getFinishingRating = (player: Player): number => {
  return player.finishing ?? Math.round((player.offense + player.strength + player.speed) / 3);
};

export const getReboundRating = (player: Player): number => {
  return player.rebound ?? Math.round((player.defense + player.strength) / 2);
};

export const getStealRating = (player: Player): number => {
  return player.steal ?? player.defense;
};

export const getBlockRating = (player: Player): number => {
  return player.block ?? Math.round((player.defense + player.strength) / 2);
};

export const getOnBallDefenseRating = (player: Player): number => {
  return player.onBall ?? player.defense;
};

export const getHandleRating = (player: Player): number => {
  return player.handle ?? player.playmaking;
};

export const getAssistRating = (player: Player): number => {
  return player.assist ?? player.playmaking;
};

export const getCalmRating = (player: Player): number => {
  return player.calm ?? player.playmaking;
};

// -----------------------------------------------------------------------------
// Tendency Helpers (Behavior Weights [0.0 - 1.0])
// -----------------------------------------------------------------------------

export const getThreePtTendency = (player: Player): number => {
  if (player.threePtTendency !== undefined) return clamp01(player.threePtTendency);
  // Fallback: 3PT rating divided by a scale, yielding ~10-40% typically. Floor of 2% for non-shooters.
  const rating = player.threePt ?? player.shooting;
  return clamp01(Math.max(0.02, Math.min(0.42, rating / 260)));
};

export const getDriveTendency = (player: Player): number => {
  if (player.driveTendency !== undefined) return clamp01(player.driveTendency);
  // Fallback: fast & offensive players drive more.
  const base = (player.speed + player.offense) / 250;
  // Position adjustments
  if (player.position === "C" || player.position === "PF") return clamp01(base * 0.4);
  return clamp01(Math.min(0.8, base));
};

export const getPullUpTendency = (player: Player): number => {
  if (player.pullUpTendency !== undefined) return clamp01(player.pullUpTendency);
  // Fallback: playmakers and shooters pull up.
  const base = ((player.threePt ?? player.shooting) + player.playmaking) / 300;
  if (player.position === "C" || player.position === "PF") return clamp01(base * 0.2);
  return clamp01(Math.min(0.6, base));
};

export const getFoulDrawTendency = (player: Player): number => {
  if (player.foulDrawTendency !== undefined) return clamp01(player.foulDrawTendency);
  // Fallback: offensive finishers seek contact.
  const finishing = player.finishing ?? ((player.offense + player.strength + player.speed) / 3);
  return clamp01(Math.min(0.5, (player.offense + finishing) / 280));
};

export const getShotIdentityEfficiencyAdjustment = (player: Player, is3PT: boolean, shotType?: string): number => {
  if (is3PT) {
    const rating = getThreePtRating(player);
    // Baseline mapped to ~75 average to yield a bounded -0.045 to +0.045 adjustment
    return Math.max(-0.045, Math.min(0.045, (rating - 75) * 0.003));
  }
  
  const rimShots = ['drivingLayup', 'dunk', 'euroStep', 'fingerRoll', 'powerLayup', 'putBack', 'bankShot'];
  if (shotType && rimShots.includes(shotType)) {
    const rating = getFinishingRating(player);
    return Math.max(-0.055, Math.min(0.055, (rating - 75) * 0.0035));
  }
  
  const rating = getTwoPtRating(player);
  return Math.max(-0.055, Math.min(0.055, (rating - 75) * 0.0035));
};
