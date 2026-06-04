import * as path from "path";
import * as fs from "fs";
import { Player } from "../../lib/types/player";

// 1. Hijack the skillResolver and shotEngine modules in require.cache before importing matchEngine
const absoluteResolverPath = path.resolve(__dirname, "../../lib/skills/skillResolver.ts");
const absoluteShotEnginePath = path.resolve(__dirname, "../../lib/utils/shotEngine.ts");

if (!fs.existsSync(absoluteResolverPath)) {
  throw new Error(`Cannot find skillResolver at ${absoluteResolverPath}`);
}
if (!fs.existsSync(absoluteShotEnginePath)) {
  throw new Error(`Cannot find shotEngine at ${absoluteShotEnginePath}`);
}

const originalResolver = require(absoluteResolverPath);
const mockedResolver = { ...originalResolver };

const originalShotEngine = require(absoluteShotEnginePath);
const mockedShotEngine = { ...originalShotEngine };

// Active attempt tracking for the current tick
interface AttemptRecord {
  playerId: string;
  shotType: string;
  is3PT: boolean;
  outcome?: "make" | "miss" | "block" | "foul";
}

let activeTickAttempts: AttemptRecord[] = [];
let allScenarioAttempts: AttemptRecord[] = [];

// Intercept generateShot to capture exact shot types
mockedShotEngine.generateShot = (
  player: Player,
  formRating: number,
  staminaPct: number,
  is3PTBaseCheck?: boolean,
  pace?: any
) => {
  const result = originalShotEngine.generateShot(player, formRating, staminaPct, is3PTBaseCheck, pace);
  activeTickAttempts.push({
    playerId: player.id,
    shotType: result.type,
    is3PT: result.is3PT
  });
  return result;
};

// Global counters for skills and mechanics
let shadowGuardRolls = 0;
let shadowGuardTriggers = 0;
let focusLockRolls = 0;
let focusLockTriggers = 0;
let disciplineWallRolls = 0;
let disciplineWallTriggers = 0;
let handsActiveRolls = 0;
let handsActiveTriggers = 0;
let tempoSwitchRolls = 0;
let tempoSwitchTriggers = 0;
let enforcerLiftRolls = 0;
let enforcerLiftTriggers = 0;
let futureCoreRolls = 0;
let futureCoreTriggers = 0;

let fourPointBaitRolls = 0;
let fourPointBaitTriggers = 0;
let redDotRolls = 0;
let redDotTriggers = 0;
let flopRolls = 0;
let flopTriggers = 0;
let composureRolls = 0;
let composureTriggers = 0;
let cleanContestRolls = 0;
let cleanContestTriggers = 0;
let defensiveAnchorRolls = 0;
let defensiveAnchorTriggers = 0;
let timeoutResetRolls = 0;
let timeoutResetTriggers = 0;
let glassStrikeRolls = 0;
let glassStrikeTriggers = 0;
let contactTaxRolls = 0;
let contactTaxTriggers = 0;
let lungBurnerRolls = 0;
let lungBurnerTriggers = 0;
let deadAirRolls = 0;
let deadAirTriggers = 0;
let skyWallRolls = 0;
let skyWallTriggers = 0;
let rimWardenRolls = 0;
let rimWardenTriggers = 0;
let paintBarrierRolls = 0;
let paintBarrierTriggers = 0;
let ironMotorRolls = 0;
let ironMotorTriggers = 0;

// Mark tracking
let marksAdded: Record<string, number> = {};
let marksCleansed = 0;

// Intercept resolveSpecialSkillMechanics to verify mappings
mockedResolver.rollSpecialMechanic = (lineup: Player[], mechanicId: any, stamina: Record<string, number>, scaleFn?: any): boolean => {
  const result = originalResolver.rollSpecialMechanic(lineup, mechanicId, stamina, scaleFn);
  
  if (mechanicId === "DEEP_STRIKE_FOUR_POINT_BAIT") {
    fourPointBaitRolls++;
    if (result) fourPointBaitTriggers++;
  } else if (mechanicId === "DEEP_STRIKE_EXPOSE_SETUP") {
    redDotRolls++;
    if (result) redDotTriggers++;
  } else if (mechanicId === "FLOP_SELL_CONTACT") {
    flopRolls++;
    if (result) flopTriggers++;
  } else if (mechanicId === "COMPOSURE_SHIELD_CANCEL") {
    composureRolls++;
    if (result) composureTriggers++;
  } else if (mechanicId === "CLEAN_CHALLENGE_CONTEST") {
    cleanContestRolls++;
    if (result) cleanContestTriggers++;
  } else if (mechanicId === "DEFENSIVE_ANCHOR_TEAM_PRESSURE") {
    defensiveAnchorRolls++;
    if (result) defensiveAnchorTriggers++;
  } else if (mechanicId === "TIMEOUT_RESET_CLEANSE") {
    timeoutResetRolls++;
    if (result) timeoutResetTriggers++;
  } else if (mechanicId === "GLASS_STRIKE_REBOUND") {
    glassStrikeRolls++;
    if (result) glassStrikeTriggers++;
  } else if (mechanicId === "POSTER_SPARK_CONTACT_TAX") {
    contactTaxRolls++;
    if (result) contactTaxTriggers++;
  } else if (mechanicId === "POSTER_SPARK_LUNG_BURNER") {
    lungBurnerRolls++;
    if (result) lungBurnerTriggers++;
  } else if (mechanicId === "GAMEPLAN_DEAD_AIR") {
    deadAirRolls++;
    if (result) deadAirTriggers++;
  } else if (mechanicId === "SKY_WALL_RIM_PRESSURE") {
    skyWallRolls++;
    if (result) skyWallTriggers++;
  }
  
  return result;
};

