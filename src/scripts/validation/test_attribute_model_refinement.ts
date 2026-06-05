// test_attribute_model_refinement.ts
// Phase: AttributeModelRefinement -- Validation Lock
// Verifies basketballIQ and hustle attributes are correctly integrated
// into the player attribute model with proper star-up, NBA mapping,
// identity helpers, and protection rules.

import { Player } from "../../lib/types/player";
import { deriveAttributesFromNbaStats, NbaDerivedAttributes } from "../../lib/utils/nbaAttributeMapper";
import { getDetailedAttributes, DetailedAttributes, applyStarGrowth, repairStarGrowth, deriveOffenseDefenseFromAttributes, getCumulativeStarGrowthGain } from "../../lib/utils/starGrowth";
import { getBasketballIQRating, getHustleRating, getCalmRating } from "../../lib/utils/playerIdentity";
import { mockPlayers } from "../../lib/data/mockPlayers";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

function assertClose(actual: number, expected: number, tolerance: number, label: string) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`  PASS: ${label} (${actual})`);
    passed++;
  } else {
    console.error(`  FAIL: ${label} -- expected ~${expected}, got ${actual} (diff=${diff})`);
    failed++;
  }
}

// ─── Helper: create a minimal test player ───
function makeTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "test_player",
    name: "Test Player",
    position: "PG",
    rarity: "Rare",
    level: 20,
    maxLevel: 30,
    exp: 0,
    ovr: 85,
    offense: 120,
    defense: 100,
    shooting: 80,
    speed: 80,
    strength: 70,
    playmaking: 85,
    stamina: 100,
    salary: 400,
    baseSalary: 400,
    ppg: 20.0,
    rpg: 5.0,
    apg: 7.0,
    spg: 1.5,
    bpg: 0.5,
    topg: 2.5,
    pfpg: 2.0,
    quantity: 1,
    starLevel: 0,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: Type Presence Checks
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 1: Type Presence ===");

{
  const player = makeTestPlayer({ basketballIQ: 85, hustle: 78 });
  assert(player.basketballIQ === 85, "Player interface accepts basketballIQ");
  assert(player.hustle === 78, "Player interface accepts hustle");
}

