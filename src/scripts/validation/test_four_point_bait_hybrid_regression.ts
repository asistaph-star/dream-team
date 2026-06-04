import * as path from "path";
import * as fs from "fs";
import { Player } from "../../lib/types/player";

// 1. Hijack the skillResolver module in require.cache before importing matchEngine
const absoluteResolverPath = path.resolve(__dirname, "../../lib/skills/skillResolver.ts");
if (!fs.existsSync(absoluteResolverPath)) {
  throw new Error(`Cannot find skillResolver at ${absoluteResolverPath}`);
}

const originalResolver = require(absoluteResolverPath);
const mockedResolver = { ...originalResolver };

// State tracking globals
let currentAttackingLineup: Player[] = [];
let currentDefendingLineup: Player[] = [];
let currentScorer: Player | null = null;
let currentStamina: Record<string, number> = {};
let currentMatchState: any = null;
let currentUserLineup: Player[] = [];
let currentAiLineup: Player[] = [];

let isFourPointBaitContext = false;
let fourPointBaitTriggeredSuccessfully = false;

let isComposureCountered = false;
let isCleanCountered = false;
let isDisciplineCountered = false;

// Aggregated metric counters
let fourPointBaitRolls = 0;
let composureShieldRolls = 0;
let cleanChallengeRolls = 0;
let disciplineWallRolls = 0;
let fourPointBaitBoostsApplied = 0;

let composureShieldCounters = 0;
let cleanChallengeCounters = 0;
let disciplineWallCounters = 0;

let currentFlopBonus = 0;
let currentFoulMagnetBonus = 0;

let flopTriggered = false;
let flopComposed = false;
let flopCleaned = false;

// Custom mocked functions
mockedResolver.rollSpecialMechanic = (
  lineup: Player[],
  mechanicId: any,
  stamina: Record<string, number>,
  scaleFn?: any
): boolean => {
  const result = originalResolver.rollSpecialMechanic(lineup, mechanicId, stamina, scaleFn);
  
  if (mechanicId === "DEEP_STRIKE_FOUR_POINT_BAIT") {
    fourPointBaitRolls++;
    currentAttackingLineup = lineup;
    currentStamina = stamina;
    if (scaleFn) {
      const wrappedScaleFn = (holder: Player) => {
        currentScorer = holder;
        return typeof scaleFn === 'function' ? scaleFn(holder) : 1.0;
      };
      const testResult = originalResolver.rollSpecialMechanic(lineup, mechanicId, stamina, wrappedScaleFn);
    }
    
    if (result) {
      isFourPointBaitContext = true;
      fourPointBaitTriggeredSuccessfully = true;
      isComposureCountered = false;
      isCleanCountered = false;
      isDisciplineCountered = false;
    } else {
      isFourPointBaitContext = false;
      fourPointBaitTriggeredSuccessfully = false;
    }
    return result;
  }
  
  if (mechanicId === "COMPOSURE_SHIELD_CANCEL" && isFourPointBaitContext) {
    composureShieldRolls++;
    if (result) {
      isComposureCountered = true;
      composureShieldCounters++;
      fourPointBaitTriggeredSuccessfully = false;
      isFourPointBaitContext = false;
    }
    return result;
  }
  
  if (mechanicId === "CLEAN_CHALLENGE_CONTEST" && isFourPointBaitContext) {
    cleanChallengeRolls++;
    if (result) {
      isCleanCountered = true;
      cleanChallengeCounters++;
      fourPointBaitTriggeredSuccessfully = false;
      isFourPointBaitContext = false;
    }
    return result;
  }
  
  // Flop Context Tracking
  if (mechanicId === "FLOP_SELL_CONTACT") {
    flopTriggered = result;
    flopComposed = false;
    flopCleaned = false;
    if (result) {
      currentAttackingLineup = lineup;
      currentStamina = stamina;
    }
    return result;
  }
  
  if (mechanicId === "COMPOSURE_SHIELD_CANCEL" && flopTriggered) {
    if (result) {
      flopComposed = true;
    }
    return result;
  }
  
  if (mechanicId === "CLEAN_CHALLENGE_CONTEST" && flopTriggered) {
    if (result) {
      flopCleaned = true;
    }
    return result;
  }
  
  return result;
};

mockedResolver.rollBaseSkill = (
  lineup: Player[],
  skill: any,
  stamina: Record<string, number>,
  rateOverride?: any
): boolean => {
  const result = originalResolver.rollBaseSkill(lineup, skill, stamina, rateOverride);
  
  if (skill === "Foul Magnet") {
    currentAttackingLineup = lineup;
    currentStamina = stamina;
    if (result) {
      const tendency = currentScorer ? getFoulDrawTendency(currentScorer) : 0.45;
      currentFoulMagnetBonus = 0.035 * (0.90 + tendency * 0.25);
    } else {
      currentFoulMagnetBonus = 0;
    }
  }
  
  if (skill === "Discipline Wall" && isFourPointBaitContext) {
    disciplineWallRolls++;
    if (result) {
      isDisciplineCountered = true;
      disciplineWallCounters++;
      fourPointBaitTriggeredSuccessfully = false;
      isFourPointBaitContext = false;
    }
    return result;
  }
  
  return result;
};