mockedResolver.rollBaseSkill = (lineup: Player[], skillName: any, stamina: Record<string, number>, rateOverride?: number): boolean => {
  const result = originalResolver.rollBaseSkill(lineup, skillName, stamina, rateOverride);
  
  if (skillName === "Shadow Guard") {
    shadowGuardRolls++;
    if (result) shadowGuardTriggers++;
  } else if (skillName === "Focus Lock") {
    focusLockRolls++;
    if (result) focusLockTriggers++;
  } else if (skillName === "Discipline Wall") {
    disciplineWallRolls++;
    if (result) disciplineWallTriggers++;
  } else if (skillName === "Hands Active") {
    handsActiveRolls++;
    if (result) handsActiveTriggers++;
  } else if (skillName === "Tempo Switch") {
    tempoSwitchRolls++;
    if (result) tempoSwitchTriggers++;
  } else if (skillName === "Enforcer Lift") {
    enforcerLiftRolls++;
    if (result) enforcerLiftTriggers++;
  } else if (skillName === "Future Core") {
    futureCoreRolls++;
    if (result) futureCoreTriggers++;
  } else if (skillName === "Iron Motor") {
    ironMotorRolls++;
    if (result) ironMotorTriggers++;
  } else if (skillName === "Rim Warden") {
    rimWardenRolls++;
    if (result) rimWardenTriggers++;
  } else if (skillName === "Paint Barrier") {
    paintBarrierRolls++;
    if (result) paintBarrierTriggers++;
  }
  
  return result;
};

// Track marks
mockedResolver.addMark = (marks: any, immunity: any, playerId: string, mark: string, sourceSkill: string, possessionsLeft = 2) => {
  const result = originalResolver.addMark(marks, immunity, playerId, mark, sourceSkill, possessionsLeft);
  marksAdded[mark] = (marksAdded[mark] ?? 0) + 1;
  return result;
};

mockedResolver.removeOldestMark = (marks: any, playerId: string) => {
  const result = originalResolver.removeOldestMark(marks, playerId);
  if (result.cleansedMark) {
    marksCleansed++;
  }
  return result;
};

// Inject mocks into require.cache
require.cache[absoluteResolverPath] = {
  id: absoluteResolverPath,
  filename: absoluteResolverPath,
  loaded: true,
  exports: mockedResolver
} as any;

require.cache[absoluteShotEnginePath] = {
  id: absoluteShotEnginePath,
  filename: absoluteShotEnginePath,
  loaded: true,
  exports: mockedShotEngine
} as any;

// Load matchEngine after injection
const matchEngine = require("../../lib/utils/matchEngine");
const { resolveLineupArchetypes } = require("../../lib/lineup/lineupArchetypeResolver");
const { simulateTick, createInitialMatchState, computeEffective } = matchEngine;

const CLOSE_RANGE_SHOTS = [
  "drivingLayup",
  "dunk",
  "euroStep",
  "fingerRoll",
  "powerLayup",
  "putBack",
  "bankShot",
  "hookShot",
  "floater"
];

function resetTickFlags() {
  activeTickAttempts = [];
}

function resetScenarioCounters() {
  shadowGuardRolls = 0;
  shadowGuardTriggers = 0;
  focusLockRolls = 0;
  focusLockTriggers = 0;
  disciplineWallRolls = 0;
  disciplineWallTriggers = 0;
  handsActiveRolls = 0;
  handsActiveTriggers = 0;
  tempoSwitchRolls = 0;
  tempoSwitchTriggers = 0;
  enforcerLiftRolls = 0;
  enforcerLiftTriggers = 0;
  futureCoreRolls = 0;
  futureCoreTriggers = 0;
  fourPointBaitRolls = 0;
  fourPointBaitTriggers = 0;
  redDotRolls = 0;
  redDotTriggers = 0;
  flopRolls = 0;
  flopTriggers = 0;
  composureRolls = 0;
  composureTriggers = 0;
  cleanContestRolls = 0;
  cleanContestTriggers = 0;
  defensiveAnchorRolls = 0;
  defensiveAnchorTriggers = 0;
  timeoutResetRolls = 0;
  timeoutResetTriggers = 0;
  glassStrikeRolls = 0;
  glassStrikeTriggers = 0;
  contactTaxRolls = 0;
  contactTaxTriggers = 0;
  lungBurnerRolls = 0;
  lungBurnerTriggers = 0;
  deadAirRolls = 0;
  deadAirTriggers = 0;
  skyWallRolls = 0;
  skyWallTriggers = 0;
  rimWardenRolls = 0;
  rimWardenTriggers = 0;
  paintBarrierRolls = 0;
  paintBarrierTriggers = 0;
  ironMotorRolls = 0;
  ironMotorTriggers = 0;

  marksAdded = {};
  marksCleansed = 0;
  allScenarioAttempts = [];
}

