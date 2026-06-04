import { BaseSkillName, SpecialSkillName } from "./assignBaseSkills";

export type SkillMark = "Exposed" | "Debt" | "Hooked" | "Pinned" | "Static" | "Tilted";
export type SkillQuality = "Common" | "Rare" | "Elite" | "Epic" | "Legendary";

export const SKILL_QUALITY_ORDER: SkillQuality[] = ["Common", "Rare", "Elite", "Epic", "Legendary"];

export const SKILL_QUALITY_CONFIG: Record<SkillQuality, {
  chance: number;
  multiplier: number;
  color: string;
  order: number;
}> = {
  Common: { chance: 62, multiplier: 0.40, color: "green", order: 1 },
  Rare: { chance: 25, multiplier: 0.60, color: "blue", order: 2 },
  Elite: { chance: 10, multiplier: 0.80, color: "violet", order: 3 },
  Epic: { chance: 2.5, multiplier: 1.00, color: "orange", order: 4 },
  Legendary: { chance: 0.5, multiplier: 1.20, color: "red", order: 5 },
};

export const isSkillQuality = (value: unknown): value is SkillQuality => {
  return typeof value === "string" && value in SKILL_QUALITY_CONFIG;
};

export const rollSkillQuality = (random = Math.random): SkillQuality => {
  const roll = random() * 100;
  let running = 0;
  for (const quality of SKILL_QUALITY_ORDER) {
    running += SKILL_QUALITY_CONFIG[quality].chance;
    if (roll < running) return quality;
  }
  return "Common";
};

export const getSkillQualityRate = (maxRate: number, quality: SkillQuality = "Common"): number => {
  return Math.floor(maxRate * SKILL_QUALITY_CONFIG[quality].multiplier);
};

export const BASE_SKILL_TEXT: Record<BaseSkillName, string> = {
  "Tempo Surgeon": "Creates cleaner assisted looks from strong playmaking. Adds ~+1.8% shooting bonus on assisted looks.",
  "Paint Magnet": "Forces help defense inside. Adds ~+3.0% shooting bonus to interior shots and tilts tired defenders.",
  "Arc Pressure": "Improves dangerous perimeter attempts. Adds ~+3.5% shooting bonus and exposes defenders.",
  "Mismatch Caller": "Punishes weaker matchups. Adds +2.5% shooting bonus against marked defenders.",
  "Glass Touch": "Adds second-chance pressure. Increases team offensive rebound chance by ~+5.5%.",
  "Foul Magnet": "Raises foul pressure. Adds ~+3.5% foul-draw chance when attacking tired defenders.",
  "Power Driver": "Adds physical rim pressure and drains ~32 stamina from the primary defender on interior attacks.",
  "Rim Warden": "Raises block pressure. Adds ~+4.0% block chance on close and contested shots.",
  "Screen Breaker": "Disrupts assist and screen-based offense. Increases team steal chance by ~+12% against Pick & Roll/Motion.",
  "Shadow Guard": "Suppresses opponent perimeter shooting bonuses (e.g. counters Arc Pressure).",
  "Hands Active": "Adds loose-ball pressure. Increases team steal chance by ~+18%.",
  "Discipline Wall": "Reduces opponent foul-bait shooting bonuses by ~-3.0%.",
  "Paint Barrier": "Weakens interior chains. Reduces opponent offensive rebound chance by ~-6.0%.",
  "Focus Lock": "Counters perimeter rhythm, reducing opponent shooter skill bonuses down to ~+2.0%.",
  "Complete Engine": "Boosts all team skill trigger rates by ~+4% while the player has >=40% stamina.",
  "Iron Motor": "Recovers ~12 stamina and resists drain effects when stamina is below 70%.",
  "Connector Hub": "Restores stamina to the scorer on assisted buckets, scaling with the passer’s playmaking.",
  "Tempo Switch": "Improves early offense. Adds +2.5% shooting bonus during fastbreaks and early offense.",
  "Position Flex": "Lets flexible players avoid matchup penalties. Adds +2.0% shooting bonus across roles.",
  "Future Core": "Adds stability. Grants +0.006 Form recovery per possession if the player is cold.",
  "Share Rhythm": "Rewards normal assists by recovering ~8 stamina to the entire lineup.",
  "Enforcer Lift": "Turns controlled physical defense into team stamina support. Recovers ~6 stamina for the team when triggered.",
};

