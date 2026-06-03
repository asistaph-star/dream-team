import { Player } from "../../lib/types/player";
import { simulateTick, createInitialMatchState, computeEffective } from "../../lib/utils/matchEngine";
import { resolveLineupArchetypes } from "../../lib/lineup/lineupArchetypeResolver";
import { getSpecialSkillsForMechanic } from "../../lib/skills/skillMechanics";
import { getBestSpecialSkillForMechanic, getSpecialSkillQuality, getTriggerBoost } from "../../lib/skills/skillResolver";
import { SPECIAL_SKILL_RATES, getSkillQualityRate } from "../../lib/skills/skillCatalog";
import { SpecialSkillName } from "../../lib/skills/assignBaseSkills";
import { getCalmRating, getStaminaRating, getAssistRating } from "../../lib/utils/playerIdentity";

interface MatchMetrics {
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
  userAssists: number;
  aiAssists: number;
  userTurnovers: number;
  aiTurnovers: number;
  userSteals: number;
  aiSteals: number;
  
  // Stamina logs
  qStaminaLogs: Record<number, number[]>; // Quarter -> [u4_stamina, u5_stamina]
  lowestStamina: number;

  // Triggers
  connectorHubTriggers: number;
  shareRhythmTriggers: number;
  tempoSurgeonTriggers: number;
  courtVisionTriggers: number;
  benchCaptainTriggers: number;
  timeoutResetTriggers: number;
  completeEngineActiveCount: number; // calculated from ticks where Complete Engine is on court with >=40% stamina
}

// Helper to create mock players
function createMockPlayer(
  id: string,
  name: string,
  baseSkills: [string, string, string],
  specialSkillSlots: (string | null)[] = [],
  ovr = 90,
  overrides: Partial<Player> = {}
): Player {
  let position = "SF";
  if (id.endsWith("1")) position = "PG";
  if (id.endsWith("2")) position = "SG";
  if (id.endsWith("3")) position = "SF";
  if (id.endsWith("4")) position = "PF";
  if (id.endsWith("5")) position = "C";

  return {
    id,
    name,
    position: position as any,
    rarity: "Common",
    level: 1,
    maxLevel: 50,
    exp: 0,
    ovr,
    offense: 80,
    defense: 80,
    shooting: 80,
    speed: 80,
    strength: 80,
    playmaking: 80,
    baseSkills,
    specialSkillSlots,
    starLevel: 5,
    threePt: 80,
    twoPt: 80,
    freeThrow: 80,
    finishing: 80,
    rebound: 80,
    steal: 80,
    block: 80,
    onBall: 80,
    handle: 80,
    assist: 80,
    calm: 80,
    threePtTendency: 0.35,
    driveTendency: 0.35,
    pullUpTendency: 0.25,
    foulDrawTendency: 0.45,
    skillRarities: {
      "COURT_VISION_ENGINE": "Legendary",
      "BENCH_CAPTAIN": "Legendary",
      "TIMEOUT_RESET": "Legendary",
      "GAMEPLAN_JAMMER": "Legendary",
    },
    ...overrides
  };
}

function analyzeMatch(
  state: any,
  userRoster: Player[],
  aiRoster: Player[],
  staminaLogs: Record<number, number[]>,
  completeEngineActiveCount: number,
  allMatchEvents: any[]
): MatchMetrics {
  let connectorHubTriggers = 0;
  let shareRhythmTriggers = 0;
  let tempoSurgeonTriggers = 0;
  let courtVisionTriggers = 0;
  let benchCaptainTriggers = 0;
  let timeoutResetTriggers = 0;

  allMatchEvents.forEach((e: any) => {
    const text = e.text || "";
    if (text.includes("Connector Hub restores")) {
      connectorHubTriggers++;
    }
    if (text.includes("Share Rhythm steadies the lineup")) {
      shareRhythmTriggers++;
    }
    if (text.includes("Tempo Surgeon creates a cleaner offensive read")) {
      tempoSurgeonTriggers++;
    }
    if (text.includes("Court Vision Engine creates a rhythm bonus")) {
      courtVisionTriggers++;
    }
    if (text.includes("Bench Captain stabilizes")) {
      benchCaptainTriggers++;
    }
    if (text.includes("Cold Timeout X")) {
      timeoutResetTriggers++;
    }
  });

  let userAssists = 0;
  let userTurnovers = 0;
  let userSteals = 0;
  let userFGA = 0;
  let userFGM = 0;
  let userTPA = 0;
  let userTPM = 0;

  let aiAssists = 0;
  let aiTurnovers = 0;
  let aiSteals = 0;
  let aiFGA = 0;
  let aiFGM = 0;
  let aiTPA = 0;
  let aiTPM = 0;

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
    } else {
      aiAssists += s.AST ?? 0;
      aiTurnovers += s.TOV ?? 0;
      aiSteals += s.STL ?? 0;
      aiFGM += s.FGM ?? 0;
      aiFGA += s.FGA ?? 0;
      aiTPM += s.TPM ?? 0;
      aiTPA += s.TPA ?? 0;
    }
  });

  const u4Stam = state.playerStamina["u4"] ?? 100;
  const u5Stam = state.playerStamina["u5"] ?? 100;

  return {
    userScore: state.userScore,
    aiScore: state.aiScore,
    userFGM,
    userFGA,
    user3PM: userTPM,
    user3PA: userTPA,
    aiFGM,
    aiFGA,
    ai3PM: aiTPM,
    ai3PA: aiTPA,
    userAssists,
    aiAssists,
    userTurnovers,
    aiTurnovers,
    userSteals,
    aiSteals,
    qStaminaLogs: staminaLogs,
    lowestStamina: Math.min(u4Stam, u5Stam),
    connectorHubTriggers,
    shareRhythmTriggers,
    tempoSurgeonTriggers,
    courtVisionTriggers,
    benchCaptainTriggers,
    timeoutResetTriggers,
    completeEngineActiveCount
  };
}