function cloneStats(stats: any) {
  return JSON.parse(JSON.stringify(stats));
}

function createMockPlayer(
  id: string,
  name: string,
  position: "PG" | "SG" | "SF" | "PF" | "C",
  rarity: "Common" | "Rare" | "Epic" | "Legendary" | "Mythic",
  ovr: number,
  baseSkills: [string, string, string],
  specialSkillSlots: (string | null)[] = [],
  statOverrides: Partial<Player> = {},
  skillRarities: Record<string, string> = {}
): Player {
  return {
    id,
    name,
    position,
    rarity,
    level: 1,
    maxLevel: 50,
    exp: 0,
    ovr,
    offense: 80,
    defense: 75,
    shooting: 75,
    speed: 75,
    strength: 75,
    playmaking: 75,
    baseSkills,
    specialSkillSlots,
    starLevel: 5,
    threePt: 75,
    twoPt: 75,
    freeThrow: 75,
    finishing: 75,
    rebound: 75,
    steal: 70,
    block: 70,
    onBall: 70,
    handle: 75,
    assist: 75,
    calm: 75,
    threePtTendency: 0.25,
    driveTendency: 0.35,
    pullUpTendency: 0.25,
    foulDrawTendency: 0.40,
    skillRarities: skillRarities as any,
    ...statOverrides
  };
}

interface ScenarioMetrics {
  combinedScore: number;
  userScore: number;
  aiScore: number;
  userFTA: number;
  aiFTA: number;
  userFGM: number;
  userFGA: number;
  aiFGM: number;
  aiFGA: number;
  user3PM: number;
  user3PA: number;
  ai3PM: number;
  ai3PA: number;
  userPaintAtt: number;
  userPaintFGM: number;
  aiPaintAtt: number;
  aiPaintFGM: number;
  userTurnovers: number;
  aiTurnovers: number;
  userSteals: number;
  aiSteals: number;
  userBlocks: number;
  aiBlocks: number;

  shadowGuardTriggers: number;
  focusLockTriggers: number;
  disciplineWallTriggers: number;
  handsActiveTriggers: number;
  tempoSwitchTriggers: number;
  enforcerLiftTriggers: number;
  futureCoreTriggers: number;

  fourPointBaitTriggers: number;
  redDotTriggers: number;
  flopTriggers: number;
  composureTriggers: number;
  cleanContestTriggers: number;
  defensiveAnchorTriggers: number;
  timeoutResetTriggers: number;
  glassStrikeTriggers: number;
  contactTaxTriggers: number;
  lungBurnerTriggers: number;
  deadAirTriggers: number;
  skyWallTriggers: number;
  rimWardenTriggers: number;
  paintBarrierTriggers: number;
  ironMotorTriggers: number;

  marksAdded: Record<string, number>;
  marksCleansed: number;

  // End of game stamina
  userStamina: Record<string, number>;
  aiStamina: Record<string, number>;

  // Stamina by quarter
  userAvgStaminaByQuarter: Record<number, number>;
  aiAvgStaminaByQuarter: Record<number, number>;
}

