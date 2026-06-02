import { SkillTier } from "../players/playerCardTypes";

export type SpecialSkillFamilyCategory = "OFFENSE" | "DEFENSE" | "COMPREHENSIVE";

export type SpecialSkillFamilyId =
  // OFFENSE
  | "DEEP_STRIKE"
  | "COURT_VISION_ENGINE"
  | "POSTER_SPARK"
  | "HANGTIME_FINISH"
  | "BROKEN_PLAY_RESCUE"
  // DEFENSE
  | "SKY_WALL"
  | "LOCK_CHAIN"
  | "DEFENSIVE_ANCHOR"
  | "CLEAN_CHALLENGE"
  | "GLASS_STRIKE"
  // COMPREHENSIVE
  | "BENCH_CAPTAIN"
  | "MOMENTUM_SWING"
  | "COMPOSURE_SHIELD"
  | "GAMEPLAN_JAMMER"
  | "TIMEOUT_RESET";

export interface SpecialSkillFamilyDefinition {
  id: SpecialSkillFamilyId;
  baseName: string;
  category: SpecialSkillFamilyCategory;
  role: string;
  shortDescription: string;
  identityHelpers: string[];
  riskLevel: "SAFE" | "MEDIUM" | "HIGH";
  replacesLegacySkills: string[];
  allowedTiers: SkillTier[];
}

