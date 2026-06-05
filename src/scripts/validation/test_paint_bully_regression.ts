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

// Global counts for skill rolls and triggers
let powerDriverRolls = 0;
let powerDriverTriggers = 0;
let paintMagnetRolls = 0;
let paintMagnetTriggers = 0;
let mismatchCallerRolls = 0;
let mismatchCallerTriggers = 0;
let rimWardenRolls = 0;
let rimWardenTriggers = 0;
let ironMotorRolls = 0;
let ironMotorTriggers = 0;
let enforcerLiftRolls = 0;
let enforcerLiftTriggers = 0;

let contactTaxRolls = 0;
let contactTaxTriggers = 0;
let lungBurnerRolls = 0;
let lungBurnerTriggers = 0;
let skyWallRolls = 0;
let skyWallTriggers = 0;
let glassStrikeRolls = 0;
let glassStrikeTriggers = 0;
let flopRolls = 0;
let flopTriggers = 0;

// Intercept base skill rolls
mockedResolver.rollBaseSkill = (lineup: Player[], skillName: any, stamina: Record<string, number>): boolean => {
  const result = originalResolver.rollBaseSkill(lineup, skillName, stamina);
  if (skillName === "Power Driver") {
    powerDriverRolls++;
    if (result) powerDriverTriggers++;
  } else if (skillName === "Paint Magnet") {
    paintMagnetRolls++;
    if (result) paintMagnetTriggers++;
  } else if (skillName === "Mismatch Caller") {
    mismatchCallerRolls++;
    if (result) mismatchCallerTriggers++;
  } else if (skillName === "Rim Warden") {
    rimWardenRolls++;
    if (result) rimWardenTriggers++;
  } else if (skillName === "Iron Motor") {
    ironMotorRolls++;
    if (result) ironMotorTriggers++;
  } else if (skillName === "Enforcer Lift") {
    enforcerLiftRolls++;
    if (result) enforcerLiftTriggers++;
  }
  return result;
};

