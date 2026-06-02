import { Player } from "../types/player";

const LEGACY_SKILL_NAMES = [
  "Red Dot X",
  "Four-Point Bait X",
  "Lung Burner X",
  "Chain Pass X",
  "Debt Collector X",
  "Five-Man Squeeze X",
  "Cold Timeout X",
  "Dead Air X",
  "Clean Contest X",
  "Contact Tax X",
  "Cage Step X",
  "Corner Trap X",
  "Pressure Coach X",
  "Flop X",
  "Composure X"
];

export const isLegacySpecialSkillName = (rawSkill: string): boolean => {
  return LEGACY_SKILL_NAMES.includes(rawSkill);
};

export const normalizeSpecialSkillId = (rawSkill: string): string => {
  // Phase 2A1: We do NOT migrate to new IDs yet because matchEngine still requires the old strings.
  // We simply pass through the raw skill string to preserve compatibility.
  return rawSkill;
};

export interface MigrationResult {
  legacyName: string;
  futureSkillId: string;
  displayName: string;
}

export const migrateLegacySpecialSkill = (rawSkill: string): MigrationResult => {
  // Temporary pass-through until Phase 2A3 (Engine Mechanics Replacement)
  return {
    legacyName: rawSkill,
    futureSkillId: rawSkill, // Still using legacy string as ID for engine compatibility
    displayName: rawSkill
  };
};

export const migratePlayerSpecialSkillSlots = (player: Player): (string | null)[] => {
  if (!player.specialSkillSlots) return [null, null];
  
  return player.specialSkillSlots.map(slot => {
    if (!slot) return null;
    // For Phase 2A1, we just return the normalized ID which is still the legacy string
    return normalizeSpecialSkillId(slot);
  });
};
