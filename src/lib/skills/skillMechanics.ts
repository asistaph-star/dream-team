import { Player } from "../types/player";
import { SpecialSkillName } from "./assignBaseSkills";

export type SpecialSkillMechanicId =
  | "DEEP_STRIKE_SHOT_BOOST"
  | "DEEP_STRIKE_EXPOSE"
  | "DEEP_STRIKE_FOUL_PRESSURE"
  | "COURT_VISION_RHYTHM_BOOST"
  | "POSTER_SPARK_FINISH_BOOST"
  | "POSTER_SPARK_TILT"
  | "FLOP_FOUL_PRESSURE"
  | "BROKEN_PLAY_RESCUE_SAVE"
  | "SKY_WALL_BLOCK_BOOST"
  | "SKY_WALL_STAMINA_DRAIN"
  | "LOCK_CHAIN_ON_BALL_PRESSURE"
  | "LOCK_CHAIN_HOOKED"
  | "LOCK_CHAIN_STAMINA_DRAIN"
  | "DEFENSIVE_ANCHOR_TEAM_BOOST"
  | "CLEAN_CHALLENGE_CONTEST"
  | "GLASS_STRIKE_REBOUND"
  | "BENCH_CAPTAIN_RECOVERY"
  | "BENCH_CAPTAIN_STABILIZE"
  | "MOMENTUM_SWING_RECOVERY"
  | "COMPOSURE_SHIELD_CANCEL"
  | "GAMEPLAN_JAMMER_STATIC"
  | "TIMEOUT_RESET_CLEANSE";

export const FAMILY_TO_MECHANIC_MAP: Record<SpecialSkillName, SpecialSkillMechanicId[]> = {
  "DEEP_STRIKE": ["DEEP_STRIKE_SHOT_BOOST", "DEEP_STRIKE_EXPOSE", "DEEP_STRIKE_FOUL_PRESSURE"],
  "COURT_VISION_ENGINE": ["COURT_VISION_RHYTHM_BOOST"],
  "POSTER_SPARK": ["POSTER_SPARK_FINISH_BOOST", "POSTER_SPARK_TILT"],
  "FLOP": ["FLOP_FOUL_PRESSURE"],
  "BROKEN_PLAY_RESCUE": ["BROKEN_PLAY_RESCUE_SAVE"],
  "SKY_WALL": ["SKY_WALL_BLOCK_BOOST", "SKY_WALL_STAMINA_DRAIN"],
  "LOCK_CHAIN": ["LOCK_CHAIN_ON_BALL_PRESSURE", "LOCK_CHAIN_HOOKED", "LOCK_CHAIN_STAMINA_DRAIN"],
  "DEFENSIVE_ANCHOR": ["DEFENSIVE_ANCHOR_TEAM_BOOST"],
  "CLEAN_CHALLENGE": ["CLEAN_CHALLENGE_CONTEST"],
  "GLASS_STRIKE": ["GLASS_STRIKE_REBOUND"],
  "BENCH_CAPTAIN": ["BENCH_CAPTAIN_RECOVERY", "BENCH_CAPTAIN_STABILIZE"],
  "MOMENTUM_SWING": ["MOMENTUM_SWING_RECOVERY"],
  "COMPOSURE_SHIELD": ["COMPOSURE_SHIELD_CANCEL"],
  "GAMEPLAN_JAMMER": ["GAMEPLAN_JAMMER_STATIC"],
  "TIMEOUT_RESET": ["TIMEOUT_RESET_CLEANSE"],
};

export const LEGACY_X_TO_FAMILY_MAP: Record<string, SpecialSkillName> = {
  "Red Dot X": "DEEP_STRIKE",
  "Four-Point Bait X": "DEEP_STRIKE",
  "Lung Burner X": "POSTER_SPARK",
  "Contact Tax X": "POSTER_SPARK",
  "Chain Pass X": "COURT_VISION_ENGINE",
  "Flop X": "FLOP",
  "Dead Air X": "GAMEPLAN_JAMMER",
  "Debt Collector X": "GAMEPLAN_JAMMER",
  "Pressure Coach X": "BENCH_CAPTAIN",
  "Cage Step X": "LOCK_CHAIN",
  "Corner Trap X": "DEFENSIVE_ANCHOR",
  "Five-Man Squeeze X": "DEFENSIVE_ANCHOR",
  "Clean Contest X": "CLEAN_CHALLENGE",
  "Composure X": "COMPOSURE_SHIELD",
  "Cold Timeout X": "TIMEOUT_RESET",
};

export const resolveSpecialSkillMechanics = (familySkill: SpecialSkillName): SpecialSkillMechanicId[] => {
  return FAMILY_TO_MECHANIC_MAP[familySkill] || [];
};

export const doesSkillMatchMechanic = (familySkill: SpecialSkillName, mechanicId: SpecialSkillMechanicId): boolean => {
  const mechanics = resolveSpecialSkillMechanics(familySkill);
  return mechanics.includes(mechanicId);
};
