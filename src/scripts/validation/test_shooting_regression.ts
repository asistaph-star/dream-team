/**
 * Phase LineupArchetype-1K2 — Deep Strike / Shooting Regression Simulator
 *
 * Purpose: Establish a baseline for shooting, 3PT, foul pressure, and counterplay
 * health before implementing any DEEP_STRIKE gameplay scaling.
 *
 * Scenarios:
 *   1. Baseline Balanced Lineup (Normal stats, no shooting signal stacking)
 *   2. Elite Shooter Lineup (1 Mythic Curry-like star shooter, 4 role players)
 *   3. Deep Strike Lv.1 / Bronze (3 Shooting signals)
 *   4. Deep Strike Lv.2 / Silver (5 Shooting signals)
 *   5. Deep Strike Lv.3 / Gold (7+ Shooting signals, 3+ contributors)
 *   6. Red Dot / Exposed Stress (Stacking Arc Pressure + Red Dot X)
 *   7. Four-Point Bait Stress (Stacking Red Dot X + Four-Point Bait X)
 *   8. Hybrid Shooting + Foul-Draw (Shooting + Foul-Draw signals both active)
 *   9. Counter Defense (Shooting lineup vs top perimeter / foul counters)
 *   10. Fatigued Shooter Scenario (Gold shooting lineup starting and remaining tired)
 */

import { Player } from "../../lib/types/player";
import { simulateTick, createInitialMatchState, computeEffective } from "../../lib/utils/matchEngine";
import { resolveLineupArchetypes } from "../../lib/lineup/lineupArchetypeResolver";

// ─── Metrics Interface ───

interface ShootingMetrics {
  userScore: number;
  aiScore: number;
  userFGM: number;
  userFGA: number;
  user3PM: number;
  user3PA: number;
  aiFGM: number;
  aiFGA: number;
  ai3PM: number;
  ai3PA: number;
  userFTA: number;
  aiFTA: number;
  userFTM: number;
  aiFTM: number;
  userSteals: number;
  aiSteals: number;
  userTurnovers: number;
  aiTurnovers: number;

  arcPressureTriggers: number;
  redDotTriggers: number;
  fourPointBaitTriggers: number;
  courtVisionTriggers: number;

  shadowGuardCounters: number;
  focusLockCounters: number;
  composureCounters: number;
  cleanContestCounters: number;
  disciplineWallCounters: number;
  deadAirCounters: number;

  elite3PA: number;
  elite3PM: number;
  lowestStamina: number;

  // Shot Selection tracking for Fatigued scenario
  catchAndShootCount: number;
  cornerThreeCount: number;
  stepBackThreeCount: number;
  pullUpThreeCount: number;
}

// ─── Mock Player Factory ───

function createRealisticPlayer(
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
    position: position as any,
    rarity,
    level: 1,
    maxLevel: 50,
    exp: 0,
    ovr,
    offense: 80,
    defense: 75,
    shooting: 78,
    speed: 78,
    strength: 75,
    playmaking: 78,
    baseSkills,
    specialSkillSlots,
    starLevel: 5,
    threePt: 78,
    twoPt: 78,
    freeThrow: 78,
    finishing: 78,
    rebound: 72,
    steal: 72,
    block: 70,
    onBall: 72,
    handle: 78,
    assist: 78,
    calm: 75,
    threePtTendency: 0.30,
    driveTendency: 0.35,
    pullUpTendency: 0.25,
    foulDrawTendency: 0.40,
    skillRarities: skillRarities as any,
    ...statOverrides,
  };
}

// ─── Match Analysis ───