function runScenarioSimulations(
  userLineup: Player[],
  aiLineup: Player[],
  userStrategy = "Motion Offense",
  aiStrategy = "Motion Offense",
  numMatches = 25
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
    state.userOffStrategy = userStrategy;
    state.userDefStrategy = "Man-to-Man";
    state.aiOffStrategy = aiStrategy;
    state.aiDefStrategy = "Man-to-Man";
    state.userPlayerIds = allUserRoster.map(p => p.id);
    state.aiPlayerIds = aiLineup.map(p => p.id);
    state.aiLineupIds = aiLineup.map(p => p.id);

    allUserRoster.forEach(p => {
      state.playerStamina[p.id] = 100;
    });
    aiLineup.forEach(p => {
      state.playerStamina[p.id] = 100;
    });

    let ticks = 0;
    let halftimeTriggered = false;
    let prevQuarter = 1;
    const staminaLogs: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };
    let completeEngineTicks = 0;
    const allMatchEvents: any[] = [...state.events];

    while (!state.isFinished && ticks < 400) {
      if (state.quarter > prevQuarter) {
        staminaLogs[prevQuarter] = [
          state.playerStamina["u4"] ?? 100,
          state.playerStamina["u5"] ?? 100
        ];
        prevQuarter = state.quarter;
      }

      if (state.halftimeShown && !halftimeTriggered) {
        halftimeTriggered = true;
        allUserRoster.forEach(p => {
          state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30);
        });
        aiLineup.forEach(p => {
          state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30);
        });
      }

      // Check Complete Engine active criteria
      const hasCompleteEngine = userLineup.some(p => {
        const baseStam = 100;
        const currentStam = state.playerStamina[p.id] ?? baseStam;
        const pct = (currentStam / baseStam) * 100;
        return p.baseSkills?.includes("Complete Engine") && pct >= 40;
      });
      if (hasCompleteEngine) {
        completeEngineTicks++;
      }

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;


      const prevStateEvents = state.events;
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      const newEventsThisTick = state.events.filter(e => !prevStateEvents.some(pe => pe.id === e.id));
      allMatchEvents.push(...newEventsThisTick);
      ticks++;
    }


    staminaLogs[4] = [
      state.playerStamina["u4"] ?? 100,
      state.playerStamina["u5"] ?? 100
    ];

    results.push(analyzeMatch(state, allUserRoster, aiLineup, staminaLogs, completeEngineTicks, allMatchEvents));
  }

  return results;
}

