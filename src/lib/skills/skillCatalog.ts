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
  "Connector Hub": "Restores ~8 stamina to teammates on normal assists.",
  "Tempo Switch": "Improves early offense. Adds +2.5% shooting bonus during fastbreaks and early offense.",
  "Position Flex": "Lets flexible players avoid matchup penalties. Adds +2.0% shooting bonus across roles.",
  "Future Core": "Adds stability. Grants +0.006 Form recovery per possession if the player is cold.",
  "Share Rhythm": "Rewards normal assists by recovering ~8 stamina to the entire lineup.",
  "Enforcer Lift": "Turns controlled physical defense into team stamina support. Recovers ~6 stamina for the team when triggered.",
};

export const SPECIAL_SKILL_TEXT: Record<SpecialSkillName, string> = {
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
  "Corner Trap X": "Applies Pinned (lasts 2 possessions) on sideline or corner-style perimeter actions. Pinned players cannot recover stamina on the bench or from skills.",
  "Pressure Coach X": "Marked opponents lose extra stamina when acting. Drains 12 stamina from each marked opponent during triggers.",
  "Flop X": "Sells light contact into foul pressure. Adds +4.0% foul pressure on contact (+8.0% for Shai Gilgeous-Alexander).",
  "Composure X": "Cancels forced foul pressure before it becomes free throws, reducing opponent skill bonuses by -2.0%.",
  "CLEAN_CHALLENGE": "Challenges foul-bait pressure with a disciplined contest.",
  "COMPOSURE_SHIELD": "Keeps the team calm under foul and momentum pressure.",
  "TIMEOUT_RESET": "Resets pressure by cleansing a mark during dangerous moments.",
  "COURT_VISION_ENGINE": "Creates better rhythm from smart passing and organized offense.",
  "BENCH_CAPTAIN": "Stabilizes the rotation when fatigue and pressure start building.",
};

export const SPECIAL_SKILL_NAMES = Object.keys(SPECIAL_SKILL_TEXT).filter(name => name.endsWith(" X")) as SpecialSkillName[];

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
  "CLEAN_CHALLENGE": 260,
  "COMPOSURE_SHIELD": 330,
  "TIMEOUT_RESET": 260,
  "COURT_VISION_ENGINE": 240,
  "BENCH_CAPTAIN": 220,
};