function runMatches(
  userLineup: Player[],
  aiLineup: Player[],
  userStrategy = "Motion Offense",
  aiStrategy = "Motion Offense",
  numMatches = 30
): ScenarioMetrics[] {
  const allUserRoster = [...userLineup];
  const aiTeamObj = {
    name: "AI Test Team",
    arena: "AI Arena",
    off: 80,
    def: 80,
    color: "#ff0000",
    roster: aiLineup
  };

  const matchesMetrics: ScenarioMetrics[] = [];

  for (let m = 0; m < numMatches; m++) {
    let state = createInitialMatchState();
    state.userOffStrategy = userStrategy;
    state.userDefStrategy = "Man-to-Man";
    state.aiOffStrategy = aiStrategy;
    state.aiDefStrategy = "Man-to-Man";
    state.userPlayerIds = allUserRoster.map(p => p.id);
    state.aiPlayerIds = aiLineup.map(p => p.id);
    state.aiLineupIds = aiLineup.map(p => p.id);

    // Set starting stamina
    allUserRoster.forEach(p => { state.playerStamina[p.id] = 100; });
    aiLineup.forEach(p => { state.playerStamina[p.id] = 100; });

    let ticks = 0;
    let halftimeTriggered = false;

    // Local match-level counts
    let userPaintAtt = 0, userPaintFGM = 0;
    let aiPaintAtt = 0, aiPaintFGM = 0;
    
    const userAvgStaminaByQuarter: Record<number, number> = { 1: 100, 2: 100, 3: 100, 4: 100 };
    const aiAvgStaminaByQuarter: Record<number, number> = { 1: 100, 2: 100, 3: 100, 4: 100 };

    while (!state.isFinished && ticks < 400) {
      if (state.halftimeShown && !halftimeTriggered) {
        halftimeTriggered = true;
        allUserRoster.forEach(p => {
          state.playerStamina[p.id] = Math.min(100, (state.playerStamina[p.id] ?? 100) + 30);
        });
        aiLineup.forEach(p => {
          state.playerStamina[p.id] = Math.min(100, (state.playerStamina[p.id] ?? 100) + 30);
        });
      }

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;

      resetTickFlags();
      const preStats = cloneStats(state.playerStats);
      const preEventsLen = state.events.length;

      // Execute Tick
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      ticks++;

      const newEvents = state.events.slice(preEventsLen);
      const postStats = state.playerStats;

      // Parse close-range attempts
      activeTickAttempts.forEach(att => {
        const isUser = userLineup.some(p => p.id === att.playerId);
        const type = att.shotType;
        if (!CLOSE_RANGE_SHOTS.includes(type)) return;

        const pre = preStats[att.playerId] || { FGM: 0, FGA: 0 };
        const post = postStats[att.playerId] || { FGM: 0, FGA: 0 };
        const outcome = (post.FGM ?? 0) > (pre.FGM ?? 0) ? "make" : "miss";

        if (isUser) {
          userPaintAtt++;
          if (outcome === "make") userPaintFGM++;
        } else {
          aiPaintAtt++;
          if (outcome === "make") aiPaintFGM++;
        }
      });

      // Record quarter stamina profiles
      const q = state.quarter;
      if (q >= 1 && q <= 4) {
        const userAvg = userLineup.reduce((sum, p) => sum + (state.playerStamina[p.id] ?? 100), 0) / userLineup.length;
        const aiAvg = aiLineup.reduce((sum, p) => sum + (state.playerStamina[p.id] ?? 100), 0) / aiLineup.length;
        userAvgStaminaByQuarter[q] = userAvg;
        aiAvgStaminaByQuarter[q] = aiAvg;
      }
    }

    // Accumulate total metrics
    let userFTA = 0, aiFTA = 0;
    let userFGM = 0, userFGA = 0, aiFGM = 0, aiFGA = 0;
    let user3PM = 0, user3PA = 0, ai3PM = 0, ai3PA = 0;
    let userTurnovers = 0, aiTurnovers = 0;
    let userSteals = 0, aiSteals = 0;
    let userBlocks = 0, aiBlocks = 0;

    userLineup.forEach(p => {
      const s = state.playerStats[p.id] || {};
      userFTA += s.FTA ?? 0;
      userFGM += s.FGM ?? 0;
      userFGA += s.FGA ?? 0;
      user3PM += s.threeMade ?? 0;
      user3PA += s.threeAttempted ?? 0;
      userTurnovers += s.TOV ?? 0;
      userSteals += s.STL ?? 0;
      userBlocks += s.BLK ?? 0;
    });
    aiLineup.forEach(p => {
      const s = state.playerStats[p.id] || {};
      aiFTA += s.FTA ?? 0;
      aiFGM += s.FGM ?? 0;
      aiFGA += s.FGA ?? 0;
      ai3PM += s.threeMade ?? 0;
      ai3PA += s.threeAttempted ?? 0;
      aiTurnovers += s.TOV ?? 0;
      aiSteals += s.STL ?? 0;
      aiBlocks += s.BLK ?? 0;
    });

    const userStaminaEnd: Record<string, number> = {};
    const aiStaminaEnd: Record<string, number> = {};
    userLineup.forEach(p => userStaminaEnd[p.id] = state.playerStamina[p.id] ?? 100);
    aiLineup.forEach(p => aiStaminaEnd[p.id] = state.playerStamina[p.id] ?? 100);

    matchesMetrics.push({
      combinedScore: state.userScore + state.aiScore,
      userScore: state.userScore,
      aiScore: state.aiScore,
      userFTA,
      aiFTA,
      userFGM,
      userFGA,
      aiFGM,
      aiFGA,
      user3PM,
      user3PA,
      ai3PM,
      ai3PA,
      userPaintAtt,
      userPaintFGM,
      aiPaintAtt,
      aiPaintFGM,
      userTurnovers,
      aiTurnovers,
      userSteals,
      aiSteals,
      userBlocks,
      aiBlocks,

      shadowGuardTriggers,
      focusLockTriggers,
      disciplineWallTriggers,
      handsActiveTriggers,
      tempoSwitchTriggers,
      enforcerLiftTriggers,
      futureCoreTriggers,

      fourPointBaitTriggers,
      redDotTriggers,
      flopTriggers,
      composureTriggers,
      cleanContestTriggers,
      defensiveAnchorTriggers,
      timeoutResetTriggers,
      glassStrikeTriggers,
      contactTaxTriggers,
      lungBurnerTriggers,
      deadAirTriggers,
      skyWallTriggers,
      rimWardenTriggers,
      paintBarrierTriggers,
      ironMotorTriggers,

      marksAdded: { ...marksAdded },
      marksCleansed,

      userStamina: userStaminaEnd,
      aiStamina: aiStaminaEnd,
      userAvgStaminaByQuarter,
      aiAvgStaminaByQuarter
    });
  }

  return matchesMetrics;
}