// Intercept special mechanic rolls
mockedResolver.rollSpecialMechanic = (lineup: Player[], mechanicId: any, stamina: Record<string, number>, scaleFn?: any): boolean => {
  const result = originalResolver.rollSpecialMechanic(lineup, mechanicId, stamina, scaleFn);
  if (mechanicId === "POSTER_SPARK_TILT") {
    contactTaxRolls++;
    if (result) contactTaxTriggers++;
  } else if (mechanicId === "POSTER_SPARK_TILT") {
    lungBurnerRolls++;
    if (result) lungBurnerTriggers++;
  } else if (mechanicId === "SKY_WALL_BLOCK_BOOST") {
    skyWallRolls++;
    if (result) skyWallTriggers++;
  } else if (mechanicId === "GLASS_STRIKE_REBOUND") {
    glassStrikeRolls++;
    if (result) glassStrikeTriggers++;
  } else if (mechanicId === "FLOP_PRESSURE") {
    flopRolls++;
    if (result) flopTriggers++;
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
const { simulateTick, createInitialMatchState, computeEffective } = matchEngine;
const { resolveLineupArchetypes } = require("../../lib/lineup/lineupArchetypeResolver");

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
  powerDriverRolls = 0;
  powerDriverTriggers = 0;
  paintMagnetRolls = 0;
  paintMagnetTriggers = 0;
  mismatchCallerRolls = 0;
  mismatchCallerTriggers = 0;
  rimWardenRolls = 0;
  rimWardenTriggers = 0;
  ironMotorRolls = 0;
  ironMotorTriggers = 0;
  enforcerLiftRolls = 0;
  enforcerLiftTriggers = 0;

  contactTaxRolls = 0;
  contactTaxTriggers = 0;
  lungBurnerRolls = 0;
  lungBurnerTriggers = 0;
  skyWallRolls = 0;
  skyWallTriggers = 0;
  glassStrikeRolls = 0;
  glassStrikeTriggers = 0;
  flopRolls = 0;
  flopTriggers = 0;

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
  userPaintAtt: number;
  userPaintFGM: number;
  aiPaintAtt: number;
  aiPaintFGM: number;
  userDunkAtt: number;
  userDunkFGM: number;
  aiDunkAtt: number;
  aiDunkFGM: number;
  userLayupAtt: number;
  userLayupFGM: number;
  aiLayupAtt: number;
  aiLayupFGM: number;
  userFloaterAtt: number;
  userFloaterFGM: number;
  aiFloaterAtt: number;
  aiFloaterFGM: number;
  userHookAtt: number;
  userHookFGM: number;
  aiHookAtt: number;
  aiHookFGM: number;
  userPutbackAtt: number;
  userPutbackFGM: number;
  aiPutbackAtt: number;
  aiPutbackFGM: number;
  userBlocks: number;
  aiBlocks: number;
  userPaintFouls: number;
  aiPaintFouls: number;
  userFTA: number;
  aiFTA: number;
  userAnd1s: number;
  aiAnd1s: number;
  userTiltedCount: number;
  aiTiltedCount: number;
  userPFStamina: number;
  userCStamina: number;
  aiPFStamina: number;
  aiCStamina: number;
  userTurnovers: number;
  userSteals: number;
  aiTurnovers: number;
  aiSteals: number;
  userOreb: number;
  aiOreb: number;
  userSecondChancePts: number;
  aiSecondChancePts: number;
}

// Run matches simulation loop
function runMatches(
  userLineup: Player[],
  aiLineup: Player[],
  userStrategy = "Motion Offense",
  aiStrategy = "Motion Offense",
  numMatches = 30,
  forcedStamina: number | null = null
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
      state.playerStamina[p.id] = forcedStamina !== null ? forcedStamina : 100;
    });
    aiLineup.forEach(p => {
      state.playerStamina[p.id] = 100;
    });

    let ticks = 0;
    let halftimeTriggered = false;

    // Local match-level counts
    let userPaintAtt = 0, userPaintFGM = 0;
    let aiPaintAtt = 0, aiPaintFGM = 0;
    let userDunkAtt = 0, userDunkFGM = 0;
    let aiDunkAtt = 0, aiDunkFGM = 0;
    let userLayupAtt = 0, userLayupFGM = 0;
    let aiLayupAtt = 0, aiLayupFGM = 0;
    let userFloaterAtt = 0, userFloaterFGM = 0;
    let aiFloaterAtt = 0, aiFloaterFGM = 0;
    let userHookAtt = 0, userHookFGM = 0;
    let aiHookAtt = 0, aiHookFGM = 0;
    let userPutbackAtt = 0, userPutbackFGM = 0;
    let aiPutbackAtt = 0, aiPutbackFGM = 0;

    let userBlocks = 0, aiBlocks = 0;
    let userPaintFouls = 0, aiPaintFouls = 0;
    let userAnd1s = 0, aiAnd1s = 0;
    let userTiltedCount = 0, aiTiltedCount = 0;

    let userSecondChancePts = 0;
    let aiSecondChancePts = 0;

    while (!state.isFinished && ticks < 400) {
      // Halftime replenishment
      if (state.halftimeShown && !halftimeTriggered && forcedStamina === null) {
        halftimeTriggered = true;
        allUserRoster.forEach(p => {
          state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30);
        });
        aiLineup.forEach(p => {
          state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30);
        });
      }

      if (forcedStamina !== null) {
        // Enforce Low Stamina for scenario 4 bigs
        userLineup.forEach(p => {
          if (p.position === "PF" || p.position === "C") {
            state.playerStamina[p.id] = forcedStamina;
          }
        });
      }

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;

      // Capture pre-tick state
      resetTickFlags();
      const preStats = cloneStats(state.playerStats);
      const preEventsLen = state.events.length;

      // Execute Tick
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      ticks++;

      const newEvents = state.events.slice(preEventsLen);
      const postStats = state.playerStats;

      // Identify active possession team based on events or FGA increases
      const activePossessionTeam = state.possessionTeam;

      // 1. Resolve generateShot attempts and putback attempts
      const resolveAttempt = (record: AttemptRecord, isUser: boolean, outcome: "make" | "miss" | "block" | "foul") => {
        const type = record.shotType;
        if (!CLOSE_RANGE_SHOTS.includes(type)) return;

        if (isUser) {
          userPaintAtt++;
          if (outcome === "make") userPaintFGM++;
          if (type === "dunk") {
            userDunkAtt++;
            if (outcome === "make") userDunkFGM++;
          } else if (["drivingLayup", "euroStep", "fingerRoll", "powerLayup"].includes(type)) {
            userLayupAtt++;
            if (outcome === "make") userLayupFGM++;
          } else if (type === "floater") {
            userFloaterAtt++;
            if (outcome === "make") userFloaterFGM++;
          } else if (type === "hookShot") {
            userHookAtt++;
            if (outcome === "make") userHookFGM++;
          } else if (type === "putBack") {
            userPutbackAtt++;
            if (outcome === "make") userPutbackFGM++;
          }
        } else {
          aiPaintAtt++;
          if (outcome === "make") aiPaintFGM++;
          if (type === "dunk") {
            aiDunkAtt++;
            if (outcome === "make") aiDunkFGM++;
          } else if (["drivingLayup", "euroStep", "fingerRoll", "powerLayup"].includes(type)) {
            aiLayupAtt++;
            if (outcome === "make") aiLayupFGM++;
          } else if (type === "floater") {
            aiFloaterAtt++;
            if (outcome === "make") aiFloaterFGM++;
          } else if (type === "hookShot") {
            aiHookAtt++;
            if (outcome === "make") aiHookFGM++;
          } else if (type === "putBack") {
            aiPutbackAtt++;
            if (outcome === "make") aiPutbackFGM++;
          }
        }
      };

      // Check if block or foul occurred in events
      let blockFired = false;
      let foulFired = false;
      newEvents.forEach((e: any) => {
        const text = e.text || "";
        if (text.includes("BLK:") || text.includes("BLOCK:")) blockFired = true;
        if (text.includes("Shooting foul on") || text.includes("Foul on the putback")) foulFired = true;
        if (text.includes("AND-1!")) {
          if (e.isUserTeam) userAnd1s++;
          else aiAnd1s++;
        }
        if (text.includes("tilts")) {
          if (e.isUserTeam) userTiltedCount++;
          else aiTiltedCount++;
        }
        // Track second chance points directly from text
        if (text.includes("Second chance:") || text.includes("converts!")) {
          const match = text.match(/\(\+(\d)\)/);
          if (match) {
            const pts = parseInt(match[1]);
            if (e.isUserTeam) userSecondChancePts += pts;
            else aiSecondChancePts += pts;
          }
        }
      });

      // Map generated attempts
      activeTickAttempts.forEach(att => {
        const isUser = userLineup.some(p => p.id === att.playerId);
        let outcome: "make" | "miss" | "block" | "foul" = "miss";

        if (blockFired) {
          outcome = "block";
          if (isUser) aiBlocks++;
          else userBlocks++;
        } else if (foulFired) {
          outcome = "foul";
          if (isUser) userPaintFouls++;
          else aiPaintFouls++;
        } else {
          const pre = preStats[att.playerId] || { FGM: 0, FGA: 0 };
          const post = postStats[att.playerId] || { FGM: 0, FGA: 0 };
          if ((post.FGM ?? 0) > (pre.FGM ?? 0)) {
            outcome = "make";
          } else if ((post.FGA ?? 0) > (pre.FGA ?? 0)) {
            outcome = "miss";
          }
        }
        resolveAttempt(att, isUser, outcome);
        allScenarioAttempts.push({ ...att, outcome });
      });

      // Map putbacks (which bypass generateShot) by checking FGA increases
      Object.keys(postStats).forEach(pid => {
        // If FGA increased but activeTickAttempts didn't capture this player, it's a putback
        const pre = preStats[pid] || { FGM: 0, FGA: 0 };
        const post = postStats[pid] || { FGM: 0, FGA: 0 };
        const fgaDiff = (post.FGA ?? 0) - (pre.FGA ?? 0);
        const fgmDiff = (post.FGM ?? 0) - (pre.FGM ?? 0);

        if (fgaDiff > 0 && !activeTickAttempts.some(a => a.playerId === pid)) {
          const isUser = userLineup.some(p => p.id === pid);
          const outcome = fgmDiff > 0 ? "make" : "miss";
          const record: AttemptRecord = { playerId: pid, shotType: "putBack", is3PT: false, outcome };
          resolveAttempt(record, isUser, outcome);
          allScenarioAttempts.push(record);
        }
      });

      // Putback foul capture (handles when putback results in FTs, which has no FGA stats increase)
      if (foulFired && activeTickAttempts.length === 0) {
        // Find which team was fouled by scanning event text
        newEvents.forEach((e: any) => {
          const text = e.text || "";
          if (text.includes("Foul on the putback")) {
            const isUser = e.isUserTeam;
            const record: AttemptRecord = { playerId: isUser ? userLineup[4].id : aiLineup[4].id, shotType: "putBack", is3PT: false, outcome: "foul" };
            resolveAttempt(record, isUser, "foul");
            allScenarioAttempts.push(record);
            if (isUser) userPaintFouls++;
            else aiPaintFouls++;
          }
        });
      }
    }

    // Match end stats aggregation
    let userTurnovers = 0, userSteals = 0, userFTA = 0, userOreb = 0;
    let aiTurnovers = 0, aiSteals = 0, aiFTA = 0, aiOreb = 0;

    userLineup.forEach(p => {
      const s = state.playerStats[p.id] || {};
      userTurnovers += s.TOV ?? 0;
      userSteals += s.STL ?? 0;
      userFTA += s.FTA ?? 0;
      userOreb += s.OREB ?? 0;
    });

    aiLineup.forEach(p => {
      const s = state.playerStats[p.id] || {};
      aiTurnovers += s.TOV ?? 0;
      aiSteals += s.STL ?? 0;
      aiFTA += s.FTA ?? 0;
      aiOreb += s.OREB ?? 0;
    });

    matchesMetrics.push({
      combinedScore: state.userScore + state.aiScore,
      userScore: state.userScore,
      aiScore: state.aiScore,
      userPaintAtt,
      userPaintFGM,
      aiPaintAtt,
      aiPaintFGM,
      userDunkAtt,
      userDunkFGM,
      aiDunkAtt,
      aiDunkFGM,
      userLayupAtt,
      userLayupFGM,
      aiLayupAtt,
      aiLayupFGM,
      userFloaterAtt,
      userFloaterFGM,
      aiFloaterAtt,
      aiFloaterFGM,
      userHookAtt,
      userHookFGM,
      aiHookAtt,
      aiHookFGM,
      userPutbackAtt,
      userPutbackFGM,
      aiPutbackAtt,
      aiPutbackFGM,
      userBlocks,
      aiBlocks,
      userPaintFouls,
      aiPaintFouls,
      userFTA,
      aiFTA,
      userAnd1s,
      aiAnd1s,
      userTiltedCount,
      aiTiltedCount,
      userPFStamina: state.playerStamina[userLineup[3].id] ?? 0,
      userCStamina: state.playerStamina[userLineup[4].id] ?? 0,
      aiPFStamina: state.playerStamina[aiLineup[3].id] ?? 0,
      aiCStamina: state.playerStamina[aiLineup[4].id] ?? 0,
      userTurnovers,
      userSteals,
      aiTurnovers,
      aiSteals,
      userOreb,
      aiOreb,
      userSecondChancePts,
      aiSecondChancePts
    });
  }

  return matchesMetrics;
}