// Inject the mock resolver
require.cache[absoluteResolverPath] = {
  id: absoluteResolverPath,
  filename: absoluteResolverPath,
  loaded: true,
  exports: mockedResolver
} as any;

// Now load matchEngine modules
const matchEngine = require("../../lib/utils/matchEngine");
const { simulateTick, createInitialMatchState, computeEffective } = matchEngine;
const { resolveLineupArchetypes } = require("../../lib/lineup/lineupArchetypeResolver");
const getFoulStamMod = (avg: number) => avg >= 70 ? 1.0 : avg >= 50 ? 1.12 : avg >= 30 ? 1.28 : 1.45;
const { getFoulDrawTendency } = require("../../lib/utils/playerIdentity");
const { hasSpecialSkillMechanic } = require("../../lib/skills/skillMechanics");

// Option B Gating Logic
function getOptionBBoost(lineup: Player[]): number {
  const summary = resolveLineupArchetypes(lineup);
  const dsLevel = summary.allResults.find((r: any) => r.id === "shooting")?.level ?? 0;
  const fdLevel = summary.allResults.find((r: any) => r.id === "foul-draw")?.level ?? 0;
  
  if (dsLevel >= 1 && fdLevel >= 1) {
    return 0.090; // Both active (full boost)
  }
  if (dsLevel >= 1 || fdLevel >= 1) {
    return 0.045; // Only one active (partial boost)
  }
  return 0.020; // Neither active (restricted boost)
}

function getClutchRating(player: Player): number {
  const base: Record<string, number> = {
    'Mythic':    0.13,
    'Legendary': 0.09,
    'Epic':      0.04,
    'Rare':      0.00,
    'Common':   -0.03,
  };
  return base[player.rarity] ?? 0.00;
}

function calculateBaseSfChance(isUserPath: boolean, scorer: Player, state: any, userLineup: Player[], aiLineup: Player[]) {
  const defendingLineup = isUserPath ? aiLineup : userLineup;
  const defAvg_sf = defendingLineup.reduce((sum, p) => sum + (staminaPct(p, currentStamina)), 0) / defendingLineup.length;
  
  const scoreDiff = Math.abs(state.userScore - state.aiScore);
  const clutchActive = (state.quarter === 4 && state.clock <= 120 && scoreDiff <= 8) || state.quarter >= 5;
  const clutchFoulBoost = clutchActive ? getClutchRating(scorer) * 0.5 : 0;
  
  const foulDrawTendency = scorer ? getFoulDrawTendency(scorer) : 0.45;
  const foulDrawMod = 0.90 + foulDrawTendency * 0.25;
  
  let sfChance = (0.044 * getFoulStamMod(defAvg_sf) * foulDrawMod) + clutchFoulBoost;
  
  const SLOT_POS = ['PG','SG','SF','PF','C'] as const;
  const scorerSlotIdx = SLOT_POS.indexOf(scorer.position as typeof SLOT_POS[number]);
  const primaryDefender = scorerSlotIdx >= 0 ? defendingLineup[scorerSlotIdx] : undefined;
  
  if (primaryDefender && hasMark(state.skillMarks, primaryDefender.id, "Tilted")) {
    sfChance += 0.035;
  }
  
  // Add Flop X bonus
  if (flopTriggered) {
    const baseBonus = 0.04;
    const isSGA = scorer.name.toLowerCase().includes("shai gilgeous-alexander");
    const flopBonus = isSGA && hasSpecialSkillMechanic(scorer, "FLOP_SELL_CONTACT") ? baseBonus * 2 : baseBonus;
    if (flopComposed) {
      // cancelled
    } else if (flopCleaned) {
      sfChance += flopBonus * 0.5;
    } else {
      sfChance += flopBonus;
    }
  }
  
  // Add Foul Magnet bonus
  sfChance += currentFoulMagnetBonus;
  
  return sfChance;
}

function staminaPct(player: Player, stamina: Record<string, number>): number {
  const maxStamina = Math.max(100, Math.round(player.stamina ?? 100));
  return Math.max(0, Math.min(100, ((stamina[player.id] ?? maxStamina) / maxStamina) * 100));
}

function hasMark(skillMarks: any, playerId: string, mark: string): boolean {
  return (skillMarks[playerId] ?? []).some((m: any) => m.mark === mark);
}

