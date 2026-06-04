import { Player } from "../types/player";
import { MatchState } from "../utils/matchTypes";
import { SpecialSkillMechanicId, getSpecialSkillsForMechanic } from "./skillMechanics";
import { assignBaseSkillsFromStats, assignSpecialSkillsFromStats, BaseSkillName, SpecialSkillName } from "./assignBaseSkills";
import {
  BASE_SKILL_RATES,
  getSkillQualityRate,
  isSkillQuality,
  SkillMark,
  SkillQuality,
  SPECIAL_SKILL_RATES,
} from "./skillCatalog";
import { getOffenseRating, getOnBallDefenseRating, getAssistRating } from "../utils/playerIdentity";
import { normalizeSpecialSkillId } from "./skillMigration";

export type SkillMarks = MatchState["skillMarks"];
export type SkillMarkImmunity = MatchState["markImmunity"];

export const getBaseSkills = (player: Player): [BaseSkillName, BaseSkillName, BaseSkillName] => {
  return (player.baseSkills as [BaseSkillName, BaseSkillName, BaseSkillName] | undefined) ?? assignBaseSkillsFromStats(player);
};

export const normalizeSpecialSkillName = (skill: string): SpecialSkillName | null => {
  let normalized = skill;
  if (skill === "False Whistle X") {
    normalized = "FLOP";
  } else {
    normalized = normalizeSpecialSkillId(skill);
  }
  return (SPECIAL_SKILL_RATES as Record<string, number>)[normalized] ? (normalized as SpecialSkillName) : null;
};

export const getActiveBaseSkills = (player: Player): BaseSkillName[] => {
  const skills = getBaseSkills(player);
  return player.ovr >= 85 ? skills : skills.slice(0, 2);
};

export const hasBaseSkill = (player: Player, skill: BaseSkillName): boolean => {
  return getActiveBaseSkills(player).includes(skill);
};

export const countBaseSkill = (lineup: Player[], skill: BaseSkillName): number => {
  return lineup.filter(p => hasBaseSkill(p, skill)).length;
};

export const getSpecialSkills = (player: Player): SpecialSkillName[] => {
  const assigned = player.specialSkillSlots ?? assignSpecialSkillsFromStats(player);
  return assigned.map(skill => skill ? normalizeSpecialSkillName(skill) : null).filter((skill, index) => {
    if (!skill) return false;
    const starLevel = player.starLevel ?? 0;
    if (index === 0) return starLevel >= 1;
    if (index === 1) return starLevel >= 5;
    return false;
  }) as SpecialSkillName[];
};

export const lineupHasSpecial = (lineup: Player[], skill: SpecialSkillName): boolean => {
  return lineup.some(p => getSpecialSkills(p).includes(skill));
};

export const getSpecialSkillQuality = (player: Player, skill: SpecialSkillName): SkillQuality => {
  const quality = player.skillRarities?.[skill] ?? (skill === "FLOP" ? player.skillRarities?.["False Whistle X"] ?? player.skillRarities?.["Flop X"] : undefined);
  return isSkillQuality(quality) ? quality : "Common";
};

export const hasAnyMark = (marks: SkillMarks, playerId: string): boolean => {
  return (marks[playerId] ?? []).length > 0;
};

export const hasMark = (marks: SkillMarks, playerId: string, mark: SkillMark): boolean => {
  return (marks[playerId] ?? []).some(m => m.mark === mark);
};

export const isImmune = (immunity: SkillMarkImmunity, playerId: string, mark: SkillMark): boolean => {
  return (immunity[playerId] ?? []).some(m => m.mark === mark);
};

export const addMark = (
  marks: SkillMarks,
  immunity: SkillMarkImmunity,
  playerId: string,
  mark: SkillMark,
  sourceSkill: string,
  possessionsLeft = 2
): SkillMarks => {
  if (isImmune(immunity, playerId, mark)) return marks;
  const current = [...(marks[playerId] ?? [])].filter(m => m.mark !== mark);
  current.push({ mark, possessionsLeft, sourceSkill });
  return { ...marks, [playerId]: current.slice(-2) };
};

export const removeOldestMark = (marks: SkillMarks, playerId: string): { nextMarks: SkillMarks; cleansedMark?: SkillMark } => {
  const current = [...(marks[playerId] ?? [])];
  const cleansed = current.shift();
  return { nextMarks: { ...marks, [playerId]: current }, cleansedMark: cleansed?.mark };
};

export const consumeMark = (marks: SkillMarks, playerId: string, mark: SkillMark): SkillMarks => {
  return { ...marks, [playerId]: (marks[playerId] ?? []).filter(m => m.mark !== mark) };
};

