// test_court_vision_mechanic_ownership.ts
// Phase: CourtVisionMechanicOwnershipAudit
// Validates that Court Vision Engine does not apply marks (Debt, Hooked),
// does not drain stamina, and maps only to COURT_VISION_RHYTHM_BOOST.
// Validates that Hooked belongs exclusively to Lock Chain.

import * as fs from 'fs';
import * as path from 'path';

console.log("=== Running Court Vision Mechanic Ownership Validation ===");

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
  "shotPossessionResolver.ts",
  "userPossessionResolver.ts",
  "aiPossessionResolver.ts",
  "possessionHelpers.ts",
  "skillHooks.ts",
  "markLifecycle.ts",
  "matchTick.ts",
  "reboundResolver.ts"
];

// 1. Court Vision must NOT call addMark with "Hooked" anywhere in the engine
console.log("\n--- Check 1: Court Vision must not apply Hooked ---");
engineFiles.forEach(file => {
  const filePath = path.join(engineDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes("addMark") && line.includes("Hooked") && line.includes("Court Vision")) {
      assert(false, `${file}:${idx + 1} Court Vision applies Hooked mark: "${line.trim()}"`);
    }
  });
});
assert(true, "Court Vision does not apply Hooked in any engine file");

// 2. Court Vision must NOT call addMark with "Debt" anywhere in the engine
console.log("\n--- Check 2: Court Vision must not apply Debt ---");
engineFiles.forEach(file => {
  const filePath = path.join(engineDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes("addMark") && line.includes("Debt") && line.includes("Court Vision")) {
      assert(false, `${file}:${idx + 1} Court Vision applies Debt mark: "${line.trim()}"`);
    }
  });
});
assert(true, "Court Vision does not apply Debt in any engine file");

// 3. Court Vision must NOT mention Debt in user-facing event messages
console.log("\n--- Check 3: Court Vision must not mention Debt in events ---");
engineFiles.forEach(file => {
  const filePath = path.join(engineDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes("Court Vision") && line.includes("Debt") && (line.includes("makeEvent") || line.includes("push") || line.includes("skillLog"))) {
      assert(false, `${file}:${idx + 1} Court Vision mentions Debt in event: "${line.trim()}"`);
    }
  });
});
assert(true, "Court Vision does not mention Debt in any event message");

// 4. Court Vision must NOT mention Hooked in user-facing event messages
console.log("\n--- Check 4: Court Vision must not mention Hooked in events ---");
engineFiles.forEach(file => {
  const filePath = path.join(engineDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes("Court Vision") && line.includes("Hooked") && (line.includes("makeEvent") || line.includes("push") || line.includes("skillLog"))) {
      assert(false, `${file}:${idx + 1} Court Vision mentions Hooked in event: "${line.trim()}"`);
    }
  });
});
assert(true, "Court Vision does not mention Hooked in any event message");

// 5. Hooked is ONLY owned by Lock Chain (LOCK_CHAIN_HOOKED)
console.log("\n--- Check 5: Hooked ownership belongs only to Lock Chain ---");
engineFiles.forEach(file => {
  const filePath = path.join(engineDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes("addMark") && line.includes("Hooked")) {
      const isLockChain = line.includes("LOCK_CHAIN_HOOKED");
      assert(isLockChain, `${file}:${idx + 1} Hooked mark must be owned by LOCK_CHAIN_HOOKED, got: "${line.trim()}"`);
    }
  });
});
assert(true, "All Hooked mark applications belong to Lock Chain");

// 6. Debt is not applied by any active skill in gameplay
console.log("\n--- Check 6: Debt is not active in gameplay ---");
engineFiles.forEach(file => {
  const filePath = path.join(engineDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes("addMark") && line.includes('"Debt"')) {
      assert(false, `${file}:${idx + 1} Debt mark is still being applied: "${line.trim()}"`);
    }
  });
});
assert(true, "Debt is not applied in any engine file");

// 7. Court Vision still has rhythm/assist behavior (check event messages exist)
console.log("\n--- Check 7: Court Vision still has rhythm/assist behavior ---");
let hasRhythmEvent = false;
engineFiles.forEach(file => {
  const filePath = path.join(engineDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes("Court Vision Engine builds passing rhythm")) {
    hasRhythmEvent = true;
  }
});
assert(hasRhythmEvent, "Court Vision Engine rhythm event message exists in engine files");

// Check rhythm behavior in possession resolvers
const userPossPath = path.join(engineDir, "userPossessionResolver.ts");
const aiPossPath = path.join(engineDir, "aiPossessionResolver.ts");

