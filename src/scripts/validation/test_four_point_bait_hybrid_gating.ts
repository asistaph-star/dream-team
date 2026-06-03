import * as fs from "fs";
import * as path from "path";
import { Player } from "../../lib/types/player";

const SLOT_POS = ["PG", "SG", "SF", "PF", "C"] as const;

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    testsFailed = true;
  } else {
    console.log(`✅ ${message}`);
  }
}

function createMockPlayer(
  id: string,
  name: string,
  baseSkills: [string, string, string],
  specialSkillSlots: (string | null)[] = [],
  ovr = 90
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
      "Four-Point Bait X": "Legendary",
      "Red Dot X": "Legendary",
    },
  };
}

async function run() {
  console.log("=== RUNNING FOUR-POINT BAIT HYBRID GATING VALIDATION ===");

  // 1. Static Analysis Checks on matchEngine.ts
  const matchEnginePath = path.resolve(__dirname, "../../lib/utils/matchEngine.ts");
  const engineContent = fs.readFileSync(matchEnginePath, "utf-8");

  // Check resolveLineupArchetypes is called for userLineup and aiLineup in relation to shooting/foul-draw check
  assert(engineContent.includes("const baitSummary = resolveLineupArchetypes(userLineup);"), "baitSummary resolved for userLineup");
  assert(engineContent.includes("const baitSummary = resolveLineupArchetypes(aiLineup);"), "baitSummary resolved for aiLineup");

  // Check Option B conditional mapping logic:
  // (baitDsLevel >= 1 && baitFdLevel >= 1) ? 0.090 : (baitDsLevel >= 1 || baitFdLevel >= 1) ? 0.045 : 0.020
  const boostMapping = "(baitDsLevel >= 1 && baitFdLevel >= 1) ? 0.090 : (baitDsLevel >= 1 || baitFdLevel >= 1) ? 0.045 : 0.020";
  assert(engineContent.includes(boostMapping), "Boost mapping logic matches Option B values");

  // Check MAX_SHOOTING_FOUL_CHANCE remains exactly 0.28
  assert(engineContent.includes("const MAX_SHOOTING_FOUL_CHANCE = 0.28;"), "MAX_SHOOTING_FOUL_CHANCE remains 0.28");

  // Check MAX_3PT_POSITIVE_ADDITIVE_BONUS remains exactly 0.08
  assert(engineContent.includes("const MAX_3PT_POSITIVE_ADDITIVE_BONUS = 0.08;"), "MAX_3PT_POSITIVE_ADDITIVE_BONUS remains 0.08");

  // 2. Lineup Archetype Resolver Checks
  const { resolveLineupArchetypes } = require("../../lib/lineup/lineupArchetypeResolver");

  const genericBaseSkills: [string, string, string] = ["Glass Touch", "Hands Active", "Rim Warden"];

  // Neither active
  const lineup0 = [
    createMockPlayer("u1", "U1", genericBaseSkills),
    createMockPlayer("u2", "U2", genericBaseSkills),
    createMockPlayer("u3", "U3", genericBaseSkills),
    createMockPlayer("u4", "U4", genericBaseSkills),
    createMockPlayer("u5", "U5", genericBaseSkills),
  ];
  const summary0 = resolveLineupArchetypes(lineup0);
  const dsLvl0 = summary0.allResults.find((r: any) => r.id === "shooting")?.level ?? 0;
  const fdLvl0 = summary0.allResults.find((r: any) => r.id === "foul-draw")?.level ?? 0;
  assert(dsLvl0 === 0 && fdLvl0 === 0, "Lineup0: Neither active");

  // Only shooting active
  const lineupShooting = [
    createMockPlayer("u1", "U1", ["Arc Pressure", "Tempo Surgeon", "Mismatch Caller"]), // 3 signals (Lv 1)
    createMockPlayer("u2", "U2", genericBaseSkills),
    createMockPlayer("u3", "U3", genericBaseSkills),
    createMockPlayer("u4", "U4", genericBaseSkills),
    createMockPlayer("u5", "U5", genericBaseSkills),
  ];
  const summaryShooting = resolveLineupArchetypes(lineupShooting);
  const dsLvlShooting = summaryShooting.allResults.find((r: any) => r.id === "shooting")?.level ?? 0;
  const fdLvlShooting = summaryShooting.allResults.find((r: any) => r.id === "foul-draw")?.level ?? 0;
  assert(dsLvlShooting >= 1 && fdLvlShooting === 0, "LineupShooting: Only Shooting active");

  // Only foul-draw active
  const lineupFoulDraw = [
    createMockPlayer("u1", "U1", ["Foul Magnet", "Power Driver", "Tempo Surgeon"]), // 3 signals (Lv 1)
    createMockPlayer("u2", "U2", genericBaseSkills),
    createMockPlayer("u3", "U3", genericBaseSkills),
    createMockPlayer("u4", "U4", genericBaseSkills),
    createMockPlayer("u5", "U5", genericBaseSkills),
  ];
  const summaryFoulDraw = resolveLineupArchetypes(lineupFoulDraw);
  const dsLvlFoulDraw = summaryFoulDraw.allResults.find((r: any) => r.id === "shooting")?.level ?? 0;
  const fdLvlFoulDraw = summaryFoulDraw.allResults.find((r: any) => r.id === "foul-draw")?.level ?? 0;
  assert(dsLvlFoulDraw === 0 && fdLvlFoulDraw >= 1, "LineupFoulDraw: Only Foul-Draw active");

  // Both active
  const lineupBoth = [
    createMockPlayer("u1", "U1", ["Arc Pressure", "Tempo Surgeon", "Mismatch Caller"]),
    createMockPlayer("u2", "U2", ["Foul Magnet", "Power Driver", "Complete Engine"]),
    createMockPlayer("u3", "U3", genericBaseSkills),
    createMockPlayer("u4", "U4", genericBaseSkills),
    createMockPlayer("u5", "U5", genericBaseSkills),
  ];
  const summaryBoth = resolveLineupArchetypes(lineupBoth);
  const dsLvlBoth = summaryBoth.allResults.find((r: any) => r.id === "shooting")?.level ?? 0;
  const fdLvlBoth = summaryBoth.allResults.find((r: any) => r.id === "foul-draw")?.level ?? 0;
  assert(dsLvlBoth >= 1 && fdLvlBoth >= 1, "LineupBoth: Both active");

  if (testsFailed) {
    console.error("\n❌ SOME FOUR-POINT BAIT HYBRID GATING TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("✅ Static checks and resolver configuration passed successfully!");
    console.log("\n🎉 FOUR-POINT BAIT HYBRID GATING VALIDATION PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
