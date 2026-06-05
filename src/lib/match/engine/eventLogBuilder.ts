import { makeEvent } from '../../utils/matchNarrative';
import { MatchStateDraft } from './matchStateDraft';

export function addEvent(
  draft: MatchStateDraft,
  text: string,
  isUserTeam: boolean,
  pointsScored = 0,
  activePlayerId?: string,
  isHiddenDuringFT?: boolean
) {
  const ev = makeEvent(draft.quarter, draft.clock, text, isUserTeam, pointsScored, activePlayerId);
  if (isHiddenDuringFT !== undefined) {
    ev.isHiddenDuringFT = isHiddenDuringFT;
  }
  draft.events.push(ev);
}

export function logSkillTrigger(
  draft: MatchStateDraft,
  text: string,
  isUserTeam: boolean
) {
  addEvent(draft, `SKILL: ${text}`, isUserTeam);
}
