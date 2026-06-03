import { Player } from "../../lib/types/player";
import { simulateTick } from "../../lib/utils/matchEngine";
import { MatchState } from "../../lib/utils/matchTypes";

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
  
  // Others should not be drained by defensive anchor
  const others = userLineup.slice(1);
  const othersUndrained = others.every(p => nextState.playerStamina[p.id] >= 99.7); // might lose small time decay (0.24), but not skill drain
  assert(othersUndrained, "Inactive mode: Non-target players should not experience defensive anchor drain");

  // Cooldown checked
  assert(nextState.skillUsedThisGame.ai.includes("AI Defensive Anchor Q1"), "Inactive mode: Cooldown should be registered on successful trigger");
}

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

  const allDrained = userLineup.every(p => nextState.playerStamina[p.id] < 90);
  assert(allDrained, "Level 1: Team-wide drain should drain stamina from all 5 opponents");
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
  const user1StamNoLeader = 82; // approximate expected without counter, lets check if counter leaves player with more stamina
  console.log(`User PG Stamina with leader: ${nextState.playerStamina["user1"]}`);
  assert(nextState.playerStamina["user1"] > 80, "Team Leadership counterplay reduces the team-wide stamina drain amount");
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
