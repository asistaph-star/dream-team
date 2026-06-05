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
let contactTaxRolls = 0;
let contactTaxTriggers = 0;
let lungBurnerRolls = 0;
let lungBurnerTriggers = 0;
let lungBurnerNormalDrains = 0;
let lungBurnerDebtDrains = 0;
let contactTaxStaminaDrained = 0;
let lungBurnerStaminaDrained = 0;
let flopRolls = 0;
let flopTriggers = 0;
let skyWallRolls = 0;
let skyWallTriggers = 0;
let ironMotorRolls = 0;
let ironMotorTriggers = 0;
let rimWardenRolls = 0;
let rimWardenTriggers = 0;

let activeMatchState: any = null;
let activeSkillDrainSource = "";

// Intercept rollSpecialMechanic to track rolls and identify active drain source
mockedResolver.rollSpecialMechanic = (lineup: Player[], mechanicId: any, stamina: Record<string, number>, scaleFn?: any): boolean => {
  const result = originalResolver.rollSpecialMechanic(lineup, mechanicId, stamina, scaleFn);
  
  if (mechanicId === "POSTER_SPARK_TILT") {
    contactTaxRolls++;
    if (result) {
      contactTaxTriggers++;
      activeSkillDrainSource = "Contact Tax";
    }
  } else if (mechanicId === "POSTER_SPARK_TILT") {
    lungBurnerRolls++;
    if (result) {
      lungBurnerTriggers++;
      activeSkillDrainSource = "Lung Burner";
    }
  } else if (mechanicId === "FLOP_PRESSURE") {
    flopRolls++;
    if (result) {
      flopTriggers++;
    }
  } else if (mechanicId === "SKY_WALL_BLOCK_BOOST") {
    skyWallRolls++;
    if (result) {
      skyWallTriggers++;
    }
  }
  
  return result;
};

// Intercept rollBaseSkill to track Iron Motor and Rim Warden
mockedResolver.rollBaseSkill = (lineup: Player[], skillName: any, stamina: Record<string, number>, rateOverride?: number): boolean => {
  const result = originalResolver.rollBaseSkill(lineup, skillName, stamina, rateOverride);
  
  if (skillName === "Iron Motor") {
    ironMotorRolls++;
    if (result) {
      ironMotorTriggers++;
    }
  } else if (skillName === "Rim Warden") {
    rimWardenRolls++;
    if (result) {
      rimWardenTriggers++;
    }
  }
  
  return result;
};

