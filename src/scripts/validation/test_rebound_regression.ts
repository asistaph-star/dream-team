import { Player } from "../../lib/types/player";
import { simulateTick, createInitialMatchState, computeEffective } from "../../lib/utils/matchEngine";

// Helper to create mock players
function createMockPlayer(
  id: string,
  name: string,
  baseSkills: [string, string, string],
  specialSkillSlots: (string | null)[] = [],
  ovr = 90,
  overrides: Partial<Player> = {}
): Player {
  // Infer position from the last character of the ID
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
  userOREB: number;
  userDREB: number;
  aiOREB: number;
  aiDREB: number;
  userFTA: number;
  aiFTA: number;
  secondChancePossessions: number;
  secondChancePoints: number;
  putbackAttempts: number;
  putbackMakes: number;
  glassTouchTriggers: number;
  paintBarrierTriggers: number;
  rimWardenBlocks: number;
  qStaminaLogs: Record<number, number[]>; // Quarter -> [u4_stamina, u5_stamina]
  lowestStamina: number;
  steals: number;
  turnovers: number;
}

function analyzeMatch(state: any, userRoster: Player[], aiRoster: Player[], staminaLogs: Record<number, number[]>): MatchMetrics {
  let secondChancePossessions = 0;
  let secondChancePoints = 0;
  let putbackAttempts = 0;
  let putbackMakes = 0;
  let glassTouchTriggers = 0;
  let paintBarrierTriggers = 0;
  let rimWardenBlocks = 0;

  state.events.forEach((e: any) => {
    const text = e.text || "";
    if (text.includes("offensive rebound: second chance!")) {
      secondChancePossessions++;
    }
    if (text.includes("Second chance:") && text.includes("converts!")) {
      putbackMakes++;
      putbackAttempts++;
      // Parse points scored
      const match = text.match(/\(\+(\d+)\)/);
      if (match) {
        secondChancePoints += parseInt(match[1], 10);
      }
    }
    if (text.includes("gets another look but can't convert")) {
      putbackAttempts++;
    }
    if (text.includes("Glass Touch creates second-chance pressure")) {
      glassTouchTriggers++;
    }
    if (text.includes("Paint Barrier fights off the second-chance lane")) {
      paintBarrierTriggers++;
    }
    if (text.includes("Rim Warden powers the block")) {
      rimWardenBlocks++;
    }
  });

  let userOREB = 0;
  let userDREB = 0;
  let aiOREB = 0;
  let aiDREB = 0;
  let userFTA = 0;
  let aiFTA = 0;
  let steals = 0;
  let turnovers = 0;

  Object.entries(state.playerStats).forEach(([playerId, s]: [string, any]) => {
    const isUser = userRoster.some(p => p.id === playerId);
    if (isUser) {
      userOREB += s.OREB ?? 0;
      userDREB += s.DREB ?? 0;
      userFTA += s.FTA ?? 0;
      steals += s.STL ?? 0;
      turnovers += s.TOV ?? 0;
    } else {
      aiOREB += s.OREB ?? 0;
      aiDREB += s.DREB ?? 0;
      aiFTA += s.FTA ?? 0;
      steals += s.STL ?? 0;
      turnovers += s.TOV ?? 0;
    }
  });

  const u4Stam = state.playerStamina["u4"] ?? 100;
  const u5Stam = state.playerStamina["u5"] ?? 100;

  return {
    userScore: state.userScore,
    aiScore: state.aiScore,
    userOREB,
    userDREB,
    aiOREB,
    aiDREB,
    userFTA,
    aiFTA,
    secondChancePossessions,
    secondChancePoints,
    putbackAttempts,
    putbackMakes,
    glassTouchTriggers,
    paintBarrierTriggers,
    rimWardenBlocks,
    qStaminaLogs: staminaLogs,
    lowestStamina: Math.min(u4Stam, u5Stam),
    steals,
    turnovers
  };
}

