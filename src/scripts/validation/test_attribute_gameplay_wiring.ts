// test_attribute_gameplay_wiring.ts
// Phase: MatchEngineWiring -- Validation Lock
// Verifies basketballIQ and hustle are properly integrated and wired into the match engine

import { calculateBasketballIQTurnoverModifier, calculateBasketballIQShotQualityModifier, calculateBasketballIQDisciplineScale, calculateHustleContestModifier } from "../../lib/match/attributeGameplayEffects";
import { calculateFinalScoringChance } from "../../lib/match/shotResolution";
import { REB_W, calculateTeamReboundScore } from "../../lib/match/reboundSystem";
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

function run() {
  console.log("=== RUNNING ATTRIBUTE GAMEPLAY WIRING VALIDATION ===\n");

  // 1. Turnover basketballIQ scaling
  console.log("--- Section 1: Turnover BasketballIQ Modifier ---");
  const lowIqTovMod = calculateBasketballIQTurnoverModifier(45);
  const midIqTovMod = calculateBasketballIQTurnoverModifier(80);
  const highIqTovMod = calculateBasketballIQTurnoverModifier(150);

  assert(lowIqTovMod > 1.0, `Low IQ increases turnover chance (45 IQ -> ${lowIqTovMod.toFixed(3)}x)`);
  assert(midIqTovMod === 1.0, `Mid IQ is neutral (80 IQ -> ${midIqTovMod.toFixed(3)}x)`);
  assert(highIqTovMod < 1.0, `High IQ decreases turnover chance (150 IQ -> ${highIqTovMod.toFixed(3)}x)`);
  assert(lowIqTovMod <= 1.03, "Low IQ penalty is clamped to 1.03 max");
  assert(highIqTovMod >= 0.94, "High IQ benefit is clamped to 0.94 min");

  // 2. Discipline Wall basketballIQ scaling
  console.log("\n--- Section 2: Discipline Wall Scale ---");
  const lowIqDwScale = calculateBasketballIQDisciplineScale(45);
  const midIqDwScale = calculateBasketballIQDisciplineScale(80);
  const highIqDwScale = calculateBasketballIQDisciplineScale(150);

  assert(lowIqDwScale < 1.09, `Low IQ defender has less Discipline Wall resistance (45 IQ -> ${lowIqDwScale.toFixed(3)}x)`);
  assert(Math.abs(midIqDwScale - 1.09) < 1e-6, `Mid IQ defender has normal Discipline Wall resistance (80 IQ -> ${midIqDwScale.toFixed(3)}x)`);
  assert(highIqDwScale > 1.09, `High IQ defender has greater Discipline Wall resistance (150 IQ -> ${highIqDwScale.toFixed(3)}x)`);

  // 3. Hustle rebound modifier
  console.log("\n--- Section 3: Hustle Rebound Modifier ---");
  const pLowHustle: Player = { id: "p1", name: "Low Hustle", position: "C", rarity: "Rare", rebound: 80, stamina: 100, playmaking: 80, defense: 80, shooting: 80, speed: 80, strength: 80, hustle: 45, level: 1, maxLevel: 5, exp: 0, ovr: 80, offense: 80 };
  const pMidHustle: Player = { id: "p2", name: "Mid Hustle", position: "C", rarity: "Rare", rebound: 80, stamina: 100, playmaking: 80, defense: 80, shooting: 80, speed: 80, strength: 80, hustle: 80, level: 1, maxLevel: 5, exp: 0, ovr: 80, offense: 80 };
  const pHighHustle: Player = { id: "p3", name: "High Hustle", position: "C", rarity: "Rare", rebound: 80, stamina: 100, playmaking: 80, defense: 80, shooting: 80, speed: 80, strength: 80, hustle: 150, level: 1, maxLevel: 5, exp: 0, ovr: 80, offense: 80 };

  const staminaMap = { p1: 100, p2: 100, p3: 100 };
  const lowReboundScore = calculateTeamReboundScore([pLowHustle], staminaMap);
  const midReboundScore = calculateTeamReboundScore([pMidHustle], staminaMap);
  const highReboundScore = calculateTeamReboundScore([pHighHustle], staminaMap);

  assert(lowReboundScore < midReboundScore, `Low hustle reduces rebound score (${lowReboundScore.toFixed(1)} vs ${midReboundScore.toFixed(1)})`);
  assert(highReboundScore > midReboundScore, `High hustle boosts rebound score (${highReboundScore.toFixed(1)} vs ${midReboundScore.toFixed(1)})`);

  // 4. BasketballIQ Shot Quality Modifier
  console.log("\n--- Section 4: BasketballIQ Pressure Mitigation ---");
  const contextNormal = { isLateClock: false, isLowStamina: false, isHeavyContest: false, isBrokenPlayRescue: false };
  const contextPressure = { isLateClock: true, isLowStamina: true, isHeavyContest: true, isBrokenPlayRescue: false };

  const lowIqNormMod = calculateBasketballIQShotQualityModifier(45, contextNormal);
  const highIqNormMod = calculateBasketballIQShotQualityModifier(150, contextNormal);
  assert(lowIqNormMod === 0.0 && highIqNormMod === 0.0, "BasketballIQ shot modifier is neutral (0.0) in normal conditions");

  const lowIqPressMod = calculateBasketballIQShotQualityModifier(45, contextPressure);
  const midIqPressMod = calculateBasketballIQShotQualityModifier(80, contextPressure);
  const highIqPressMod = calculateBasketballIQShotQualityModifier(150, contextPressure);

  assert(lowIqPressMod < 0.0, `Low IQ in pressure context reduces quality (45 IQ -> ${lowIqPressMod.toFixed(4)})`);
  assert(midIqPressMod === 0.0, `Mid IQ in pressure context is neutral (80 IQ -> ${midIqPressMod.toFixed(4)})`);
  assert(highIqPressMod > 0.0, `High IQ in pressure context mitigates pressure (150 IQ -> ${highIqPressMod.toFixed(4)})`);
  assert(lowIqPressMod >= -0.015, "IQ pressure penalty is clamped to -0.015 min");
  assert(highIqPressMod <= 0.015, "IQ pressure benefit is clamped to 0.015 max");

  // 5. Hustle Contest Modifier
  console.log("\n--- Section 5: Hustle Contest Modifier ---");
  const lowHustleContest = calculateHustleContestModifier(45);
  const midHustleContest = calculateHustleContestModifier(80);
  const highHustleContest = calculateHustleContestModifier(150);

  // Note: Higher rawMod from calculateHustleContestModifier means stronger defense, which reduces shot chance (applied as 1 / rawMod)
  assert(lowHustleContest < 1.0, `Low hustle defender has less raw defensive rating (45 hustle -> ${lowHustleContest.toFixed(3)})`);
  assert(midHustleContest === 1.0, `Mid hustle defender has normal raw defensive rating (80 hustle -> ${midHustleContest.toFixed(3)})`);
  assert(highHustleContest > 1.0, `High hustle defender has greater raw defensive rating (150 hustle -> ${highHustleContest.toFixed(3)})`);
  
  const lowHustleShotMult = 1.0 / lowHustleContest;
  const highHustleShotMult = 1.0 / highHustleContest;
  assert(lowHustleShotMult > 1.0, `Low hustle results in a positive shot multiplier (45 hustle -> ${lowHustleShotMult.toFixed(3)}x)`);
  assert(highHustleShotMult < 1.0, `High hustle results in a negative shot multiplier (150 hustle -> ${highHustleShotMult.toFixed(3)}x)`);

  // 6. shotResolution Final Scoring Chance Wiring
  console.log("\n--- Section 6: Final Scoring Chance Integration ---");
  const baseChance = 0.50;

  // Test that new optional params default to 1.0 when not provided (or 0.0 for IQ pressure)
  const chanceDefault = calculateFinalScoringChance({
    finalChance: baseChance,
    staminaMod: 1.0,
    formRating: 1.0,
    clutchMod: 1.0,
    effectiveZoneMod: 1.0,
    effectivePressMod: 1.0,
    usageMod: 1.0,
    individual3ptMod: 1.0,
    additiveBonus: 0,
    difficultyMod: 0,
    decisionWeightMod: 1.0,
    maxCeilingLimit: 0.85
  });

  // Test with custom basketballIQPressureMod & hustleContestMod
  const chanceCustom = calculateFinalScoringChance({
    finalChance: baseChance,
    staminaMod: 1.0,
    formRating: 1.0,
    clutchMod: 1.0,
    effectiveZoneMod: 1.0,
    effectivePressMod: 1.0,
    usageMod: 1.0,
    individual3ptMod: 1.0,
    additiveBonus: 0,
    difficultyMod: 0,
    decisionWeightMod: 1.0,
    maxCeilingLimit: 0.85,
    basketballIQPressureMod: 0.01,
    hustleContestMod: 1.05
  });

  const expectedChance = (baseChance * (1.0 / 1.05)) + 0.01;

  assert(chanceDefault === baseChance, `Default params keep chance at base (${chanceDefault} vs ${baseChance})`);
  assert(Math.abs(chanceCustom - expectedChance) < 1e-6, `Custom params scale chance correctly: expected ${expectedChance.toFixed(5)}, got ${chanceCustom.toFixed(5)}`);

  console.log("\n============================================================");
  if (testsFailed) {
    console.error("❌ GAMEPLAY EFFECTS WIRING VALIDATION FAILED.");
    process.exit(1);
  } else {
    console.log("✅ ALL GAMEPLAY WIRING VALIDATION CHECKS PASSED!");
    process.exit(0);
  }
}

run();
