import * as fs from "fs";
import * as path from "path";
import {
  FOUL_W,
  getPositionFoulWeight,
  getFoulStaminaModifier,
  getClutchRatingByRarity,
  calculateCrowdNoisePenalty,
  calculateFreeThrowChance,
  calculateBaseShootingFoulChance,
  calculateFoulDrawModifier,
  calculateFlopIdentityScale,
  calculateFourPointBaitIdentityScale,
  calculateComposureIdentityScale,
  calculateCleanContestIdentityScale,
  calculateDisciplineScale,
  calculateFourPointBaitBoost
} from "../../lib/match/foulSystem";

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
  console.log("=== RUNNING FOUL SYSTEM HELPER UNIT TESTS ===\n");

  // 1. FOUL_W exact values
  assert(FOUL_W.PG === 1.4, "FOUL_W.PG is 1.4");
  assert(FOUL_W.SG === 1.2, "FOUL_W.SG is 1.2");
  assert(FOUL_W.SF === 1.0, "FOUL_W.SF is 1.0");
  assert(FOUL_W.PF === 0.8, "FOUL_W.PF is 0.8");
  assert(FOUL_W.C === 0.6, "FOUL_W.C is 0.6");

  // 2. getPositionFoulWeight
  assert(getPositionFoulWeight("PG") === 1.4, "getPositionFoulWeight('PG') returns 1.4");
  assert(getPositionFoulWeight("C") === 0.6, "getPositionFoulWeight('C') returns 0.6");
  assert(getPositionFoulWeight("INVALID") === 1.0, "getPositionFoulWeight default returns 1.0");

  // 3. getFoulStaminaModifier thresholds
  assert(getFoulStaminaModifier(75) === 1.0, "getFoulStaminaModifier(75) returns 1.0");
  assert(getFoulStaminaModifier(70) === 1.0, "getFoulStaminaModifier(70) returns 1.0");
  assert(getFoulStaminaModifier(60) === 1.12, "getFoulStaminaModifier(60) returns 1.12");
  assert(getFoulStaminaModifier(50) === 1.12, "getFoulStaminaModifier(50) returns 1.12");
  assert(getFoulStaminaModifier(40) === 1.28, "getFoulStaminaModifier(40) returns 1.28");
  assert(getFoulStaminaModifier(30) === 1.28, "getFoulStaminaModifier(30) returns 1.28");
  assert(getFoulStaminaModifier(20) === 1.45, "getFoulStaminaModifier(20) returns 1.45");

  // 4. getClutchRatingByRarity
  assert(getClutchRatingByRarity("Mythic") === 0.13, "getClutchRatingByRarity('Mythic') returns 0.13");
  assert(getClutchRatingByRarity("Legendary") === 0.09, "getClutchRatingByRarity('Legendary') returns 0.09");
  assert(getClutchRatingByRarity("Epic") === 0.04, "getClutchRatingByRarity('Epic') returns 0.04");
  assert(getClutchRatingByRarity("Rare") === 0.00, "getClutchRatingByRarity('Rare') returns 0.00");
  assert(getClutchRatingByRarity("Common") === -0.03, "getClutchRatingByRarity('Common') returns -0.03");
  assert(getClutchRatingByRarity(undefined) === 0.00, "getClutchRatingByRarity(undefined) returns 0.00");
  assert(getClutchRatingByRarity("INVALID") === 0.00, "getClutchRatingByRarity('INVALID') returns 0.00");

  // 5. calculateCrowdNoisePenalty
  // formula: (0.03 * crowdEnergy) * clutchAmplifier * resistance
  // Common resistance: 0.90, clutchActive=false, intensity=low -> amp=1.0, crowdEnergy=0.8
  // expected: (0.03 * 0.8) * 1.0 * 0.90 = 0.0216
  assert(Math.abs(calculateCrowdNoisePenalty("Common", 0.8, false, "low") - 0.0216) < 1e-6, "calculateCrowdNoisePenalty Common baseline matches");
  // Legendary resistance: 0.45, clutchActive=true -> amp=2.0, crowdEnergy=1.0
  // expected: (0.03 * 1.0) * 2.0 * 0.45 = 0.027
  assert(Math.abs(calculateCrowdNoisePenalty("Legendary", 1.0, true, "high") - 0.027) < 1e-6, "calculateCrowdNoisePenalty Legendary clutch matches");

  // 6. calculateFreeThrowChance rating normalization, hot bonus, stamina penalty, clutch bonus
  // Base chance: normalized rating = rating if <= 100
  // baseChance = Math.min(0.90, Math.max(0.62, 0.74 + (80 - 75) * 0.0025)) = 0.7525
  // staminaMod = 0.96 (penalty = -0.03)
  // formRating = 1.0 (hotBonus = 0)
  // clutchActive = false, isAway = false
  // expected: 0.7525 - 0.03 = 0.7225
  assert(Math.abs(calculateFreeThrowChance(80, 0.96, 1.0, false, "low", false, 0.5, "Common") - 0.7225) < 1e-6, "calculateFreeThrowChance normal matches");

  // base chance normalized: ftRating = 120 -> normalizedFt = 60 + 20 * 0.45 = 69
  // baseChance = Math.min(0.90, Math.max(0.62, 0.74 + (69 - 75) * 0.0025)) = 0.725
  // staminaMod = 1.0 (penalty = 0)
  // formRating = 1.15 (hotBonus = 0.05)
  // clutchActive = true, intensity = high, rarity = Legendary (clutchRating = 0.09) -> clutchBonus = 0.09 * 1.3 = 0.117
  // isAway = false
  // expected: 0.725 + 0.0 + 0.05 + 0.117 = 0.892
  assert(Math.abs(calculateFreeThrowChance(120, 1.0, 1.15, true, "high", false, 0.5, "Legendary") - 0.892) < 1e-6, "calculateFreeThrowChance normalization + hot + clutch matches");

  // check clamps: free throw clamp remains [0.50, 0.95]
  assert(calculateFreeThrowChance(150, 1.0, 1.20, true, "high", false, 0.0, "Mythic") === 0.95, "calculateFreeThrowChance capped at 0.95");
  assert(calculateFreeThrowChance(30, 0.50, 0.80, false, "low", true, 1.0, "Common") === 0.50, "calculateFreeThrowChance floored at 0.50");

  // 7. calculateBaseShootingFoulChance
  // formula: ((is3PT ? 0.044 : 0.086) * getFoulStamMod(defAvgStamina) * (0.90 + foulDrawTendency * 0.25)) + clutchFoulBoost
  // is3PT=true -> base=0.044, defAvgStamina=80 -> mod=1.0, foulDrawTendency=0.4 -> drawMod=1.0, clutchActive=false
  // expected: 0.044 * 1.0 * 1.0 + 0 = 0.044
  assert(Math.abs(calculateBaseShootingFoulChance(true, 80, 0.4, false, "Common") - 0.044) < 1e-6, "calculateBaseShootingFoulChance 3PT baseline matches");
  // is3PT=false -> base=0.086, defAvgStamina=40 -> mod=1.28, foulDrawTendency=0.8 -> drawMod=1.1, clutchActive=true, rarity=Legendary -> clutchFoulBoost=0.09*0.5=0.045
  // expected: 0.086 * 1.28 * 1.1 + 0.045 = 0.166088
  assert(Math.abs(calculateBaseShootingFoulChance(false, 40, 0.8, true, "Legendary") - 0.166088) < 1e-6, "calculateBaseShootingFoulChance non-3PT complex matches");

  // 8. Identity/scaler helpers
  assert(calculateFoulDrawModifier(0.4) === 1.0, "calculateFoulDrawModifier(0.4) is 1.0");
  assert(calculateFlopIdentityScale(0.5) === 1.0, "calculateFlopIdentityScale(0.5) is 1.0");
  // calculateFourPointBaitIdentityScale: identity = (threePtRating + foulDrawTendency * 100) / 2
  // expected for 80 3pt and 0.4 tendency: identity = (80 + 40) / 2 = 60. scale = 0.90 + 0.6 * 0.20 = 1.02
  assert(Math.abs(calculateFourPointBaitIdentityScale(80, 0.4) - 1.02) < 1e-6, "calculateFourPointBaitIdentityScale matches");
  // calculateComposureIdentityScale: 0.90 + (calm / 100) * 0.20
  assert(Math.abs(calculateComposureIdentityScale(80) - 1.06) < 1e-6, "calculateComposureIdentityScale matches");
  // calculateCleanContestIdentityScale: 0.90 + (((onBall + block)/2)/100)*0.20
  assert(Math.abs(calculateCleanContestIdentityScale(80, 60) - 1.04) < 1e-6, "calculateCleanContestIdentityScale matches");
  // calculateDisciplineScale: 0.85 + (maxRating / 100) * 0.30
  assert(Math.abs(calculateDisciplineScale(80) - 1.09) < 1e-6, "calculateDisciplineScale matches");

  // 9. calculateFourPointBaitBoost
  assert(calculateFourPointBaitBoost(1, 1) === 0.090, "calculateFourPointBaitBoost(1, 1) returns 0.090");
  assert(calculateFourPointBaitBoost(1, 0) === 0.045, "calculateFourPointBaitBoost(1, 0) returns 0.045");
  assert(calculateFourPointBaitBoost(0, 1) === 0.045, "calculateFourPointBaitBoost(0, 1) returns 0.045");
  assert(calculateFourPointBaitBoost(0, 0) === 0.020, "calculateFourPointBaitBoost(0, 0) returns 0.020");

  // 10. Helper file does not call Math.random
  const helperPath = path.resolve(__dirname, "../../lib/match/foulSystem.ts");
  const helperContent = fs.readFileSync(helperPath, "utf-8");
  assert(!helperContent.includes("Math.random"), "foulSystem.ts contains no calls to Math.random");

  // 11. pickFoulCommitter remains in matchEngine.ts
  const matchEnginePath = path.resolve(__dirname, "../../lib/utils/matchEngine.ts");
  const engineContent = fs.readFileSync(matchEnginePath, "utf-8");
  assert(engineContent.includes("const pickFoulCommitter"), "pickFoulCommitter remains in matchEngine.ts");

  // 12. runFTSequence remains in matchEngine.ts
  assert(engineContent.includes("const runFTSequence"), "runFTSequence remains in matchEngine.ts");

  // Final validation exit status
  console.log("");
  if (testsFailed) {
    console.error("❌ SOME FOUL HELPER UNIT TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("🎉 ALL FOUL HELPER UNIT TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
