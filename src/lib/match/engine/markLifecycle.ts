import { MatchStateDraft } from './matchStateDraft';
import { decayMarks } from '../../skills/skillResolver';

export function decayTickMarks(draft: MatchStateDraft) {
  const decayed = decayMarks(draft.skillMarks ?? {}, draft.markImmunity ?? {});
  draft.skillMarks = decayed.nextMarks;
  draft.markImmunity = decayed.nextImmunity;
}

export function clearBenchedMarks(draft: MatchStateDraft, onCourtIds: Set<string>) {
  Object.keys(draft.skillMarks).forEach(id => {
    if (!onCourtIds.has(id)) {
      delete draft.skillMarks[id];
    }
  });
  Object.keys(draft.markImmunity).forEach(id => {
    if (!onCourtIds.has(id)) {
      delete draft.markImmunity[id];
    }
  });
}