function computeAverages(metrics: MatchMetrics[]) {
  const sum = {
    userScore: 0,
    aiScore: 0,
    userFGM: 0,
    userFGA: 0,
    user3PM: 0,
    user3PA: 0,
    aiFGM: 0,
    aiFGA: 0,
    ai3PM: 0,
    ai3PA: 0,
    userAssists: 0,
    aiAssists: 0,
    userTurnovers: 0,
    aiTurnovers: 0,
    userSteals: 0,
    aiSteals: 0,
    lowestStamina: 0,
    connectorHubTriggers: 0,
    shareRhythmTriggers: 0,
    tempoSurgeonTriggers: 0,
    courtVisionTriggers: 0,
    benchCaptainTriggers: 0,
    timeoutResetTriggers: 0,
    completeEngineActiveTicks: 0,
    q1Stamina: [0, 0],
    q2Stamina: [0, 0],
    q3Stamina: [0, 0],
    q4Stamina: [0, 0],
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
    sum.userAssists += m.userAssists;
    sum.aiAssists += m.aiAssists;
    sum.userTurnovers += m.userTurnovers;
    sum.aiTurnovers += m.aiTurnovers;
    sum.userSteals += m.userSteals;
    sum.aiSteals += m.aiSteals;
    sum.lowestStamina += m.lowestStamina;
    
    sum.connectorHubTriggers += m.connectorHubTriggers;
    sum.shareRhythmTriggers += m.shareRhythmTriggers;
    sum.tempoSurgeonTriggers += m.tempoSurgeonTriggers;
    sum.courtVisionTriggers += m.courtVisionTriggers;
    sum.benchCaptainTriggers += m.benchCaptainTriggers;
    sum.timeoutResetTriggers += m.timeoutResetTriggers;
    sum.completeEngineActiveTicks += m.completeEngineActiveCount;

    sum.q1Stamina[0] += m.qStaminaLogs[1]?.[0] ?? 100;
    sum.q1Stamina[1] += m.qStaminaLogs[1]?.[1] ?? 100;
    sum.q2Stamina[0] += m.qStaminaLogs[2]?.[0] ?? 100;
    sum.q2Stamina[1] += m.qStaminaLogs[2]?.[1] ?? 100;
    sum.q3Stamina[0] += m.qStaminaLogs[3]?.[0] ?? 100;
    sum.q3Stamina[1] += m.qStaminaLogs[3]?.[1] ?? 100;
    sum.q4Stamina[0] += m.qStaminaLogs[4]?.[0] ?? 100;
    sum.q4Stamina[1] += m.qStaminaLogs[4]?.[1] ?? 100;
  });

  const count = metrics.length;
  return {
    combinedScore: (sum.userScore + sum.aiScore) / count,
    userScore: sum.userScore / count,
    aiScore: sum.aiScore / count,
    userFG: (sum.userFGM / Math.max(1, sum.userFGA)) * 100,
    user3P: (sum.user3PM / Math.max(1, sum.user3PA)) * 100,
    aiFG: (sum.aiFGM / Math.max(1, sum.aiFGA)) * 100,
    ai3P: (sum.ai3PM / Math.max(1, sum.ai3PA)) * 100,
    userAssists: sum.userAssists / count,
    aiAssists: sum.aiAssists / count,
    userTurnovers: sum.userTurnovers / count,
    aiTurnovers: sum.aiTurnovers / count,
    userSteals: sum.userSteals / count,
    aiSteals: sum.aiSteals / count,
    lowestStamina: sum.lowestStamina / count,
    connectorHubTriggers: sum.connectorHubTriggers / count,
    shareRhythmTriggers: sum.shareRhythmTriggers / count,
    tempoSurgeonTriggers: sum.tempoSurgeonTriggers / count,
    courtVisionTriggers: sum.courtVisionTriggers / count,
    benchCaptainTriggers: sum.benchCaptainTriggers / count,
    timeoutResetTriggers: sum.timeoutResetTriggers / count,
    completeEngineActiveTicks: sum.completeEngineActiveTicks / count,
    q1Stamina: [sum.q1Stamina[0] / count, sum.q1Stamina[1] / count],
    q2Stamina: [sum.q2Stamina[0] / count, sum.q2Stamina[1] / count],
    q3Stamina: [sum.q3Stamina[0] / count, sum.q3Stamina[1] / count],
    q4Stamina: [sum.q4Stamina[0] / count, sum.q4Stamina[1] / count],
    assistedFgPct: (sum.userAssists / Math.max(1, sum.userFGM)) * 100,
  };
}

