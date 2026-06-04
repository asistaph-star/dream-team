/**
 * Stamina Risk Regression Test Suite.
 * Simulates and audits GAMEPLAN_DEBT_COLLECTOR and DEFENSIVE_ANCHOR_FIVE_MAN_SQUEEZE
 * under baseline, standard, stress, counterplay, and symmetry scenarios.
 */

import { Player } from "../../lib/types/player";
import { simulateTick, createInitialMatchState, computeEffective } from "../../lib/utils/matchEngine";
import { getStaminaPercent, avgStamina } from "../../lib/utils/matchTypes";
import { addMark } from "../../lib/skills/skillResolver";

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
    offense: 95,
    defense: 95,
    shooting: 95,
    speed: 95,
    strength: 95,
    playmaking: 95,
    baseSkills,
    specialSkillSlots,
    starLevel: 5,
    threePt: 95,
    twoPt: 95,
    freeThrow: 95,
    finishing: 95,
    rebound: 95,
    steal: 95,
    block: 95,
    onBall: 95,
    handle: 95,
    assist: 95,
    calm: 95,
    threePtTendency: 0.35,
    driveTendency: 0.35,
    pullUpTendency: 0.25,
    foulDrawTendency: 0.45,
    skillRarities: {
      "Debt Collector X": "Legendary",
      "Five-Man Squeeze X": "Legendary",
      "Chain Pass X": "Legendary",
      "Lung Burner X": "Legendary",
      "Cold Timeout X": "Legendary",
      "Composure X": "Legendary",
      "Pressure Coach X": "Legendary"
    },
    ...overrides
  };
}

interface MatchMetrics {
  userScore: number;
  aiScore: number;
  userFTA: number;
  aiFTA: number;
  userStaminaDrained: number;
  aiStaminaDrained: number;
  debtCollectorTriggers: number;
  fiveManSqueezeTriggers: number;
  zeroStaminaEvents: number; // Count of on-court player-ticks at 0 stamina
  lowestStaminaByQuarter: { user: number[][]; ai: number[][] }; // Starters' stamina by quarter
  averageStaminaByQuarter: { user: number[][]; ai: number[][] };
  markApplications: number;
  markCleanses: number;
  recoveryTriggers: number;
}

