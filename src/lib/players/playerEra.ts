import { Player } from "../types/player";
import { CardEra, SkillTier } from "./playerCardTypes";

export const getDefaultCardEra = (player: Player): CardEra => {
  return player.cardEra ?? "CURRENT";
};

export const getDefaultSkillTier = (player: Player): SkillTier => {
  if (player.skillTier) return player.skillTier;
  
  // Safe default: existing players with no metadata
  const era = getDefaultCardEra(player);
  switch (era) {
    case "PRIME": return "PRIME";
    case "LEGEND": return "LEGACY";
    default: return "STANDARD";
  }
};

export const getSkillTierSuffix = (skillTier: SkillTier): string => {
  switch (skillTier) {
    case "PRIME": return "Prime";
    case "LEGACY": return "Legacy";
    case "SIGNATURE": return "Signature";
    case "STANDARD":
    default:
      return "";
  }
};

export const normalizeCardEra = (value: string | undefined | null): CardEra => {
  if (!value) return "CURRENT";
  const upper = value.toUpperCase();
  if (upper === "PRIME" || upper === "LEGEND" || upper === "CURRENT") {
    return upper as CardEra;
  }
  return "CURRENT";
};

export const normalizeSkillTier = (value: string | undefined | null): SkillTier => {
  if (!value) return "STANDARD";
  const upper = value.toUpperCase();
  if (upper === "PRIME" || upper === "LEGACY" || upper === "SIGNATURE" || upper === "STANDARD") {
    return upper as SkillTier;
  }
  return "STANDARD";
};
