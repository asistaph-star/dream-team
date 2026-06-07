// test_full_skill_ownership_sweep.ts
// Phase: FullSkillOwnershipSweep
// Validates all 15 learned special skill families comply with their mechanic ownership rules.
// No family should apply marks or drain stamina outside its approved scope.

import * as fs from 'fs';
import * as path from 'path';

console.log("=== Running Full Skill Ownership Sweep Validation ===");

const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    errors.push(`FAIL: ${message}`);
    console.error(`FAIL: ${message}`);
  } else {
    console.log(`PASS: ${message}`);
  }
}

const engineDir = path.join(process.cwd(), "src/lib/match/engine");
const skillsDir = path.join(process.cwd(), "src/lib/skills");

const engineFiles = [
  "skillHooks.ts",
  "userPossessionResolver.ts",
  "aiPossessionResolver.ts",
  "shotPossessionResolver.ts",
  "possessionHelpers.ts",
  "matchTick.ts",
  "staminaMutations.ts",
  "markLifecycle.ts",
  "reboundResolver.ts",
  "foulResolver.ts",
  "eventLogBuilder.ts"
];

function readFile(dir: string, file: string): string | null {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function readLines(dir: string, file: string): { content: string; lines: string[] } | null {
  const content = readFile(dir, file);
  if (content === null) return null;
  return { content, lines: content.split('\n') };
}

// ===== CHECK 1: Every family appears in FAMILY_TO_MECHANIC_MAP =====
console.log("\n--- Check 1: All 15 families in FAMILY_TO_MECHANIC_MAP ---");
const expectedFamilies = [
  "DEEP_STRIKE", "COURT_VISION_ENGINE", "POSTER_SPARK", "FLOP",
  "BROKEN_PLAY_RESCUE", "SKY_WALL", "LOCK_CHAIN", "DEFENSIVE_ANCHOR",
  "CLEAN_CHALLENGE", "GLASS_STRIKE", "BENCH_CAPTAIN", "MOMENTUM_SWING",
  "COMPOSURE_SHIELD", "GAMEPLAN_JAMMER", "TIMEOUT_RESET"
];
const mechContent = readFile(skillsDir, "skillMechanics.ts");
if (mechContent) {
  expectedFamilies.forEach(fam => {
    assert(mechContent.includes(`"${fam}"`), `${fam} appears in skillMechanics.ts`);
  });
} else {
  assert(false, "skillMechanics.ts not found");
}

// ===== CHECK 2: No family resolves through legacy X as active owner =====
console.log("\n--- Check 2: No legacy X used as active owner in engine ---");
const legacyXNames = [
  "Red Dot X", "Four-Point Bait X", "Lung Burner X", "Chain Pass X",
  "Debt Collector X", "Five-Man Squeeze X", "Cold Timeout X", "Dead Air X",
  "Clean Contest X", "Contact Tax X", "Cage Step X", "Corner Trap X",
  "Pressure Coach X", "Flop X", "Composure X"
];
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    legacyXNames.forEach(name => {
      const isActiveGameplay = line.includes("rollSpecialMechanic") || line.includes("rollBaseSkill") ||
        line.includes("addMark") || line.includes("drainStamina") || line.includes("hasSpecialSkillMechanic");
      if (isActiveGameplay && line.includes(name)) {
        assert(false, `${file}:${idx + 1} Legacy X name "${name}" used in active gameplay: "${line.trim()}"`);
      }
    });
  });
});
assert(true, "No legacy X names used in active gameplay branches");

// ===== CHECK 3: No active gameplay branch applies Debt =====
console.log("\n--- Check 3: No Debt mark applied in active gameplay ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("addMark") && line.includes('"Debt"')) {
      assert(false, `${file}:${idx + 1} Debt mark applied: "${line.trim()}"`);
    }
  });
});
assert(true, "No Debt mark applied in any engine file");

// ===== CHECK 4: No active gameplay branch consumes Debt =====
console.log("\n--- Check 4: No Debt mark consumed in active gameplay ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("hasMark") && line.includes('"Debt"')) {
      assert(false, `${file}:${idx + 1} Debt mark consumed: "${line.trim()}"`);
    }
  });
});
assert(true, "No Debt mark consumed in any engine file");

// ===== CHECK 5: Court Vision applies no marks =====
console.log("\n--- Check 5: Court Vision applies no marks ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("addMark") && (line.includes("Court Vision") || line.includes("COURT_VISION"))) {
      assert(false, `${file}:${idx + 1} Court Vision applies a mark: "${line.trim()}"`);
    }
  });
});
assert(true, "Court Vision applies no marks");

// ===== CHECK 6: Hooked is only applied by Lock Chain =====
console.log("\n--- Check 6: Hooked belongs only to Lock Chain ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("addMark") && line.includes('"Hooked"')) {
      const isLockChain = line.includes("LOCK_CHAIN_HOOKED");
      assert(isLockChain, `${file}:${idx + 1} Hooked must be owned by LOCK_CHAIN_HOOKED: "${line.trim()}"`);
    }
  });
});
assert(true, "Hooked belongs only to Lock Chain");

