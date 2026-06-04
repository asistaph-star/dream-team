/**
 * Validation tests for archetypeEffects.ts pure helper functions.
 * Run with: npx ts-node src/scripts/validation/test_archetype_effect_helpers.ts
 */

import {
  getBenchCaptainIdentity,
  calculateBenchCaptainRecovery,
  getDefensiveAnchorIdentity,
  calculateDefensiveAnchorTriggerScale,
  calculateDefensiveAnchorLeaderScale,
  calculateDefensiveAnchorLeadershipReduction,
  calculateDefensiveAnchorTargetResistance,
  getPressureCoachIdentity,
  calculatePressureCoachScale,
  getEnforcerIdentity,
  calculateEnforcerScale
} from "../../lib/match/archetypeEffects";
import { Player } from "../../lib/types/player";

const stubPlayer = (id: string, ratings: Partial<Player>): Player => ({
  id,
  name: `Player-${id}`,
  ovr: 80,
  rarity: "Gold",
  position: "C",
  defense: 75,
  offense: 75,
  shooting: 75,
  rebounds: 75,
  assists: 75,
  stamina: 75,
  skills: [],
  ...ratings
} as any);

let passed = 0;
let failed = 0;

function assert(label: string, actual: any, expected: any, tolerance = 0.001) {
  if (typeof actual === "number" && typeof expected === "number") {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
      console.log(`  [PASS] ${label} (got ${actual.toFixed(4)})`);
      passed++;
    } else {
      console.error(`  [FAIL] ${label} expected ${expected.toFixed(4)}, got ${actual.toFixed(4)}`);
      failed++;
    }
  } else {
    if (actual === expected) {
      console.log(`  [PASS] ${label} (got ${actual})`);
      passed++;
    } else {
      console.error(`  [FAIL] ${label} expected ${expected}, got ${actual}`);
      failed++;
    }
  }
}

console.log("\n--- Suite: Archetype Effects Helpers ---");

// Test Bench Captain
{
  const p = stubPlayer("1", {
    calm: 80,
    stamina: 70,
    assist: 90
  });
  const identity = getBenchCaptainIdentity(p);
  assert("getBenchCaptainIdentity", identity, 80);

  // leaderIdentity = 80, leaderCalm = 80
  // scale = 0.85 + (80 / 100) * 0.30 = 1.09
  // staminaRecover = Math.min(8, Math.round(6 * 1.09)) = Math.min(8, 7) = 7
  // formStabilize = Math.min(0.008, 0.004 + (80 / 100) * 0.004) = 0.0072
  const rec = calculateBenchCaptainRecovery(identity, 80);
  assert("calculateBenchCaptainRecovery - stamina", rec.staminaRecover, 7);
  assert("calculateBenchCaptainRecovery - form", rec.formStabilize, 0.0072);
}

// Test Defensive Anchor
{
  const p = stubPlayer("1", {
    onBall: 80,
    stamina: 70,
    strength: 90,
    steal: 80
  });
  const identity = getDefensiveAnchorIdentity(p);
  assert("getDefensiveAnchorIdentity", identity, 80);

  // level = 2
  // triggerMultiplier = 1.15
  // baseScale = 0.90 + (80 / 100) * 0.20 = 1.06
  // final trigger scale = 1.06 * 1.15 = 1.219
  assert("calculateDefensiveAnchorTriggerScale - lvl 2", calculateDefensiveAnchorTriggerScale(identity, 2), 1.219);

  // leader scale = 0.90 + (80 / 100) * 0.20 = 1.06
  assert("calculateDefensiveAnchorLeaderScale", calculateDefensiveAnchorLeaderScale(identity), 1.06);

  // counterIdentity = 90
  // reduction = Math.min(0.20, 0.10 + (90 / 100) * 0.10) = 0.19
  assert("calculateDefensiveAnchorLeadershipReduction - normal", calculateDefensiveAnchorLeadershipReduction(90), 0.19);
  // counterIdentity = 150
  // reduction = Math.min(0.20, 0.10 + 1.5 * 0.10) = 0.20
  assert("calculateDefensiveAnchorLeadershipReduction - cap", calculateDefensiveAnchorLeadershipReduction(150), 0.20);

  // targetResistance = (70 / 100) * 0.15 = 0.105
  assert("calculateDefensiveAnchorTargetResistance", calculateDefensiveAnchorTargetResistance(70), 0.105);
}

// Test Pressure Coach
{
  const p = stubPlayer("1", {
    assist: 80,
    onBall: 70,
    stamina: 90
  });
  const identity = getPressureCoachIdentity(p);
  assert("getPressureCoachIdentity", identity, 80);
  assert("calculatePressureCoachScale", calculatePressureCoachScale(identity), 1.06);
}

// Test Enforcer Lift
{
  const p = stubPlayer("1", {
    onBall: 80,
    strength: 70,
    stamina: 90
  });
  const identity = getEnforcerIdentity(p);
  assert("getEnforcerIdentity", identity, 80);
  assert("calculateEnforcerScale", calculateEnforcerScale(identity), 1.09);
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Archetype Effects validation checks passed.");
}
