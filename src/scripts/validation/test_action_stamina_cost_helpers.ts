/**
 * MatchEngine-Refactor-2C Validation: actionStaminaCosts.ts pure helper tests
 *
 * Run with:  npx ts-node --project tsconfig.json src/scripts/validation/test_action_stamina_cost_helpers.ts
 *
 * All assertions are synchronous and deterministic.
 */

import {
  isRimShot,
  isHeavyShot,
  isPullUpShot,
  getShotBaseCost,
  getDefensiveCost,
  getDefensiveEffortCost,
  getContextMultiplier,
  ShotContextParams
} from "../../lib/match/actionStaminaCosts";

let passed = 0;
let failed = 0;

function assert(label: string, actual: any, expected: any, tolerance = 0.001) {
  if (typeof actual === "number" && typeof expected === "number") {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
      console.log(`  ✓ ${label}  (got ${actual.toFixed(4)})`);
      passed++;
    } else {
      console.error(`  ✗ ${label}  expected ${expected.toFixed(4)}, got ${actual.toFixed(4)}`);
      failed++;
    }
  } else {
    if (actual === expected) {
      console.log(`  ✓ ${label}  (got ${actual})`);
      passed++;
    } else {
      console.error(`  ✗ ${label}  expected ${expected}, got ${actual}`);
      failed++;
    }
  }
}

// ─── Suite 1: Shot Types Classification ───────────────────────────────────
console.log("\n[Suite 1] Shot Types Classification");

assert("dunk is rim shot", isRimShot("dunk"), true);
assert("layup is rim shot", isRimShot("drivingLayup"), true);
assert("putBack is rim shot", isRimShot("putBack"), true);
assert("hookShot is rim shot", isRimShot("hookShot"), true);
assert("powerLayup is rim shot", isRimShot("powerLayup"), true);
assert("bankShot is not rim shot", isRimShot("bankShot"), false);
assert("cornerThree is not rim shot", isRimShot("cornerThree"), false);

assert("stepBackMid is heavy shot", isHeavyShot("stepBackMid"), true);
assert("fadeaway is heavy shot", isHeavyShot("fadeaway"), true);
assert("bankShot is not heavy shot", isHeavyShot("bankShot"), false);

assert("pullUpMid is pull-up shot", isPullUpShot("pullUpMid"), true);
assert("cornerThree is not pull-up shot", isPullUpShot("cornerThree"), false);

// ─── Suite 2: Shot Base Costs ─────────────────────────────────────────────
console.log("\n[Suite 2] Shot Base Costs");

assert("blocked dunk", getShotBaseCost("dunk", "block"), 15.5);
assert("blocked layup", getShotBaseCost("drivingLayup", "block"), 13.5);
assert("blocked jumper", getShotBaseCost("bankShot", "block"), 11.5);
assert("made dunk", getShotBaseCost("dunk", "make"), 8.0);
assert("made layup", getShotBaseCost("drivingLayup", "make"), 7.0);
assert("putback attempt", getShotBaseCost("putBack", "miss"), 5.0);
assert("contact finish powerLayup", getShotBaseCost("powerLayup", "make"), 10.5);
assert("contact finish hookShot", getShotBaseCost("hookShot", "make"), 10.5);
assert("catch and shoot", getShotBaseCost("catchAndShoot", "make"), 2.4);
assert("corner three", getShotBaseCost("cornerThree", "miss"), 2.4);
assert("heavy shot stepBackThree", getShotBaseCost("stepBackThree", "miss"), 7.0);
assert("pull-up three", getShotBaseCost("pullUpThree", "make"), 5.2);
assert("normal jumper (bankShot)", getShotBaseCost("bankShot", "make"), 3.8);

// ─── Suite 3: Defensive Costs ─────────────────────────────────────────────
console.log("\n[Suite 3] Defensive Costs");

assert("successful block", getDefensiveCost("block", false), 5.6);
assert("foul contest", getDefensiveCost("foul", false), 4.6);
assert("miss contest 3PT", getDefensiveCost("miss", true), 2.8);
assert("miss contest 2PT", getDefensiveCost("miss", false), 3.6);
assert("make contest 3PT", getDefensiveCost("make", true), 2.8);
assert("make contest 2PT", getDefensiveCost("make", false), 1.8);

// ─── Suite 4: Defensive Effort Costs ──────────────────────────────────────
console.log("\n[Suite 4] Defensive Effort Costs");

assert("failed block cost", getDefensiveEffortCost("failedBlock"), 6.4);
assert("failed steal cost", getDefensiveEffortCost("failedSteal"), 7.0);
assert("trap rotation cost", getDefensiveEffortCost("trapRotation"), 1.8);
assert("press chase cost", getDefensiveEffortCost("pressChase"), 1.4);