function resetTickFlags() {
  isFourPointBaitContext = false;
  fourPointBaitTriggeredSuccessfully = false;
  isComposureCountered = false;
  isCleanCountered = false;
  isDisciplineCountered = false;
  flopTriggered = false;
  flopComposed = false;
  flopCleaned = false;
  currentFlopBonus = 0;
  currentFoulMagnetBonus = 0;
}

// 2. Intercept Math.random for shooting foul checks
const matchEnginePath = path.resolve(__dirname, "../../lib/utils/matchEngine.ts");
const matchEngineContent = fs.readFileSync(matchEnginePath, "utf-8");
const matchEngineLines = matchEngineContent.split("\n");

let userPathLine = -1;
let aiPathLine = -1;

for (let i = 0; i < matchEngineLines.length; i++) {
  const line = matchEngineLines[i];
  if (line.includes("Math.random() < sfChance") && !line.includes("sfChance_ai")) {
    let contextHasBait = false;
    for (let j = Math.max(0, i - 60); j < i; j++) {
      if (matchEngineLines[j].includes("DEEP_STRIKE_FOUR_POINT_BAIT")) {
        contextHasBait = true;
        break;
      }
    }
    if (contextHasBait) {
      userPathLine = i + 1; // 1-based line number
    }
  }
  if (line.includes("Math.random() < sfChance_ai")) {
    aiPathLine = i + 1; // 1-based line number
  }
}

if (userPathLine === -1 || aiPathLine === -1) {
  throw new Error(`Failed to dynamically locate shooting foul roll lines in matchEngine.ts (userPathLine: ${userPathLine}, aiPathLine: ${aiPathLine})`);
}

const originalRandom = Math.random;
Math.random = function() {
  const r = originalRandom();
  const stack = new Error().stack || "";
  const isUserPath = stack.includes(`matchEngine.ts:${userPathLine}`);
  const isAIPath = stack.includes(`matchEngine.ts:${aiPathLine}`);
  
  if ((isUserPath || isAIPath) && fourPointBaitTriggeredSuccessfully) {
    fourPointBaitTriggeredSuccessfully = false; // consume
    
    const activeAttacking = isUserPath ? currentUserLineup : currentAiLineup;
    const proposedBoost = getOptionBBoost(activeAttacking);
    const scorer = currentScorer || activeAttacking[0];
    
    const baseChance = calculateBaseSfChance(isUserPath, scorer, currentMatchState, currentUserLineup, currentAiLineup);
    const originalSfChance = Math.min(0.28, baseChance + 0.090);
    const adjustedSfChance = Math.min(0.28, baseChance + proposedBoost);
    
    const R = originalRandom();
    if (R < adjustedSfChance) {
      fourPointBaitBoostsApplied++;
      return 0.0; // Force success in the engine
    } else {
      return 1.0; // Force failure in the engine
    }
  }
  return r;
};

// Regression Scenario helpers
function createMockPlayer(
  id: string,
  name: string,
  baseSkills: [string, string, string],
  specialSkillSlots: (string | null)[] = [],
  ovr = 90,
  overrides: Partial<Player> = {}
): Player {
  return {
    id,
    name,
    position: "PG",
    rarity: "Common",
    level: 1,
    maxLevel: 50,
    exp: 0,
    ovr,
    offense: 85,
    defense: 85,
    shooting: 85,
    speed: 85,
    strength: 85,
    playmaking: 85,
    baseSkills,
    specialSkillSlots,
    starLevel: 5,
    threePt: 85,
    twoPt: 85,
    freeThrow: 85,
    finishing: 85,
    rebound: 85,
    steal: 85,
    block: 85,
    onBall: 85,
    handle: 85,
    assist: 85,
    calm: 85,
    threePtTendency: 0.35,
    driveTendency: 0.35,
    pullUpTendency: 0.25,
    foulDrawTendency: 0.45,
    skillRarities: {
      "Flop X": "Legendary",
      "Four-Point Bait X": "Legendary",
      "Red Dot X": "Legendary",
      "Composure X": "Legendary",
      "Clean Contest X": "Legendary"
    },
    ...overrides
  };
}

interface MatchMetrics {
  userScore: number;
  aiScore: number;
  userFTA: number;
  aiFTA: number;
  userFouls: number;
  aiFouls: number;
  threePointFouls: number;
  and1Events: number;
  redDotTriggers: number;
  steals: number;
  turnovers: number;
  user3pa: number;
  user3pm: number;
  ai3pa: number;
  ai3pm: number;
  // User vs AI path watch metrics
  userDWallTriggers: number;
  aiDWallTriggers: number;
  userFoulStaminaDrains: number;
  aiFoulStaminaDrains: number;
}

