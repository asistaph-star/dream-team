import { SkillTier } from "../players/playerCardTypes";

export type SpecialSkillFamilyCategory = "OFFENSE" | "DEFENSE" | "COMPREHENSIVE";

export type SpecialSkillFamilyId =
  // OFFENSE
  | "DEEP_STRIKE"
  | "COURT_VISION_ENGINE"
  | "POSTER_SPARK"
  | "FLOP"
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
    role: "Perimeter pressure and 3PT gravity",
    shortDescription: "Gives a small 3PT shot-quality boost and applies Exposed.",
    identityHelpers: ["getThreePtRating", "getFoulDrawTendency"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Red Dot X", "Four-Point Bait X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  COURT_VISION_ENGINE: {
    id: "COURT_VISION_ENGINE",
    baseName: "Court Vision Engine",
    category: "OFFENSE",
    role: "Team offensive rhythm and passing IQ",
    shortDescription: "Provides a small shot creation boost on assists and reduces bad-shot penalty.",
    identityHelpers: ["getAssistRating", "getHandleRating", "getOffenseRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Chain Pass X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  POSTER_SPARK: {
    id: "POSTER_SPARK",
    baseName: "Poster Spark",
    category: "OFFENSE",
    role: "Rim pressure and highlight finishing",
    shortDescription: "Gives a small finish boost and applies Tilted on strong paint attacks.",
    identityHelpers: ["getFinishingRating", "getStrengthRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Lung Burner X", "Contact Tax X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  FLOP: {
    id: "FLOP",
    baseName: "Flop",
    category: "OFFENSE",
    role: "Foul pressure / contact selling",
    shortDescription: "Adds small foul pressure on contact shots or drives.",
    identityHelpers: ["getFoulDrawTendency", "getCalmRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Flop X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  BROKEN_PLAY_RESCUE: {
    id: "BROKEN_PLAY_RESCUE",
    baseName: "Broken Play Rescue",
    category: "OFFENSE",
    role: "Rare turnover rescue",
    shortDescription: "Rarely cancels a near-turnover into a tough 2PT rescue shot.",
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
    role: "Rim protection and block momentum",
    shortDescription: "Boosts block pressure and drains small stamina from all opponents after a successful block.",
    identityHelpers: ["getBlockRating", "getOnBallDefenseRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: [],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  LOCK_CHAIN: {
    id: "LOCK_CHAIN",
    baseName: "Lock Chain",
    category: "DEFENSE",
    role: "On-ball pressure and steal momentum",
    shortDescription: "Increases turnover pressure, applies Hooked, and drains small stamina after a successful steal.",
    identityHelpers: ["getStealRating", "getOnBallDefenseRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Cage Step X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  DEFENSIVE_ANCHOR: {
    id: "DEFENSIVE_ANCHOR",
    baseName: "Defensive Anchor",
    category: "DEFENSE",
    role: "Team defensive IQ and rotation structure",
    shortDescription: "Gives a small team contest and rotation boost while on court.",
    identityHelpers: ["getOnBallDefenseRating", "getBlockRating", "getStealRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Corner Trap X", "Five-Man Squeeze X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  CLEAN_CHALLENGE: {
    id: "CLEAN_CHALLENGE",
    baseName: "Clean Challenge",
    category: "DEFENSE",
    role: "Clean contest and foul-bait counter",
    shortDescription: "Reduces foul-bait effects and lowers bad foul chance.",
    identityHelpers: ["getOnBallDefenseRating", "getCalmRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Clean Contest X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  GLASS_STRIKE: {
    id: "GLASS_STRIKE",
    baseName: "Glass Strike",
    category: "DEFENSE",
    role: "Rebounding and putback timing",
    shortDescription: "Improves offensive rebound timing and gives controlled putback chance.",
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
    role: "Rotation support",
    shortDescription: "Speeds up bench stamina recovery and stabilizes form for tired teammates.",
    identityHelpers: ["getAssistRating", "getStaminaRating", "getCalmRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Pressure Coach X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  MOMENTUM_SWING: {
    id: "MOMENTUM_SWING",
    baseName: "Momentum Swing",
    category: "COMPREHENSIVE",
    role: "Controlled momentum recovery",
    shortDescription: "After a block, steal, or forced turnover, gives small momentum recovery and helps lowest-stamina teammate.",
    identityHelpers: ["getCalmRating", "getAssistRating", "getStaminaRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: [],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  COMPOSURE_SHIELD: {
    id: "COMPOSURE_SHIELD",
    baseName: "Composure Shield",
    category: "COMPREHENSIVE",
    role: "Anti-tilt and foul-bait protection",
    shortDescription: "Protects team from Tilted, foul-bait pressure, and momentum collapse.",
    identityHelpers: ["getCalmRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Composure X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  GAMEPLAN_JAMMER: {
    id: "GAMEPLAN_JAMMER",
    baseName: "Gameplan Jammer",
    category: "COMPREHENSIVE",
    role: "Tactical disruption",
    shortDescription: "Temporarily weakens one opponent special-skill trigger and can apply Static.",
    identityHelpers: ["getOnBallDefenseRating", "getCalmRating", "getAssistRating"],
    riskLevel: "SAFE",
    replacesLegacySkills: ["Dead Air X", "Debt Collector X"],
    allowedTiers: ["STANDARD", "PRIME", "LEGACY", "SIGNATURE"]
  },
  TIMEOUT_RESET: {
    id: "TIMEOUT_RESET",
    baseName: "Timeout Reset",
    category: "COMPREHENSIVE",
    role: "Cleanse and reset",
    shortDescription: "Triggers on low team stamina to clear limited marks and recover tired players.",
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
