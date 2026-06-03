import { Player } from "../../lib/types/player";
import { resolveLineupArchetypes } from "../../lib/lineup/lineupArchetypeResolver";
import { ArchetypeResult } from "../../lib/lineup/types";

// Helper to create a mock player
function createMockPlayer(
  id: string,
  name: string,
  ovr: number,
  baseSkills: [string, string, string],
  specialSkillSlots: (string | null)[] = [],
  starLevel = 0
): Player {
  return {
    id,
    name,
    position: "PG",
    rarity: "Common",
    level: 1,
    maxLevel: 50,
    exp: 0,
    ovr,
    offense: 80,
    defense: 80,
    shooting: 80,
    speed: 80,
    strength: 80,
    playmaking: 80,
    baseSkills,
    specialSkillSlots,
    starLevel,
  };
}

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    testsFailed = true;
  } else {
    console.log(`✅ ${message}`);
  }
}

console.log("=== RUNNING LINEUP ARCHETYPE RESOLVER VALIDATION TESTS ===");

// 1. Test case: 0 signals = no archetype
{
  const lineup: Player[] = [
    createMockPlayer("p1", "Player 1", 90, ["Tempo Surgeon", "Rim Warden", "Connector Hub"]), // Playmaking (Red, Blue, Green)
  ];
  // Let's check an archetype that has none of these candidate skills, e.g. Deep Strike (no Arc Pressure, no Mismatch Caller, etc. wait, playmaking skills overlap a bit. Let's create players with absolutely zero matching skills for Stamina Drain)
  const lineupNoStamina: Player[] = [
    createMockPlayer("p1", "Player 1", 90, ["Arc Pressure", "Rim Warden", "Connector Hub"]),
  ];
  // Candidate skills for Stamina Drain: Paint Magnet, Power Driver, Screen Breaker, Shadow Guard, Hands Active, Focus Lock, Iron Motor, Enforcer Lift
  // None of the above match Stamina Drain.
  const summary = resolveLineupArchetypes(lineupNoStamina);
  const staminaDrain = summary.allResults.find((r) => r.id === "stamina-drain");
  assert(staminaDrain !== undefined, "Stamina Drain result should exist");
  if (staminaDrain) {
    assert(staminaDrain.signalCount === 0, "Signal count should be 0");
    assert(staminaDrain.level === 0, "Level should be 0 (None)");
    assert(staminaDrain.levelLabel === "None", "Level label should be 'None'");
  }
}

// 2. Test case: 3 signals = Lv.1 (Bronze)
{
  // Stamina Drain Candidate Skills: Paint Magnet, Power Driver, Screen Breaker, Shadow Guard, Hands Active, Discipline Wall, Focus Lock, Iron Motor, Enforcer Lift
  const lineup: Player[] = [
    createMockPlayer("p1", "Player 1", 90, ["Paint Magnet", "Rim Warden", "Connector Hub"]), // 1 matching: Paint Magnet
    createMockPlayer("p2", "Player 2", 90, ["Arc Pressure", "Screen Breaker", "Connector Hub"]), // 1 matching: Screen Breaker
    createMockPlayer("p3", "Player 3", 90, ["Arc Pressure", "Rim Warden", "Iron Motor"]), // 1 matching: Iron Motor
  ];
  const summary = resolveLineupArchetypes(lineup);
  const result = summary.allResults.find((r) => r.id === "stamina-drain");
  assert(result !== undefined, "Stamina Drain result exists");
  if (result) {
    assert(result.signalCount === 3, `Signal count should be 3, got ${result.signalCount}`);
    assert(result.level === 1, `Level should be 1 (Bronze), got ${result.level}`);
    assert(result.levelLabel === "Bronze", "Level label should be 'Bronze'");
  }
}