function printAverages(scenarioName: string, avg: ReturnType<typeof computeAverages>) {
  console.log(`\n==================================================`);
  console.log(`SCENARIO: ${scenarioName}`);
  console.log(`==================================================`);
  console.log(`Average Combined Score: ${avg.combinedScore.toFixed(1)} (User ${avg.userScore.toFixed(1)} - ${avg.aiScore.toFixed(1)} AI)`);
  console.log(`Assists per Team: User ${avg.userAssists.toFixed(1)} | AI ${avg.aiAssists.toFixed(1)}`);
  console.log(`User Assisted FG%: ${avg.assistedFgPct.toFixed(1)}%`);
  console.log(`FG% / 3PT%:`);
  console.log(`  - User: FG% ${avg.userFG.toFixed(1)}% | 3PT% ${avg.user3P.toFixed(1)}%`);
  console.log(`  - AI:   FG% ${avg.aiFG.toFixed(1)}% | 3PT% ${avg.ai3P.toFixed(1)}%`);
  console.log(`Turnovers / Steals per Team:`);
  console.log(`  - User: ${avg.userTurnovers.toFixed(1)} TOV | ${avg.userSteals.toFixed(1)} STL`);
  console.log(`  - AI:   ${avg.aiTurnovers.toFixed(1)} TOV | ${avg.aiSteals.toFixed(1)} STL`);
  console.log(`C/PF Stamina End of Quarters (User PF / User C):`);
  console.log(`  - Q1: ${avg.q1Stamina[0].toFixed(1)}% / ${avg.q1Stamina[1].toFixed(1)}%`);
  console.log(`  - Q2: ${avg.q2Stamina[0].toFixed(1)}% / ${avg.q2Stamina[1].toFixed(1)}%`);
  console.log(`  - Q3: ${avg.q3Stamina[0].toFixed(1)}% / ${avg.q3Stamina[1].toFixed(1)}%`);
  console.log(`  - Q4 (Final): ${avg.q4Stamina[0].toFixed(1)}% / ${avg.q4Stamina[1].toFixed(1)}%`);
  console.log(`Lowest Big-Man Stamina: ${avg.lowestStamina.toFixed(1)}%`);
  console.log(`Trigger counts:`);
  console.log(`  - Connector Hub: ${avg.connectorHubTriggers.toFixed(2)}`);
  console.log(`  - Share Rhythm: ${avg.shareRhythmTriggers.toFixed(2)}`);
  console.log(`  - Tempo Surgeon: ${avg.tempoSurgeonTriggers.toFixed(2)}`);
  console.log(`  - COURT_VISION_ENGINE: ${avg.courtVisionTriggers.toFixed(2)}`);
  console.log(`  - BENCH_CAPTAIN: ${avg.benchCaptainTriggers.toFixed(2)}`);
  console.log(`  - TIMEOUT_RESET: ${avg.timeoutResetTriggers.toFixed(2)}`);
  console.log(`  - Complete Engine Active Ticks: ${avg.completeEngineActiveTicks.toFixed(1)}`);

  // Target Ranges Watch Guards
  if (avg.userAssists > 32 || avg.aiAssists > 32) {
    console.warn(`⚠️ WARNING: Assist count is high (${avg.userAssists.toFixed(1)} / ${avg.aiAssists.toFixed(1)})`);
  }
  if (avg.combinedScore > 230) {
    console.warn(`⚠️ WARNING: Combined score is above warning limit (${avg.combinedScore.toFixed(1)})`);
  }
  if (avg.userTurnovers < 8 || avg.aiTurnovers < 8) {
    console.warn(`⚠️ WARNING: Turnovers are low (${avg.userTurnovers.toFixed(1)} / ${avg.aiTurnovers.toFixed(1)})`);
  }
  if (avg.userFG > 55 || avg.aiFG > 55) {
    console.warn(`⚠️ WARNING: FG% is high (${avg.userFG.toFixed(1)}% / ${avg.aiFG.toFixed(1)}%)`);
  }
  if (avg.user3P > 45 || avg.ai3P > 45) {
    console.warn(`⚠️ WARNING: 3PT% is high (${avg.user3P.toFixed(1)}% / ${avg.ai3P.toFixed(1)}%)`);
  }
}

