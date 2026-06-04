/**
 * Validation tests for strategyEffects.ts pure helper functions.
 * Run with: npx ts-node src/scripts/validation/test_strategy_effect_helpers.ts
 */

import {
  calculateOffensiveStrategyMultiplier,
  calculateStrategyLevelMultiplier,
  checkStrategyDegradation
} from "../../lib/match/strategyEffects";
import { Player } from "../../lib/types/player";

const stubPlayer = (id: string, ratings: Partial<Player>): Player => ({
  id,
  name: `Player-${id}`,
  ovr: 80,
  rarity: "Gold",
  position: "SG",
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

console.log("\n--- Suite: Strategy Effects Helpers ---");

const pg = stubPlayer("1", { position: "PG", stats: { STA: 80 } } as any);
const sg = stubPlayer("2", { position: "SG", stats: { STA: 70 } } as any);
const sf = stubPlayer("3", { position: "SF", stats: { STA: 60 } } as any);
const pf = stubPlayer("4", { position: "PF", stats: { STA: 50 } } as any);
const c = stubPlayer("5", { position: "C", stats: { STA: 40 } } as any);
const lineup = [pg, sg, sf, pf, c];

// Test calculateStrategyLevelMultiplier
{
  assert("calculateStrategyLevelMultiplier - level 1", calculateStrategyLevelMultiplier(1), 1.0);
  assert("calculateStrategyLevelMultiplier - level 2", calculateStrategyLevelMultiplier(2), 1.02);
  assert("calculateStrategyLevelMultiplier - level 5", calculateStrategyLevelMultiplier(5), 1.08);
}

// Test calculateOffensiveStrategyMultiplier
{
  const stamina: Record<string, number> = { "1": 90, "2": 80, "3": 70, "4": 60, "5": 50 };

  // Isolation (ISO)
  // star (highest OVR, here all OVR is 80, let's make pg OVR 90)
  const isoLineup = [stubPlayer("1", { ovr: 90 }), sg, sf, pf, c];
  // star "1" stamina = 90. ss >= 70 -> 1.05
  assert("calculateOffensiveStrategyMultiplier - ISO high stam", calculateOffensiveStrategyMultiplier("Isolation (ISO)", isoLineup, stamina), 1.05);

  const lowStam: Record<string, number> = { "1": 20, "2": 20, "3": 20, "4": 20, "5": 20 };
  assert("calculateOffensiveStrategyMultiplier - ISO low stam", calculateOffensiveStrategyMultiplier("Isolation (ISO)", isoLineup, lowStam), 0.85);

  // Run & Gun
  // teamAvg = (90+80+70+60+50)/5 = 70. 70 >= 60 -> 1.02
  assert("calculateOffensiveStrategyMultiplier - Run & Gun", calculateOffensiveStrategyMultiplier("Run & Gun", lineup, stamina), 1.02);
}

// Test checkStrategyDegradation
{
  const stamina: Record<string, number> = { "1": 90, "2": 80, "3": 70, "4": 60, "5": 50 };

  // Run & Gun, teamAvg = 60. Should warnings: "Run & Gun DEGRADED — team losing transition speed"
  const warnStamina: Record<string, number> = { "1": 60, "2": 60, "3": 60, "4": 60, "5": 60 };
  let deg = checkStrategyDegradation("Run & Gun", "Man-to-Man", lineup, warnStamina);
  assert("checkStrategyDegradation - Run & Gun warning", deg.warnings.includes("Run & Gun DEGRADED — team losing transition speed"), true);
  assert("checkStrategyDegradation - Run & Gun no revert", deg.newOffStrategy, "Run & Gun");

  // Run & Gun with very low team stamina (teamAvg < 50)
  const lowStamina: Record<string, number> = { "1": 40, "2": 40, "3": 40, "4": 40, "5": 40 };
  deg = checkStrategyDegradation("Run & Gun", "Man-to-Man", lineup, lowStamina);
  assert("checkStrategyDegradation - Run & Gun revert", deg.newOffStrategy, "Motion Offense");
  assert("checkStrategyDegradation - Run & Gun revert event count", deg.reverts.length, 1);
  assert("checkStrategyDegradation - Run & Gun revert source", deg.reverts[0].from, "Run & Gun");

  // Check array mutation on lineup parameter during sorting
  const originalOrder = [...lineup].map(p => p.id);
  checkStrategyDegradation("Isolation (ISO)", "Man-to-Man", lineup, stamina);
  const currentOrder = lineup.map(p => p.id);
  let mutated = false;
  for (let i = 0; i < originalOrder.length; i++) {
    if (originalOrder[i] !== currentOrder[i]) mutated = true;
  }
  assert("Lineup array not mutated during degradation check", mutated, false);
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Strategy Effects validation checks passed.");
}
