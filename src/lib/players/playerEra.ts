import { Player } from "../types/player";
import { CardEra, SkillTier } from "./playerCardTypes";

export const getDefaultCardEra = (player: Player): CardEra => {
  return player.cardEra ?? "ACTIVE";
};

export const getDefaultSkillTier = (player: Player): SkillTier => {
  if (player.skillTier) return player.skillTier;
  
  // Safe default: existing players with no metadata
  const era = getDefaultCardEra(player);
  switch (era) {
    case "PEAK": return "X";
    case "LEGEND": return "XR";
    default: return "ACTIVE";
  }
};

export const getSkillTierSuffix = (skillTier: SkillTier): string => {
  switch (skillTier) {
    case "X": return "X";
    case "XR": return "XR";
    case "XR_ULT": return "XR-ULT";
    case "ACTIVE":
    default:
      return "";
  }
};

export const normalizeCardEra = (value: string | undefined | null): CardEra => {
  if (!value) return "ACTIVE";
  const upper = value.toUpperCase();
  if (upper === "PEAK" || upper === "LEGEND" || upper === "ACTIVE") {
    return upper as CardEra;
  }
  return "ACTIVE";
};

export const normalizeSkillTier = (value: string | undefined | null): SkillTier => {
  if (!value) return "ACTIVE";
  const upper = value.toUpperCase();
  if (upper === "X" || upper === "XR" || upper === "XR_ULT" || upper === "ACTIVE") {
    return upper as SkillTier;
  }
  return "ACTIVE";
};