async function run() {
  console.log("Starting Playmaking Regression Simulator Suite...");

  const genericBaseSkills: [string, string, string] = ["Paint Magnet", "Shadow Guard", "Discipline Wall"];

  const genericAI = () => [
    createMockPlayer("ai1", "AI PG", genericBaseSkills),
    createMockPlayer("ai2", "AI SG", genericBaseSkills),
    createMockPlayer("ai3", "AI SF", genericBaseSkills),
    createMockPlayer("ai4", "AI PF", genericBaseSkills),
    createMockPlayer("ai5", "AI C", genericBaseSkills),
  ];

  // Scenario 1: Baseline Balanced Lineup
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("1. Baseline Balanced Lineup (No Playmaking Archetype)", computeAverages(metrics));
  }

  // Scenario 2: High Assist Lineup
  {
    const highPlaymakingOverride = { assist: 95, handle: 95 };
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, [], 90, highPlaymakingOverride),
      createMockPlayer("u2", "User SG", genericBaseSkills, [], 90, highPlaymakingOverride),
      createMockPlayer("u3", "User SF", genericBaseSkills, [], 90, highPlaymakingOverride),
      createMockPlayer("u4", "User PF", genericBaseSkills, [], 90, highPlaymakingOverride),
      createMockPlayer("u5", "User C", genericBaseSkills, [], 90, highPlaymakingOverride),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("2. High Assist & Handle Ratings Lineup", computeAverages(metrics));
  }

  // Scenario 3: Light Bulb Lv.1 Lineup (Bronze)
  {
    // Player 5 has 3 playmaking signals: Tempo Surgeon, Connector Hub, Share Rhythm
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("3. Light Bulb Lv.1 Lineup (Bronze)", computeAverages(metrics));
  }

  // Scenario 4: Light Bulb Lv.2 Lineup (Silver)
  {
    // Player 4 has 3: Tempo Switch, Position Flex, Future Core
    // Player 5 has 3: Tempo Surgeon, Connector Hub, Share Rhythm (total 6 signals)
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", ["Tempo Switch", "Position Flex", "Future Core"]),
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("4. Light Bulb Lv.2 Lineup (Silver)", computeAverages(metrics));
  }

  // Scenario 5: Light Bulb Lv.3 Lineup (Gold)
  {
    // Player 3 has 1: Complete Engine (also playmaking signal)
    // Player 4 has 3: Tempo Switch, Position Flex, Future Core
    // Player 5 has 3: Tempo Surgeon, Connector Hub, Share Rhythm (total 7 signals, 3 contributors)
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", ["Complete Engine", "Shadow Guard", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Tempo Switch", "Position Flex", "Future Core"]),
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("5. Light Bulb Lv.3 Lineup (Gold)", computeAverages(metrics));
  }

  // Scenario 6: Light Bulb with COURT_VISION_ENGINE
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["COURT_VISION_ENGINE"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", ["Complete Engine", "Shadow Guard", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Tempo Switch", "Position Flex", "Future Core"]),
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("6. Light Bulb Gold with COURT_VISION_ENGINE", computeAverages(metrics));
  }

  // Scenario 7: Light Bulb with BENCH_CAPTAIN
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["BENCH_CAPTAIN"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", ["Complete Engine", "Shadow Guard", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Tempo Switch", "Position Flex", "Future Core"]),
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("7. Light Bulb Gold with BENCH_CAPTAIN", computeAverages(metrics));
  }

  // Scenario 8: Light Bulb vs Pressure Defense
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", ["Complete Engine", "Shadow Guard", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Tempo Switch", "Position Flex", "Future Core"]),
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]),
    ];
    const aiDefense = [
      createMockPlayer("ai1", "AI PG", ["Shadow Guard", "Hands Active", "Focus Lock"], ["GAMEPLAN_JAMMER"]),
      createMockPlayer("ai2", "AI SG", ["Shadow Guard", "Hands Active", "Discipline Wall"]),
      createMockPlayer("ai3", "AI SF", ["Shadow Guard", "Hands Active", "Discipline Wall"]),
      createMockPlayer("ai4", "AI PF", ["Shadow Guard", "Hands Active", "Discipline Wall"]),
      createMockPlayer("ai5", "AI C", ["Shadow Guard", "Hands Active", "Discipline Wall"]),
    ];
    const metrics = runScenarioSimulations(userLineup, aiDefense);
    printAverages("8. Light Bulb Gold vs Heavy Pressure Defense", computeAverages(metrics));
  }

  // Scenario 9: ISO / Post ISO Validation
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["COURT_VISION_ENGINE"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", ["Complete Engine", "Shadow Guard", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Tempo Switch", "Position Flex", "Future Core"]),
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI(), "Isolation (ISO)", "Post Isolation");
    printAverages("9. Gold COURT_VISION under Isolation Strategies", computeAverages(metrics));
  }

  // Scenario 10: Stamina Recovery Stress Test
  {
    // Stack maximum stamina recovery skills
    const userLineup = [
      createMockPlayer("u1", "User PG", ["Connector Hub", "Share Rhythm", "Position Flex"], ["BENCH_CAPTAIN"]),
      createMockPlayer("u2", "User SG", ["Connector Hub", "Share Rhythm", "Position Flex"]),
      createMockPlayer("u3", "User SF", ["Connector Hub", "Share Rhythm", "Position Flex"]),
      createMockPlayer("u4", "User PF", ["Connector Hub", "Share Rhythm", "Position Flex"]),
      createMockPlayer("u5", "User C", ["Connector Hub", "Share Rhythm", "Position Flex"]),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("10. Stamina Recovery Stress Test (Max Stacked)", computeAverages(metrics));
  }

  console.log("\nAll playmaking regression scenarios successfully simulated!");
}

run().catch(console.error);