function analyzeMatch(
  state: any,
  userRoster: Player[],
  aiRoster: Player[],
  allMatchEvents: any[],
  fatigueScenario = false
): ShootingMetrics {
  let arcPressureTriggers = 0;
  let redDotTriggers = 0;
  let fourPointBaitTriggers = 0;
  let courtVisionTriggers = 0;

  let shadowGuardCounters = 0;
  let focusLockCounters = 0;
  let composureCounters = 0;
  let cleanContestCounters = 0;
  let disciplineWallCounters = 0;
  let deadAirCounters = 0;

  let catchAndShootCount = 0;
  let cornerThreeCount = 0;
  let stepBackThreeCount = 0;
  let pullUpThreeCount = 0;

  allMatchEvents.forEach((e: any) => {
    const text = e.text || "";
    const lower = text.toLowerCase();
    
    if (text.includes("Arc Pressure creates a cleaner")) arcPressureTriggers++;
    if (text.includes("Red Dot X marks")) redDotTriggers++;
    if (text.includes("Four-Point Bait X pressures")) fourPointBaitTriggers++;
    if (text.includes("Court Vision Engine creates a rhythm bonus")) courtVisionTriggers++;
    if (text.includes("Shadow Guard cuts off")) shadowGuardCounters++;
    if (text.includes("Focus Lock contains")) focusLockCounters++;
    if (text.includes("Composure X cancels")) composureCounters++;
    if (text.includes("Clean Contest X shuts down")) cleanContestCounters++;
    if (text.includes("Discipline Wall holds off")) disciplineWallCounters++;
    if (text.includes("Dead Air X blocks")) deadAirCounters++;

    // Track shot types based on narratives
    if (lower.includes("catch and shoot") || lower.includes("catches and fires") || lower.includes("catches and shoots")) {
      catchAndShootCount++;
    }
    if (lower.includes("corner for three") || lower.includes("corner... short") || lower.includes("corner three") || lower.includes("catches in the corner")) {
      cornerThreeCount++;
    }
    if (lower.includes("step-back three") || lower.includes("step-back from deep") || lower.includes("step-back from beyond")) {
      stepBackThreeCount++;
    }
    if (lower.includes("pulls up from deep") || lower.includes("pulls up in transition") || lower.includes("stops and fires from three") || lower.includes("pull-up three")) {
      pullUpThreeCount++;
    }
  });

  let userAssists = 0, userTurnovers = 0, userSteals = 0;
  let userFGA = 0, userFGM = 0, userTPA = 0, userTPM = 0;
  let userFTA = 0, userFTM = 0;
  let aiAssists = 0, aiTurnovers = 0, aiSteals = 0;
  let aiFGA = 0, aiFGM = 0, aiTPA = 0, aiTPM = 0;
  let aiFTA = 0, aiFTM = 0;

  Object.entries(state.playerStats).forEach(([playerId, s]: [string, any]) => {
    const isUser = userRoster.some(p => p.id === playerId);
    if (isUser) {
      userAssists += s.AST ?? 0;
      userTurnovers += s.TOV ?? 0;
      userSteals += s.STL ?? 0;
      userFGM += s.FGM ?? 0;
      userFGA += s.FGA ?? 0;
      userTPM += s.TPM ?? 0;
      userTPA += s.TPA ?? 0;
      userFTA += s.FTA ?? 0;
      userFTM += s.FTM ?? 0;
    } else {
      aiAssists += s.AST ?? 0;
      aiTurnovers += s.TOV ?? 0;
      aiSteals += s.STL ?? 0;
      aiFGM += s.FGM ?? 0;
      aiFGA += s.FGA ?? 0;
      aiTPM += s.TPM ?? 0;
      aiTPA += s.TPA ?? 0;
      aiFTA += s.FTA ?? 0;
      aiFTM += s.FTM ?? 0;
    }
  });

  // Individual stats for Curry/u1
  const eliteStats = state.playerStats["u1"];
  const elite3PA = eliteStats ? (eliteStats.TPA ?? 0) : 0;
  const elite3PM = eliteStats ? (eliteStats.TPM ?? 0) : 0;

  let lowestStamina = 100;
  userRoster.forEach(p => {
    const stam = state.playerStamina[p.id] ?? 100;
    if (stam < lowestStamina) lowestStamina = stam;
  });

  return {
    userScore: state.userScore,
    aiScore: state.aiScore,
    userFGM, userFGA, user3PM: userTPM, user3PA: userTPA,
    aiFGM, aiFGA, ai3PM: aiTPM, ai3PA: aiTPA,
    userFTA, aiFTA, userFTM, aiFTM,
    userSteals, aiSteals, userTurnovers, aiTurnovers,
    arcPressureTriggers, redDotTriggers, fourPointBaitTriggers, courtVisionTriggers,
    shadowGuardCounters, focusLockCounters, composureCounters, cleanContestCounters, disciplineWallCounters, deadAirCounters,
    elite3PA, elite3PM, lowestStamina,
    catchAndShootCount, cornerThreeCount, stepBackThreeCount, pullUpThreeCount
  };
}

// ─── Simulation Runner ───

