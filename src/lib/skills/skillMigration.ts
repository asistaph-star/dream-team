import { Player } from "../types/player";
import { SpecialSkillFamilyId, isSpecialSkillFamilyId } from "./skillFamilies";

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

// Phase 2A4: Family-Aware Skill Resolver Helpers

export const LEGACY_TO_FAMILY_MAP: Record<string, SpecialSkillFamilyId> = {
  "Red Dot X": "DEEP_STRIKE",
  "Four-Point Bait X": "DEEP_STRIKE",
  "Chain Pass X": "COURT_VISION_ENGINE",
  "Lung Burner X": "POSTER_SPARK",
  "Contact Tax X": "POSTER_SPARK",
  "Flop X": "FLOP",
  "Clean Contest X": "CLEAN_CHALLENGE",
  "Composure X": "COMPOSURE_SHIELD",
  "Cold Timeout X": "TIMEOUT_RESET",
  "Dead Air X": "GAMEPLAN_JAMMER",
  "Cage Step X": "LOCK_CHAIN",
  "Corner Trap X": "DEFENSIVE_ANCHOR",
  "Debt Collector X": "GAMEPLAN_JAMMER",
  "Five-Man Squeeze X": "DEFENSIVE_ANCHOR",
  "Pressure Coach X": "BENCH_CAPTAIN",
};

export const resolveSpecialSkillFamily = (rawSkill: string): SpecialSkillFamilyId | null => {
  if (isSpecialSkillFamilyId(rawSkill)) {
    return rawSkill as SpecialSkillFamilyId;
  }
  return LEGACY_TO_FAMILY_MAP[rawSkill] || null;
};

export const doesSkillMatchFamily = (rawSkill: string, familyId: SpecialSkillFamilyId): boolean => {
  return resolveSpecialSkillFamily(rawSkill) === familyId;
};

export const hasSpecialSkillFamily = (player: Player, familyId: SpecialSkillFamilyId): boolean => {
  if (!player.specialSkillSlots) return false;
  return player.specialSkillSlots.some(slot => slot && doesSkillMatchFamily(slot, familyId));
};

export const getPlayerSpecialSkillFamilies = (player: Player): SpecialSkillFamilyId[] => {
  if (!player.specialSkillSlots) return [];
  
  const families = player.specialSkillSlots
    .map(slot => slot ? resolveSpecialSkillFamily(slot) : null)
    .filter((family): family is SpecialSkillFamilyId => family !== null);
    
  return Array.from(new Set(families));
};

export const wouldCreateDuplicateFamily = (player: Player, rolledSkillOrFamilyId: string): boolean => {
  const rolledFamily = resolveSpecialSkillFamily(rolledSkillOrFamilyId);
  if (!rolledFamily) return false; // If unknown, it's not a known duplicate family
  
  return hasSpecialSkillFamily(player, rolledFamily);
};

