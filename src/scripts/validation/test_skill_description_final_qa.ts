// test_skill_description_final_qa.ts
import { SPECIAL_SKILL_NAMES, SPECIAL_SKILL_TEXT } from "../../lib/skills/skillCatalog";
import { getSkillDisplayName } from "../../lib/skills/skillDisplay";
import { SPECIAL_SKILL_FAMILIES } from "../../lib/skills/skillFamilies";
import * as fs from "fs";
import * as path from "path";

console.log("=== Running Skill Description Final QA Validation ===");

const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    errors.push(`FAIL: ${message}`);
    console.error(`❌ ${message}`);
  } else {
    console.log(`✅ ${message}`);
  }
}

// 1. Verify all 15 official family names have clean display names
function checkDisplayNames() {
  console.log("\n--- Checking Family Display Names ---");
  assert(SPECIAL_SKILL_NAMES.length === 15, "Should have exactly 15 special skill families");
  
  SPECIAL_SKILL_NAMES.forEach(skillId => {
    const displayName = getSkillDisplayName(skillId);
    assert(displayName.length > 0, `Display name for ${skillId} should not be empty`);
    assert(!displayName.endsWith(" X"), `Display name for ${skillId} must not end with X: "${displayName}"`);
    
    // Check specific name Flop
    if (skillId === "FLOP") {
      assert(displayName === "Flop", `FLOP must display exactly as "Flop": "${displayName}"`);
    }
  });
}

// 2. Verify descriptions and category labels
function checkDescriptionsAndCategories() {
  console.log("\n--- Checking Skill Descriptions and Categories ---");
  
  const toxicTerms = [
    "110 stamina drain", "190 stamina drain", "massive stamina drain", "stamina nuke",
    "Debt Collector splash", "Debt stamina chain", "40/60 team drain", "full-team nuke",
    "stamina bleed", "recovery block", "enemy drain", "guaranteed 2+1", "guaranteed 3+1",
    "random flagrant", "random ejection", "automatic free throws", "nuke",
    "Red Dot X", "Four-Point Bait X", "Lung Burner X", "Chain Pass X", "Debt Collector X",
    "Five-Man Squeeze X", "Cold Timeout X", "Dead Air X", "Clean Contest X", "Contact Tax X",
    "Cage Step X", "Corner Trap X", "Pressure Coach X", "Flop X", "Composure X"
  ];

  SPECIAL_SKILL_NAMES.forEach(skillId => {
    const desc = SPECIAL_SKILL_TEXT[skillId]?.toLowerCase() || "";
    
    // Check toxic and legacy terms
    toxicTerms.forEach(term => {
      assert(!desc.includes(term.toLowerCase()), `Description for ${skillId} must not contain "${term}": "${desc}"`);
    });
    
    // Check stamina drain constraint
    if (desc.includes("opponent") && desc.includes("stamina")) {
      const allowed = skillId === "SKY_WALL" || skillId === "LOCK_CHAIN";
      assert(allowed, `Opponent stamina drain description is only allowed for SKY_WALL or LOCK_CHAIN, but ${skillId} has: "${desc}"`);
    }
  });

  // Verify categories map to Offense / Defense / Comprehensive
  Object.values(SPECIAL_SKILL_FAMILIES).forEach(f => {
    const cat = f.category;
    assert(cat === "OFFENSE" || cat === "DEFENSE" || cat === "COMPREHENSIVE", `Category for ${f.id} must be OFFENSE, DEFENSE, or COMPREHENSIVE, got: "${cat}"`);
  });
}

// 3. Verify UI component source files for legacy names and uppercase raw warning keys
function checkUiFiles() {
  console.log("\n--- Auditing UI Files ---");
  
  const badUiWords = [
    "Red Dot X", "Four-Point Bait X", "Lung Burner X", "Chain Pass X", "Debt Collector X",
    "Five-Man Squeeze X", "Cold Timeout X", "Dead Air X", "Clean Contest X", "Contact Tax X",
    "Cage Step X", "Corner Trap X", "Pressure Coach X", "Flop X", "Composure X", "Learned X Skills"
  ];
  
  const filesToAudit = [
    path.join(__dirname, "../../../src/components/player/PlayerHexProfileModal.tsx"),
    path.join(__dirname, "../../../src/components/player/PlayerCard.tsx"),
    path.join(__dirname, "../../../src/components/skills/SkillBadge.tsx")
  ];
  
  filesToAudit.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      return;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const basename = path.basename(filePath);
    
    badUiWords.forEach(word => {
      assert(!content.includes(word), `UI File ${basename} must not contain legacy wording "${word}"`);
    });
    
    // Ensure warning text doesn't output raw uppercase keys directly
    if (basename === "PlayerHexProfileModal.tsx") {
      assert(content.includes("getSkillDisplayName(s.skillName)"), "PlayerHexProfileModal warning modal must use getSkillDisplayName");
      assert(content.includes("Learned Special Skills"), "PlayerHexProfileModal warning text must use 'Learned Special Skills'");
    }
  });
}

// Run tests
checkDisplayNames();
checkDescriptionsAndCategories();
checkUiFiles();

console.log("\n--- Final Status ---");
if (errors.length > 0) {
  console.error(`❌ Validation failed with ${errors.length} errors:`);
  errors.forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log("✅ All description and text QA validation checks passed successfully!");
}