function runScenario(
  userLineup: Player[],
  aiLineup: Player[],
  userStrategy = "Motion Offense",
  aiStrategy = "Motion Offense",
  numMatches = 30,
  fatigueScenario = false
): ShootingMetrics[] {
  const results: ShootingMetrics[] = [];
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
    state.userOffStrategy = userStrategy;
    state.userDefStrategy = "Man-to-Man";
    state.aiOffStrategy = aiStrategy;
    state.aiDefStrategy = "Man-to-Man";
    state.userPlayerIds = allUserRoster.map(p => p.id);
    state.aiPlayerIds = aiLineup.map(p => p.id);
    state.aiLineupIds = aiLineup.map(p => p.id);

    allUserRoster.forEach(p => { state.playerStamina[p.id] = fatigueScenario ? 20 : 100; });
    aiLineup.forEach(p => { state.playerStamina[p.id] = 100; });

    let ticks = 0;
    let halftimeTriggered = false;
    const allMatchEvents: any[] = [...state.events];

    while (!state.isFinished && ticks < 400) {
      if (state.halftimeShown && !halftimeTriggered && !fatigueScenario) {
        halftimeTriggered = true;
        allUserRoster.forEach(p => {
          state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30);
        });
        aiLineup.forEach(p => {
          state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30);
        });
      }

      if (fatigueScenario) {
        // Enforce fatigue on every tick
        allUserRoster.forEach(p => { state.playerStamina[p.id] = Math.max(5, Math.min(25, state.playerStamina[p.id])); });
      }

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;

      const prevStateEvents = state.events;
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      const newEventsThisTick = state.events.filter(e => !prevStateEvents.some(pe => pe.id === e.id));
      allMatchEvents.push(...newEventsThisTick);

      ticks++;
    }

    results.push(analyzeMatch(state, allUserRoster, aiLineup, allMatchEvents, fatigueScenario));
  }

  return results;
}

// ─── Averages ───

function computeAverages(metrics: ShootingMetrics[]) {
  const sum = {
    userScore: 0, aiScore: 0,
    userFGM: 0, userFGA: 0, user3PM: 0, user3PA: 0,
    aiFGM: 0, aiFGA: 0, ai3PM: 0, ai3PA: 0,
    userFTA: 0, aiFTA: 0, userFTM: 0, aiFTM: 0,
    userSteals: 0, aiSteals: 0, userTurnovers: 0, aiTurnovers: 0,
    arcPressureTriggers: 0, redDotTriggers: 0, fourPointBaitTriggers: 0, courtVisionTriggers: 0,
    shadowGuardCounters: 0, focusLockCounters: 0, composureCounters: 0, cleanContestCounters: 0, disciplineWallCounters: 0, deadAirCounters: 0,
    elite3PA: 0, elite3PM: 0, lowestStamina: 0,
    catchAndShootCount: 0, cornerThreeCount: 0, stepBackThreeCount: 0, pullUpThreeCount: 0
  };

  metrics.forEach(m => {
    sum.userScore += m.userScore;
    sum.aiScore += m.aiScore;
    sum.userFGM += m.userFGM;
    sum.userFGA += m.userFGA;
    sum.user3PM += m.user3PM;
    sum.user3PA += m.user3PA;
    sum.aiFGM += m.aiFGM;
    sum.aiFGA += m.aiFGA;
    sum.ai3PM += m.ai3PM;
    sum.ai3PA += m.ai3PA;
    sum.userFTA += m.userFTA;
    sum.aiFTA += m.aiFTA;
    sum.userFTM += m.userFTM;
    sum.aiFTM += m.aiFTM;
    sum.userSteals += m.userSteals;
    sum.aiSteals += m.aiSteals;
    sum.userTurnovers += m.userTurnovers;
    sum.aiTurnovers += m.aiTurnovers;
    sum.arcPressureTriggers += m.arcPressureTriggers;
    sum.redDotTriggers += m.redDotTriggers;
    sum.fourPointBaitTriggers += m.fourPointBaitTriggers;
    sum.courtVisionTriggers += m.courtVisionTriggers;
    sum.shadowGuardCounters += m.shadowGuardCounters;
    sum.focusLockCounters += m.focusLockCounters;
    sum.composureCounters += m.composureCounters;
    sum.cleanContestCounters += m.cleanContestCounters;
    sum.disciplineWallCounters += m.disciplineWallCounters;
    sum.deadAirCounters += m.deadAirCounters;
    sum.elite3PA += m.elite3PA;
    sum.elite3PM += m.elite3PM;
    sum.lowestStamina += m.lowestStamina;
    sum.catchAndShootCount += m.catchAndShootCount;
    sum.cornerThreeCount += m.cornerThreeCount;
    sum.stepBackThreeCount += m.stepBackThreeCount;
    sum.pullUpThreeCount += m.pullUpThreeCount;
  });

  const count = metrics.length;
  return {
    combinedScore: (sum.userScore + sum.aiScore) / count,
    userScore: sum.userScore / count,
    aiScore: sum.aiScore / count,
    userFG: (sum.userFGM / Math.max(1, sum.userFGA)) * 100,
    user3P: (sum.user3PM / Math.max(1, sum.user3PA)) * 100,
    user3PA: sum.user3PA / count,
    aiFG: (sum.aiFGM / Math.max(1, sum.aiFGA)) * 100,
    ai3P: (sum.ai3PM / Math.max(1, sum.ai3PA)) * 100,
    ai3PA: sum.ai3PA / count,
    userFTA: sum.userFTA / count,
    aiFTA: sum.aiFTA / count,
    userTurnovers: sum.userTurnovers / count,
    aiTurnovers: sum.aiTurnovers / count,
    userSteals: sum.userSteals / count,
    aiSteals: sum.aiSteals / count,
    arcPressureTriggers: sum.arcPressureTriggers / count,
    redDotTriggers: sum.redDotTriggers / count,
    fourPointBaitTriggers: sum.fourPointBaitTriggers / count,
    courtVisionTriggers: sum.courtVisionTriggers / count,
    shadowGuardCounters: sum.shadowGuardCounters / count,
    focusLockCounters: sum.focusLockCounters / count,
    composureCounters: sum.composureCounters / count,
    cleanContestCounters: sum.cleanContestCounters / count,
    disciplineWallCounters: sum.disciplineWallCounters / count,
    deadAirCounters: sum.deadAirCounters / count,
    elite3P: (sum.elite3PM / Math.max(1, sum.elite3PA)) * 100,
    elite3PA: sum.elite3PA / count,
    lowestStamina: sum.lowestStamina / count,
    catchAndShootCount: sum.catchAndShootCount / count,
    cornerThreeCount: sum.cornerThreeCount / count,
    stepBackThreeCount: sum.stepBackThreeCount / count,
    pullUpThreeCount: sum.pullUpThreeCount / count
  };
}

