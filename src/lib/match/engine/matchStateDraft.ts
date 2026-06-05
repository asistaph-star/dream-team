import { MatchState, PlayerMatchStats, MatchEvent } from '../matchTypes';

export interface MatchStateDraft {
  quarter: number;
  clock: number;
  userScore: number;
  aiScore: number;
  events: MatchEvent[];
  playerStamina: Record<string, number>;
  playerStats: Record<string, PlayerMatchStats>;
  skillMarks: MatchState['skillMarks'];
  markImmunity: MatchState['markImmunity'];
  skillUsedThisGame: MatchState['skillUsedThisGame'];
  formRating: Record<string, number>;
  formNarrativeFired: MatchState['formNarrativeFired'];
  hotFromForm: Record<string, boolean>;
  userMomentum: number;
  aiMomentum: number;
  ftSequence: MatchState['ftSequence'];
  teamFouls: MatchState['teamFouls'];
  isInBonus: MatchState['isInBonus'];
  fouledOut: MatchState['fouledOut'];
  ejectedPlayers: MatchState['ejectedPlayers'];
  activeSkillBuffs: MatchState['activeSkillBuffs'];
  teamSkillBuffs: MatchState['teamSkillBuffs'];
  activeShotMeter: MatchState['activeShotMeter'];
  isFinished: boolean;
  possessionTeam: MatchState['possessionTeam'];
  possessionClock: number;
  lastPlayCategory: MatchState['lastPlayCategory'];
  subsMade: number;
  goodSubsMade: number;
  energyDrinkLocked: MatchState['energyDrinkLocked'];
  energyDrinkGoodUses: number;
  energyDrinkPendingForm: MatchState['energyDrinkPendingForm'];
  consecutiveUserRun: number;
  consecutiveAiRun: number;
  longestUserRun: number;
  longestAiRun: number;
}

export function createDraft(state: MatchState): MatchStateDraft {
  const playerStats: Record<string, PlayerMatchStats> = {};
  Object.keys(state.playerStats).forEach(k => {
    playerStats[k] = { ...state.playerStats[k] };
  });

  const skillMarks: MatchState['skillMarks'] = {};
  Object.keys(state.skillMarks ?? {}).forEach(k => {
    skillMarks[k] = (state.skillMarks[k] ?? []).map(m => ({ ...m }));
  });

  const markImmunity: MatchState['markImmunity'] = {};
  Object.keys(state.markImmunity ?? {}).forEach(k => {
    markImmunity[k] = (state.markImmunity[k] ?? []).map(m => ({ ...m }));
  });

  const formNarrativeFired: MatchState['formNarrativeFired'] = {};
  Object.keys(state.formNarrativeFired ?? {}).forEach(k => {
    formNarrativeFired[k] = { ...state.formNarrativeFired[k] };
  });

  const skillUsedThisGame: MatchState['skillUsedThisGame'] = {};
  Object.keys(state.skillUsedThisGame ?? {}).forEach(k => {
    skillUsedThisGame[k] = [...(state.skillUsedThisGame[k] ?? [])];
  });

  return {
    quarter: state.quarter,
    clock: state.clock,
    userScore: state.userScore,
    aiScore: state.aiScore,
    events: [], // New events generated this tick
    playerStamina: { ...state.playerStamina },
    playerStats,
    skillMarks,
    markImmunity,
    skillUsedThisGame,
    formRating: { ...state.formRating },
    formNarrativeFired,
    hotFromForm: { ...state.hotFromForm },
    userMomentum: state.userMomentum,
    aiMomentum: state.aiMomentum,
    ftSequence: state.ftSequence ? { ...state.ftSequence, results: [...state.ftSequence.results] } : null,
    teamFouls: {
      user: [...(state.teamFouls?.user ?? [0, 0, 0, 0, 0])],
      ai: [...(state.teamFouls?.ai ?? [0, 0, 0, 0, 0])]
    },
    isInBonus: {
      user: state.isInBonus?.user ?? false,
      ai: state.isInBonus?.ai ?? false
    },
    fouledOut: [...(state.fouledOut ?? [])],
    ejectedPlayers: [...(state.ejectedPlayers ?? [])],
    activeSkillBuffs: {},
    teamSkillBuffs: {
      user: { offIQ: 0, defIQ: 0, revertBlocked: false, revertThresholdBonus: 0 },
      ai:   { offIQ: 0, defIQ: 0, revertBlocked: false, revertThresholdBonus: 0 }
    },
    activeShotMeter: null,
    isFinished: state.isFinished,
    possessionTeam: state.possessionTeam,
    possessionClock: state.possessionClock,
    lastPlayCategory: state.lastPlayCategory,
    subsMade: state.subsMade ?? 0,
    goodSubsMade: state.goodSubsMade ?? 0,
    energyDrinkLocked: { ...(state.energyDrinkLocked ?? {}) },
    energyDrinkGoodUses: state.energyDrinkGoodUses ?? 0,
    energyDrinkPendingForm: state.energyDrinkPendingForm ?? null,
    consecutiveUserRun: state.consecutiveUserRun ?? 0,
    consecutiveAiRun: state.consecutiveAiRun ?? 0,
    longestUserRun: state.longestUserRun ?? 0,
    longestAiRun: state.longestAiRun ?? 0
  };
}

export function finalizeDraft(state: MatchState, draft: MatchStateDraft): MatchState {
  // Prepend new events this tick to existing events log, capped at 50
  const mergedEvents = [...draft.events, ...state.events].slice(0, 50);

  return {
    ...state,
    quarter: draft.quarter,
    clock: draft.clock,
    userScore: draft.userScore,
    aiScore: draft.aiScore,
    events: mergedEvents,
    playerStamina: draft.playerStamina,
    playerStats: draft.playerStats,
    skillMarks: draft.skillMarks,
    markImmunity: draft.markImmunity,
    skillUsedThisGame: draft.skillUsedThisGame,
    formRating: draft.formRating,
    formNarrativeFired: draft.formNarrativeFired,
    hotFromForm: draft.hotFromForm,
    userMomentum: draft.userMomentum,
    aiMomentum: draft.aiMomentum,
    ftSequence: draft.ftSequence,
    teamFouls: draft.teamFouls,
    isInBonus: draft.isInBonus,
    fouledOut: draft.fouledOut,
    ejectedPlayers: draft.ejectedPlayers,
    activeSkillBuffs: draft.activeSkillBuffs,
    teamSkillBuffs: draft.teamSkillBuffs,
    activeShotMeter: draft.activeShotMeter,
    isFinished: draft.isFinished,
    possessionTeam: draft.possessionTeam,
    possessionClock: draft.possessionClock,
    lastPlayCategory: draft.lastPlayCategory,
    subsMade: draft.subsMade,
    goodSubsMade: draft.goodSubsMade,
    energyDrinkLocked: draft.energyDrinkLocked,
    energyDrinkGoodUses: draft.energyDrinkGoodUses,
    energyDrinkPendingForm: draft.energyDrinkPendingForm,
    consecutiveUserRun: draft.consecutiveUserRun,
    consecutiveAiRun: draft.consecutiveAiRun,
    longestUserRun: draft.longestUserRun,
    longestAiRun: draft.longestAiRun
  };
}
