import * as fs from "fs";
import * as path from "path";
import { BASE_SKILL_TEXT, SPECIAL_SKILL_TEXT, SPECIAL_SKILL_NAMES } from "../../lib/skills/skillCatalog";
import { BaseSkillName, SpecialSkillName } from "../../lib/skills/assignBaseSkills";
import {
  normalizeSpecialSkillId,
  migratePlayerSpecialSkillSlots,
  migratePlayerSpecialSkills,
  LEGACY_TO_FAMILY_MAP,
} from "../../lib/skills/skillMigration";
import { getSkillDisplayName, formatSkillName } from "../../lib/skills/skillDisplay";
import { resolveSpecialSkillMechanics, LEGACY_TO_MECHANIC_MAP } from "../../lib/skills/skillMechanics";
import { Player } from "../../lib/types/player";

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
  console.log("=== RUNNING SKILL ARCHITECTURE MIGRATION VALIDATION ===\n");

  // 1. 22 Base Skills remain separate and unchanged
  const expectedBaseSkills: BaseSkillName[] = [
    "Tempo Surgeon",
    "Paint Magnet",
    "Arc Pressure",
    "Mismatch Caller",
    "Glass Touch",
    "Foul Magnet",
    "Power Driver",
    "Rim Warden",
    "Screen Breaker",
    "Shadow Guard",
    "Hands Active",
    "Discipline Wall",
    "Paint Barrier",
    "Focus Lock",
    "Complete Engine",
    "Iron Motor",
    "Connector Hub",
    "Tempo Switch",
    "Position Flex",
    "Future Core",
    "Share Rhythm",
    "Enforcer Lift"
  ];

  assert(expectedBaseSkills.length === 22, "Expected 22 base skills in list");
  for (const skill of expectedBaseSkills) {
    assert(BASE_SKILL_TEXT[skill] !== undefined, `Base skill "${skill}" is in BASE_SKILL_TEXT`);
  }

  // 2. 22 Base Skills are not in the learned skill rolling pool
  for (const skill of expectedBaseSkills) {
    assert(!SPECIAL_SKILL_NAMES.includes(skill as any), `Base skill "${skill}" is NOT in SPECIAL_SKILL_NAMES`);
  }

  // 3. legacy X names are not in SPECIAL_SKILL_NAMES
  const legacyXNames = [
    "Red Dot X",
    "Four-Point Bait X",
    "Chain Pass X",
    "Contact Tax X",
    "Lung Burner X",
    "Flop X",
    "Cage Step X",
    "Corner Trap X",
    "Five-Man Squeeze X",
    "Clean Contest X",
    "Composure X",
    "Cold Timeout X",
    "Dead Air X",
    "Debt Collector X",
    "Pressure Coach X"
  ];
  for (const legacy of legacyXNames) {
    assert(!SPECIAL_SKILL_NAMES.includes(legacy as any), `Legacy skill "${legacy}" is NOT in SPECIAL_SKILL_NAMES`);
  }

  // 4. official rolling pool uses family IDs only
  const expectedFamilyIds: SpecialSkillName[] = [
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

  for (const name of SPECIAL_SKILL_NAMES) {
    assert(expectedFamilyIds.includes(name), `Official rolling pool skill "${name}" is a valid SpecialSkillFamilyId`);
  }

  // 5. old X saved skill slots migrate to family IDs
  const mockPlayer: Player = {
    id: "test_player",
    name: "Test Player",
    position: "PG",
    rarity: "Common",
    level: 1,
    maxLevel: 50,
    exp: 0,
    ovr: 80,
    offense: 80,
    defense: 80,
    shooting: 80,
    speed: 80,
    strength: 80,
    playmaking: 80,
    specialSkillSlots: ["Red Dot X", "Pressure Coach X"],
    skillRarities: {
      "Red Dot X": "Legendary",
      "Pressure Coach X": "Epic"
    },
    skillTiers: {
      "Red Dot X": "X",
      "Pressure Coach X": "X"
    }
  };

  const migratedPlayer = migratePlayerSpecialSkills(mockPlayer);
  assert(migratedPlayer.specialSkillSlots?.[0] === "DEEP_STRIKE", "Red Dot X slot migrated to DEEP_STRIKE");
  assert(migratedPlayer.specialSkillSlots?.[1] === "BENCH_CAPTAIN", "Pressure Coach X slot migrated to BENCH_CAPTAIN");

  // 6. skill rarity keys migrate from old X to family ID
  assert(migratedPlayer.skillRarities?.["DEEP_STRIKE"] === "Legendary", "Red Dot X rarity migrated to DEEP_STRIKE key");
  assert(migratedPlayer.skillRarities?.["BENCH_CAPTAIN"] === "Epic", "Pressure Coach X rarity migrated to BENCH_CAPTAIN key");
  assert(migratedPlayer.skillTiers?.["DEEP_STRIKE"] === "X", "Red Dot X tier migrated to DEEP_STRIKE key");
  assert(migratedPlayer.skillTiers?.["BENCH_CAPTAIN"] === "X", "Pressure Coach X tier migrated to BENCH_CAPTAIN key");

  // 7. Red Dot X and Four-Point Bait X migrate to DEEP_STRIKE
  assert(normalizeSpecialSkillId("Red Dot X") === "DEEP_STRIKE", "Red Dot X normalize check");
  assert(normalizeSpecialSkillId("Four-Point Bait X") === "DEEP_STRIKE", "Four-Point Bait X normalize check");

  // 8. Pressure Coach X migrates to BENCH_CAPTAIN
  assert(normalizeSpecialSkillId("Pressure Coach X") === "BENCH_CAPTAIN", "Pressure Coach X normalize check");

  // 9. Debt Collector X migrates to GAMEPLAN_JAMMER
  assert(normalizeSpecialSkillId("Debt Collector X") === "GAMEPLAN_JAMMER", "Debt Collector X normalize check");

  // 10. family IDs resolve to mechanics
  const deepStrikeMechanics = resolveSpecialSkillMechanics("DEEP_STRIKE");
  assert(deepStrikeMechanics.includes("DEEP_STRIKE_EXPOSE_SETUP"), "DEEP_STRIKE resolves to DEEP_STRIKE_EXPOSE_SETUP");
  assert(deepStrikeMechanics.includes("DEEP_STRIKE_FOUR_POINT_BAIT"), "DEEP_STRIKE resolves to DEEP_STRIKE_FOUR_POINT_BAIT");

  const benchCaptainMechanics = resolveSpecialSkillMechanics("BENCH_CAPTAIN");
  assert(benchCaptainMechanics.includes("BENCH_CAPTAIN_STABILIZE"), "BENCH_CAPTAIN resolves to BENCH_CAPTAIN_STABILIZE");
  assert(benchCaptainMechanics.includes("GAMEPLAN_PRESSURE_COACH"), "BENCH_CAPTAIN resolves to GAMEPLAN_PRESSURE_COACH");

  // 11. legacy X names are not shown in normal display output
  assert(getSkillDisplayName("Red Dot X") === "Deep Strike", "getSkillDisplayName for legacy Red Dot X");
  assert(getSkillDisplayName("DEEP_STRIKE") === "Deep Strike", "getSkillDisplayName for family DEEP_STRIKE");
  assert(formatSkillName("Red Dot X", "PRIME") === "Deep Strike Prime", "formatSkillName for legacy Red Dot X");
  assert(formatSkillName("DEEP_STRIKE", "PRIME") === "Deep Strike Prime", "formatSkillName for family DEEP_STRIKE");

  // 12. MOMENTUM_SWING and BROKEN_PLAY_RESCUE cannot roll if they have no implemented mechanics
  assert(LEGACY_TO_MECHANIC_MAP["MOMENTUM_SWING"].length === 0, "MOMENTUM_SWING has empty mechanics");
  assert(LEGACY_TO_MECHANIC_MAP["BROKEN_PLAY_RESCUE"].length === 0, "BROKEN_PLAY_RESCUE has empty mechanics");
  assert(!SPECIAL_SKILL_NAMES.includes("MOMENTUM_SWING"), "MOMENTUM_SWING is NOT in the active rolling pool");
  assert(!SPECIAL_SKILL_NAMES.includes("BROKEN_PLAY_RESCUE"), "BROKEN_PLAY_RESCUE is NOT in the active rolling pool");

  // Final validation exit status
  console.log("");
  if (testsFailed) {
    console.error("❌ SOME SKILL ARCHITECTURE LAYER TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("🎉 ALL SKILL ARCHITECTURE LAYER TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