// Intercept drainStamina to attribute and count exact drain
mockedResolver.drainStamina = (stamina: Record<string, number>, target: Player, targetLineup: Player[], amount: number): number => {
  const actual = originalResolver.drainStamina(stamina, target, targetLineup, amount);
  
  if (activeSkillDrainSource === "Contact Tax") {
    contactTaxStaminaDrained += actual;
    activeSkillDrainSource = ""; // Reset
  } else if (activeSkillDrainSource === "Lung Burner") {
    lungBurnerStaminaDrained += actual;
    if (activeMatchState) {
      const hadDebt = originalResolver.hasMark(activeMatchState.skillMarks, target.id, "Hooked");
      if (hadDebt) {
        lungBurnerDebtDrains++;
      } else {
        lungBurnerNormalDrains++;
      }
    } else {
      lungBurnerNormalDrains++;
    }
    activeSkillDrainSource = ""; // Reset
  }
  
  return actual;
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

// Helper to reset tick tracking flags
function resetTickFlags() {
  activeTickAttempts = [];
}

// Reset scenario tracking counters
function resetScenarioCounters() {
  contactTaxRolls = 0;
  contactTaxTriggers = 0;
  lungBurnerRolls = 0;
  lungBurnerTriggers = 0;
  lungBurnerNormalDrains = 0;
  lungBurnerDebtDrains = 0;
  contactTaxStaminaDrained = 0;
  lungBurnerStaminaDrained = 0;
  flopRolls = 0;
  flopTriggers = 0;
  skyWallRolls = 0;
  skyWallTriggers = 0;
  ironMotorRolls = 0;
  ironMotorTriggers = 0;
  rimWardenRolls = 0;
  rimWardenTriggers = 0;

  activeSkillDrainSource = "";
  allScenarioAttempts = [];
}

// Clone helper for player stats
function cloneStats(stats: any) {
  return JSON.parse(JSON.stringify(stats));
}

// Mock player creator
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

// Combined metrics structure
interface ScenarioMetrics {
  combinedScore: number;
  userScore: number;
  aiScore: number;
  userFTA: number;
  aiFTA: number;
  userPaintAtt: number;
  userPaintFGM: number;
  aiPaintAtt: number;
  aiPaintFGM: number;
  
  contactTaxRolls: number;
  contactTaxTriggers: number;
  tiltedCount: number;
  
  lungBurnerRolls: number;
  lungBurnerTriggers: number;
  lungBurnerNormalDrains: number;
  lungBurnerDebtDrains: number;
  
  contactTaxStaminaDrained: number;
  lungBurnerStaminaDrained: number;
  zeroStaminaEvents: number;
  
  // End of game stamina
  userPFStamina: number;
  userCStamina: number;
  aiPFStamina: number;
  aiCStamina: number;
  
  // Stamina by quarter (end of quarter records)
  pfStaminaByQuarter: Record<number, number>; // User PF
  cStaminaByQuarter: Record<number, number>; // User C
  aiPFStaminaByQuarter: Record<number, number>;
  aiCStaminaByQuarter: Record<number, number>;
  
  lowestDefenderStaminaByQuarter: Record<number, number>;
  
  flopTriggers: number;
  debtMarkInteractions: number;
  ironMotorTriggers: number;
  composureCancels: number;
  cleanContests: number;
  skyWallTriggers: number;
  rimWardenTriggers: number;
}

// Run matches simulation loop
function runMatches(
  userLineup: Player[],
  aiLineup: Player[],
  scenarioId: number,
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
    allUserRoster.forEach(p => {
      state.playerStamina[p.id] = 100;
    });
    aiLineup.forEach(p => {
      state.playerStamina[p.id] = 100;
    });

    let ticks = 0;
    let halftimeTriggered = false;

    // Local match-level counts
    let userPaintAtt = 0, userPaintFGM = 0;
    let aiPaintAtt = 0, aiPaintFGM = 0;
    let userFTA = 0, aiFTA = 0;
    let userTiltedCount = 0, aiTiltedCount = 0;
    let zeroStaminaEvents = 0;
    let composureCancels = 0;
    let cleanContests = 0;
    let debtMarkInteractions = 0;

    const pfStaminaByQuarter: Record<number, number> = { 1: 100, 2: 100, 3: 100, 4: 100 };
    const cStaminaByQuarter: Record<number, number> = { 1: 100, 2: 100, 3: 100, 4: 100 };
    const aiPFStaminaByQuarter: Record<number, number> = { 1: 100, 2: 100, 3: 100, 4: 100 };
    const aiCStaminaByQuarter: Record<number, number> = { 1: 100, 2: 100, 3: 100, 4: 100 };
    const lowestDefenderStaminaByQuarter: Record<number, number> = { 1: 100, 2: 100, 3: 100, 4: 100 };

    // Capture starting metrics inside activeMatchState
    activeMatchState = state;

    while (!state.isFinished && ticks < 400) {
      // Halftime replenishment
      if (state.halftimeShown && !halftimeTriggered) {
        halftimeTriggered = true;
        allUserRoster.forEach(p => {
          state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30);
        });
        aiLineup.forEach(p => {
          state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30);
        });
      }

      // Scenario 5: Force Debt marks on AI defenders on every tick to stress Lung Burner Debt Drains
      if (scenarioId === 5) {
        aiLineup.forEach(p => {
          state.skillMarks[p.id] = [{ mark: "Hooked", possessionsLeft: 3, sourceSkill: "Debt Injector" }];
        });
      }

      // Track how many players have Debt mark before tick
      aiLineup.forEach(p => {
        if (originalResolver.hasMark(state.skillMarks, p.id, "Hooked")) {
          debtMarkInteractions++;
        }
      });
      userLineup.forEach(p => {
        if (originalResolver.hasMark(state.skillMarks, p.id, "Hooked")) {
          debtMarkInteractions++;
        }
      });

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;

      // Capture pre-tick stamina for zeroing events
      resetTickFlags();
      const preStamina: Record<string, number> = {};
      userLineup.forEach(p => preStamina[p.id] = state.playerStamina[p.id] ?? 100);
      aiLineup.forEach(p => preStamina[p.id] = state.playerStamina[p.id] ?? 100);

      const preStats = cloneStats(state.playerStats);
      const preEventsLen = state.events.length;

      // Execute Tick
      activeMatchState = state;
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      activeMatchState = state;
      ticks++;

      const newEvents = state.events.slice(preEventsLen);
      const postStats = state.playerStats;

      // Identify zero-stamina transitions
      userLineup.forEach(p => {
        const post = state.playerStamina[p.id] ?? 0;
        if (preStamina[p.id] > 0 && post <= 0) {
          zeroStaminaEvents++;
        }
      });
      aiLineup.forEach(p => {
        const post = state.playerStamina[p.id] ?? 0;
        if (preStamina[p.id] > 0 && post <= 0) {
          zeroStaminaEvents++;
        }
      });

      // Parse close-range attempts
      activeTickAttempts.forEach(att => {
        const isUser = userLineup.some(p => p.id === att.playerId);
        const type = att.shotType;
        if (!CLOSE_RANGE_SHOTS.includes(type)) return;

        // Check if make or miss
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

      // Scan new events for mark logs, fouls, and counters
      newEvents.forEach((e: any) => {
        const text = e.text || "";
        if (text.includes("tilts") || text.includes("Tilted")) {
          if (e.isUserTeam) userTiltedCount++;
          else aiTiltedCount++;
        }
        if (text.includes("Composure X cancels")) {
          composureCancels++;
        }
        if (text.includes("Clean Contest X reduces") || text.includes("Clean Challenge reduces")) {
          cleanContests++;
        }
      });

      // Record quarter stamina profiles
      const q = state.quarter;
      if (q >= 1 && q <= 4) {
        pfStaminaByQuarter[q] = state.playerStamina[userLineup[3].id] ?? 100;
        cStaminaByQuarter[q] = state.playerStamina[userLineup[4].id] ?? 100;
        aiPFStaminaByQuarter[q] = state.playerStamina[aiLineup[3].id] ?? 100;
        aiCStaminaByQuarter[q] = state.playerStamina[aiLineup[4].id] ?? 100;

        // Track lowest defender stamina
        const userMin = Math.min(...userLineup.map(p => state.playerStamina[p.id] ?? 100));
        const aiMin = Math.min(...aiLineup.map(p => state.playerStamina[p.id] ?? 100));
        lowestDefenderStaminaByQuarter[q] = Math.min(lowestDefenderStaminaByQuarter[q], userMin, aiMin);
      }
    }

    // Accumulate total FTAs
    userLineup.forEach(p => {
      const s = state.playerStats[p.id] || {};
      userFTA += s.FTA ?? 0;
    });
    aiLineup.forEach(p => {
      const s = state.playerStats[p.id] || {};
      aiFTA += s.FTA ?? 0;
    });

    matchesMetrics.push({
      combinedScore: state.userScore + state.aiScore,
      userScore: state.userScore,
      aiScore: state.aiScore,
      userFTA,
      aiFTA,
      userPaintAtt,
      userPaintFGM,
      aiPaintAtt,
      aiPaintFGM,
      contactTaxRolls,
      contactTaxTriggers,
      tiltedCount: userTiltedCount + aiTiltedCount,
      lungBurnerRolls,
      lungBurnerTriggers,
      lungBurnerNormalDrains,
      lungBurnerDebtDrains,
      contactTaxStaminaDrained,
      lungBurnerStaminaDrained,
      zeroStaminaEvents,
      userPFStamina: state.playerStamina[userLineup[3].id] ?? 0,
      userCStamina: state.playerStamina[userLineup[4].id] ?? 0,
      aiPFStamina: state.playerStamina[aiLineup[3].id] ?? 0,
      aiCStamina: state.playerStamina[aiLineup[4].id] ?? 0,
      
      pfStaminaByQuarter,
      cStaminaByQuarter,
      aiPFStaminaByQuarter,
      aiCStaminaByQuarter,
      lowestDefenderStaminaByQuarter,
      
      flopTriggers,
      debtMarkInteractions,
      ironMotorTriggers,
      composureCancels,
      cleanContests,
      skyWallTriggers,
      rimWardenTriggers
    });
  }

  activeMatchState = null;
  return matchesMetrics;
}