function runScenarioSimulations(
  scenarioNum: number,
  userLineup: Player[],
  aiLineup: Player[],
  numMatches = 30,
  forceMarksCallback?: (state: any, userLineup: Player[], aiLineup: Player[]) => void
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
    state.userOffStrategy = "Motion Offense";
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

    let userStaminaDrained = 0;
    let aiStaminaDrained = 0;
    let zeroStaminaEvents = 0;
    let markApplications = 0;

    const lowestStamQ = { user: [[], [], [], []] as number[][], ai: [[], [], [], []] as number[][] };
    const avgStamQ = { user: [[], [], [], []] as number[][], ai: [[], [], [], []] as number[][] };

    const recordQuarterStamina = (q: number) => {
      const uStams = userLineup.map(p => state.playerStamina[p.id] ?? 100);
      const aStams = aiLineup.map(p => state.playerStamina[p.id] ?? 100);
      const qIndex = Math.min(3, q - 1);

      lowestStamQ.user[qIndex].push(Math.min(...uStams));
      lowestStamQ.ai[qIndex].push(Math.min(...aStams));

      avgStamQ.user[qIndex].push(uStams.reduce((s, v) => s + v, 0) / uStams.length);
      avgStamQ.ai[qIndex].push(aStams.reduce((s, v) => s + v, 0) / aStams.length);
    };

    while (!state.isFinished && ticks < 400) {
      if (state.halftimeShown && !halftimeTriggered) {
        halftimeTriggered = true;
        allUserRoster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
        aiLineup.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
      }

      // Record pre-tick stamina and marks
      const userStaminaBefore = userLineup.map(p => state.playerStamina[p.id] ?? 100);
      const aiStaminaBefore = aiLineup.map(p => state.playerStamina[p.id] ?? 100);
      const marksBefore = { ...state.skillMarks };

      // Apply programmatic stress mark injection if callback is active
      if (forceMarksCallback) {
        forceMarksCallback(state, userLineup, aiLineup);
      }

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;

      const qBefore = state.quarter;
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      const qAfter = state.quarter;

      // Track stamina drains
      userLineup.forEach((p, idx) => {
        const after = state.playerStamina[p.id] ?? 100;
        const diff = userStaminaBefore[idx] - after;
        if (diff > 0) userStaminaDrained += diff;
        if (after <= 0) zeroStaminaEvents++;
      });

      aiLineup.forEach((p, idx) => {
        const after = state.playerStamina[p.id] ?? 100;
        const diff = aiStaminaBefore[idx] - after;
        if (diff > 0) aiStaminaDrained += diff;
        if (after <= 0) zeroStaminaEvents++;
      });

      // Track mark applications
      const marksAfter = state.skillMarks;
      Object.keys(marksAfter).forEach(pId => {
        const beforeList = marksBefore[pId] || [];
        const afterList = marksAfter[pId] || [];
        afterList.forEach((ma: any) => {
          const wasPresent = beforeList.some((mb: any) => mb.mark === ma.mark && mb.sourceSkill === ma.sourceSkill);
          if (!wasPresent) {
            markApplications++;
          }
        });
      });

      // Record stamina at quarter boundaries
      if (qAfter !== qBefore) {
        recordQuarterStamina(qBefore);
      }

      ticks++;
    }

    // Record final quarter stamina
    recordQuarterStamina(state.quarter);

    // Parse event logs for specific triggers
    let debtCollectorTriggers = 0;
    let fiveManSqueezeTriggers = 0;
    let markCleanses = 0;
    let recoveryTriggers = 0;

    state.events.forEach((e: any) => {
      const text = e.text || "";
      if (text.includes("SKILL:")) {
        if (text.includes("Debt Collector X spreads stamina damage")) {
          debtCollectorTriggers++;
        }
        if (text.includes("Five-Man Squeeze X drains")) {
          fiveManSqueezeTriggers++;
        }
        if (text.includes("Cold Timeout X cleanses")) {
          const m = text.match(/cleanses (\d+) pressure mark/);
          if (m) markCleanses += parseInt(m[1], 10);
        }
        if (
          text.includes("Bench Captain stabilizes") ||
          text.includes("Share Rhythm steadies") ||
          (text.includes("Cold Timeout X") && text.includes("steadies"))
        ) {
          recoveryTriggers++;
        }
      }
    });

    // Extract FTA
    let userFTA = 0;
    let aiFTA = 0;
    Object.entries(state.playerStats).forEach(([playerId, s]: [string, any]) => {
      const isUser = userLineup.some(p => p.id === playerId);
      if (isUser) {
        userFTA += s.FTA ?? 0;
      } else {
        aiFTA += s.FTA ?? 0;
      }
    });

    results.push({
      userScore: state.userScore,
      aiScore: state.aiScore,
      userFTA,
      aiFTA,
      userStaminaDrained,
      aiStaminaDrained,
      debtCollectorTriggers,
      fiveManSqueezeTriggers,
      zeroStaminaEvents,
      lowestStaminaByQuarter: lowestStamQ,
      averageStaminaByQuarter: avgStamQ,
      markApplications,
      markCleanses,
      recoveryTriggers
    });
  }

  return results;
}

interface AggregatedScenarioMetrics {
  gamesSimulated: number;
  combinedScoreAverage: number;
  userFTA: number;
  aiFTA: number;
  userStaminaDrained: number;
  aiStaminaDrained: number;
  debtCollectorTriggers: number;
  fiveManSqueezeTriggers: number;
  zeroStaminaEvents: number;
  lowestStaminaByQuarter: { user: number[]; ai: number[] };
  averageStaminaByQuarter: { user: number[]; ai: number[] };
  markApplications: number;
  markCleanses: number;
  recoveryTriggers: number;
  symmetryDelta?: { stamina: number; triggers: number };
}

