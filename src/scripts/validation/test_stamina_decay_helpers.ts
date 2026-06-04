/**
 * Refactor-1D Validation: staminaDecay.ts pure helper tests
 *
 * Run with:  npx ts-node --project tsconfig.json src/scripts/validation/test_stamina_decay_helpers.ts
 *
 * All assertions are synchronous and deterministic (no Math.random used here).
 * Math.random() remains in matchEngine.ts per Option A.
 */

import {
  calculateBenchRecoveryAmount,
  driftFormTowardNeutral,
  calculateBaseStaminaDecay,
} from "../../lib/match/staminaDecay";

// ─── Minimal Player stub ───────────────────────────────────────────────────
const stubPlayer = (id: string, ovr = 80, rarity = "GOLD") => ({
  id,
  name: `Player-${id}`,
  ovr,
  rarity,
  position: "PG",
  teamId: "team-1",
  skills: [],
  age: 25,
  nationality: "US",
  jerseyNumber: 0,
  stats: {},
} as any); // eslint-disable-line @typescript-eslint/no-explicit-any

// ─── Test helpers ─────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(label: string, actual: number, expected: number, tolerance = 0.001) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`  ✓ ${label}  (got ${actual.toFixed(4)})`);
    passed++;
  } else {
    console.error(`  ✗ ${label}  expected ${expected.toFixed(4)}, got ${actual.toFixed(4)}`);
    failed++;
  }
}

function assertLe(label: string, actual: number, max: number) {
  if (actual <= max) {
    console.log(`  ✓ ${label}  (${actual.toFixed(4)} <= ${max})`);
    passed++;
  } else {
    console.error(`  ✗ ${label}  expected <= ${max}, got ${actual.toFixed(4)}`);
    failed++;
  }
}

function assertGe(label: string, actual: number, min: number) {
  if (actual >= min) {
    console.log(`  ✓ ${label}  (${actual.toFixed(4)} >= ${min})`);
    passed++;
  } else {
    console.error(`  ✗ ${label}  expected >= ${min}, got ${actual.toFixed(4)}`);
    failed++;
  }
}

// ─── Suite 1: calculateBenchRecoveryAmount ────────────────────────────────
console.log("\n[Suite 1] calculateBenchRecoveryAmount");

{
  const p = stubPlayer("p1", 80);
  // GOLD 80 OVR — maxStamina should be 100 via getPlayerMaxStamina
  const result = calculateBenchRecoveryAmount(p, 5, 90);
  assert("recovery from 90 + 5 = 95 (below max)", result, 95);
}

{
  const p = stubPlayer("p2", 80);
  const result = calculateBenchRecoveryAmount(p, 20, 95);
  assertLe("cannot exceed maxStamina (95 + 20 capped at max)", result, 100);
}

{
  const p = stubPlayer("p3", 80);
  const result = calculateBenchRecoveryAmount(p, 5, undefined);
  // undefined currentStamina defaults to maxStamina, so result should equal maxStamina
  assertLe("undefined stamina defaults to max (no overflow)", result, 100);
}

{
  const p = stubPlayer("p4", 80);
  const result = calculateBenchRecoveryAmount(p, 0, 60);
  assert("zero recovery returns same stamina", result, 60);
}

// ─── Suite 2: driftFormTowardNeutral ──────────────────────────────────────
console.log("\n[Suite 2] driftFormTowardNeutral");

{
  // clampForm bounds are [0.85, 1.15]. Input 1.2 is already outside that range.
  // clampForm(Math.max(1.0, 1.2 - 0.003)) = clampForm(1.197) = 1.15
  const result = driftFormTowardNeutral(1.2, 0.003);
  assert("form above clamp-max (1.2) normalizes to 1.15 ceiling", result, 1.15);
}

{
  // clampForm bounds are [0.85, 1.15]. Input 0.8 is already outside that range.
  // clampForm(Math.min(1.0, 0.8 + 0.003)) = clampForm(0.803) = 0.85
  const result = driftFormTowardNeutral(0.8, 0.003);
  assert("form below clamp-min (0.8) normalizes to 0.85 floor", result, 0.85);
}

{
  const result = driftFormTowardNeutral(1.0, 0.003);
  assert("form at 1.0 stays at 1.0", result, 1.0);
}

{
  // Overshoot guard: a delta larger than the gap should not pass 1.0
  const result = driftFormTowardNeutral(1.001, 0.1);
  assert("overshoot guard clamps at 1.0 when drifting high→neutral", result, 1.0);
}

{
  const result = driftFormTowardNeutral(0.999, 0.1);
  assert("overshoot guard clamps at 1.0 when drifting low→neutral", result, 1.0);
}

{
  // Hard clamp: form must remain within allowed bounds [MIN_FORM, MAX_FORM]
  const result = driftFormTowardNeutral(0.5, 0.003);
  assertGe("form stays >= MIN_FORM clamp", result, 0.5);
}

// ─── Suite 3: calculateBaseStaminaDecay ───────────────────────────────────
console.log("\n[Suite 3] calculateBaseStaminaDecay");

{
  // Normal pace, no overtime, full stamina, zero jitter for deterministic result
  const result = calculateBaseStaminaDecay(100, 15, "normal", false, 0, 100);
  // baseLoss = 15 * normalPerSecond (0.022) + 0 * randomPerSecond = 0.33
  // No multipliers. result = 100 - 0.33 = 99.67
  assert("normal decay: 15s, pace=normal, no OT, zero jitter", result, 99.67, 0.1);
}

{
  // Fastbreak pace should apply fastbreak multiplier
  const resultFb = calculateBaseStaminaDecay(100, 15, "fastbreak", false, 0, 100);
  const resultNorm = calculateBaseStaminaDecay(100, 15, "normal", false, 0, 100);
  assertGe("fastbreak drains more than normal pace", resultNorm - resultFb, 0);
}

{
  // Overtime flag should add extra drain
  const resultOT = calculateBaseStaminaDecay(100, 15, "normal", true, 0, 100);
  const resultReg = calculateBaseStaminaDecay(100, 15, "normal", false, 0, 100);
  assertGe("overtime drains more than regular time", resultReg - resultOT, 0);
}

{
  // Exhaustion curve: stamina < 68 should drain faster
  const resultTired = calculateBaseStaminaDecay(60, 15, "normal", false, 0, 100);
  const resultFresh = calculateBaseStaminaDecay(100, 15, "normal", false, 0, 100);
  // tired player loses more absolute stamina per tick
  const lostTired = 60 - resultTired;
  const lostFresh = 100 - resultFresh;
  assertGe("mild fatigue curve: tired player (<68) decays faster", lostTired - lostFresh, 0);
}

{
  // Severe exhaustion: stamina < 45
  const resultSevere = calculateBaseStaminaDecay(30, 15, "normal", false, 0, 100);
  const resultMild   = calculateBaseStaminaDecay(60, 15, "normal", false, 0, 100);
  const lostSevere = 30 - resultSevere;
  const lostMild   = 60 - resultMild;
  assertGe("severe fatigue curve: very tired player (<45) decays fastest", lostSevere - lostMild, 0);
}

{
  // Floor: result must never go below 0
  const result = calculateBaseStaminaDecay(0.1, 999, "fastbreak", true, 1, 100);
  assertGe("stamina floor: result is never negative", result, 0);
}

{
  // Ceiling: result must never exceed maxStamina
  const result = calculateBaseStaminaDecay(100, 0, "normal", false, 0, 100);
  assertLe("stamina ceiling: result never exceeds maxStamina", result, 100);
}

// ─── Summary ──────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("✅ All Refactor-1D validation checks passed.");
}