export const SPECIAL_SKILL_FAMILIES: Record<SpecialSkillFamilyId, SpecialSkillFamilyDefinition> = {
  // === OFFENSE ===
  DEEP_STRIKE: {
    id: "DEEP_STRIKE",
    baseName: "Deep Strike",
    category: "OFFENSE",
    role: "3PT pressure / rare 3+1 moment",
    shortDescription: "Boosts chance of 3PT pressure moment and interacts with Exposed.",
    identityHelpers: ["getThreePtRating", "getFoulDrawTendency"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Red Dot X", "Four-Point Bait X", "Flop X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  COURT_VISION_ENGINE: {
    id: "COURT_VISION_ENGINE",
    baseName: "Court Vision Engine",
    category: "OFFENSE",
    role: "Team offense rhythm / offensive IQ boost",
    shortDescription: "Provides a small team shot creation boost on assists.",
    identityHelpers: ["getAssistRating", "getHandleRating", "getOffenseRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Chain Pass X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  POSTER_SPARK: {
    id: "POSTER_SPARK",
    baseName: "Poster Spark",
    category: "OFFENSE",
    role: "Highlight dunk / strong finish moment",
    shortDescription: "Creates strong finish or poster moments with minor localized stamina pressure.",
    identityHelpers: ["getFinishingRating", "getStrengthRating"],
    riskLevel: "MEDIUM",
    replacesLegacySkills: ["Lung Burner X", "Contact Tax X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  HANGTIME_FINISH: {
    id: "HANGTIME_FINISH",
    baseName: "Hangtime Finish",
    category: "OFFENSE",
    role: "2+1 / tough contact finish",
    shortDescription: "High chance to convert contact into a 2+1.",
    identityHelpers: ["getFinishingRating", "getFoulDrawTendency", "getCalmRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: [],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  BROKEN_PLAY_RESCUE: {
    id: "BROKEN_PLAY_RESCUE",
    baseName: "Broken Play Rescue",
    category: "OFFENSE",
    role: "Save a messy possession",
    shortDescription: "Rare clutch ability to recover a near-turnover into a tough 2PT or 2+1.",
    identityHelpers: ["getHandleRating", "getFinishingRating", "getCalmRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: [],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },

  // === DEFENSE ===
  SKY_WALL: {
    id: "SKY_WALL",
    baseName: "Sky Wall",
    category: "DEFENSE",
    role: "Block / rim protection moment",
    shortDescription: "Triggers intense block pressure and stops interior momentum.",
    identityHelpers: ["getBlockRating", "getOnBallDefenseRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: [],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  LOCK_CHAIN: {
    id: "LOCK_CHAIN",
    baseName: "Lock Chain",
    category: "DEFENSE",
    role: "Steal / perimeter disruption moment",
    shortDescription: "Triggers perimeter steal pressure creating transition opportunities.",
    identityHelpers: ["getStealRating", "getOnBallDefenseRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Cage Step X", "Debt Collector X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  DEFENSIVE_ANCHOR: {
    id: "DEFENSIVE_ANCHOR",
    baseName: "Defensive Anchor",
    category: "DEFENSE",
    role: "Team defense IQ boost",
    shortDescription: "Provides a stable team defensive control boost that does not stack.",
    identityHelpers: ["getOnBallDefenseRating", "getBlockRating", "getStealRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Corner Trap X", "Five-Man Squeeze X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  CLEAN_CHALLENGE: {
    id: "CLEAN_CHALLENGE",
    baseName: "Clean Challenge",
    category: "DEFENSE",
    role: "Cancel bad foul / clean contest",
    shortDescription: "Counters foul baiting and prevents foul pressure from converting.",
    identityHelpers: ["getOnBallDefenseRating", "getCalmRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Clean Contest X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  GLASS_STRIKE: {
    id: "GLASS_STRIKE",
    baseName: "Glass Strike",
    category: "DEFENSE",
    role: "Offensive rebound putback",
    shortDescription: "Satisfying chance to instantly score on a putback after an offensive rebound.",
    identityHelpers: ["getReboundRating", "getFinishingRating", "getStrengthRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: [],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },

  // === COMPREHENSIVE / UTILITY ===
  BENCH_CAPTAIN: {
    id: "BENCH_CAPTAIN",
    baseName: "Bench Captain",
    category: "COMPREHENSIVE",
    role: "Bench stamina recovery leadership",
    shortDescription: "Improves stamina recovery for benched players. Does not stack.",
    identityHelpers: ["getAssistRating", "getStaminaRating", "getCalmRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Pressure Coach X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  MOMENTUM_SWING: {
    id: "MOMENTUM_SWING",
    baseName: "Momentum Swing",
    category: "COMPREHENSIVE",
    role: "Possession swing / team energy boost",
    shortDescription: "Chance to gain possession or recover team rhythm with minor stamina recovery.",
    identityHelpers: ["getCalmRating", "getAssistRating", "getStaminaRating"],
    riskLevel: "MEDIUM",
    replacesLegacySkills: [],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  COMPOSURE_SHIELD: {
    id: "COMPOSURE_SHIELD",
    baseName: "Composure Shield",
    category: "COMPREHENSIVE",
    role: "Mental counter / pressure resistance",
    shortDescription: "Cleanly counters foul pressure, Tilted marks, or bad momentum.",
    identityHelpers: ["getCalmRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Composure X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  GAMEPLAN_JAMMER: {
    id: "GAMEPLAN_JAMMER",
    baseName: "Gameplan Jammer",
    category: "COMPREHENSIVE",
    role: "Block or weaken one opponent skill",
    shortDescription: "Tactically blocks one opponent special skill trigger. Does not stack.",
    identityHelpers: ["getOnBallDefenseRating", "getCalmRating", "getAssistRating"],
    riskLevel: "HIGH",
    replacesLegacySkills: ["Dead Air X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  TIMEOUT_RESET: {
    id: "TIMEOUT_RESET",
    baseName: "Timeout Reset",
    category: "COMPREHENSIVE",
    role: "Cleanse pressure / reset marks",
    shortDescription: "Cleanses marks or reduces pressure during low-stamina moments.",
    identityHelpers: ["getCalmRating", "getStaminaRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Cold Timeout X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  }
};

export const getSpecialSkillFamilyDefinition = (id: string): SpecialSkillFamilyDefinition | undefined => {
  return SPECIAL_SKILL_FAMILIES[id as SpecialSkillFamilyId];
};

export const getAllSpecialSkillFamilies = (): SpecialSkillFamilyDefinition[] => {
  return Object.values(SPECIAL_SKILL_FAMILIES);
};

export const isSpecialSkillFamilyId = (id: string): boolean => {
  return !!SPECIAL_SKILL_FAMILIES[id as SpecialSkillFamilyId];
};
