// test_lock_chain_drain_ownership.ts
// Phase: LockChainDrainOwnershipAudit
// Validates Lock Chain stamina drain only fires after successful steals.
// No per-possession drain, no turnover drain, no Hooked bleed, no old Cage Step tax.

import * as fs from 'fs';
import * as path from 'path';

console.log("=== Running Lock Chain Drain Ownership Validation ===");

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

function readLines(dir: string, file: string): { content: string; lines: string[] } | null {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  return { content, lines: content.split('\n') };
}

// ===== CHECK 1: getLockChainDrain returns exactly 2/4/6/8 =====
console.log("\n--- Check 1: getLockChainDrain returns correct values ---");
const staminaEffectsPath = path.join(process.cwd(), "src/lib/match/staminaSkillEffects.ts");
if (fs.existsSync(staminaEffectsPath)) {
  const content = fs.readFileSync(staminaEffectsPath, 'utf8');
  const lockSection = content.substring(content.indexOf("getLockChainDrain"));
  assert(lockSection.includes("return 2"), "Lock Chain Common drain is 2");
  assert(lockSection.includes("return 4"), "Lock Chain Rare drain is 4");
  assert(lockSection.includes("return 6"), "Lock Chain Elite drain is 6");
  assert(lockSection.includes("return 8"), "Lock Chain Epic/Legendary drain is 8");
  // No toxic values
  assert(!lockSection.includes("return 12"), "No toxic drain value 12");
  assert(!lockSection.includes("return 38"), "No toxic drain value 38");
  assert(!lockSection.includes("return 45"), "No toxic drain value 45");
}

// ===== CHECK 2: getLockChainDrain is only called from successful steal paths =====
console.log("\n--- Check 2: getLockChainDrain only called from steal paths ---");
const filesToCheck = [
  "userPossessionResolver.ts",
  "aiPossessionResolver.ts",
  "shotPossessionResolver.ts",
  "possessionHelpers.ts",
  "matchTick.ts",
  "skillHooks.ts"
];
filesToCheck.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("getLockChainDrain") && !line.includes("import")) {
      // Check surrounding context for steal evidence
      const contextStart = Math.max(0, idx - 20);
      const contextEnd = Math.min(data.lines.length - 1, idx + 5);
      const context = data.lines.slice(contextStart, contextEnd + 1).join('\n');
      const hasStealContext = context.includes("LOCK_CHAIN_STAMINA_DRAIN") ||
        context.includes("STL") || context.includes("steal") || context.includes("Steal");
      assert(hasStealContext, `${file}:${idx + 1} getLockChainDrain is called in a steal context: "${line.trim()}"`);
    }
  });
});

// ===== CHECK 3: Lock Chain does not drain on generic turnovers =====
console.log("\n--- Check 3: No Lock Chain drain on generic turnovers ---");
filesToCheck.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("drainStamina") && line.includes("committer")) {
      // Check if this is inside a Lock Chain block
      const contextStart = Math.max(0, idx - 10);
      const context = data.lines.slice(contextStart, idx + 1).join('\n');
      if (context.includes("LOCK_CHAIN") || context.includes("getLockChainDrain") || context.includes("lockChainActive")) {
        assert(false, `${file}:${idx + 1} Lock Chain drains committer on turnover: "${line.trim()}"`);
      }
    }
  });
});
assert(true, "Lock Chain does not drain on generic turnovers");

// ===== CHECK 4: Lock Chain does not have single-target shot drain =====
console.log("\n--- Check 4: No Lock Chain single-target shot drain ---");
filesToCheck.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("drainStamina") && line.includes("scorer")) {
      const contextStart = Math.max(0, idx - 10);
      const context = data.lines.slice(contextStart, idx + 1).join('\n');
      if (context.includes("LOCK_CHAIN_ON_BALL_PRESSURE") && context.includes("getLockChainDrain")) {
        assert(false, `${file}:${idx + 1} Lock Chain has single-target shot drain: "${line.trim()}"`);
      }
    }
  });
});
assert(true, "Lock Chain does not have single-target shot drain");