// Compute averages across metrics array
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

  // Average the quarter maps
  const avgQMap = (key: "pfStaminaByQuarter" | "cStaminaByQuarter" | "aiPFStaminaByQuarter" | "aiCStaminaByQuarter" | "lowestDefenderStaminaByQuarter") => {
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

  avg.pfStaminaByQuarter = avgQMap("pfStaminaByQuarter");
  avg.cStaminaByQuarter = avgQMap("cStaminaByQuarter");
  avg.aiPFStaminaByQuarter = avgQMap("aiPFStaminaByQuarter");
  avg.aiCStaminaByQuarter = avgQMap("aiCStaminaByQuarter");
  avg.lowestDefenderStaminaByQuarter = avgQMap("lowestDefenderStaminaByQuarter");

  return avg as ScenarioMetrics;
}

// Roster definitions
const makeGenericLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Rare", 84, ["Paint Barrier", "Iron Motor", "Enforcer Lift"], [], { strength: 80, finishing: 80, rebound: 80, block: 75 }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Rare", 84, ["Paint Barrier", "Iron Motor", "Enforcer Lift"], [], { strength: 82, finishing: 82, rebound: 82, block: 80 })
];

const makeContactTaxLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Paint Magnet", "Iron Motor"], ["Contact Tax X"], { strength: 94, finishing: 92 }, { "Contact Tax X": "Legendary" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Rare", 84, ["Paint Barrier", "Iron Motor", "Enforcer Lift"], [], { strength: 82, finishing: 82 })
];

const makeLungBurnerLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Rare", 84, ["Paint Magnet", "Iron Motor", "Enforcer Lift"], [], { strength: 80, finishing: 80 }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Paint Magnet", "Iron Motor"], ["Lung Burner X"], { strength: 96, finishing: 94 }, { "Lung Burner X": "Legendary" })
];

const makeComboLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Paint Magnet", "Iron Motor"], ["Contact Tax X"], { strength: 94, finishing: 92 }, { "Contact Tax X": "Legendary" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Paint Magnet", "Iron Motor"], ["Lung Burner X"], { strength: 96, finishing: 94 }, { "Lung Burner X": "Legendary" })
];

const makePaintBullyHeavyLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Paint Magnet", "Iron Motor"], ["Contact Tax X"], { strength: 95, finishing: 95 }, { "Contact Tax X": "Legendary" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Paint Magnet", "Mismatch Caller"], ["Lung Burner X"], { strength: 98, finishing: 98 }, { "Lung Burner X": "Legendary" })
];

const makeFoulDrawOverlapLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Foul Magnet", "Paint Magnet"], ["Contact Tax X"], { strength: 92, finishing: 92 }, { "Contact Tax X": "Epic" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Foul Magnet", "Paint Magnet"], ["Flop X"], { strength: 94, finishing: 94 }, { "Flop X": "Legendary" })
];

const makeCounterDefenseLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Rim Warden", "Paint Barrier", "Iron Motor"], ["CLEAN_CHALLENGE", "COMPOSURE_SHIELD"], { strength: 94, defense: 92, block: 92 }, { "CLEAN_CHALLENGE": "Legendary", "COMPOSURE_SHIELD": "Legendary" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Rim Warden", "Paint Barrier", "Iron Motor"], ["CLEAN_CHALLENGE", "SKY_WALL"], { strength: 96, defense: 95, block: 95 }, { "CLEAN_CHALLENGE": "Legendary", "SKY_WALL": "Legendary" })
];

// Display helpers
function printReportHeader(title: string) {
  console.log(`\n==================================================`);
  console.log(`SCENARIO: ${title}`);
  console.log(`==================================================`);
}