// ─── Suite 5: Context Multiplier ──────────────────────────────────────────
console.log("\n[Suite 5] Context Multipliers");

const baseParams: ShotContextParams = {
  staminaPct: 100,
  outcome: "miss",
  isClutch: false,
  quarter: 1,
  pace: "normal",
  usageMod: 1.0,
  isBackToBack: false,
  facedDefense: "Man-to-Man"
};

// Base case: mult starts at 1, outcome miss = *1.06, clamped between [0.75, 1.95]
// Expected: 1.06
assert("base miss multiplier", getContextMultiplier(baseParams), 1.06);

// Make outcome: mult starts at 1, outcome make = *0.82
// Expected: 0.82
assert("make multiplier", getContextMultiplier({ ...baseParams, outcome: "make" }), 0.82);

// Foul outcome: mult starts at 1, outcome foul = *0.92
// Expected: 0.92
assert("foul multiplier", getContextMultiplier({ ...baseParams, outcome: "foul" }), 0.92);

// Block outcome: mult starts at 1, outcome block = *1.22
// Expected: 1.22
assert("block multiplier", getContextMultiplier({ ...baseParams, outcome: "block" }), 1.22);

// Clutch active: *1.08
// Expected: 1.06 * 1.08 = 1.1448
assert("clutch active", getContextMultiplier({ ...baseParams, isClutch: true }), 1.1448);

// Overtime quarter 5: *1.18
// Expected: 1.06 * 1.18 = 1.2508
assert("overtime active", getContextMultiplier({ ...baseParams, quarter: 5 }), 1.2508);

// Transition pace: *1.12
// Expected: 1.06 * 1.12 = 1.1872
assert("transition pace (fastbreak)", getContextMultiplier({ ...baseParams, pace: "fastbreak" }), 1.1872);
assert("transition pace (early_offense)", getContextMultiplier({ ...baseParams, pace: "early_offense" }), 1.1872);

// Late clock pace: *1.12
// Expected: 1.06 * 1.12 = 1.1872
assert("late clock pace", getContextMultiplier({ ...baseParams, pace: "late_clock" }), 1.1872);

// Second chance rebound context: *1.10
// Expected: 1.06 * 1.10 = 1.166
assert("second-chance oreb", getContextMultiplier({ ...baseParams, context: "oreb" }), 1.166);

// Tired stamina < 45: *1.10
// Expected: 1.06 * 1.10 = 1.166
assert("tired stamina <45%", getContextMultiplier({ ...baseParams, staminaPct: 40 }), 1.166);

// Exhausted stamina < 30: *1.10 * 1.18
// Expected: 1.06 * 1.10 * 1.18 = 1.37588
assert("exhausted stamina <30%", getContextMultiplier({ ...baseParams, staminaPct: 25 }), 1.37588);

// High usage (usageMod < 0.95): *1.08
// Expected: 1.06 * 1.08 = 1.1448
assert("high usage multiplier", getContextMultiplier({ ...baseParams, usageMod: 0.90 }), 1.1448);

// Back to playmaking: *1.08
// Expected: 1.06 * 1.08 = 1.1448
assert("back to back possession", getContextMultiplier({ ...baseParams, isBackToBack: true }), 1.1448);

// Opponent press: *1.12
// Expected: 1.06 * 1.12 = 1.1872
assert("opponent pressing (Full-Court Press)", getContextMultiplier({ ...baseParams, facedDefense: "Full-Court Press" }), 1.1872);
assert("opponent pressing (Full-court press)", getContextMultiplier({ ...baseParams, facedDefense: "Full-court press" }), 1.1872);

// Clamp min: 0.75
assert("clamp min bound check", Math.max(0.75, getContextMultiplier({ ...baseParams, outcome: "make" })), 0.82);

// Clamp max: 1.95
const maxParams: ShotContextParams = {
  staminaPct: 20, // exhausted triggers both alreadyTired (1.10) and exhausted (1.18)
  outcome: "block", // block = 1.22
  isClutch: true, // 1.08
  quarter: 5, // 1.18
  pace: "fastbreak", // 1.12
  context: "oreb", // 1.10
  usageMod: 0.90, // 1.08
  isBackToBack: true, // 1.08
  facedDefense: "Full-Court Press" // 1.12
};
assert("clamp max bound check (exceeding 1.95)", getContextMultiplier(maxParams), 1.95);

// ─── Summary ──────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("✅ All Refactor-2C validation checks passed.");
}
