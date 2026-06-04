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
      "MOMENTUM_SWING": "Legendary"
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
    while (!state.isFinished && ticks < 10) {
      // Force lastPlayCategory to "steal" to trigger momentum swing eligibility
      state.lastPlayCategory = "steal";
      
      // Ensure stamina remains at staminaValue to observe recovery
      allUserRoster.forEach(p => {
        if (state.playerStamina[p.id] > staminaValue) {
          state.playerStamina[p.id] = staminaValue;
        }
      });
      aiLineup.forEach(p => {
        if (state.playerStamina[p.id] > staminaValue) {
          state.playerStamina[p.id] = staminaValue;
        }
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
  console.log("=== RUNNING MOMENTUM_SWING GATING & INTEGRATION VALIDATION ===\n");

  // 1. Static Analysis Checks on matchEngine.ts and momentumSwing.ts
  const matchEnginePath = path.resolve(__dirname, "../../lib/utils/matchEngine.ts");
  const momentumSwingPath = path.resolve(__dirname, "../../lib/match/momentumSwing.ts");
  const engineContent = fs.readFileSync(matchEnginePath, "utf-8");
  const helperContent = fs.readFileSync(momentumSwingPath, "utf-8");

  assert(engineContent.includes("applyMomentumSwing(userLineup, true)"), "applyMomentumSwing is called for User lineup");
  assert(engineContent.includes("applyMomentumSwing(aiLineup, false)"), "applyMomentumSwing is called for AI lineup");
  assert(engineContent.includes("momentumSwingBump === 'user'"), "momentumSwingBump check for user is implemented in STEP 11");
  assert(engineContent.includes("momentumSwingBump === 'ai'"), "momentumSwingBump check for ai is implemented in STEP 11");
  assert(helperContent.includes("export function getMomentumSwingIdentity"), "getMomentumSwingIdentity is implemented");
  assert(helperContent.includes("export function calculateMomentumSwingRecovery"), "calculateMomentumSwingRecovery is implemented");
  assert(helperContent.includes("export function shouldMomentumSwingTrigger"), "shouldMomentumSwingTrigger is implemented");

  // 2. Rolling Pool Checks
  const momentumSwingInPool = SPECIAL_SKILL_NAMES.includes("MOMENTUM_SWING");
  assert(momentumSwingInPool, "MOMENTUM_SWING is in the active rolling pool SPECIAL_SKILL_NAMES");

  // 3. Match Simulation Gating & Limit Checks
  const userLineup = [
    createMockPlayer("u1", "User PG", genericBaseSkills, ["MOMENTUM_SWING"]),
    createMockPlayer("u2", "User SG", genericBaseSkills),
    createMockPlayer("u3", "User SF", genericBaseSkills),
    createMockPlayer("u4", "User PF", genericBaseSkills),
    createMockPlayer("u5", "User C", genericBaseSkills),
  ];

  const aiLineup = [
    createMockPlayer("ai1", "AI PG", genericBaseSkills, ["MOMENTUM_SWING"]),
    createMockPlayer("ai2", "AI SG", genericBaseSkills),
    createMockPlayer("ai3", "AI SF", genericBaseSkills),
    createMockPlayer("ai4", "AI PF", genericBaseSkills),
    createMockPlayer("ai5", "AI C", genericBaseSkills),
  ];

  const { events, finalStates } = runMockMatches(userLineup, aiLineup, 60, 60);

  const userTriggers = events.filter(e => e.includes("User PG's Momentum Swing stabilizes"));
  const aiTriggers = events.filter(e => e.includes("AI PG's Momentum Swing stabilizes"));

  assert(userTriggers.length > 0, `MOMENTUM_SWING triggers successfully for User team (Count: ${userTriggers.length})`);
  assert(aiTriggers.length > 0, `MOMENTUM_SWING triggers successfully for AI team (Count: ${aiTriggers.length})`);

  // Verify once-per-quarter limit
  let foundMultipleTriggersInMatchState = false;
  finalStates.forEach(state => {
    const userUsed = state.skillUsedThisGame?.user ?? [];
    const aiUsed = state.skillUsedThisGame?.ai ?? [];
    const userQ1Count = userUsed.filter((k: string) => k === "User Momentum Swing Q1").length;
    const aiQ1Count = aiUsed.filter((k: string) => k === "AI Momentum Swing Q1").length;
    if (userQ1Count > 1 || aiQ1Count > 1) {
      foundMultipleTriggersInMatchState = true;
    }
  });
  assert(!foundMultipleTriggersInMatchState, "MOMENTUM_SWING never triggers more than once per quarter per team");

  // Verify recovery bounds
  let foundInvalidStaminaRecovery = false;
  let maxObservedStaminaRecovery = 0;
  let minObservedStaminaRecovery = 999;
  
  const allMomentumSwingLogs = events.filter(e => e.includes("Momentum Swing stabilizes"));
  allMomentumSwingLogs.forEach(log => {
    const stamMatch = log.match(/stamina \(\+(\d+)\)/);
    if (stamMatch) {
      const val = parseInt(stamMatch[1]);
      if (val > maxObservedStaminaRecovery) maxObservedStaminaRecovery = val;
      if (val < minObservedStaminaRecovery) minObservedStaminaRecovery = val;
      if (val < 5 || val > 8) {
        foundInvalidStaminaRecovery = true;
      }
    }
  });

  assert(!foundInvalidStaminaRecovery && maxObservedStaminaRecovery > 0, `Stamina recovery is strictly between 5 and 8 (Observed: ${minObservedStaminaRecovery} to ${maxObservedStaminaRecovery})`);

  if (testsFailed) {
    console.error("\n❌ SOME MOMENTUM_SWING VALIDATION TESTS FAILED.");
    process.exit(1);
  } else {
    console.log("\n🎉 ALL MOMENTUM_SWING VALIDATION TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  }
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
