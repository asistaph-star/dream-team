import { Player } from "../types/player";

export type SpecialSkillMechanicId =
  | "DEEP_STRIKE_EXPOSE_SETUP"
  | "DEEP_STRIKE_FOUR_POINT_BAIT"
  | "POSTER_SPARK_LUNG_BURNER"
  | "POSTER_SPARK_CONTACT_TAX"
  | "COURT_VISION_CHAIN_PASS"
  | "FLOP_SELL_CONTACT"
  | "GAMEPLAN_DEAD_AIR"
  | "GAMEPLAN_DEBT_COLLECTOR"
  | "GAMEPLAN_PRESSURE_COACH"
  | "LOCK_CHAIN_CAGE_STEP"
  | "DEFENSIVE_ANCHOR_CORNER_TRAP"
  | "DEFENSIVE_ANCHOR_FIVE_MAN_SQUEEZE"
  | "CLEAN_CHALLENGE_CONTEST"
  | "COMPOSURE_SHIELD_CANCEL"
  | "TIMEOUT_RESET_CLEANSE"
  | "COURT_VISION_RHYTHM"
  | "BENCH_CAPTAIN_STABILIZE"
  | "LOCK_CHAIN_ON_BALL_PRESSURE"
  | "SKY_WALL_RIM_PRESSURE"
  | "DEFENSIVE_ANCHOR_TEAM_PRESSURE"
  | "GLASS_STRIKE_REBOUND";

export const LEGACY_TO_MECHANIC_MAP: Record<string, SpecialSkillMechanicId[]> = {
  // Family Skills (Official)
  "DEEP_STRIKE": ["DEEP_STRIKE_EXPOSE_SETUP", "DEEP_STRIKE_FOUR_POINT_BAIT"],
  "POSTER_SPARK": ["POSTER_SPARK_LUNG_BURNER", "POSTER_SPARK_CONTACT_TAX"],
  "FLOP": ["FLOP_SELL_CONTACT"],
  "SKY_WALL": ["SKY_WALL_RIM_PRESSURE"],
  "LOCK_CHAIN": ["LOCK_CHAIN_ON_BALL_PRESSURE", "LOCK_CHAIN_CAGE_STEP"],
  "DEFENSIVE_ANCHOR": ["DEFENSIVE_ANCHOR_TEAM_PRESSURE", "DEFENSIVE_ANCHOR_CORNER_TRAP", "DEFENSIVE_ANCHOR_FIVE_MAN_SQUEEZE"],
  "CLEAN_CHALLENGE": ["CLEAN_CHALLENGE_CONTEST"],
  "GLASS_STRIKE": ["GLASS_STRIKE_REBOUND"],
  "COURT_VISION_ENGINE": ["COURT_VISION_RHYTHM", "COURT_VISION_CHAIN_PASS"],
  "BENCH_CAPTAIN": ["BENCH_CAPTAIN_STABILIZE", "GAMEPLAN_PRESSURE_COACH"],
  "COMPOSURE_SHIELD": ["COMPOSURE_SHIELD_CANCEL"],
  "GAMEPLAN_JAMMER": ["GAMEPLAN_DEAD_AIR", "GAMEPLAN_DEBT_COLLECTOR"],
  "TIMEOUT_RESET": ["TIMEOUT_RESET_CLEANSE"],
  "MOMENTUM_SWING": [],
  "BROKEN_PLAY_RESCUE": [],

  // Legacy Skills (Compatibility Lookup)
  "Red Dot X": ["DEEP_STRIKE_EXPOSE_SETUP"],
  "Four-Point Bait X": ["DEEP_STRIKE_FOUR_POINT_BAIT"],
  "Lung Burner X": ["POSTER_SPARK_LUNG_BURNER"],
  "Contact Tax X": ["POSTER_SPARK_CONTACT_TAX"],
  "Chain Pass X": ["COURT_VISION_CHAIN_PASS"],
  "Flop X": ["FLOP_SELL_CONTACT"],
  "Dead Air X": ["GAMEPLAN_DEAD_AIR"],
  "Debt Collector X": ["GAMEPLAN_DEBT_COLLECTOR"],
  "Pressure Coach X": ["GAMEPLAN_PRESSURE_COACH"],
  "Cage Step X": ["LOCK_CHAIN_CAGE_STEP"],
  "Corner Trap X": ["DEFENSIVE_ANCHOR_CORNER_TRAP"],
  "Five-Man Squeeze X": ["DEFENSIVE_ANCHOR_FIVE_MAN_SQUEEZE"],
  "Clean Contest X": ["CLEAN_CHALLENGE_CONTEST"],
  "Composure X": ["COMPOSURE_SHIELD_CANCEL"],
  "Cold Timeout X": ["TIMEOUT_RESET_CLEANSE"],
};

export const resolveSpecialSkillMechanics = (rawSkill: string): SpecialSkillMechanicId[] => {
  // Legacy exact mappings
  const mapped = LEGACY_TO_MECHANIC_MAP[rawSkill];
  if (mapped) {
    return [...mapped];
  }
  
  // Future family IDs should not automatically inherit all legacy mechanics,
  // so for now we explicitly return empty unless intentionally supported later.
  return [];
};

export const doesSkillMatchMechanic = (rawSkill: string, mechanicId: SpecialSkillMechanicId): boolean => {
  const mechanics = resolveSpecialSkillMechanics(rawSkill);
  return mechanics.includes(mechanicId);
};

export const hasSpecialSkillMechanic = (player: Player, mechanicId: SpecialSkillMechanicId): boolean => {
  if (!player.specialSkillSlots) return false;
  
  return player.specialSkillSlots.some(slot => {
    if (!slot) return false;
    return doesSkillMatchMechanic(slot, mechanicId);
  });
};

export const getPlayerSpecialSkillMechanics = (player: Player): SpecialSkillMechanicId[] => {
  if (!player.specialSkillSlots) return [];
  
  const allMechanics: SpecialSkillMechanicId[] = [];
  
  for (const slot of player.specialSkillSlots) {
    if (slot) {
      const mechanics = resolveSpecialSkillMechanics(slot);
      allMechanics.push(...mechanics);
    }
  }
  
  // Dedupe mechanics
  return Array.from(new Set(allMechanics));
};

export const getSpecialSkillsForMechanic = (player: Player, mechanicId: SpecialSkillMechanicId): string[] => {
  if (!player.specialSkillSlots) return [];
  return player.specialSkillSlots.filter((slot): slot is string => !!slot && doesSkillMatchMechanic(slot, mechanicId));
};

