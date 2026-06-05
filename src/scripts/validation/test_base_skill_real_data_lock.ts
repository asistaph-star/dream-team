import { mockPlayers } from "../../lib/data/mockPlayers";
import { BASE_SKILL_TEXT, SPECIAL_SKILL_NAMES } from "../../lib/skills/skillCatalog";
import { assignBaseSkillsFromStats, BaseSkillName } from "../../lib/skills/assignBaseSkills";
import { applyStarGrowth } from "../../lib/utils/starGrowth";
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

function run() {
  console.log("=== RUNNING BASE SKILL REAL DATA LOCK VALIDATION ===");

  // 1. Exact 22 Base Skills Checks
  console.log("--- 1. Base Skills Catalog Checks ---");
  const baseSkillsKeys = Object.keys(BASE_SKILL_TEXT) as BaseSkillName[];
  assert(baseSkillsKeys.length === 22, `Exactly 22 base skills exist (Found: ${baseSkillsKeys.length})`);

  const expectedBaseSkills = [
    "Tempo Surgeon",
    "Paint Magnet",
    "Arc Pressure",
    "Mismatch Caller",
    "Glass Touch",
    "Foul Magnet",
    "Power Driver",
    "Rim Warden",
    "Screen Breaker",
    "Shadow Guard",
    "Hands Active",
    "Discipline Wall",
    "Paint Barrier",
    "Focus Lock",
    "Complete Engine",
    "Iron Motor",
    "Connector Hub",
    "Tempo Switch",
    "Position Flex",
    "Future Core",
    "Share Rhythm",
    "Enforcer Lift"
  ];

  expectedBaseSkills.forEach((skill) => {
    assert(baseSkillsKeys.includes(skill as BaseSkillName), `Catalog contains base skill: ${skill}`);
  });

  // Check no base skills are in SPECIAL_SKILL_NAMES
  const specialSkillSet = new Set<string>(SPECIAL_SKILL_NAMES);
  expectedBaseSkills.forEach((skill) => {
    assert(!specialSkillSet.has(skill), `Base skill '${skill}' does not appear in SPECIAL_SKILL_NAMES`);
  });

  // 2. Saved Data Integrity Checks
  console.log("--- 2. Saved Roster Base Skill Integrity Checks ---");
  mockPlayers.forEach((player) => {
    if (player.baseSkills) {
      player.baseSkills.forEach((skill) => {
        assert(baseSkillsKeys.includes(skill as BaseSkillName), `Player ${player.name} base skill '${skill}' is valid`);
        assert(!specialSkillSet.has(skill), `Player ${player.name} base skill '${skill}' is not a special family ID`);
        assert(!skill.endsWith(" X"), `Player ${player.name} base skill '${skill}' does not contain legacy X suffix`);
      });
    }
  });

  // 3. Assignment Determinism & Threshold Checks
  console.log("--- 3. Assignment Determinism and Threshold Checks ---");
  const testPlayer: Player = {
    id: "p_test",
    name: "Base Test Player",
    position: "PG",
    rarity: "Common",
    level: 1,
    maxLevel: 20,
    exp: 0,
    ovr: 65,
    offense: 70,
    defense: 65,
    shooting: 70,
    speed: 75,
    strength: 65,
    playmaking: 70,
    threePt: 70,
    twoPt: 70,
    freeThrow: 70,
    finishing: 70,
    rebound: 65,
    steal: 65,
    block: 65,
    onBall: 65,
    calm: 70,
    stamina: 100
  };

  // 3a. Determinism
  const assignment1 = assignBaseSkillsFromStats(testPlayer);
  const assignment2 = assignBaseSkillsFromStats(testPlayer);
  assert(JSON.stringify(assignment1) === JSON.stringify(assignment2), "Base skill assignment is 100% deterministic for identical inputs");

  // 3b. Fallback Assignment Works (No currentSeasonStats)
  assert(assignment1.length === 3, "Fallback assignment correctly assigns exactly 3 skills when currentSeasonStats is missing");

  // 3c. Threshold Changes
  // Setup player with currentSeasonStats to check that real stats drive assignment
  const statsPlayerArc: Player = {
    ...testPlayer,
    currentSeasonStats: {
      season: "2025-26",
      threeAttemptedPerGame: 8.0,
      threePct: 42.0, // Should trigger "Arc Pressure"
      gamesPlayed: 50
    }
  };
  const statsAssignmentArc = assignBaseSkillsFromStats(statsPlayerArc);
  assert(statsAssignmentArc.includes("Arc Pressure"), "Arc Pressure is assigned when 3PA >= 5.0 and 3P% >= 36.0");

  const statsPlayerTempo: Player = {
    ...testPlayer,
    apg: 7.5,
    topg: 2.0,
    currentSeasonStats: {
      season: "2025-26",
      threeAttemptedPerGame: 2.0, // Should NOT trigger "Arc Pressure"
      assistsPerGame: 7.5, // Should trigger "Tempo Surgeon"
      gamesPlayed: 50
    }
  };
  const statsAssignmentTempo = assignBaseSkillsFromStats(statsPlayerTempo);
  assert(statsAssignmentTempo.includes("Tempo Surgeon"), "Tempo Surgeon is assigned when apg >= 5.5");

  // 4. Star-Up Safety Checks
  console.log("--- 4. Star-Up Safety Checks ---");
  const upgradedPlayer = applyStarGrowth(testPlayer, 15);
  // Verify that assigning skills from upgraded stats (which are higher) WOULD yield different skills
  // but that original baseline skills are preserved on load and upgrades do not mutate baseSkills list
  const upgradedStatsAssignment = assignBaseSkillsFromStats(upgradedPlayer);
  
  // Create simulated save card loaded into roster
  const savedPlayer: Player = {
    ...testPlayer,
    starLevel: 15,
    baseSkills: assignment1 // Baseline skills assigned on draft/sign
  };

  // Upgrade shouldn't change the player's stored baseSkills
  const postUpgradePlayer = applyStarGrowth(savedPlayer, 20);
  assert(
    JSON.stringify(postUpgradePlayer.baseSkills) === JSON.stringify(savedPlayer.baseSkills),
    "Star-up upgrades do not reassign or modify previously stored baseSkills"
  );

  if (testsFailed) {
    console.error("[FAIL] Base skill validation checks failed.");
    process.exit(1);
  } else {
    console.log("[SUCCESS] All 22 base skill and real-data assignment lock validation checks passed successfully.");
    process.exit(0);
  }
}

run();
