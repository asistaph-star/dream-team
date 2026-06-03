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
      "Composure Shield X": "Legendary",
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
  flopTriggers: number;
  sgaFlopTriggers: number;
  fourPointBaitTriggers: number;
  foulMagnetTriggers: number;
  cleanChallengeCounters: number;
  composureShieldCounters: number;
  disciplineWallCounters: number;
  and1Events: number;
  threePointFouls: number;
  steals: number;
  turnovers: number;
  redDotTriggers: number;
  contactTaxTriggers: number;
}

function analyzeMatch(state: any, userRoster: Player[], aiRoster: Player[]): MatchMetrics {
  let flopTriggers = 0;
  let sgaFlopTriggers = 0;
  let fourPointBaitTriggers = 0;
  let foulMagnetTriggers = 0;
  let cleanChallengeCounters = 0;
  let composureShieldCounters = 0;
  let disciplineWallCounters = 0;
  let and1Events = 0;
  let threePointFouls = 0;
  let redDotTriggers = 0;
  let contactTaxTriggers = 0;

  state.events.forEach((e: any) => {
    const text = e.text || "";
    if (text.includes("AND-1")) {
      and1Events++;
    }
    if (text.includes("Shooting foul on") && text.includes("for 3")) {
      threePointFouls++;
    }
    if (text.includes("SKILL:")) {
      if (text.includes("Flop X sells the contact")) {
        flopTriggers++;
        if (text.includes("SGA doubles it")) {
          sgaFlopTriggers++;
        }
      }
      if (text.includes("Four-Point Bait X pressures")) {
        fourPointBaitTriggers++;
      }
      if (text.includes("Foul Magnet pressures a tired defender")) {
        foulMagnetTriggers++;
      }
      if (text.includes("Clean Contest X shuts down Four-Point Bait X")) {
        cleanChallengeCounters++;
      }
      if (text.includes("Composure X cancels the forced foul pressure")) {
        composureShieldCounters++;
      }
      if (text.includes("Discipline Wall holds off Four-Point Bait X")) {
        disciplineWallCounters++;
      }
      if (text.includes("Red Dot X marks")) {
        redDotTriggers++;
      }
      if (text.includes("Contact Tax X tilts")) {
        contactTaxTriggers++;
      }
    }
  });

  let userFTA = 0;
  let aiFTA = 0;
  let userFouls = 0;
  let aiFouls = 0;
  let steals = 0;
  let turnovers = 0;

  Object.entries(state.playerStats).forEach(([playerId, s]: [string, any]) => {
    const isUser = userRoster.some(p => p.id === playerId);
    if (isUser) {
      userFTA += s.FTA ?? 0;
      userFouls += s.FOL ?? 0;
      steals += s.STL ?? 0;
      turnovers += s.TOV ?? 0;
    } else {
      aiFTA += s.FTA ?? 0;
      aiFouls += s.FOL ?? 0;
      steals += s.STL ?? 0;
      turnovers += s.TOV ?? 0;
    }
  });

  return {
    userScore: state.userScore,
    aiScore: state.aiScore,
    userFTA,
    aiFTA,
    userFouls,
    aiFouls,
    flopTriggers,
    sgaFlopTriggers,
    fourPointBaitTriggers,
    foulMagnetTriggers,
    cleanChallengeCounters,
    composureShieldCounters,
    disciplineWallCounters,
    and1Events,
    threePointFouls,
    steals,
    turnovers,
    redDotTriggers,
    contactTaxTriggers,
  };
}

function runScenarioSimulations(
  userLineup: Player[],
  aiLineup: Player[],
  strategy = "Motion Offense",
  numMatches = 15
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

    while (!state.isFinished && ticks < 400) {
      if (state.halftimeShown && !halftimeTriggered) {
        halftimeTriggered = true;
        allUserRoster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
        aiLineup.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
      }

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;

      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      ticks++;
    }

    results.push(analyzeMatch(state, allUserRoster, aiLineup));
  }

  return results;
}