export const SPECIAL_SKILL_TEXT: Record<SpecialSkillName, string> & Record<string, string> = {
  // Family Skills (Official)
  "DEEP_STRIKE": "Applies Exposed (lasts 2 possessions) through perimeter pressure, and pressures Exposed defenders into 3PT shooting fouls, adding +9.0% foul pressure.",
  "COURT_VISION_ENGINE": "Creates rhythm passing bonuses on assists and places Debt (lasts 2 possessions) on marked opponents after assisted scores.",
  "POSTER_SPARK": "Drains 110 stamina (190 if marked with Debt) when attacking marked defenders, and applies Tilted (lasts 3 possessions) and drains 45 stamina from tired defenders.",
  "FLOP": "Sells light contact into foul pressure, adding +4.0% foul pressure on contact (+8.0% for Shai Gilgeous-Alexander).",
  "BROKEN_PLAY_RESCUE": "Rare clutch ability to recover a near-turnover into a difficult 2PT rescue shot attempt, costing stamina to the rescuer.",
  "SKY_WALL": "Triggers intense vertical rim block pressure, reducing shot quality and draining stamina on paint attacks.",
  "LOCK_CHAIN": "Applies Hooked (lasts 2 possessions) to pressured ball handlers (drains 38 stamina per possession) and drains stamina from ball handlers on turnovers.",
  "DEFENSIVE_ANCHOR": "Drains 40 stamina from the opposing lineup (60 if 3+ marked) on defensive triggers, and applies Pinned (lasts 2 possessions) on corner actions to prevent stamina recovery.",
  "CLEAN_CHALLENGE": "Challenges foul-baiting and counters forced foul or 3PT bait effects, reducing opponent skill bonuses by -3.0%.",
  "GLASS_STRIKE": "Crashes the glass with disciplined timing, improving second-chance pressure and creating putback scoring moments.",
  "BENCH_CAPTAIN": "Improves rotation stamina recovery for benched players, and drains 12 stamina from each marked opponent when they act (does not stack).",
  "MOMENTUM_SWING": "Triggers after defensive momentum events (steal, block, turnover) to recover stamina for the lowest-stamina teammate, restore form, and boost momentum.",
  "COMPOSURE_SHIELD": "Cancels forced foul pressure before it becomes free throws, and counters Tilted marks or bad momentum, reducing opponent skill bonuses by -2.0%.",
  "GAMEPLAN_JAMMER": "Blocks opponent special skill triggers, applying Static (lasts 2 possessions), and consumes Debt to drain 45 stamina from 2 additional opposing players.",
  "TIMEOUT_RESET": "Cleanses 1 mark from all marked players and recovers 12 stamina for tired players when team stamina is low.",

  // Legacy Skills (Compatibility Lookup)
  "Red Dot X": "Applies Exposed (lasts 2 possessions) through perimeter pressure.",
  "Four-Point Bait X": "Pressures Exposed defenders into 3PT shooting fouls, adding +9.0% foul pressure.",
  "Lung Burner X": "Drains stamina when attacking marked defenders. Drains 110 stamina from the defender (190 if they have a Debt mark).",
  "Chain Pass X": "Places Debt (lasts 2 possessions) after normal assisted scores.",
  "Debt Collector X": "Consumes Debt to spread stamina drain. Drains 45 stamina from 2 additional opposing players.",
  "Five-Man Squeeze X": "Drains the active opponent lineup after defensive triggers. Drains 40 stamina from all 5 players (increases to 60 if 3+ are marked).",
  "Cold Timeout X": "Cleanses marks when team stamina is low. Removes 1 mark from all marked players and recovers 12 stamina for 1-2 tired players.",
  "Dead Air X": "Blocks a mid-air skill moment, adding +0.5% shot contest and applying Static (lasts 2 possessions).",
  "Clean Contest X": "Counters forced foul and 3PT bait effects, reducing opponent skill bonuses by -3.0%.",
  "Contact Tax X": "Applies Tilted (lasts 3 possessions) and drains 45 stamina when attacking tired defenders.",
  "Cage Step X": "Applies Hooked (lasts 2 possessions) to ball handlers under defensive pressure. Hooked players drain 38 stamina per possession.",
  "Corner Trap X": "Applies Pinned (lasts 2 possessions) on sideline or corner-style perimeter actions. Pinned players cannot receive skill-based stamina recovery while active. Pinned is cleared when the player is subbed out.",
  "Pressure Coach X": "Marked opponents lose extra stamina when acting. Drains 12 stamina from each marked opponent during triggers.",
  "Flop X": "Sells light contact into foul pressure. Adds +4.0% foul pressure on contact (+8.0% for Shai Gilgeous-Alexander).",
  "Composure X": "Cancels forced foul pressure before it becomes free throws, reducing opponent skill bonuses by -2.0%.",
};