// Compute averages across metrics array
function computeAverages(metrics: ScenarioMetrics[]) {
  const count = metrics.length;
  const sum = metrics.reduce(
    (acc, m) => {
      Object.keys(m).forEach(k => {
        acc[k] = (acc[k] ?? 0) + (m as any)[k];
      });
      return acc;
    },
    {} as Record<string, number>
  );

  const avg: Record<string, number> = {};
  Object.keys(sum).forEach(k => {
    avg[k] = sum[k] / count;
  });

  return avg as unknown as ScenarioMetrics;
}

// Roster definition helpers
const makeGenericLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Rare", 84, ["Paint Barrier", "Iron Motor", "Enforcer Lift"], [], { strength: 80, finishing: 80, rebound: 80, block: 75 }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Rare", 84, ["Paint Barrier", "Iron Motor", "Enforcer Lift"], [], { strength: 82, finishing: 82, rebound: 82, block: 80 })
];

const makePaintBullyLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Paint Magnet", "Iron Motor"], [], { strength: 94, finishing: 92, rebound: 86, block: 78 }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Paint Magnet", "Mismatch Caller"], [], { strength: 96, finishing: 94, rebound: 88, block: 84 })
];

const makeRimProtectionLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Rim Warden", "Paint Barrier", "Iron Motor"], ["SKY_WALL"], { strength: 90, finishing: 78, rebound: 92, block: 90 }, { "SKY_WALL": "Epic" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Rim Warden", "Paint Barrier", "Enforcer Lift"], ["SKY_WALL"], { strength: 94, finishing: 76, rebound: 94, block: 95 }, { "SKY_WALL": "Legendary" })
];

const makeLegacyPhysicalLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Paint Magnet", "Iron Motor"], ["Contact Tax X"], { strength: 94, finishing: 92 }, { "Contact Tax X": "Legendary" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Paint Magnet", "Mismatch Caller"], ["Lung Burner X"], { strength: 96, finishing: 94 }, { "Lung Burner X": "Legendary" })
];

const makePaintFoulDrawLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Paint Magnet", "Foul Magnet"], ["Flop X"], { strength: 92, finishing: 90 }, { "Flop X": "Epic" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Paint Magnet", "Foul Magnet"], ["Four-Point Bait X"], { strength: 94, finishing: 92 }, { "Four-Point Bait X": "Epic" })
];

const makePaintGlassLineup = (prefix: string) => [
  createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", "Rare", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
  createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", "Rare", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
  createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
  createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", "Legendary", 88, ["Power Driver", "Glass Touch", "Iron Motor"], ["GLASS_STRIKE"], { strength: 94, finishing: 90, rebound: 90 }, { "GLASS_STRIKE": "Epic" }),
  createMockPlayer(`${prefix}5`, `${prefix} C`, "C", "Legendary", 88, ["Power Driver", "Glass Touch", "Paint Barrier"], ["GLASS_STRIKE"], { strength: 96, finishing: 92, rebound: 92 }, { "GLASS_STRIKE": "Legendary" })
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
  console.log(`Dunks per Game: User ${avg.userDunkFGM.toFixed(1)}/${avg.userDunkAtt.toFixed(1)} | AI ${avg.aiDunkFGM.toFixed(1)}/${avg.aiDunkAtt.toFixed(1)}`);
  console.log(`Layups per Game: User ${avg.userLayupFGM.toFixed(1)}/${avg.userLayupAtt.toFixed(1)} | AI ${avg.aiLayupFGM.toFixed(1)}/${avg.aiLayupAtt.toFixed(1)}`);
  console.log(`Floaters per Game: User ${avg.userFloaterFGM.toFixed(1)}/${avg.userFloaterAtt.toFixed(1)} | AI ${avg.aiFloaterFGM.toFixed(1)}/${avg.aiFloaterAtt.toFixed(1)}`);
  console.log(`Hook Shots per Game: User ${avg.userHookFGM.toFixed(1)}/${avg.userHookAtt.toFixed(1)} | AI ${avg.aiHookFGM.toFixed(1)}/${avg.aiHookAtt.toFixed(1)}`);
  console.log(`Putbacks per Game: User ${avg.userPutbackFGM.toFixed(1)}/${avg.userPutbackAtt.toFixed(1)} | AI ${avg.aiPutbackFGM.toFixed(1)}/${avg.aiPutbackAtt.toFixed(1)}`);
  console.log(`Blocks per Game: User ${avg.userBlocks.toFixed(1)} | AI ${avg.aiBlocks.toFixed(1)}`);
  console.log(`FTA per Game: User ${avg.userFTA.toFixed(1)} | AI ${avg.aiFTA.toFixed(1)}`);
  console.log(`Shooting Fouls on Paint Attacks: User ${avg.userPaintFouls.toFixed(1)} | AI ${avg.aiPaintFouls.toFixed(1)}`);
  console.log(`And-One Events: User ${avg.userAnd1s.toFixed(2)} | AI ${avg.aiAnd1s.toFixed(2)}`);
  console.log(`Tilted Mark count: User ${avg.userTiltedCount.toFixed(2)} | AI ${avg.aiTiltedCount.toFixed(2)}`);
  
  console.log(`End-of-Game Stamina:`);
  console.log(`  - User: PF ${avg.userPFStamina.toFixed(1)}% | C ${avg.userCStamina.toFixed(1)}%`);
  console.log(`  - AI:   PF ${avg.aiPFStamina.toFixed(1)}%  | C ${avg.aiCStamina.toFixed(1)}%`);
  console.log(`Turnovers / Steals:`);
  console.log(`  - User: ${avg.userTurnovers.toFixed(1)} TOV | ${avg.userSteals.toFixed(1)} STL`);
  console.log(`  - AI:   ${avg.aiTurnovers.toFixed(1)} TOV | ${avg.aiSteals.toFixed(1)} STL`);
  console.log(`Offensive Rebounds: User ${avg.userOreb.toFixed(1)} | AI ${avg.aiOreb.toFixed(1)}`);
  console.log(`Second-Chance Points: User ${avg.userSecondChancePts.toFixed(1)} | AI ${avg.aiSecondChancePts.toFixed(1)}`);

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
  if (avg.userPaintFGM > avg.userPaintAtt) {
    console.warn(`⚠️  WARNING: Paint makes exceed attempts (logic error)`);
    hasWarnings = true;
  }
  if (!hasWarnings) {
    console.log(`✅ All guardrail metrics within safe limits.`);
  }
}

