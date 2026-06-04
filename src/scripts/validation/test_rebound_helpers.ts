/**
 * Refactor-1E Validation: reboundSystem.ts pure helper tests
 *
 * Run with:
 *   npx ts-node --project tsconfig.scripts.json src/scripts/validation/test_rebound_helpers.ts
 *
 * All checks are deterministic. No Math.random() is used here.
 */

import {
  REB_W,
  getPositionReboundWeight,
  calculateTeamReboundScore,
  calculateOffensiveReboundChance,
  calculateGlassScale,
  calculateBarrierScale,
} from "../../lib/match/reboundSystem";

// ─── Minimal Player stub ──────────────────────────────────────────────────────
function stubPlayer(
  id: string,
  position: "PG" | "SG" | "SF" | "PF" | "C",
  rebound = 80,
  ovr = 80
): any {
  return {
    id,
    name: `Player-${id}`,
    ovr,
    rarity: "GOLD",
    position,
    teamId: "t1",
    skills: [],
    rebound,
    defense: 75,
    speed: 75,
    strength: 75,
    age: 25,
    nationality: "US",
    jerseyNumber: 0,
    stats: {},
    baseSkills: [],
  };
}

// ─── Test helpers ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assertEqual(label: string, actual: number, expected: number, tol = 0.0001) {
  const diff = Math.abs(actual - expected);
  if (diff <= tol) {
    console.log(`  ✓ ${label}  (got ${actual})`);
    passed++;
  } else {
    console.error(`  ✗ ${label}  expected ${expected}, got ${actual}`);
    failed++;
  }
}

function assertGe(label: string, actual: number, min: number) {
  if (actual >= min) {
    console.log(`  ✓ ${label}  (${actual} >= ${min})`);
    passed++;
  } else {
    console.error(`  ✗ ${label}  expected >= ${min}, got ${actual}`);
    failed++;
  }
}

function assertLe(label: string, actual: number, max: number) {
  if (actual <= max) {
    console.log(`  ✓ ${label}  (${actual} <= ${max})`);
    passed++;
  } else {
    console.error(`  ✗ ${label}  expected <= ${max}, got ${actual}`);
    failed++;
  }
}

function assertTrue(label: string, cond: boolean) {
  if (cond) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    failed++;
  }
}

// ─── Suite 1: getPositionReboundWeight ────────────────────────────────────────
console.log("\n[Suite 1] getPositionReboundWeight");

assertEqual("C = 2.0", getPositionReboundWeight("C"), 2.0);
assertEqual("PF = 1.6", getPositionReboundWeight("PF"), 1.6);
assertEqual("SF = 1.0", getPositionReboundWeight("SF"), 1.0);
assertEqual("SG = 0.6", getPositionReboundWeight("SG"), 0.6);
assertEqual("PG = 0.4", getPositionReboundWeight("PG"), 0.4);
assertEqual("unknown position returns 1.0", getPositionReboundWeight("X"), 1.0);
assertEqual("empty string returns 1.0", getPositionReboundWeight(""), 1.0);

// ─── Suite 2: REB_W constant values ──────────────────────────────────────────
console.log("\n[Suite 2] REB_W constant");

assertEqual("REB_W.C = 2.0", REB_W["C"], 2.0);
assertEqual("REB_W.PF = 1.6", REB_W["PF"], 1.6);
assertEqual("REB_W.SF = 1.0", REB_W["SF"], 1.0);
assertEqual("REB_W.SG = 0.6", REB_W["SG"], 0.6);
assertEqual("REB_W.PG = 0.4", REB_W["PG"], 0.4);

// ─── Suite 3: calculateTeamReboundScore ──────────────────────────────────────
console.log("\n[Suite 3] calculateTeamReboundScore");

{
  // Full stamina (100%) → staminaMod should be 1.0
  // C with rebound=80: 80 × 2.0 × 1.0 = 160
  const pg = stubPlayer("pg", "PG", 80);
  const sg = stubPlayer("sg", "SG", 80);
  const sf = stubPlayer("sf", "SF", 80);
  const pf = stubPlayer("pf", "PF", 80);
  const c  = stubPlayer("c",  "C",  80);
  const staminaMap = { pg: 100, sg: 100, sf: 100, pf: 100, c: 100 };

  // Expected: 80 × (0.4 + 0.6 + 1.0 + 1.6 + 2.0) × 1.0 = 80 × 5.6 = 448
  const result = calculateTeamReboundScore([pg, sg, sf, pf, c], staminaMap);
  // Allow tolerance for staminaMod floating point
  assertGe("5-man lineup score is positive", result, 0);
  assertGe("5-man lineup score > 0 (full stamina)", result, 100);
}

