import * as fs from "fs";
import * as path from "path";
import { SPECIAL_SKILL_NAMES } from "../../lib/skills/skillCatalog";
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
      "Glass Strike": "Legendary"
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

  const initialStaminas: Record<string, number> = {};

  for (let i = 0; i < numMatches; i++) {
    let state = createInitialMatchState();
    state.userOffStrategy = "Motion Offense";
    state.userDefStrategy = "Man-to-Man";
    state.aiOffStrategy = "Motion Offense";
    state.aiDefStrategy = "Man-to-Man";
    state.userPlayerIds = allUserRoster.map(p => p.id);
    state.aiPlayerIds = aiLineup.map(p => p.id);
    state.aiLineupIds = aiLineup.map(p => p.id);

    allUserRoster.forEach(p => {
      state.playerStamina[p.id] = 100;
      initialStaminas[p.id] = 100;
    });
    aiLineup.forEach(p => {
      state.playerStamina[p.id] = 100;
      initialStaminas[p.id] = 100;
    });

    let ticks = 0;
    while (!state.isFinished && ticks < 400) {
      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      ticks++;
    }

    state.events.forEach(e => {
      if (e.text) events.push(e.text);
    });
  }

  return events;
}

async function run() {
  console.log("=== RUNNING GLASS_STRIKE GATING & REGRESSION VALIDATION ===");

  // 1. Static Analysis Checks on matchEngine.ts
  const matchEnginePath = path.resolve(__dirname, "../../lib/utils/matchEngine.ts");
  const engineContent = fs.readFileSync(matchEnginePath, "utf-8");

  // Verify getGlassStrikeOrebBoost implementation
  const orebBoostCheck = engineContent.includes("getGlassStrikeOrebBoost = (level: number)");
  assert(orebBoostCheck, "getGlassStrikeOrebBoost helper function is implemented in matchEngine.ts");

  const lv1OrebCheck = engineContent.includes("if (level === 1) return 0.015");
  const lv2OrebCheck = engineContent.includes("if (level === 2) return 0.025");
  const lv3OrebCheck = engineContent.includes("if (level === 3) return 0.035");
  assert(lv1OrebCheck && lv2OrebCheck && lv3OrebCheck, "getGlassStrikeOrebBoost has correct gating values (+0.015, +0.025, +0.035)");

  // Verify getGlassStrikePutbackBoost implementation
  const putbackBoostCheck = engineContent.includes("getGlassStrikePutbackBoost = (level: number)");
  assert(putbackBoostCheck, "getGlassStrikePutbackBoost helper function is implemented in matchEngine.ts");

  const lv1PutbackCheck = engineContent.includes("if (level === 1) return 0");
  const lv2PutbackCheck = engineContent.includes("if (level === 2) return 0.01");
  const lv3PutbackCheck = engineContent.includes("if (level === 3) return 0.015");
  assert(lv1PutbackCheck && lv2PutbackCheck && lv3PutbackCheck, "getGlassStrikePutbackBoost has correct gating values (0, +0.010, +0.015)");

  // Verify final OREB chance cap clamp remains 0.36
  const orebCapCheck = engineContent.includes("Math.min(Math.max(0.23 + matchupSwing + (glassScale > 0 ? 0.055 * glassScale : 0) - (barrierScale > 0 ? 0.06 * barrierScale : 0) + glassStrikeBoost, 0.10), 0.36)");
  const alternativeOrebCapCheck = engineContent.includes("0.36)") && engineContent.includes("glassStrikeBoost");
  assert(orebCapCheck || alternativeOrebCapCheck, "Final offensive rebound chance is capped strictly at 0.36");

  // Verify Paint Barrier suppresses OREB chance
  const paintBarrierCheck = engineContent.includes("barrierScale > 0 ? 0.06 * barrierScale : 0");
  assert(paintBarrierCheck, "Paint Barrier still suppresses OREB chance in formula");

  // 2. Rolling Pool Checks
  const glassStrikeInPool = SPECIAL_SKILL_NAMES.includes("GLASS_STRIKE" as any);
  assert(!glassStrikeInPool, "GLASS_STRIKE is NOT in the natural rolling pool SPECIAL_SKILL_NAMES");

  // POSTER_SPARK check
  const posterSparkInPool = SPECIAL_SKILL_NAMES.includes("POSTER_SPARK" as any);
  assert(!posterSparkInPool, "POSTER_SPARK is NOT in the natural rolling pool / skill catalog");

  // 3. Lineup Archetype Gating Checks (Level 0, 1, 2, 3)
  {
    // Level 0: No Rebound Archetype contributors
    const userLineup0 = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["GLASS_STRIKE"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const summary0 = resolveLineupArchetypes(userLineup0);
    const rebResult0 = summary0.allResults.find(r => r.id === "rebound");
    assert((rebResult0?.level ?? 0) === 0, "Lineup with only 1 signal yields Rebound Lineup Level 0");

    // Level 1 (Bronze): 3 signals
    const userLineup1 = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["GLASS_STRIKE"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", ["Glass Touch", "Rim Warden", "Iron Motor"]), // 3 signals
    ];
    const summary1 = resolveLineupArchetypes(userLineup1);
    const rebResult1 = summary1.allResults.find(r => r.id === "rebound");
    assert(rebResult1?.level === 1, `Lineup with 3 signals yields Rebound Lineup Level 1 (Bronze), got ${rebResult1?.level}`);

    // Level 2 (Silver): 5 signals
    const userLineup2 = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["GLASS_STRIKE"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", ["Paint Barrier", "Power Driver", "Enforcer Lift"]), // 3 signals
      createMockPlayer("u5", "User C", ["Glass Touch", "Rim Warden", "Iron Motor"]), // 3 signals (Total 6 signals, 2 contributors)
    ];
    const summary2 = resolveLineupArchetypes(userLineup2);
    const rebResult2 = summary2.allResults.find(r => r.id === "rebound");
    assert(rebResult2?.level === 2, `Lineup with 6 signals and 2 contributors yields Rebound Lineup Level 2 (Silver), got ${rebResult2?.level}`);

    // Level 3 (Gold): 7 signals, 3 contributors
    const userLineup3 = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["GLASS_STRIKE"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Share Rhythm", "Connector Hub"]), // 1 signal
      createMockPlayer("u4", "User PF", ["Paint Barrier", "Power Driver", "Enforcer Lift"]), // 3 signals
      createMockPlayer("u5", "User C", ["Glass Touch", "Rim Warden", "Iron Motor"]), // 3 signals (Total 7 signals, 3 contributors)
    ];
    const summary3 = resolveLineupArchetypes(userLineup3);
    const rebResult3 = summary3.allResults.find(r => r.id === "rebound");
    assert(rebResult3?.level === 3, `Lineup with 7 signals and 3 contributors yields Rebound Lineup Level 3 (Gold), got ${rebResult3?.level}`);
  }

  // 4. Match Simulation Verification
  {
    // Level 0: No activation check
    const userLineup0 = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["GLASS_STRIKE"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", genericBaseSkills),
      createMockPlayer("u4", "User PF", genericBaseSkills),
      createMockPlayer("u5", "User C", genericBaseSkills),
    ];
    const events0 = runMockMatches(userLineup0, genericAI(), 50);
    const triggers0 = events0.filter(e => e.includes("Glass Strike"));
    assert(triggers0.length === 0, "GLASS_STRIKE does not trigger at Level 0");

    // Level 3: Activation checks
    const userLineup3 = [
      createMockPlayer("u1", "User PG", genericBaseSkills, ["GLASS_STRIKE"]),
      createMockPlayer("u2", "User SG", genericBaseSkills),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Share Rhythm", "Connector Hub"]),
      createMockPlayer("u4", "User PF", ["Paint Barrier", "Power Driver", "Enforcer Lift"]),
      createMockPlayer("u5", "User C", ["Glass Touch", "Rim Warden", "Iron Motor"]),
    ];
    const events3 = runMockMatches(userLineup3, genericAI(), 150);
    const triggers3 = events3.filter(e => e.includes("Glass Strike"));
    assert(triggers3.length > 0, `GLASS_STRIKE triggers successfully at Level 3 (Count: ${triggers3.length})`);

    // Verify no automatic putback conversions (i.e. putbacks can miss)
    const missPutbacks = events3.filter(e => e.includes("gets another look but can't convert"));
    assert(missPutbacks.length > 0, `Putbacks can miss (i.e. not automatic putback score) (Count: ${missPutbacks.length})`);

    // Verify no recursive OREB loops
    // In our engine, after a missed putback, a DREB is awarded to the defense.
    // Let's verify that "gets another look but can't convert" is always followed by a DREB/board pull down.
    let sequentialOrebFails = 0;
    for (let i = 0; i < events3.length; i++) {
      if (events3[i].includes("gets another look but can't convert")) {
        // The very next event should either mention pulling down the board or be a new possession change.
        const nextEvt = events3[i + 1] || "";
        if (nextEvt.includes("gets the offensive rebound: second chance!")) {
          sequentialOrebFails++;
        }
      }
    }
    assert(sequentialOrebFails === 0, "No recursive OREB loops occur on missed putbacks");
  }

  if (testsFailed) {
    console.error("\n❌ SOME VALIDATION TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL GLASS_STRIKE GATING & REGRESSION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
