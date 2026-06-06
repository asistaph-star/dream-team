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
  console.log("\n--- Checking Skill Descriptions for Toxic/Legacy Terms ---");
  
  const toxicTerms = [
    "110 drain", "190 drain", "Debt Collector splash",
    "40 team nuke", "60 team nuke", "38 stamina bleed",
    "stamina recovery block", "enemy drain", "guaranteed 2+1",
    "guaranteed 3+1", "ejection", "flagrant", "massive damage", "nuke",
    "Red Dot X", "Four-Point Bait X", "Lung Burner X", "Chain Pass X",
    "Debt Collector X", "Five-Man Squeeze X", "Cold Timeout X", "Dead Air X",
    "Clean Contest X", "Contact Tax X", "Cage Step X", "Corner Trap X",
    "Pressure Coach X", "Flop X", "Composure X"
  ];
  
  SPECIAL_SKILL_NAMES.forEach(skillId => {
    const desc = SPECIAL_SKILL_TEXT[skillId]?.toLowerCase() || "";
    
    toxicTerms.forEach(term => {
      assert(!desc.includes(term.toLowerCase()), `Description for ${skillId} must not contain toxic/legacy term "${term}": "${desc}"`);
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
  
  const officialFamilies = [
    { id: "DEEP_STRIKE", slug: "deep-strike" },
    { id: "COURT_VISION_ENGINE", slug: "court-vision-engine" },
    { id: "POSTER_SPARK", slug: "poster-spark" },
    { id: "FLOP", slug: "flop" },
    { id: "BROKEN_PLAY_RESCUE", slug: "broken-play-rescue" },
    { id: "SKY_WALL", slug: "sky-wall" },
    { id: "LOCK_CHAIN", slug: "lock-chain" },
    { id: "DEFENSIVE_ANCHOR", slug: "defensive-anchor" },
    { id: "CLEAN_CHALLENGE", slug: "clean-challenge" },
    { id: "GLASS_STRIKE", slug: "glass-strike" },
    { id: "BENCH_CAPTAIN", slug: "bench-captain" },
    { id: "MOMENTUM_SWING", slug: "momentum-swing" },
    { id: "COMPOSURE_SHIELD", slug: "composure-shield" },
    { id: "GAMEPLAN_JAMMER", slug: "gameplan-jammer" },
    { id: "TIMEOUT_RESET", slug: "timeout-reset" }
  ];

  officialFamilies.forEach(f => {
    // Check resolve path
    const resolvedPath = getSkillArtSrc(f.id, "special", false, "Common");
    const expectedPath = `/skills/family/${f.slug}.png`;
    assert(resolvedPath === expectedPath, `${f.id} should resolve to its family path: "${resolvedPath}" (expected: "${expectedPath}")`);
    
    // Check that it is not quality-suffixed
    assert(!resolvedPath.includes("common"), `${f.id} path should not be quality-suffixed: "${resolvedPath}"`);
    
    // Check that it doesn't use old X slug names
    const oldSlugs = ["red-dot-x", "chain-pass-x", "lung-burner-x", "flop-x", "false-whistle-x", "cage-step-x", "corner-trap-x", "clean-contest-x", "pressure-coach-x", "composure-x", "dead-air-x", "cold-timeout-x"];
    oldSlugs.forEach(old => {
      assert(!resolvedPath.includes(old), `${f.id} should not resolve to legacy X slug "${old}": "${resolvedPath}"`);
    });
    
    // Verify high quality options don't suffix either
    const legendaryPath = getSkillArtSrc(f.id, "special", false, "Legendary");
    assert(legendaryPath === expectedPath, `${f.id} Legendary should also resolve to same family path: "${legendaryPath}"`);
  });

  // Check legacy compatibility inputs resolve to family paths
  const legacyInputs = [
    { input: "Red Dot X", expected: "/skills/family/deep-strike.png" },
    { input: "Lung Burner X", expected: "/skills/family/poster-spark.png" },
    { input: "Chain Pass X", expected: "/skills/family/court-vision-engine.png" },
    { input: "Debt Collector X", expected: "/skills/family/gameplan-jammer.png" },
    { input: "Five-Man Squeeze X", expected: "/skills/family/defensive-anchor.png" },
    { input: "Cold Timeout X", expected: "/skills/family/timeout-reset.png" }
  ];

  legacyInputs.forEach(li => {
    const resolved = getSkillArtSrc(li.input, "special", false, "Common");
    assert(resolved === li.expected, `Legacy input "${li.input}" should map internally to family path: "${resolved}" (expected: "${li.expected}")`);
  });

  // Safe fallback check for unknown skills
  const fallbackPath = getSkillArtSrc("Unknown Skill Name Here", "special", false, "Common");
  assert(fallbackPath.includes("unknown-skill-name-here"), `Unknown skill should safely fall back to slug path: "${fallbackPath}"`);
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
    console.log("\nAll skill UI and storage cleanup validation checks passed successfully!");
    process.exit(0);
  }
}

runAll();
