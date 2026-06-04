import { SkillTier } from "../players/playerCardTypes";
import { getSkillTierSuffix } from "../players/playerEra";

export const LEGACY_SKILL_DISPLAY_NAMES: Record<string, string> = {
  "Red Dot X": "Deep Strike",
  "Four-Point Bait X": "Deep Strike",
  "Lung Burner X": "Poster Spark",
  "Chain Pass X": "Court Vision Engine",
  "Debt Collector X": "Gameplan Jammer",
  "Five-Man Squeeze X": "Defensive Anchor",
  "Cold Timeout X": "Timeout Reset",
  "Dead Air X": "Gameplan Jammer",
  "Clean Contest X": "Clean Challenge",
  "Contact Tax X": "Poster Spark",
  "Cage Step X": "Lock Chain",
  "Corner Trap X": "Defensive Anchor",
  "Pressure Coach X": "Bench Captain",
  "Flop X": "Flop",
  "Composure X": "Composure Shield",
};

export const getSkillBaseName = (skillId: string): string => {
  // If the skill is already an old legacy string (like "Lung Burner X"), we just strip the X for display if we can,
  // but for legacy compatibility we might just return it. 
  // Let's do a basic strip if it ends with " X".
  if (skillId.endsWith(" X")) {
    return skillId.substring(0, skillId.length - 2);
  }
  
  // Future implementation: convert "DEEP_STRIKE" to "Deep Strike"
  return skillId.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

export const getSkillDisplayName = (skillId: string): string => {
  if (LEGACY_SKILL_DISPLAY_NAMES[skillId]) {
    return LEGACY_SKILL_DISPLAY_NAMES[skillId];
  }
  return getSkillBaseName(skillId);
};

export const getSkillDisplaySuffix = (skillTier: SkillTier | undefined): string => {
  return getSkillTierSuffix(skillTier || "STANDARD");
};

export const formatSkillName = (skillId: string, skillTier?: SkillTier): string => {
  const baseName = getSkillDisplayName(skillId);
  const suffix = getSkillDisplaySuffix(skillTier);
  
  if (suffix) {
    return `${baseName} ${suffix}`;
  }
  
  return baseName;
};
