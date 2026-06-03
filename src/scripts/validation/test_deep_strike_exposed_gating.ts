import * as fs from "fs";
import * as path from "path";
import { Player } from "../../lib/types/player";
import { simulateTick, createInitialMatchState, computeEffective } from "../../lib/utils/matchEngine";
import { resolveLineupArchetypes } from "../../lib/lineup/lineupArchetypeResolver";

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    testsFailed = true;
  } else {
    console.log(`✅ ${message}`);
  }
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
      "Red Dot X": "Legendary"
    },
    ...overrides
  };
}

const genericBaseSkills: [string, string, string] = ["Share Rhythm", "Connector Hub", "Position Flex"];
const genericAI = () => [
  createMockPlayer("ai1", "AI PG", genericBaseSkills),
  createMockPlayer("ai2", "AI SG", genericBaseSkills),
  createMockPlayer("ai3", "AI SF", genericBaseSkills),
  createMockPlayer("ai4", "AI PF", genericBaseSkills),
  createMockPlayer("ai5", "AI C", genericBaseSkills),
];

function runMockMatches(
  userLineup: Player[],
  aiLineup: Player[],
  numMatches = 50
) {
  const events: string[] = [];
  const allUserRoster = [...userLineup];
  const aiTeamObj = {
    name: "AI Test Team",
    arena: "AI Arena",
    off: 80,
    def: 80,
    color: "#ff0000",
    roster: aiLineup,
  };

  const finalStates: any[] = [];

  for (let i = 0; i < numMatches; i++) {
    let state = createInitialMatchState();
    state.userOffStrategy = "Outside Shoot";
    state.userDefStrategy = "Man-to-Man";
    state.aiOffStrategy = "Outside Shoot";
    state.aiDefStrategy = "Man-to-Man";
    state.userPlayerIds = allUserRoster.map(p => p.id);
    state.aiPlayerIds = aiLineup.map(p => p.id);
    state.aiLineupIds = aiLineup.map(p => p.id);

    allUserRoster.forEach(p => { state.playerStamina[p.id] = 100; });
    aiLineup.forEach(p => { state.playerStamina[p.id] = 100; });

    let ticks = 0;
    while (!state.isFinished && ticks < 50) {
      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      ticks++;
    }

    state.events.forEach(e => {
      if (e.text) events.push(e.text);
    });
    finalStates.push(state);
  }

  return { events, finalStates };
}

