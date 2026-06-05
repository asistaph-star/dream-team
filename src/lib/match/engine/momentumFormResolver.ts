import { MatchStateDraft } from './matchStateDraft';

export function ensureFormExists(draft: MatchStateDraft, id: string) {
  if (draft.formRating[id] === undefined) {
    draft.formRating[id] = 1.0;
  }
}

export function ensureFormFiredExists(draft: MatchStateDraft, id: string) {
  if (!draft.formNarrativeFired[id]) {
    draft.formNarrativeFired[id] = {
      hot108: false,
      hot112: false,
      cold092: false,
      cold088: false,
      recovered: true
    };
  }
}

export function adjustMomentum(draft: MatchStateDraft, amount: number, isUser: boolean) {
  if (isUser) {
    draft.userMomentum = Math.max(-50, Math.min(50, draft.userMomentum + amount));
  } else {
    draft.aiMomentum = Math.max(-50, Math.min(50, draft.aiMomentum + amount));
  }
}