function computeAverages(metrics: MatchMetrics[]) {
  const sum = {
    userScore: 0,
    aiScore: 0,
    userFTA: 0,
    aiFTA: 0,
    userFouls: 0,
    aiFouls: 0,
    flopTriggers: 0,
    sgaFlopTriggers: 0,
    fourPointBaitTriggers: 0,
    foulMagnetTriggers: 0,
    cleanChallengeCounters: 0,
    composureShieldCounters: 0,
    disciplineWallCounters: 0,
    and1Events: 0,
    threePointFouls: 0,
    steals: 0,
    turnovers: 0,
    redDotTriggers: 0,
    contactTaxTriggers: 0,
  };

  metrics.forEach(m => {
    sum.userScore += m.userScore;
    sum.aiScore += m.aiScore;
    sum.userFTA += m.userFTA;
    sum.aiFTA += m.aiFTA;
    sum.userFouls += m.userFouls;
    sum.aiFouls += m.aiFouls;
    sum.flopTriggers += m.flopTriggers;
    sum.sgaFlopTriggers += m.sgaFlopTriggers;
    sum.fourPointBaitTriggers += m.fourPointBaitTriggers;
    sum.foulMagnetTriggers += m.foulMagnetTriggers;
    sum.cleanChallengeCounters += m.cleanChallengeCounters;
    sum.composureShieldCounters += m.composureShieldCounters;
    sum.disciplineWallCounters += m.disciplineWallCounters;
    sum.and1Events += m.and1Events;
    sum.threePointFouls += m.threePointFouls;
    sum.steals += m.steals;
    sum.turnovers += m.turnovers;
    sum.redDotTriggers += m.redDotTriggers;
    sum.contactTaxTriggers += m.contactTaxTriggers;
  });

  const count = metrics.length;
  return {
    combinedScore: (sum.userScore + sum.aiScore) / count,
    userScore: sum.userScore / count,
    aiScore: sum.aiScore / count,
    userFTA: sum.userFTA / count,
    aiFTA: sum.aiFTA / count,
    userFouls: sum.userFouls / count,
    aiFouls: sum.aiFouls / count,
    flopTriggers: sum.flopTriggers / count,
    sgaFlopTriggers: sum.sgaFlopTriggers / count,
    fourPointBaitTriggers: sum.fourPointBaitTriggers / count,
    foulMagnetTriggers: sum.foulMagnetTriggers / count,
    cleanChallengeCounters: sum.cleanChallengeCounters / count,
    composureShieldCounters: sum.composureShieldCounters / count,
    disciplineWallCounters: sum.disciplineWallCounters / count,
    and1Events: sum.and1Events / count,
    threePointFouls: sum.threePointFouls / count,
    steals: sum.steals / count,
    turnovers: sum.turnovers / count,
    redDotTriggers: sum.redDotTriggers / count,
    contactTaxTriggers: sum.contactTaxTriggers / count,
  };
}

function printAverages(scenarioName: string, avg: ReturnType<typeof computeAverages>) {
  console.log(`\n==================================================`);
  console.log(`SCENARIO: ${scenarioName}`);
  console.log(`==================================================`);
  console.log(`Average Combined Score: ${avg.combinedScore.toFixed(1)} (User ${avg.userScore.toFixed(1)} - ${avg.aiScore.toFixed(1)} AI)`);
  console.log(`Average FTA: User ${avg.userFTA.toFixed(1)} | AI ${avg.aiFTA.toFixed(1)}`);
  console.log(`Average Fouls: User ${avg.userFouls.toFixed(1)} | AI ${avg.aiFouls.toFixed(1)}`);
  console.log(`Average Steals: ${avg.steals.toFixed(1)} | Turnovers: ${avg.turnovers.toFixed(1)}`);
  console.log(`Average Triggers:`);
  console.log(`  - Flop X: ${avg.flopTriggers.toFixed(2)} (SGA double portion: ${avg.sgaFlopTriggers.toFixed(2)})`);
  console.log(`  - Four-Point Bait X: ${avg.fourPointBaitTriggers.toFixed(2)}`);
  console.log(`  - Foul Magnet: ${avg.foulMagnetTriggers.toFixed(2)}`);
  console.log(`  - Red Dot X (Expose Setup): ${avg.redDotTriggers.toFixed(2)}`);
  console.log(`  - Contact Tax X (Tilt Setup): ${avg.contactTaxTriggers.toFixed(2)}`);
  console.log(`Average Counters:`);
  console.log(`  - Composure Shield: ${avg.composureShieldCounters.toFixed(2)}`);
  console.log(`  - Clean Challenge: ${avg.cleanChallengeCounters.toFixed(2)}`);
  console.log(`  - Discipline Wall: ${avg.disciplineWallCounters.toFixed(2)}`);
  console.log(`Average Events:`);
  console.log(`  - 3PT Fouls: ${avg.threePointFouls.toFixed(2)}`);
  console.log(`  - And-1s: ${avg.and1Events.toFixed(2)}`);
}

