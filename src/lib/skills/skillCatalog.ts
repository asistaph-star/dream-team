import { BaseSkillName, SpecialSkillName } from "./assignBaseSkills";

export type SkillMark = "Exposed" | "Tilted" | "Hooked" | "Pinned" | "Static";
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

export const SPECIAL_SKILL_TEXT: Record<SpecialSkillName, string> = {
  // Family Skills (Official)
  "DEEP_STRIKE": "Gives a small 3PT shot-quality boost on attempts. On trigger, applies Exposed to the primary defender for 2 possessions. If the defender is already Exposed, adds small 3PT foul pressure.",
  "COURT_VISION_ENGINE": "Assisted shots receive a small shot-quality boost. Clean passes reduce bad-shot penalty slightly. Can improve team rhythm after assists.",
  "POSTER_SPARK": "Gives a small finish boost on drives, dunks, and contact finishes. Can apply Tilted to the defender for 2 possessions on strong paint attacks.",
  "FLOP": "Adds small foul pressure on contact shots, drives, or contested jumpers.",
  "BROKEN_PLAY_RESCUE": "Rarely cancels a near-turnover, forcing a difficult 2PT rescue shot. Costs the rescuer stamina.",
  "SKY_WALL": "Boosts block and paint contest pressure. After a successful block, all opponents lose a small amount of stamina.",
  "LOCK_CHAIN": "Slightly increases ball-handler pressure and turnover pressure. Can apply Hooked. After a successful steal, all opponents lose a small amount of stamina.",
  "DEFENSIVE_ANCHOR": "Gives a small team contest and rotation boost while active. Helps reduce opponent rhythm and improves team defensive positioning.",
  "CLEAN_CHALLENGE": "Reduces foul-bait effects, lowers bad foul chance, and counters Flop and Deep Strike foul pressure.",
  "GLASS_STRIKE": "Improves offensive rebound timing and gives a controlled putback chance after offensive rebounds.",
  "BENCH_CAPTAIN": "Speeds up bench stamina recovery and stabilizes form for tired teammates.",
  "MOMENTUM_SWING": "After a block, steal, or forced turnover, gives small momentum recovery and slightly helps the lowest-stamina teammate.",
  "COMPOSURE_SHIELD": "Protects team from Tilted marks, foul-bait pressure, and momentum collapse. Can cancel some foul-bait triggers.",
  "GAMEPLAN_JAMMER": "Temporarily weakens one opponent special-skill trigger. Can apply Static for 2 possessions.",
  "TIMEOUT_RESET": "Triggers when team stamina is low or negative marks are stacking. Clears limited marks from teammates and gives small recovery to tired players.",
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

export const SPECIAL_SKILL_RATES: Record<SpecialSkillName, number> = {
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
};
