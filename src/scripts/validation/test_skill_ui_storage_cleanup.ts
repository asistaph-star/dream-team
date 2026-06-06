// test_skill_ui_storage_cleanup.ts
import { SPECIAL_SKILL_NAMES, SPECIAL_SKILL_TEXT } from "../../lib/skills/skillCatalog";
import { getSkillDisplayName, getSkillBaseName } from "../../lib/skills/skillDisplay";
import { getSkillArtSrc } from "../../components/skills/SkillBadge";
import { getAscensionCandidates, isCardInstanceActive } from "../../lib/utils/playerCardIdentity";
import { Player } from "../../lib/types/player";

console.log("=== Running Skill UI and Storage Cleanup Validation ===");

const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    errors.push(`FAIL: ${message}`);
    console.error(`❌ ${message}`);
  } else {
    console.log(`✅ ${message}`);
  }
}

// 1. Check official 15 family display names
function testOfficialFamilies() {
  console.log("\n--- Checking Official 15 Families ---");
  assert(SPECIAL_SKILL_NAMES.length === 15, `Should have exactly 15 special skill families, found: ${SPECIAL_SKILL_NAMES.length}`);
  
  SPECIAL_SKILL_NAMES.forEach(skillId => {
    const displayName = getSkillDisplayName(skillId);
    assert(!displayName.endsWith(" X"), `Display name for ${skillId} should not end with X: "${displayName}"`);
    assert(displayName.length > 0, `Display name for ${skillId} should not be empty`);
  });
}

// 2. Check absence of toxic descriptions
function testToxicDescriptions() {
  console.log("\n--- Checking Skill Descriptions for Toxic Terms ---");
  
  const toxicTerms = [
    "110 drain", "190 drain", "Debt Collector splash",
    "40 team nuke", "60 team nuke", "38 stamina bleed",
    "stamina recovery block", "enemy drain", "guaranteed 2+1",
    "guaranteed 3+1", "ejection", "flagrant", "massive damage", "nuke"
  ];
  
  SPECIAL_SKILL_NAMES.forEach(skillId => {
    const desc = SPECIAL_SKILL_TEXT[skillId]?.toLowerCase() || "";
    
    toxicTerms.forEach(term => {
      assert(!desc.includes(term.toLowerCase()), `Description for ${skillId} must not contain toxic term "${term}": "${desc}"`);
    });
    
    // Opponent stamina drain check: only Sky Wall and Lock Chain are allowed to mention opponent stamina drain
    if (desc.includes("opponents") && desc.includes("stamina")) {
      const isAllowed = skillId === "SKY_WALL" || skillId === "LOCK_CHAIN";
      assert(isAllowed, `Only SKY_WALL or LOCK_CHAIN can mention opponent stamina drain, but ${skillId} does: "${desc}"`);
    }
  });
}

// 3. Check art resolution rules
function testArtResolution() {
  console.log("\n--- Checking Art Resolution and Mappings ---");
  
  // MOMENTUM_SWING check
  const momentumSrc = getSkillArtSrc("MOMENTUM_SWING", "special", false, "Common");
  assert(!momentumSrc.includes("five-man-squeeze"), `MOMENTUM_SWING must not map to five-man-squeeze: "${momentumSrc}"`);
  assert(momentumSrc === "/skills/special/momentum-swing-common.png", `MOMENTUM_SWING should resolve to its dedicated visual asset path: "${momentumSrc}"`);

  // GAMEPLAN_JAMMER check
  const jammerSrc = getSkillArtSrc("GAMEPLAN_JAMMER", "special", false, "Common");
  assert(!jammerSrc.includes("debt-collector"), `GAMEPLAN_JAMMER must not map to debt-collector-x: "${jammerSrc}"`);
  assert(jammerSrc === "/skills/special/dead-air-x-common.png", `GAMEPLAN_JAMMER should resolve to dead-air-x: "${jammerSrc}"`);

  // DEEP_STRIKE check
  const deepStrikeSrc = getSkillArtSrc("DEEP_STRIKE", "special", false, "Common");
  assert(deepStrikeSrc === "/skills/special/red-dot-x-common.png", `DEEP_STRIKE should map to red-dot-x: "${deepStrikeSrc}"`);

  // POSTER_SPARK check
  const posterSparkSrc = getSkillArtSrc("POSTER_SPARK", "special", false, "Common");
  assert(posterSparkSrc === "/skills/special/lung-burner-x-common.png", `POSTER_SPARK should map to lung-burner-x: "${posterSparkSrc}"`);

  // FLOP check
  const flopSrc = getSkillArtSrc("FLOP", "special", false, "Common");
  assert(flopSrc === "/skills/special/flop-x-common.png", `FLOP should map to flop-x: "${flopSrc}"`);

  // BROKEN_PLAY_RESCUE check
  const rescueSrc = getSkillArtSrc("BROKEN_PLAY_RESCUE", "special", false, "Common");
  assert(rescueSrc === "/skills/special/false-whistle-x-common.png", `BROKEN_PLAY_RESCUE should map to false-whistle-x: "${rescueSrc}"`);

  // SKY_WALL check
  const skyWallSrc = getSkillArtSrc("SKY_WALL", "special", false, "Common");
  assert(skyWallSrc === "/skills/special/sky-wall-common.png", `SKY_WALL should map to dedicated sky-wall path: "${skyWallSrc}"`);

  // GLASS_STRIKE check
  const glassStrikeSrc = getSkillArtSrc("GLASS_STRIKE", "special", false, "Common");
  assert(glassStrikeSrc === "/skills/special/glass-strike-common.png", `GLASS_STRIKE should map to dedicated glass-strike path: "${glassStrikeSrc}"`);
}

// 4. Check exact instance storage logic
function testExactInstanceStorage() {
  console.log("\n--- Checking Exact Instance Storage Logic ---");
  
  const card1: Player = { id: "p1", name: "LeBron James", position: "SF", rarity: "Epic", level: 1, maxLevel: 100, exp: 0, ovr: 90, offense: 90, defense: 90, speed: 90, starLevel: 1, baseSkills: ["", "", ""], specialSkillSlots: [], skillRarities: {}, finishing: 90, shooting: 90, playmaking: 90, rebound: 90, hustle: 90, basketballIQ: 90, stamina: 100, onBall: 90, steal: 90, block: 90, calm: 90, strength: 90 };
  const card2: Player = { ...card1, id: "p2" }; // Duplicate copy
  
  const activeLineup = [card1];
  const activeReserves: Player[] = [];
  const roster = [card1, card2];
  
  // Exact checks
  assert(isCardInstanceActive(card1, activeLineup, activeReserves) === true, "card1 (in lineup) should be identified as active");
  assert(isCardInstanceActive(card2, activeLineup, activeReserves) === false, "card2 (duplicate copy not in lineup) should be active = false");
  
  // Ascension candidates should exclude card1 but include card2
  const candidates = getAscensionCandidates(card1, roster, activeLineup, activeReserves);
  assert(candidates.length === 1, `Should have 1 candidate duplicate, found: ${candidates.length}`);
  assert(candidates[0].id === "p2", `Ascension candidate should be the duplicate instance p2, found: ${candidates[0].id}`);
}

function runAll() {
  testOfficialFamilies();
  testToxicDescriptions();
  testArtResolution();
  testExactInstanceStorage();
  
  if (errors.length > 0) {
    console.error(`\n❌ Validation failed with ${errors.length} errors:`);
    errors.forEach(e => console.error(e));
    process.exit(1);
  } else {
    console.log("\n✅ All skill UI and storage cleanup validation checks passed successfully!");
    process.exit(0);
  }
}

runAll();