// 3. Test case: 5 signals = Lv.2 (Silver)
{
  const lineup: Player[] = [
    createMockPlayer("p1", "Player 1", 90, ["Paint Magnet", "Screen Breaker", "Iron Motor"]), // 3 matching (OVR 90, green is active)
    createMockPlayer("p2", "Player 2", 90, ["Power Driver", "Shadow Guard", "Connector Hub"]), // 2 matching
  ];
  const summary = resolveLineupArchetypes(lineup);
  const result = summary.allResults.find((r) => r.id === "stamina-drain");
  assert(result !== undefined, "Stamina Drain result exists");
  if (result) {
    assert(result.signalCount === 5, `Signal count should be 5, got ${result.signalCount}`);
    assert(result.level === 2, `Level should be 2 (Silver), got ${result.level}`);
    assert(result.levelLabel === "Silver", "Level label should be 'Silver'");
  }
}

// 4. Test case: 7 signals but only 2 contributing players = not Lv.3 (Silver instead of Gold)
{
  // Let's create mock players with 4 base skills in the `baseSkills` array!
  const playerWith4Skills = createMockPlayer("p1", "Player 1", 90, ["Paint Magnet", "Power Driver", "Iron Motor"] as any);
  playerWith4Skills.baseSkills!.push("Screen Breaker"); // now has 4 matching skills
  const playerWith3Skills = createMockPlayer("p2", "Player 2", 90, ["Shadow Guard", "Hands Active", "Discipline Wall"]); // 3 matching
  
  // Total signals = 4 + 3 = 7. Contributors = 2 (Player 1, Player 2).
  const lineup = [playerWith4Skills, playerWith3Skills];
  const summary = resolveLineupArchetypes(lineup);
  const result = summary.allResults.find((r) => r.id === "stamina-drain");
  assert(result !== undefined, "Stamina Drain result exists");
  if (result) {
    assert(result.signalCount === 7, `Signal count is 7, got ${result.signalCount}`);
    assert(result.level === 2, `Level should be 2 (Silver) due to <3 contributors, got ${result.level}`);
    assert(result.levelLabel === "Silver", "Level label should be 'Silver'");
  }
}

// 5. Test case: 7 signals and 3 contributing players = Lv.3 (Gold)
{
  const lineup: Player[] = [
    createMockPlayer("p1", "Player 1", 90, ["Paint Magnet", "Screen Breaker", "Iron Motor"]), // 3 matching
    createMockPlayer("p2", "Player 2", 90, ["Power Driver", "Shadow Guard", "Enforcer Lift"]), // 3 matching
    createMockPlayer("p3", "Player 3", 90, ["Hands Active", "Rim Warden", "Connector Hub"]), // 1 matching (Hands Active)
  ];
  const summary = resolveLineupArchetypes(lineup);
  const result = summary.allResults.find((r) => r.id === "stamina-drain");
  assert(result !== undefined, "Stamina Drain result exists");
  if (result) {
    assert(result.signalCount === 7, `Signal count is 7, got ${result.signalCount}`);
    assert(result.level === 3, `Level should be 3 (Gold) since contributors = 3, got ${result.level}`);
    assert(result.levelLabel === "Gold", "Level label should be 'Gold'");
  }
}

// 6. Test case: OVR < 85 Green skill is locked and not counted
{
  const lineup: Player[] = [
    createMockPlayer("p1", "Player 1", 80, ["Paint Magnet", "Screen Breaker", "Iron Motor"]), // OVR < 85: Iron Motor (Green) is locked
  ];
  const summary = resolveLineupArchetypes(lineup);
  const result = summary.allResults.find((r) => r.id === "stamina-drain");
  assert(result !== undefined, "Stamina Drain result exists");
  if (result) {
    assert(result.signalCount === 2, `Signal count should be 2 (Iron Motor excluded), got ${result.signalCount}`);
    const p1Contrib = result.playerContributions.find((c) => c.playerId === "p1");
    assert(p1Contrib !== undefined, "Player 1 contribution should be tracked");
    if (p1Contrib) {
      assert(p1Contrib.contributedSkills.length === 2, "Should contribute only 2 skills");
      assert(!p1Contrib.contributedSkills.includes("Iron Motor"), "Should not include Iron Motor in active contribution");
      assert(p1Contrib.lockedGreenSkill === "Iron Motor", `Locked Green skill should be 'Iron Motor', got '${p1Contrib.lockedGreenSkill}'`);
    }
  }
}