// Global path watch metrics
let userDWallTriggersThisScenario = 0;
let aiDWallTriggersThisScenario = 0;
let userFoulStaminaDrainsThisScenario = 0;
let aiFoulStaminaDrainsThisScenario = 0;

// Listen to engine output details
function runScenarioSimulations(
  userLineup: Player[],
  aiLineup: Player[],
  strategy = "Motion Offense",
  numMatches = 20
): MatchMetrics[] {
  const results: MatchMetrics[] = [];
  const allUserRoster = [...userLineup];
  
  const aiTeamObj = {
    name: "AI Test Team",
    arena: "AI Arena",
    off: 80,
    def: 80,
    color: "#ff0000",
    roster: aiLineup,
  };

  for (let i = 0; i < numMatches; i++) {
    let state = createInitialMatchState();
    state.userOffStrategy = strategy;
    state.userDefStrategy = "Man-to-Man";
    state.aiOffStrategy = "Motion Offense";
    state.aiDefStrategy = "Man-to-Man";
    state.userPlayerIds = allUserRoster.map(p => p.id);
    state.aiPlayerIds = aiLineup.map(p => p.id);
    state.aiLineupIds = aiLineup.map(p => p.id);

    allUserRoster.forEach(p => state.playerStamina[p.id] = 100);
    aiLineup.forEach(p => state.playerStamina[p.id] = 100);

    let ticks = 0;
    let halftimeTriggered = false;

    // Track starting stamina for tracking drain
    const startStamina = { ...state.playerStamina };

    while (!state.isFinished && ticks < 400) {
      if (state.halftimeShown && !halftimeTriggered) {
        halftimeTriggered = true;
        allUserRoster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
        aiLineup.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
      }

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;

      // Set globals for tick
      resetTickFlags();
      currentMatchState = state;
      currentUserLineup = userLineup;
      currentAiLineup = aiLineup;

      // Capture pre-tick events length to inspect new events
      const preTickEventsLen = state.events.length;

      // Run tick
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      ticks++;

      // Post-tick asymmetry checks
      const newEvents = state.events.slice(preTickEventsLen);
      newEvents.forEach((evt: any) => {
        const text = evt.text || "";
        if (text.includes("Discipline Wall holds off Four-Point Bait X")) {
          if (evt.isUserTeam) {
            aiDWallTriggersThisScenario++; // AI holds off User
          } else {
            userDWallTriggersThisScenario++; // User holds off AI
          }
        }
        if (text.includes("Shooting foul")) {
          // Check if stamina was drained
          // The shooter stamina in user path is drained. Let's see if the scorer is User or AI
          // Since we can't easily check internal drains directly, we measure general stamina decay.
        }
      });
    }

    // Measure metrics
    let userFTA = 0, aiFTA = 0, userFouls = 0, aiFouls = 0, steals = 0, turnovers = 0;
    let user3pa = 0, user3pm = 0, ai3pa = 0, ai3pm = 0;

    Object.entries(state.playerStats).forEach(([playerId, s]: [string, any]) => {
      const isUser = allUserRoster.some(p => p.id === playerId);
      if (isUser) {
        userFTA += s.FTA ?? 0;
        userFouls += s.FOL ?? 0;
        steals += s.STL ?? 0;
        turnovers += s.TOV ?? 0;
        user3pa += s.TPA ?? 0;
        user3pm += s.TPM ?? 0;
      } else {
        aiFTA += s.FTA ?? 0;
        aiFouls += s.FOL ?? 0;
        steals += s.STL ?? 0;
        turnovers += s.TOV ?? 0;
        ai3pa += s.TPA ?? 0;
        ai3pm += s.TPM ?? 0;
      }
    });

    let and1Events = 0;
    let threePointFouls = 0;
    let redDotTriggers = 0;

    state.events.forEach((e: any) => {
      const text = e.text || "";
      if (text.includes("AND-1")) and1Events++;
      if (text.includes("Shooting foul on") && text.includes("for 3")) threePointFouls++;
      if (text.includes("Red Dot X marks")) redDotTriggers++;
    });

    results.push({
      userScore: state.userScore,
      aiScore: state.aiScore,
      userFTA,
      aiFTA,
      userFouls,
      aiFouls,
      threePointFouls,
      and1Events,
      redDotTriggers,
      steals,
      turnovers,
      user3pa,
      user3pm,
      ai3pa,
      ai3pm,
      userDWallTriggers: userDWallTriggersThisScenario,
      aiDWallTriggers: aiDWallTriggersThisScenario,
      userFoulStaminaDrains: 0,
      aiFoulStaminaDrains: 0,
    });
  }

  return results;
}

