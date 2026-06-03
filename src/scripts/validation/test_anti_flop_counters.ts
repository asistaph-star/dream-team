import { Player } from "../../lib/types/player";
import { simulateTick, createInitialMatchState, computeEffective } from "../../lib/utils/matchEngine";

// Helper to create mock players
function createMockPlayer(
  id: string,
  name: string,
  baseSkills: [string, string, string],
  specialSkillSlots: (string | null)[] = [],
  ovr = 90,
  overrides: Partial<Player> = {}
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
      "Flop X": "Legendary",
      "Four-Point Bait X": "Legendary",
      "Red Dot X": "Legendary",
      "Composure X": "Legendary",
      "Clean Contest X": "Legendary"
    },
    ...overrides
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

function runMockMatches(
  userLineup: Player[],
  aiLineup: Player[],
  strategy = "Motion Offense",
  numMatches = 10
): string[] {
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

    let ticks = 0;
    while (!state.isFinished && ticks < 400) {
      allUserRoster.forEach(p => state.playerStamina[p.id] = 50);
      aiLineup.forEach(p => state.playerStamina[p.id] = 50);

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

console.log("=== RUNNING ANTI-FLOP COUNTERS VALIDATION TESTS ===");

const genericBaseSkills: [string, string, string] = ["Share Rhythm", "Connector Hub", "Position Flex"];
const genericAI = () => [
  createMockPlayer("ai1", "AI PG", genericBaseSkills),
  createMockPlayer("ai2", "AI SG", genericBaseSkills),
  createMockPlayer("ai3", "AI SF", genericBaseSkills),
  createMockPlayer("ai4", "AI PF", genericBaseSkills),
  createMockPlayer("ai5", "AI C", genericBaseSkills),
];

// Test 1: Flop X triggers normally when defender has no counters
{
  const user = [
    createMockPlayer("u1", "User Shooter", genericBaseSkills, ["Flop X", "Contact Tax X"]),
    createMockPlayer("u2", "User SG", genericBaseSkills),
    createMockPlayer("u3", "User SF", genericBaseSkills),
    createMockPlayer("u4", "User PF", genericBaseSkills),
    createMockPlayer("u5", "User C", genericBaseSkills),
  ];
  const events = runMockMatches(user, genericAI(), "Motion Offense", 200);
  const normalTriggers = events.filter(e => e.includes("Flop X sells the contact into foul pressure"));
  const counterCancels = events.filter(e => e.includes("Composure X cancels the Flop X sell-contact attempt"));
  const counterReduces = events.filter(e => e.includes("Clean Contest X reduces the Flop X contact pressure"));

  assert(normalTriggers.length > 0, `Flop X triggers normally when no counters are present (Count: ${normalTriggers.length})`);
  assert(counterCancels.length === 0, "No Composure Shield cancels happen when defender lacks the skill");
  assert(counterReduces.length === 0, "No Clean Challenge reduces happen when defender lacks the skill");
}

// Test 2: SGA Flop X triggers normally and applies SGA label when defender has no counters
{
  const user = [
    createMockPlayer("u1", "Shai Gilgeous-Alexander", genericBaseSkills, ["Flop X", "Contact Tax X"]),
    createMockPlayer("u2", "User SG", genericBaseSkills),
    createMockPlayer("u3", "User SF", genericBaseSkills),
    createMockPlayer("u4", "User PF", genericBaseSkills),
    createMockPlayer("u5", "User C", genericBaseSkills),
  ];
  const events = runMockMatches(user, genericAI(), "Motion Offense", 200);
  const sgaTriggers = events.filter(e => e.includes("Flop X sells the contact into foul pressure") && e.includes("SGA doubles it"));
  assert(sgaTriggers.length > 0, `SGA Flop X triggers double foul pressure bonus (Count: ${sgaTriggers.length})`);
}

// Test 3: Composure Shield cancels Flop X completely
{
  const user = [
    createMockPlayer("u1", "User Shooter", genericBaseSkills, ["Flop X", "Contact Tax X"]),
    createMockPlayer("u2", "User SG", genericBaseSkills),
    createMockPlayer("u3", "User SF", genericBaseSkills),
    createMockPlayer("u4", "User PF", genericBaseSkills),
    createMockPlayer("u5", "User C", genericBaseSkills),
  ];
  const ai = [
    createMockPlayer("ai1", "Def PG", genericBaseSkills, ["Composure X"]),
    createMockPlayer("ai2", "Def SG", genericBaseSkills, ["Composure X"]),
    createMockPlayer("ai3", "Def SF", genericBaseSkills),
    createMockPlayer("ai4", "Def PF", genericBaseSkills),
    createMockPlayer("ai5", "Def C", genericBaseSkills),
  ];
  const events = runMockMatches(user, ai, "Motion Offense", 200);
  const normalTriggers = events.filter(e => e.includes("Flop X sells the contact into foul pressure"));
  const counterCancels = events.filter(e => e.includes("Composure X cancels the Flop X sell-contact attempt"));

  assert(counterCancels.length > 0, `Composure Shield cancels Flop X sell-contact (Count: ${counterCancels.length})`);
  console.log(`Normal triggers (Test 3): ${normalTriggers.length} | Composure cancels: ${counterCancels.length}`);
}

// Test 4: Clean Challenge reduces Flop X by 50%
{
  const user = [
    createMockPlayer("u1", "User Shooter", genericBaseSkills, ["Flop X", "Contact Tax X"]),
    createMockPlayer("u2", "User SG", genericBaseSkills),
    createMockPlayer("u3", "User SF", genericBaseSkills),
    createMockPlayer("u4", "User PF", genericBaseSkills),
    createMockPlayer("u5", "User C", genericBaseSkills),
  ];
  const ai = [
    createMockPlayer("ai1", "Def PG", genericBaseSkills, ["Clean Contest X"]),
    createMockPlayer("ai2", "Def SG", genericBaseSkills, ["Clean Contest X"]),
    createMockPlayer("ai3", "Def SF", genericBaseSkills),
    createMockPlayer("ai4", "Def PF", genericBaseSkills),
    createMockPlayer("ai5", "Def C", genericBaseSkills),
  ];
  const events = runMockMatches(user, ai, "Motion Offense", 200);
  const normalTriggers = events.filter(e => e.includes("Flop X sells the contact into foul pressure"));
  const counterReduces = events.filter(e => e.includes("Clean Contest X reduces the Flop X contact pressure"));

  assert(counterReduces.length > 0, `Clean Challenge reduces Flop X contact pressure (Count: ${counterReduces.length})`);
  console.log(`Normal triggers (Test 4): ${normalTriggers.length} | Clean reduces: ${counterReduces.length}`);
}

// Test 5: Composure Shield takes priority over Clean Challenge
{
  const user = [
    createMockPlayer("u1", "User Shooter", genericBaseSkills, ["Flop X", "Contact Tax X"]),
    createMockPlayer("u2", "User SG", genericBaseSkills),
    createMockPlayer("u3", "User SF", genericBaseSkills),
    createMockPlayer("u4", "User PF", genericBaseSkills),
    createMockPlayer("u5", "User C", genericBaseSkills),
  ];
  const ai = [
    createMockPlayer("ai1", "Def PG", genericBaseSkills, ["Composure X", "Clean Contest X"]),
    createMockPlayer("ai2", "Def SG", genericBaseSkills, ["Composure X", "Clean Contest X"]),
    createMockPlayer("ai3", "Def SF", genericBaseSkills),
    createMockPlayer("ai4", "Def PF", genericBaseSkills),
    createMockPlayer("ai5", "Def C", genericBaseSkills),
  ];
  const events = runMockMatches(user, ai, "Motion Offense", 200);
  const counterCancels = events.filter(e => e.includes("Composure X cancels the Flop X sell-contact attempt"));

  assert(counterCancels.length > 0, `Composure Shield cancels Flop X under double skills (Count: ${counterCancels.length})`);
}

if (testsFailed) {
  console.error("❌ SOME ANTI-FLOP COUNTERS VALIDATION TESTS FAILED!");
  process.exit(1);
} else {
  console.log("🎉 ALL ANTI-FLOP COUNTERS VALIDATION TESTS PASSED!");
  process.exit(0);
}
