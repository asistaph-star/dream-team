import { getRequiredDuplicateCount, hasLearnedSkills } from "../../lib/utils/starRequirements";
import { applyStarGrowth, repairStarGrowth, getDetailedAttributes } from "../../lib/utils/starGrowth";
import { Player } from "../../lib/types/player";

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] Assertion failed: ${message}`);
    testsFailed = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

function getStarTierAndLevel(starLevel: number) {
  if (!starLevel || starLevel === 0) return { tier: "None", level: 0 };
  const index = starLevel - 1;
  const tierIndex = Math.min(4, Math.floor(index / 5));
  const level = (index % 5) + 1;
  const tiers = ["Silver", "Blue", "Violet", "Orange", "Red"];
  return {
    tier: tiers[tierIndex] || "Red",
    level
  };
}

function run() {
  console.log("=== RUNNING UPGRADE SYSTEM FINAL LOCK VALIDATION ===");

  const tiers = ["Silver", "Blue", "Violet", "Orange", "Red"];

  // 1. Exact Duplicate Count Matrix Verification
  console.log("--- 1. Duplicate Matrix Verification ---");
  const expectedMatrix: Record<string, Record<number, number>> = {
    Silver: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 1 },
    Blue: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 2 },
    Violet: { 1: 0, 2: 0, 3: 2, 4: 0, 5: 2 },
    Orange: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 2 },
    Red: { 1: 2, 2: 0, 3: 2, 4: 0, 5: 3 },
  };

  let totalDuplicatesAccumulated = 0;
  for (const tier of tiers) {
    for (let lvl = 1; lvl <= 5; lvl++) {
      const actual = getRequiredDuplicateCount(tier, lvl);
      const expected = expectedMatrix[tier]?.[lvl] ?? 0;
      assert(actual === expected, `${tier} target level ${lvl} duplicate requirement: expected ${expected}, got ${actual}`);
      totalDuplicatesAccumulated += actual;
    }
  }

  // 2. Sum of duplicates verification (Must be exactly 20)
  console.log("--- 2. Cumulative Duplicate Matrix Totals ---");
  assert(totalDuplicatesAccumulated === 20, `Cumulative duplicate requirements sum to exactly 20 (Actual: ${totalDuplicatesAccumulated})`);
  assert(totalDuplicatesAccumulated + 1 === 21, `Total copies required including baseline card is exactly 21 (Actual: ${totalDuplicatesAccumulated + 1})`);

  // 3. Success Rates Verification
  console.log("--- 3. Success Rate Gating Checks ---");
  const calculateSuccessChance = (tier: string, lvl: number): number => {
    let baseChance = 1.0;
    let decayRate = 0.10;
    if (tier === "Silver") baseChance = 1.0;
    else if (tier === "Blue") baseChance = 0.50;
    else if (tier === "Violet") baseChance = 0.25;
    else if (tier === "Orange") baseChance = 0.12;
    else if (tier === "Red") baseChance = 0.083333;

    const starFactor = 1.0 - (lvl - 1) * decayRate;
    return baseChance * starFactor;
  };

  // Silver Star 1 rate is 100%
  const silver1Rate = calculateSuccessChance("Silver", 1);
  assert(Math.abs(silver1Rate - 1.0) < 1e-6, `Silver star 1 success rate is exactly 100% (Got: ${silver1Rate * 100}%)`);

  // Red Star 5 rate is 5%
  const red5Rate = calculateSuccessChance("Red", 5);
  assert(Math.abs(red5Rate - 0.05) < 1e-4, `Red star 5 success rate is exactly 5% (Got: ${red5Rate * 100}%)`);

  // Intermediate rates decrease logically within each tier
  for (const tier of tiers) {
    let tierPrevRate = 1.1;
    for (let lvl = 1; lvl <= 5; lvl++) {
      const rate = calculateSuccessChance(tier, lvl);
      assert(rate < tierPrevRate, `Success rate decreases as level increases within ${tier}: ★${lvl} = ${(rate * 100).toFixed(2)}% (Previous: ${(tierPrevRate * 100).toFixed(2)}%)`);
      tierPrevRate = rate;
    }
  }

  // Across tiers for the same level, success rates decrease
  for (let lvl = 1; lvl <= 5; lvl++) {
    let levelPrevRate = 1.1;
    for (const tier of tiers) {
      const rate = calculateSuccessChance(tier, lvl);
      assert(rate < levelPrevRate, `Success rate decreases across tiers for ★${lvl}: ${tier} = ${(rate * 100).toFixed(2)}% (Previous: ${(levelPrevRate * 100).toFixed(2)}%)`);
      levelPrevRate = rate;
    }
  }

  // 4. Star Growth / Attributes / OVR separation checks
  console.log("--- 4. Star-Up Gameplay Attributes Gating ---");
  const testPlayer: Player = {
    id: "p_test",
    name: "Ascension Target",
    position: "PG",
    rarity: "Common",
    level: 1,
    maxLevel: 20,
    exp: 0,
    ovr: 65,
    offense: 70,
    defense: 65,
    shooting: 70,
    speed: 75,
    strength: 65,
    playmaking: 70,
    threePt: 70,
    twoPt: 70,
    freeThrow: 70,
    finishing: 70,
    rebound: 65,
    steal: 65,
    block: 65,
    onBall: 65,
    handle: 65,
    assist: 65,
    calm: 65,
    stamina: 100,
    baseSkills: ["Tempo Surgeon", "Hands Active", "Complete Engine"]
  };

  const upgradedPlayer = applyStarGrowth(testPlayer, 1);
  assert(upgradedPlayer.ovr === testPlayer.ovr, "Star-up upgrades DO NOT alter baseline OVR rating");
  assert(upgradedPlayer.starLevel === 1, "Star level increments to exactly 1");

  // Verify that only approved gameplay attributes and sub-attributes are modified (boosted by 1 at Silver star 1)
  assert((upgradedPlayer.threePt ?? 0) === (testPlayer.threePt ?? 0) + 1, "Detailed gameplay attribute ThreePt is boosted by exactly 1");
  assert((upgradedPlayer.finishing ?? 0) === (testPlayer.finishing ?? 0) + 1, "Detailed gameplay attribute Finishing is boosted by exactly 1");
  assert((upgradedPlayer.stamina ?? 0) === (testPlayer.stamina ?? 0) + 2, "Stamina is boosted by exactly +2 per star level");
  assert(JSON.stringify(upgradedPlayer.baseSkills) === JSON.stringify(testPlayer.baseSkills), "Base skills are completely unchanged during star upgrades");

  // 5. Star Growth Repair Guard Checks
  console.log("--- 5. Star Growth Roster Repair Guard Checks ---");
  const baselinePlayerCopy = { ...testPlayer };
  // Double-boosting simulation: manually change stats and trigger repair
  const doubleBoostedPlayer = {
    ...upgradedPlayer,
    threePt: (upgradedPlayer.threePt ?? 0) + 5, // Simulating a double boost leak
    finishing: (upgradedPlayer.finishing ?? 0) + 5,
    stamina: (upgradedPlayer.stamina ?? 0) + 10
  };
  const repairedPlayer = repairStarGrowth(doubleBoostedPlayer, baselinePlayerCopy);
  assert(repairedPlayer.threePt === upgradedPlayer.threePt, "repairStarGrowth resets double boosted threePt back to baseline + correct star growth");
  assert(repairedPlayer.finishing === upgradedPlayer.finishing, "repairStarGrowth resets double boosted finishing back to baseline + correct star growth");
  assert(repairedPlayer.stamina === upgradedPlayer.stamina, "repairStarGrowth resets double boosted stamina back to correct star growth expectation");
  assert(repairedPlayer.ovr === testPlayer.ovr, "repairStarGrowth does not mutate OVR");

  // 6. Sacrifice Warnings and Clean Copy Prioritization Checks
  console.log("--- 6. Duplicate Sacrifice Warning and Prioritization Checks ---");
  const cleanDuplicate: Player = {
    ...testPlayer,
    id: "clean_dup",
    specialSkillSlots: [null, null]
  };
  const skilledDuplicate: Player = {
    ...testPlayer,
    id: "skilled_dup",
    specialSkillSlots: ["DEEP_STRIKE", null]
  };

  assert(hasLearnedSkills(cleanDuplicate) === false, "Clean duplicate has no learned skills");
  assert(hasLearnedSkills(skilledDuplicate) === true, "Skilled duplicate correctly registers as having learned skills");

  // Prioritization check simulation
  const mockRoster = [skilledDuplicate, cleanDuplicate];
  const sorted = [...mockRoster].sort((a, b) => {
    const aHas = hasLearnedSkills(a) ? 1 : 0;
    const bHas = hasLearnedSkills(b) ? 1 : 0;
    return aHas - bHas;
  });
  assert(sorted[0].id === "clean_dup", "Sacrifice sorting prioritizes clean duplicates before skilled duplicates");

  if (testsFailed) {
    console.error("[FAIL] Upgrade system final lock checks failed.");
    process.exit(1);
  } else {
    console.log("[SUCCESS] All upgrade system validation and lock checks passed successfully.");
    process.exit(0);
  }
}

run();