function computeAverages(metrics: ScenarioMetrics[]) {
  const count = metrics.length;
  const sum: any = {};

  metrics.forEach(m => {
    Object.keys(m).forEach(k => {
      if (typeof (m as any)[k] === "number") {
        sum[k] = (sum[k] ?? 0) + (m as any)[k];
      }
    });
  });

  const avg: any = {};
  Object.keys(sum).forEach(k => {
    avg[k] = sum[k] / count;
  });

  // Average marks maps
  const marksSum: Record<string, number> = {};
  metrics.forEach(m => {
    Object.entries(m.marksAdded).forEach(([mark, val]) => {
      marksSum[mark] = (marksSum[mark] ?? 0) + val;
    });
  });
  avg.marksAdded = {};
  Object.entries(marksSum).forEach(([mark, val]) => {
    avg.marksAdded[mark] = val / count;
  });

  // Average stamina maps
  const avgQMap = (key: "userAvgStaminaByQuarter" | "aiAvgStaminaByQuarter") => {
    const qSum: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    metrics.forEach(m => {
      const map = m[key];
      for (let q = 1; q <= 4; q++) {
        qSum[q] += map[q] ?? 100;
      }
    });
    const qAvg: Record<number, number> = {};
    for (let q = 1; q <= 4; q++) {
      qAvg[q] = qSum[q] / count;
    }
    return qAvg;
  };

  avg.userAvgStaminaByQuarter = avgQMap("userAvgStaminaByQuarter");
  avg.aiAvgStaminaByQuarter = avgQMap("aiAvgStaminaByQuarter");

  return avg as ScenarioMetrics;
}

// Rosters Definitions
// 1. Balanced: no active archetypes (None)
const makeBalancedLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 88, ["Tempo Surgeon", "None", "None"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 88, ["Arc Pressure", "None", "None"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 88, ["Paint Magnet", "None", "None"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Rare", 88, ["Hands Active", "None", "None"]),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Rare", 88, ["Rim Warden", "None", "None"])
];

// 2. Anti-Meta / Gameplan Lineup (Lv.3 Gold)
const makeAntiMetaLineup = (prefix: string, addDeadAir = false) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Epic", 88, ["Complete Engine", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Epic", 88, ["Focus Lock", "Discipline Wall", "Shadow Guard"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Epic", 88, ["Shadow Guard", "Screen Breaker", "Position Flex"], addDeadAir ? ["Dead Air X"] : []),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Epic", 88, ["Screen Breaker", "Future Core", "None"]),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Epic", 88, ["None", "None", "None"])
];

// 3. Deep Strike / Shooting Lineup (Lv.3 Gold + Red Dot X + Four-Point Bait X)
const makeShootingLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Legendary", 88, ["Tempo Surgeon", "Complete Engine", "Connector Hub"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Legendary", 88, ["Arc Pressure", "Tempo Switch", "Mismatch Caller"], ["Red Dot X"], {}, { "Red Dot X": "Legendary" }),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Legendary", 88, ["Arc Pressure", "Position Flex", "Mismatch Caller"], ["Four-Point Bait X"], {}, { "Four-Point Bait X": "Legendary" }),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Complete Engine", "Connector Hub", "None"]),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Rare", 88, ["None", "None", "None"])
];

// 4. Foul-Draw / Flop Lineup (Lv.3 Gold + Flop X)
const makeFoulDrawLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Legendary", 88, ["Tempo Surgeon", "Complete Engine", "Focus Lock"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Legendary", 88, ["Foul Magnet", "Mismatch Caller", "Focus Lock"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Legendary", 88, ["Foul Magnet", "Mismatch Caller", "Paint Magnet"], ["Flop X"], {}, { "Flop X": "Legendary" }),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Paint Magnet", "Complete Engine"]),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Rare", 88, ["Power Driver", "None", "None"])
];

// 5. Stamina Drain Lineup (Lv.3 Gold + Defensive Anchor)
const makeStaminaDrainLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Legendary", 88, ["Screen Breaker", "Hands Active", "Focus Lock"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Legendary", 88, ["Shadow Guard", "Discipline Wall", "Focus Lock"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Legendary", 88, ["Shadow Guard", "Discipline Wall", "Screen Breaker"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Paint Magnet", "Iron Motor"], ["DEFENSIVE_ANCHOR"], {}, { "DEFENSIVE_ANCHOR": "Legendary" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Iron Motor", "Enforcer Lift"])
];