// ─── Printer ───

function printAverages(scenarioName: string, avg: ReturnType<typeof computeAverages>) {
  console.log(`\n==================================================`);
  console.log(`SCENARIO: ${scenarioName}`);
  console.log(`==================================================`);
  console.log(`Average Combined Score: ${avg.combinedScore.toFixed(1)} (User ${avg.userScore.toFixed(1)} - ${avg.aiScore.toFixed(1)} AI)`);
  console.log(`3PT Attempts per Game: User ${avg.user3PA.toFixed(1)} | AI ${avg.ai3PA.toFixed(1)}`);
  console.log(`FG% / 3PT%:`);
  console.log(`  - User: FG% ${avg.userFG.toFixed(1)}% | 3PT% ${avg.user3P.toFixed(1)}%`);
  console.log(`  - AI:   FG% ${avg.aiFG.toFixed(1)}% | 3PT% ${avg.ai3P.toFixed(1)}%`);
  console.log(`Free Throw Attempts (FTA): User ${avg.userFTA.toFixed(1)} | AI ${avg.aiFTA.toFixed(1)}`);
  if (avg.elite3PA > 0) {
    console.log(`Elite Shooter: 3PT% ${avg.elite3P.toFixed(1)}% (${avg.elite3PA.toFixed(1)} 3PA/game)`);
  }
  console.log(`Turnovers / Steals per Team:`);
  console.log(`  - User: ${avg.userTurnovers.toFixed(1)} TOV | ${avg.userSteals.toFixed(1)} STL`);
  console.log(`  - AI:   ${avg.aiTurnovers.toFixed(1)} TOV | ${avg.aiSteals.toFixed(1)} STL`);
  console.log(`Lowest User Stamina: ${avg.lowestStamina.toFixed(1)}%`);
  console.log(`Trigger counts:`);
  console.log(`  - Arc Pressure: ${avg.arcPressureTriggers.toFixed(2)}`);
  console.log(`  - Red Dot (Exposed): ${avg.redDotTriggers.toFixed(2)}`);
  console.log(`  - Four-Point Bait: ${avg.fourPointBaitTriggers.toFixed(2)}`);
  console.log(`  - COURT_VISION: ${avg.courtVisionTriggers.toFixed(2)}`);
  
  if (avg.shadowGuardCounters > 0 || avg.focusLockCounters > 0 || avg.composureCounters > 0 || avg.cleanContestCounters > 0 || avg.disciplineWallCounters > 0 || avg.deadAirCounters > 0) {
    console.log(`Counter triggers:`);
    console.log(`  - Shadow Guard: ${avg.shadowGuardCounters.toFixed(2)}`);
    console.log(`  - Focus Lock: ${avg.focusLockCounters.toFixed(2)}`);
    console.log(`  - Composure Cancel: ${avg.composureCounters.toFixed(2)}`);
    console.log(`  - Clean Contest Cancel: ${avg.cleanContestCounters.toFixed(2)}`);
    console.log(`  - Discipline Wall holds: ${avg.disciplineWallCounters.toFixed(2)}`);
    console.log(`  - Dead Air blocks: ${avg.deadAirCounters.toFixed(2)}`);
  }

  if (avg.catchAndShootCount > 0 || avg.cornerThreeCount > 0 || avg.stepBackThreeCount > 0 || avg.pullUpThreeCount > 0) {
    console.log(`3PT Shot Selection:`);
    console.log(`  - Catch & Shoot: ${avg.catchAndShootCount.toFixed(1)}`);
    console.log(`  - Corner 3s: ${avg.cornerThreeCount.toFixed(1)}`);
    console.log(`  - Stepback 3s: ${avg.stepBackThreeCount.toFixed(1)}`);
    console.log(`  - Pull-up 3s: ${avg.pullUpThreeCount.toFixed(1)}`);
  }

  // ─── Guardrail Warnings ───
  let warningsCount = 0;
  if (avg.user3PA > 28) {
    console.warn(`⚠️  WARNING: User 3PT attempts above 28 (${avg.user3PA.toFixed(1)}) — Pace spike risk`);
    warningsCount++;
  }
  if (avg.user3P > 38) {
    console.warn(`⚠️  WARNING: User 3PT% above 38% (${avg.user3P.toFixed(1)}%) — 3PT explosion risk`);
    warningsCount++;
  }
  if (avg.elite3PA > 0 && avg.elite3P > 42) {
    console.warn(`⚠️  WARNING: Elite individual 3PT% above 42% (${avg.elite3P.toFixed(1)}%) — automatic shooter risk`);
    warningsCount++;
  }
  if (avg.userFTA > 28) {
    console.warn(`⚠️  WARNING: User FTA above 28 (${avg.userFTA.toFixed(1)}) — shooting foul spike risk`);
    warningsCount++;
  }
  if (avg.combinedScore > 230) {
    console.warn(`⚠️  WARNING: Combined score above 230 (${avg.combinedScore.toFixed(1)}) — scoring spike risk`);
    warningsCount++;
  }
  
  if (warningsCount === 0) {
    console.log(`✅ All shooting and score metrics within safe bounds.`);
  }
}

