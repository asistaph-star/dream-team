import { Player, PlayerPosition } from "../types/player";

export type Difficulty = 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT' | 'HELL_EXPERT' | 'DREAM_TEAM';

export interface PlayerMatchStats {
  PTS: number; REB: number; AST: number; STL: number; TOV: number; BLK: number; OREB: number; DREB: number;
  FOL: number; FTA: number; FTM: number;
  FGM: number; FGA: number;
  TPM: number; TPA: number;
  plusMinus: number; // NOW POPULATED: net score while this player is on the floor
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
  // Energy drink system (energyDrinksLeft already declared above)
  energyDrinkLocked: Record<string, number>; // playerId → gameTimeSec lock expires
  energyDrinkGoodUses: number;               // target stamina < 40% at use time
  energyDrinkPendingForm: string | null;     // playerId for next-tick form boost
  // Overtime (Step 10)
  isOT: boolean;
  otPeriod: number;
  otScores: { user: number[]; ai: number[] };
  shootoutSequence: null | {
    results: { userPlayerId: string; userPlayerName: string; aiPlayerId: string; aiPlayerName: string; userMade: boolean; aiMade: boolean }[];
    winner: 'user' | 'ai' | 'coin_flip';
  };
  // Fast break & shot clock (new systems)
  fastBreakActive: boolean;      // true = next possession is a fast break
  fastBreakTeam: 'user' | 'ai' | null; // which team has the fast break
  possessionClock: number;       // shot clock: 24 new possession, 14 after OREB
  possessionTeam: 'user' | 'ai' | null; // who currently has the ball
  lastPlayCategory: 'start_quarter' | 'steal' | 'block' | 'turnover' | 'made_shot' | 'miss_dreb' | 'miss_oreb' | 'foul_reset';
  injuries: Record<string, { status: 'HEALTHY' | 'GTD' | 'OUT' | 'DNP'; reason?: string }>;
  // Pillar 3: Rolling usage window — last 20 possession outcomes per player [DESIGN PARAMETER]
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
  
