import * as fs from "fs";
import * as path from "path";

let testsFailed = false;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`[FAIL] Assertion failed: ${message}`);
    testsFailed = true;
  } else {
    console.log(`[PASS] ${message}`);
  }
}

function run() {
  console.log("=== RUNNING PLAYER ATTRIBUTE UI DISPLAY VALIDATION ===");

  const playerCardPath = path.resolve(__dirname, "../../components/player/PlayerCard.tsx");
  const hexProfileModalPath = path.resolve(__dirname, "../../components/player/PlayerHexProfileModal.tsx");

  // Verify file existence
  assert(fs.existsSync(playerCardPath), "PlayerCard.tsx file exists");
  assert(fs.existsSync(hexProfileModalPath), "PlayerHexProfileModal.tsx file exists");

  const playerCardContent = fs.readFileSync(playerCardPath, "utf-8");
  const hexModalContent = fs.readFileSync(hexProfileModalPath, "utf-8");

  // 1. PlayerCard tooltip checks
  console.log("--- 1. PlayerCard Tooltip Stats Content Checks ---");
  assert(playerCardContent.includes("Basketball IQ"), "PlayerCard.tsx contains Basketball IQ label");
  assert(playerCardContent.includes("Hustle"), "PlayerCard.tsx contains Hustle label");
  assert(playerCardContent.includes("Finishing"), "PlayerCard.tsx contains Finishing label");
  assert(playerCardContent.includes("Assist"), "PlayerCard.tsx contains Assist label");
  assert(playerCardContent.includes("getDetailedAttributes"), "PlayerCard.tsx imports getDetailedAttributes");

  // 2. PlayerHexProfileModal splits/secondary attributes checks
  console.log("--- 2. PlayerHexProfileModal Secondary Panel Checks ---");
  assert(hexModalContent.includes("Physical / Effort"), "PlayerHexProfileModal contains Physical / Effort panel title");
  assert(hexModalContent.includes("Basketball IQ"), "PlayerHexProfileModal contains Basketball IQ in detailed attributes list");
  assert(hexModalContent.includes("Hustle"), "PlayerHexProfileModal contains Hustle in detailed attributes list");
  assert(hexModalContent.includes("Finishing"), "PlayerHexProfileModal contains Finishing in detailed attributes list");
  assert(hexModalContent.includes("Speed"), "PlayerHexProfileModal contains Speed in detailed attributes list");
  assert(hexModalContent.includes("Strength"), "PlayerHexProfileModal contains Strength in detailed attributes list");
  assert(hexModalContent.includes("Stamina"), "PlayerHexProfileModal contains Stamina in detailed attributes list");

  // 3. PlayerHexProfileModal star-up upgrade preview card checks (positive changes & protected fields)
  console.log("--- 3. PlayerHexProfileModal Star-Up Preview Checks ---");
  assert(hexModalContent.includes("Gameplay Upgrades"), "PlayerHexProfileModal has Gameplay Upgrades section in rank-up preview");
  assert(hexModalContent.includes("Protected Fields"), "PlayerHexProfileModal has Protected Fields section in rank-up preview");
  assert(hexModalContent.includes("OVR Rating"), "PlayerHexProfileModal has OVR Rating under protected section");
  assert(hexModalContent.includes("Salary"), "PlayerHexProfileModal has Salary under protected section");
  assert(hexModalContent.includes("Rarity"), "PlayerHexProfileModal has Rarity under protected section");
  assert(hexModalContent.includes("Tendencies"), "PlayerHexProfileModal has Tendencies under protected section");
  assert(hexModalContent.includes("No change (Protected)"), "PlayerHexProfileModal marks tendencies as no change");
  assert(hexModalContent.includes("Basketball IQ (Half-Rate)"), "PlayerHexProfileModal lists Basketball IQ with half-rate indicator");
  assert(hexModalContent.includes("Hustle (Full-Rate)"), "PlayerHexProfileModal lists Hustle with full-rate indicator");

  if (testsFailed) {
    console.error("[FAIL] Player attribute UI display checks failed.");
    process.exit(1);
  } else {
    console.log("[SUCCESS] All player attribute UI display checks passed successfully.");
    process.exit(0);
  }
}

run();
