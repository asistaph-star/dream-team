import { Player } from "../types/player";

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT' | 'HELL_EXPERT' | 'DREAM_TEAM';

export interface PlayerMatchStats {
  PTS: number; REB: number; AST: number; STL: number; TOV: number; BLK: number; OREB: number; DREB: number;
  FOL: number; FTA: number; FTM: number;
  FGM: number; FGA: number;
  TPM: number; TPA: number;
  plusMinus: number;
}

export interface MatchEvent {
  id: string; time: string; text: string;
  isUserTeam: boolean; pointsScored: number; activePlayerId?: string;
  isHiddenDuringFT?: boolean;
}

export interface MatchState {
  quarter: number;
  clock: number;
  userScore: number;
  aiScore: number;
  events: MatchEvent[];
  isFinished: boolean;
  audience?: number;
  lastScorerId?: string;
  lastPointsScored?: number;
  userMomentum: number;
  aiMomentum: number;
  playerStamina: Record<string, number>;
  playerStats: Record<string, PlayerMatchStats>;
  // User strategies
  userOffStrategy: string;
  userDefStrategy: string;
  lastStrategyChange: number;
  // AI strategies (Layer 6)
  aiOffStrategy: string;
  aiDefStrategy: string;
  lastAiStrategyChange: number;
  // Consumables
  energyDrinksLeft: number;
  timeoutsLeft: number;
  momentumUsesLeft: number;
  momentumActive: boolean;
  momentumEndTime: number;
  // Tracking
  actionStaminaTracker: Record<string, { lost: number; windowStart: number }>;
  hotPlayers: Record<string, boolean>;
  halftimeShown: boolean;
  userPlayerIds: string[];
  aiPlayerIds: string[];
  aiLineupIds: string[];
  // Live effective stats (Layer 4)
  effectiveUserOff: number;
  effectiveUserDef: number;
  effectiveAiOff: number;
  effectiveAiDef: number;
  prevUserOff: number;
  prevUserDef: number;
  prevAiOff: number;
  prevAiDef: number;
  // Strategy warnings (Layer 3)
  strategyWarnings: string[];
  // Scoring run tracking (Layer 5)
  consecutiveAiRun: number;
  consecutiveUserRun: number;
  playerConsecutive: Record<string, number>;
  // AI coaching system
  aiTimeoutsLeft: number;
  aiLastSubCheck: number;
  hotPlayerFocusTarget: string | null;
  hotPlayerLastScored: Record<string, number>;
  difficulty: Difficulty;
  // Post-game tracking
  quarterScores: { user: number[]; ai: number[] };
  longestUserRun: number;
  longestAiRun: number;
  quarterStartUserScore: number;
  quarterStartAiScore: number;
  // Form rating system
  formRating: Record<string, number>;
  formNarrativeFired: Record<string, { hot108: boolean; hot112: boolean; cold092: boolean; cold088: boolean; recovered: boolean }>;
  hotFromForm: Record<string, boolean>;
  // Event indicator for floating popups
  lastEventIndicator?: { playerId: string; type: 'BLK' | 'STL' | 'TOV' | 'REB' | 'OREB' | 'AST' | 'FOL'; targetId?: string };
  // Foul system
  teamFouls: { user: number[]; ai: number[] };
  isInBonus: { user: boolean; ai: boolean };
  fouledOut: string[];
  ftSequence: null | {
    shooterId: string; shooterName: string;
    totalShots: number; isAnd1: boolean;
    results: ('make' | 'miss')[];
    foulCommitterName: string; foulCommitterFouls: number;
    isUserTeam: boolean;
  };
  pendingAutoSub: null | { outId: string; inId: string };
  // Home court (Step 8)
  isHomeGame: boolean;
  // Decision tracking (Step 9)
  subsMade: number;
  goodSubsMade: number;
  // Energy drink system
  energyDrinkLocked: Record<string, number>;
  energyDrinkGoodUses: number;
  energyDrinkPendingForm: string | null;
  // Overtime (Step 10)
  isOT: boolean;
  otPeriod: number;
  otScores: { user: number[]; ai: number[] };
  shootoutSequence: null | {
    results: { userPlayerId: string; userPlayerName: string; aiPlayerId: string; aiPlayerName: string; userMade: boolean; aiMade: boolean }[];
    winner: 'user' | 'ai' | 'coin_flip';
  };
  // Fast break & shot clock
  fastBreakActive: boolean;
  fastBreakTeam: 'user' | 'ai' | null;
  possessionClock: number;
  possessionTeam: 'user' | 'ai' | null;
  lastPlayCategory: 'start_quarter' | 'steal' | 'block' | 'turnover' | 'made_shot' | 'miss_dreb' | 'miss_oreb' | 'foul_reset';
  injuries: Record<string, { status: 'HEALTHY' | 'GTD' | 'OUT' | 'DNP'; reason?: string }>;
  possessionHistory: { team: 'user' | 'ai'; playerId: string; wasTOV: boolean }[];
  lastTimeElapsed?: number;
  lastPossessionClockStart?: number;
  strategyLevels?: Record<string, { level: number; exp: number }>;
  activeShotMeter?: null | {
    playerId: string;
    shooterName: string;
    is3PT: boolean;
    isSuccess: boolean;
    shotType: string;
    releaseProgress: number;
    greenWindowStart: number;
    greenWindowEnd: number;
    feedback: string;
    isAiTeam: boolean;
  };
  
  // Skill system
  activeSkillBuffs: Record<string, {
    offIQBoost: number;
    defIQBoost: number;
    staminaDecayMult: number;
    benchRecoveryBonus: number;
  }>;
  teamSkillBuffs: {
    user: {
      offIQ: number;
      defIQ: number;
      revertBlocked: boolean;
      revertThresholdBonus: number;
    };
    ai: {
      offIQ: number;
      defIQ: number;
      revertBlocked: boolean;
      revertThresholdBonus: number;
    };
  };
  disabledSkills: Record<string, string[]>;
  blockedSkills: Record<string, {
    skillName: string;
    until: 'quarter' | 'game';
    blockedAtQuarter: number;
  }[]>;
  skillMarks: Record<string, {
    mark: 'Exposed' | 'Debt' | 'Hooked' | 'Pinned' | 'Static' | 'Tilted';
    possessionsLeft: number;
    sourceSkill: string;
  }[]>;
  markImmunity: Record<string, {
    mark: 'Exposed' | 'Debt' | 'Hooked' | 'Pinned' | 'Static' | 'Tilted';
    possessionsLeft: number;
  }[]>;
  skillUsedThisGame: Record<string, string[]>;
  flagrantFouls: Record<string, number>;
  ejectedPlayers: string[];
  prevAiLineupIds: string[];
}