function printStats(avg: ScenarioMetrics) {
  console.log(`Average Combined Score: ${avg.combinedScore.toFixed(1)} (User ${avg.userScore.toFixed(1)} - ${avg.aiScore.toFixed(1)} AI)`);
  console.log(`Paint Attempts per Game: User ${avg.userPaintAtt.toFixed(1)} | AI ${avg.aiPaintAtt.toFixed(1)}`);
  console.log(`Paint FG%: User ${(avg.userPaintAtt > 0 ? (avg.userPaintFGM / avg.userPaintAtt) * 100 : 0).toFixed(1)}% | AI ${(avg.aiPaintAtt > 0 ? (avg.aiPaintFGM / avg.aiPaintAtt) * 100 : 0).toFixed(1)}%`);
  console.log(`FTA per Game: User ${avg.userFTA.toFixed(1)} | AI ${avg.aiFTA.toFixed(1)}`);
  console.log(`Contact Tax: ${avg.contactTaxTriggers.toFixed(2)} triggers | Total Stamina Drained: ${avg.contactTaxStaminaDrained.toFixed(1)}`);
  console.log(`Lung Burner: ${avg.lungBurnerTriggers.toFixed(2)} triggers | Normal Drains: ${avg.lungBurnerNormalDrains.toFixed(2)} | Debt Drains: ${avg.lungBurnerDebtDrains.toFixed(2)}`);
  console.log(`Total Stamina Drained by Lung Burner: ${avg.lungBurnerStaminaDrained.toFixed(1)}`);
  console.log(`Zero-Stamina Events (Stamina hit <= 0): ${avg.zeroStaminaEvents.toFixed(2)} per game`);
  console.log(`Tilted Mark count: ${avg.tiltedCount.toFixed(2)}`);
  
  console.log(`End-of-Game Stamina:`);
  console.log(`  - User: PF ${avg.userPFStamina.toFixed(1)}% | C ${avg.userCStamina.toFixed(1)}%`);
  console.log(`  - AI:   PF ${avg.aiPFStamina.toFixed(1)}%  | C ${avg.aiCStamina.toFixed(1)}%`);
  
  console.log(`PF/C Stamina by Quarter (User):`);
  for (let q = 1; q <= 4; q++) {
    console.log(`  - Q${q}: PF ${avg.pfStaminaByQuarter[q].toFixed(1)}% | C ${avg.cStaminaByQuarter[q].toFixed(1)}%`);
  }
  console.log(`PF/C Stamina by Quarter (AI):`);
  for (let q = 1; q <= 4; q++) {
    console.log(`  - Q${q}: PF ${avg.aiPFStaminaByQuarter[q].toFixed(1)}% | C ${avg.aiCStaminaByQuarter[q].toFixed(1)}%`);
  }
  console.log(`Lowest Defender Stamina by Quarter:`);
  for (let q = 1; q <= 4; q++) {
    console.log(`  - Q${q}: ${avg.lowestDefenderStaminaByQuarter[q].toFixed(1)}%`);
  }

  console.log(`Key Skill Triggers:`);
  console.log(`  - Flop X: ${avg.flopTriggers.toFixed(2)}`);
  console.log(`  - Iron Motor: ${avg.ironMotorTriggers.toFixed(2)}`);
  console.log(`  - Composure Cancels: ${avg.composureCancels.toFixed(2)}`);
  console.log(`  - Clean Challenge Contests: ${avg.cleanContests.toFixed(2)}`);
  console.log(`  - SKY_WALL Rim Pressure: ${avg.skyWallTriggers.toFixed(2)}`);
  console.log(`  - Rim Warden: ${avg.rimWardenTriggers.toFixed(2)}`);
  console.log(`  - Debt Mark Interactions: ${avg.debtMarkInteractions.toFixed(2)}`);

  // Assert Guardrails
  let hasWarnings = false;
  if (avg.combinedScore > 230) {
    console.warn(`⚠️  WARNING: Combined score exceeds target range (190-225) at ${avg.combinedScore.toFixed(1)}`);
    hasWarnings = true;
  }
  if (avg.userFTA > 28) {
    console.warn(`⚠️  WARNING: User FTA exceeds safety limit (28) at ${avg.userFTA.toFixed(1)}`);
    hasWarnings = true;
  }
  if (avg.aiFTA > 28) {
    console.warn(`⚠️  WARNING: AI FTA exceeds safety limit (28) at ${avg.aiFTA.toFixed(1)}`);
    hasWarnings = true;
  }
  if (!hasWarnings) {
    console.log(`✅ All guardrail metrics within safe limits.`);
  }
}

