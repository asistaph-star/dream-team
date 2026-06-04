import * as path from "path";
import * as fs from "fs";
import { Player } from "../../lib/types/player";

const absoluteResolverPath = path.resolve(__dirname, "../../lib/skills/skillResolver.ts");
const absoluteShotEnginePath = path.resolve(__dirname, "../../lib/utils/shotEngine.ts");
const absoluteMatchEnginePath = path.resolve(__dirname, "../../lib/utils/matchEngine.ts");

if (!fs.existsSync(absoluteResolverPath)) {
  throw new Error(`Cannot find skillResolver at ${absoluteResolverPath}`);
}
if (!fs.existsSync(absoluteShotEnginePath)) {
  throw new Error(`Cannot find shotEngine at ${absoluteShotEnginePath}`);
}
if (!fs.existsSync(absoluteMatchEnginePath)) {
  throw new Error(`Cannot find matchEngine at ${absoluteMatchEnginePath}`);
}

// Dynamically locate shot success check lines in matchEngine.ts to override Math.random
const matchEngineContent = fs.readFileSync(absoluteMatchEnginePath, "utf-8");
const matchEngineLines = matchEngineContent.split("\n");
const shotSuccessLines: number[] = [];

for (let i = 0; i < matchEngineLines.length; i++) {
  const line = matchEngineLines[i];
  if (
    line.includes("Math.random() < finalScoringChance") ||
    line.includes("Math.random() < aiFinalChance") ||
    line.includes("Math.random() < aiBlitzFinalChance")
  ) {
    shotSuccessLines.push(i + 1); // 1-based line number
  }
}

if (shotSuccessLines.length === 0) {
  throw new Error("Failed to dynamically locate shot success check lines in matchEngine.ts");
}

const originalResolver = require(absoluteResolverPath);
const mockedResolver = { ...originalResolver };

const originalShotEngine = require(absoluteShotEnginePath);
const mockedShotEngine = { ...originalShotEngine };

let powerDriverRolls = 0;
let powerDriverTriggers = 0;
let disableBaseSkills = false;

// Setup basic interceptions
mockedResolver.rollBaseSkill = (lineup: Player[], skillName: any, stamina: Record<string, number>, rateOverride?: number): boolean => {
  if (disableBaseSkills) return false;
  const result = originalResolver.rollBaseSkill(lineup, skillName, stamina, rateOverride);
  if (skillName === "Power Driver") {
    powerDriverRolls++;
    if (result) powerDriverTriggers++;
  }
  return result;
};

mockedResolver.hasBaseSkill = (player: Player, skillName: string): boolean => {
  if (disableBaseSkills) return false;
  return originalResolver.hasBaseSkill(player, skillName);
};

// Track incoming drain amounts
interface DrainRecord {
  targetId: string;
  amount: number;
  actual: number;
  source: string;
}

let activeSource = "";
let capturedDrains: DrainRecord[] = [];

mockedResolver.rollSpecialMechanic = (lineup: Player[], mechanicId: any, stamina: Record<string, number>, scaleFn?: any): boolean => {
  const result = originalResolver.rollSpecialMechanic(lineup, mechanicId, stamina, scaleFn);
  if (mechanicId === "POSTER_SPARK_CONTACT_TAX") {
    if (result) activeSource = "Contact Tax";
  } else if (mechanicId === "POSTER_SPARK_LUNG_BURNER") {
    if (result) activeSource = "Lung Burner";
  }
  return result;
};

mockedResolver.drainStamina = (stamina: Record<string, number>, target: Player, targetLineup: Player[], amount: number): number => {
  const actual = originalResolver.drainStamina(stamina, target, targetLineup, amount);
  capturedDrains.push({
    targetId: target.id,
    amount,
    actual,
    source: activeSource || "Other"
  });
  activeSource = ""; // reset
  return actual;
};

// Inject mocks
require.cache[absoluteResolverPath] = {
  id: absoluteResolverPath,
  filename: absoluteResolverPath,
  loaded: true,
  exports: mockedResolver
} as any;

require.cache[absoluteShotEnginePath] = {
  id: absoluteShotEnginePath,
  filename: absoluteShotEnginePath,
  loaded: true,
  exports: mockedShotEngine
} as any;

// Load matchEngine
const matchEngine = require(absoluteMatchEnginePath);
const { simulateTick, createInitialMatchState, computeEffective } = matchEngine;

