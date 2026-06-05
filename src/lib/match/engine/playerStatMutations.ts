import { MatchStateDraft } from './matchStateDraft';
import { emptyStats } from '../../utils/matchTypes';

export function ensurePlayerStatsExists(draft: MatchStateDraft, id: string) {
  if (!draft.playerStats[id]) {
    draft.playerStats[id] = emptyStats();
  }
}

export function recordPlayerPoints(
  draft: MatchStateDraft,
  playerId: string,
  isThree: boolean,
  isMake: boolean
) {
  ensurePlayerStatsExists(draft, playerId);
  const s = draft.playerStats[playerId];
  s.FGA++;
  if (isThree) {
    s.TPA++;
  }
  if (isMake) {
    s.FGM++;
    if (isThree) {
      s.TPM++;
      s.PTS += 3;
    } else {
      s.PTS += 2;
    }
  }
}

export function recordPlayerFreeThrow(
  draft: MatchStateDraft,
  playerId: string,
  isMake: boolean
) {
  ensurePlayerStatsExists(draft, playerId);
  const s = draft.playerStats[playerId];
  s.FTA++;
  if (isMake) {
    s.FTM++;
    s.PTS += 1;
  }
}

export function recordPlayerRebound(
  draft: MatchStateDraft,
  playerId: string,
  isOffensive: boolean
) {
  ensurePlayerStatsExists(draft, playerId);
  const s = draft.playerStats[playerId];
  s.REB++;
  if (isOffensive) {
    s.OREB++;
  } else {
    s.DREB++;
  }
}

export function recordPlayerAssist(draft: MatchStateDraft, playerId: string) {
  ensurePlayerStatsExists(draft, playerId);
  draft.playerStats[playerId].AST++;
}

export function recordPlayerSteal(draft: MatchStateDraft, playerId: string) {
  ensurePlayerStatsExists(draft, playerId);
  draft.playerStats[playerId].STL++;
}

export function recordPlayerBlock(draft: MatchStateDraft, playerId: string) {
  ensurePlayerStatsExists(draft, playerId);
  draft.playerStats[playerId].BLK++;
}

export function recordPlayerTurnover(draft: MatchStateDraft, playerId: string) {
  ensurePlayerStatsExists(draft, playerId);
  draft.playerStats[playerId].TOV++;
}

export function recordPlayerFoul(draft: MatchStateDraft, playerId: string) {
  ensurePlayerStatsExists(draft, playerId);
  draft.playerStats[playerId].FOL++;
}