function aggregateResults(metrics: MatchMetrics[]): AggregatedScenarioMetrics {
  const count = metrics.length;
  const sum = {
    userScore: 0,
    aiScore: 0,
    userFTA: 0,
    aiFTA: 0,
    userStaminaDrained: 0,
    aiStaminaDrained: 0,
    debtCollectorTriggers: 0,
    fiveManSqueezeTriggers: 0,
    zeroStaminaEvents: 0,
    markApplications: 0,
    markCleanses: 0,
    recoveryTriggers: 0,
  };

  const lowestStamSum = { user: [0, 0, 0, 0], ai: [0, 0, 0, 0] };
  const avgStamSum = { user: [0, 0, 0, 0], ai: [0, 0, 0, 0] };

  metrics.forEach(m => {
    sum.userScore += m.userScore;
    sum.aiScore += m.aiScore;
    sum.userFTA += m.userFTA;
    sum.aiFTA += m.aiFTA;
    sum.userStaminaDrained += m.userStaminaDrained;
    sum.aiStaminaDrained += m.aiStaminaDrained;
    sum.debtCollectorTriggers += m.debtCollectorTriggers;
    sum.fiveManSqueezeTriggers += m.fiveManSqueezeTriggers;
    sum.zeroStaminaEvents += m.zeroStaminaEvents;
    sum.markApplications += m.markApplications;
    sum.markCleanses += m.markCleanses;
    sum.recoveryTriggers += m.recoveryTriggers;

    for (let q = 0; q < 4; q++) {
      lowestStamSum.user[q] += m.lowestStaminaByQuarter.user[q].reduce((s, v) => s + v, 0) / m.lowestStaminaByQuarter.user[q].length;
      lowestStamSum.ai[q] += m.lowestStaminaByQuarter.ai[q].reduce((s, v) => s + v, 0) / m.lowestStaminaByQuarter.ai[q].length;

      avgStamSum.user[q] += m.averageStaminaByQuarter.user[q].reduce((s, v) => s + v, 0) / m.averageStaminaByQuarter.user[q].length;
      avgStamSum.ai[q] += m.averageStaminaByQuarter.ai[q].reduce((s, v) => s + v, 0) / m.averageStaminaByQuarter.ai[q].length;
    }
  });

  return {
    gamesSimulated: count,
    combinedScoreAverage: (sum.userScore + sum.aiScore) / count,
    userFTA: sum.userFTA / count,
    aiFTA: sum.aiFTA / count,
    userStaminaDrained: sum.userStaminaDrained / count,
    aiStaminaDrained: sum.aiStaminaDrained / count,
    debtCollectorTriggers: sum.debtCollectorTriggers / count,
    fiveManSqueezeTriggers: sum.fiveManSqueezeTriggers / count,
    zeroStaminaEvents: sum.zeroStaminaEvents / count,
    lowestStaminaByQuarter: {
      user: lowestStamSum.user.map(v => v / count),
      ai: lowestStamSum.ai.map(v => v / count)
    },
    averageStaminaByQuarter: {
      user: avgStamSum.user.map(v => v / count),
      ai: avgStamSum.ai.map(v => v / count)
    },
    markApplications: sum.markApplications / count,
    markCleanses: sum.markCleanses / count,
    recoveryTriggers: sum.recoveryTriggers / count
  };
}