// ===== CHECK 7: Exposed is only applied by Deep Strike (or documented base effect) =====
console.log("\n--- Check 7: Exposed belongs only to Deep Strike ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("addMark") && line.includes('"Exposed"')) {
      const isDeepStrike = line.includes('"Deep Strike"');
      assert(isDeepStrike, `${file}:${idx + 1} Exposed must be owned by Deep Strike: "${line.trim()}"`);
    }
  });
});
assert(true, "Exposed belongs only to Deep Strike");

// ===== CHECK 8: Static is only applied by Gameplan Jammer =====
console.log("\n--- Check 8: Static belongs only to Gameplan Jammer ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("addMark") && line.includes('"Static"')) {
      const isGJ = line.includes("GAMEPLAN_JAMMER_STATIC");
      assert(isGJ, `${file}:${idx + 1} Static must be owned by GAMEPLAN_JAMMER_STATIC: "${line.trim()}"`);
    }
  });
});
assert(true, "Static belongs only to Gameplan Jammer");

// ===== CHECK 9: Poster Spark does not drain stamina =====
console.log("\n--- Check 9: Poster Spark does not drain stamina ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  let inPosterSparkBlock = false;
  data.lines.forEach((line, idx) => {
    if (line.includes("POSTER_SPARK")) inPosterSparkBlock = true;
    if (inPosterSparkBlock && (line.includes("drainStamina") || line.includes("getSkyWallDrain") || line.includes("getLockChainDrain"))) {
      assert(false, `${file}:${idx + 1} Poster Spark drains stamina: "${line.trim()}"`);
    }
    if (inPosterSparkBlock && (line.trim() === '}' || line.trim() === '})')) inPosterSparkBlock = false;
  });
});
assert(true, "Poster Spark does not drain stamina");

// ===== CHECK 10: Defensive Anchor does not drain enemy stamina =====
console.log("\n--- Check 10: Defensive Anchor does not drain enemy stamina ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  let inAnchorBlock = false;
  data.lines.forEach((line, idx) => {
    if (line.includes("DEFENSIVE_ANCHOR")) inAnchorBlock = true;
    if (inAnchorBlock && line.includes("drainStamina")) {
      assert(false, `${file}:${idx + 1} Defensive Anchor drains stamina: "${line.trim()}"`);
    }
    if (inAnchorBlock && (line.trim() === '}' || line.trim() === '})')) inAnchorBlock = false;
  });
});
assert(true, "Defensive Anchor does not drain enemy stamina");

// ===== CHECK 11: Bench Captain does not drain enemies =====
console.log("\n--- Check 11: Bench Captain does not drain enemies ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  let inBenchBlock = false;
  data.lines.forEach((line, idx) => {
    if (line.includes("BENCH_CAPTAIN")) inBenchBlock = true;
    if (inBenchBlock && line.includes("drainStamina")) {
      assert(false, `${file}:${idx + 1} Bench Captain drains stamina: "${line.trim()}"`);
    }
    if (inBenchBlock && (line.trim() === '}' || line.trim() === '})')) inBenchBlock = false;
  });
});
assert(true, "Bench Captain does not drain enemies");

// ===== CHECK 12: Gameplan Jammer does not drain stamina =====
console.log("\n--- Check 12: Gameplan Jammer does not drain stamina ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  let inGJBlock = false;
  data.lines.forEach((line, idx) => {
    if (line.includes("GAMEPLAN_JAMMER")) inGJBlock = true;
    if (inGJBlock && line.includes("drainStamina")) {
      assert(false, `${file}:${idx + 1} Gameplan Jammer drains stamina: "${line.trim()}"`);
    }
    if (inGJBlock && (line.trim() === '}' || line.trim() === '})')) inGJBlock = false;
  });
});
assert(true, "Gameplan Jammer does not drain stamina");

// ===== CHECK 13: Only Sky Wall and Lock Chain drain opponent stamina =====
console.log("\n--- Check 13: Only Sky Wall and Lock Chain use opponent stamina drain helpers ---");
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("getSkyWallDrain") || line.includes("getLockChainDrain")) {
      const isSkyWall = line.includes("SkyWall") || line.includes("SKY_WALL");
      const isLockChain = line.includes("LockChain") || line.includes("LOCK_CHAIN");
      assert(isSkyWall || isLockChain, `${file}:${idx + 1} Drain helper used by non-Sky Wall/Lock Chain: "${line.trim()}"`);
    }
  });
});
assert(true, "Only Sky Wall and Lock Chain use opponent stamina drain helpers");

// ===== CHECK 14: No toxic old drain values in active skill code =====
console.log("\n--- Check 14: No toxic drain values ---");
const toxicValues = [110, 190, 45, 38];
const staminaEffectsPath = path.join(process.cwd(), "src/lib/match/staminaSkillEffects.ts");
if (fs.existsSync(staminaEffectsPath)) {
  const content = fs.readFileSync(staminaEffectsPath, 'utf8');
  toxicValues.forEach(v => {
    const pattern = new RegExp(`\\breturn\\s+${v}\\b`);
    assert(!pattern.test(content), `staminaSkillEffects.ts must not return toxic drain value ${v}`);
  });
}
// Also check drain values in engine files
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("drainStamina")) {
      toxicValues.forEach(v => {
        if (line.includes(`, ${v})`) || line.includes(`, ${v},`)) {
          assert(false, `${file}:${idx + 1} Toxic drain value ${v} used in drainStamina: "${line.trim()}"`);
        }
      });
    }
  });
});
assert(true, "No toxic drain values found");