function printTriggers() {
  console.log(`Skill Rolls / Triggers:`);
  console.log(`  - Power Driver: ${powerDriverTriggers} / ${powerDriverRolls}`);
  console.log(`  - Paint Magnet: ${paintMagnetTriggers} / ${paintMagnetRolls}`);
  console.log(`  - Mismatch Caller: ${mismatchCallerTriggers} / ${mismatchCallerRolls}`);
  console.log(`  - Rim Warden: ${rimWardenTriggers} / ${rimWardenRolls}`);
  console.log(`  - Iron Motor: ${ironMotorTriggers} / ${ironMotorRolls}`);
  console.log(`  - Enforcer Lift: ${enforcerLiftTriggers} / ${enforcerLiftRolls}`);
  console.log(`Special Enhancer Rolls / Triggers:`);
  console.log(`  - Contact Tax X: ${contactTaxTriggers} / ${contactTaxRolls}`);
  console.log(`  - Lung Burner X: ${lungBurnerTriggers} / ${lungBurnerRolls}`);
  console.log(`  - SKY_WALL Rim Pressure: ${skyWallTriggers} / ${skyWallRolls}`);
  console.log(`  - GLASS_STRIKE Rebound: ${glassStrikeTriggers} / ${glassStrikeRolls}`);
  console.log(`  - Flop X: ${flopTriggers} / ${flopRolls}`);
}