if (fs.existsSync(userPossPath)) {
  const content = fs.readFileSync(userPossPath, 'utf8');
  assert(content.includes("COURT_VISION_RHYTHM_BOOST"), "userPossessionResolver.ts uses COURT_VISION_RHYTHM_BOOST");
}
if (fs.existsSync(aiPossPath)) {
  const content = fs.readFileSync(aiPossPath, 'utf8');
  assert(content.includes("COURT_VISION_RHYTHM_BOOST"), "aiPossessionResolver.ts uses COURT_VISION_RHYTHM_BOOST");
}

// 8. Court Vision maps to COURT_VISION_RHYTHM_BOOST in skillMechanics
console.log("\n--- Check 8: Court Vision maps to COURT_VISION_RHYTHM_BOOST ---");
const skillMechanicsPath = path.join(skillsDir, "skillMechanics.ts");
if (fs.existsSync(skillMechanicsPath)) {
  const content = fs.readFileSync(skillMechanicsPath, 'utf8');
  assert(
    content.includes('"COURT_VISION_ENGINE": ["COURT_VISION_RHYTHM_BOOST"]'),
    "skillMechanics.ts maps COURT_VISION_ENGINE to COURT_VISION_RHYTHM_BOOST"
  );
  // Ensure no Debt or Hooked mechanic IDs are mapped to Court Vision
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes("COURT_VISION_ENGINE")) {
      assert(!line.includes("DEBT"), `skillMechanics.ts:${idx + 1} Court Vision must not map to DEBT mechanic`);
      assert(!line.includes("HOOKED"), `skillMechanics.ts:${idx + 1} Court Vision must not map to HOOKED mechanic`);
    }
  });
} else {
  assert(false, "skillMechanics.ts not found");
}

// 9. No stamina drain is attached to Court Vision
console.log("\n--- Check 9: No stamina drain attached to Court Vision ---");
engineFiles.forEach(file => {
  const filePath = path.join(engineDir, file);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let inCourtVisionBlock = false;
  lines.forEach((line, idx) => {
    if (line.includes("COURT_VISION_RHYTHM_BOOST")) {
      inCourtVisionBlock = true;
    }
    if (inCourtVisionBlock) {
      if (line.includes("drainStamina") || line.includes("staminaDrain") || line.includes("stamina_drain")) {
        assert(false, `${file}:${idx + 1} stamina drain found in Court Vision block: "${line.trim()}"`);
      }
      // End the block detection at closing brace at same or lower indentation
      if (line.trim() === '}' || line.trim() === '})') {
        inCourtVisionBlock = false;
      }
    }
  });
});
assert(true, "No stamina drain is attached to Court Vision in any engine file");

// 10. Court Vision description is clean in skillCatalog
console.log("\n--- Check 10: Court Vision catalog description is clean ---");
const skillCatalogPath = path.join(skillsDir, "skillCatalog.ts");
if (fs.existsSync(skillCatalogPath)) {
  const content = fs.readFileSync(skillCatalogPath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes("COURT_VISION_ENGINE") && line.includes(":")) {
      assert(!line.includes("Debt"), `skillCatalog.ts:${idx + 1} Court Vision description must not mention Debt`);
      assert(!line.includes("Hooked"), `skillCatalog.ts:${idx + 1} Court Vision description must not mention Hooked`);
      assert(!line.includes("stamina drain"), `skillCatalog.ts:${idx + 1} Court Vision description must not mention stamina drain`);
    }
  });
}

// 11. Court Vision family definition is clean in skillFamilies
console.log("\n--- Check 11: Court Vision family definition is clean ---");
const skillFamiliesPath = path.join(skillsDir, "skillFamilies.ts");
if (fs.existsSync(skillFamiliesPath)) {
  const content = fs.readFileSync(skillFamiliesPath, 'utf8');
  // Find the COURT_VISION_ENGINE block
  const cvStart = content.indexOf('COURT_VISION_ENGINE:');
  if (cvStart >= 0) {
    const cvBlock = content.substring(cvStart, content.indexOf('},', cvStart) + 2);
    assert(!cvBlock.includes("Debt"), "Court Vision family block must not reference Debt");
    assert(!cvBlock.includes("Hooked"), "Court Vision family block must not reference Hooked");
    assert(!cvBlock.includes("drain"), "Court Vision family block must not reference drain");
  }
}

console.log("\n--- Final Status ---");
if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} errors:`);
  errors.forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log("All Court Vision mechanic ownership validation checks passed successfully.");
}
