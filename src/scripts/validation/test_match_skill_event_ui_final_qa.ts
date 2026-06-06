// test_match_skill_event_ui_final_qa.ts
import * as fs from 'fs';
import * as path from 'path';

console.log("=== Running Match Skill Event UI Final QA Validation ===");

const errors: string[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    errors.push(`FAIL: ${message}`);
    console.error(`❌ ${message}`);
  } else {
    console.log(`✅ ${message}`);
  }
}

// 1. Audit match engine files and UI components for legacy X strings and raw official IDs in user-facing text
const matchUiFiles = [
  "src/lib/match/engine/aiPossessionResolver.ts",
  "src/lib/match/engine/userPossessionResolver.ts",
  "src/lib/match/engine/possessionHelpers.ts",
  "src/lib/match/engine/shotPossessionResolver.ts",
  "src/lib/match/engine/reboundResolver.ts",
  "src/lib/match/engine/matchTick.ts",
  "src/lib/match/engine/eventLogBuilder.ts",
  "src/features/match/components/PlayerTooltip.tsx"
];

const legacyXNames = [
  "Red Dot X", "Four-Point Bait X", "Lung Burner X", "Chain Pass X", "Debt Collector X",
  "Five-Man Squeeze X", "Cold Timeout X", "Dead Air X", "Clean Contest X", "Contact Tax X",
  "Cage Step X", "Corner Trap X", "Pressure Coach X", "Flop X", "Composure X"
];

const rawOfficialIDs = [
  "DEEP_STRIKE", "COURT_VISION_ENGINE", "POSTER_SPARK", "FLOP", "BROKEN_PLAY_RESCUE",
  "SKY_WALL", "LOCK_CHAIN", "DEFENSIVE_ANCHOR", "CLEAN_CHALLENGE", "GLASS_STRIKE",
  "BENCH_CAPTAIN"
];

const toxicWording = [
  "stamina nuke", "massive stamina drain", "stamina bleed", "recovery block",
  "enemy drain", "guaranteed 2+1", "guaranteed 3+1", "guaranteed free throws",
  "guaranteed score", "random possession steal"
];

// Audit text in match files
matchUiFiles.forEach(fileRelPath => {
  const filePath = path.join(process.cwd(), fileRelPath);
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${fileRelPath}`);
    return;
  }
  const content = fs.readFileSync(filePath, 'utf8');

  // Verify no legacy X names appear in user-facing logging/events (e.g. within quotes or backticks)
  legacyXNames.forEach(name => {
    if (content.includes(name)) {
      assert(false, `${fileRelPath} contains legacy X name "${name}"`);
    }
  });

  // Verify no raw official IDs are used directly in user-facing message strings (e.g. SKY_WALL: is a prefix)
  rawOfficialIDs.forEach(id => {
    const colonPattern = new RegExp(`"${id}:"|'${id}:'|\`${id}:\``, 'i');
    if (colonPattern.test(content) || content.includes(`"${id}:`) || content.includes(`'${id}:`) || content.includes(`\`${id}:`)) {
      assert(false, `${fileRelPath} contains raw official ID prefix like "${id}:"`);
    }
  });

  // Verify no toxic wording remains in UI files
  toxicWording.forEach(word => {
    if (content.toLowerCase().includes(word.toLowerCase())) {
      assert(false, `${fileRelPath} contains toxic wording "${word}"`);
    }
  });

  // Court Vision Engine checks
  if (content.includes("Court Vision")) {
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes("Court Vision") && (line.includes("Debt") || line.includes("Hooked")) && (line.includes("push") || line.includes("skillLog") || line.includes("addEvent") || line.includes("makeEvent"))) {
        assert(false, `${fileRelPath}:${idx + 1} Court Vision Engine displays Debt or Hooked wording in user-facing message: "${line.trim()}"`);
      }
    });
  }

  // Stamina drain messages can only mention opponent stamina drain for Sky Wall and Lock Chain.
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const isLogOrEvent = line.includes("skillLog") || line.includes("push") || line.includes("addEvent") || line.includes("makeEvent");
    if (isLogOrEvent && line.toLowerCase().includes("stamina") && line.toLowerCase().includes("opponent")) {
      const isAllowed = line.includes("Sky Wall") || line.includes("Lock Chain") || line.includes("SKY_WALL") || line.includes("LOCK_CHAIN");
      assert(isAllowed, `${fileRelPath}:${idx + 1} opponent stamina drain is mentioned, but not with Sky Wall or Lock Chain: "${line.trim()}"`);
    }
  });
});

// 2. Validate PlayerTooltip mark descriptions
const tooltipPath = path.join(process.cwd(), "src/features/match/components/PlayerTooltip.tsx");
if (fs.existsSync(tooltipPath)) {
  const content = fs.readFileSync(tooltipPath, 'utf8');
  assert(content.includes("Exposed: 'perimeter pressure'"), "Tooltip should define Exposed description");
  assert(content.includes("Tilted: 'mental/foul discipline pressure'"), "Tooltip should define Tilted description");
  assert(content.includes("Hooked: 'drive/pass pressure'"), "Tooltip should define Hooked description");
  assert(content.includes("Pinned: 'positioning pressure'"), "Tooltip should define Pinned description");
  assert(content.includes("Static: 'tactical disruption'"), "Tooltip should define Static description");
} else {
  assert(false, "PlayerTooltip.tsx not found");
}

console.log("\n--- Final Status ---");
if (errors.length > 0) {
  console.error(`❌ Validation failed with ${errors.length} errors:`);
  errors.forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log("✅ All match skill event UI final QA validation checks passed successfully!");
}
