/**
 * Validation tests for blockSystem.ts pure helper functions.
 * Run with: npx ts-node src/scripts/validation/test_block_system_helpers.ts
 */

import {
  calculateBlockChance,
  getSkyWallIdentity,
  calculateSkyWallScale
} from "../../lib/match/blockSystem";
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

console.log("\n--- Suite: Block System Helpers ---");

// Test calculateBlockChance
{
  // blockRating = 70, rimWardenTriggered = false, playerStaminaMod = 1.0
  // baseBlockChance = (70 / 100) * 0.055 = 0.0385
  // blockChance = 0.0385 * 1.0 = 0.0385
  let res = calculateBlockChance(70, false, 1.0);
  assert("calculateBlockChance - base", res, 0.0385);

  // rimWardenTriggered = true
  // baseBlockChance = (70 / 100) * 0.095 = 0.0665
  res = calculateBlockChance(70, true, 1.0);
  assert("calculateBlockChance - rim warden", res, 0.0665);

  // staminaMod = 0.5
  res = calculateBlockChance(70, true, 0.5);
  assert("calculateBlockChance - low stamina", res, 0.03325);
}

// Test getSkyWallIdentity
{
  const p = stubPlayer("p1", {
    block: 80,
    strength: 60,
    stamina: 70,
    onBall: 90
  });
  // getBlockRating(p) + getStrengthRating(p) + getStaminaRating(p) + getOnBallDefenseRating(p) = 80 + 60 + 70 + 90 = 300
  // identity = 300 / 4 = 75
  const res = getSkyWallIdentity(p);
  assert("getSkyWallIdentity", res, 75);
}

// Test calculateSkyWallScale
{
  // identity = 80
  // scale = 0.90 + (80 / 100) * 0.20 = 1.06
  // penalty = Math.min(0.013, 0.008 + (80 / 100) * 0.004) = Math.min(0.013, 0.0112) = 0.0112
  // baseDrain = Math.min(10, Math.round(7 * 1.06)) = Math.min(10, 7) = 7
  let res = calculateSkyWallScale(80);
  assert("calculateSkyWallScale - scale", res.scale, 1.06);
  assert("calculateSkyWallScale - penalty", res.penalty, 0.0112);
  assert("calculateSkyWallScale - baseDrain", res.baseDrain, 7);

  // identity = 120 (extreme)
  // scale = 0.90 + 0.24 = 1.14
  // penalty = Math.min(0.013, 0.008 + 1.2 * 0.004) = Math.min(0.013, 0.0128) = 0.0128
  // baseDrain = Math.min(10, Math.round(7 * 1.14)) = Math.min(10, 8) = 8
  res = calculateSkyWallScale(120);
  assert("calculateSkyWallScale - penalty bounds", res.penalty, 0.0128);
  assert("calculateSkyWallScale - baseDrain bounds", res.baseDrain, 8);

  // identity = 150 (exceeds cap for penalty)
  // penalty = Math.min(0.013, 0.008 + 1.5 * 0.004) = Math.min(0.013, 0.014) = 0.013
  res = calculateSkyWallScale(150);
  assert("calculateSkyWallScale - penalty max cap", res.penalty, 0.013);
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Block System validation checks passed.");
}