function runScenarioSimulations(
  userLineup: Player[],
  aiLineup: Player[],
  strategy = "Motion Offense",
  numMatches = 25,
  tiredBigs = false
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

    allUserRoster.forEach(p => {
      if (tiredBigs && (p.position === "PF" || p.position === "C")) {
        state.playerStamina[p.id] = 30; // Force low stamina for tired bigs
      } else {
        state.playerStamina[p.id] = 100;
      }
    });
    aiLineup.forEach(p => {
      if (tiredBigs && (p.position === "PF" || p.position === "C")) {
        state.playerStamina[p.id] = 30;
      } else {
        state.playerStamina[p.id] = 100;
      }
    });

    let ticks = 0;
    let halftimeTriggered = false;
    let prevQuarter = 1;
    const staminaLogs: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] };

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
          if (!tiredBigs || (p.position !== "PF" && p.position !== "C")) {
            state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30);
          }
        });
        aiLineup.forEach(p => {
          if (!tiredBigs || (p.position !== "PF" && p.position !== "C")) {
            state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30);
          }
        });
      }

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;

      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      ticks++;
    }

    staminaLogs[4] = [
      state.playerStamina["u4"] ?? 100,
      state.playerStamina["u5"] ?? 100
    ];

    results.push(analyzeMatch(state, allUserRoster, aiLineup, staminaLogs));
  }

  return results;
}

