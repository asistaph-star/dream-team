/**
 * MatchEngine-Refactor-2D Validation: shotResolution.ts pure helper tests
 *
 * Run with:  npx ts-node --project tsconfig.json src/scripts/validation/test_shot_resolution_helpers.ts
 *
 * All assertions are synchronous and deterministic.
 */

import {
  getHomeCourtBoost,
  getAwayPenalty,
  getClutchMod,
  getAssistChance,
  calculateAndOneChance,
  calculateUserPutbackChance,
  calculateAiPutbackChance,
  calculateFinalScoringChance
} from "../../lib/match/shotResolution";

let passed = 0;
let failed = 0;

function assert(label: string, actual: any, expected: any, tolerance = 0.0001) {
  if (typeof actual === "number" && typeof expected === "number") {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
      console.log(`  ✓ ${label}  (got ${actual.toFixed(6)})`);
      passed++;
    } else {
      console.error(`  ✗ ${label}  expected ${expected.toFixed(6)}, got ${actual.toFixed(6)}`);
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

// ─── Suite 1: Home Court Boosts & Away Penalties ──────────────────────────
console.log("\n[Suite 1] Home Court Boosts & Away Penalties");

// getHomeCourtBoost: max clamp 0.025
// Common: 0.025. Boost at crowdEnergy = 0.5, no rally = 0.025 * 0.5 = 0.0125
assert("Common boost, energy 0.5", getHomeCourtBoost("Common", 0.5, false), 0.0125);
// Mythic: 0.005. Boost at crowdEnergy = 1.0, rally = 0.005 * 1.0 + 0.01 = 0.015
assert("Mythic boost, energy 1.0, rally", getHomeCourtBoost("Mythic", 1.0, true), 0.015);
// Legendary: 0.010. Boost at crowdEnergy = 0.2, no rally = 0.002
assert("Legendary boost, energy 0.2", getHomeCourtBoost("Legendary", 0.2, false), 0.002);
// Rare: 0.020. Boost at crowdEnergy = 1.0, rally = 0.020 + 0.01 = 0.03 (clamps to 0.025)
assert("Rare boost clamp, energy 1.0, rally", getHomeCourtBoost("Rare", 1.0, true), 0.025);

// getAwayPenalty: max clamp 0.020
// Common: 0.015. Penalty at crowdEnergy = 0.5, no rally = 0.0075
assert("Common penalty, energy 0.5", getAwayPenalty("Common", 0.5, false), 0.0075);
// Mythic: 0.005. Penalty at crowdEnergy = 1.0, rally = 0.005 * 1.0 + 0.01 = 0.015
assert("Mythic penalty, energy 1.0, rally", getAwayPenalty("Mythic", 1.0, true), 0.015);
// Rare: 0.012. Penalty at crowdEnergy = 1.0, rally = 0.012 + 0.01 = 0.022 (clamps to 0.020)
assert("Rare penalty clamp, energy 1.0, rally", getAwayPenalty("Rare", 1.0, true), 0.020);


// ─── Suite 2: Clutch Modifier ─────────────────────────────────────────────
console.log("\n[Suite 2] Clutch Modifier");

// Clutch mod: base is 1.0 + (clutchRating * intensityMult) + formAmplification + staminaOverride (0.04)
// Clamped to [0.88, 1.20]
assert("Clutch inactive", getClutchMod(0.05, false, "normal", 1.0), 1.0);

// Clutch active, intensity normal (mult 1.0), form neutral (1.0), clutchRating 0.05
// Expected: 1.0 + (0.05 * 1.0) + 0.00 + 0.04 = 1.09
assert("Clutch active, normal intensity", getClutchMod(0.05, true, "normal", 1.0), 1.09);

// Clutch active, intensity high (mult 1.4), form high (1.10), clutchRating 0.08
// Expected: 1.0 + (0.08 * 1.4) + 0.03 + 0.04 = 1.0 + 0.112 + 0.03 + 0.04 = 1.182
assert("Clutch active, high intensity & high form", getClutchMod(0.08, true, "high", 1.10), 1.182);

// Clutch active, intensity high, form low (0.85), clutchRating 0.10
// Expected: 1.0 + (0.10 * 1.4) - 0.02 + 0.04 = 1.0 + 0.14 - 0.02 + 0.04 = 1.16
assert("Clutch active, high intensity & low form", getClutchMod(0.10, true, "high", 0.85), 1.16);

// Clutch active, extreme inputs (exceed clamp limits)
// clutchRating = 0.25, high intensity (mult 1.4)
// Expected: 1.0 + 0.35 + 0.03 + 0.04 = 1.42 (clamps to 1.20)
assert("Clutch max clamp", getClutchMod(0.25, true, "high", 1.15), 1.20);


// ─── Suite 3: Assist Chance Clamping ───────────────────────────────────────
console.log("\n[Suite 3] Assist Chance Clamping");

// Formula: Math.max(0.38, Math.min(0.72, 0.38 + (assistRating / 330)))
// rating 0: 0.38
assert("Assist rating 0", getAssistChance(0), 0.38);
// rating 100: 0.38 + 100/330 = 0.38 + 0.30303 = 0.68303
assert("Assist rating 100", getAssistChance(100), 0.38 + 100/330);
// rating 200: 0.38 + 200/330 = 0.38 + 0.60606 = 0.986 (clamps to 0.72)
assert("Assist rating 200 (clamped)", getAssistChance(200), 0.72);


// ─── Suite 4: AND-1 Chance Calculation ─────────────────────────────────────
console.log("\n[Suite 4] AND-1 Chance");

// Formula: (is3PT ? 0.01 : 0.03) * getFoulStaminaModifier(opponentAvgStamina) * (0.85 + (finishingRating / 100) * 0.30)
// capped at 0.15
// opponentAvgStamina = 80 => getFoulStaminaModifier(80). 
// getFoulStaminaModifier(80) returns 1.0 because 80 >= 70.
// For finishingRating = 80: finishingMod = 0.85 + 0.24 = 1.09
// For 2PT: baseRate = 0.03. Chance = 0.03 * 1.0 * 1.09 = 0.0327
assert("AND-1 chance 2PT, stam 80, finishing 80", calculateAndOneChance(false, 80, 80), 0.0327);

// For 3PT: baseRate = 0.01. Chance = 0.01 * 1.0 * 1.09 = 0.0109
assert("AND-1 chance 3PT, stam 80, finishing 80", calculateAndOneChance(true, 80, 80), 0.0109);


// ─── Suite 5: User & AI Putback Chances (Asymmetry) ────────────────────────
console.log("\n[Suite 5] User & AI Putback Chances (Asymmetry)");

// User Putback: clamps total to [0.20, 0.80]
// baseRatio = 100 / (100 + 100) = 0.50
// teamAvgStamina = 80 => getStaminaMod(80) = 0.96
// playerStaminaMod = 1.0, formRating = 1.0, momentumBonus = 1.08, decisionWeightMod = 1.025, glassTouchActive = true (0.035), glassStrikeBoost = 0.02
// coreVal = 0.50 * 0.96 * 1.08 * 1.0 * 1.0 * 1.025 = 0.53136
// total = 0.53136 + 0.035 + 0.02 = 0.58636
assert("User Putback baseline", calculateUserPutbackChance({
  offEff: 100,
  defEff: 100,
  teamAvgStamina: 80,
  momentumBonus: 1.08,
  playerStaminaMod: 1.0,
  formRating: 1.0,
  decisionWeightMod: 1.025,
  glassTouchActive: true,
  glassStrikeBoost: 0.02
}), 0.58636);

// AI Putback: clamps only baseRatio to [0.30, 0.80] first, then multiplies, then adds bonuses
// baseRatio = 20 / (20 + 180) = 0.10 => clamped to 0.30
// teamAvgStamina = 80 => getStaminaMod(80) = 0.96
// playerStaminaMod = 1.0, formRating = 1.0, glassTouchActive = false, glassStrikeBoost = 0
// Expected: 0.30 * 0.96 * 1.0 * 1.0 = 0.288
assert("AI Putback low efficiency base clamp", calculateAiPutbackChance({
  offEff: 20,
  defEff: 180,
  teamAvgStamina: 80,
  playerStaminaMod: 1.0,
  formRating: 1.0,
  glassTouchActive: false,
  glassStrikeBoost: 0
}), 0.288);


// ─── Suite 6: Final Scoring Chance Calculation ──────────────────────────────
console.log("\n[Suite 6] Final Scoring Chance");

// Formula: total = (finalChance * staminaMod * formRating * clutchMod * effectiveZoneMod * effectivePressMod * usageMod) * decisionWeightMod * individual3ptMod + additiveBonus + difficultyMod
// Clamped to [0.15, maxCeilingLimit]
assert("Normal final chance user", calculateFinalScoringChance({
  finalChance: 0.50,
  staminaMod: 1.0,
  formRating: 1.0,
  clutchMod: 1.0,
  effectiveZoneMod: 1.0,
  effectivePressMod: 1.0,
  usageMod: 1.0,
  individual3ptMod: 1.0,
  additiveBonus: 0.02,
  difficultyMod: -0.05,
  decisionWeightMod: 1.0,
  maxCeilingLimit: 0.85
}), 0.47);

// High clamp check
assert("Final chance exceeding max ceiling 0.80 (AI Blitz)", calculateFinalScoringChance({
  finalChance: 0.85,
  staminaMod: 1.0,
  formRating: 1.1,
  clutchMod: 1.1,
  effectiveZoneMod: 1.0,
  effectivePressMod: 1.0,
  usageMod: 1.0,
  individual3ptMod: 1.0,
  additiveBonus: 0.10,
  difficultyMod: 0.0,
  decisionWeightMod: 1.0,
  maxCeilingLimit: 0.80
}), 0.80);

// Low clamp check
assert("Final chance below min clamp 0.15", calculateFinalScoringChance({
  finalChance: 0.10,
  staminaMod: 0.5,
  formRating: 0.8,
  clutchMod: 0.9,
  effectiveZoneMod: 1.0,
  effectivePressMod: 1.0,
  usageMod: 0.9,
  individual3ptMod: 0.9,
  additiveBonus: -0.10,
  difficultyMod: -0.095,
  decisionWeightMod: 1.0,
  maxCeilingLimit: 0.85
}), 0.15);


// ─── Summary ──────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("✅ All Refactor-2D validation checks passed.");
}