  // Skill system (Phase 0b)
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

export const emptyStats = (): PlayerMatchStats => ({ PTS: 0, REB: 0, AST: 0, STL: 0, TOV: 0, BLK: 0, OREB: 0, DREB: 0, FOL: 0, FTA: 0, FTM: 0, FGM: 0, FGA: 0, TPM: 0, TPA: 0, plusMinus: 0 });

export const clampForm = (v: number): number => Math.max(0.85, Math.min(1.15, v));

export const getStaminaMod = (stamina: number): number => {
  if (stamina >= 85) return 1.0;
  if (stamina >= 70) return 0.96;
  if (stamina >= 55) return 0.90;
  if (stamina >= 40) return 0.86;
  if (stamina >= 25) return 0.74;
  if (stamina >= 10) return 0.58;
  return 0.42;
};

export const getPlayerMaxStamina = (player: Player | undefined): number => {
  return Math.max(100, Math.round(player?.stamina ?? 100));
};

export const getStaminaPercent = (player: Player | undefined, stamina: number | undefined): number => {
  const maxStamina = getPlayerMaxStamina(player);
  return Math.max(0, Math.min(100, ((stamina ?? maxStamina) / maxStamina) * 100));
};

export const getPlayerStaminaMod = (player: Player, stamina: number | undefined): number => {
  return getStaminaMod(getStaminaPercent(player, stamina));
};

/** Zone/Press shot-level modifier — applied PER SHOT TYPE, on top of strategy weights.
 *  This models zone weaknesses/strengths that can't be captured by a flat position multiplier.
 */
export const getShotZoneModifier = (shotType: string, defStrategy: string): number => {
  if (defStrategy === '2-3 Zone') {
    // Paint is clogged by 3 defenders
    if (['dunk','hookShot','powerLayup','putBack','drivingLayup','fingerRoll'].includes(shotType)) return 0.75;
    // Mid-range — zone closes quickly
    if (['pullUpMid','fadeaway','bankShot','stepBackMid','floater'].includes(shotType)) return 0.80;
    // Corner 3 — 52% uncontested rate, open corner per real NBA data
    if (shotType === 'cornerThree') return 1.22; // +22% make bonus
    // Other 3s — somewhat open as zone sags
    if (['catchAndShoot','pullUpThree','stepBackThree'].includes(shotType)) return 1.09;
  }
  if (defStrategy === 'Full-Court Press') {
    // Press rarely affects the shot itself (it affects pre-shot turnover rate)
    // But if offense gets past the press, they get an easier look
    if (['drivingLayup','fingerRoll','euroStep','dunk'].includes(shotType)) return 1.12;
  }
  return 1.0;
};

/** Matchup exploitation bonus — offensive player vs their primary defender.
 *  Returns a make-probability bonus (0.0–0.20).
 */
export const getMatchupBonus = (
  scorer: import('../types/player').Player,
  defender: import('../types/player').Player | undefined
): number => {
  if (!defender) return 0;
  let bonus = 0;
  const speedDiff    = scorer.speed    - defender.speed;
  const strengthDiff = scorer.strength - defender.strength;
  const ovrDiff      = scorer.ovr      - defender.ovr;
  if (speedDiff    >= 15) bonus += 0.08; else if (speedDiff    >= 8) bonus += 0.04;
  if (strengthDiff >= 15) bonus += 0.06; else if (strengthDiff >= 8) bonus += 0.03;
  if (ovrDiff      >= 12) bonus += 0.05; else if (ovrDiff      >= 6) bonus += 0.02;
  return Math.min(bonus, 0.20); // cap at 20%
};

/** Get shot clock reset value.
 *  24 = new possession (turnover, made basket, start of period)
 *  14 = after offensive rebound of a shot that hit the rim (NBA 2018+ rule)
 */
export const getShotClockReset = (isOreb: boolean): number => isOreb ? 14 : 24;

/** Shot clock violation probability per possession.
 *  Base NBA rate ~3%, modified by strategy, stamina, and defensive pressure.
 */
export const getShotClockViolationChance = (
  offStrategy: string,
  avgOffStamina: number,
  defStrategy: string
): number => {
  let chance = 0.030; // NBA average: ~3 violations per 100 possessions
  // Slow-paced strategies with tired players hold longer
  if (offStrategy === 'Isolation (ISO)'   && avgOffStamina < 40) chance += 0.040;
  if (offStrategy === 'Post Isolation'    && avgOffStamina < 35) chance += 0.030;
  if (offStrategy === 'Pick & Roll'       && avgOffStamina < 30) chance += 0.015;
  if (offStrategy === 'Run & Gun')                               chance -= 0.015;
  if (offStrategy === 'Pace & Space')                              chance -= 0.010;
  if (offStrategy === 'Outside Shoot')                           chance -= 0.005;
  if (offStrategy === 'Corner 3s')                                chance += 0.005;
  if (offStrategy === 'Inside Score')                             chance += 0.010;
  if (offStrategy === 'Hawk Entry')                               chance += 0.005;
  if (offStrategy === 'Outside Cut Entry')                        chance += 0.010;
  if (offStrategy === 'Princeton Offense')                        chance += 0.020;
  // Defensive pressure creates clock trouble
  if (defStrategy === 'Full-Court Press' || defStrategy === 'Full-court press')   chance += 0.035;
  if (defStrategy === 'Half-Court Press' || defStrategy === 'Half-court press')   chance += 0.020;
  if (defStrategy === 'Blitz/Trap')                              chance += 0.015;
  if (defStrategy === '1-3-1 Zone')                              chance += 0.015;
  return Math.min(chance, 0.12); // hard cap
};

export const formatClock = (secs: number): string => {
  if (secs <= 0) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const OFFENSIVE_STRATEGIES: Record<string, Record<string, number>> = {
  "Motion Offense":  { C:1.01, PF:1.01, SF:1.01, SG:1.01, PG:1.01 },
  "Pick & Roll":     { C:1.02, PF:1.02, SF:0.99, SG:0.99, PG:1.02 },
  "Isolation (ISO)": { C:0.99, PF:0.99, SF:1.02, SG:1.02, PG:1.02 },
  "5-Out Spacing":   { C:0.99, PF:0.99, SF:1.02, SG:1.03, PG:1.03 },
  // C/PF dominate; guards become facilitators
  "Post Isolation":  { C:1.05, PF:1.04, SF:0.97, SG:0.95, PG:0.93 },
  "Run & Gun":       { C:0.92, PF:0.97, SF:1.03, SG:1.05, PG:1.05 },
  "Pace & Space":    { C:0.95, PF:1.01, SF:1.03, SG:1.03, PG:1.04 },
  "Outside Shoot":   { C:0.94, PF:0.96, SF:1.02, SG:1.05, PG:1.05 },
  "Corner 3s":       { C:0.92, PF:0.95, SF:1.04, SG:1.05, PG:1.02 },
  "Inside Score":    { C:1.06, PF:1.05, SF:0.98, SG:0.94, PG:0.92 },
  "Hawk Entry":      { C:1.01, PF:1.04, SF:1.04, SG:0.99, PG:0.99 },
  "Outside Cut Entry": { C:0.97, PF:0.99, SF:1.05, SG:1.03, PG:1.01 },
  "Princeton Offense": { C:1.02, PF:1.02, SF:1.02, SG:1.02, PG:1.02 },
};

export const DEFENSIVE_STRATEGIES: Record<string, Record<string, number>> = {
  "Man-to-Man":      { C:1.01, PF:1.01, SF:1.01, SG:1.01, PG:1.01 },
  "Drop Coverage":   { C:1.03, PF:1.02, SF:1.00, SG:0.99, PG:0.99 },
  "Switch Defense":  { C:0.99, PF:1.00, SF:1.02, SG:1.02, PG:1.02 },
  "Blitz/Trap":      { C:0.99, PF:0.99, SF:1.01, SG:1.03, PG:1.03 },
  // 2-3 Zone: bigs protect paint, guards sag back — corners left open
  "2-3 Zone":        { C:1.05, PF:1.01, SF:0.96, SG:0.90, PG:0.88 },
  // Full-Court Press: guards up front apply pressure; bigs back as last resort
  "Full-Court Press":{ C:0.80, PF:0.85, SF:0.92, SG:1.03, PG:1.06 },
  "Full-court press":{ C:0.80, PF:0.85, SF:0.92, SG:1.03, PG:1.06 },
  "Half-Court Press":{ C:0.90, PF:0.94, SF:1.00, SG:1.03, PG:1.04 },
  "Half-court press":{ C:0.90, PF:0.94, SF:1.00, SG:1.03, PG:1.04 },
  "3-2 Zone":        { C:0.89, PF:0.93, SF:1.03, SG:1.04, PG:1.04 },
  "Protect the Lane":{ C:1.07, PF:1.05, SF:0.96, SG:0.91, PG:0.89 },
  "1-3-1 Zone":      { C:0.93, PF:1.02, SF:1.02, SG:0.99, PG:1.02 },
  "Combination Defense": { C:1.01, PF:1.01, SF:1.02, SG:1.02, PG:1.02 },
};

const SLOT_ORDER = ['PG', 'SG', 'SF', 'PF', 'C'];

/** Adjacent positions have a softer OOP penalty */
const getOopMult = (natural: string, slot: string): number => {
  if (natural === slot) return 1.0;
  // Adjacent positions: PG↔SG, SG↔SF, SF↔PF, PF↔C
  const ni = SLOT_ORDER.indexOf(natural);
  const si = SLOT_ORDER.indexOf(slot);
  if (ni >= 0 && si >= 0 && Math.abs(ni - si) === 1) return 0.92; // adjacent
  return 0.85; // far out of position
};

/** Compute effective OFF/DEF for a lineup given stamina + strategy */
export const computeEffective = (
  lineup: Player[],
  stamina: Record<string, number>,
  offStrategy: string,
  defStrategy: string,
  offMult: number = 1.0,
  defMult: number = 1.0
): { off: number; def: number } => {
  const offMods = OFFENSIVE_STRATEGIES[offStrategy] || OFFENSIVE_STRATEGIES["Motion Offense"];
  const defMods = DEFENSIVE_STRATEGIES[defStrategy] || DEFENSIVE_STRATEGIES["Man-to-Man"];
  let off = 0, def = 0;
  lineup.forEach((p, idx) => {
    const sm = getPlayerStaminaMod(p, stamina[p.id]);
    const slotPos = SLOT_ORDER[idx] || p.position;
    const oopMult = getOopMult(p.position, slotPos);
    // Strategy mod uses the SLOT position (what role they're filling)
    off += p.offense * (offMods[slotPos] || 1.0) * sm * offMult * oopMult;
    def += p.defense * (defMods[slotPos] || 1.0) * sm * defMult * oopMult;
  });
  return { off: Math.floor(off), def: Math.floor(def) };
};

export const avgStamina = (lineup: Player[], stamina: Record<string, number>): number => {
  if (lineup.length === 0) return 100;
  return lineup.reduce((s, p) => s + getStaminaPercent(p, stamina[p.id]), 0) / lineup.length;
};

export const computeTeamScore = (
  playerStats: Record<string, PlayerMatchStats>,
  playerIds: string[]
): number => {
  return playerIds.reduce((sum, id) => sum + (playerStats[id]?.PTS ?? 0), 0);
};

export const createInitialMatchState = (): MatchState => ({
  quarter: 1, clock: 720,
  userScore: 0, aiScore: 0,
  events: [], isFinished: false,
  userMomentum: 50, aiMomentum: 50,
  playerStamina: {}, playerStats: {},
  userOffStrategy: "Motion Offense", userDefStrategy: "Man-to-Man",
  lastStrategyChange: 0,
  aiOffStrategy: "Motion Offense", aiDefStrategy: "Man-to-Man",
  lastAiStrategyChange: 0,
  energyDrinksLeft: 3, timeoutsLeft: 3,
  momentumUsesLeft: 2, momentumActive: false, momentumEndTime: 0,
  actionStaminaTracker: {}, hotPlayers: {},
  halftimeShown: false,
  userPlayerIds: [],
  aiPlayerIds: [],
  aiLineupIds: [],
  effectiveUserOff: 0, effectiveUserDef: 0,
  effectiveAiOff: 0, effectiveAiDef: 0,
  prevUserOff: 0, prevUserDef: 0,
  prevAiOff: 0, prevAiDef: 0,
  strategyWarnings: [],
  consecutiveAiRun: 0, consecutiveUserRun: 0,
  playerConsecutive: {},
  aiTimeoutsLeft: 3, aiLastSubCheck: 0,
  hotPlayerFocusTarget: null, hotPlayerLastScored: {},
  difficulty: 'NORMAL',
  quarterScores: { user: [0, 0, 0, 0], ai: [0, 0, 0, 0] },
  longestUserRun: 0, longestAiRun: 0,
  quarterStartUserScore: 0, quarterStartAiScore: 0,
  formRating: {}, formNarrativeFired: {}, hotFromForm: {},
  // Foul system
  teamFouls: { user: [0, 0, 0, 0], ai: [0, 0, 0, 0] },
  isInBonus: { user: false, ai: false },
  fouledOut: [],
  ftSequence: null,
  pendingAutoSub: null,
  // Home court — rolled once at match start
  isHomeGame: Math.random() < 0.5,
  // Decision tracking (Step 9)
  subsMade: 0,
  goodSubsMade: 0,
  // Energy drink system (energyDrinksLeft: 3 already set above)
  energyDrinkLocked: {},
  energyDrinkGoodUses: 0,
  energyDrinkPendingForm: null,
  isOT: false,
  otPeriod: 0,
  otScores: { user: [], ai: [] },
  shootoutSequence: null,
  // Fast break & shot clock
  fastBreakActive: false,
  fastBreakTeam: null,
  possessionClock: 24,
  possessionTeam: null,
  lastPlayCategory: 'start_quarter',
  injuries: {},
  possessionHistory: [],
  activeShotMeter: null,
  activeSkillBuffs: {},
  teamSkillBuffs: {
    user: { offIQ: 0, defIQ: 0, revertBlocked: false, revertThresholdBonus: 0 },
    ai:   { offIQ: 0, defIQ: 0, revertBlocked: false, revertThresholdBonus: 0 },
  },
  disabledSkills: {},
  blockedSkills: {},
  skillMarks: {},
  markImmunity: {},
  skillUsedThisGame: {},
  flagrantFouls: {},
  ejectedPlayers: [],
  prevAiLineupIds: [],
});

// --- SKILL SYSTEM HELPERS (Phase 0c) ---

/**
 * Returns all players in a lineup who have a given skill equipped
 * (either in baseSkills or specialSkillSlots).
 */
export const getSkillHolders = (
  lineup: Player[],
  skillName: string
): Player[] => {
  return lineup.filter(p => {
    const inBase = p.baseSkills?.includes(skillName) ?? false;
    const inSpecial = p.specialSkillSlots?.includes(skillName) ?? false;
    return inBase || inSpecial;
  });
};

/**
 * Returns true if 2 or more players in the lineup share the same skill.
 * This is the stack condition for stack-enhanced skill effects.
 */
export const hasSkillStack = (
  lineup: Player[],
  skillName: string
): boolean => {
  return getSkillHolders(lineup, skillName).length >= 2;
};

/**
 * Returns player IDs that are in currentLineupIds but were NOT in prevLineupIds.
 * These are players who just entered the game this tick.
 */
export const getEnteredPlayerIds = (
  currentLineupIds: string[],
  prevLineupIds: string[]
): string[] => {
  return currentLineupIds.filter(id => !prevLineupIds.includes(id));
};

export type FlagrantLevel = 1 | 2;

export interface FlagrantFoulResult {
  level: FlagrantLevel;
  committerId: string;
  targetId: string;
  ejected: boolean;
  ftCount: 2;
  possessionToFouledTeam: true;
}

/**
 * Resolves a flagrant foul event.
 * flagrantHistory = current state.flagrantFouls record.
 */
export const resolveFlagrantFoul = (
  committerId: string,
  targetId: string,
  level: FlagrantLevel,
  flagrantHistory: Record<string, number>
): FlagrantFoulResult => {
  const existingFlagrants = flagrantHistory[committerId] ?? 0;
  const ejected = level === 2 || (level === 1 && existingFlagrants >= 1);
  return {
    level,
    committerId,
    targetId,
    ejected,
    ftCount: 2 as const,
    possessionToFouledTeam: true as const,
  };
};

/**
 * Translates a skill's IQ point value into a flat additive bonus
 * to add on top of computeEffective()'s team output.
 */
export const translateOffIQBoost = (
  iqPoints: number,
  teamEffectiveOff: number,
  playerStamina: number
): number => {
  const staminaMod = getStaminaMod(playerStamina);
  const boostPct = iqPoints / 7000;
  const staminaScaled = boostPct * staminaMod;
  return Math.floor(teamEffectiveOff * staminaScaled);
};

export const translateDefIQBoost = (
  iqPoints: number,
  teamEffectiveDef: number,
  playerStamina: number
): number => {
  const staminaMod = getStaminaMod(playerStamina);
  const boostPct = iqPoints / 7000;
  const staminaScaled = boostPct * staminaMod;
  return Math.floor(teamEffectiveDef * staminaScaled);
};

/**
 * Returns true if auto-strategy reverts are blocked for this team this tick.
 * Used by Pulse skill: while Pulse holder is on court, team cannot auto-revert.
 */
export const isStrategyRevertBlocked = (
  teamSide: 'user' | 'ai',
  teamSkillBuffs: MatchState['teamSkillBuffs']
): boolean => {
  return teamSkillBuffs[teamSide].revertBlocked;
};

/**
 * Returns the effective stamina threshold at which a strategy auto-reverts,
 * accounting for Iron Curtain's threshold bonus applied by the opposing team.
 */
export const getEffectiveRevertThreshold = (
  baseThreshold: number,
  opponentSide: 'user' | 'ai',
  teamSkillBuffs: MatchState['teamSkillBuffs']
): number => {
  return baseThreshold + teamSkillBuffs[opponentSide].revertThresholdBonus;
};

/**
 * Returns true if a specific skill is currently blocked for a player.
 * Static blocks skills either for the quarter or the whole game.
 */
export const isSkillBlocked = (
  playerId: string,
  skillName: string,
  currentQuarter: number,
  blockedSkills: MatchState['blockedSkills']
): boolean => {
  const blocks = blockedSkills[playerId] ?? [];
  return blocks.some(b => {
    if (b.skillName !== skillName) return false;
    if (b.until === 'game') return true;
    if (b.until === 'quarter') return b.blockedAtQuarter === currentQuarter;
    return false;
  });
};

/**
 * Resolves the actual trigger rate for a skill based on its rarity.
 * Rate is out of 1000 per relevant event. Divide by 1000 for probability.
 */
export const getSkillRate = (
  perfectRate: number,
  rarity: 'Common' | 'Rare' | 'Elite' | 'Epic' | 'Legendary'
): number => {
  const multipliers: Record<string, number> = {
    Common: 0.40,
    Rare: 0.60,
    Elite: 0.80,
    Epic: 1.00,
    Legendary: 1.20,
  };
  return Math.floor(perfectRate * (multipliers[rarity] ?? multipliers.Common));
};
