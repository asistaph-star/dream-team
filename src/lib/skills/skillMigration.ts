import { Player } from "../types/player";
import { SpecialSkillFamilyId, isSpecialSkillFamilyId } from "./skillFamilies";
import { getSkillDisplayName } from "./skillDisplay";

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

const LEGACY_SKILL_NAMES = Object.keys(LEGACY_TO_FAMILY_MAP);

export const isLegacySpecialSkillName = (rawSkill: string): boolean => {
  return LEGACY_SKILL_NAMES.includes(rawSkill);
};

export const normalizeSpecialSkillId = (rawSkill: string): string => {
  if (LEGACY_TO_FAMILY_MAP[rawSkill]) {
    return LEGACY_TO_FAMILY_MAP[rawSkill];
  }
  return rawSkill;
};

export interface MigrationResult {
  legacyName: string;
  futureSkillId: string;
  displayName: string;
}

export const migrateLegacySpecialSkill = (rawSkill: string): MigrationResult => {
  const familyId = normalizeSpecialSkillId(rawSkill);
  return {
    legacyName: rawSkill,
    futureSkillId: familyId,
    displayName: getSkillDisplayName(familyId)
  };
};

export const migratePlayerSpecialSkillSlots = (player: Player): (string | null)[] => {
  if (!player.specialSkillSlots) return [null, null];
  
  return player.specialSkillSlots.map(slot => {
    if (!slot) return null;
    return normalizeSpecialSkillId(slot);
  });
};

export const migratePlayerSpecialSkills = (player: Player): Player => {
  const specialSkillSlots = migratePlayerSpecialSkillSlots(player);

  const skillRarities: Record<string, 'Common' | 'Rare' | 'Elite' | 'Epic' | 'Legendary'> = {};
  if (player.skillRarities) {
    for (const [key, value] of Object.entries(player.skillRarities)) {
      const migratedKey = normalizeSpecialSkillId(key);
      skillRarities[migratedKey] = value;
    }
  }

  const skillTiers: Record<string, 'Base' | 'X' | 'XR' | 'XR-ULT'> = {};
  if (player.skillTiers) {
    for (const [key, value] of Object.entries(player.skillTiers)) {
      const migratedKey = normalizeSpecialSkillId(key);
      skillTiers[migratedKey] = value;
    }
  }

  return {
    ...player,
    specialSkillSlots,
    skillRarities,
    skillTiers,
  };
};

// Phase 2A4: Family-Aware Skill Resolver Helpers

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
