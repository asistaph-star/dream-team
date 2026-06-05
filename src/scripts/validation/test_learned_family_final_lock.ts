import { SPECIAL_SKILL_NAMES, SPECIAL_SKILL_TEXT } from "../../lib/skills/skillCatalog";
import { SPECIAL_SKILL_FAMILIES, getAllSpecialSkillFamilies, isSpecialSkillFamilyId } from "../../lib/skills/skillFamilies";
import { resolveSpecialSkillMechanics } from "../../lib/skills/skillMechanics";
import { getSkillDisplayName, formatSkillName } from "../../lib/skills/skillDisplay";
import { migratePlayerSpecialSkills } from "../../lib/skills/skillMigration";
import { getBaseSkills } from "../../lib/skills/skillResolver";
import { BASE_SKILL_TEXT } from "../../lib/skills/skillCatalog";
import { Player } from "../../lib/types/player";

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`Assertion failed: ${message}`);
    testsFailed = true;
  } else {
    console.log(`Passed: ${message}`);
  }
}

function run() {
  console.log("=== RUNNING LEARNED SPECIAL SKILL FAMILY FINAL ARCHITECTURE LOCK ===");

  // 1. Verify exactly 15 official learned families exist in the definitions
  const allFamilies = getAllSpecialSkillFamilies();
  assert(allFamilies.length === 15, `Exactly 15 official learned families exist (Found: ${allFamilies.length})`);

  const expectedFamilies = [
    "DEEP_STRIKE",
    "COURT_VISION_ENGINE",
    "POSTER_SPARK",
    "FLOP",
    "BROKEN_PLAY_RESCUE",
    "SKY_WALL",
    "LOCK_CHAIN",
    "DEFENSIVE_ANCHOR",
    "CLEAN_CHALLENGE",
    "GLASS_STRIKE",
    "BENCH_CAPTAIN",
    "MOMENTUM_SWING",
    "COMPOSURE_SHIELD",
    "GAMEPLAN_JAMMER",
    "TIMEOUT_RESET"
  ];

  expectedFamilies.forEach(familyId => {
    assert(isSpecialSkillFamilyId(familyId), `Official family exists: ${familyId}`);
  });

  // 2. Verify exactly 15 rollable learned families exist in SPECIAL_SKILL_NAMES
  assert(SPECIAL_SKILL_NAMES.length === 15, `Exactly 15 rollable learned families in SPECIAL_SKILL_NAMES (Found: ${SPECIAL_SKILL_NAMES.length})`);

  // Confirm all 15 expected are present, no duplicate IDs, no base skill names, no legacy X names
  const uniqueNames = new Set(SPECIAL_SKILL_NAMES);
  assert(uniqueNames.size === SPECIAL_SKILL_NAMES.length, "No duplicate family IDs in roll pool");

  expectedFamilies.forEach(familyId => {
    assert(uniqueNames.has(familyId as any), `SPECIAL_SKILL_NAMES contains: ${familyId}`);
  });

  // Check no base skill names are in SPECIAL_SKILL_NAMES
  const baseSkillNames = Object.keys(BASE_SKILL_TEXT);
  baseSkillNames.forEach(baseName => {
    assert(!uniqueNames.has(baseName as any), `Base skill ${baseName} is NOT in SPECIAL_SKILL_NAMES`);
  });

  // Check no legacy X skill names are in SPECIAL_SKILL_NAMES
  const legacyXNames = [
    "Red Dot X",
    "Four-Point Bait X",
    "Lung Burner X",
    "Chain Pass X",
    "Debt Collector X",
    "Five-Man Squeeze X",
    "Cold Timeout X",
    "Dead Air X",
    "Clean Contest X",
    "Contact Tax X",
    "Cage Step X",
    "Corner Trap X",
    "Pressure Coach X",
    "Flop X",
    "Composure X"
  ];

  legacyXNames.forEach(legacyName => {
    assert(!uniqueNames.has(legacyName as any), `Legacy skill ${legacyName} is NOT in SPECIAL_SKILL_NAMES`);
  });

  // 3. Verify mechanic ownership mapping for all 15 families
  expectedFamilies.forEach(familyId => {
    const mechanics = resolveSpecialSkillMechanics(familyId);
    assert(mechanics.length > 0, `Family ${familyId} resolves to at least one mechanic: [${mechanics.join(", ")}]`);
  });

  // Specifically check critical family-to-mechanic mapping counts/resolutions
  assert(resolveSpecialSkillMechanics("DEEP_STRIKE").includes("DEEP_STRIKE_EXPOSE_SETUP"), "DEEP_STRIKE resolves to DEEP_STRIKE_EXPOSE_SETUP");
  assert(resolveSpecialSkillMechanics("DEEP_STRIKE").includes("DEEP_STRIKE_FOUR_POINT_BAIT"), "DEEP_STRIKE resolves to DEEP_STRIKE_FOUR_POINT_BAIT");
  assert(resolveSpecialSkillMechanics("MOMENTUM_SWING").includes("MOMENTUM_SWING_STABILIZE"), "MOMENTUM_SWING resolves to MOMENTUM_SWING_STABILIZE");
  assert(resolveSpecialSkillMechanics("BROKEN_PLAY_RESCUE").includes("BROKEN_PLAY_RESCUE_SAVE"), "BROKEN_PLAY_RESCUE resolves to BROKEN_PLAY_RESCUE_SAVE");

  // 4. Verify legacy X migration works correctly (saved data, rarities, tiers)
  const mockLegacyPlayer: Player = {
    id: "p_legacy",
    name: "Legacy Tester",
    position: "PG",
    rarity: "Common",
    level: 1,
    maxLevel: 50,
    exp: 0,
    ovr: 80,
    offense: 75,
    defense: 75,
    shooting: 75,
    speed: 75,
    strength: 75,
    playmaking: 75,
    baseSkills: ["Share Rhythm", "Connector Hub", "Position Flex"],
    specialSkillSlots: ["Red Dot X", "Pressure Coach X"],
    skillRarities: {
      "Red Dot X": "Legendary",
      "Pressure Coach X": "Epic"
    },
    skillTiers: {
      "Red Dot X": "X",
      "Pressure Coach X": "X"
    },
    starLevel: 5,
    threePt: 75,
    twoPt: 75,
    freeThrow: 75,
    finishing: 75,
    rebound: 75,
    steal: 75,
    block: 75,
    onBall: 75,
    handle: 75,
    assist: 75,
    calm: 75,
    threePtTendency: 0.35,
    driveTendency: 0.35,
    pullUpTendency: 0.25,
    foulDrawTendency: 0.45
  };

  const migrated = migratePlayerSpecialSkills(mockLegacyPlayer);
  
  // Verify slots migrated to family IDs
  assert(!!migrated.specialSkillSlots && migrated.specialSkillSlots[0] === "DEEP_STRIKE", "Red Dot X slots successfully migrated to DEEP_STRIKE");
  assert(!!migrated.specialSkillSlots && migrated.specialSkillSlots[1] === "BENCH_CAPTAIN", "Pressure Coach X slots successfully migrated to BENCH_CAPTAIN");

  
  // Verify skillRarities keys migrated to family IDs
  assert(migrated.skillRarities?.["DEEP_STRIKE"] === "Legendary", "Red Dot X rarity migrated to DEEP_STRIKE key");
  assert(migrated.skillRarities?.["BENCH_CAPTAIN"] === "Epic", "Pressure Coach X rarity migrated to BENCH_CAPTAIN key");

  // Verify skillTiers keys migrated to family IDs
  assert(migrated.skillTiers?.["DEEP_STRIKE"] === "X", "Red Dot X tier migrated to DEEP_STRIKE key");
  assert(migrated.skillTiers?.["BENCH_CAPTAIN"] === "X", "Pressure Coach X tier migrated to BENCH_CAPTAIN key");

  // 5. Verify UI display names are clean
  assert(getSkillDisplayName("DEEP_STRIKE") === "Deep Strike", "DEEP_STRIKE display name is clean");
  assert(getSkillDisplayName("MOMENTUM_SWING") === "Momentum Swing", "MOMENTUM_SWING display name is clean");
  assert(getSkillDisplayName("BROKEN_PLAY_RESCUE") === "Broken Play Rescue", "BROKEN_PLAY_RESCUE display name is clean");
  assert(formatSkillName("DEEP_STRIKE", "STANDARD") === "Deep Strike", "formatSkillName for DEEP_STRIKE STANDARD is clean");
  assert(formatSkillName("DEEP_STRIKE", "LEGACY") === "Deep Strike Legacy", "formatSkillName for DEEP_STRIKE LEGACY has correct era suffix");

  // 6. Verify 22 Base Skills remain separate
  const baseSkillsCount = Object.keys(BASE_SKILL_TEXT).length;
  assert(baseSkillsCount === 22, `Exactly 22 base skills exist (Found: ${baseSkillsCount})`);

  // Ensure no base skill has a definition as a special family
  Object.keys(BASE_SKILL_TEXT).forEach(baseName => {
    assert(!isSpecialSkillFamilyId(baseName), `Base skill ${baseName} is NOT a special family ID`);
  });

  // Verify that the catalog descriptions for base skills do not describe learned family rolling
  Object.entries(BASE_SKILL_TEXT).forEach(([name, desc]) => {
    assert(!desc.toLowerCase().includes("reroll") && !desc.toLowerCase().includes("skill tape"), `Base skill ${name} description does not describe rerolling`);
  });

  if (testsFailed) {
    console.error("\n❌ LEARNED FAMILY ARCHITECTURE LOCK VALIDATION FAILED.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL LEARNED FAMILY ARCHITECTURE LOCK VALIDATION CHECKS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run();