function computeAverages(metrics: MatchMetrics[]) {
  const sum = {
    userScore: 0, aiScore: 0, userFTA: 0, aiFTA: 0, userFouls: 0, aiFouls: 0,
    threePointFouls: 0, and1Events: 0, redDotTriggers: 0, steals: 0, turnovers: 0,
    user3pa: 0, user3pm: 0, ai3pa: 0, ai3pm: 0
  };

  metrics.forEach(m => {
    sum.userScore += m.userScore;
    sum.aiScore += m.aiScore;
    sum.userFTA += m.userFTA;
    sum.aiFTA += m.aiFTA;
    sum.userFouls += m.userFouls;
    sum.aiFouls += m.aiFouls;
    sum.threePointFouls += m.threePointFouls;
    sum.and1Events += m.and1Events;
    sum.redDotTriggers += m.redDotTriggers;
    sum.steals += m.steals;
    sum.turnovers += m.turnovers;
    sum.user3pa += m.user3pa;
    sum.user3pm += m.user3pm;
    sum.ai3pa += m.ai3pa;
    sum.ai3pm += m.ai3pm;
  });

  const count = metrics.length;
  return {
    combinedScore: (sum.userScore + sum.aiScore) / count,
    userFTA: sum.userFTA / count,
    aiFTA: sum.aiFTA / count,
    userFouls: sum.userFouls / count,
    aiFouls: sum.aiFouls / count,
    threePointFouls: sum.threePointFouls / count,
    and1Events: sum.and1Events / count,
    redDotTriggers: sum.redDotTriggers / count,
    steals: sum.steals / count,
    turnovers: sum.turnovers / count,
    user3pa: sum.user3pa / count,
    user3pm: sum.user3pm / count,
    ai3pa: sum.ai3pa / count,
    ai3pm: sum.ai3pm / count,
    user3ptPct: (sum.user3pm / (sum.user3pa || 1)) * 100,
    ai3ptPct: (sum.ai3pm / (sum.ai3pa || 1)) * 100,
  };
}

