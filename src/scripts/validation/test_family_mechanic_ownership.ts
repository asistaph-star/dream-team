import { BASE_SKILL_TEXT, SPECIAL_SKILL_NAMES } from "../../lib/skills/skillCatalog";
import { BaseSkillName, SpecialSkillName } from "../../lib/skills/assignBaseSkills";
import { LEGACY_TO_FAMILY_MAP } from "../../lib/skills/skillMigration";
import { resolveSpecialSkillMechanics, SpecialSkillMechanicId } from "../../lib/skills/skillMechanics";

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    testsFailed = true;
  } else {
    console.log(`✅ ${message}`);
  }
}

async function run() {
  console.log("=== RUNNING FAMILY SKILL MECHANICS OWNERSHIP VALIDATION ===\n");

  // 1. All 14 active rollable families resolve to at least one mechanic.
  const activeFamilies: SpecialSkillName[] = [
    "DEEP_STRIKE",
    "COURT_VISION_ENGINE",
    "POSTER_SPARK",
    "FLOP",
    "SKY_WALL",
    "LOCK_CHAIN",
    "DEFENSIVE_ANCHOR",
    "CLEAN_CHALLENGE",
    "GLASS_STRIKE",
    "BENCH_CAPTAIN",
    "MOMENTUM_SWING",
    "COMPOSURE_SHIELD",
    "GAMEPLAN_JAMMER",
    "TIMEOUT_RESET",
  ];

  // Verify that SPECIAL_SKILL_NAMES contains exactly these 14 active families
  assert(SPECIAL_SKILL_NAMES.length === 14, `Expected exactly 14 active families in rolling pool, found ${SPECIAL_SKILL_NAMES.length}`);
  for (const family of activeFamilies) {
    assert(SPECIAL_SKILL_NAMES.includes(family), `Active family ${family} is in SPECIAL_SKILL_NAMES`);
    const mechanics = resolveSpecialSkillMechanics(family);
    assert(mechanics.length > 0, `Active family ${family} resolves to at least one mechanic: [${mechanics.join(", ")}]`);
  }

  // 2. BROKEN_PLAY_RESCUE does not roll while mechanic-empty.
  const inactiveFamilies = ["BROKEN_PLAY_RESCUE"];
  for (const family of inactiveFamilies) {
    assert(!SPECIAL_SKILL_NAMES.includes(family as any), `Inactive family ${family} is NOT in the active rolling pool`);
    const mechanics = resolveSpecialSkillMechanics(family);
    assert(mechanics.length === 0, `Inactive family ${family} has 0 mechanics (currently has: [${mechanics.join(", ")}])`);
  }

  // 3. Every legacy X migration target is correct.
  const expectedMigrations: Record<string, string> = {
    "Red Dot X": "DEEP_STRIKE",
    "Four-Point Bait X": "DEEP_STRIKE",
    "Chain Pass X": "COURT_VISION_ENGINE",
    "Lung Burner X": "POSTER_SPARK",
    "Contact Tax X": "POSTER_SPARK",
    "Flop X": "FLOP",
    "Clean Contest X": "CLEAN_CHALLENGE",
    "Composure X": "COMPOSURE_SHIELD",
    "Cold Timeout X": "TIMEOUT_RESET",
    "Dead Air X": "GAMEPLAN_JAMMER",
    "Cage Step X": "LOCK_CHAIN",
    "Corner Trap X": "DEFENSIVE_ANCHOR",
    "Debt Collector X": "GAMEPLAN_JAMMER",
    "Five-Man Squeeze X": "DEFENSIVE_ANCHOR",
    "Pressure Coach X": "BENCH_CAPTAIN",
  };

  for (const [legacy, family] of Object.entries(expectedMigrations)) {
    assert(LEGACY_TO_FAMILY_MAP[legacy] === family, `Legacy skill "${legacy}" migrates to family "${family}"`);
  }

  // 4. Family IDs trigger mechanics through resolveSpecialSkillMechanics.
  // Validate exact mechanic mapping for all 15 families.
  const expectedMechanicMap: Record<string, SpecialSkillMechanicId[]> = {
    DEEP_STRIKE: ["DEEP_STRIKE_EXPOSE_SETUP", "DEEP_STRIKE_FOUR_POINT_BAIT"],
    POSTER_SPARK: ["POSTER_SPARK_LUNG_BURNER", "POSTER_SPARK_CONTACT_TAX"],
    FLOP: ["FLOP_SELL_CONTACT"],
    SKY_WALL: ["SKY_WALL_RIM_PRESSURE"],
    LOCK_CHAIN: ["LOCK_CHAIN_ON_BALL_PRESSURE", "LOCK_CHAIN_CAGE_STEP"],
    DEFENSIVE_ANCHOR: ["DEFENSIVE_ANCHOR_TEAM_PRESSURE", "DEFENSIVE_ANCHOR_CORNER_TRAP", "DEFENSIVE_ANCHOR_FIVE_MAN_SQUEEZE"],
    CLEAN_CHALLENGE: ["CLEAN_CHALLENGE_CONTEST"],
    GLASS_STRIKE: ["GLASS_STRIKE_REBOUND"],
    COURT_VISION_ENGINE: ["COURT_VISION_RHYTHM", "COURT_VISION_CHAIN_PASS"],
    BENCH_CAPTAIN: ["BENCH_CAPTAIN_STABILIZE", "GAMEPLAN_PRESSURE_COACH"],
    COMPOSURE_SHIELD: ["COMPOSURE_SHIELD_CANCEL"],
    GAMEPLAN_JAMMER: ["GAMEPLAN_DEAD_AIR", "GAMEPLAN_DEBT_COLLECTOR"],
    TIMEOUT_RESET: ["TIMEOUT_RESET_CLEANSE"],
    MOMENTUM_SWING: ["MOMENTUM_SWING_STABILIZE"],
    BROKEN_PLAY_RESCUE: [],
  };

  for (const [family, expectedMechanics] of Object.entries(expectedMechanicMap)) {
    const resolved = resolveSpecialSkillMechanics(family);
    assert(
      resolved.length === expectedMechanics.length && resolved.every(m => expectedMechanics.includes(m)),
      `Family "${family}" resolves exactly to [${expectedMechanics.join(", ")}] (resolved: [${resolved.join(", ")}])`
    );
  }

  // 5. No legacy X is in SPECIAL_SKILL_NAMES.
  const legacyXNames = Object.keys(expectedMigrations);
  for (const legacy of legacyXNames) {
    assert(!SPECIAL_SKILL_NAMES.includes(legacy as any), `Legacy skill "${legacy}" is NOT in SPECIAL_SKILL_NAMES`);
  }

  // 6. 22 Base Skills are not in SPECIAL_SKILL_NAMES.
  const baseSkills = Object.keys(BASE_SKILL_TEXT) as BaseSkillName[];
  assert(baseSkills.length === 22, `Expected exactly 22 base skills, found ${baseSkills.length}`);
  for (const base of baseSkills) {
    assert(!SPECIAL_SKILL_NAMES.includes(base as any), `Base skill "${base}" is NOT in SPECIAL_SKILL_NAMES`);
  }

  console.log("");
  if (testsFailed) {
    console.error("❌ SOME FAMILY SKILL MECHANICS OWNERSHIP TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("🎉 ALL FAMILY SKILL MECHANICS OWNERSHIP TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