// 6. Glass Bully / Rebound Lineup (Lv.3 Gold + GLASS_STRIKE)
const makeGlassBullyLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Legendary", 88, ["Glass Touch", "Paint Barrier", "Paint Magnet"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Legendary", 88, ["Glass Touch", "Paint Barrier", "Paint Magnet"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Legendary", 88, ["Power Driver", "Rim Warden", "Iron Motor"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Rim Warden", "Enforcer Lift"]),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Rim Warden", "Iron Motor"], ["GLASS_STRIKE"], {}, { "GLASS_STRIKE": "Legendary" })
];

// 7. Paint Bully Lineup (Lv.3 Gold + Contact Tax X + Lung Burner X)
const makePaintBullyLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Legendary", 88, ["Paint Magnet", "Mismatch Caller", "Glass Touch"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Legendary", 88, ["Paint Magnet", "Mismatch Caller", "Glass Touch"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Legendary", 88, ["Power Driver", "Rim Warden", "Iron Motor"], ["Contact Tax X"], {}, { "Contact Tax X": "Legendary" }),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Rim Warden", "Enforcer Lift"], ["Lung Burner X"], {}, { "Lung Burner X": "Legendary" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Rim Warden", "Iron Motor"])
];

// 8. Gold Hybrid Team (Stacks Shooting + Paint Bully + playmaking + enhancers)
const makeHybridLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Legendary", 88, ["Tempo Surgeon", "Complete Engine", "Focus Lock"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Legendary", 88, ["Arc Pressure", "Foul Magnet", "Mismatch Caller"], ["Red Dot X"], {}, { "Red Dot X": "Legendary" }),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Legendary", 88, ["Paint Magnet", "Power Driver", "Mismatch Caller"], ["Four-Point Bait X"], {}, { "Four-Point Bait X": "Legendary" }),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Rim Warden", "Iron Motor"], ["Contact Tax X"], {}, { "Contact Tax X": "Legendary" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Rim Warden", "Enforcer Lift"], ["Lung Burner X"], {}, { "Lung Burner X": "Legendary" })
];

function printReportHeader(title: string) {
  console.log(`\n==================================================`);
  console.log(`SCENARIO: ${title}`);
  console.log(`==================================================`);
}