function createMockPlayer(
  id: string,
  name: string,
  position: "PG" | "SG" | "SF" | "PF" | "C",
  ovr: number,
  baseSkills: [string, string, string],
  specialSkillSlots: (string | null)[] = [],
  statOverrides: Partial<Player> = {},
  skillRarities: Record<string, string> = {}
): Player {
  return {
    id,
    name,
    position,
    rarity: "Legendary",
    level: 1,
    maxLevel: 50,
    exp: 0,
    ovr,
    offense: 80,
    defense: 75,
    shooting: 75,
    speed: 75,
    strength: 75,
    playmaking: 75,
    baseSkills,
    specialSkillSlots,
    starLevel: 5,
    threePt: 75,
    twoPt: 75,
    freeThrow: 75,
    finishing: 75,
    rebound: 75,
    steal: 70,
    block: 70,
    onBall: 70,
    handle: 75,
    assist: 75,
    calm: 75,
    threePtTendency: 0.25,
    driveTendency: 0.35,
    pullUpTendency: 0.25,
    foulDrawTendency: 0.40,
    skillRarities: skillRarities as any,
    ...statOverrides
  };
}

// Generate test lineups for a given Paint Bully archetype level
function makeLineupWithPaintBullyLevel(prefix: string, level: number, withCT = false, withLB = false): Player[] {
  // Paint Bully candidate skills: Paint Magnet, Power Driver, Mismatch Caller, Glass Touch, Rim Warden, Enforcer Lift, Iron Motor.
  // Level 1: 3 signals
  // Level 2: 5 signals
  // Level 3: 7 signals, >=3 contributors
  
  const pgSkills: [string, string, string] = ["Tempo Surgeon", "Hands Active", "Complete Engine"];
  let sgSkills: [string, string, string] = ["Tempo Switch", "Focus Lock", "Discipline Wall"];
  const sfSkills: [string, string, string] = ["Position Flex", "Shadow Guard", "Discipline Wall"];
  
  let pfSkills: [string, string, string] = ["Paint Barrier", "Focus Lock", "Focus Lock"];
  let cSkills: [string, string, string] = ["Paint Barrier", "Focus Lock", "Focus Lock"];

  if (level === 1) {
    // 3 signals: PF has 2 (Power Driver, Paint Magnet), C has 1 (Power Driver), etc.
    pfSkills = ["Power Driver", "Paint Magnet", "Focus Lock"];
    cSkills = ["Power Driver", "Focus Lock", "Focus Lock"];
  } else if (level === 2) {
    // 5 signals: PF has 3 (Power Driver, Paint Magnet, Mismatch Caller), C has 2 (Power Driver, Rim Warden)
    pfSkills = ["Power Driver", "Paint Magnet", "Mismatch Caller"];
    cSkills = ["Power Driver", "Rim Warden", "Focus Lock"];
  } else if (level === 3) {
    // 7 signals, 3 contributors: PF has 3, C has 3, SG has 1 (Paint Magnet)
    pfSkills = ["Power Driver", "Paint Magnet", "Mismatch Caller"];
    cSkills = ["Power Driver", "Rim Warden", "Glass Touch"];
    sgSkills = ["Paint Magnet", "Focus Lock", "Focus Lock"];
  }

  const specialPF = withCT ? ["Contact Tax X"] : [];
  const specialC = withLB ? ["Lung Burner X"] : [];

  return [
    createMockPlayer(`${prefix}1`, `${prefix} PG`, "PG", 84, pgSkills),
    createMockPlayer(`${prefix}2`, `${prefix} SG`, "SG", level === 3 ? 88 : 84, sgSkills, []),
    createMockPlayer(`${prefix}3`, `${prefix} SF`, "SF", 84, sfSkills),
    createMockPlayer(`${prefix}4`, `${prefix} PF`, "PF", 88, pfSkills, specialPF, { strength: 90, finishing: 90 }),
    createMockPlayer(`${prefix}5`, `${prefix} C`, "C", 88, cSkills, specialC, { strength: 90, finishing: 90 })
  ];
}

