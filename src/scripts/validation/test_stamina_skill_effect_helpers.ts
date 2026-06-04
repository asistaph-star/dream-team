import * as fs from "fs";
import * as path from "path";
import {
  DEBT_COLLECTOR_DRAIN,
  FIVE_MAN_SQUEEZE_BASE,
  FIVE_MAN_SQUEEZE_BOOSTED,
  HOOKED_TAX_DRAIN,
  getContactTaxDrain,
  getLungBurnerBaseDrain,
  getLungBurnerDrain,
  applyAntiSnowballScaling,
  getPowerDriverDrain,
  getDefensiveAnchorPressureDrain,
  getDefensiveAnchorTeamPressureDrain,
  getLockChainOnBallPressureDrain
} from "../../lib/match/staminaSkillEffects";

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
  console.log("=== RUNNING STAMINA SKILL EFFECT HELPERS VALIDATION ===\n");

  // 1. Contact Tax outputs
  assert(getContactTaxDrain(0) === 8, "Contact Tax Level 0 returns 8");
  assert(getContactTaxDrain(1) === 10, "Contact Tax Level 1 returns 10");
  assert(getContactTaxDrain(2) === 11, "Contact Tax Level 2 returns 11");
  assert(getContactTaxDrain(3) === 12, "Contact Tax Level 3 returns 12");

  // 2. Lung Burner base outputs
  assert(getLungBurnerBaseDrain(0) === 15, "Lung Burner Base Level 0 returns 15");
  assert(getLungBurnerBaseDrain(1) === 20, "Lung Burner Base Level 1 returns 20");
  assert(getLungBurnerBaseDrain(2) === 30, "Lung Burner Base Level 2 returns 30");
  assert(getLungBurnerBaseDrain(3) === 40, "Lung Burner Base Level 3 returns 40");

  // 3. Lung Burner with Debt outputs (clamped at 40)
  assert(getLungBurnerDrain(0, false) === 15, "Lung Burner Level 0 (no Debt) returns 15");
  assert(getLungBurnerDrain(0, true) === 25, "Lung Burner Level 0 (with Debt) returns 25");
  assert(getLungBurnerDrain(2, false) === 30, "Lung Burner Level 2 (no Debt) returns 30");
  assert(getLungBurnerDrain(2, true) === 40, "Lung Burner Level 2 (with Debt) returns 40");
  assert(getLungBurnerDrain(3, false) === 40, "Lung Burner Level 3 (no Debt) returns 40");
  assert(getLungBurnerDrain(3, true) === 40, "Lung Burner Level 3 (with Debt) returns 40 (clamped at 40)");

  // 4. Anti-snowball scaling
  assert(applyAntiSnowballScaling(10, 60) === 10, "Anti-snowball at 60% stamina returns full drain (10)");
  assert(applyAntiSnowballScaling(12, 40) === 7, "Anti-snowball at 40% stamina scales by 0.60 and rounds (12 * 0.60 = 7.2 -> 7)");
  assert(applyAntiSnowballScaling(12, 20) === 4, "Anti-snowball at 20% stamina scales by 0.30 and rounds (12 * 0.30 = 3.6 -> 4)");
  assert(applyAntiSnowballScaling(40, 40) === 24, "Anti-snowball at 40% stamina scales by 0.60 and rounds (40 * 0.60 = 24)");
  assert(applyAntiSnowballScaling(40, 20) === 12, "Anti-snowball at 20% stamina scales by 0.30 and rounds (40 * 0.30 = 12)");

  // 5. Power Driver caps
  assert(getPowerDriverDrain(0.90) === 28.8, "Power Driver drain scale 0.90 returns 28.8 (32 * 0.90 = 28.8 < 36)");
  assert(getPowerDriverDrain(1.10) === 35.2, "Power Driver drain scale 1.10 returns 35.2 (32 * 1.10 = 35.2 < 36)");
  assert(getPowerDriverDrain(1.20) === 36, "Power Driver drain scale 1.20 returns 36 (capped at 36)");

  // 6. Defensive Anchor Pressure caps
  assert(getDefensiveAnchorPressureDrain(1.0) === 6, "Defensive Anchor single scale 1.0 returns 6 (6 * 1.0 = 6)");
  assert(getDefensiveAnchorPressureDrain(1.30) === 8, "Defensive Anchor single scale 1.30 returns 8 (Math.round(6 * 1.30) = 8)");
  assert(getDefensiveAnchorPressureDrain(1.50) === 8, "Defensive Anchor single scale 1.50 returns 8 (capped at 8)");

  assert(getDefensiveAnchorTeamPressureDrain(1.0) === 15, "Defensive Anchor team scale 1.0 returns 15 (15 * 1.0 = 15)");
  assert(getDefensiveAnchorTeamPressureDrain(1.30) === 20, "Defensive Anchor team scale 1.30 returns 20 (Math.round(15 * 1.30) = 20)");
  assert(getDefensiveAnchorTeamPressureDrain(1.50) === 20, "Defensive Anchor team scale 1.50 returns 20 (capped at 20)");

  // 7. Lock Chain Pressure caps
  assert(getLockChainOnBallPressureDrain(1.0) === 9, "Lock Chain scale 1.0 returns 9 (9 * 1.0 = 9)");
  assert(getLockChainOnBallPressureDrain(1.30) === 12, "Lock Chain scale 1.30 returns 12 (Math.round(9 * 1.30) = 12)");
  assert(getLockChainOnBallPressureDrain(1.50) === 12, "Lock Chain scale 1.50 returns 12 (capped at 12)");

  // 8. Stamina Drain Constants validation (representing flagged values)
  assert(DEBT_COLLECTOR_DRAIN === 45, "DEBT_COLLECTOR_DRAIN is exactly 45 (NEEDS REGRESSION / DECISION)");
  assert(FIVE_MAN_SQUEEZE_BASE === 25, "FIVE_MAN_SQUEEZE_BASE is exactly 25");
  assert(FIVE_MAN_SQUEEZE_BOOSTED === 40, "FIVE_MAN_SQUEEZE_BOOSTED is exactly 40");
  assert(HOOKED_TAX_DRAIN === 38, "HOOKED_TAX_DRAIN is exactly 38");

  // 9. Confirm no 110 or 190 active drain constants exist
  const helperFilePath = path.resolve(__dirname, "../../lib/match/staminaSkillEffects.ts");
  const helperContent = fs.readFileSync(helperFilePath, "utf-8");
  assert(!helperContent.includes("110"), "staminaSkillEffects.ts contains no reference to 110");
  assert(!helperContent.includes("190"), "staminaSkillEffects.ts contains no reference to 190");

  console.log("");
  if (testsFailed) {
    console.error("❌ STAMINA HELPER TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("🎉 ALL STAMINA HELPER TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
