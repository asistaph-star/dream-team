/**
 * reboundSystem.ts — Pure rebound formula helpers
 *
 * Extracted from matchEngine.ts (Refactor-1E, Option A).
 * Pure functions only: no Math.random(), no state mutations, no event logs.
 *
 * NOT extracted (must stay in matchEngine.ts):
 *   - pickRebounder   → contains Math.random()
 *   - awardReb        → mutates newPlayerStats, newFormRating, actionWorkload
 *   - OREB/DREB/putback resolution branches
 *   - fc2 putback formula and all RNG rolls
 */

import { Player } from "../types/player";
import { getReboundRating } from "../utils/playerIdentity";
import { getPlayerStaminaMod } from "../utils/matchTypes";

// ─── Position Rebound Weights ─────────────────────────────────────────────────
// Exact values from matchEngine.ts — do not change.
export const REB_W: Record<string, number> = {
  C: 2.0,
  PF: 1.6,
  SF: 1.0,
  SG: 0.6,
  PG: 0.4,
};

/**
 * Returns the position rebound weight for a given position string.
 * Falls back to 1.0 for unknown positions.
 */
export function getPositionReboundWeight(position: string): number {
  return REB_W[position] ?? 1.0;
}

/**
 * Computes the total weighted rebound score for a lineup.
 * Uses position weights × rebound rating × stamina modifier.
 * staminaMap must be passed in — do not capture from closure.
 *
 * Formula (preserved exactly from matchEngine.ts):
 *   sum: getReboundRating(p) × (REB_W[p.position] || 1.0) × getPlayerStaminaMod(p, staminaMap[p.id])
 */
export function calculateTeamReboundScore(
  lineup: Player[],
  staminaMap: Record<string, number>
): number {
  return lineup.reduce(
    (s, p) =>
      s +
      getReboundRating(p) *
        (REB_W[p.position] || 1.0) *
        getPlayerStaminaMod(p, staminaMap[p.id]),
    0
  );
}

/**
 * Computes the offensive rebound chance for the attacking team.
 *
 * Formula (preserved exactly from matchEngine.ts):
 *   share = attReb / max(1, attReb + defReb)
 *   matchupSwing = (share - 0.5) × 0.34
 *   result = clamp(0.23 + matchupSwing
 *              + (glassScale > 0 ? 0.055 × glassScale : 0)
 *              - (barrierScale > 0 ? 0.06 × barrierScale : 0)
 *              + glassStrikeBoost,
 *            min=0.10, max=0.36)
 *
 * OREB floor: 0.10
 * OREB cap:   0.36
 */
export function calculateOffensiveReboundChance(
  attReb: number,
  defReb: number,
  glassScale: number,
  barrierScale: number,
  glassStrikeBoost = 0
): number {
  const share = attReb / Math.max(1, attReb + defReb);
  const matchupSwing = (share - 0.5) * 0.34;
  return Math.min(
    Math.max(
      0.23 +
        matchupSwing +
        (glassScale > 0 ? 0.055 * glassScale : 0) -
        (barrierScale > 0 ? 0.06 * barrierScale : 0) +
        glassStrikeBoost,
      0.10
    ),
    0.36
  );
}

/**
 * Computes the Glass Touch scale factor from the highest-rated holder.
 * Returns 0 if no holders are provided.
 *
 * Formula (preserved exactly from matchEngine.ts):
 *   0.85 + (maxReboundRating / 100) × 0.30
 */
export function calculateGlassScale(holders: Player[]): number {
  if (holders.length === 0) return 0;
  const maxRating = Math.max(...holders.map((p) => getReboundRating(p)));
  return 0.85 + (maxRating / 100) * 0.30;
}

/**
 * Computes the Paint Barrier scale factor from the highest-rated holder.
 * Returns 0 if no holders are provided.
 *
 * Formula (preserved exactly from matchEngine.ts):
 *   0.85 + (maxReboundRating / 100) × 0.30
 */
export function calculateBarrierScale(holders: Player[]): number {
  if (holders.length === 0) return 0;
  const maxRating = Math.max(...holders.map((p) => getReboundRating(p)));
  return 0.85 + (maxRating / 100) * 0.30;
}
