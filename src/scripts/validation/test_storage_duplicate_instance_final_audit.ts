import Module from 'module';

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] Assertion failed: ${message}`);
    testsFailed = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

// -----------------------------------------------------------------------------
// React Mocking Layer to enable rendering GameStateProvider in pure Node
// -----------------------------------------------------------------------------
let hookIndex = 0;
const hookStates: any[] = [];

let effectIndex = 0;
const effectDeps: any[] = [];

let capturedValue: any = null;

const mockReact: any = {
  createContext: () => {
    return {
      Provider: ({ value, children }: any) => {
        capturedValue = value;
        return children;
      }
    };
  },
  useContext: () => {
    return {};
  },
  useState: (initialValue: any) => {
    const currentIndex = hookIndex++;
    if (hookStates.length <= currentIndex) {
      let val = initialValue;
      if (typeof initialValue === 'function') {
        val = initialValue();
      }
      hookStates.push(val);
    }
    const setter = (newValue: any) => {
      let nextVal = newValue;
      if (typeof newValue === 'function') {
        nextVal = newValue(hookStates[currentIndex]);
      }
      if (hookStates[currentIndex] === nextVal) return;
      hookStates[currentIndex] = nextVal;
      renderProvider();
    };
    return [hookStates[currentIndex], setter];
  },
  useEffect: (cb: any, deps?: any[]) => {
    const currentIndex = effectIndex++;
    const oldDeps = effectDeps[currentIndex];

    let shouldRun = false;
    if (oldDeps === undefined) {
      shouldRun = true;
    } else if (deps === undefined) {
      shouldRun = true;
    } else {
      shouldRun = deps.some((dep, i) => dep !== oldDeps[i]);
    }

    if (shouldRun) {
      effectDeps[currentIndex] = deps;
      cb();
    }
  },
  useMemo: (fn: any) => fn(),
  useCallback: (fn: any) => fn,
};
mockReact.default = mockReact;

const mockJsxRuntime = {
  jsx: (type: any, props: any, key: any) => {
    if (props && props.value) {
      capturedValue = props.value;
    }
    return { type, props, key };
  },
  jsxs: (type: any, props: any, key: any) => {
    if (props && props.value) {
      capturedValue = props.value;
    }
    return { type, props, key };
  },
  jsxDEV: (type: any, props: any, key: any) => {
    if (props && props.value) {
      capturedValue = props.value;
    }
    return { type, props, key };
  },
  Fragment: Symbol.for('react.fragment'),
};

// Monkey-patch require BEFORE importing GameStateContext
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === 'react') {
    return mockReact;
  }
  if (id === 'react/jsx-runtime' || id === 'react/jsx-dev-runtime' || id === 'react/compiler-runtime') {
    return mockJsxRuntime;
  }
  return originalRequire.apply(this, arguments as any);
};

// Now require target files to prevent hoisting!
const { getPlayerDuplicateKey, isCardInstanceActive, getAscensionCandidates, sortAscensionCandidates, hasLearnedSpecialSkills } = require("../../lib/utils/playerCardIdentity");
const { getRequiredDuplicateCount } = require("../../lib/utils/starRequirements");
const { GameStateProvider } = require("../../lib/context/GameStateContext");

import { Player } from "../../lib/types/player"; // type import is safe since it compiles out

function renderProvider() {
  hookIndex = 0;
  effectIndex = 0;
  GameStateProvider({ children: null });
}

// Initial mount to populate states and capture context methods
renderProvider();

function getContext() {
  return capturedValue;
}

// State setter helpers using index mappings from GameStateContext.tsx useState list
function setMockRoster(roster: Player[]) {
  hookStates[15] = roster;
  renderProvider();
}

function setMockInventory(inventory: any) {
  hookStates[14] = inventory;
  renderProvider();
}

function setMockLineupOverride(override: any) {
  hookStates[9] = override;
  renderProvider();
}

// Helper to create mock player cards
function createMockPlayer(id: string, name: string, properties: Partial<Player> = {}): Player {
  const base: Player = {
    id,
    name,
    position: "PG",
    rarity: "Common",
    level: 1,
    maxLevel: 20,
    exp: 0,
    ovr: 85,
    offense: 80,
    defense: 80,
    shooting: 80,
    speed: 80,
    strength: 80,
    playmaking: 80,
    starLevel: 0,
    specialSkillSlots: [null, null],
    skillRarities: {},
    stamina: 100
  };
  return { ...base, ...properties } as Player;
}

// Controlling random success/failure outcomes
const originalRandom = Math.random;
function mockRandom(value: number) {
  Math.random = () => value;
}
function restoreRandom() {
  Math.random = originalRandom;
}

function run() {
  console.log("=== RUNNING STORAGE DUPLICATE INSTANCE AUDIT VALIDATION ===");

  // 1. Static and Helper Tests
  console.log("--- PART 1: Helper Function Unit Tests ---");

  const curry1 = createMockPlayer("curry_1", "Stephen Curry", { nbaPlayerId: "sc_nba" });
  const curry2 = createMockPlayer("curry_2", "Stephen Curry", { nbaPlayerId: "sc_nba" });
  const lebron = createMockPlayer("lebron_1", "LeBron James", { nbaPlayerId: "lj_nba" });

  assert(curry1.id !== curry2.id, "two copies of the same real player have different instance IDs");
  assert(getPlayerDuplicateKey(curry1) === getPlayerDuplicateKey(curry2), "duplicate grouping key matches same real player");
  assert(getPlayerDuplicateKey(curry1) !== curry1.id, "duplicate grouping key is not treated as instance ID");
  assert(getPlayerDuplicateKey(curry1) !== getPlayerDuplicateKey(lebron), "distinct real players produce distinct duplicate keys");

  // Lineup and Bench isolation checks
  assert(isCardInstanceActive(curry2, [curry1], []) === false, "copy A in lineup does not mark copy B as active");
  assert(isCardInstanceActive(curry2, [], [curry1]) === false, "copy B in reserves bench does not mark copy C as active");
  assert(isCardInstanceActive(curry1, [curry1], []) === true, "active starting lineup card is marked active");
  assert(isCardInstanceActive(curry1, [], [curry1]) === true, "active reserves bench card is marked active");

  // Candidate selection and prioritization
  const candidatesLineup = getAscensionCandidates(curry1, [curry1, curry2], [curry2], []);
  assert(!candidatesLineup.some(c => c.id === curry2.id), "candidate selection excludes active starting lineup duplicates");

  const candidatesReserves = getAscensionCandidates(curry1, [curry1, curry2], [], [curry2]);
  assert(!candidatesReserves.some(c => c.id === curry2.id), "candidate selection excludes active reserves bench duplicates");

  const candidatesSelf = getAscensionCandidates(curry1, [curry1, curry2], [], []);
  assert(!candidatesSelf.some(c => c.id === curry1.id), "candidate selection excludes base card self");

  const cleanDup = createMockPlayer("clean_dup", "Stephen Curry", { specialSkillSlots: [null, null] });
  const trainedDup = createMockPlayer("trained_dup", "Stephen Curry", { specialSkillSlots: ["DEEP_STRIKE", null] });
  const sorted = sortAscensionCandidates([trainedDup, cleanDup]);
  assert(sorted[0].id === "clean_dup", "ascension candidate sorting prioritizes clean duplicates before trained/skilled duplicates");
  assert(hasLearnedSpecialSkills(trainedDup) === true, "learned special skills are correctly detected");
  assert(hasLearnedSpecialSkills(cleanDup) === false, "clean duplicate does not trigger learned special skills flag");

  // 2. Real Integration Tests via GameStateProvider Context
  console.log("--- PART 2: Real Context executionPath (ascendPlayer) Tests ---");

  const baseCard = createMockPlayer("base_curry", "Stephen Curry", { starLevel: 0, nbaPlayerId: "sc_nba" });
  const normalDup = createMockPlayer("normal_dup", "Stephen Curry", { starLevel: 0, nbaPlayerId: "sc_nba" });

  // Test Case A: Upgrade failure preserves card instances
  console.log("- Test Case A: Upgrade Failure Roster Preservation");
  // Set starLevel to 4 (Silver ★4, ready to ascend to Silver ★5, successChance = 60%, cost = 100)
  const failureBaseCard = createMockPlayer("base_curry", "Stephen Curry", { starLevel: 4, nbaPlayerId: "sc_nba" });
  setMockRoster([failureBaseCard, normalDup]);
  setMockInventory({
    materials: {
      mat_upgrade: 100, // plenty of mats
      skill_tape: 0
    },
    equipments: []
  });
  setMockLineupOverride({});

  let context = getContext();

  // Mock random to force failure (0.99 > 0.60 successChance)
  mockRandom(0.99);
  let res = context.ascendPlayer("base_curry", true);
  restoreRandom();

  // Retrieve fresh context after potential state update
  context = getContext();

  assert(res.success === false, "ascendPlayer execution fails when random check fails");
  assert(context.roster.length === 2, "failed ascension does not consume duplicate card instances");
  assert(context.inventory.materials.mat_upgrade < 100, "failed ascension still consumes upgrade materials");

  // Test Case B: Successful upgrade consumes duplicates and increments starLevel
  console.log("- Test Case B: Successful Upgrade Verification");
  const successBaseCard = createMockPlayer("base_curry", "Stephen Curry", { starLevel: 0, nbaPlayerId: "sc_nba" });
  // Reset materials and roster
  setMockRoster([successBaseCard, normalDup]);
  setMockInventory({
    materials: {
      mat_upgrade: 100,
      skill_tape: 0
    },
    equipments: []
  });

  context = getContext();

  // Mock random to force success (Silver star 1 is 100% anyway, but let's be safe)
  mockRandom(0.01);
  res = context.ascendPlayer("base_curry", true);
  restoreRandom();

  context = getContext();

  assert(res.success === true, "ascendPlayer execution succeeds on valid criteria");
  assert(context.roster.length === 1, "successful upgrade consumes the correct duplicate card instance");
  assert(context.roster[0].id === "base_curry", "base card itself is preserved in the roster");
  assert(context.roster[0].starLevel === 1, "base card star level is successfully incremented to 1");

  // Test Case C: Insufficient materials
  console.log("- Test Case C: Insufficient Materials Check");
  setMockRoster([successBaseCard, normalDup]);
  setMockInventory({
    materials: {
      mat_upgrade: 0, // No upgrade mats
      skill_tape: 0
    },
    equipments: []
  });

  context = getContext();

  res = context.ascendPlayer("base_curry", true);
  context = getContext();

  assert(res.success === false, "ascendPlayer fails when materials are insufficient");
  assert(res.error && res.error.includes("Not enough Upgrade MATs"), "error message mentions lack of mats");
  assert(context.roster.length === 2, "no cards are consumed when upgrade fails due to materials");

  // Test Case D: Insufficient duplicates
  console.log("- Test Case D: Insufficient Duplicates Check");
  setMockRoster([successBaseCard]); // Roster has no duplicates of Curry
  setMockInventory({
    materials: {
      mat_upgrade: 100,
      skill_tape: 0
    },
    equipments: []
  });

  context = getContext();

  res = context.ascendPlayer("base_curry", true);
  context = getContext();

  assert(res.success === false, "ascendPlayer fails when duplicates are insufficient");
  assert(res.error && res.error.includes("Duplicate(s)"), "error message mentions duplicate requirement");

  // Test Case E: Active Lineup Protection
  console.log("- Test Case E: Lineup Protection Check");
  setMockRoster([successBaseCard, normalDup]);
  setMockInventory({
    materials: {
      mat_upgrade: 100,
      skill_tape: 0
    },
    equipments: []
  });
  // Mark normalDup as in lineup PG slot
  setMockLineupOverride({ PG: "normal_dup" });

  context = getContext();

  res = context.ascendPlayer("base_curry", true);
  context = getContext();

  assert(res.success === false, "ascendPlayer fails because the only duplicate is active in starting lineup");
  assert(res.error && res.error.includes("NOT in your active starting 5"), "error message mentions lineup protection");

  // Test Case F: Active Reserves Bench Protection
  console.log("- Test Case F: Bench Protection Check");
  setMockRoster([successBaseCard, normalDup]);
  setMockInventory({
    materials: {
      mat_upgrade: 100,
      skill_tape: 0
    },
    equipments: []
  });
  // Mark normalDup as in reserves bench B1 slot
  setMockLineupOverride({ B1: "normal_dup" });

  context = getContext();

  res = context.ascendPlayer("base_curry", true);
  context = getContext();

  assert(res.success === false, "ascendPlayer fails because the only duplicate is active in reserves bench");
  assert(res.error && res.error.includes("reserves bench"), "error message mentions reserves bench protection");

  // Test Case G: Warning Triggers for Trained Duplicates
  console.log("- Test Case G: Trained Duplicate Warnings");
  const specialDup = createMockPlayer("special_dup", "Stephen Curry", {
    starLevel: 0,
    nbaPlayerId: "sc_nba",
    specialSkillSlots: ["DEEP_STRIKE", null]
  });

  setMockRoster([successBaseCard, specialDup]);
  setMockInventory({
    materials: {
      mat_upgrade: 100,
      skill_tape: 0
    },
    equipments: []
  });
  setMockLineupOverride({});

  context = getContext();

  // Confirm sacrifice = false first
  res = context.ascendPlayer("base_curry", false);
  context = getContext();

  assert(res.success === false, "ascendPlayer returns failure or blocks when warning triggers");
  assert(res.pendingWarning === true, "ascendWarning flags pendingWarning = true for trained duplicate");
  assert(context.roster.length === 2, "no duplicates are consumed when warning is triggered and not confirmed");

  // Confirm sacrifice = true now
  mockRandom(0.01);
  res = context.ascendPlayer("base_curry", true);
  restoreRandom();

  context = getContext();

  assert(res.success === true, "ascendPlayer succeeds when warning is explicitly confirmed by user");
  assert(context.roster.length === 1, "trained duplicate is consumed successfully on confirmation");
  assert(context.roster[0].starLevel === 1, "base card is upgraded successfully");

  if (testsFailed) {
    console.error("[FAIL] Storage duplicate instance final audit checks failed.");
    process.exit(1);
  } else {
    console.log("[SUCCESS] All storage duplicate instance final audit checks passed successfully.");
    process.exit(0);
  }
}

run();
