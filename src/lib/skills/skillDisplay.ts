import { SkillTier } from "../players/playerCardTypes";
import { getSkillTierSuffix } from "../players/playerEra";
import { isLegacySpecialSkillName } from "./skillMigration";

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

export const getSkillDisplaySuffix = (skillTier: SkillTier | undefined): string => {
  return getSkillTierSuffix(skillTier || "ACTIVE");
};

export const formatSkillName = (skillId: string, skillTier?: SkillTier): string => {
  // Legacy safeguard: keep the old string exactly as is for UI consistency until they are replaced
  if (isLegacySpecialSkillName(skillId)) {
    return skillId;
  }
  
  const baseName = getSkillBaseName(skillId);
  const suffix = getSkillDisplaySuffix(skillTier);
  
  if (suffix) {
    return `${baseName} ${suffix}`;
  }
  
  return baseName;
};