// ─── Archetype Check Helper ───

function printArchetypeLevel(lineup: Player[], label: string) {
  const summary = resolveLineupArchetypes(lineup);
  const shooting = summary.allResults.find(r => r.id === "shooting");
  const foulDraw = summary.allResults.find(r => r.id === "foul-draw");
  if (shooting) {
    console.log(`  ${label} Shooting Level: ${shooting.level} (${shooting.levelLabel}) — ${shooting.signalCount} signals, ${shooting.contributingPlayers.length} contributors`);
  }
  if (foulDraw) {
    console.log(`  ${label} Foul-Draw Level: ${foulDraw.level} (${foulDraw.levelLabel}) — ${foulDraw.signalCount} signals, ${foulDraw.contributingPlayers.length} contributors`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ROSTER DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

// Generic balanced AI opponent
const genericAI = () => [
  createRealisticPlayer("ai1", "AI PG", "PG", "Rare", 84, ["Shadow Guard", "Hands Active", "Discipline Wall"], [], { offense: 82, defense: 80, shooting: 80, speed: 82, playmaking: 82, handle: 80, assist: 78 }),
  createRealisticPlayer("ai2", "AI SG", "SG", "Rare", 84, ["Shadow Guard", "Focus Lock", "Discipline Wall"], [], { offense: 82, defense: 78, shooting: 84, speed: 80, playmaking: 76, handle: 78, assist: 74 }),
  createRealisticPlayer("ai3", "AI SF", "SF", "Rare", 84, ["Shadow Guard", "Discipline Wall", "Paint Barrier"], [], { offense: 80, defense: 82, shooting: 80, speed: 78, playmaking: 74, handle: 74, assist: 72 }),
  createRealisticPlayer("ai4", "AI PF", "PF", "Rare", 84, ["Rim Warden", "Paint Barrier", "Discipline Wall"], [], { offense: 78, defense: 84, shooting: 74, speed: 74, strength: 86, playmaking: 68, rebound: 82, block: 80 }),
  createRealisticPlayer("ai5", "AI C", "C", "Rare", 84, ["Rim Warden", "Paint Barrier", "Iron Motor"], [], { offense: 76, defense: 86, shooting: 68, speed: 68, strength: 90, playmaking: 62, rebound: 88, block: 86 }),
];

// Stacking Counter Defense AI
const counterDefenseAI = () => [
  createRealisticPlayer("ai1", "Def PG", "PG", "Legendary", 90, ["Shadow Guard", "Focus Lock", "Hands Active"], ["CLEAN_CHALLENGE"], { offense: 76, defense: 90, speed: 85, onBall: 90, steal: 88 }, { "CLEAN_CHALLENGE": "Legendary" }),
  createRealisticPlayer("ai2", "Def SG", "SG", "Legendary", 89, ["Shadow Guard", "Focus Lock", "Discipline Wall"], ["COMPOSURE_SHIELD"], { offense: 76, defense: 88, speed: 84, onBall: 88, steal: 86 }, { "COMPOSURE_SHIELD": "Legendary" }),
  createRealisticPlayer("ai3", "Def SF", "SF", "Epic", 86, ["Shadow Guard", "Discipline Wall", "Focus Lock"], [], { offense: 78, defense: 86, speed: 80, onBall: 84 }),
  createRealisticPlayer("ai4", "Def PF", "PF", "Epic", 86, ["Discipline Wall", "Rim Warden", "Paint Barrier"], [], { offense: 76, defense: 86, strength: 88, rebound: 84, block: 84 }),
  createRealisticPlayer("ai5", "Def C", "C", "Epic", 85, ["Rim Warden", "Paint Barrier", "Iron Motor"], [], { offense: 72, defense: 88, strength: 92, rebound: 88, block: 88 }),
];

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function run() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("DEEP STRIKE / SHOOTING REGRESSION SIMULATOR — Phase 1K2");
  console.log("════════════════════════════════════════════════════════════════");
  console.log("30 matches per scenario. No gameplay code modified.\n");

  // Scenario 1: Baseline Balanced Lineup
  {
    console.log("\n── Scenario 1: Baseline Balanced Lineup ──");
    console.log("Balanced players, no Deep Strike shooting signals.");
    const userLineup = [
      createRealisticPlayer("u1", "PG", "PG", "Rare", 84, ["Paint Magnet", "Foul Magnet", "Complete Engine"]),
      createRealisticPlayer("u2", "SG", "SG", "Rare", 84, ["Paint Magnet", "Rim Warden", "Iron Motor"]),
      createRealisticPlayer("u3", "SF", "SF", "Rare", 84, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u4", "PF", "PF", "Rare", 84, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u5", "C", "C", "Rare", 84, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
    ];
    printArchetypeLevel(userLineup, "S1");
    const metrics = runScenario(userLineup, genericAI(), "Motion Offense", "Motion Offense");
    printAverages("1. Baseline Balanced Lineup", computeAverages(metrics));
  }

  // Scenario 2: Elite Shooter Lineup
  {
    console.log("\n── Scenario 2: Elite Shooter Lineup ──");
    console.log("1 Mythic PG with 99 Shooting / 99 ThreePt, Red Dot X + Four-Point Bait X.");
    const userLineup = [
      createRealisticPlayer("u1", "Elite Shooter", "PG", "Mythic", 95,
        ["Arc Pressure", "Mismatch Caller", "Complete Engine"],
        ["Red Dot X", "Four-Point Bait X"],
        { offense: 95, defense: 70, shooting: 99, threePt: 99, playmaking: 92, assist: 90 },
        { "Red Dot X": "Epic", "Four-Point Bait X": "Epic" }
      ),
      createRealisticPlayer("u2", "SG", "SG", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u3", "SF", "SF", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u4", "PF", "PF", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u5", "C", "C", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
    ];
    printArchetypeLevel(userLineup, "S2");
    const metrics = runScenario(userLineup, genericAI(), "5-Out Spacing", "Motion Offense");
    printAverages("2. Elite Shooter Lineup (5-Out Spacing)", computeAverages(metrics));
  }

  // Scenario 3: Deep Strike Lv.1 / Bronze
  {
    console.log("\n── Scenario 3: Deep Strike Lv.1 / Bronze ──");
    console.log("3 Shooting signals active (Tempo Surgeon, Arc Pressure, Position Flex).");
    const userLineup = [
      createRealisticPlayer("u1", "Shooter PG", "PG", "Rare", 84, ["Tempo Surgeon", "Shadow Guard", "Iron Motor"]),
      createRealisticPlayer("u2", "Shooter SG", "SG", "Rare", 84, ["Arc Pressure", "Shadow Guard", "Iron Motor"]),
      createRealisticPlayer("u3", "Shooter SF", "SF", "Rare", 84, ["Position Flex", "Shadow Guard", "Iron Motor"]),
      createRealisticPlayer("u4", "PF", "PF", "Rare", 84, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u5", "C", "C", "Rare", 84, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
    ];
    printArchetypeLevel(userLineup, "S3");
    const metrics = runScenario(userLineup, genericAI(), "Outside Shoot", "Motion Offense");
    printAverages("3. Deep Strike Lv.1 / Bronze", computeAverages(metrics));
  }

  // Scenario 4: Deep Strike Lv.2 / Silver
  {
    console.log("\n── Scenario 4: Deep Strike Lv.2 / Silver ──");
    console.log("5 Shooting signals active.");
    const userLineup = [
      createRealisticPlayer("u1", "Shooter PG", "PG", "Epic", 86, ["Tempo Surgeon", "Connector Hub", "Iron Motor"]),
      createRealisticPlayer("u2", "Shooter SG", "SG", "Epic", 86, ["Arc Pressure", "Mismatch Caller", "Iron Motor"]),
      createRealisticPlayer("u3", "Shooter SF", "SF", "Epic", 86, ["Position Flex", "Shadow Guard", "Iron Motor"]),
      createRealisticPlayer("u4", "PF", "PF", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u5", "C", "C", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
    ];
    printArchetypeLevel(userLineup, "S4");
    const metrics = runScenario(userLineup, genericAI(), "Outside Shoot", "Motion Offense");
    printAverages("4. Deep Strike Lv.2 / Silver", computeAverages(metrics));
  }

  // Scenario 5: Deep Strike Lv.3 / Gold
  {
    console.log("\n── Scenario 5: Deep Strike Lv.3 / Gold ──");
    console.log("7+ Shooting signals and 3+ contributors active.");
    const userLineup = [
      createRealisticPlayer("u1", "Shooter PG", "PG", "Epic", 87, ["Tempo Surgeon", "Connector Hub", "Complete Engine"]),
      createRealisticPlayer("u2", "Shooter SG", "SG", "Epic", 87, ["Arc Pressure", "Mismatch Caller", "Tempo Switch"]),
      createRealisticPlayer("u3", "Shooter SF", "SF", "Epic", 87, ["Position Flex", "Shadow Guard", "Iron Motor"]),
      createRealisticPlayer("u4", "Shooter PF", "PF", "Rare", 82, ["Arc Pressure", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u5", "C", "C", "Rare", 82, ["Complete Engine", "Paint Barrier", "Iron Motor"]),
    ];
    printArchetypeLevel(userLineup, "S5");
    const metrics = runScenario(userLineup, genericAI(), "Outside Shoot", "Motion Offense");
    printAverages("5. Deep Strike Lv.3 / Gold", computeAverages(metrics));
  }

  // Scenario 6: Red Dot / Exposed Stress
  {
    console.log("\n── Scenario 6: Red Dot / Exposed Stress ──");
    console.log("Arc Pressure + Red Dot X stacked on multiple players.");
    const userLineup = [
      createRealisticPlayer("u1", "Shooter PG", "PG", "Epic", 87, ["Arc Pressure", "Mismatch Caller", "Complete Engine"], ["Red Dot X"]),
      createRealisticPlayer("u2", "Shooter SG", "SG", "Epic", 87, ["Arc Pressure", "Mismatch Caller", "Complete Engine"], ["Red Dot X"]),
      createRealisticPlayer("u3", "Role SF", "SF", "Rare", 82, ["Shadow Guard", "Discipline Wall", "Iron Motor"]),
      createRealisticPlayer("u4", "Role PF", "PF", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u5", "Role C", "C", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
    ];
    printArchetypeLevel(userLineup, "S6");
    const metrics = runScenario(userLineup, genericAI(), "Outside Shoot", "Motion Offense");
    printAverages("6. Red Dot / Exposed Stress", computeAverages(metrics));
  }

  // Scenario 7: Four-Point Bait Stress
  {
    console.log("\n── Scenario 7: Four-Point Bait Stress ──");
    console.log("Red Dot X + Four-Point Bait X stacked on multiple shooters.");
    const userLineup = [
      createRealisticPlayer("u1", "Shooter PG", "PG", "Legendary", 90, ["Arc Pressure", "Complete Engine", "Mismatch Caller"], ["Red Dot X", "Four-Point Bait X"], {}, { "Red Dot X": "Legendary", "Four-Point Bait X": "Legendary" }),
      createRealisticPlayer("u2", "Shooter SG", "SG", "Legendary", 90, ["Arc Pressure", "Complete Engine", "Mismatch Caller"], ["Red Dot X", "Four-Point Bait X"], {}, { "Red Dot X": "Legendary", "Four-Point Bait X": "Legendary" }),
      createRealisticPlayer("u3", "Role SF", "SF", "Rare", 82, ["Shadow Guard", "Discipline Wall", "Iron Motor"]),
      createRealisticPlayer("u4", "Role PF", "PF", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u5", "Role C", "C", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
    ];
    printArchetypeLevel(userLineup, "S7");
    const metrics = runScenario(userLineup, genericAI(), "Outside Shoot", "Motion Offense");
    printAverages("7. Four-Point Bait Stress", computeAverages(metrics));
  }

  // Scenario 8: Hybrid Shooting + Foul-Draw
  {
    console.log("\n── Scenario 8: Hybrid Shooting + Foul-Draw ──");
    console.log("Both Deep Strike and Foul-Draw signals active.");
    const userLineup = [
      createRealisticPlayer("u1", "Star PG", "PG", "Legendary", 90,
        ["Tempo Surgeon", "Complete Engine", "Foul Magnet"],
        ["Red Dot X", "Four-Point Bait X"], {}, { "Red Dot X": "Epic", "Four-Point Bait X": "Epic" }
      ),
      createRealisticPlayer("u2", "Star SG", "SG", "Legendary", 89,
        ["Mismatch Caller", "Arc Pressure", "Foul Magnet"],
        ["Flop X"], {}, { "Flop X": "Epic" }
      ),
      createRealisticPlayer("u3", "Role SF", "SF", "Epic", 86,
        ["Power Driver", "Shadow Guard", "Focus Lock"]
      ),
      createRealisticPlayer("u4", "Role PF", "PF", "Rare", 82,
        ["Paint Magnet", "Paint Barrier", "Iron Motor"]
      ),
      createRealisticPlayer("u5", "Role C", "C", "Rare", 82,
        ["Rim Warden", "Paint Barrier", "Iron Motor"]
      ),
    ];
    printArchetypeLevel(userLineup, "S8");
    const metrics = runScenario(userLineup, genericAI(), "Outside Shoot", "Motion Offense");
    printAverages("8. Hybrid Shooting + Foul-Draw Lineup", computeAverages(metrics));
  }

  // Scenario 9: Counter Defense
  {
    console.log("\n── Scenario 9: Counter Defense ──");
    console.log("Shooting Lineup (S7) vs Counter Defense AI (3-2 Zone).");
    const userLineup = [
      createRealisticPlayer("u1", "Shooter PG", "PG", "Legendary", 90, ["Arc Pressure", "Complete Engine", "Mismatch Caller"], ["Red Dot X", "Four-Point Bait X"], {}, { "Red Dot X": "Legendary", "Four-Point Bait X": "Legendary" }),
      createRealisticPlayer("u2", "Shooter SG", "SG", "Legendary", 90, ["Arc Pressure", "Complete Engine", "Mismatch Caller"], ["Red Dot X", "Four-Point Bait X"], {}, { "Red Dot X": "Legendary", "Four-Point Bait X": "Legendary" }),
      createRealisticPlayer("u3", "Role SF", "SF", "Rare", 82, ["Shadow Guard", "Discipline Wall", "Iron Motor"]),
      createRealisticPlayer("u4", "Role PF", "PF", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u5", "Role C", "C", "Rare", 82, ["Rim Warden", "Paint Barrier", "Iron Motor"]),
    ];
    printArchetypeLevel(userLineup, "S9");
    const metrics = runScenario(userLineup, counterDefenseAI(), "Outside Shoot", "3-2 Zone");
    printAverages("9. Counter Defense (3-2 Zone)", computeAverages(metrics));
  }

  // Scenario 10: Fatigued Shooter Scenario
  {
    console.log("\n── Scenario 10: Fatigued Shooter Scenario ──");
    console.log("Gold Shooting Lineup (S5) starting and remaining tired (stamina forced < 25%).");
    const userLineup = [
      createRealisticPlayer("u1", "Shooter PG", "PG", "Epic", 87, ["Tempo Surgeon", "Connector Hub", "Complete Engine"]),
      createRealisticPlayer("u2", "Shooter SG", "SG", "Epic", 87, ["Arc Pressure", "Mismatch Caller", "Tempo Switch"]),
      createRealisticPlayer("u3", "Shooter SF", "SF", "Epic", 87, ["Position Flex", "Shadow Guard", "Iron Motor"]),
      createRealisticPlayer("u4", "Shooter PF", "PF", "Rare", 82, ["Arc Pressure", "Paint Barrier", "Iron Motor"]),
      createRealisticPlayer("u5", "C", "C", "Rare", 82, ["Complete Engine", "Paint Barrier", "Iron Motor"]),
    ];
    printArchetypeLevel(userLineup, "S10");
    const metrics = runScenario(userLineup, genericAI(), "Outside Shoot", "Motion Offense", 30, true);
    printAverages("10. Fatigued Shooter Scenario", computeAverages(metrics));
  }

  console.log("\n\n════════════════════════════════════════════════════════════════");
  console.log("REGRESSION RUN COMPLETE — Review metrics and warning statuses.");
  console.log("════════════════════════════════════════════════════════════════");
}

run().catch(console.error);