async function run() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("CONTACT TAX / LUNG BURNER REGRESSION SIMULATOR");
  console.log("════════════════════════════════════════════════════════════════");
  console.log("30 matches per scenario. Audit-only simulation.\n");

  const genericAI = () => makeGenericLineup("ai");

  // 1. Scenario 1: Baseline / No Legacy Skills
  {
    printReportHeader("1. Baseline / No Legacy Skills");
    console.log("Normal paint lineup. No Contact Tax X or Lung Burner X on either side.");
    resetScenarioCounters();
    const userLineup = makeGenericLineup("u");
    const aiLineup = genericAI();
    const results = runMatches(userLineup, aiLineup, 1);
    printStats(computeAverages(results));
  }

  // 2. Scenario 2: Contact Tax Only
  {
    printReportHeader("2. Contact Tax Only");
    console.log("User lineup has Contact Tax X (PF). No Lung Burner X.");
    resetScenarioCounters();
    const userLineup = makeContactTaxLineup("u");
    const aiLineup = genericAI();
    const results = runMatches(userLineup, aiLineup, 2);
    printStats(computeAverages(results));
  }

  // 3. Scenario 3: Lung Burner Only
  {
    printReportHeader("3. Lung Burner Only");
    console.log("User lineup has Lung Burner X (C). No Contact Tax X.");
    resetScenarioCounters();
    const userLineup = makeLungBurnerLineup("u");
    const aiLineup = genericAI();
    const results = runMatches(userLineup, aiLineup, 3);
    printStats(computeAverages(results));
  }

  // 4. Scenario 4: Contact Tax + Lung Burner Combo
  {
    printReportHeader("4. Contact Tax + Lung Burner Combo");
    console.log("User stacks Contact Tax X (PF) and Lung Burner X (C). Checks synergy and collapse speed.");
    resetScenarioCounters();
    const userLineup = makeComboLineup("u");
    const aiLineup = genericAI();
    const results = runMatches(userLineup, aiLineup, 4);
    printStats(computeAverages(results));
  }

  // 5. Scenario 5: Debt Stress
  {
    printReportHeader("5. Debt Stress");
    console.log("Forced Debt marks on AI defenders. Measures 190-drain Lung Burner cases.");
    resetScenarioCounters();
    const userLineup = makeComboLineup("u");
    const aiLineup = genericAI();
    const results = runMatches(userLineup, aiLineup, 5);
    printStats(computeAverages(results));
  }

  // 6. Scenario 6: Paint Bully Heavy + Contact/Lung
  {
    printReportHeader("6. Paint Bully Heavy + Contact/Lung");
    console.log("Paint Bully Heavy lineup stacks Power Driver / Paint Magnet + Contact Tax / Lung Burner.");
    resetScenarioCounters();
    const userLineup = makePaintBullyHeavyLineup("u");
    const aiLineup = genericAI();
    const results = runMatches(userLineup, aiLineup, 6);
    printStats(computeAverages(results));
  }

  // 7. Scenario 7: Foul-Draw Overlap
  {
    printReportHeader("7. Foul-Draw Overlap");
    console.log("User stacks Contact Tax X + Flop X / Foul-Draw tools.");
    resetScenarioCounters();
    const userLineup = makeFoulDrawOverlapLineup("u");
    const aiLineup = genericAI();
    const results = runMatches(userLineup, aiLineup, 7);
    printStats(computeAverages(results));
  }

  // 8. Scenario 8: Counter Defense
  {
    printReportHeader("8. Counter Defense");
    console.log("AI defense has Rim Warden, SKY_WALL, Composure Shield, Clean Challenge, and Iron Motor.");
    resetScenarioCounters();
    const userLineup = makeComboLineup("u");
    const aiLineup = makeCounterDefenseLineup("ai");
    const results = runMatches(userLineup, aiLineup, 8);
    printStats(computeAverages(results));
  }

  // 9. Scenario 9: User/AI Symmetry Watch
  {
    printReportHeader("9. User/AI Symmetry Watch");
    console.log("Identical Contact Tax / Lung Burner lineups on both sides.");
    resetScenarioCounters();
    const userLineup = makeComboLineup("u");
    const aiLineup = makeComboLineup("ai");
    const results = runMatches(userLineup, aiLineup, 9);
    printStats(computeAverages(results));
  }

  console.log(`\n════════════════════════════════════════════════════════════════`);
  console.log(`CONTACT TAX / LUNG BURNER REGRESSION Baseline RUN COMPLETE.`);
  console.log(`════════════════════════════════════════════════════════════════\n`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