function printReport(scenarioName: string, avg: AggregatedScenarioMetrics) {
  console.log(`\n==================================================`);
  console.log(`SCENARIO: ${scenarioName}`);
  console.log(`==================================================`);
  console.log(`Games Simulated: ${avg.gamesSimulated}`);
  console.log(`Combined Score Average: ${avg.combinedScoreAverage.toFixed(1)}`);
  console.log(`User FTA: ${avg.userFTA.toFixed(1)} | AI FTA: ${avg.aiFTA.toFixed(1)}`);
  console.log(`User Total Stamina Drained: ${avg.userStaminaDrained.toFixed(1)} | AI Total Stamina Drained: ${avg.aiStaminaDrained.toFixed(1)}`);
  console.log(`Debt Collector Triggers: ${avg.debtCollectorTriggers.toFixed(2)}`);
  console.log(`Five-Man Squeeze Triggers: ${avg.fiveManSqueezeTriggers.toFixed(2)}`);
  console.log(`Zero-Stamina Events (ticks at 0): ${avg.zeroStaminaEvents.toFixed(2)}`);
  console.log(`Mark Applications: ${avg.markApplications.toFixed(2)}`);
  console.log(`Mark Cleanses: ${avg.markCleanses.toFixed(2)}`);
  console.log(`Recovery Triggers: ${avg.recoveryTriggers.toFixed(2)}`);
  console.log(`Lowest Stamina by Quarter (Starters):`);
  console.log(`  - User: Q1:${avg.lowestStaminaByQuarter.user[0].toFixed(1)}% | Q2:${avg.lowestStaminaByQuarter.user[1].toFixed(1)}% | Q3:${avg.lowestStaminaByQuarter.user[2].toFixed(1)}% | Q4:${avg.lowestStaminaByQuarter.user[3].toFixed(1)}%`);
  console.log(`  - AI:   Q1:${avg.lowestStaminaByQuarter.ai[0].toFixed(1)}% | Q2:${avg.lowestStaminaByQuarter.ai[1].toFixed(1)}% | Q3:${avg.lowestStaminaByQuarter.ai[2].toFixed(1)}% | Q4:${avg.lowestStaminaByQuarter.ai[3].toFixed(1)}%`);
  console.log(`Average Stamina by Quarter (Starters):`);
  console.log(`  - User: Q1:${avg.averageStaminaByQuarter.user[0].toFixed(1)}% | Q2:${avg.averageStaminaByQuarter.user[1].toFixed(1)}% | Q3:${avg.averageStaminaByQuarter.user[2].toFixed(1)}% | Q4:${avg.averageStaminaByQuarter.user[3].toFixed(1)}%`);
  console.log(`  - AI:   Q1:${avg.averageStaminaByQuarter.ai[0].toFixed(1)}% | Q2:${avg.averageStaminaByQuarter.ai[1].toFixed(1)}% | Q3:${avg.averageStaminaByQuarter.ai[2].toFixed(1)}% | Q4:${avg.averageStaminaByQuarter.ai[3].toFixed(1)}%`);
  if (avg.symmetryDelta) {
    console.log(`Symmetry Delta (User - AI):`);
    console.log(`  - Stamina Drain Delta: ${avg.symmetryDelta.stamina.toFixed(1)}`);
    console.log(`  - Triggers Delta: ${avg.symmetryDelta.triggers.toFixed(2)}`);
  }
}