// 7. Test case: duplicate same-skill signals across different players count
{
  const lineup: Player[] = [
    createMockPlayer("p1", "Player 1", 90, ["Paint Magnet", "Rim Warden", "Connector Hub"]), // 1 Paint Magnet
    createMockPlayer("p2", "Player 2", 90, ["Paint Magnet", "Rim Warden", "Connector Hub"]), // 1 Paint Magnet
    createMockPlayer("p3", "Player 3", 90, ["Paint Magnet", "Rim Warden", "Connector Hub"]), // 1 Paint Magnet
  ];
  const summary = resolveLineupArchetypes(lineup);
  const result = summary.allResults.find((r) => r.id === "stamina-drain");
  assert(result !== undefined, "Stamina Drain result exists");
  if (result) {
    assert(result.signalCount === 3, `Signal count should be 3 (duplicates count), got ${result.signalCount}`);
    assert(result.level === 1, "Level should be 1 (Bronze)");
  }
}

// 8. Test case: one player can contribute multiple signals
{
  const player = createMockPlayer("p1", "Player 1", 90, ["Paint Magnet", "Screen Breaker", "Iron Motor"]); // 3 matching signals
  const summary = resolveLineupArchetypes([player]);
  const result = summary.allResults.find((r) => r.id === "stamina-drain");
  if (result) {
    assert(result.signalCount === 3, `Signal count should be 3, got ${result.signalCount}`);
    assert(result.level === 1, "Level should be 1 (Bronze)");
  }
}

// 9. Test case: bench/reserve players do not count (starters sliced to 5)
{
  const starters = [
    createMockPlayer("p1", "Star 1", 90, ["Paint Magnet", "Screen Breaker", "Iron Motor"]), // 3 matching
    createMockPlayer("p2", "Star 2", 90, ["Power Driver", "Shadow Guard", "Enforcer Lift"]), // 3 matching
    createMockPlayer("p3", "Star 3", 90, ["Hands Active", "Rim Warden", "Connector Hub"]), // 1 matching
    createMockPlayer("p4", "Star 4", 90, ["Arc Pressure", "Rim Warden", "Connector Hub"]), // 0 matching
    createMockPlayer("p5", "Star 5", 90, ["Arc Pressure", "Rim Warden", "Connector Hub"]), // 0 matching
  ];
  const bench = [
    createMockPlayer("p6", "Bench 1", 90, ["Paint Magnet", "Screen Breaker", "Iron Motor"]), // 3 matching (on bench, should be sliced out)
  ];
  const lineupWithBench = [...starters, ...bench];
  const summary = resolveLineupArchetypes(lineupWithBench);
  const result = summary.allResults.find((r) => r.id === "stamina-drain");
  if (result) {
    assert(result.signalCount === 7, `Signal count should be 7 (ignoring bench player), got ${result.signalCount}`);
    assert(result.level === 3, "Level should be 3 (Gold)");
  }
}

// 10. Test case: matching Learned Special Skill enhancers are detected
{
  const player = createMockPlayer("p1", "Player 1", 90, ["Paint Magnet", "Screen Breaker", "Iron Motor"], ["Corner Trap X", "Five-Man Squeeze X"], 5);
  // Corner Trap X maps to DEFENSIVE_ANCHOR, Five-Man Squeeze X maps to DEFENSIVE_ANCHOR in resolveSpecialSkillFamily.
  // Wait, let's verify map:
  // "Corner Trap X": "DEFENSIVE_ANCHOR"
  // "Five-Man Squeeze X": "DEFENSIVE_ANCHOR"
  // Both map to DEFENSIVE_ANCHOR family, which is an enhancer for Stamina Drain.
  const summary = resolveLineupArchetypes([player]);
  const result = summary.allResults.find((r) => r.id === "stamina-drain");
  if (result) {
    assert(result.matchingEnhancers.includes("DEFENSIVE_ANCHOR"), "Should detect DEFENSIVE_ANCHOR enhancer");
    assert(result.matchingEnhancers.length === 1, `Enhancers count should be 1 (deduplicated), got ${result.matchingEnhancers.length}`);
  }
}

if (testsFailed) {
  console.error("❌ SOME TESTS FAILED!");
  process.exit(1);
} else {
  console.log("🎉 ALL VALIDATION TESTS PASSED SUCCESSFULLY!");
  process.exit(0);
}