{
  const player = makeTestPlayer();
  assert(player.basketballIQ === undefined, "basketballIQ is optional (undefined when not set)");
  assert(player.hustle === undefined, "hustle is optional (undefined when not set)");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 2: NbaDerivedAttributes includes both
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 2: NBA Derived Attributes ===");

{
  const player = makeTestPlayer();
  const derived = deriveAttributesFromNbaStats(player);
  assert("basketballIQ" in derived, "NbaDerivedAttributes includes basketballIQ");
  assert("hustle" in derived, "NbaDerivedAttributes includes hustle");
  assert(Number.isFinite(derived.basketballIQ), "basketballIQ is finite");
  assert(Number.isFinite(derived.hustle), "hustle is finite");
  assert(!Number.isNaN(derived.basketballIQ), "basketballIQ is not NaN");
  assert(!Number.isNaN(derived.hustle), "hustle is not NaN");
  assert(derived.basketballIQ >= 25, "basketballIQ >= 25 (min clamp)");
  assert(derived.hustle >= 25, "hustle >= 25 (min clamp)");
  assert(derived.basketballIQ <= 185, "basketballIQ <= 185 (max clamp)");
  assert(derived.hustle <= 185, "hustle <= 185 (max clamp)");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Missing Stats Fallback
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 3: Missing Stats Fallback ===");

{
  // Player with NO currentSeasonStats and NO per-game stats
  const barePlayer = makeTestPlayer({
    ppg: undefined,
    rpg: undefined,
    apg: undefined,
    spg: undefined,
    bpg: undefined,
    topg: undefined,
    pfpg: undefined,
    currentSeasonStats: undefined,
  });
  const derived = deriveAttributesFromNbaStats(barePlayer);
  assert(Number.isFinite(derived.basketballIQ), "basketballIQ finite with missing stats");
  assert(Number.isFinite(derived.hustle), "hustle finite with missing stats");
  assert(derived.basketballIQ >= 25 && derived.basketballIQ <= 185, "basketballIQ in range with missing stats");
  assert(derived.hustle >= 25 && derived.hustle <= 185, "hustle in range with missing stats");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 4: DetailedAttributes includes both
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 4: DetailedAttributes ===");

{
  const player = makeTestPlayer();
  const details = getDetailedAttributes(player);
  assert("basketballIQ" in details, "DetailedAttributes includes basketballIQ");
  assert("hustle" in details, "DetailedAttributes includes hustle");
  assert(Number.isFinite(details.basketballIQ), "getDetailedAttributes basketballIQ finite");
  assert(Number.isFinite(details.hustle), "getDetailedAttributes hustle finite");
  assert(details.basketballIQ >= 25, "getDetailedAttributes basketballIQ >= 25");
  assert(details.hustle >= 25, "getDetailedAttributes hustle >= 25");

  // Verify that finishing is still present (not duplicated, still the original)
  assert("finishing" in details, "finishing still present in DetailedAttributes");
  assert(Number.isFinite(details.finishing), "finishing still finite");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 5: Player Identity Helpers
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 5: Player Identity Helpers ===");

{
  // When attributes are set
  const player = makeTestPlayer({ basketballIQ: 90, hustle: 82 });
  assert(getBasketballIQRating(player) === 90, "getBasketballIQRating returns stored value");
  assert(getHustleRating(player) === 82, "getHustleRating returns stored value");
}

{
  // Fallback: basketballIQ falls back to calm, then playmaking
  const playerWithCalm = makeTestPlayer({ calm: 88 });
  assert(getBasketballIQRating(playerWithCalm) === 88, "getBasketballIQRating fallback to calm");

  const playerBare = makeTestPlayer();
  assert(getBasketballIQRating(playerBare) === playerBare.playmaking, "getBasketballIQRating fallback to playmaking");
}

{
  // Fallback: hustle falls back to speed/stamina blend
  const playerNoHustle = makeTestPlayer({ speed: 80, stamina: 100 });
  const expected = Math.round(80 * 0.55 + 100 * 0.45);
  assert(getHustleRating(playerNoHustle) === expected, `getHustleRating fallback to speed/stamina blend (${expected})`);
}

// ═══════════════════════════════════════════════════════════════
// SECTION 6: Star-Up Boost Rules
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 6: Star-Up Boost Rules ===");

{
  const base = makeTestPlayer({ starLevel: 0, starGrowthAppliedLevel: 0 });
  const baseDetails = getDetailedAttributes(base);

  // Apply star level 1 (Silver tier, +1 attribute gain)
  const star1 = applyStarGrowth(base, 1);
  const gain = getCumulativeStarGrowthGain(1);
  const iqGain = Math.floor(gain.attributeGain / 2);

  // basketballIQ should get half-rate
  assertClose(
    star1.basketballIQ!,
    baseDetails.basketballIQ + iqGain,
    1,
    `basketballIQ half-rate boost at star 1 (gain=${iqGain})`
  );

  // hustle should get full-rate
  assertClose(
    star1.hustle!,
    baseDetails.hustle + gain.attributeGain,
    1,
    `hustle full-rate boost at star 1 (gain=${gain.attributeGain})`
  );

  // calm should get full-rate (control check)
  assertClose(
    star1.calm!,
    baseDetails.calm + gain.attributeGain,
    1,
    `calm full-rate boost at star 1 (control)`
  );
}

{
  // Verify at higher star levels (star 6 = Blue tier, cumulative gain)
  const base = makeTestPlayer({ starLevel: 0, starGrowthAppliedLevel: 0 });
  const baseDetails = getDetailedAttributes(base);
  const star6 = applyStarGrowth(base, 6);
  const gain6 = getCumulativeStarGrowthGain(6);
  const iqGain6 = Math.floor(gain6.attributeGain / 2);

  assertClose(
    star6.basketballIQ!,
    baseDetails.basketballIQ + iqGain6,
    1,
    `basketballIQ half-rate at star 6 (iqGain=${iqGain6}, fullGain=${gain6.attributeGain})`
  );
  assertClose(
    star6.hustle!,
    baseDetails.hustle + gain6.attributeGain,
    1,
    `hustle full-rate at star 6`
  );
}

// ═══════════════════════════════════════════════════════════════
// SECTION 7: Protected Fields
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 7: Protected Fields ===");

{
  const base = makeTestPlayer({
    starLevel: 0,
    starGrowthAppliedLevel: 0,
    salary: 400,
    baseSalary: 400,
    threePtTendency: 0.35,
    driveTendency: 0.25,
    pullUpTendency: 0.15,
    foulDrawTendency: 0.20,
    currentSeasonStats: { season: "2025-26" },
  });

  const star5 = applyStarGrowth(base, 5);

  assert(star5.ovr === base.ovr, "OVR protected from star-up");
  assert(star5.salary === base.salary, "salary protected from star-up");
  assert(star5.baseSalary === base.baseSalary, "baseSalary protected from star-up");
  assert(star5.threePtTendency === base.threePtTendency, "threePtTendency protected");
  assert(star5.driveTendency === base.driveTendency, "driveTendency protected");
  assert(star5.pullUpTendency === base.pullUpTendency, "pullUpTendency protected");
  assert(star5.foulDrawTendency === base.foulDrawTendency, "foulDrawTendency protected");
  assert(star5.currentSeasonStats?.season === "2025-26", "currentSeasonStats protected");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 8: deriveOffenseDefenseFromAttributes Unchanged
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 8: Offense/Defense Derivation Unchanged ===");

{
  const details: DetailedAttributes = {
    threePt: 100,
    twoPt: 100,
    freeThrow: 100,
    finishing: 100,
    handle: 100,
    assist: 100,
    steal: 100,
    block: 100,
    rebound: 100,
    onBall: 100,
    calm: 100,
    basketballIQ: 50,  // Different value
    hustle: 50,        // Different value
  };

  const derived1 = deriveOffenseDefenseFromAttributes(details);

  // Same attributes but with different IQ/hustle should produce identical offense/defense
  const details2: DetailedAttributes = {
    ...details,
    basketballIQ: 150,
    hustle: 150,
  };
  const derived2 = deriveOffenseDefenseFromAttributes(details2);

  assert(derived1.offense === derived2.offense, "basketballIQ does not affect offense derivation");
  assert(derived1.defense === derived2.defense, "hustle does not affect defense derivation");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 9: repairStarGrowth prevents double boosting
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 9: repairStarGrowth ===");

{
  const base = makeTestPlayer({ starLevel: 3, starGrowthAppliedLevel: 0 });
  const repaired = repairStarGrowth(base);
  assert(repaired.starGrowthAppliedLevel === 3, "repairStarGrowth sets applied level");
  assert(Number.isFinite(repaired.basketballIQ!), "repairStarGrowth basketballIQ finite");
  assert(Number.isFinite(repaired.hustle!), "repairStarGrowth hustle finite");

  // Double repair should not double-boost
  const doubleRepaired = repairStarGrowth(repaired);
  assert(doubleRepaired.basketballIQ === repaired.basketballIQ, "double repairStarGrowth does not double-boost basketballIQ");
  assert(doubleRepaired.hustle === repaired.hustle, "double repairStarGrowth does not double-boost hustle");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10: finishing is NOT duplicated
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 10: finishing not duplicated ===");

{
  const player = makeTestPlayer({ finishing: 95 });
  const details = getDetailedAttributes(player);
  assert(details.finishing === 95, "finishing uses stored value, not re-derived");

  const derived = deriveAttributesFromNbaStats(player);
  assert("finishing" in derived, "finishing still in NbaDerivedAttributes");
  assert(Number.isFinite(derived.finishing), "finishing still finite in NBA mapper");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 11: Mock Players Integration
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 11: Mock Players ===");

{
  const playersWithIQ = mockPlayers.filter(p => p.basketballIQ !== undefined);
  const playersWithHustle = mockPlayers.filter(p => p.hustle !== undefined);

  // Players with currentSeasonStats should have both attributes mapped
  const playersWithStats = mockPlayers.filter(p => p.currentSeasonStats);
  assert(
    playersWithIQ.length >= playersWithStats.length,
    `mockPlayers: ${playersWithIQ.length} have basketballIQ (>= ${playersWithStats.length} with stats)`
  );
  assert(
    playersWithHustle.length >= playersWithStats.length,
    `mockPlayers: ${playersWithHustle.length} have hustle (>= ${playersWithStats.length} with stats)`
  );

  // Verify all mapped values are finite and in range
  let allFinite = true;
  let allInRange = true;
  for (const p of playersWithIQ) {
    if (!Number.isFinite(p.basketballIQ!)) allFinite = false;
    if (p.basketballIQ! < 25 || p.basketballIQ! > 185) allInRange = false;
  }
  for (const p of playersWithHustle) {
    if (!Number.isFinite(p.hustle!)) allFinite = false;
    if (p.hustle! < 25 || p.hustle! > 185) allInRange = false;
  }
  assert(allFinite, "all mapped basketballIQ and hustle are finite");
  assert(allInRange, "all mapped basketballIQ and hustle in [25, 185]");
}

// ═══════════════════════════════════════════════════════════════
// SECTION 12: Old/Missing Players Load Safely
// ═══════════════════════════════════════════════════════════════
console.log("\n=== Section 12: Backward Compatibility ===");

{
  // Player without basketballIQ or hustle should still work everywhere
  const oldPlayer: Player = {
    id: "old_player",
    name: "Old Player",
    position: "C",
    rarity: "Common",
    level: 1,
    maxLevel: 20,
    exp: 0,
    ovr: 60,
    offense: 60,
    defense: 60,
    shooting: 50,
    speed: 50,
    strength: 60,
    playmaking: 45,
  };

  const details = getDetailedAttributes(oldPlayer);
  assert(Number.isFinite(details.basketballIQ), "old player getDetailedAttributes basketballIQ finite");
  assert(Number.isFinite(details.hustle), "old player getDetailedAttributes hustle finite");

  const iqRating = getBasketballIQRating(oldPlayer);
  const hustleRating = getHustleRating(oldPlayer);
  assert(Number.isFinite(iqRating), "old player getBasketballIQRating finite");
  assert(Number.isFinite(hustleRating), "old player getHustleRating finite");

  const starred = applyStarGrowth({ ...oldPlayer, starLevel: 0, starGrowthAppliedLevel: 0 }, 1);
  assert(Number.isFinite(starred.basketballIQ!), "old player star-up basketballIQ finite");
  assert(Number.isFinite(starred.hustle!), "old player star-up hustle finite");
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "=".repeat(60));
console.log(`Attribute Model Refinement: ${passed} passed, ${failed} failed`);
console.log("=".repeat(60));

if (failed > 0) {
  process.exit(1);
}