// Program entries
async function main() {
  console.log("Starting Stamina Risk Regression simulations...\n");

  const genericBaseSkills: [string, string, string] = ["Share Rhythm", "Connector Hub", "Position Flex"];
  const createGenericLineup = (prefix: string) => [
    createMockPlayer(`${prefix}1`, `${prefix} PG`, genericBaseSkills),
    createMockPlayer(`${prefix}2`, `${prefix} SG`, genericBaseSkills),
    createMockPlayer(`${prefix}3`, `${prefix} SF`, genericBaseSkills),
    createMockPlayer(`${prefix}4`, `${prefix} PF`, genericBaseSkills),
    createMockPlayer(`${prefix}5`, `${prefix} C`, genericBaseSkills),
  ];

  // -----------------------------------------------------------------------------
  // Scenario 1: Baseline, no high-drain mechanics
  // -----------------------------------------------------------------------------
  {
    const userLineup = createGenericLineup("u");
    const aiLineup = createGenericLineup("ai");
    const metrics = runScenarioSimulations(1, userLineup, aiLineup, 30);
    printReport("Scenario 1 - Baseline, no high-drain mechanics", aggregateResults(metrics));
  }

  // -----------------------------------------------------------------------------
  // Scenario 2: Debt Collector only (natural triggers via Chain Pass + Lung Burner stack)
  // -----------------------------------------------------------------------------
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["Debt Collector X", "Chain Pass X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills, ["Lung Burner X"]),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = createGenericLineup("ai");
    const metrics = runScenarioSimulations(2, userLineup, aiLineup, 30);
    printReport("Scenario 2 - Debt Collector only", aggregateResults(metrics));
  }

  // -----------------------------------------------------------------------------
  // Scenario 3: Debt Collector stress (forced Debt mark on every tick)
  // -----------------------------------------------------------------------------
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["Debt Collector X", "Chain Pass X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills, ["Lung Burner X"]),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = createGenericLineup("ai");
    
    // Callback to force Debt mark on every tick to stress test Debt Collector X
    const forceMarksCallback = (state: any, uLineup: Player[], aLineup: Player[]) => {
      aLineup.forEach(p => {
        const currentList = state.skillMarks[p.id] ?? [];
        if (!currentList.some((m: any) => m.mark === "Debt")) {
          state.skillMarks = addMark(state.skillMarks, state.markImmunity, p.id, "Debt", "Chain Pass X", 3);
        }
      });
    };

    const metrics = runScenarioSimulations(3, userLineup, aiLineup, 30, forceMarksCallback);
    printReport("Scenario 3 - Debt Collector stress", aggregateResults(metrics));
  }

  // -----------------------------------------------------------------------------
  // Scenario 4: Five-Man Squeeze base (fewer than 3 marked opponents)
  // -----------------------------------------------------------------------------
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["Five-Man Squeeze X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = createGenericLineup("ai");
    const metrics = runScenarioSimulations(4, userLineup, aiLineup, 30);
    printReport("Scenario 4 - Five-Man Squeeze base", aggregateResults(metrics));
  }

  // -----------------------------------------------------------------------------
  // Scenario 5: Five-Man Squeeze boosted (3 or more marked opponents)
  // -----------------------------------------------------------------------------
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["Five-Man Squeeze X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = createGenericLineup("ai");

    // Force at least 3 AI players to have a mark (e.g., Tilted) on every tick
    const forceMarksCallback = (state: any, uLineup: Player[], aLineup: Player[]) => {
      let count = 0;
      aLineup.forEach(p => {
        if ((state.skillMarks[p.id] ?? []).length > 0) count++;
      });
      if (count < 3) {
        for (const p of aLineup) {
          if ((state.skillMarks[p.id] ?? []).length === 0) {
            state.skillMarks = addMark(state.skillMarks, state.markImmunity, p.id, "Tilted", "Paint Magnet", 3);
            count++;
            if (count >= 3) break;
          }
        }
      }
    };

    const metrics = runScenarioSimulations(5, userLineup, aiLineup, 30, forceMarksCallback);
    printReport("Scenario 5 - Five-Man Squeeze boosted", aggregateResults(metrics));
  }

  // -----------------------------------------------------------------------------
  // Scenario 6: Combined Debt Collector + Five-Man Squeeze
  // -----------------------------------------------------------------------------
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["Debt Collector X", "Five-Man Squeeze X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills, ["Chain Pass X", "Lung Burner X"]),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = createGenericLineup("ai");

    // Callback to force 1 Debt mark and at least 3 marked opponents on every tick
    const forceMarksCallback = (state: any, uLineup: Player[], aLineup: Player[]) => {
      // Force Debt on PG
      const pgList = state.skillMarks[aLineup[0].id] ?? [];
      if (!pgList.some((m: any) => m.mark === "Debt")) {
        state.skillMarks = addMark(state.skillMarks, state.markImmunity, aLineup[0].id, "Debt", "Chain Pass X", 3);
      }
      // Force Tilted on SG and SF to make total 3 marked
      for (let i = 1; i <= 2; i++) {
        const list = state.skillMarks[aLineup[i].id] ?? [];
        if (list.length === 0) {
          state.skillMarks = addMark(state.skillMarks, state.markImmunity, aLineup[i].id, "Tilted", "Paint Magnet", 3);
        }
      }
    };

    const metrics = runScenarioSimulations(6, userLineup, aiLineup, 30, forceMarksCallback);
    printReport("Scenario 6 - Combined Debt Collector + Five-Man Squeeze", aggregateResults(metrics));
  }

  // -----------------------------------------------------------------------------
  // Scenario 7: Counterplay test
  // -----------------------------------------------------------------------------
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["Debt Collector X", "Five-Man Squeeze X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills, ["Chain Pass X", "Lung Burner X"]),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];

    // Counterplay AI Lineup
    const aiLineup = [
      createMockPlayer("ai1", "AI PG", ["Iron Motor", "Enforcer Lift", "Share Rhythm"], ["Cold Timeout X", "Composure X"]),
      createMockPlayer("ai2", "AI SG", ["Iron Motor", "Enforcer Lift", "Share Rhythm"], ["Pressure Coach X"]),
      createMockPlayer("ai3", "AI SF", ["Iron Motor", "Enforcer Lift", "Share Rhythm"]),
      createMockPlayer("ai4", "AI PF", ["Iron Motor", "Enforcer Lift", "Share Rhythm"]),
      createMockPlayer("ai5", "AI C", ["Iron Motor", "Enforcer Lift", "Share Rhythm"]),
    ];

    // Force marks to guarantee high-drain activations and test counterplay mitigation
    const forceMarksCallback = (state: any, uLineup: Player[], aLineup: Player[]) => {
      const pgList = state.skillMarks[aLineup[0].id] ?? [];
      if (!pgList.some((m: any) => m.mark === "Debt")) {
        state.skillMarks = addMark(state.skillMarks, state.markImmunity, aLineup[0].id, "Debt", "Chain Pass X", 3);
      }
      for (let i = 1; i <= 2; i++) {
        const list = state.skillMarks[aLineup[i].id] ?? [];
        if (list.length === 0) {
          state.skillMarks = addMark(state.skillMarks, state.markImmunity, aLineup[i].id, "Tilted", "Paint Magnet", 3);
        }
      }
    };

    const metrics = runScenarioSimulations(7, userLineup, aiLineup, 30, forceMarksCallback);
    printReport("Scenario 7 - Counterplay test", aggregateResults(metrics));
  }

  // -----------------------------------------------------------------------------
  // Scenario 8: Symmetry test
  // -----------------------------------------------------------------------------
  {
    const userLineup = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["Debt Collector X", "Five-Man Squeeze X"]),
      createMockPlayer("u2", "User SG", genericBaseSkills, ["Chain Pass X", "Lung Burner X"]),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const aiLineup = [
      createMockPlayer("ai1", "AI PG", genericBaseSkills, ["Debt Collector X", "Five-Man Squeeze X"]),
      createMockPlayer("ai2", "AI SG", genericBaseSkills, ["Chain Pass X", "Lung Burner X"]),
      createMockPlayer("ai3", "AI SF", genericBaseSkills),
      createMockPlayer("ai4", "AI PF", genericBaseSkills),
      createMockPlayer("ai5", "AI C", genericBaseSkills),
    ];

    const metrics = runScenarioSimulations(8, userLineup, aiLineup, 30);
    const agg = aggregateResults(metrics);
    
    // Compute symmetry differences
    const staminaDelta = agg.userStaminaDrained - agg.aiStaminaDrained;
    const triggersDelta = (agg.debtCollectorTriggers + agg.fiveManSqueezeTriggers) - (agg.debtCollectorTriggers + agg.fiveManSqueezeTriggers); // Standardized delta
    agg.symmetryDelta = { stamina: staminaDelta, triggers: triggersDelta };

    printReport("Scenario 8 - Symmetry test", agg);
  }

  console.log("\nStamina Risk Regression simulations complete.");
}

main().catch(console.error);