async function run() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("PAINT BULLY / POSTER_SPARK BASELINE REGRESSION SIMULATOR");
  console.log("════════════════════════════════════════════════════════════════");
  console.log("30 matches per scenario. Audit-only simulation.\n");

  const genericAI = () => makeGenericLineup("ai");

  // 1. Scenario 1: Baseline Balanced Lineup
  {
    printReportHeader("1. Baseline Balanced Lineup");
    console.log("Average rosters on both sides. Evaluates normal close-range pacing.");
    resetScenarioCounters();
    const userLineup = makeGenericLineup("u");
    const metrics = runMatches(userLineup, genericAI(), "Motion Offense", "Motion Offense", 30);
    const avg = computeAverages(metrics);
    printStats(avg);
    printTriggers();
  }

  // 2. Scenario 2: Paint Bully Heavy Lineup
  {
    printReportHeader("2. Paint Bully Heavy Lineup");
    console.log("High strength & finishing C/PF on offense. Power Driver + Paint Magnet active.");
    resetScenarioCounters();
    const userLineup = makePaintBullyLineup("u");
    const metrics = runMatches(userLineup, genericAI(), "Motion Offense", "Motion Offense", 30);
    const avg = computeAverages(metrics);
    printStats(avg);
    printTriggers();
  }

  // 3. Scenario 3: Paint Bully vs Rim Protection
  {
    printReportHeader("3. Paint Bully vs Rim Protection");
    console.log("Paint Bully offense vs C/PF with high defense/block, Rim Warden, and SKY_WALL.");
    resetScenarioCounters();
    const userLineup = makePaintBullyLineup("u");
    const defensiveLineup = makeRimProtectionLineup("ai");
    const metrics = runMatches(userLineup, defensiveLineup, "Motion Offense", "2-3 Zone", 30);
    const avg = computeAverages(metrics);
    printStats(avg);
    printTriggers();
  }

  // 4. Scenario 4: Fatigued Bigs Scenario
  {
    printReportHeader("4. Fatigued Bigs Scenario");
    console.log("Smart Fatigue checks. Measures shot distribution shifts at specific stamina tiers.");
    
    // We will test at three forced stamina tiers
    const staminaTiers = [60, 30, 10];
    for (const stam of staminaTiers) {
      console.log(`\n--- Forced PF/C Stamina at ${stam}% ---`);
      resetScenarioCounters();
      const userLineup = makePaintBullyLineup("u");
      const metrics = runMatches(userLineup, genericAI(), "Motion Offense", "Motion Offense", 20, stam);
      const avg = computeAverages(metrics);
      console.log(`PF/C Stamina: ${stam}%`);
      console.log(`Dunk attempts/game: User ${avg.userDunkAtt.toFixed(2)} | AI ${avg.aiDunkAtt.toFixed(2)}`);
      console.log(`Layup attempts/game: User ${avg.userLayupAtt.toFixed(2)} | AI ${avg.aiLayupAtt.toFixed(2)}`);
      console.log(`Floater attempts/game: User ${avg.userFloaterAtt.toFixed(2)} | AI ${avg.aiFloaterAtt.toFixed(2)}`);
      console.log(`Hook attempts/game: User ${avg.userHookAtt.toFixed(2)} | AI ${avg.aiHookAtt.toFixed(2)}`);
    }
  }

  // 5. Scenario 5: User/AI Paint Symmetry Watch
  {
    printReportHeader("5. User/AI Paint Symmetry Watch");
    console.log("Identical Paint Bully lineups on both sides. Compares User and AI statistics.");
    resetScenarioCounters();
    const userLineup = makePaintBullyLineup("u");
    const aiLineup = makePaintBullyLineup("ai");
    const metrics = runMatches(userLineup, aiLineup, "Motion Offense", "Motion Offense", 30);
    const avg = computeAverages(metrics);
    printStats(avg);
    printTriggers();
  }

  // 6. Scenario 6: Legacy Contact Tax / Lung Burner Watch
  {
    printReportHeader("6. Legacy Contact Tax / Lung Burner Watch");
    console.log("Stacks legacy Contact Tax X & Lung Burner X. Examines physical fatigue pressure.");
    resetScenarioCounters();
    const userLineup = makeLegacyPhysicalLineup("u");
    const metrics = runMatches(userLineup, genericAI(), "Motion Offense", "Motion Offense", 30);
    const avg = computeAverages(metrics);
    printStats(avg);
    printTriggers();
  }

  // 7. Scenario 7: Paint Bully + Foul-Draw Overlap
  {
    printReportHeader("7. Paint Bully + Foul-Draw Overlap");
    console.log("Paint Bully lineup stacking Foul Magnet, Flop X, and Four-Point Bait X.");
    resetScenarioCounters();
    const userLineup = makePaintFoulDrawLineup("u");
    const metrics = runMatches(userLineup, genericAI(), "Motion Offense", "Motion Offense", 30);
    const avg = computeAverages(metrics);
    printStats(avg);
    printTriggers();
  }

  // 8. Scenario 8: Paint Bully + Glass Bully Overlap
  {
    printReportHeader("8. Paint Bully + Glass Bully Overlap");
    console.log("Paint Bully lineup stacking Glass Touch, Paint Barrier, and GLASS_STRIKE.");
    resetScenarioCounters();
    const userLineup = makePaintGlassLineup("u");
    const metrics = runMatches(userLineup, genericAI(), "Motion Offense", "Motion Offense", 30);
    const avg = computeAverages(metrics);
    printStats(avg);
    printTriggers();
  }

  console.log("\n\n════════════════════════════════════════════════════════════════");
  console.log("PAINT BULLY REGRESSION Baseline RUN COMPLETE.");
  console.log("════════════════════════════════════════════════════════════════");
}

run().catch(console.error);