function runRebalanceTests() {
  console.log("=== RUNNING CONTACT TAX / LUNG BURNER REBALANCE VALIDATION ===\n");

  const genericAI = () => [
    createMockPlayer("ai1", "AI PG", "PG", 84, ["Tempo Surgeon", "Hands Active", "Complete Engine"]),
    createMockPlayer("ai2", "AI SG", "SG", 84, ["Tempo Switch", "Focus Lock", "Discipline Wall"]),
    createMockPlayer("ai3", "AI SF", "SF", 84, ["Position Flex", "Shadow Guard", "Discipline Wall"]),
    createMockPlayer("ai4", "AI PF", "PF", 84, ["Paint Barrier", "Iron Motor", "Enforcer Lift"], [], { strength: 80 }),
    createMockPlayer("ai5", "AI C", "C", 84, ["Paint Barrier", "Iron Motor", "Enforcer Lift"], [], { strength: 80 })
  ];

  // Helper to trigger Contact Tax on a drive
  const triggerContactTax = (level: number, defenderStamina = 64, isAiOffense = false): number => {
    capturedDrains = [];
    activeSource = "";
    disableBaseSkills = true;
    
    let userLineup = makeLineupWithPaintBullyLevel("u", level, !isAiOffense, false);
    let aiLineup = genericAI();
    if (isAiOffense) {
      // Symmetrical test: AI has Contact Tax
      aiLineup = makeLineupWithPaintBullyLevel("ai", level, true, false);
      userLineup = genericAI();
    }

    let state = createInitialMatchState();
    state.userPlayerIds = userLineup.map(p => p.id);
    state.aiPlayerIds = aiLineup.map(p => p.id);
    state.aiLineupIds = aiLineup.map(p => p.id);
    
    // Set defender stamina
    const defLineup = isAiOffense ? userLineup : aiLineup;
    defLineup.forEach(p => state.playerStamina[p.id] = defenderStamina);
    
    // Setup tick conditions to force close shot
    state.possessionTeam = isAiOffense ? "ai" : "user";
    
    // Force shotEngine.generateShot to return drivingLayup and trigger Contact Tax X
    mockedShotEngine.generateShot = (player: Player) => ({
      type: "drivingLayup",
      is3PT: false,
      desc: "driving layup"
    });
    
    // Force rollSpecialMechanic to succeed for Contact Tax
    mockedResolver.rollSpecialMechanic = (lineup: Player[], mechanicId: any) => {
      if (mechanicId === "POSTER_SPARK_CONTACT_TAX") {
        activeSource = "Contact Tax";
        return true;
      }
      return false;
    };

    let ticks = 0;
    while (capturedDrains.length === 0 && ticks < 200 && !state.isFinished) {
      state.possessionTeam = isAiOffense ? "ai" : "user";
      state.ftSequence = null;
      defLineup.forEach(p => state.playerStamina[p.id] = defenderStamina);
      const eff = computeEffective(userLineup, state.playerStamina, "Post Isolation", "Man-to-Man");
      state = simulateTick(state, eff.off, eff.def, { name: "AI", roster: aiLineup }, userLineup, userLineup);
      ticks++;
    }

    const record = capturedDrains.find(d => d.source === "Contact Tax");
    disableBaseSkills = false;
    if (!record) {
      throw new Error(`Contact Tax X failed to trigger under test conditions (Level: ${level})`);
    }
    return record.amount;
  };

  // Helper to trigger Lung Burner on a made shot
  const triggerLungBurner = (level: number, defenderStamina = 100, isAiOffense = false, forceDebt = false): number => {
    capturedDrains = [];
    activeSource = "";
    disableBaseSkills = true;
    
    let userLineup = makeLineupWithPaintBullyLevel("u", level, false, !isAiOffense);
    let aiLineup = genericAI();
    if (isAiOffense) {
      aiLineup = makeLineupWithPaintBullyLevel("ai", level, false, true);
      userLineup = genericAI();
    }

    let state = createInitialMatchState();
    state.userPlayerIds = userLineup.map(p => p.id);
    state.aiPlayerIds = aiLineup.map(p => p.id);
    state.aiLineupIds = aiLineup.map(p => p.id);
    
    // Set defender stamina
    const defLineup = isAiOffense ? userLineup : aiLineup;
    defLineup.forEach(p => state.playerStamina[p.id] = defenderStamina);
    
    // Setup tick conditions to force a success made close-range shot
    state.possessionTeam = isAiOffense ? "ai" : "user";
    state.userOffStrategy = "Post Isolation";
    state.aiOffStrategy = "Post Isolation";
    
    // Force defender to be marked
    defLineup.forEach(p => {
      state.skillMarks[p.id] = [{ mark: forceDebt ? "Debt" : "Tilted", possessionsLeft: 3, sourceSkill: "Test Setup" }];
    });

    // Mock shotEngine.generateShot to return a driving layup
    mockedShotEngine.generateShot = (player: Player) => ({
      type: "drivingLayup",
      is3PT: false,
      desc: "driving layup"
    });
    
    // Mock rollSpecialMechanic to succeed for Lung Burner, fail for others
    mockedResolver.rollSpecialMechanic = (lineup: Player[], mechanicId: any) => {
      if (mechanicId === "POSTER_SPARK_LUNG_BURNER") {
        activeSource = "Lung Burner";
        return true;
      }
      return false;
    };

    // Override mathEngine success rate checks to guarantee made shot
    const originalMathRandom = Math.random;
    const shotSuccessRegex = new RegExp(`matchEngine\\.(?:ts|js):(${shotSuccessLines.join("|")})\\b`);
    Math.random = () => {
      const err = new Error();
      const stack = err.stack || "";
      if (shotSuccessRegex.test(stack)) {
        return 0.01;
      }
      return 0.99;
    };

    let ticks = 0;
    try {
      while (capturedDrains.length === 0 && ticks < 200 && !state.isFinished) {
        state.possessionTeam = isAiOffense ? "ai" : "user";
        state.ftSequence = null;
        defLineup.forEach(p => {
          state.skillMarks[p.id] = [{ mark: forceDebt ? "Debt" : "Tilted", possessionsLeft: 3, sourceSkill: "Test Setup" }];
          state.playerStamina[p.id] = defenderStamina;
        });
        const eff = computeEffective(userLineup, state.playerStamina, "Post Isolation", "Man-to-Man");
        state = simulateTick(state, eff.off, eff.def, { name: "AI", roster: aiLineup }, userLineup, userLineup);
        ticks++;
      }
    } finally {
      Math.random = originalMathRandom;
    }

    const record = capturedDrains.find(d => d.source === "Lung Burner");
    disableBaseSkills = false;
    if (!record) {
      throw new Error(`Lung Burner X failed to trigger under test conditions (Level: ${level})`);
    }
    return record.amount;
  };



  // --- 1. Contact Tax rebalanced values ---
  const ctVal0 = triggerContactTax(0);
  const ctVal1 = triggerContactTax(1);
  const ctVal2 = triggerContactTax(2);
  const ctVal3 = triggerContactTax(3);

  console.log(`Contact Tax base drains by Paint Bully level:`);
  console.log(`  - Level 0 (None): ${ctVal0} (Expected: 8)`);
  console.log(`  - Level 1 (Bronze): ${ctVal1} (Expected: 10)`);
  console.log(`  - Level 2 (Silver): ${ctVal2} (Expected: 11)`);
  console.log(`  - Level 3 (Gold): ${ctVal3} (Expected: 12)`);

  if (ctVal0 === 8 && ctVal1 === 10 && ctVal2 === 11 && ctVal3 === 12) {
    console.log("✅ Contact Tax level drain values are correct.");
  } else {
    throw new Error("❌ Contact Tax level drain values mismatch.");
  }

  // --- 2. Lung Burner rebalanced values ---
  const lbVal0 = triggerLungBurner(0);
  const lbVal1 = triggerLungBurner(1);
  const lbVal2 = triggerLungBurner(2);
  const lbVal3 = triggerLungBurner(3);

  console.log(`Lung Burner base drains by Paint Bully level:`);
  console.log(`  - Level 0 (None): ${lbVal0} (Expected: 15)`);
  console.log(`  - Level 1 (Bronze): ${lbVal1} (Expected: 20)`);
  console.log(`  - Level 2 (Silver): ${lbVal2} (Expected: 30)`);
  console.log(`  - Level 3 (Gold): ${lbVal3} (Expected: 40)`);

  if (lbVal0 === 15 && lbVal1 === 20 && lbVal2 === 30 && lbVal3 === 40) {
    console.log("✅ Lung Burner level drain values are correct.");
  } else {
    throw new Error("❌ Lung Burner level drain values mismatch.");
  }

  // --- 3. Debt handling check (adds +10, capped at 40) ---
  const lbDebtLevel0 = triggerLungBurner(0, 100, false, true); // base 15 + 10 = 25
  const lbDebtLevel2 = triggerLungBurner(2, 100, false, true); // base 30 + 10 = 40
  const lbDebtLevel3 = triggerLungBurner(3, 100, false, true); // base 40 + 10 = 50 -> capped to 40

  console.log(`Lung Burner Debt drain values:`);
  console.log(`  - Level 0 + Debt: ${lbDebtLevel0} (Expected: 25)`);
  console.log(`  - Level 2 + Debt: ${lbDebtLevel2} (Expected: 40)`);
  console.log(`  - Level 3 + Debt: ${lbDebtLevel3} (Expected: 40)`);

  if (lbDebtLevel0 === 25 && lbDebtLevel2 === 40 && lbDebtLevel3 === 40) {
    console.log("✅ Lung Burner Debt bonus (+10) and hard cap of 40 are correct.");
  } else {
    throw new Error("❌ Lung Burner Debt or Hard Cap validation failed.");
  }

  // --- 4. Anti-snowball scaling check ---
  // Contact Tax Level 3 base 12. 
  // Defender stamina at 40% (< 50%) -> should multiply by 0.60 -> 12 * 0.60 = 7.2 -> Math.round -> 7.
  // Defender stamina at 20% (< 30%) -> should multiply by 0.30 -> 12 * 0.30 = 3.6 -> Math.round -> 4.
  const ctSnowball50 = triggerContactTax(3, 40);
  const ctSnowball30 = triggerContactTax(3, 20);

  console.log(`Contact Tax anti-snowball scaling at Level 3 (base 12):`);
  console.log(`  - Defender Stamina 40% (< 50%): ${ctSnowball50} (Expected: 7)`);
  console.log(`  - Defender Stamina 20% (< 30%): ${ctSnowball30} (Expected: 4)`);

  if (ctSnowball50 === 7 && ctSnowball30 === 4) {
    console.log("✅ Contact Tax anti-snowball scaling is correct.");
  } else {
    throw new Error("❌ Contact Tax anti-snowball scaling validation failed.");
  }

  // Lung Burner Level 3 base 40.
  // Defender stamina at 40% (< 50%) -> 40 * 0.60 = 24.
  // Defender stamina at 20% (< 30%) -> 40 * 0.30 = 12.
  const lbSnowball50 = triggerLungBurner(3, 40);
  const lbSnowball30 = triggerLungBurner(3, 20);

  console.log(`Lung Burner anti-snowball scaling at Level 3 (base 40):`);
  console.log(`  - Defender Stamina 40% (< 50%): ${lbSnowball50} (Expected: 24)`);
  console.log(`  - Defender Stamina 20% (< 30%): ${lbSnowball30} (Expected: 12)`);

  if (lbSnowball50 === 24 && lbSnowball30 === 12) {
    console.log("✅ Lung Burner anti-snowball scaling is correct.");
  } else {
    throw new Error("❌ Lung Burner anti-snowball scaling validation failed.");
  }

  // --- 5. User/AI Symmetry check ---
  const ctUser = triggerContactTax(3, 64, false);
  const ctAI = triggerContactTax(3, 64, true);
  const lbUser = triggerLungBurner(3, 100, false);
  const lbAI = triggerLungBurner(3, 100, true);

  console.log(`User vs AI symmetry:`);
  console.log(`  - Contact Tax: User ${ctUser} | AI ${ctAI}`);
  console.log(`  - Lung Burner: User ${lbUser} | AI ${lbAI}`);

  if (ctUser === ctAI && lbUser === lbAI) {
    console.log("✅ User/AI rebalance paths are completely symmetrical.");
  } else {
    throw new Error("❌ User/AI rebalance paths are asymmetrical.");
  }

  // --- 6. Static Check: Confirm POSTER_SPARK is not implemented or mapped ---
  const skillMechanicsContent = fs.readFileSync(path.resolve(__dirname, "../../lib/skills/skillMechanics.ts"), "utf-8");
  const isPosterSparkMapped = skillMechanicsContent.includes('"POSTER_SPARK":');
  
  const lineupArchetypeContent = fs.readFileSync(path.resolve(__dirname, "../../lib/lineup/lineupArchetypeResolver.ts"), "utf-8");
  const isPosterSparkInResolver = lineupArchetypeContent.includes("POSTER_SPARK");

  console.log(`POSTER_SPARK implementation check:`);
  console.log(`  - Is mapped: ${isPosterSparkMapped ? "Yes" : "No"}`);
  console.log(`  - Is in resolver: ${isPosterSparkInResolver ? "Yes" : "No"}`);

  if (isPosterSparkMapped) {
    console.log("✅ POSTER_SPARK is correctly mapped in skillMechanics.");
  } else {
    throw new Error("❌ POSTER_SPARK is not mapped in skillMechanics.");
  }

  console.log("\n🎉 ALL REBALANCE VALIDATION CHECKS PASSED SUCCESSFULLY!");
}

runRebalanceTests();