// -----------------------------------------------------------------------------
// MAIN PROGRAM - Run the 8 Scenarios
// -----------------------------------------------------------------------------
async function run() {
  console.log("Starting Flop / Foul-Draw Regression Simulator Suite...\n");

  const genericBaseSkills: [string, string, string] = ["Share Rhythm", "Connector Hub", "Position Flex"];
  const genericAI = () => [
    createMockPlayer("ai1", "AI PG", genericBaseSkills),
    createMockPlayer("ai2", "AI SG", genericBaseSkills),
    createMockPlayer("ai3", "AI SF", genericBaseSkills),
    createMockPlayer("ai4", "AI PF", genericBaseSkills),
    createMockPlayer("ai5", "AI C", genericBaseSkills),
  ];

  // 1. No Foul-Draw archetype + Flop X
  {
    const userLineup = [
      createMockPlayer("u1", "User Shooter", genericBaseSkills, ["Flop X", "Contact Tax X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("1. No Foul-Draw archetype + Flop X", computeAverages(metrics));
  }

  // 2. Foul-Draw Lv.1 (Bronze) + Flop X
  {
    const userLineup = [
      createMockPlayer("u1", "User Shooter", ["Foul Magnet", "Power Driver", "Tempo Surgeon"], ["Flop X", "Contact Tax X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("2. Foul-Draw Lv.1 (Bronze) + Flop X", computeAverages(metrics));
  }

  // 3. Foul-Draw Lv.2 (Silver) + Flop X
  {
    const userLineup = [
      createMockPlayer("u1", "User Shooter", ["Foul Magnet", "Power Driver", "Tempo Surgeon"], ["Flop X", "Contact Tax X"]),
      createMockPlayer("u2", "User SG", ["Mismatch Caller", "Paint Magnet", "Position Flex"]),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("3. Foul-Draw Lv.2 (Silver) + Flop X", computeAverages(metrics));
  }

  // 4. Foul-Draw Lv.3 (Gold) + Flop X
  {
    const userLineup = [
      createMockPlayer("u1", "User Shooter", ["Foul Magnet", "Power Driver", "Tempo Surgeon"], ["Flop X", "Contact Tax X"]),
      createMockPlayer("u2", "User SG", ["Mismatch Caller", "Paint Magnet", "Position Flex"]),
      createMockPlayer("u3", "User SF", ["Focus Lock", "Complete Engine", "Position Flex"]),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("4. Foul-Draw Lv.3 (Gold) + Flop X", computeAverages(metrics));
  }

  // 5. SGA Flop lineup
  {
    const userLineup = [
      createMockPlayer("u1", "Shai Gilgeous-Alexander", genericBaseSkills, ["Flop X", "Contact Tax X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI());
    printAverages("5. SGA Flop Lineup", computeAverages(metrics));
  }

  // 6. Four-Point Bait lineup
  {
    const userLineup = [
      createMockPlayer("u1", "Bait Shooter", ["Arc Pressure", "Share Rhythm", "Connector Hub"], ["Four-Point Bait X", "Red Dot X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = [
      createMockPlayer("ai1", "Def PG", ["Discipline Wall", "Share Rhythm", "Connector Hub"], ["Composure X"]),
      createMockPlayer("ai2", "Def SG", genericBaseSkills, ["Clean Contest X"]),
      createMockPlayer("ai3", "Def SF", genericBaseSkills),
      createMockPlayer("ai4", "Def PF", genericBaseSkills),
      createMockPlayer("ai5", "Def C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, aiLineup, "Pace and Space (3PT)");
    printAverages("6. Four-Point Bait Lineup", computeAverages(metrics));
  }

  // 7. Hybrid Deep Strike + Foul-Draw lineup
  {
    const userLineup = [
      createMockPlayer("u1", "Hybrid Shooter", ["Foul Magnet", "Power Driver", "Paint Magnet"], ["Flop X", "Contact Tax X"]),
      createMockPlayer("u2", "Hybrid Guard", ["Arc Pressure", "Connector Hub", "Position Flex"]),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const metrics = runScenarioSimulations(userLineup, genericAI(), "Pace and Space (3PT)");
    printAverages("7. Hybrid Deep Strike + Foul-Draw Lineup", computeAverages(metrics));
  }

  // 8. Counter lineup vs Foul-Draw lineup
  {
    const userLineup = [
      createMockPlayer("u1", "User Shooter", ["Foul Magnet", "Power Driver", "Arc Pressure"], ["Flop X", "Four-Point Bait X", "Red Dot X", "Contact Tax X"]),
      createMockPlayer("u2", "User SG", ["Mismatch Caller", "Paint Magnet", "Position Flex"]),
      createMockPlayer("u3", "User SF", ["Focus Lock", "Complete Engine", "Position Flex"]),
      createMockPlayer("u4", "User PF", ["Tempo Surgeon", "Share Rhythm", "Connector Hub"]), // 1 more signal to make total 7 (Lv.3 Gold)
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = [
      createMockPlayer("ai1", "Def PG", ["Discipline Wall", "Focus Lock", "Share Rhythm"], ["Composure X"], 90, { calm: 99, defense: 99 }),
      createMockPlayer("ai2", "Def SG", ["Discipline Wall", "Focus Lock", "Share Rhythm"], ["Clean Contest X"], 90, { calm: 99, defense: 99 }),
      createMockPlayer("ai3", "Def SF", ["Discipline Wall", "Focus Lock", "Share Rhythm"], [], 90, { calm: 99, defense: 99 }),
      createMockPlayer("ai4", "Def PF", ["Discipline Wall", "Focus Lock", "Share Rhythm"], [], 90, { calm: 99, defense: 99 }),
      createMockPlayer("ai5", "Def C", ["Discipline Wall", "Focus Lock", "Share Rhythm"], [], 90, { calm: 99, defense: 99 }),
    ];
    const metrics = runScenarioSimulations(userLineup, aiLineup, "Pace and Space (3PT)");
    printAverages("8. Counter Lineup vs Foul-Draw Lineup", computeAverages(metrics));
  }

  console.log("\nAll scenarios successfully simulated!");
}

run().catch(console.error);
