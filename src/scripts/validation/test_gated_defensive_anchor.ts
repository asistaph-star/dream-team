import { Player } from "../../lib/types/player";
import { simulateTick } from "../../lib/utils/matchEngine";
import { MatchState } from "../../lib/utils/matchTypes";
import { LEGACY_TO_MECHANIC_MAP } from "../../lib/skills/skillMechanics";
import { FIVE_MAN_SQUEEZE_BASE, FIVE_MAN_SQUEEZE_BOOSTED } from "../../lib/match/staminaSkillEffects";

// Helper to create a mock player
function createMockPlayer(
  id: string,
  name: string,
  ovr: number,
  baseSkills: [string, string, string],
  specialSkillSlots: (string | null)[] = [],
  starLevel = 0,
  ratings: Partial<Player> = {}
): Player {
  return {
    id,
    name,
    position: "PG",
    rarity: "Epic",
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
    ...ratings,
  } as Player;
}

// Initial state builder
function buildInitialState(userLineup: Player[], aiLineup: Player[]): MatchState {
  const allIds = [...userLineup.map(p => p.id), ...aiLineup.map(p => p.id)];
  const stamina: Record<string, number> = {};
  allIds.forEach(id => { stamina[id] = 100; });

  const stats: MatchState["playerStats"] = {};
  allIds.forEach(id => {
    stats[id] = { PTS: 0, REB: 0, AST: 0, STL: 0, TOV: 0, BLK: 0, OREB: 0, DREB: 0, FOL: 0, FTA: 0, FTM: 0, FGM: 0, FGA: 0, TPM: 0, TPA: 0, plusMinus: 0 };
  });

  return {
    quarter: 1,
    clock: 720,
    userScore: 0,
    aiScore: 0,
    userMomentum: 0,
    aiMomentum: 0,
    events: [],
    isFinished: false,
    playerStamina: stamina,
    playerStats: stats,
    userOffStrategy: "Motion Offense",
    userDefStrategy: "Man-to-Man",
    lastStrategyChange: 0,
    aiOffStrategy: "Motion Offense",
    aiDefStrategy: "Man-to-Man",
    lastAiStrategyChange: 0,
    energyDrinksLeft: 0,
    timeoutsLeft: 4,
    momentumUsesLeft: 2,
    momentumActive: false,
    momentumEndTime: 0,
    actionStaminaTracker: {},
    hotPlayers: {},
    halftimeShown: false,
    userPlayerIds: userLineup.map(p => p.id),
    aiPlayerIds: aiLineup.map(p => p.id),
    aiLineupIds: aiLineup.map(p => p.id),
    effectiveUserOff: 80,
    effectiveUserDef: 80,
    effectiveAiOff: 80,
    effectiveAiDef: 80,
    prevUserOff: 80,
    prevUserDef: 80,
    prevAiOff: 80,
    prevAiDef: 80,
    strategyWarnings: [],
    consecutiveAiRun: 0,
    consecutiveUserRun: 0,
    playerConsecutive: {},
    aiTimeoutsLeft: 4,
    aiLastSubCheck: 0,
    hotPlayerFocusTarget: null,
    hotPlayerLastScored: {},
    difficulty: "NORMAL",
    quarterScores: { user: [], ai: [] },
    longestUserRun: 0,
    longestAiRun: 0,
    quarterStartUserScore: 0,
    quarterStartAiScore: 0,
    formRating: {},
    formNarrativeFired: {},
    hotFromForm: {},
    teamFouls: { user: [0, 0, 0, 0], ai: [0, 0, 0, 0] },
    isInBonus: { user: false, ai: false },
    fouledOut: [],
    ftSequence: null,
    pendingAutoSub: null,
    isHomeGame: true,
    subsMade: 0,
    goodSubsMade: 0,
    energyDrinkLocked: {},
    energyDrinkGoodUses: 0,
    energyDrinkPendingForm: null,
    isOT: false,
    otPeriod: 0,
    otScores: { user: [], ai: [] },
    shootoutSequence: null,
    fastBreakActive: false,
    fastBreakTeam: null,
    possessionClock: 24,
    possessionTeam: "user",
    lastPlayCategory: "made_shot",
    injuries: {},
    possessionHistory: [],
    activeSkillBuffs: {},
    teamSkillBuffs: {
      user: { offIQ: 0, defIQ: 0, revertBlocked: false, revertThresholdBonus: 0 },
      ai: { offIQ: 0, defIQ: 0, revertBlocked: false, revertThresholdBonus: 0 }
    },
    disabledSkills: {},
    blockedSkills: {},
    skillMarks: {},
    markImmunity: {},
    skillUsedThisGame: { user: [], ai: [] },
    flagrantFouls: {},
    ejectedPlayers: [],
    prevAiLineupIds: []
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

// Override Math.random to make execution deterministic
// We want rolls to always succeed (returns 0.0)
const originalRandom = Math.random;
Math.random = () => 0.0;

const mockAiTeamObj = {
  name: "New York Knicks",
  arena: "MSG",
  off: 80,
  def: 80,
  color: "text-blue-500",
  roster: [] as Player[]
};

console.log("=== RUNNING GATED DEFENSIVE ANCHOR TESTS ===");

// 1. Inactive Level 0 (None) - Single-Target Only
{
  // Defender team (AI) has DEFENSIVE_ANCHOR holder
  const aiLineup = [
    createMockPlayer("ai1", "AI Defensive Anchor", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], ["DEFENSIVE_ANCHOR"], 1, { defense: 85, stamina: 100, strength: 80, speed: 80, position: "PG" }),
    createMockPlayer("ai2", "AI 2", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("ai3", "AI 3", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("ai4", "AI 4", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("ai5", "AI 5", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"]),
  ];

  // Attacker team (User) - playmaker is user1 (highest assist/handle ratings)
  const userLineup = [
    createMockPlayer("user1", "User Playmaker PG", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { playmaking: 95, assist: 95, handle: 95, stamina: 100, position: "PG" }),
    createMockPlayer("user2", "User SG", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { playmaking: 70, assist: 70, handle: 70, stamina: 100, position: "SG" }),
    createMockPlayer("user3", "User SF", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { playmaking: 60, assist: 60, handle: 60, stamina: 100, position: "SF" }),
    createMockPlayer("user4", "User PF", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { playmaking: 50, assist: 50, handle: 50, stamina: 100, position: "PF" }),
    createMockPlayer("user5", "User C", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { playmaking: 40, assist: 40, handle: 40, stamina: 100, position: "C" }),
  ];

  mockAiTeamObj.roster = aiLineup;

  const state = buildInitialState(userLineup, aiLineup);
  state.possessionTeam = "user"; // User attacking, AI defending

  const nextState = simulateTick(state, 80, 80, mockAiTeamObj, userLineup, userLineup);

  // Assertions
  const primaryTargetId = "user1";
  assert(nextState.playerStamina[primaryTargetId] < 100, `Inactive mode: Primary playmaker ${userLineup[0].name} stamina should be drained`);
  
  // Under Math.random() = 0.0, both Defensive Anchor and Five-Man Squeeze trigger.
  // Five-Man Squeeze drains ALL players by 25.
  // Defensive Anchor single-target drains only the primary target (user1).
  // So the primary target (user1) should lose more stamina than others,
  // and the others (user2-5) should all have identical stamina (only decay + Five-Man Squeeze).
  const others = userLineup.slice(1);
  const primaryTargetStamina = nextState.playerStamina[primaryTargetId];
  const targetStaminaDiff = nextState.playerStamina[others[0].id] - primaryTargetStamina;
  assert(targetStaminaDiff > 0.5, `Inactive mode: Primary playmaker should experience single-target pressure drain (difference observed: ${targetStaminaDiff})`);
  
  const othersIdentical = others.every(p => Math.abs(nextState.playerStamina[p.id] - nextState.playerStamina[others[0].id]) < 0.01);
  assert(othersIdentical, "Inactive mode: Non-target players should not experience defensive anchor drain (they all have identical stamina)");

  // Cooldown checked
  assert(nextState.skillUsedThisGame.ai.includes("AI Defensive Anchor Q1"), "Inactive mode: Cooldown should be registered on successful trigger");
}

let user1StamNoLeader = 0;

// 2. Level 1 (Bronze) - Team-Wide Drain
{
  // Defender team (AI) has DEFENSIVE_ANCHOR holder and 3 candidate skills for stamina-drain archetype (Level 1)
  // Stamina Drain skills: Paint Magnet, Power Driver, Screen Breaker, Shadow Guard, Hands Active, Focus Lock, Iron Motor, Enforcer Lift
  const aiLineup = [
    createMockPlayer("ai1", "AI Defensive Anchor", 90, ["Paint Magnet", "Connector Hub", "Tempo Surgeon"], ["DEFENSIVE_ANCHOR"], 1, { defense: 85, stamina: 100, strength: 80, speed: 80 }),
    createMockPlayer("ai2", "AI 2", 90, ["Power Driver", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("ai3", "AI 3", 90, ["Screen Breaker", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("ai4", "AI 4", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("ai5", "AI 5", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"]),
  ];

  const userLineup = [
    createMockPlayer("user1", "User PG", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("user2", "User SG", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("user3", "User SF", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("user4", "User PF", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("user5", "User C", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
  ];

  mockAiTeamObj.roster = aiLineup;

  const state = buildInitialState(userLineup, aiLineup);
  state.possessionTeam = "user";

  const nextState = simulateTick(state, 80, 80, mockAiTeamObj, userLineup, userLineup);
  user1StamNoLeader = nextState.playerStamina["user1"];

  // 1. Verify both Defensive Anchor mechanics can trigger under deterministic success
  const hasAnchorTriggered = nextState.events.some(e => e.text.includes("Defensive Anchor exerts team-wide pressure"));
  const hasSqueezeTriggered = nextState.events.some(e => e.text.includes("Five-Man Squeeze X drains"));
  assert(hasAnchorTriggered && hasSqueezeTriggered, "Both Defensive Anchor and Five-Man Squeeze trigger under deterministic success");

  // 2. Verify Five-Man Squeeze uses the rebalanced 25/40 values (baseline 25)
  const squeezeEventBase = nextState.events.find(e => e.text.includes("Five-Man Squeeze X drains"));
  assert(squeezeEventBase !== undefined && squeezeEventBase.text.includes("25 stamina"), "Five-Man Squeeze uses rebalanced base value (25)");

  const allDrained = userLineup.every(p => nextState.playerStamina[p.id] < 90);
  assert(allDrained, "Level 1: Team-wide drain should drain stamina from all 5 opponents");

  // 3. Verify Five-Man Squeeze uses boosted value (40) when 3+ players are marked
  {
    const stateBoosted = buildInitialState(userLineup, aiLineup);
    stateBoosted.possessionTeam = "user";
    stateBoosted.skillMarks = {
      "user1": [{ mark: "Tilted", possessionsLeft: 3, sourceSkill: "Test" }],
      "user2": [{ mark: "Tilted", possessionsLeft: 3, sourceSkill: "Test" }],
      "user3": [{ mark: "Tilted", possessionsLeft: 3, sourceSkill: "Test" }]
    };
    const nextStateBoosted = simulateTick(stateBoosted, 80, 80, mockAiTeamObj, userLineup, userLineup);
    const squeezeEventBoosted = nextStateBoosted.events.find(e => e.text.includes("Five-Man Squeeze X drains"));
    assert(squeezeEventBoosted !== undefined && squeezeEventBoosted.text.includes("40 stamina"), "Five-Man Squeeze uses boosted value (40) when 3+ players are marked");
  }

  // 4. Verify anti-snowball scaling applies correctly
  {
    // If a player starts at 40 stamina, they are in the [30, 50) bracket, scaling by 0.60.
    // 25 * 0.60 = 15.
    const stateLow = buildInitialState(userLineup, aiLineup);
    stateLow.possessionTeam = "user";
    stateLow.playerStamina["user2"] = 40;

    const nextStateLow = simulateTick(stateLow, 80, 80, mockAiTeamObj, userLineup, userLineup);
    const finalStaminaUser2 = nextStateLow.playerStamina["user2"];
    assert(finalStaminaUser2 > 15, `Anti-snowball scaling correctly prevents user2's stamina from plummeting (final stamina: ${finalStaminaUser2} > 15)`);
  }

  // 5. Verify stamina does not drop because of old 40/60 values
  assert(FIVE_MAN_SQUEEZE_BASE === 25, "FIVE_MAN_SQUEEZE_BASE is correctly rebalanced to 25");
  assert(FIVE_MAN_SQUEEZE_BOOSTED === 40, "FIVE_MAN_SQUEEZE_BOOSTED is correctly rebalanced to 40");
}

// 3. Counterplay: Team Leadership Resistance
{
  const aiLineup = [
    createMockPlayer("ai1", "AI Defensive Anchor", 90, ["Paint Magnet", "Connector Hub", "Tempo Surgeon"], ["DEFENSIVE_ANCHOR"], 1, { defense: 85, stamina: 100, strength: 80, speed: 80 }),
    createMockPlayer("ai2", "AI 2", 90, ["Power Driver", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("ai3", "AI 3", 90, ["Screen Breaker", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("ai4", "AI 4", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("ai5", "AI 5", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"]),
  ];

  // Attacker team has COMPOSURE_SHIELD_CANCEL leader
  const userLineup = [
    createMockPlayer("user1", "User PG", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], ["COMPOSURE_SHIELD"], 1, { stamina: 100, calm: 90, assist: 90 }),
    createMockPlayer("user2", "User SG", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("user3", "User SF", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("user4", "User PF", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("user5", "User C", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
  ];

  mockAiTeamObj.roster = aiLineup;

  const state = buildInitialState(userLineup, aiLineup);
  state.possessionTeam = "user";

  const nextState = simulateTick(state, 80, 80, mockAiTeamObj, userLineup, userLineup);
  
  // Leadership reduces the drain
  console.log(`User PG Stamina with leader: ${nextState.playerStamina["user1"]} vs without leader: ${user1StamNoLeader}`);
  assert(nextState.playerStamina["user1"] > user1StamNoLeader, "Team Leadership counterplay reduces the team-wide stamina drain amount");
}

// 4. User/AI Symmetry Check
{
  const userLineup = [
    createMockPlayer("user1", "User Defensive Anchor", 90, ["Paint Magnet", "Connector Hub", "Tempo Surgeon"], ["DEFENSIVE_ANCHOR"], 1, { defense: 85, stamina: 100, strength: 80, speed: 80 }),
    createMockPlayer("user2", "User 2", 90, ["Power Driver", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("user3", "User 3", 90, ["Screen Breaker", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("user4", "User 4", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"]),
    createMockPlayer("user5", "User 5", 90, ["Rim Warden", "Connector Hub", "Tempo Surgeon"]),
  ];

  const aiLineup = [
    createMockPlayer("ai1", "AI PG", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("ai2", "AI SG", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("ai3", "AI SF", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("ai4", "AI PF", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
    createMockPlayer("ai5", "AI C", 80, ["Rim Warden", "Connector Hub", "Tempo Surgeon"], [], 0, { stamina: 100 }),
  ];

  mockAiTeamObj.roster = aiLineup;

  const state = buildInitialState(userLineup, aiLineup);
  state.possessionTeam = "ai"; // AI attacking, User defending

  const nextState = simulateTick(state, 80, 80, mockAiTeamObj, userLineup, userLineup);

  const hasAnchorTriggered = nextState.events.some(e => e.text.includes("Defensive Anchor exerts team-wide pressure"));
  const hasSqueezeTriggered = nextState.events.some(e => e.text.includes("Five-Man Squeeze X drains"));
  assert(hasAnchorTriggered && hasSqueezeTriggered, "Symmetry: Both Defensive Anchor and Five-Man Squeeze trigger when User is defending");

  const allDrained = aiLineup.every(p => nextState.playerStamina[p.id] < 90);
  assert(allDrained, "Symmetry: Team-wide drain drains all AI opponents when User is defending");
}

// 5. Skill Family Mapping Check
{
  const mechanics = LEGACY_TO_MECHANIC_MAP["DEFENSIVE_ANCHOR"];
  assert(mechanics !== undefined, "DEFENSIVE_ANCHOR family is defined in mapping");
  assert(mechanics.includes("DEFENSIVE_ANCHOR_TEAM_PRESSURE"), "DEFENSIVE_ANCHOR includes DEFENSIVE_ANCHOR_TEAM_PRESSURE");
  assert(mechanics.includes("DEFENSIVE_ANCHOR_CORNER_TRAP"), "DEFENSIVE_ANCHOR includes DEFENSIVE_ANCHOR_CORNER_TRAP");
  assert(mechanics.includes("DEFENSIVE_ANCHOR_FIVE_MAN_SQUEEZE"), "DEFENSIVE_ANCHOR includes DEFENSIVE_ANCHOR_FIVE_MAN_SQUEEZE");
  assert(mechanics.length === 3, "DEFENSIVE_ANCHOR maps precisely to 3 mechanics");
}

// Restore Math.random
Math.random = originalRandom;

if (testsFailed) {
  console.error("❌ Some validation tests failed!");
  process.exit(1);
} else {
  console.log("🎉 ALL DEFENSIVE ANCHOR VALIDATION TESTS PASSED!");
  process.exit(0);
}