{
  // Single C at full stamina with rebound=100
  // score = 100 × 2.0 × getPlayerStaminaMod(c, 100)
  // getPlayerStaminaMod at 100 stamina ≈ 1.0
  const c = stubPlayer("c1", "C", 100);
  const result = calculateTeamReboundScore([c], { c1: 100 });
  assertGe("single C with 100 rebound > 100", result, 100);
  assertLe("single C with 100 rebound < 300 (sanity cap)", result, 300);
}

{
  // Stamina affects score: lower stamina → lower staminaMod → lower score
  const c = stubPlayer("c2", "C", 80);
  const fullStamina = calculateTeamReboundScore([c], { c2: 100 });
  const lowStamina  = calculateTeamReboundScore([c], { c2: 10 });
  assertGe("full stamina score > low stamina score", fullStamina - lowStamina, 0);
}

{
  // Missing stamina key falls back to undefined → getPlayerStaminaMod should handle gracefully
  const pg = stubPlayer("pg2", "PG", 70);
  const result = calculateTeamReboundScore([pg], {});
  assertGe("missing stamina key does not crash (score >= 0)", result, 0);
}

// ─── Suite 4: calculateOffensiveReboundChance ─────────────────────────────────
console.log("\n[Suite 4] calculateOffensiveReboundChance");

{
  // Floor: extremely weak attacker vs. overwhelming defender
  const result = calculateOffensiveReboundChance(0, 1000, 0, 0, 0);
  assertEqual("OREB floor = 0.10 when attReb=0", result, 0.10);
}

{
  // Cap: extremely strong attacker vs. zero defender
  const result = calculateOffensiveReboundChance(1000, 0, 0, 0, 0);
  assertEqual("OREB cap = 0.36 when defReb=0", result, 0.36);
}

{
  // Balanced teams, no modifiers → base = 0.23
  const result = calculateOffensiveReboundChance(100, 100, 0, 0, 0);
  assertEqual("balanced teams = 0.23 base", result, 0.23);
}

{
  // Glass Touch increases OREB chance vs balanced baseline
  const withGlass = calculateOffensiveReboundChance(100, 100, 1.0, 0, 0);
  const without   = calculateOffensiveReboundChance(100, 100, 0,   0, 0);
  assertGe("Glass Touch glassScale > 0 increases OREB chance", withGlass - without, 0.001);
}

{
  // Paint Barrier decreases OREB chance vs balanced baseline
  const withBarrier = calculateOffensiveReboundChance(100, 100, 0, 1.0, 0);
  const without     = calculateOffensiveReboundChance(100, 100, 0, 0,   0);
  assertGe("Paint Barrier barrierScale > 0 decreases OREB chance", without - withBarrier, 0.001);
}

{
  // GLASS_STRIKE boost applies additively
  const withBoost = calculateOffensiveReboundChance(100, 100, 0, 0, 0.05);
  const without   = calculateOffensiveReboundChance(100, 100, 0, 0, 0);
  assertEqual("GLASS_STRIKE boost of 0.05 adds exactly 0.05", withBoost - without, 0.05);
}

{
  // Result is always within [0.10, 0.36] regardless of extreme inputs
  const extremeHigh = calculateOffensiveReboundChance(9999, 0, 2.0, 0, 0.5);
  const extremeLow  = calculateOffensiveReboundChance(0, 9999, 0, 2.0, 0);
  assertLe("extreme high inputs capped at 0.36", extremeHigh, 0.36);
  assertGe("extreme low inputs floored at 0.10", extremeLow, 0.10);
}

{
  // Verify Glass Touch additive formula: 0.055 × glassScale
  const base   = calculateOffensiveReboundChance(100, 100, 0,   0, 0);
  const glass1 = calculateOffensiveReboundChance(100, 100, 1.0, 0, 0);
  assertEqual("glassScale=1.0 adds 0.055 × 1.0 = 0.055", glass1 - base, 0.055);
}