function printStats(avg: ScenarioMetrics) {
  console.log(`Average Combined Score: ${avg.combinedScore.toFixed(1)} (User ${avg.userScore.toFixed(1)} - ${avg.aiScore.toFixed(1)} AI)`);
  console.log(`Team FG%: User ${((avg.userFGM / Math.max(1, avg.userFGA)) * 100).toFixed(1)}% | AI ${((avg.aiFGM / Math.max(1, avg.aiFGA)) * 100).toFixed(1)}%`);
  console.log(`Team 3PT%: User ${((avg.user3PM / Math.max(1, avg.user3PA)) * 100).toFixed(1)}% | AI ${((avg.ai3PM / Math.max(1, avg.ai3PA)) * 100).toFixed(1)}%`);
  console.log(`Paint Attempts per Game: User ${avg.userPaintAtt.toFixed(1)} | AI ${avg.aiPaintAtt.toFixed(1)}`);
  console.log(`Paint FG%: User ${(avg.userPaintAtt > 0 ? (avg.userPaintFGM / avg.userPaintAtt) * 100 : 0).toFixed(1)}% | AI ${(avg.aiPaintAtt > 0 ? (avg.aiPaintFGM / avg.aiPaintAtt) * 100 : 0).toFixed(1)}%`);
  console.log(`FTA per Game: User ${avg.userFTA.toFixed(1)} | AI ${avg.aiFTA.toFixed(1)}`);
  console.log(`Turnovers: User ${avg.userTurnovers.toFixed(1)} | AI ${avg.aiTurnovers.toFixed(1)}`);
  console.log(`Steals: User ${avg.userSteals.toFixed(1)} | AI ${avg.aiSteals.toFixed(1)}`);
  console.log(`Blocks: User ${avg.userBlocks.toFixed(1)} | AI ${avg.aiBlocks.toFixed(1)}`);

  console.log(`Stamina by Quarter (User Avg):`);
  for (let q = 1; q <= 4; q++) {
    console.log(`  - Q${q}: ${avg.userAvgStaminaByQuarter[q].toFixed(1)}%`);
  }
  console.log(`Stamina by Quarter (AI Avg):`);
  for (let q = 1; q <= 4; q++) {
    console.log(`  - Q${q}: ${avg.aiAvgStaminaByQuarter[q].toFixed(1)}%`);
  }

  console.log(`Anti-Meta Base Skill Triggers:`);
  console.log(`  - Shadow Guard: ${avg.shadowGuardTriggers.toFixed(2)}`);
  console.log(`  - Focus Lock: ${avg.focusLockTriggers.toFixed(2)}`);
  console.log(`  - Discipline Wall: ${avg.disciplineWallTriggers.toFixed(2)}`);
  console.log(`  - Hands Active: ${avg.handsActiveTriggers.toFixed(2)}`);
  console.log(`  - Tempo Switch: ${avg.tempoSwitchTriggers.toFixed(2)}`);
  console.log(`  - Enforcer Lift: ${avg.enforcerLiftTriggers.toFixed(2)}`);
  console.log(`  - Future Core: ${avg.futureCoreTriggers.toFixed(2)}`);

  console.log(`Other Enhancers & Special Triggers:`);
  console.log(`  - Four-Point Bait: ${avg.fourPointBaitTriggers.toFixed(2)}`);
  console.log(`  - Red Dot / Exposed: ${avg.redDotTriggers.toFixed(2)}`);
  console.log(`  - Flop: ${avg.flopTriggers.toFixed(2)}`);
  console.log(`  - Composure Shield: ${avg.composureTriggers.toFixed(2)}`);
  console.log(`  - Clean Challenge: ${avg.cleanContestTriggers.toFixed(2)}`);
  console.log(`  - Defensive Anchor: ${avg.defensiveAnchorTriggers.toFixed(2)}`);
  console.log(`  - Timeout Reset: ${avg.timeoutResetTriggers.toFixed(2)}`);
  console.log(`  - GLASS_STRIKE: ${avg.glassStrikeTriggers.toFixed(2)}`);
  console.log(`  - Contact Tax: ${avg.contactTaxTriggers.toFixed(2)}`);
  console.log(`  - Lung Burner: ${avg.lungBurnerTriggers.toFixed(2)}`);
  console.log(`  - Dead Air / GAMEPLAN_DEAD_AIR: ${avg.deadAirTriggers.toFixed(2)}`);
  console.log(`  - SKY_WALL: ${avg.skyWallTriggers.toFixed(2)}`);
  console.log(`  - Rim Warden: ${avg.rimWardenTriggers.toFixed(2)}`);
  console.log(`  - Paint Barrier: ${avg.paintBarrierTriggers.toFixed(2)}`);
  console.log(`  - Iron Motor: ${avg.ironMotorTriggers.toFixed(2)}`);

  console.log(`Marks Summary (Added / Cleansed):`);
  Object.entries(avg.marksAdded).forEach(([mark, val]) => {
    console.log(`  - ${mark}: ${val.toFixed(2)}`);
  });
  console.log(`  - Cleansed via removeOldestMark: ${avg.marksCleansed.toFixed(2)}`);

  // Guardrails Audit
  let hasWarnings = false;
  const combined = avg.combinedScore;
  if (combined < 185) {
    console.warn(`⚠️  WARNING: Scoring collapse detected! Combined score is under 185 at ${combined.toFixed(1)}`);
    hasWarnings = true;
  }
  if (avg.userFTA > 28 || avg.aiFTA > 28) {
    console.warn(`⚠️  WARNING: FTA exceeds safety warning limit (28)! User FTA: ${avg.userFTA.toFixed(1)} | AI FTA: ${avg.aiFTA.toFixed(1)}`);
    hasWarnings = true;
  }
  const user3PT = (avg.user3PM / Math.max(1, avg.user3PA)) * 100;
  const ai3PT = (avg.ai3PM / Math.max(1, avg.ai3PA)) * 100;
  if (user3PT > 38 || ai3PT > 38) {
    console.warn(`⚠️  WARNING: 3PT% exceeds safety limit (38%)! User 3PT%: ${user3PT.toFixed(1)}% | AI 3PT%: ${ai3PT.toFixed(1)}%`);
    hasWarnings = true;
  }
  if (avg.userTurnovers > 25 || avg.aiTurnovers > 25) {
    console.warn(`⚠️  WARNING: Turnover frequency is excessively high! User TOV: ${avg.userTurnovers.toFixed(1)} | AI TOV: ${avg.aiTurnovers.toFixed(1)}`);
    hasWarnings = true;
  }
  if (!hasWarnings) {
    console.log(`✅ All guardrail metrics within safe limits.`);
  }
}