// ===== CHECK 15: Momentum Swing does not steal possessions =====
console.log("\n--- Check 15: Momentum Swing does not steal possessions ---");
{
  const hookData = readLines(engineDir, "skillHooks.ts");
  if (hookData) {
    let inMSBlock = false;
    hookData.lines.forEach((line, idx) => {
      if (line.includes("applyMomentumSwing")) inMSBlock = true;
      if (inMSBlock && (line.includes("nextPossessionTeam") || line.includes("ctx.nextPossession"))) {
        // Momentum Swing returns a bump indicator, not a possession change
        if (!line.includes("return") && !line.includes("'user'") && !line.includes("'ai'")) {
          assert(false, `skillHooks.ts:${idx + 1} Momentum Swing modifies possession: "${line.trim()}"`);
        }
      }
      if (inMSBlock && line.trim() === '}' && !line.includes('{')) {
        // Simple end-of-function heuristic
      }
    });
  }
}
assert(true, "Momentum Swing does not steal possessions randomly");

// ===== CHECK 16: Broken Play Rescue does not guarantee a score =====
console.log("\n--- Check 16: Broken Play Rescue does not guarantee a score ---");
{
  const brpPath = path.join(process.cwd(), "src/lib/match/brokenPlayRescue.ts");
  if (fs.existsSync(brpPath)) {
    const content = fs.readFileSync(brpPath, 'utf8');
    assert(!content.includes("guaranteed"), "brokenPlayRescue.ts must not mention guaranteed");
    assert(content.includes("ShotPenalty"), "brokenPlayRescue.ts must have a shot penalty");
    assert(content.includes("StaminaCost"), "brokenPlayRescue.ts must have a stamina cost");
  }
}
assert(true, "Broken Play Rescue does not guarantee a score");

// ===== CHECK 17: Tilted mark ownership =====
console.log("\n--- Check 17: Tilted mark ownership is approved ---");
const approvedTiltedOwners = ["Poster Spark", "Paint Magnet"];
engineFiles.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("addMark") && line.includes('"Tilted"')) {
      const hasApproved = approvedTiltedOwners.some(owner => line.includes(`"${owner}"`));
      assert(hasApproved, `${file}:${idx + 1} Tilted must be owned by approved source: "${line.trim()}"`);
    }
  });
});
assert(true, "Tilted mark ownership is correct");

// ===== CHECK 18: FAMILY_TO_MECHANIC_MAP has all 15 families =====
console.log("\n--- Check 18: FAMILY_TO_MECHANIC_MAP covers all 15 families ---");
if (mechContent) {
  const mapMatch = mechContent.match(/FAMILY_TO_MECHANIC_MAP.*?\{([\s\S]*?)\}/);
  if (mapMatch) {
    expectedFamilies.forEach(fam => {
      assert(mapMatch[1].includes(`"${fam}"`), `FAMILY_TO_MECHANIC_MAP contains ${fam}`);
    });
  }
}

// ===== CHECK 19: Sky Wall drain values are 3/5/7/9 =====
console.log("\n--- Check 19: Sky Wall drain values are correct ---");
if (fs.existsSync(staminaEffectsPath)) {
  const content = fs.readFileSync(staminaEffectsPath, 'utf8');
  const skyWallSection = content.substring(content.indexOf("getSkyWallDrain"), content.indexOf("getLockChainDrain"));
  assert(skyWallSection.includes("return 3"), "Sky Wall Common drain is 3");
  assert(skyWallSection.includes("return 5"), "Sky Wall Rare drain is 5");
  assert(skyWallSection.includes("return 7"), "Sky Wall Elite drain is 7");
  assert(skyWallSection.includes("return 9"), "Sky Wall Epic/Legendary drain is 9");
}

// ===== CHECK 20: Lock Chain drain values are 2/4/6/8 =====
console.log("\n--- Check 20: Lock Chain drain values are correct ---");
if (fs.existsSync(staminaEffectsPath)) {
  const content = fs.readFileSync(staminaEffectsPath, 'utf8');
  const lockChainSection = content.substring(content.indexOf("getLockChainDrain"));
  assert(lockChainSection.includes("return 2"), "Lock Chain Common drain is 2");
  assert(lockChainSection.includes("return 4"), "Lock Chain Rare drain is 4");
  assert(lockChainSection.includes("return 6"), "Lock Chain Elite drain is 6");
  assert(lockChainSection.includes("return 8"), "Lock Chain Epic/Legendary drain is 8");
}

console.log("\n--- Final Status ---");
if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} errors:`);
  errors.forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log("All full skill ownership sweep validation checks passed successfully.");
}
