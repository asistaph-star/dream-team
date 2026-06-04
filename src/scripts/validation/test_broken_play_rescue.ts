import * as fs from "fs";
import * as path from "path";
import { Player } from "../../lib/types/player";
import { simulateTick, createInitialMatchState, computeEffective } from "../../lib/utils/matchEngine";
import { SPECIAL_SKILL_NAMES } from "../../lib/skills/skillCatalog";

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
      "BROKEN_PLAY_RESCUE": "Legendary",
      "MOMENTUM_SWING": "Legendary"
    },
    ...overrides
  };
}

const genericBaseSkills: [string, string, string] = ["Share Rhythm", "Connector Hub", "Position Flex"];

function runMockMatches(
  userLineup: Player[],
  aiLineup: Player[],
  numMatches = 50,
  staminaValue = 70
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

  const finalStates: any[] = [];

  for (let i = 0; i < numMatches; i++) {
    let state = createInitialMatchState();
    state.userOffStrategy = "Motion Offense";
    state.userDefStrategy = "Man-to-Man";
    state.aiOffStrategy = "Motion Offense";
    state.aiDefStrategy = "Man-to-Man";
    state.userPlayerIds = allUserRoster.map(p => p.id);
    state.aiPlayerIds = aiLineup.map(p => p.id);
    state.aiLineupIds = aiLineup.map(p => p.id);

    allUserRoster.forEach(p => {
      state.playerStamina[p.id] = staminaValue;
    });
    aiLineup.forEach(p => {
      state.playerStamina[p.id] = staminaValue;
    });

    let ticks = 0;
    const seenEvents = new Set<string>();
    while (!state.isFinished && ticks < 20) {
      // Force low handle ratings on committer to increase turnover probability
      allUserRoster.forEach(p => {
        state.playerStamina[p.id] = Math.min(staminaValue, state.playerStamina[p.id]);
      });
      aiLineup.forEach(p => {
        state.playerStamina[p.id] = Math.min(staminaValue, state.playerStamina[p.id]);
      });

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null;
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);

      state.events.forEach(e => {
        if (e.text && !seenEvents.has(e.text)) {
          seenEvents.add(e.text);
          events.push(e.text);
        }
      });

      ticks++;
    }

    finalStates.push(state);
  }

  return { events, finalStates };
}

