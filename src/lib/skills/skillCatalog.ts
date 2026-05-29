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
  Common: { chance: 45, multiplier: 0.40, color: "green", order: 1 },
  Rare: { chance: 30, multiplier: 0.60, color: "blue", order: 2 },
  Elite: { chance: 17, multiplier: 0.80, color: "violet", order: 3 },
  Epic: { chance: 6, multiplier: 1.00, color: "orange", order: 4 },
  Legendary: { chance: 2, multiplier: 1.20, color: "red", order: 5 },
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
  "Tempo Surgeon": "Creates cleaner assisted looks from strong playmaking.",
  "Paint Magnet": "Forces help defense inside and pressures tired defenders.",
  "Arc Pressure": "Improves dangerous perimeter attempts and exposes defenders.",
  "Mismatch Caller": "Punishes weaker matchups and marked defenders.",
  "Glass Touch": "Adds second-chance pressure after rebound actions.",
  "Foul Magnet": "Raises foul pressure when attacking tired defenders.",
  "Power Driver": "Adds physical rim pressure and stamina damage on interior attacks.",
  "Rim Warden": "Raises block pressure on close and contested shots.",
  "Screen Breaker": "Disrupts assist and screen-based offense.",
  "Shadow Guard": "Suppresses perimeter scoring bonuses.",
  "Hands Active": "Adds steal and loose-ball pressure.",
  "Discipline Wall": "Reduces foul-bait and forced foul pressure.",
  "Paint Barrier": "Improves defensive rebounding and weakens interior scoring chains.",
  "Focus Lock": "Counters midrange/perimeter rhythm and lowers trigger pressure.",
  "Complete Engine": "Boosts trigger skills while the player is fresh.",
  "Iron Motor": "Recovers stamina and resists drain effects.",
  "Connector Hub": "Restores stamina to teammates on normal assists.",
  "Tempo Switch": "Improves early offense after fast actions.",
  "Position Flex": "Lets flexible players avoid matchup penalties across roles.",
  "Future Core": "Adds small growth-style stat stability for rising players.",
  "Share Rhythm": "Rewards normal assists with light team stamina recovery.",
  "Enforcer Lift": "Turns controlled physical defense into team stamina support.",
};

export const SPECIAL_SKILL_TEXT: Record<SpecialSkillName, string> = {
  "Red Dot X": "Applies Exposed through perimeter pressure.",
  "Four-Point Bait X": "Pressures Exposed defenders into 3PT shooting fouls.",
  "Lung Burner X": "Drains stamina when attacking marked defenders.",
  "Chain Pass X": "Places Debt after normal assisted scores.",
  "Debt Collector X": "Consumes Debt to spread stamina drain.",
  "Five-Man Squeeze X": "Drains the active opponent lineup after defensive triggers.",
  "Cold Timeout X": "Cleanses marks when team stamina is low.",
  "Dead Air X": "Blocks a mid-air skill moment and applies Static.",
  "Clean Contest X": "Counters forced foul and 3PT bait effects.",
  "Contact Tax X": "Applies Tilted and stamina tax when attacking tired defenders.",
  "Cage Step X": "Applies Hooked to ball handlers under defensive pressure.",
  "Corner Trap X": "Applies Pinned on sideline or corner-style perimeter actions.",
  "Pressure Coach X": "Marked opponents lose extra stamina when acting.",
  "Flop X": "Sells light contact into foul pressure. Shai Gilgeous-Alexander doubles the foul-pressure bonus.",
  "Composure X": "Cancels forced foul pressure before it becomes free throws.",
};

export const SPECIAL_SKILL_NAMES = Object.keys(SPECIAL_SKILL_TEXT) as SpecialSkillName[];

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