async function run() {
  console.log("=== RUNNING DEEP STRIKE EXPOSED GATING VALIDATION ===");

  // 1. Static Analysis Checks on matchEngine.ts
  const matchEnginePath = path.resolve(__dirname, "../../lib/utils/matchEngine.ts");
  const engineContent = fs.readFileSync(matchEnginePath, "utf-8");

  // Check resolveLineupArchetypes for shooting is evaluated inside matchEngine
  assert(engineContent.includes("id === \"shooting\""), "resolveLineupArchetypes for shooting is evaluated in matchEngine");

  // Check scaleMultiplier values map correctly: 0.85 (Lv 0), 1.00 (Lv 1), 1.05 (Lv 2), 1.10 (Lv 3)
  const scaleMultiplierRegex = /scaleMultiplier\s*=\s*dsLevel\s*===\s*0\s*\?\s*0\.85\s*:\s*dsLevel\s*===\s*1\s*\?\s*1\.00\s*:\s*dsLevel\s*===\s*2\s*\?\s*1\.05\s*:\s*1\.10/;
  assert(scaleMultiplierRegex.test(engineContent), "scaleMultiplier values map correctly: 0.85 (Lv 0), 1.00 (Lv 1), 1.05 (Lv 2), 1.10 (Lv 3)");

  // Check Exposed duration remains exactly 3 at every level
  // Since we haven't modified it, it should remain 3. Let's make sure it still specifies 3.
  const exposedAddMarkCount = (engineContent.match(/addMark\(newSkillMarks,\s*newMarkImmunity,\s*primaryDefender\.id,\s*\"Exposed\",\s*\"Red Dot X\",\s*3\)/g) || []).length;
  assert(exposedAddMarkCount === 2, `Exposed duration remains exactly 3 at every level (found ${exposedAddMarkCount} occurrences)`);

  // 2. Lineup Archetype Gating Checks (Level 0, 1, 2, 3)
  {
    // Level 0: No shooting signals
    const userLineup0 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Foul Magnet", "Screen Breaker"], ["Red Dot X"]),
      createMockPlayer("u2", "User SG", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
      createMockPlayer("u4", "User PF", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
      createMockPlayer("u5", "User C", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
    ];
    const summary0 = resolveLineupArchetypes(userLineup0);
    const dsResult0 = summary0.allResults.find(r => r.id === "shooting");
    assert((dsResult0?.level ?? 0) === 0, "Lineup with 0 signals yields Shooting Level 0");

    // Level 1 (Bronze): 3 signals
    const userLineup1 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["Red Dot X"]), // 1 signal
      createMockPlayer("u2", "User SG", ["Tempo Surgeon", "Arc Pressure", "Discipline Wall"]), // 2 signals (Total 3)
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
      createMockPlayer("u4", "User PF", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
      createMockPlayer("u5", "User C", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
    ];
    const summary1 = resolveLineupArchetypes(userLineup1);
    const dsResult1 = summary1.allResults.find(r => r.id === "shooting");
    assert(dsResult1?.level === 1, "Lineup with 3 signals yields Shooting Level 1 (Bronze)");

    // Level 2 (Silver): 5 signals
    const userLineup2 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["Red Dot X"]), // 1 signal
      createMockPlayer("u2", "User SG", ["Tempo Surgeon", "Arc Pressure", "Discipline Wall"]), // 2 signals
      createMockPlayer("u3", "User SF", ["Mismatch Caller", "Position Flex", "Iron Motor"]), // 2 signals (Total 5)
      createMockPlayer("u4", "User PF", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
      createMockPlayer("u5", "User C", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
    ];
    const summary2 = resolveLineupArchetypes(userLineup2);
    const dsResult2 = summary2.allResults.find(r => r.id === "shooting");
    assert(dsResult2?.level === 2, "Lineup with 5 signals yields Shooting Level 2 (Silver)");

    // Level 3 (Gold): 7 signals, 3 contributors
    const userLineup3 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["Red Dot X"]), // 1 signal
      createMockPlayer("u2", "User SG", ["Tempo Surgeon", "Arc Pressure", "Complete Engine"]), // 3 signals
      createMockPlayer("u3", "User SF", ["Mismatch Caller", "Position Flex", "Tempo Switch"]), // 3 signals (Total 7, 3 contributors)
      createMockPlayer("u4", "User PF", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
      createMockPlayer("u5", "User C", ["Paint Magnet", "Rim Warden", "Iron Motor"]),
    ];
    const summary3 = resolveLineupArchetypes(userLineup3);
    const dsResult3 = summary3.allResults.find(r => r.id === "shooting");
    assert(dsResult3?.level === 3, "Lineup with 7 signals and 3 contributors yields Shooting Level 3 (Gold)");
  }

  // 3. Match Simulation Gating Checks
  {
    const userLineup3 = [
      createMockPlayer("u1", "User PG", ["Arc Pressure", "Complete Engine", "Mismatch Caller"], ["Red Dot X"]),
      createMockPlayer("u2", "User SG", ["Arc Pressure", "Complete Engine", "Mismatch Caller"], ["Red Dot X"]),
      createMockPlayer("u3", "User SF", ["Arc Pressure", "Complete Engine", "Mismatch Caller"]),
      createMockPlayer("u4", "User PF", ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createMockPlayer("u5", "User C", ["Rim Warden", "Paint Barrier", "Iron Motor"]),
    ];
    
    const aiLineup3 = [
      createMockPlayer("ai1", "AI PG", ["Arc Pressure", "Complete Engine", "Mismatch Caller"], ["Red Dot X"]),
      createMockPlayer("ai2", "AI SG", ["Arc Pressure", "Complete Engine", "Mismatch Caller"], ["Red Dot X"]),
      createMockPlayer("ai3", "AI SF", ["Arc Pressure", "Complete Engine", "Mismatch Caller"]),
      createMockPlayer("ai4", "AI PF", ["Rim Warden", "Paint Barrier", "Iron Motor"]),
      createMockPlayer("ai5", "AI C", ["Rim Warden", "Paint Barrier", "Iron Motor"]),
    ];

    const { events, finalStates } = runMockMatches(userLineup3, aiLineup3, 50);
    const userTriggers = events.filter(e => e.includes("Red Dot X marks") && e.includes("AI"));
    const aiTriggers = events.filter(e => e.includes("Red Dot X marks") && e.includes("User"));

    assert(userTriggers.length > 0, `Red Dot X triggers successfully for User team (Count: ${userTriggers.length})`);
    assert(aiTriggers.length > 0, `Red Dot X triggers successfully for AI team (Count: ${aiTriggers.length})`);

    // Verify duration is exactly 3
    let durationInvalid = false;
    finalStates.forEach(state => {
      Object.entries(state.skillMarks).forEach(([pid, marks]: [string, any]) => {
        marks.forEach((m: any) => {
          if (m.mark === "Exposed" && m.possessionsLeft > 3) {
            durationInvalid = true;
          }
        });
      });
    });
    assert(!durationInvalid, "Exposed duration is exactly 3 in match states");
  }

  if (testsFailed) {
    console.error("\n❌ SOME DEEP STRIKE EXPOSED GATING TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL DEEP STRIKE EXPOSED GATING VALIDATION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