async function run() {
  console.log("=== RUNNING FOUR-POINT BAIT HYBRID REGRESSION SIMULATION ===");

  const genericBaseSkills: [string, string, string] = ["Share Rhythm", "Connector Hub", "Position Flex"];
  const genericAI = () => [
    createMockPlayer("ai1", "AI PG", genericBaseSkills),
    createMockPlayer("ai2", "AI SG", genericBaseSkills),
    createMockPlayer("ai3", "AI SF", genericBaseSkills),
    createMockPlayer("ai4", "AI PF", genericBaseSkills),
    createMockPlayer("ai5", "AI C", genericBaseSkills),
  ];

  // SCENARIO 1: Baseline / Neither Archetype Active
  {
    fourPointBaitRolls = 0; composureShieldRolls = 0; cleanChallengeRolls = 0; disciplineWallRolls = 0; fourPointBaitBoostsApplied = 0;
    composureShieldCounters = 0; cleanChallengeCounters = 0; disciplineWallCounters = 0;

    const userLineup = [
      createMockPlayer("u1", "Bait PG", genericBaseSkills, ["Four-Point Bait X", "Red Dot X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI(), "Pace and Space (3PT)");
    const avg = computeAverages(metrics);
    const count = metrics.length;

    console.log("\nScenario 1: Baseline / Neither Archetype Active (+0.020 simulated)");
    console.log(`- Combined Score: ${avg.combinedScore.toFixed(1)}`);
    console.log(`- User FTA: ${avg.userFTA.toFixed(1)} | AI FTA: ${avg.aiFTA.toFixed(1)}`);
    console.log(`- Red Dot triggers: ${avg.redDotTriggers.toFixed(2)}`);
    console.log(`- Four-Point Bait rolls: ${(fourPointBaitRolls / count).toFixed(2)}`);
    console.log(`- Four-Point Bait boosts applied: ${(fourPointBaitBoostsApplied / count).toFixed(2)}`);
    console.log(`- Composure counters: ${(composureShieldCounters / count).toFixed(2)} | Clean counters: ${(cleanChallengeCounters / count).toFixed(2)} | Discipline counters: ${(disciplineWallCounters / count).toFixed(2)}`);
    console.log(`- 3PT attempts: User ${avg.user3pa.toFixed(1)} | 3PT%: ${avg.user3ptPct.toFixed(1)}%`);
  }

  // SCENARIO 2: Only Deep Strike / Shooting Active
  {
    fourPointBaitRolls = 0; composureShieldRolls = 0; cleanChallengeRolls = 0; disciplineWallRolls = 0; fourPointBaitBoostsApplied = 0;
    composureShieldCounters = 0; cleanChallengeCounters = 0; disciplineWallCounters = 0;

    const userLineup = [
      createMockPlayer("u1", "Bait PG", ["Arc Pressure", "Tempo Surgeon", "Mismatch Caller"], ["Four-Point Bait X", "Red Dot X"]), // 3 signals (Lv.1)
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI(), "Pace and Space (3PT)");
    const avg = computeAverages(metrics);
    const count = metrics.length;

    console.log("\nScenario 2: Only Deep Strike / Shooting Active (+0.045 simulated)");
    console.log(`- Combined Score: ${avg.combinedScore.toFixed(1)}`);
    console.log(`- User FTA: ${avg.userFTA.toFixed(1)} | AI FTA: ${avg.aiFTA.toFixed(1)}`);
    console.log(`- Red Dot triggers: ${avg.redDotTriggers.toFixed(2)}`);
    console.log(`- Four-Point Bait rolls: ${(fourPointBaitRolls / count).toFixed(2)}`);
    console.log(`- Four-Point Bait boosts applied: ${(fourPointBaitBoostsApplied / count).toFixed(2)}`);
    console.log(`- Composure counters: ${(composureShieldCounters / count).toFixed(2)} | Clean counters: ${(cleanChallengeCounters / count).toFixed(2)} | Discipline counters: ${(disciplineWallCounters / count).toFixed(2)}`);
    console.log(`- 3PT attempts: User ${avg.user3pa.toFixed(1)} | 3PT%: ${avg.user3ptPct.toFixed(1)}%`);
  }

  // SCENARIO 3: Only Foul-Draw Active
  {
    fourPointBaitRolls = 0; composureShieldRolls = 0; cleanChallengeRolls = 0; disciplineWallRolls = 0; fourPointBaitBoostsApplied = 0;
    composureShieldCounters = 0; cleanChallengeCounters = 0; disciplineWallCounters = 0;

    const userLineup = [
      createMockPlayer("u1", "Bait PG", ["Foul Magnet", "Power Driver", "Tempo Surgeon"], ["Four-Point Bait X", "Red Dot X"]), // 3 signals (Lv.1)
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI(), "Pace and Space (3PT)");
    const avg = computeAverages(metrics);
    const count = metrics.length;

    console.log("\nScenario 3: Only Foul-Draw Active (+0.045 simulated)");
    console.log(`- Combined Score: ${avg.combinedScore.toFixed(1)}`);
    console.log(`- User FTA: ${avg.userFTA.toFixed(1)} | AI FTA: ${avg.aiFTA.toFixed(1)}`);
    console.log(`- Red Dot triggers: ${avg.redDotTriggers.toFixed(2)}`);
    console.log(`- Four-Point Bait rolls: ${(fourPointBaitRolls / count).toFixed(2)}`);
    console.log(`- Four-Point Bait boosts applied: ${(fourPointBaitBoostsApplied / count).toFixed(2)}`);
    console.log(`- Composure counters: ${(composureShieldCounters / count).toFixed(2)} | Clean counters: ${(cleanChallengeCounters / count).toFixed(2)} | Discipline counters: ${(disciplineWallCounters / count).toFixed(2)}`);
    console.log(`- 3PT attempts: User ${avg.user3pa.toFixed(1)} | 3PT%: ${avg.user3ptPct.toFixed(1)}%`);
  }

  // SCENARIO 4: Hybrid Active (Shooting + Foul-Draw)
  {
    fourPointBaitRolls = 0; composureShieldRolls = 0; cleanChallengeRolls = 0; disciplineWallRolls = 0; fourPointBaitBoostsApplied = 0;
    composureShieldCounters = 0; cleanChallengeCounters = 0; disciplineWallCounters = 0;

    const userLineup = [
      createMockPlayer("u1", "Bait PG", ["Arc Pressure", "Tempo Surgeon", "Mismatch Caller"], ["Four-Point Bait X", "Red Dot X"]), // 3 shooting signals (DS Lv.1)
      createMockPlayer("u2", "User SG", ["Foul Magnet", "Power Driver", "Complete Engine"]), // 3 foul signals (FD Lv.1)
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI(), "Pace and Space (3PT)");
    const avg = computeAverages(metrics);
    const count = metrics.length;

    console.log("\nScenario 4: Hybrid Active (Shooting + Foul-Draw) (+0.090 simulated)");
    console.log(`- Combined Score: ${avg.combinedScore.toFixed(1)}`);
    console.log(`- User FTA: ${avg.userFTA.toFixed(1)} | AI FTA: ${avg.aiFTA.toFixed(1)}`);
    console.log(`- Red Dot triggers: ${avg.redDotTriggers.toFixed(2)}`);
    console.log(`- Four-Point Bait rolls: ${(fourPointBaitRolls / count).toFixed(2)}`);
    console.log(`- Four-Point Bait boosts applied: ${(fourPointBaitBoostsApplied / count).toFixed(2)}`);
    console.log(`- Composure counters: ${(composureShieldCounters / count).toFixed(2)} | Clean counters: ${(cleanChallengeCounters / count).toFixed(2)} | Discipline counters: ${(disciplineWallCounters / count).toFixed(2)}`);
    console.log(`- 3PT attempts: User ${avg.user3pa.toFixed(1)} | 3PT%: ${avg.user3ptPct.toFixed(1)}%`);
  }

  // SCENARIO 5: Hybrid Gold Stress
  {
    fourPointBaitRolls = 0; composureShieldRolls = 0; cleanChallengeRolls = 0; disciplineWallRolls = 0; fourPointBaitBoostsApplied = 0;
    composureShieldCounters = 0; cleanChallengeCounters = 0; disciplineWallCounters = 0;

    const userLineup = [
      createMockPlayer("u1", "Bait PG", ["ArcPressure", "TempoSurgeon", "MismatchCaller"] as any, ["Four-Point Bait X", "Red Dot X"]),
      createMockPlayer("u2", "User SG", ["Foul Magnet", "Power Driver", "Complete Engine"]),
      createMockPlayer("u3", "User SF", ["Arc Pressure", "Tempo Surgeon", "Complete Engine"]),
      createMockPlayer("u4", "User PF", ["Foul Magnet", "Power Driver", "Tempo Surgeon"]),
      createMockPlayer("u5", "User C", ["Mismatch Caller", "Complete Engine", "Tempo Switch"]),
    ];
    // This creates massive Gold Deep Strike and Gold Foul-Draw signals.
    const metrics = runScenarioSimulations(userLineup, genericAI(), "Pace and Space (3PT)");
    const avg = computeAverages(metrics);
    const count = metrics.length;

    console.log("\nScenario 5: Hybrid Gold Stress (+0.090 simulated)");
    console.log(`- Combined Score: ${avg.combinedScore.toFixed(1)}`);
    console.log(`- User FTA: ${avg.userFTA.toFixed(1)} | AI FTA: ${avg.aiFTA.toFixed(1)}`);
    console.log(`- Red Dot triggers: ${avg.redDotTriggers.toFixed(2)}`);
    console.log(`- Four-Point Bait rolls: ${(fourPointBaitRolls / count).toFixed(2)}`);
    console.log(`- Four-Point Bait boosts applied: ${(fourPointBaitBoostsApplied / count).toFixed(2)}`);
    console.log(`- Composure counters: ${(composureShieldCounters / count).toFixed(2)} | Clean counters: ${(cleanChallengeCounters / count).toFixed(2)} | Discipline counters: ${(disciplineWallCounters / count).toFixed(2)}`);
    console.log(`- 3PT attempts: User ${avg.user3pa.toFixed(1)} | 3PT%: ${avg.user3ptPct.toFixed(1)}%`);
  }

  // SCENARIO 6: Hybrid vs Counter Defense
  {
    fourPointBaitRolls = 0; composureShieldRolls = 0; cleanChallengeRolls = 0; disciplineWallRolls = 0; fourPointBaitBoostsApplied = 0;
    composureShieldCounters = 0; cleanChallengeCounters = 0; disciplineWallCounters = 0;

    const userLineup = [
      createMockPlayer("u1", "Bait PG", ["Arc Pressure", "Tempo Surgeon", "Mismatch Caller"], ["Four-Point Bait X", "Red Dot X"]),
      createMockPlayer("u2", "User SG", ["Foul Magnet", "Power Driver", "Complete Engine"]),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = [
      createMockPlayer("ai1", "Def PG", ["Discipline Wall", "Focus Lock", "Share Rhythm"], ["Composure X"], 90, { calm: 99 }),
      createMockPlayer("ai2", "Def SG", ["Discipline Wall", "Focus Lock", "Share Rhythm"], ["Clean Contest X"], 90, { calm: 99 }),
      createMockPlayer("ai3", "Def SF", ["Discipline Wall", "Focus Lock", "Share Rhythm"], [], 90, { calm: 99 }),
      createMockPlayer("ai4", "Def PF", ["Discipline Wall", "Focus Lock", "Share Rhythm"], [], 90, { calm: 99 }),
      createMockPlayer("ai5", "Def C", ["Discipline Wall", "Focus Lock", "Share Rhythm"], [], 90, { calm: 99 }),
    ];
    const metrics = runScenarioSimulations(userLineup, aiLineup, "Pace and Space (3PT)");
    const avg = computeAverages(metrics);
    const count = metrics.length;

    console.log("\nScenario 6: Hybrid vs Counter Defense (+0.090 simulated)");
    console.log(`- Combined Score: ${avg.combinedScore.toFixed(1)}`);
    console.log(`- User FTA: ${avg.userFTA.toFixed(1)} | AI FTA: ${avg.aiFTA.toFixed(1)}`);
    console.log(`- Red Dot triggers: ${avg.redDotTriggers.toFixed(2)}`);
    console.log(`- Four-Point Bait rolls: ${(fourPointBaitRolls / count).toFixed(2)}`);
    console.log(`- Four-Point Bait boosts applied: ${(fourPointBaitBoostsApplied / count).toFixed(2)}`);
    console.log(`- Composure counters: ${(composureShieldCounters / count).toFixed(2)} | Clean counters: ${(cleanChallengeCounters / count).toFixed(2)} | Discipline counters: ${(disciplineWallCounters / count).toFixed(2)}`);
    console.log(`- 3PT attempts: User ${avg.user3pa.toFixed(1)} | 3PT%: ${avg.user3ptPct.toFixed(1)}%`);
  }

  // SCENARIO 7: Exposed Stress
  {
    fourPointBaitRolls = 0; composureShieldRolls = 0; cleanChallengeRolls = 0; disciplineWallRolls = 0; fourPointBaitBoostsApplied = 0;
    composureShieldCounters = 0; cleanChallengeCounters = 0; disciplineWallCounters = 0;

    const userLineup = [
      createMockPlayer("u1", "Bait PG", ["Arc Pressure", "Tempo Surgeon", "Mismatch Caller"], ["Four-Point Bait X", "Red Dot X"]),
      createMockPlayer("u2", "User SG", ["Arc Pressure", "Tempo Surgeon", "Mismatch Caller"], ["Red Dot X"]), // Multiple Red Dots to keep defenders Exposed
      createMockPlayer("u3", "User SF", ["Arc Pressure", "Tempo Surgeon", "Complete Engine"]),
      createMockPlayer("u4", "User PF", ["Foul Magnet", "Power Driver", "Tempo Surgeon"]),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI(), "Pace and Space (3PT)");
    const avg = computeAverages(metrics);
    const count = metrics.length;

    console.log("\nScenario 7: Exposed Stress (+0.090 simulated)");
    console.log(`- Combined Score: ${avg.combinedScore.toFixed(1)}`);
    console.log(`- User FTA: ${avg.userFTA.toFixed(1)} | AI FTA: ${avg.aiFTA.toFixed(1)}`);
    console.log(`- Red Dot triggers: ${avg.redDotTriggers.toFixed(2)}`);
    console.log(`- Four-Point Bait rolls: ${(fourPointBaitRolls / count).toFixed(2)}`);
    console.log(`- Four-Point Bait boosts applied: ${(fourPointBaitBoostsApplied / count).toFixed(2)}`);
    console.log(`- Composure counters: ${(composureShieldCounters / count).toFixed(2)} | Clean counters: ${(cleanChallengeCounters / count).toFixed(2)} | Discipline counters: ${(disciplineWallCounters / count).toFixed(2)}`);
    console.log(`- 3PT attempts: User ${avg.user3pa.toFixed(1)} | 3PT%: ${avg.user3ptPct.toFixed(1)}%`);
  }

  // SCENARIO 8: Asymmetry Watch (Detailed Path Outputs)
  {
    userDWallTriggersThisScenario = 0;
    aiDWallTriggersThisScenario = 0;

    const userLineup = [
      createMockPlayer("u1", "User PG", ["Discipline Wall", "Arc Pressure", "Complete Engine"], ["Four-Point Bait X", "Red Dot X"]),
      createMockPlayer("u2", "User SG", ["Foul Magnet", "Power Driver", "Complete Engine"]),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = [
      createMockPlayer("ai1", "AI PG", ["Discipline Wall", "Arc Pressure", "Complete Engine"], ["Four-Point Bait X", "Red Dot X"]),
      createMockPlayer("ai2", "AI SG", ["Foul Magnet", "Power Driver", "Complete Engine"]),
      createMockPlayer("ai3", "AI SF", genericBaseSkills),
      createMockPlayer("ai4", "AI PF", genericBaseSkills),
      createMockPlayer("ai5", "AI C", genericBaseSkills),
    ];
    // Both user and AI lineups have identical skills so we can compare trigger differences
    runScenarioSimulations(userLineup, aiLineup, "Pace and Space (3PT)", 30);

    console.log("\nScenario 8: Asymmetry Watch");
    console.log(`- User Discipline Wall Triggers (defending against AI Bait): ${userDWallTriggersThisScenario}`);
    console.log(`- AI Discipline Wall Triggers (defending against User Bait): ${aiDWallTriggersThisScenario}`);
    console.log(`- User path has scaled SQ penalty; AI path has fixed -0.03 SQ penalty.`);
    console.log(`- User path has shooter and defender stamina tracking on fouls; AI path does not.`);
  }

  console.log("\nAll regression scenarios completed successfully!");
}

run().catch(console.error);