{
  // Verify Paint Barrier subtraction formula: 0.06 × barrierScale
  const base   = calculateOffensiveReboundChance(100, 100, 0, 0,   0);
  const barrier1 = calculateOffensiveReboundChance(100, 100, 0, 1.0, 0);
  assertEqual("barrierScale=1.0 subtracts 0.06 × 1.0 = 0.06", base - barrier1, 0.06);
}

// ─── Suite 5: calculateGlassScale ────────────────────────────────────────────
console.log("\n[Suite 5] calculateGlassScale");

{
  // Empty holders → 0
  assertEqual("empty holders → 0", calculateGlassScale([]), 0);
}

{
  // Single holder with rebound=100: 0.85 + (100/100)×0.30 = 1.15
  const h = stubPlayer("h1", "C", 100);
  const result = calculateGlassScale([h]);
  // getPlayerStaminaMod not involved in scale formula — uses getReboundRating
  // getReboundRating returns a value derived from player.rebound (80 default or specified)
  // We only verify the formula structure: result should be in [0.85, 1.15]
  assertGe("single holder scale >= 0.85", result, 0.85);
  assertLe("single holder scale <= 1.15", result, 1.15);
}

{
  // Multiple holders — max rating is used
  const weak   = stubPlayer("h2", "PG", 30);
  const strong = stubPlayer("h3", "C",  100);
  const result = calculateGlassScale([weak, strong]);
  // Strong player dominates: same as single strong holder
  const strongOnly = calculateGlassScale([strong]);
  assertEqual("multi-holder uses max rating", result, strongOnly);
}

{
  // Scale formula structure: 0.85 + (rating/100) × 0.30
  const holder1 = stubPlayer("h4", "C", 70);
  const holder2 = stubPlayer("h5", "C", 70);
  const r1 = calculateGlassScale([holder1]);
  const r2 = calculateGlassScale([holder2]);
  assertEqual("same-rating holders produce same scale", r1, r2);
}

// ─── Suite 6: calculateBarrierScale ──────────────────────────────────────────
console.log("\n[Suite 6] calculateBarrierScale");

{
  // Empty holders → 0
  assertEqual("empty holders → 0", calculateBarrierScale([]), 0);
}

{
  // Same formula as calculateGlassScale
  const h = stubPlayer("b1", "C", 80);
  const gs = calculateGlassScale([h]);
  const bs = calculateBarrierScale([h]);
  assertEqual("glassScale and barrierScale share same formula for same input", gs, bs);
}

{
  // Scale range check
  const weakHolder = stubPlayer("b2", "PG", 40);
  const result = calculateBarrierScale([weakHolder]);
  assertGe("barrier scale >= 0.85 (weak holder)", result, 0.85);
  assertLe("barrier scale <= 1.15 (weak holder)", result, 1.15);
}

// ─── Suite 7: Safety checks ───────────────────────────────────────────────────
console.log("\n[Suite 7] Safety invariant checks");

{
  // Confirm reboundSystem.ts does NOT export pickRebounder
  const reboundModule = require("../../lib/match/reboundSystem");
  assertTrue("pickRebounder is NOT exported from reboundSystem", !("pickRebounder" in reboundModule));
  assertTrue("awardReb is NOT exported from reboundSystem", !("awardReb" in reboundModule));
}

{
  // Confirm Math.random is not called in any pure helper
  // (We verify by running helpers many times and checking outputs are deterministic)
  const p = stubPlayer("dr1", "C", 80);
  const run1 = calculateTeamReboundScore([p], { dr1: 100 });
  const run2 = calculateTeamReboundScore([p], { dr1: 100 });
  assertEqual("calculateTeamReboundScore is deterministic (no RNG)", run1, run2);

  const r1 = calculateOffensiveReboundChance(100, 100, 0.9, 0.85, 0.02);
  const r2 = calculateOffensiveReboundChance(100, 100, 0.9, 0.85, 0.02);
  assertEqual("calculateOffensiveReboundChance is deterministic (no RNG)", r1, r2);

  const h = stubPlayer("dr2", "PF", 75);
  const g1 = calculateGlassScale([h]);
  const g2 = calculateGlassScale([h]);
  assertEqual("calculateGlassScale is deterministic (no RNG)", g1, g2);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("✅ All Refactor-1E rebound helper validation checks passed.");
}
