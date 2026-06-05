const fs = require('fs');
const path = require('path');

function runValidation() {
  console.log("=== Running Skill System Hard Reset Validation ===\\n");

  let passed = true;

  const mechanicsPath = path.join(__dirname, "../../lib/skills/skillMechanics.ts");
  const mechanicsContent = fs.readFileSync(mechanicsPath, 'utf8');

  // 1. Check Family count
  const familyMatches = mechanicsContent.match(/FAMILY_TO_MECHANIC_MAP: Record<SpecialSkillName, SpecialSkillMechanicId\\[\\]> = \\{([^}]+)\\}/);
  if (familyMatches) {
    const lines = familyMatches[1].split('\\n').filter((l: string) => l.includes(':'));
    const familyCount = lines.length;
    if (familyCount !== 15) {
      console.error("❌ FAILED: Expected 15 skill families, found " + familyCount);
      passed = false;
    } else {
      console.log("✅ PASSED: Found 15 skill families");
    }
  }

  // 2. Check Legacy X count
  const legacyMatches = mechanicsContent.match(/LEGACY_X_TO_FAMILY_MAP: Record<string, SpecialSkillName> = \\{([^}]+)\\}/);
  if (legacyMatches) {
    const lines = legacyMatches[1].split('\\n').filter((l: string) => l.includes(':'));
    const legacyCount = lines.length;
    if (legacyCount !== 15) {
      console.error("❌ FAILED: Expected 15 legacy X skills mapped, found " + legacyCount);
      passed = false;
    } else {
      console.log("✅ PASSED: Found 15 mapped legacy X skills");
    }
  }

  // 3. Scan matchEngine.ts for legacy usages
  const matchEnginePath = path.join(__dirname, "../../lib/utils/matchEngine.ts");
  const content = fs.readFileSync(matchEnginePath, 'utf8');

  const legacyTerms = [
    "POSTER_SPARK_LUNG_BURNER",
    "POSTER_SPARK_CONTACT_TAX",
    "COURT_VISION_CHAIN_PASS",
    "DEFENSIVE_ANCHOR_FIVE_MAN_SQUEEZE",
    "DEFENSIVE_ANCHOR_PRESSURE_COACH",
    "LOCK_CHAIN_CAGE_STEP",
    "SKY_WALL_RIM_PRESSURE",
    "applyFiveManSqueeze",
    "applyDebtCollector",
    "applyHookedTax",
    "Lung Burner X drains",
    "Contact Tax X tilts",
    "Corner Trap X pins"
  ];

  let foundLegacy = false;
  legacyTerms.forEach(term => {
    if (content.includes(term)) {
      console.error("❌ FAILED: Found legacy term '" + term + "' in matchEngine.ts");
      foundLegacy = true;
      passed = false;
    }
  });

  if (!foundLegacy) {
    console.log("✅ PASSED: No legacy strings or unused mechanics found in matchEngine.ts");
  }

  const requiredNewMechanics = [
    "DEEP_STRIKE_EXPOSE",
    "POSTER_SPARK_TILT",
    "COURT_VISION_RHYTHM_BOOST",
    "DEFENSIVE_ANCHOR_TEAM_BOOST",
    "LOCK_CHAIN_HOOKED",
    "SKY_WALL_BLOCK_BOOST"
  ];

  let missingNew = false;
  requiredNewMechanics.forEach(term => {
    if (!content.includes(term)) {
      console.error("❌ FAILED: Missing new mechanic '" + term + "' in matchEngine.ts");
      missingNew = true;
      passed = false;
    }
  });

  if (!missingNew) {
    console.log("✅ PASSED: All new mechanic IDs found in matchEngine.ts");
  }

  if (passed) {
    console.log("\\n✅ VALIDATION PASSED. Hard reset is complete.");
    process.exit(0);
  } else {
    console.log("\\n❌ VALIDATION FAILED. Please review the errors above.");
    process.exit(1);
  }
}

runValidation();