// All 15 official Special Skill Families are active.
export const SPECIAL_SKILL_NAMES: SpecialSkillName[] = [
  "DEEP_STRIKE",
  "COURT_VISION_ENGINE",
  "POSTER_SPARK",
  "FLOP",
  "BROKEN_PLAY_RESCUE",
  "SKY_WALL",
  "LOCK_CHAIN",
  "DEFENSIVE_ANCHOR",
  "CLEAN_CHALLENGE",
  "GLASS_STRIKE",
  "BENCH_CAPTAIN",
  "MOMENTUM_SWING",
  "COMPOSURE_SHIELD",
  "GAMEPLAN_JAMMER",
  "TIMEOUT_RESET",
];

export const BASE_SKILL_RATES: Partial<Record<BaseSkillName, [number, number, number]>> = {
  "Tempo Surgeon": [120, 190, 270],
  "Paint Magnet": [125, 210, 0],
  "Arc Pressure": [110, 175, 250],
  "Mismatch Caller": [140, 220, 0],
  "Glass Touch": [150, 230, 0],
  "Foul Magnet": [120, 205, 0],
  "Power Driver": [135, 220, 0],
  "Rim Warden": [155, 245, 0],
  "Screen Breaker": [130, 205, 280],
  "Shadow Guard": [120, 200, 275],
  "Hands Active": [155, 245, 0],
  "Discipline Wall": [180, 280, 0],
  "Paint Barrier": [125, 215, 0],
  "Focus Lock": [130, 210, 285],
  "Iron Motor": [90, 150, 220],
  "Connector Hub": [400, 0, 0],
  "Tempo Switch": [150, 230, 0],
  "Position Flex": [0, 0, 0],
  "Future Core": [0, 0, 0],
  "Share Rhythm": [180, 260, 0],
  "Enforcer Lift": [160, 240, 0],
};

export const SPECIAL_SKILL_RATES: Record<SpecialSkillName, number> & Record<string, number> = {
  // Family Skills (Official)
  "DEEP_STRIKE": 300,
  "COURT_VISION_ENGINE": 240,
  "POSTER_SPARK": 280,
  "FLOP": 230,
  "BROKEN_PLAY_RESCUE": 220,
  "SKY_WALL": 240,
  "LOCK_CHAIN": 240,
  "DEFENSIVE_ANCHOR": 220,
  "CLEAN_CHALLENGE": 260,
  "GLASS_STRIKE": 220,
  "BENCH_CAPTAIN": 220,
  "MOMENTUM_SWING": 220,
  "COMPOSURE_SHIELD": 330,
  "GAMEPLAN_JAMMER": 220,
  "TIMEOUT_RESET": 260,

  // Legacy Skills (Compatibility Lookup)
  "Red Dot X": 300,
  "Four-Point Bait X": 250,
  "Lung Burner X": 280,
  "Chain Pass X": 260,
  "Debt Collector X": 240,
  "Five-Man Squeeze X": 230,
  "Cold Timeout X": 260,
  "Dead Air X": 220,
  "Clean Contest X": 260,
  "Contact Tax X": 260,
  "Cage Step X": 240,
  "Corner Trap X": 250,
  "Pressure Coach X": 1000,
  "Flop X": 230,
  "Composure X": 330,
};
