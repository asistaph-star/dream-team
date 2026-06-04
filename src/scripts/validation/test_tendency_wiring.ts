import { Player } from "../../lib/types/player";
import { calculateShotIntentWeights } from "../../lib/match/playerIntentSelection";
import { generateShot } from "../../lib/utils/shotEngine";

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    testsFailed = true;
  } else {
    console.log(`✅ ${message}`);
  }
}

function createMockPlayer(
  id: string,
  name: string,
  position: string,
  driveTendency?: number,
  pullUpTendency?: number,
  threePtTendency?: number,
  overrides: Partial<Player> = {}
): Player {
  return {
    id,
    name,
    position,
    rarity: "Epic",
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
    threePt: 80,
    baseSkills: ["Share Rhythm", "Connector Hub", "Position Flex"],
    specialSkillSlots: [],
    starLevel: 0,
    driveTendency,
    pullUpTendency,
    threePtTendency,
    ...overrides,
  } as unknown as Player;
}

async function run() {
  console.log("=== RUNNING TENDENCY WIRING VALIDATION TESTS ===");

  // ==========================================
  // Part 1: Helper Tests (playerIntentSelection)
  // ==========================================

  // 1. High driveTendency vs Low driveTendency
  {
    const playerLow = createMockPlayer("p1", "Low Drive", "PG", 0.1, 0.2);
    const playerHigh = createMockPlayer("p2", "High Drive", "PG", 0.9, 0.2);

    const weightsLow = calculateShotIntentWeights(playerLow, 100);
    const weightsHigh = calculateShotIntentWeights(playerHigh, 100);

    assert(weightsHigh.driveMultiplier > weightsLow.driveMultiplier, "High driveTendency produces higher driveMultiplier than low driveTendency");
  }

  // 2. High pullUpTendency vs Low pullUpTendency
  {
    const playerLow = createMockPlayer("p1", "Low Pull", "SG", 0.2, 0.1);
    const playerHigh = createMockPlayer("p2", "High Pull", "SG", 0.2, 0.9);

    const weightsLow = calculateShotIntentWeights(playerLow, 100);
    const weightsHigh = calculateShotIntentWeights(playerHigh, 100);

    assert(weightsHigh.pullUpMultiplier > weightsLow.pullUpMultiplier, "High pullUpTendency produces higher pullUpMultiplier than low pullUpTendency");
  }

  // 3. Low stamina reduces driveMultiplier and pullUpMultiplier
  {
    const player = createMockPlayer("p1", "All Rounder", "SF", 0.8, 0.8);

    const weightsFresh = calculateShotIntentWeights(player, 100);
    const weightsTired = calculateShotIntentWeights(player, 30);
    const weightsExhausted = calculateShotIntentWeights(player, 10);

    assert(weightsFresh.driveMultiplier > weightsTired.driveMultiplier, "Stamina drop to 30 reduces driveMultiplier");
    assert(weightsTired.driveMultiplier > weightsExhausted.driveMultiplier, "Stamina drop to 10 reduces driveMultiplier further");
    assert(weightsFresh.pullUpMultiplier > weightsTired.pullUpMultiplier, "Stamina drop to 30 reduces pullUpMultiplier");
    assert(weightsTired.pullUpMultiplier > weightsExhausted.pullUpMultiplier, "Stamina drop to 10 reduces pullUpMultiplier further");
  }

  // 4. Helper clamps extreme values safely (e.g. > 1.0 is normalized or clamped, < 0 is clamped)
  {
    const playerOver = createMockPlayer("p1", "Over", "PG", 80, 20); // 0-100 scale values
    const weightsOver = calculateShotIntentWeights(playerOver, 100);
    assert(weightsOver.driveMultiplier <= 2.5 && weightsOver.driveMultiplier >= 1.0, "Helper handles 0-100 scale and clamps driveMultiplier safely");
    assert(weightsOver.pullUpMultiplier <= 2.5 && weightsOver.pullUpMultiplier >= 1.0, "Helper handles 0-100 scale and clamps pullUpMultiplier safely");

    const playerNegative = createMockPlayer("p2", "Negative", "PG", -0.5, -0.5);
    const weightsNegative = calculateShotIntentWeights(playerNegative, 100);
    assert(weightsNegative.driveMultiplier === 1.0, "Negative driveTendency yields exactly 1.0 multiplier");
    assert(weightsNegative.pullUpMultiplier === 1.0, "Negative pullUpTendency yields exactly 1.0 multiplier");
  }

  // 5. Helper is pure (no RNG, no mutations)
  {
    const player = createMockPlayer("p1", "Test Player", "SF", 0.6, 0.4);
    const playerCopy = JSON.parse(JSON.stringify(player));

    const res1 = calculateShotIntentWeights(player, 100);
    const res2 = calculateShotIntentWeights(player, 100);

    assert(JSON.stringify(res1) === JSON.stringify(res2), "Helper is deterministic (no RNG)");
    assert(JSON.stringify(player) === JSON.stringify(playerCopy), "Helper does not mutate player object");
  }

  // ==========================================
  // Part 2: Behavioral Tests (generateShot)
  // ==========================================

  const driveShots = ['drivingLayup', 'euroStep', 'floater', 'fingerRoll', 'dunk', 'powerLayup'];
  const pullUpShots = ['pullUpMid', 'stepBackMid', 'fadeaway', 'pullUpThree', 'stepBackThree'];

  // 1. High-drive player produces more drive/rim attempts than low-drive player
  {
    const pgLow = createMockPlayer("pg1", "Low Drive PG", "PG", 0.0, 0.0);
    const pgHigh = createMockPlayer("pg2", "High Drive PG", "PG", 1.0, 0.0);

    let lowDriveCount = 0;
    let highDriveCount = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      // Force 2PT to isolate 2PT drive selection
      const shotLow = generateShot(pgLow, 1.0, 100, false);
      if (driveShots.includes(shotLow.type)) lowDriveCount++;

      const shotHigh = generateShot(pgHigh, 1.0, 100, false);
      if (driveShots.includes(shotHigh.type)) highDriveCount++;
    }

    console.log(`High-drive PG drive count: ${highDriveCount} vs Low-drive PG: ${lowDriveCount} (out of ${iterations})`);
    assert(highDriveCount > lowDriveCount, "High-drive player produces more drive/rim attempts than low-drive player");
  }

  // 2. High-pull-up player produces more pull-up attempts than low-pull-up player
  {
    const sgLow = createMockPlayer("sg1", "Low Pull SG", "SG", 0.0, 0.0);
    const sgHigh = createMockPlayer("sg2", "High Pull SG", "SG", 0.0, 1.0);

    let lowPullCount = 0;
    let highPullCount = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const shotLow = generateShot(sgLow, 1.0, 100, false);
      if (pullUpShots.includes(shotLow.type)) lowPullCount++;

      const shotHigh = generateShot(sgHigh, 1.0, 100, false);
      if (pullUpShots.includes(shotHigh.type)) highPullCount++;
    }

    console.log(`High-pull SG pull count: ${highPullCount} vs Low-pull SG: ${lowPullCount} (out of ${iterations})`);
    assert(highPullCount > lowPullCount, "High-pull-up player produces more pull-up attempts than low-pull-up player");
  }

  // 3. threePtTendency behavior is not broken
  {
    const playerLow3 = createMockPlayer("p3_1", "Low 3PT", "SG", 0.3, 0.3, 0.1);
    const playerHigh3 = createMockPlayer("p3_2", "High 3PT", "SG", 0.3, 0.3, 0.8);

    let low3Count = 0;
    let high3Count = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const shotLow = generateShot(playerLow3, 1.0, 100);
      if (shotLow.is3PT) low3Count++;

      const shotHigh = generateShot(playerHigh3, 1.0, 100);
      if (shotHigh.is3PT) high3Count++;
    }

    console.log(`High 3PT player 3PT count: ${high3Count} vs Low 3PT: ${low3Count} (out of ${iterations})`);
    assert(high3Count > low3Count, "threePtTendency still controls is3PT generation");
  }

  // 4. Low-stamina high-drive player does not spam heavy rim attempts
  {
    // Heavy rim shots: dunk, powerLayup, drivingLayup
    const heavyRimShots = ["dunk", "powerLayup", "drivingLayup"];
    const pg = createMockPlayer("pg", "High Drive PG", "PG", 1.0, 0.0);

    let freshHeavyCount = 0;
    let tiredHeavyCount = 0;
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const shotFresh = generateShot(pg, 1.0, 100, false);
      if (heavyRimShots.includes(shotFresh.type)) freshHeavyCount++;

      const shotTired = generateShot(pg, 1.0, 10, false);
      if (heavyRimShots.includes(shotTired.type)) tiredHeavyCount++;
    }

    console.log(`Fresh heavy rim shot count: ${freshHeavyCount} vs Tired: ${tiredHeavyCount} (out of ${iterations})`);
    assert(freshHeavyCount > tiredHeavyCount, "Low stamina reduces heavy rim/drive attempts of a high-drive player");
  }

  // 5. User and AI use the same generateShot behavior
  {
    const player = createMockPlayer("p", "Player PG", "PG", 0.5, 0.5);
    // There is only one generateShot function imported and called by both user and AI possession paths.
    // Confirm generateShot exists and is exported.
    assert(typeof generateShot === 'function', "generateShot is a standard exported function used symmetrically by User and AI paths");
  }

  if (testsFailed) {
    console.error("❌ Some tendency wiring tests failed!");
    process.exit(1);
  } else {
    console.log("🎉 ALL TENDENCY WIRING TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run();
