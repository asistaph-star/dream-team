import { Player } from "../types/player";
import { getAssistRating, getHandleRating } from "../utils/playerIdentity";

/**
 * Calculates turnover stamina modifier based on team average stamina.
 */
export function getTovStamMod(avg: number): number {
  return avg >= 70 ? 1.0 : avg >= 50 ? 1.10 : avg >= 30 ? 1.22 : 1.35;
}

/**
 * Returns the player with the lowest stamina in the lineup.
 * Safe sorting: does not mutate the original array order.
 */
export function getLowestStaminaPlayer(
  lineup: Player[],
  stamina: Record<string, number>
): Player {
  return [...lineup].sort((a, b) => (stamina[a.id] ?? 100) - (stamina[b.id] ?? 100))[0] ?? lineup[0];
}

/**
 * Selects the primary ball handler (highest average assist and handle ratings).
 * Safe sorting: does not mutate the original array order.
 */
export function getPrimaryBallHandler(team: Player[]): Player {
  return [...team].sort((a, b) => {
    const aVal = (getAssistRating(a) + getHandleRating(a)) / 2;
    const bVal = (getAssistRating(b) + getHandleRating(b)) / 2;
    return bVal - aVal;
  })[0] ?? team[0];
}

/**
 * Checks if the energy drink is currently locked for a player.
 */
export function isEnergyDrinkLocked(lockedUntil: number | undefined, gameTimeSec: number): boolean {
  return !!lockedUntil && gameTimeSec < lockedUntil;
}

/**
 * Calculates scoring usage modifier (Hero Ball Tax) based on recent possession history.
 */
export function getUsageMod(
  playerId: string,
  team: 'user' | 'ai',
  possessionHistory: { team: 'user' | 'ai'; playerId: string }[]
): number {
  const window = possessionHistory.filter(h => h.team === team);
  if (window.length < 5) return 1.0;
  const playerUses = window.filter(h => h.playerId === playerId).length;
  const usageRate = playerUses / window.length;
  if (usageRate >= 0.50) return 0.82;
  if (usageRate >= 0.42) return 0.88;
  if (usageRate >= 0.35) return 0.94;
  return 1.0;
}