function computeAverages(metrics: MatchMetrics[]) {
  const sum = {
    userScore: 0,
    aiScore: 0,
    userOREB: 0,
    userDREB: 0,
    aiOREB: 0,
    aiDREB: 0,
    userFTA: 0,
    aiFTA: 0,
    secondChancePossessions: 0,
    secondChancePoints: 0,
    putbackAttempts: 0,
    putbackMakes: 0,
    glassTouchTriggers: 0,
    paintBarrierTriggers: 0,
    rimWardenBlocks: 0,
    lowestStamina: 0,
    steals: 0,
    turnovers: 0,
    q1Stamina: [0, 0],
    q2Stamina: [0, 0],
    q3Stamina: [0, 0],
    q4Stamina: [0, 0],
  };

  metrics.forEach(m => {
    sum.userScore += m.userScore;
    sum.aiScore += m.aiScore;
    sum.userOREB += m.userOREB;
    sum.userDREB += m.userDREB;
    sum.aiOREB += m.aiOREB;
    sum.aiDREB += m.aiDREB;
    sum.userFTA += m.userFTA;
    sum.aiFTA += m.aiFTA;
    sum.secondChancePossessions += m.secondChancePossessions;
    sum.secondChancePoints += m.secondChancePoints;
    sum.putbackAttempts += m.putbackAttempts;
    sum.putbackMakes += m.putbackMakes;
    sum.glassTouchTriggers += m.glassTouchTriggers;
    sum.paintBarrierTriggers += m.paintBarrierTriggers;
    sum.rimWardenBlocks += m.rimWardenBlocks;
    sum.lowestStamina += m.lowestStamina;
    sum.steals += m.steals;
    sum.turnovers += m.turnovers;

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
    userOREB: sum.userOREB / count,
    userDREB: sum.userDREB / count,
    aiOREB: sum.aiOREB / count,
    aiDREB: sum.aiDREB / count,
    userFTA: sum.userFTA / count,
    aiFTA: sum.aiFTA / count,
    secondChancePossessions: sum.secondChancePossessions / count,
    secondChancePoints: sum.secondChancePoints / count,
    putbackAttempts: sum.putbackAttempts / count,
    putbackMakes: sum.putbackMakes / count,
    glassTouchTriggers: sum.glassTouchTriggers / count,
    paintBarrierTriggers: sum.paintBarrierTriggers / count,
    rimWardenBlocks: sum.rimWardenBlocks / count,
    lowestStamina: sum.lowestStamina / count,
    steals: sum.steals / count,
    turnovers: sum.turnovers / count,
    q1Stamina: [sum.q1Stamina[0] / count, sum.q1Stamina[1] / count],
    q2Stamina: [sum.q2Stamina[0] / count, sum.q2Stamina[1] / count],
    q3Stamina: [sum.q3Stamina[0] / count, sum.q3Stamina[1] / count],
    q4Stamina: [sum.q4Stamina[0] / count, sum.q4Stamina[1] / count],
  };
}

function printAverages(scenarioName: string, avg: ReturnType<typeof computeAverages>) {
  const userTotalRebounds = avg.userOREB + avg.userDREB;
  const aiTotalRebounds = avg.aiOREB + avg.aiDREB;
  const userOrebRate = avg.userOREB / Math.max(1, avg.userOREB + avg.aiDREB);
  const aiOrebRate = avg.aiOREB / Math.max(1, avg.aiOREB + avg.userDREB);

  console.log(`\n==================================================`);
  console.log(`SCENARIO: ${scenarioName}`);
  console.log(`==================================================`);
  console.log(`Average Combined Score: ${avg.combinedScore.toFixed(1)} (User ${avg.userScore.toFixed(1)} - ${avg.aiScore.toFixed(1)} AI)`);
  console.log(`Total Rebounds per Team: User ${userTotalRebounds.toFixed(1)} | AI ${aiTotalRebounds.toFixed(1)}`);
  console.log(`OREB / DREB per Team:`);
  console.log(`  - User: ${avg.userOREB.toFixed(1)} OREB / ${avg.userDREB.toFixed(1)} DREB`);
  console.log(`  - AI: ${avg.aiOREB.toFixed(1)} OREB / ${avg.aiDREB.toFixed(1)} DREB`);
  console.log(`OREB Rate: User ${(userOrebRate * 100).toFixed(1)}% | AI ${(aiOrebRate * 100).toFixed(1)}%`);
  console.log(`Second-Chance Possessions: ${avg.secondChancePossessions.toFixed(1)}`);
  console.log(`Second-Chance Points: ${avg.secondChancePoints.toFixed(1)}`);
  console.log(`Putbacks: Attempts ${avg.putbackAttempts.toFixed(1)} | Makes ${avg.putbackMakes.toFixed(1)} (FG% ${(avg.putbackMakes / Math.max(1, avg.putbackAttempts) * 100).toFixed(1)}%)`);
  console.log(`Average Triggers & Blocks:`);
  console.log(`  - Glass Touch Triggers: ${avg.glassTouchTriggers.toFixed(2)}`);
  console.log(`  - Paint Barrier Triggers: ${avg.paintBarrierTriggers.toFixed(2)}`);
  console.log(`  - Rim Warden Blocks: ${avg.rimWardenBlocks.toFixed(2)}`);
  console.log(`C/PF Stamina End of Quarters (User PF / User C):`);
  console.log(`  - Q1: ${avg.q1Stamina[0].toFixed(1)}% / ${avg.q1Stamina[1].toFixed(1)}%`);
  console.log(`  - Q2: ${avg.q2Stamina[0].toFixed(1)}% / ${avg.q2Stamina[1].toFixed(1)}%`);
  console.log(`  - Q3: ${avg.q3Stamina[0].toFixed(1)}% / ${avg.q3Stamina[1].toFixed(1)}%`);
  console.log(`  - Q4 (Final): ${avg.q4Stamina[0].toFixed(1)}% / ${avg.q4Stamina[1].toFixed(1)}%`);
  console.log(`Lowest Big-Man Stamina: ${avg.lowestStamina.toFixed(1)}%`);
  console.log(`Steals: ${avg.steals.toFixed(1)} | Turnovers: ${avg.turnovers.toFixed(1)}`);
}

async function run() {
  console.log("Starting Rebound Regression Simulator Suite...");

  const genericBaseSkills: [string, string, string] = ["Share Rhythm", "Connector Hub", "Position Flex"];
  const genericAI = () => [
    createMockPlayer("ai1", "AI PG", genericBaseSkills),
    createMockPlayer("ai2", "AI SG", genericBaseSkills),
    createMockPlayer("ai3", "AI SF", genericBaseSkills),
    createMockPlayer("ai4", "AI PF", genericBaseSkills),
    createMockPlayer("ai5", "AI C", genericBaseSkills),
  ];

  // 1. Baseline Balanced Lineup
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("1. Baseline Balanced Lineup (No Rebound Archetype)", computeAverages(metrics));
  }

  // 2. Glass Touch Heavy Lineup
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", ["Glass Touch", "Share Rhythm", "Connector Hub"]),
      createMockPlayer("u4", "User PF", ["Glass Touch", "Share Rhythm", "Connector Hub"]),
      createMockPlayer("u5", "User C", ["Glass Touch", "Share Rhythm", "Connector Hub"]),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("2. Glass Touch Heavy Lineup", computeAverages(metrics));
  }

  // 3. Paint Barrier Defensive Counter Lineup
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = [
      createMockPlayer("ai1", "AI PG", genericBaseSkills),
      createMockPlayer("ai2", "AI SG", genericBaseSkills),
      createMockPlayer("ai3", "AI SF", ["Paint Barrier", "Share Rhythm", "Connector Hub"]),
      createMockPlayer("ai4", "AI PF", ["Paint Barrier", "Share Rhythm", "Connector Hub"]),
      createMockPlayer("ai5", "AI C", ["Paint Barrier", "Share Rhythm", "Connector Hub"]),
    ];
    const metrics = runScenarioSimulations(userLineup, aiLineup);
    printAverages("3. Paint Barrier Defensive Counter Lineup", computeAverages(metrics));
  }

  // 4. Glass Bully Lv.1 Lineup (Bronze) - 3 Signals
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", ["Glass Touch", "Rim Warden", "Iron Motor"]), // 3 signals (Bronze)
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("4. Glass Bully Lv.1 Lineup (Bronze)", computeAverages(metrics));
  }

  // 5. Glass Bully Lv.2 Lineup (Silver) - 5 Signals
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", ["Paint Barrier", "Power Driver", "Enforcer Lift"]), // 3 signals
      createMockPlayer("u5", "User C", ["Glass Touch", "Rim Warden", "Iron Motor"]), // 3 signals (total 6 signals)
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("5. Glass Bully Lv.2 Lineup (Silver)", computeAverages(metrics));
  }

  // 6. Glass Bully Lv.3 Lineup (Gold) - 7 Signals & 3 Contributors
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Share Rhythm", "Connector Hub"]), // 1 signal
      createMockPlayer("u4", "User PF", ["Paint Barrier", "Power Driver", "Enforcer Lift"]), // 3 signals
      createMockPlayer("u5", "User C", ["Glass Touch", "Rim Warden", "Iron Motor"]), // 3 signals (total 7 signals, 3 contributors)
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("6. Glass Bully Lv.3 Lineup (Gold)", computeAverages(metrics));
  }

  // 7. Glass Bully vs Paint Barrier Counter Lineup
  {
    // Offensive Gold Glass Bully lineup
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Share Rhythm", "Connector Hub"]),
      createMockPlayer("u4", "User PF", ["Paint Barrier", "Power Driver", "Enforcer Lift"]),
      createMockPlayer("u5", "User C", ["Glass Touch", "Rim Warden", "Iron Motor"]),
    ];
    // Defensive Counter lineup (Paint Barrier, Rim Warden, and High stats)
    const aiLineup = [
      createMockPlayer("ai1", "AI PG", genericBaseSkills),
      createMockPlayer("ai2", "AI SG", genericBaseSkills),
      createMockPlayer("ai3", "AI SF", ["Paint Barrier", "Rim Warden", "Connector Hub"], [], 90, { rebound: 95, strength: 95 }),
      createMockPlayer("ai4", "AI PF", ["Paint Barrier", "Rim Warden", "Connector Hub"], [], 90, { rebound: 95, strength: 95 }),
      createMockPlayer("ai5", "AI C", ["Paint Barrier", "Rim Warden", "Connector Hub"], [], 90, { rebound: 95, strength: 95 }),
    ];
    const metrics = runScenarioSimulations(userLineup, aiLineup);
    printAverages("7. Glass Bully vs Paint Barrier Counter Lineup", computeAverages(metrics));
  }

  // 8. Tired Bigs Scenario
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI(), "Motion Offense", 25, true); // tiredBigs = true
    printAverages("8. Tired Bigs Scenario", computeAverages(metrics));
  }

  console.log("\nAll rebound scenarios successfully simulated!");
}

run().catch(console.error);
