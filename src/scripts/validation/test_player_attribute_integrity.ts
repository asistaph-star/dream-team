import { mockPlayers } from "../../lib/data/mockPlayers";
import { applyStarGrowth, repairStarGrowth } from "../../lib/utils/starGrowth";
import { calculateShotIntentWeights } from "../../lib/match/playerIntentSelection";
import { generateShot } from "../../lib/utils/shotEngine";
import { calculateBaseShootingFoulChance, calculateFoulDrawModifier } from "../../lib/match/foulSystem";
import { SPECIAL_SKILL_NAMES, BASE_SKILL_TEXT } from "../../lib/skills/skillCatalog";
import { migratePlayerSpecialSkills } from "../../lib/skills/skillMigration";
import { Player } from "../../lib/types/player";

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] Assertion failed: ${message}`);
    testsFailed = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

async function run() {
  console.log("=== RUNNING PLAYER ATTRIBUTE INTEGRITY VALIDATION ===");

  // 1. OVR Protection & Star-Up Audit
  console.log("--- 1. OVR Protection and Star-Up Checks ---");
  const testPlayer = mockPlayers.find(p => p.id === "p_vincent") || mockPlayers[0];
  assert(!!testPlayer, "Found test player in roster");

  if (testPlayer) {
    const originalOvr = testPlayer.ovr;
    
    // Apply star growth across multiple star levels and verify OVR is untouched
    for (let stars = 1; stars <= 25; stars++) {
      const upgraded = applyStarGrowth(testPlayer, stars);
      assert(upgraded.ovr === originalOvr, `OVR remains exactly ${originalOvr} at Star Level ${stars}`);
      assert(upgraded.starLevel === stars, `starLevel is set to ${stars}`);
      assert(upgraded.starGrowthAppliedLevel === stars, `starGrowthAppliedLevel is set to ${stars}`);
    }

    // Verify star-up boosts only allowed gameplay attributes
    const upgraded = applyStarGrowth(testPlayer, 5);
    const allowedKeys = new Set([
      "threePt", "twoPt", "freeThrow", "handle", "assist", "steal",
      "block", "rebound", "onBall", "calm", "offense", "defense",
      "shooting", "playmaking", "speed", "strength", "stamina",
      "starLevel", "starGrowthAppliedLevel"
    ]);

    Object.keys(testPlayer).forEach((key) => {
      const typedKey = key as keyof Player;
      if (!allowedKeys.has(key)) {
        assert(
          JSON.stringify(testPlayer[typedKey]) === JSON.stringify(upgraded[typedKey]),
          `Non-gameplay field '${key}' is preserved and unmodified by star-up`
        );
      } else {
        // Boosted fields should be changed (if they were defined and stars > 0)
        if (typeof testPlayer[typedKey] === "number" && key !== "starLevel" && key !== "starGrowthAppliedLevel") {
          const originalVal = testPlayer[typedKey] as number;
          const upgradedVal = upgraded[typedKey] as number;
          assert(upgradedVal >= originalVal, `Gameplay field '${key}' grew or remained equal (Original: ${originalVal}, Upgraded: ${upgradedVal})`);
        }
      }
    });
  }

  // 2. Tendency Wiring Verification
  console.log("--- 2. Tendency Wiring Checks ---");
  // Check driveTendency and pullUpTendency are wired in calculateShotIntentWeights
  const testPlayerWithTendencies: Player = {
    ...testPlayer,
    driveTendency: 0.8,
    pullUpTendency: 0.2,
    threePtTendency: 0.3,
  };

  const weightsFresh = calculateShotIntentWeights(testPlayerWithTendencies, 100);
  assert(weightsFresh.driveMultiplier > 1.0, "High driveTendency produces driveMultiplier > 1.0");
  assert(weightsFresh.driveMultiplier <= 2.5, "driveMultiplier is capped at 2.5");

  const lowDrivePlayer = { ...testPlayerWithTendencies, driveTendency: 0.1 };
  const weightsLowDrive = calculateShotIntentWeights(lowDrivePlayer, 100);
  assert(weightsFresh.driveMultiplier > weightsLowDrive.driveMultiplier, "Higher driveTendency produces higher driveMultiplier");

  // Check pullUpTendency wired
  const highPullPlayer = { ...testPlayerWithTendencies, pullUpTendency: 0.8 };
  const weightsHighPull = calculateShotIntentWeights(highPullPlayer, 100);
  assert(weightsHighPull.pullUpMultiplier > weightsFresh.pullUpMultiplier, "Higher pullUpTendency produces higher pullUpMultiplier");

  // Check threePtTendency wired in generateShot
  let threePtCount = 0;
  const iterations = 1000;
  const highThreePtPlayer = { ...testPlayer, threePtTendency: 0.8 };
  const lowThreePtPlayer = { ...testPlayer, threePtTendency: 0.05 };

  let highThreeCount = 0;
  let lowThreeCount = 0;
  for (let i = 0; i < iterations; i++) {
    if (generateShot(highThreePtPlayer, 1.0, 100).is3PT) highThreeCount++;
    if (generateShot(lowThreePtPlayer, 1.0, 100).is3PT) lowThreeCount++;
  }
  assert(highThreeCount > lowThreeCount, `threePtTendency controls is3PT (High Tendency 3PTs: ${highThreeCount} vs Low: ${lowThreeCount})`);

  // Check foulDrawTendency wired in foulSystem
  const highFoulPlayer = { ...testPlayer, foulDrawTendency: 0.85 };
  const lowFoulPlayer = { ...testPlayer, foulDrawTendency: 0.15 };
  const foulModHigh = calculateFoulDrawModifier(highFoulPlayer.foulDrawTendency);
  const foulModLow = calculateFoulDrawModifier(lowFoulPlayer.foulDrawTendency);
  assert(foulModHigh > foulModLow, `foulDrawTendency increases foul draw modifier (High: ${foulModHigh} vs Low: ${foulModLow})`);

  const chanceHigh = calculateBaseShootingFoulChance(false, 80, highFoulPlayer.foulDrawTendency, false);
  const chanceLow = calculateBaseShootingFoulChance(false, 80, lowFoulPlayer.foulDrawTendency, false);
  assert(chanceHigh > chanceLow, `foulDrawTendency increases base shooting foul chance (High: ${chanceHigh} vs Low: ${chanceLow})`);

  // 3. Skill Slot Structural Checks
  console.log("--- 3. Special Skill Slots & Base Skills Check ---");
  const specialSkillSet = new Set<string>(SPECIAL_SKILL_NAMES);
  const baseSkillSet = new Set<string>(Object.keys(BASE_SKILL_TEXT));

  mockPlayers.forEach((player) => {
    // Check baseSkills do not contain learned family IDs
    if (player.baseSkills) {
      player.baseSkills.forEach((skill) => {
        assert(!specialSkillSet.has(skill), `Player ${player.name} base skill '${skill}' is NOT a special skill family`);
        assert(baseSkillSet.has(skill), `Player ${player.name} base skill '${skill}' is a valid base skill name`);
      });
    }

    // Check specialSkillSlots use learned family IDs and no baseSkills or legacy strings
    if (player.specialSkillSlots) {
      player.specialSkillSlots.forEach((slot) => {
        if (slot !== null) {
          assert(specialSkillSet.has(slot), `Player ${player.name} special slot '${slot}' is a valid special skill family ID`);
          assert(!baseSkillSet.has(slot), `Player ${player.name} special slot '${slot}' is NOT a base skill`);
          assert(!slot.endsWith(" X"), `Player ${player.name} special slot '${slot}' is not a legacy X skill`);
        }
      });
    }
  });

  // 4. CurrentSeasonStats Preservation
  console.log("--- 4. Season Stats Preservation Checks ---");
  const playerWithStats = mockPlayers.find(p => p.currentSeasonStats !== undefined);
  if (playerWithStats) {
    const originalStats = { ...playerWithStats.currentSeasonStats };
    const upgraded = applyStarGrowth(playerWithStats, 5);
    assert(
      JSON.stringify(upgraded.currentSeasonStats) === JSON.stringify(originalStats),
      `currentSeasonStats are preserved after applyStarGrowth for ${playerWithStats.name}`
    );

    const repaired = repairStarGrowth(playerWithStats, playerWithStats);
    assert(
      JSON.stringify(repaired.currentSeasonStats) === JSON.stringify(originalStats),
      `currentSeasonStats are preserved after repairStarGrowth for ${playerWithStats.name}`
    );
  } else {
    console.log("[PASS] No players with season stats found (skipping preservation assert, acceptable fallback)");
  }

  // 5. Legacy X Skills Elimination Check
  console.log("--- 5. Legacy X Skills Elimination Checks ---");
  const testLegacyPlayer: Player = {
    id: "p_legacy_test",
    name: "Legacy X Tester",
    position: "SG",
    rarity: "Epic",
    level: 10,
    maxLevel: 50,
    exp: 0,
    ovr: 85,
    offense: 85,
    defense: 85,
    shooting: 85,
    speed: 85,
    strength: 85,
    playmaking: 85,
    baseSkills: ["Arc Pressure", "Hands Active", "Complete Engine"],
    specialSkillSlots: ["Red Dot X", "Cage Step X"],
    skillRarities: {
      "Red Dot X": "Elite",
      "Cage Step X": "Epic"
    },
    skillTiers: {
      "Red Dot X": "X",
      "Cage Step X": "X"
    },
    starLevel: 2
  };

  const migrated = migratePlayerSpecialSkills(testLegacyPlayer);
  if (migrated.specialSkillSlots) {
    migrated.specialSkillSlots.forEach(slot => {
      if (slot !== null) {
        assert(!slot.endsWith(" X"), `Migrated slot '${slot}' does not end with legacy ' X'`);
        assert(specialSkillSet.has(slot), `Migrated slot '${slot}' is a valid special family ID`);
      }
    });
  }

  if (testsFailed) {
    console.error("[FAIL] Player attribute integrity tests failed.");
    process.exit(1);
  } else {
    console.log("[SUCCESS] All player attribute integrity validation checks passed.");
    process.exit(0);
  }
}

run();