export const decayMarks = (
  marks: SkillMarks,
  immunity: SkillMarkImmunity
): { nextMarks: SkillMarks; nextImmunity: SkillMarkImmunity } => {
  const nextMarks: SkillMarks = {};
  const nextImmunity: SkillMarkImmunity = {};

  Object.entries(immunity).forEach(([playerId, playerImmunities]) => {
    const kept = playerImmunities
      .map(m => ({ ...m, possessionsLeft: m.possessionsLeft - 1 }))
      .filter(m => m.possessionsLeft > 0);
    if (kept.length > 0) nextImmunity[playerId] = kept;
  });

  Object.entries(marks).forEach(([playerId, playerMarks]) => {
    const kept = playerMarks
      .map(m => ({ ...m, possessionsLeft: m.possessionsLeft - 1 }))
      .filter(m => {
        if (m.possessionsLeft <= 0) {
          const currentImmunities = nextImmunity[playerId] ?? [];
          if (!currentImmunities.some(im => im.mark === m.mark)) {
            currentImmunities.push({ mark: m.mark, possessionsLeft: 1 });
          }
          nextImmunity[playerId] = currentImmunities;
          return false;
        }
        return true;
      });
    if (kept.length > 0) nextMarks[playerId] = kept;
  });

  return { nextMarks, nextImmunity };
};

export const getTriggerBoost = (lineup: Player[], stamina: Record<string, number>): number => {
  const holder = lineup.find(p => {
    const maxStamina = Math.max(100, Math.round(p.stamina ?? 100));
    const staminaPct = ((stamina[p.id] ?? maxStamina) / maxStamina) * 100;
    return hasBaseSkill(p, "Complete Engine") && staminaPct >= 40;
  });
  if (!holder) return 1.0;
  const completeEngineIdentity = (getOffenseRating(holder) + getOnBallDefenseRating(holder) + getAssistRating(holder)) / 3;
  const completeEngineScale = 0.90 + (completeEngineIdentity / 100) * 0.20;
  return 1.04 * completeEngineScale;
};

export const rollBaseSkill = (
  lineup: Player[],
  skill: BaseSkillName,
  stamina: Record<string, number>,
  rateOverride?: number
): boolean => {
  const count = countBaseSkill(lineup, skill);
  if (count <= 0) return false;
  const rates = BASE_SKILL_RATES[skill];
  const usableRates = rates?.filter(rate => rate > 0) ?? [];
  const baseRate = rateOverride ?? (usableRates.length > 0 ? usableRates[Math.min(count, usableRates.length) - 1] : 0);
  if (baseRate <= 0) return false;
  return Math.random() * 1000 < baseRate * getTriggerBoost(lineup, stamina);
};

export const rollSpecial = (
  lineup: Player[],
  skill: SpecialSkillName,
  stamina: Record<string, number>,
  scaleFn?: (holder: Player) => number
): boolean => {
  const holders = lineup.filter(p => getSpecialSkills(p).includes(skill));
  if (holders.length === 0) return false;
  const maxRate = Math.max(
    ...holders.map(p => {
      const base = getSkillQualityRate(SPECIAL_SKILL_RATES[skill], getSpecialSkillQuality(p, skill));
      const scale = scaleFn ? scaleFn(p) : 1.0;
      return base * scale;
    })
  );
  return Math.random() * 1000 < maxRate * getTriggerBoost(lineup, stamina);
};

export const getBestSpecialSkillForMechanic = (player: Player, mechanicId: SpecialSkillMechanicId): string | null => {
  const matches = getSpecialSkillsForMechanic(player, mechanicId);
  if (matches.length === 0) return null;
  
  // Sort by highest base trigger rate given current quality
  return matches.sort((a, b) => {
    const aQuality = getSpecialSkillQuality(player, a as SpecialSkillName);
    const bQuality = getSpecialSkillQuality(player, b as SpecialSkillName);
    const aRate = getSkillQualityRate(SPECIAL_SKILL_RATES[a as SpecialSkillName], aQuality);
    const bRate = getSkillQualityRate(SPECIAL_SKILL_RATES[b as SpecialSkillName], bQuality);
    return bRate - aRate;
  })[0];
};

export const rollSpecialMechanic = (
  lineup: Player[],
  mechanicId: SpecialSkillMechanicId,
  stamina: Record<string, number>,
  scaleFn?: (holder: Player) => number
): boolean => {
  const holders = lineup.filter(p => getSpecialSkillsForMechanic(p, mechanicId).length > 0);
  if (holders.length === 0) return false;
  
  const maxRate = Math.max(
    ...holders.map(p => {
      const bestSkill = getBestSpecialSkillForMechanic(p, mechanicId);
      if (!bestSkill) return 0;
      const base = getSkillQualityRate(SPECIAL_SKILL_RATES[bestSkill as SpecialSkillName], getSpecialSkillQuality(p, bestSkill as SpecialSkillName));
      const scale = scaleFn ? scaleFn(p) : 1.0;
      return base * scale;
    })
  );
  return Math.random() * 1000 < maxRate * getTriggerBoost(lineup, stamina);
};


export const getDrainMultiplier = (target: Player, targetLineup: Player[]): number => {
  return hasBaseSkill(target, "Iron Motor") || targetLineup.some(p => hasBaseSkill(p, "Iron Motor")) ? 0.65 : 1.0;
};

export const drainStamina = (
  stamina: Record<string, number>,
  target: Player,
  targetLineup: Player[],
  amount: number
): number => {
  const maxStamina = Math.max(100, Math.round(target.stamina ?? 100));
  const staminaScale = Math.min(1.25, Math.max(1, Math.sqrt(maxStamina / 100)));
  const actual = Math.round(amount * staminaScale * getDrainMultiplier(target, targetLineup));
  stamina[target.id] = Math.max(0, (stamina[target.id] ?? 100) - actual);
  return actual;
};