async function run() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("ANTI-META / GAMEPLAN REGRESSION SIMULATOR");
  console.log("════════════════════════════════════════════════════════════════");
  console.log("30 matches per scenario. Audit-only simulation.\n");

  // 1. Scenario 1: Baseline Balanced vs Balanced
  {
    printReportHeader("1. Baseline Balanced vs Balanced");
    console.log("No archetype stacking on either side. Unlocks 0 archetypes.");
    resetScenarioCounters();
    const userLineup = makeBalancedLineup("u");
    const aiLineup = makeBalancedLineup("ai");
    const results = runMatches(userLineup, aiLineup);
    printStats(computeAverages(results));
  }

  // 2. Scenario 2: Anti-Meta vs Balanced
  {
    printReportHeader("2. Anti-Meta vs Balanced");
    console.log("User team uses Lv.3 Gold Anti-Meta. AI is Balanced.");
    resetScenarioCounters();
    const userLineup = makeAntiMetaLineup("u");
    const aiLineup = makeBalancedLineup("ai");
    const results = runMatches(userLineup, aiLineup);
    printStats(computeAverages(results));
  }

  // 3. Scenario 3: Anti-Meta vs Deep Strike / Shooting
  {
    printReportHeader("3. Anti-Meta vs Deep Strike / Shooting");
    console.log("User team uses Lv.3 Gold Anti-Meta. AI stacks Shooting (Lv.3 Gold + Red Dot + Four-Point Bait).");
    resetScenarioCounters();
    const userLineup = makeAntiMetaLineup("u");
    const aiLineup = makeShootingLineup("ai");
    const results = runMatches(userLineup, aiLineup);
    printStats(computeAverages(results));
  }

  // 4. Scenario 4: Anti-Meta vs Foul-Draw / Flop
  {
    printReportHeader("4. Anti-Meta vs Foul-Draw / Flop");
    console.log("User team uses Lv.3 Gold Anti-Meta. AI stacks Foul-Draw (Lv.3 Gold + Flop X).");
    resetScenarioCounters();
    const userLineup = makeAntiMetaLineup("u");
    const aiLineup = makeFoulDrawLineup("ai");
    const results = runMatches(userLineup, aiLineup);
    printStats(computeAverages(results));
  }

  // 5. Scenario 5: Anti-Meta vs Stamina Drain
  {
    printReportHeader("5. Anti-Meta vs Stamina Drain");
    console.log("User team uses Lv.3 Gold Anti-Meta. AI stacks Stamina Drain (Lv.3 Gold + Defensive Anchor).");
    resetScenarioCounters();
    const userLineup = makeAntiMetaLineup("u");
    const aiLineup = makeStaminaDrainLineup("ai");
    const results = runMatches(userLineup, aiLineup);
    printStats(computeAverages(results));
  }

  // 6. Scenario 6: Anti-Meta vs Glass Bully / Rebound
  {
    printReportHeader("6. Anti-Meta vs Glass Bully / Rebound");
    console.log("User team uses Lv.3 Gold Anti-Meta. AI stacks Glass Bully (Lv.3 Gold + GLASS_STRIKE).");
    resetScenarioCounters();
    const userLineup = makeAntiMetaLineup("u");
    const aiLineup = makeGlassBullyLineup("ai");
    const results = runMatches(userLineup, aiLineup);
    printStats(computeAverages(results));
  }

  // 7. Scenario 7: Anti-Meta vs Paint Bully
  {
    printReportHeader("7. Anti-Meta vs Paint Bully");
    console.log("User team uses Lv.3 Gold Anti-Meta. AI stacks Paint Bully (Lv.3 Gold + Contact Tax + Lung Burner).");
    resetScenarioCounters();
    const userLineup = makeAntiMetaLineup("u");
    const aiLineup = makePaintBullyLineup("ai");
    const results = runMatches(userLineup, aiLineup);
    printStats(computeAverages(results));
  }

  // 8. Scenario 8: Anti-Meta Mirror Match
  {
    printReportHeader("8. Anti-Meta Mirror Match");
    console.log("Both sides use Lv.3 Gold Anti-Meta. Checks for turnovers/scoring collapses.");
    resetScenarioCounters();
    const userLineup = makeAntiMetaLineup("u");
    const aiLineup = makeAntiMetaLineup("ai");
    const results = runMatches(userLineup, aiLineup);
    printStats(computeAverages(results));
  }

  // 9. Scenario 9: Dead Air X / GAMEPLAN_DEAD_AIR Watch
  {
    printReportHeader("9. Dead Air X / GAMEPLAN_DEAD_AIR Watch");
    console.log("User SF has legacy Dead Air X (maps to GAMEPLAN_DEAD_AIR). AI is Balanced.");
    resetScenarioCounters();
    const userLineup = makeAntiMetaLineup("u", true);
    const aiLineup = makeBalancedLineup("ai");
    const results = runMatches(userLineup, aiLineup);
    printStats(computeAverages(results));
  }

  // 10. Scenario 10: Stress: Gold Anti-Meta vs Gold Hybrid Team
  {
    printReportHeader("10. Stress: Gold Anti-Meta vs Gold Hybrid Team");
    console.log("User team uses Lv.3 Gold Anti-Meta. AI is a multi-archetype gold powerhouse.");
    resetScenarioCounters();
    const userLineup = makeAntiMetaLineup("u");
    const aiLineup = makeHybridLineup("ai");
    const results = runMatches(userLineup, aiLineup);
    printStats(computeAverages(results));
  }

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("ANTI-META / GAMEPLAN REGRESSION SIMULATOR RUN COMPLETE.");
  console.log("════════════════════════════════════════════════════════════════\n");
}

run().catch(console.error);
