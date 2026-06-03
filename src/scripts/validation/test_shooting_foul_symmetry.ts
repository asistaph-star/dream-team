import * as fs from "fs";
import * as path from "path";

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
  console.log("=== RUNNING SHOOTING FOUL SYMMETRY VALIDATION ===\n");

  const matchEnginePath = path.resolve(__dirname, "../../lib/utils/matchEngine.ts");
  const engineContent = fs.readFileSync(matchEnginePath, "utf-8");
  const lines = engineContent.split("\n");

  // ─────────────────────────────────────────────────────────────────────
  // SECTION 1: Global Constraint Preservation
  // ─────────────────────────────────────────────────────────────────────
  console.log("── Section 1: Global Constraint Preservation ──");

  assert(
    engineContent.includes("const MAX_SHOOTING_FOUL_CHANCE = 0.28;"),
    "MAX_SHOOTING_FOUL_CHANCE remains 0.28"
  );
  assert(
    engineContent.includes("const MAX_3PT_POSITIVE_ADDITIVE_BONUS = 0.08;"),
    "MAX_3PT_POSITIVE_ADDITIVE_BONUS remains 0.08"
  );

  // Four-Point Bait boost mapping unchanged on both paths
  const boostMapping = "(baitDsLevel >= 1 && baitFdLevel >= 1) ? 0.090 : (baitDsLevel >= 1 || baitFdLevel >= 1) ? 0.045 : 0.020";
  const boostCount = (engineContent.match(/\(baitDsLevel >= 1 && baitFdLevel >= 1\) \? 0\.090 : \(baitDsLevel >= 1 \|\| baitFdLevel >= 1\) \? 0\.045 : 0\.020/g) || []).length;
  assert(boostCount === 2, `Four-Point Bait boost mapping present on both User and AI paths (found ${boostCount} occurrences, expected 2)`);

  // Red Dot / Exposed Setup unchanged
  assert(
    engineContent.includes("DEEP_STRIKE_EXPOSE_SETUP"),
    "DEEP_STRIKE_EXPOSE_SETUP (Red Dot X) still present and unchanged"
  );

  // Arc Pressure unchanged
  assert(
    engineContent.includes("Arc Pressure"),
    "Arc Pressure still referenced"
  );

  // Flop unchanged
  assert(
    engineContent.includes("FLOP_SELL_CONTACT"),
    "FLOP_SELL_CONTACT (Flop X) still present and unchanged"
  );

  // ─────────────────────────────────────────────────────────────────────
  // SECTION 2: User Path Unchanged (Discipline Wall + Stamina Tracking)
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n── Section 2: User Path Unchanged ──");

  // User path Discipline Wall scaled formula (lines ~2270-2275)
  assert(
    engineContent.includes("const holders = aiLineup.filter(p => hasBaseSkill(p, \"Discipline Wall\"));"),
    "User path: Discipline Wall holders lookup from aiLineup present"
  );
  assert(
    engineContent.includes("const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getOnBallDefenseRating(p))) : (primaryDefender ? getOnBallDefenseRating(primaryDefender) : 50);"),
    "User path: maxRating computed from aiLineup holders"
  );
  assert(
    engineContent.includes("skillShotBonus -= 0.03 * disciplineScale;"),
    "User path: skillShotBonus uses 0.03 * disciplineScale"
  );

  // User path shooting foul stamina tracking
  // Find the User path shooting foul block — it uses sfChance (not sfChance_ai)
  // and calls trackShotStamina right after shootingFoulOccurred = true
  const userFoulBlock = engineContent.indexOf("sfChance = Math.min(MAX_SHOOTING_FOUL_CHANCE, sfChance);");
  const aiClampBlock = engineContent.indexOf("sfChance_ai = Math.min(MAX_SHOOTING_FOUL_CHANCE, sfChance_ai);");
  assert(userFoulBlock !== -1, "User path sfChance clamp found");
  assert(aiClampBlock !== -1, "AI path sfChance_ai clamp found");

  // Check trackShotStamina appears in User path section (before AI path)
  const userPathSection = engineContent.substring(userFoulBlock, aiClampBlock);
  assert(
    userPathSection.includes("trackShotStamina(scorer.id, shotType, is3PT, 'foul');"),
    "User path: trackShotStamina still present in shooting foul success block"
  );
  assert(
    userPathSection.includes("trackDefensiveStamina(primaryDefender, shotType, is3PT, 'foul');"),
    "User path: trackDefensiveStamina still present in shooting foul success block"
  );

  // ─────────────────────────────────────────────────────────────────────
  // SECTION 3: AI Path Fix — Discipline Wall Scaled Formula
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n── Section 3: AI Path Fix — Discipline Wall Scaled Formula ──");

  assert(
    engineContent.includes("const dwHolders = userLineup.filter(p => hasBaseSkill(p, \"Discipline Wall\"));"),
    "AI path: dwHolders lookup from userLineup present"
  );
  assert(
    engineContent.includes("const dwMaxRating = dwHolders.length > 0 ? Math.max(...dwHolders.map(p => getOnBallDefenseRating(p))) : (primaryDefender ? getOnBallDefenseRating(primaryDefender) : 50);"),
    "AI path: dwMaxRating computed from userLineup holders"
  );
  assert(
    engineContent.includes("aiSkillShotBonus -= 0.03 * disciplineScale;"),
    "AI path: aiSkillShotBonus uses 0.03 * disciplineScale (not flat 0.03)"
  );

  // Confirm the Discipline Wall branch itself only contains the scaled formula.
  // Anchor on the unique skillLog that only appears in the AI DW branch, then inspect the next 350 chars.
  const dwBlock = (() => {
    const sentinel = "Discipline Wall holds off Four-Point Bait X`, true);";
    const start = engineContent.indexOf(sentinel);
    if (start === -1) return "";
    return engineContent.substring(start, start + 600);
  })();
  assert(
    dwBlock.includes("dwHolders") &&
    dwBlock.includes("aiSkillShotBonus -= 0.03 * disciplineScale;") &&
    !dwBlock.includes("aiSkillShotBonus -= 0.03;"),
    "AI Discipline Wall block: scaled formula present and no flat 0.03 remains in DW block"
  );

  // ─────────────────────────────────────────────────────────────────────
  // SECTION 4: AI Path Fix — Shooting Foul Stamina Tracking
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n── Section 4: AI Path Fix — Shooting Foul Stamina Tracking ──");

  // The AI main possession shooting foul block is after sfChance_ai clamp
  const aiSfBlock = engineContent.substring(aiClampBlock);
  // Find the first shootingFoulOccurred = true in the AI block
  const firstFoulTrue = aiSfBlock.indexOf("shootingFoulOccurred = true;");
  assert(firstFoulTrue !== -1, "AI path: shootingFoulOccurred = true found in AI section");

  // Check that trackShotStamina and trackDefensiveStamina appear immediately after
  const afterFoulTrue = aiSfBlock.substring(firstFoulTrue, firstFoulTrue + 300);
  assert(
    afterFoulTrue.includes("trackShotStamina(scorer.id, shotType, is3PT, 'foul');"),
    "AI path: trackShotStamina added to AI shooting foul success block"
  );
  assert(
    afterFoulTrue.includes("trackDefensiveStamina(primaryDefender, shotType, is3PT, 'foul');"),
    "AI path: trackDefensiveStamina added to AI shooting foul success block"
  );

  // ─────────────────────────────────────────────────────────────────────
  // SECTION 5: AI Blitz/Trap Path Unchanged (Already Had Tracking)
  // ─────────────────────────────────────────────────────────────────────
  console.log("\n── Section 5: AI Blitz/Trap Path Still Has Tracking ──");

  // The blitz/trap foul block is in the user possession AI blitz section.
  // It uses sfChance (not sfChance_ai) and has no special skill counters.
  // We verify it still has both tracking calls.
  const blitzSection = engineContent.substring(0, aiClampBlock);
  // Find the blitz/trap tracking — it appears after the block path
  const blitzFoulIdx = blitzSection.lastIndexOf("shootingFoulOccurred = true;");
  assert(blitzFoulIdx !== -1, "AI Blitz/Trap: shootingFoulOccurred = true found");
  const afterBlitzFoul = blitzSection.substring(blitzFoulIdx, blitzFoulIdx + 300);
  assert(
    afterBlitzFoul.includes("trackShotStamina(scorer.id, shotType, is3PT, 'foul');"),
    "AI Blitz/Trap: trackShotStamina still present (unchanged)"
  );
  assert(
    afterBlitzFoul.includes("trackDefensiveStamina(primaryDefender, shotType, is3PT, 'foul');"),
    "AI Blitz/Trap: trackDefensiveStamina still present (unchanged)"
  );

  // ─────────────────────────────────────────────────────────────────────
  // Final Result
  // ─────────────────────────────────────────────────────────────────────
  console.log("");
  if (testsFailed) {
    console.error("❌ SOME SHOOTING FOUL SYMMETRY TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("✅ All symmetry checks passed!");
    console.log("\n🎉 SHOOTING FOUL SYMMETRY VALIDATION PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
