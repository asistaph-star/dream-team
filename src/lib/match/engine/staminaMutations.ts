import { Player } from '../../types/player';
import { MatchStateDraft } from './matchStateDraft';
import { getPlayerMaxStamina, getStaminaPercent } from '../../utils/matchTypes';
import { drainStamina } from '../../skills/skillResolver';

export function recoverPlayerStamina(draft: MatchStateDraft, player: Player, amount: number): number {
  const max = getPlayerMaxStamina(player);
  const curr = draft.playerStamina[player.id] ?? max;
  const nextVal = Math.min(max, curr + amount);
  draft.playerStamina[player.id] = nextVal;
  return nextVal;
}

export function getPlayerStaminaPercent(draft: MatchStateDraft, player: Player): number {
  return getStaminaPercent(player, draft.playerStamina[player.id] ?? getPlayerMaxStamina(player));
}

export function applyStaminaDrain(
  draft: MatchStateDraft,
  player: Player,
  targetLineup: Player[],
  amount: number,
  sourceSkill: string
): number {
  // Hard Invariant Check: Assert only Sky Wall and Lock Chain learned skills can drain enemy stamina from learned skills
  const allowedSkills = ['SKY_WALL', 'LOCK_CHAIN'];
  if (!allowedSkills.includes(sourceSkill)) {
    return 0;
  }
  
  return drainStamina(draft.playerStamina, player, targetLineup, amount);
}
