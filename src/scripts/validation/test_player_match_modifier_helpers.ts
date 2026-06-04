/**
 * Validation tests for playerMatchModifiers.ts pure helper functions.
 * Run with: npx ts-node src/scripts/validation/test_player_match_modifier_helpers.ts
 */

import {
  getTovStamMod,
  getLowestStaminaPlayer,
  getPrimaryBallHandler,
  isEnergyDrinkLocked,
  getUsageMod
} from "../../lib/match/playerMatchModifiers";
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

console.log("\n--- Suite: Player Match Modifier Helpers ---");

// Test getTovStamMod
{
  assert("getTovStamMod - high", getTovStamMod(75), 1.0);
  assert("getTovStamMod - mid", getTovStamMod(60), 1.10);
  assert("getTovStamMod - low", getTovStamMod(40), 1.22);
  assert("getTovStamMod - critical", getTovStamMod(20), 1.35);
}

// Test isEnergyDrinkLocked
{
  assert("isEnergyDrinkLocked - not locked", isEnergyDrinkLocked(undefined, 100), false);
  assert("isEnergyDrinkLocked - locked time", isEnergyDrinkLocked(150, 100), true);
  assert("isEnergyDrinkLocked - expired lock", isEnergyDrinkLocked(150, 200), false);
}

// Test getLowestStaminaPlayer and array mutation safety
{
  const p1 = stubPlayer("1", {});
  const p2 = stubPlayer("2", {});
  const p3 = stubPlayer("3", {});
  const lineup = [p1, p2, p3];
  const stamina = { "1": 80, "2": 50, "3": 90 };

  const lowest = getLowestStaminaPlayer(lineup, stamina);
  assert("getLowestStaminaPlayer finds lowest", lowest.id, "2");

  // Check array mutation safety
  const orderCorrect = lineup[0] === p1 && lineup[1] === p2 && lineup[2] === p3;
  assert("getLowestStaminaPlayer does not mutate input lineup array order", orderCorrect, true);
}

// Test getPrimaryBallHandler and array mutation safety
{
  const p1 = stubPlayer("1", { assist: 60, handle: 60 });
  const p2 = stubPlayer("2", { assist: 80, handle: 80 });
  const p3 = stubPlayer("3", { assist: 70, handle: 70 });
  const team = [p1, p2, p3];

  const primary = getPrimaryBallHandler(team);
  assert("getPrimaryBallHandler finds player with highest rating average", primary.id, "2");

  // Check array mutation safety
  const orderCorrect = team[0] === p1 && team[1] === p2 && team[2] === p3;
  assert("getPrimaryBallHandler does not mutate input team array order", orderCorrect, true);
}

// Test getUsageMod
{
  const history = [
    { team: "user" as const, playerId: "1" },
    { team: "user" as const, playerId: "1" },
    { team: "user" as const, playerId: "1" },
    { team: "user" as const, playerId: "2" },
    { team: "user" as const, playerId: "3" }
  ];

  // User team has 5 possessions in history. Player "1" used 3/5 times = 0.60 (60% usage)
  // usageRate >= 0.50 -> 0.82
  assert("getUsageMod - extreme usage", getUsageMod("1", "user", history), 0.82);

  // Player "2" used 1/5 times = 0.20
  // usageRate < 0.35 -> 1.0
  assert("getUsageMod - normal usage", getUsageMod("2", "user", history), 1.0);
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All Player Match Modifier validation checks passed.");
}
