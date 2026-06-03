import * as fs from "fs";
import * as path from "path";
import { Player } from "../../lib/types/player";
import { simulateTick, createInitialMatchState, computeEffective } from "../../lib/utils/matchEngine";
import { resolveLineupArchetypes } from "../../lib/lineup/lineupArchetypeResolver";

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    testsFailed = true;
  } else {
    console.log(`✅ ${message}`);
  }
}

// Helper to create mock players
function createMockPlayer(
  id: string,
  name: string,
  baseSkills: [string, string, string],
  specialSkillSlots: (string | null)[] = [],
  ovr = 90,
  overrides: Partial<Player> = {}
): Player {
  let position = "SF";
  if (id.endsWith("1")) position = "PG";
  if (id.endsWith("2")) position = "SG";
  if (id.endsWith("3")) position = "SF";
  if (id.endsWith("4")) position = "PF";
  if (id.endsWith("5")) position = "C";

  return {
    id,
    name,
    position: position as any,
    rarity: "Common",
    level: 1,
    maxLevel: 50,
    exp: 0,
    ovr,
    offense: 85,
    defense: 85,
    shooting: 85,
    speed: 85,
    strength: 85,
    playmaking: 85,
    baseSkills,
    specialSkillSlots,
    starLevel: 5,
    threePt: 85,
    twoPt: 85,
    freeThrow: 85,
    finishing: 85,
    rebound: 85,
    steal: 85,
    block: 85,
    onBall: 85,
    handle: 85,
    assist: 85,
    calm: 85,
    threePtTendency: 0.35,
    driveTendency: 0.35,
    pullUpTendency: 0.25,
    foulDrawTendency: 0.45,
    skillRarities: {
      "COURT_VISION_ENGINE": "Legendary"
    },
    ...overrides
  };
}

const genericBaseSkills: [string, string, string] = ["Share Rhythm", "Connector Hub", "Position Flex"];
const genericAI = () => [
  createMockPlayer("ai1", "AI PG", genericBaseSkills),
  createMockPlayer("ai2", "AI SG", genericBaseSkills),
  createMockPlayer("ai3", "AI SF", genericBaseSkills),
  createMockPlayer("ai4", "AI PF", genericBaseSkills),
  createMockPlayer("ai5", "AI C", genericBaseSkills),
];

function runMockMatches(
  userLineup: Player[],
  aiLineup: Player[],
  numMatches = 50,
  strategy = "Motion Offense",
  userStaminaValue = 100,
  resetStaminaEveryTick = false
) {
  const events: string[] = [];
  const allUserRoster = [...userLineup];
  const aiTeamObj = {
    name: "AI Test Team",
    arena: "AI Arena",
    off: 80,
    def: 80,
    color: "#ff0000",
    roster: aiLineup,
  };

  for (let i = 0; i < numMatches; i++) {
    let state = createInitialMatchState();
    state.userOffStrategy = strategy;
    state.userDefStrategy = "Man-to-Man";
    state.aiOffStrategy = "Motion Offense";
    state.aiDefStrategy = "Man-to-Man";
    state.userPlayerIds = allUserRoster.map(p => p.id);
    state.aiPlayerIds = aiLineup.map(p => p.id);
    state.aiLineupIds = aiLineup.map(p => p.id);

    allUserRoster.forEach(p => {
      state.playerStamina[p.id] = userStaminaValue;
    });
    aiLineup.forEach(p => {
      state.playerStamina[p.id] = 100;
    });

    let ticks = 0;
    while (!state.isFinished && ticks < 100) {
      if (resetStaminaEveryTick) {
        allUserRoster.forEach(p => {
          state.playerStamina[p.id] = userStaminaValue;
        });
      }
      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
      ticks++;
    }

    state.events.forEach(e => {
      if (e.text) events.push(e.text);
    });
  }

  return events;
}