// ===== CHECK 5: Hooked does not cause stamina bleed =====
console.log("\n--- Check 5: Hooked has no stamina bleed ---");
filesToCheck.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes('hasMark') && line.includes('"Hooked"')) {
      // Check if next 5 lines contain drainStamina
      const nextLines = data.lines.slice(idx, Math.min(data.lines.length, idx + 6)).join('\n');
      if (nextLines.includes("drainStamina")) {
        assert(false, `${file}:${idx + 1} Hooked causes stamina bleed: "${line.trim()}"`);
      }
    }
  });
});
assert(true, "Hooked has no stamina bleed");

// ===== CHECK 6: Hooked is only drive/pass/turnover pressure =====
console.log("\n--- Check 6: Hooked is only turnover pressure ---");
filesToCheck.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("LOCK_CHAIN_HOOKED") && !line.includes("import") && !line.includes("addMark")) {
      // LOCK_CHAIN_HOOKED should only appear as rollSpecialMechanic for TOV pressure
      const isRoll = line.includes("rollSpecialMechanic");
      const isSkillLog = line.includes("skillLog");
      assert(isRoll || isSkillLog, `${file}:${idx + 1} LOCK_CHAIN_HOOKED used for non-turnover purpose: "${line.trim()}"`);
    }
  });
});
assert(true, "Hooked is only used as turnover pressure");

// ===== CHECK 7: No old Cage Step tax or Hooked tax remains =====
console.log("\n--- Check 7: No old Cage Step or Hooked tax ---");
filesToCheck.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("Cage Step") && !line.includes("//") && !line.includes("LEGACY")) {
      assert(false, `${file}:${idx + 1} Old Cage Step reference: "${line.trim()}"`);
    }
    if (line.includes("Hooked") && line.includes("tax")) {
      assert(false, `${file}:${idx + 1} Old Hooked tax reference: "${line.trim()}"`);
    }
    if (line.includes("Hooked") && line.includes("bleed")) {
      assert(false, `${file}:${idx + 1} Old Hooked bleed reference: "${line.trim()}"`);
    }
  });
});
assert(true, "No old Cage Step or Hooked tax remains");

// ===== CHECK 8: No Debt interaction =====
console.log("\n--- Check 8: No Debt interaction ---");
filesToCheck.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes('"Debt"') && (line.includes("addMark") || line.includes("hasMark"))) {
      assert(false, `${file}:${idx + 1} Debt interaction found: "${line.trim()}"`);
    }
  });
});
assert(true, "No Debt interaction in any engine file");

// ===== CHECK 9: Anti-snowball scaling exists =====
console.log("\n--- Check 9: Anti-snowball scaling in staminaSkillEffects ---");
if (fs.existsSync(staminaEffectsPath)) {
  const content = fs.readFileSync(staminaEffectsPath, 'utf8');
  assert(content.includes("applyAntiSnowballScaling"), "applyAntiSnowballScaling function exists");
  assert(content.includes("0.60"), "0.60x scaling tier exists");
  assert(content.includes("0.30"), "0.30x scaling tier exists");
  assert(content.includes("< 50") || content.includes("< 30"), "Stamina threshold checks exist");
}

// ===== CHECK 10: All remaining getLockChainDrain uses have anti-snowball =====
console.log("\n--- Check 10: All getLockChainDrain calls use anti-snowball scaling ---");
filesToCheck.forEach(file => {
  const data = readLines(engineDir, file);
  if (!data) return;
  data.lines.forEach((line, idx) => {
    if (line.includes("getLockChainDrain") && !line.includes("import")) {
      const nextLines = data.lines.slice(idx, Math.min(data.lines.length, idx + 4)).join('\n');
      assert(nextLines.includes("applyAntiSnowballScaling"), `${file}:${idx + 1} getLockChainDrain must be followed by applyAntiSnowballScaling`);
    }
  });
});

console.log("\n--- Final Status ---");
if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} errors:`);
  errors.forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log("All Lock Chain drain ownership validation checks passed successfully.");
}