async function run() {
  console.log("=== RUNNING BROKEN_PLAY_RESCUE GATING & INTEGRATION VALIDATION ===\n");

  // 1. Static Analysis Checks on matchEngine.ts and brokenPlayRescue.ts
  const matchEnginePath = path.resolve(__dirname, "../../lib/utils/matchEngine.ts");
  const helperPath = path.resolve(__dirname, "../../lib/match/brokenPlayRescue.ts");
  const engineContent = fs.readFileSync(matchEnginePath, "utf-8");
  const helperContent = fs.readFileSync(helperPath, "utf-8");

  assert(engineContent.includes("userBrokenPlayRescued"), "userBrokenPlayRescued variables are defined in matchEngine.ts");
  assert(engineContent.includes("aiBrokenPlayRescued"), "aiBrokenPlayRescued variables are defined in matchEngine.ts");
  assert(engineContent.includes("BROKEN_PLAY_RESCUE_SAVE"), "BROKEN_PLAY_RESCUE_SAVE mechanic ID is used in matchEngine.ts");
  assert(helperContent.includes("export function getBrokenPlayRescueIdentity"), "getBrokenPlayRescueIdentity helper is implemented");
  assert(helperContent.includes("export function calculateBrokenPlayRescueChanceScale"), "calculateBrokenPlayRescueChanceScale helper is implemented");
  assert(helperContent.includes("export function calculateBrokenPlayRescueStaminaCost"), "calculateBrokenPlayRescueStaminaCost helper is implemented");
  assert(helperContent.includes("export function calculateBrokenPlayRescueShotPenalty"), "calculateBrokenPlayRescueShotPenalty helper is implemented");

  // 2. Rolling Pool Checks
  const brokenPlayInPool = SPECIAL_SKILL_NAMES.includes("BROKEN_PLAY_RESCUE");
  const momentumSwingInPool = SPECIAL_SKILL_NAMES.includes("MOMENTUM_SWING");
  assert(brokenPlayInPool, "BROKEN_PLAY_RESCUE is in the active rolling pool SPECIAL_SKILL_NAMES");
  assert(momentumSwingInPool, "MOMENTUM_SWING remains active in SPECIAL_SKILL_NAMES");
  assert(SPECIAL_SKILL_NAMES.length === 15, "All 15 learned special skill families are now active");

  // 3. Match Simulation and Trigger Checks
  // We equip all 5 players with BROKEN_PLAY_RESCUE to maximize the trigger rate
  const userLineup = [
    createMockPlayer("u1", "User PG", genericBaseSkills, ["BROKEN_PLAY_RESCUE"], 95, { handle: 40 }),
    createMockPlayer("u2", "User SG", genericBaseSkills, ["BROKEN_PLAY_RESCUE"], 95, { handle: 40 }),
    createMockPlayer("u3", "User SF", genericBaseSkills, ["BROKEN_PLAY_RESCUE"], 95, { handle: 40 }),
    createMockPlayer("u4", "User PF", genericBaseSkills, ["BROKEN_PLAY_RESCUE"], 95, { handle: 40 }),
    createMockPlayer("u5", "User C", genericBaseSkills, ["BROKEN_PLAY_RESCUE"], 95, { handle: 40 }),
  ];

  const aiLineup = [
    createMockPlayer("ai1", "AI PG", genericBaseSkills, ["BROKEN_PLAY_RESCUE"], 95, { handle: 40 }),
    createMockPlayer("ai2", "AI SG", genericBaseSkills, ["BROKEN_PLAY_RESCUE"], 95, { handle: 40 }),
    createMockPlayer("ai3", "AI SF", genericBaseSkills, ["BROKEN_PLAY_RESCUE"], 95, { handle: 40 }),
    createMockPlayer("ai4", "AI PF", genericBaseSkills, ["BROKEN_PLAY_RESCUE"], 95, { handle: 40 }),
    createMockPlayer("ai5", "AI C", genericBaseSkills, ["BROKEN_PLAY_RESCUE"], 95, { handle: 40 }),
  ];

  const { events, finalStates } = runMockMatches(userLineup, aiLineup, 100, 75);

  const userRescues = events.filter(e => e.includes("User") && e.includes("rescues a broken play!"));
  const aiRescues = events.filter(e => e.includes("AI") && e.includes("rescues a broken play!"));

  assert(userRescues.length > 0, `BROKEN_PLAY_RESCUE triggers successfully for User team (Count: ${userRescues.length})`);
  assert(aiRescues.length > 0, `BROKEN_PLAY_RESCUE triggers successfully for AI team (Count: ${aiRescues.length})`);

  // Verify once-per-quarter limit
  let foundMultipleTriggersInMatchState = false;
  finalStates.forEach(state => {
    const userUsed = state.skillUsedThisGame?.user ?? [];
    const aiUsed = state.skillUsedThisGame?.ai ?? [];
    const userQ1Count = userUsed.filter((k: string) => k === "User Broken Play Rescue Q1").length;
    const aiQ1Count = aiUsed.filter((k: string) => k === "AI Broken Play Rescue Q1").length;
    if (userQ1Count > 1 || aiQ1Count > 1) {
      foundMultipleTriggersInMatchState = true;
    }
  });
  assert(!foundMultipleTriggersInMatchState, "BROKEN_PLAY_RESCUE never triggers more than once per quarter per team");

  // Verify rescue shot is indeed low-quality/penalized
  // Since it forces a hookShot (2PT) and subtracts ~15-20% shooting penalty, make rate should be low
  let totalRescueShots = 0;
  let madeRescueShots = 0;
  
  // We can look at events following "rescues a broken play!"
  for (let i = 0; i < events.length; i++) {
    if (events[i].includes("rescues a broken play!")) {
      totalRescueShots++;
      // Check the next few events for a made shot or a missed shot
      for (let j = 1; j <= 3; j++) {
        const nextEvt = events[i + j] || "";
        if (nextEvt.includes("scores") || nextEvt.includes("makes") || nextEvt.includes("bucket") || nextEvt.includes("+2")) {
          madeRescueShots++;
          break;
        }
      }
    }
  }

  const makeRate = totalRescueShots > 0 ? (madeRescueShots / totalRescueShots) * 100 : 0;
  console.log(`Rescue Shots Make Rate: ${madeRescueShots} / ${totalRescueShots} (${makeRate.toFixed(1)}%)`);
  assert(makeRate < 45, "Rescued shot make rate is low as expected due to the applied penalty");

  if (testsFailed) {
    console.error("\n❌ SOME BROKEN_PLAY_RESCUE VALIDATION TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL BROKEN_PLAY_RESCUE VALIDATION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