async function run() {
  console.log("=== RUNNING COURT_VISION GATING & INTEGRATION VALIDATION ===");

  // 1. Static Analysis Checks on matchEngine.ts
  const matchEnginePath = path.resolve(__dirname, "../../lib/utils/matchEngine.ts");
  const engineContent = fs.readFileSync(matchEnginePath, "utf-8");

  // Check resolveLineupArchetypes is called for both user and AI lineups around COURT_VISION blocks
  assert(engineContent.includes("resolveLineupArchetypes(userLineup)"), "resolveLineupArchetypes is evaluated for User lineup");
  assert(engineContent.includes("resolveLineupArchetypes(aiLineup)"), "resolveLineupArchetypes is evaluated for AI lineup");

  // Check scaleMultiplier logic
  const scaleMultiplierRegex = /scaleMultiplier\s*=\s*pbLevel\s*===\s*0\s*\?\s*0\.85\s*:\s*pbLevel\s*===\s*1\s*\?\s*1\.00\s*:\s*pbLevel\s*===\s*2\s*\?\s*1\.05\s*:\s*1\.10/g;
  const matchMultiplier = engineContent.match(scaleMultiplierRegex);
  assert(matchMultiplier !== null && matchMultiplier.length >= 2, "scaleMultiplier values map correctly: 0.85 (Lv 0), 1.00 (Lv 1), 1.05 (Lv 2), 1.10 (Lv 3) for both User and AI");

  // Check capLimit logic
  const capLimitRegex = /capLimit\s*=\s*pbLevel\s*===\s*0\s*\?\s*0\.015\s*:\s*0\.020/g;
  const matchCap = engineContent.match(capLimitRegex);
  assert(matchCap !== null && matchCap.length >= 2, "capLimit values map correctly: 0.015 (Lv 0), 0.020 (Lv 1+) for both User and AI");

  // 2. Lineup Archetype Gating Checks (Level 0, 1, 2, 3)
  {
    // Level 0: No Playmaking signals
    const userLineup0 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["COURT_VISION_ENGINE"]),
      createMockPlayer("u2", "User SG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u5", "User C", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
    ];
    const summary0 = resolveLineupArchetypes(userLineup0);
    const pbResult0 = summary0.allResults.find(r => r.id === "playmaking");
    assert((pbResult0?.level ?? 0) === 0, "Lineup with 0 signals yields Playmaking Level 0");

    // Level 1 (Bronze): 3 signals
    const userLineup1 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["COURT_VISION_ENGINE"]),
      createMockPlayer("u2", "User SG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]), // 3 signals
    ];
    const summary1 = resolveLineupArchetypes(userLineup1);
    const pbResult1 = summary1.allResults.find(r => r.id === "playmaking");
    assert(pbResult1?.level === 1, `Lineup with 3 signals yields Playmaking Level 1 (Bronze), got ${pbResult1?.level}`);

    // Level 2 (Silver): 5 signals
    const userLineup2 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["COURT_VISION_ENGINE"]),
      createMockPlayer("u2", "User SG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Complete Engine", "Tempo Switch", "Position Flex"]), // 3 signals
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Discipline Wall"]), // 2 signals (Total 5 signals, 2 contributors)
    ];
    const summary2 = resolveLineupArchetypes(userLineup2);
    const pbResult2 = summary2.allResults.find(r => r.id === "playmaking");
    assert(pbResult2?.level === 2, `Lineup with 5 signals and 2 contributors yields Playmaking Level 2 (Silver), got ${pbResult2?.level}`);

    // Level 3 (Gold): 7 signals, 3 contributors
    const userLineup3 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["COURT_VISION_ENGINE"]),
      createMockPlayer("u2", "User SG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u3", "User SF", ["Future Core", "Arc Pressure", "Discipline Wall"]), // 1 signal
      createMockPlayer("u4", "User PF", ["Complete Engine", "Tempo Switch", "Position Flex"]), // 3 signals
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]), // 3 signals (Total 7 signals, 3 contributors)
    ];
    const summary3 = resolveLineupArchetypes(userLineup3);
    const pbResult3 = summary3.allResults.find(r => r.id === "playmaking");
    assert(pbResult3?.level === 3, `Lineup with 7 signals and 3 contributors yields Playmaking Level 3 (Gold), got ${pbResult3?.level}`);
  }

  // 3. Match Simulation Gating Checks
  {
    // Level 0 (None): Rhythm bonus capped strictly at 1.5%
    const userLineup0 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["COURT_VISION_ENGINE"]),
      createMockPlayer("u2", "User SG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u5", "User C", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
    ];
    const events0 = runMockMatches(userLineup0, genericAI(), 150);
    const triggers0 = events0.filter(e => e.includes("Court Vision Engine creates a rhythm bonus"));
    assert(triggers0.length > 0, `COURT_VISION triggers at Level 0 (Count: ${triggers0.length})`);

    let foundInvalidLv0Bonus = false;
    let maxLv0Bonus = 0;
    triggers0.forEach(t => {
      const match = t.match(/\+(\d+\.\d+)%/);
      if (match) {
        const bonusValue = parseFloat(match[1]);
        if (bonusValue > maxLv0Bonus) maxLv0Bonus = bonusValue;
        if (bonusValue > 1.501) {
          foundInvalidLv0Bonus = true;
        }
      }
    });
    assert(!foundInvalidLv0Bonus, `Level 0 rhythm bonus never exceeds 1.5% (Max observed: ${maxLv0Bonus}%)`);

    // Level 1 (Bronze): Rhythm bonus reaches up to 2.0%
    const userLineup1 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["COURT_VISION_ENGINE"]),
      createMockPlayer("u2", "User SG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]),
    ];
    const events1 = runMockMatches(userLineup1, genericAI(), 150);
    const triggers1 = events1.filter(e => e.includes("Court Vision Engine creates a rhythm bonus"));
    assert(triggers1.length > 0, `COURT_VISION triggers at Level 1 (Count: ${triggers1.length})`);

    let maxLv1Bonus = 0;
    let foundInvalidLv1Bonus = false;
    triggers1.forEach(t => {
      const match = t.match(/\+(\d+\.\d+)%/);
      if (match) {
        const bonusValue = parseFloat(match[1]);
        if (bonusValue > maxLv1Bonus) maxLv1Bonus = bonusValue;
        if (bonusValue > 2.001) {
          foundInvalidLv1Bonus = true;
        }
      }
    });
    assert(!foundInvalidLv1Bonus, `Level 1 rhythm bonus never exceeds 2.0% (Max observed: ${maxLv1Bonus}%)`);
    assert(maxLv1Bonus > 1.5, `Level 1 rhythm bonus correctly restores baseline above 1.5% (Max observed: ${maxLv1Bonus}%)`);

    // Level 3 (Gold): Rhythm bonus reaches up to 2.0% but does not exceed 2.0%
    const userLineup3 = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["COURT_VISION_ENGINE"]),
      createMockPlayer("u2", "User SG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u3", "User SF", ["Future Core", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Complete Engine", "Tempo Switch", "Position Flex"]),
      createMockPlayer("u5", "User C", ["Tempo Surgeon", "Connector Hub", "Share Rhythm"]),
    ];
    const events3 = runMockMatches(userLineup3, genericAI(), 150);
    const triggers3 = events3.filter(e => e.includes("Court Vision Engine creates a rhythm bonus"));
    assert(triggers3.length > 0, `COURT_VISION triggers at Level 3 (Count: ${triggers3.length})`);

    let maxLv3Bonus = 0;
    let foundInvalidLv3Bonus = false;
    triggers3.forEach(t => {
      const match = t.match(/\+(\d+\.\d+)%/);
      if (match) {
        const bonusValue = parseFloat(match[1]);
        if (bonusValue > maxLv3Bonus) maxLv3Bonus = bonusValue;
        if (bonusValue > 2.001) {
          foundInvalidLv3Bonus = true;
        }
      }
    });
    assert(!foundInvalidLv3Bonus, `Level 3 rhythm bonus never exceeds 2.0% (Max observed: ${maxLv3Bonus}%)`);
    assert(maxLv3Bonus > 1.5, `Level 3 rhythm bonus stays within the 2.0% cap and remains above Level 0 when applicable. (Max observed: ${maxLv3Bonus}%)`);

    // Strategy block verification (ISO/Post ISO blocks COURT_VISION while active)
    const userLineupISO = [
      createMockPlayer("u1", "User PG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"], ["COURT_VISION_ENGINE"], 99), // Star pg (99 OVR)
      createMockPlayer("u2", "User SG", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u3", "User SF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u4", "User PF", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
      createMockPlayer("u5", "User C", ["Paint Magnet", "Arc Pressure", "Discipline Wall"]),
    ];
    // Keep stamina high so auto-switch doesn't trigger
    const eventsISO = runMockMatches(userLineupISO, genericAI(), 50, "Isolation (ISO)", 100, true);
    const triggersISO = eventsISO.filter(e => e.includes("Court Vision Engine creates a rhythm bonus"));
    assert(triggersISO.length === 0, "COURT_VISION is completely blocked under active Isolation (stamina high)");

    const eventsPostISO = runMockMatches(userLineupISO, genericAI(), 50, "Post Isolation", 100, true);
    const triggersPostISO = eventsPostISO.filter(e => e.includes("Court Vision Engine creates a rhythm bonus"));
    assert(triggersPostISO.length === 0, "COURT_VISION is completely blocked under active Post Isolation");

    // ISO Auto-Switch applies Level 0 values:
    // With stamina < 40 initially, ISO immediately switches to Motion Offense,
    // and since it is Level 0 lineup, it should apply Level 0 cap (1.5%)
    const eventsAutoSwitch = runMockMatches(userLineupISO, genericAI(), 100, "Isolation (ISO)", 35, false);
    const triggersAutoSwitch = eventsAutoSwitch.filter(e => e.includes("Court Vision Engine creates a rhythm bonus"));
    assert(triggersAutoSwitch.length > 0, `COURT_VISION triggers after ISO auto-switch to Motion (Count: ${triggersAutoSwitch.length})`);

    let foundInvalidAutoSwitchBonus = false;
    let maxAutoSwitchBonus = 0;
    triggersAutoSwitch.forEach(t => {
      const match = t.match(/\+(\d+\.\d+)%/);
      if (match) {
        const bonusValue = parseFloat(match[1]);
        if (bonusValue > maxAutoSwitchBonus) maxAutoSwitchBonus = bonusValue;
        if (bonusValue > 1.501) {
          foundInvalidAutoSwitchBonus = true;
        }
      }
    });
    assert(!foundInvalidAutoSwitchBonus, `ISO auto-switch triggers correctly apply Level 0 reduction <= 1.5% (Max observed: ${maxAutoSwitchBonus}%)`);
  }

  if (testsFailed) {
    console.error("\n❌ SOME COURT_VISION VALIDATION TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL COURT_VISION GATING VALIDATION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
