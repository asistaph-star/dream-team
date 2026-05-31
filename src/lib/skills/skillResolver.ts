import { Player } from "../types/player";
import { MatchState } from "../utils/matchTypes";
import { assignBaseSkillsFromStats, assignSpecialSkillsFromStats, BaseSkillName, SpecialSkillName } from "./assignBaseSkills";
import {
  BASE_SKILL_RATES,
  getSkillQualityRate,
  isSkillQuality,
  SkillMark,
  SkillQuality,
  SPECIAL_SKILL_RATES,
} from "./skillCatalog";

export type SkillMarks = MatchState["skillMarks"];

export const getBaseSkills = (player: Player): [BaseSkillName, BaseSkillName, BaseSkillName] => {
  return (player.baseSkills as [BaseSkillName, BaseSkillName, BaseSkillName] | undefined) ?? assignBaseSkillsFromStats(player);
};

export const normalizeSpecialSkillName = (skill: string): SpecialSkillName | null => {
  if (skill === "False Whistle X") return "Flop X";
  return (SPECIAL_SKILL_RATES as Record<string, number>)[skill] ? (skill as SpecialSkillName) : null;
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
  const quality = player.skillRarities?.[skill] ?? (skill === "Flop X" ? player.skillRarities?.["False Whistle X"] : undefined);
  return isSkillQuality(quality) ? quality : "Common";
};

export const hasAnyMark = (marks: SkillMarks, playerId: string): boolean => {
  return (marks[playerId] ?? []).length > 0;
};

export const hasMark = (marks: SkillMarks, playerId: string, mark: SkillMark): boolean => {
  return (marks[playerId] ?? []).some(m => m.mark === mark);
};

export const addMark = (
  marks: SkillMarks,
  playerId: string,
  mark: SkillMark,
  sourceSkill: string,
  possessionsLeft = 2
): SkillMarks => {
  const current = [...(marks[playerId] ?? [])].filter(m => m.mark !== mark);
  current.push({ mark, possessionsLeft, sourceSkill });
  return { ...marks, [playerId]: current.slice(-2) };
};

export const removeOldestMark = (marks: SkillMarks, playerId: string): SkillMarks => {
  const current = [...(marks[playerId] ?? [])];
  current.shift();
  return { ...marks, [playerId]: current };
};

export const consumeMark = (marks: SkillMarks, playerId: string, mark: SkillMark): SkillMarks => {
  return { ...marks, [playerId]: (marks[playerId] ?? []).filter(m => m.mark !== mark) };
};

export const decayMarks = (marks: SkillMarks): SkillMarks => {
  const next: SkillMarks = {};
  Object.entries(marks).forEach(([playerId, playerMarks]) => {
    const kept = playerMarks
      .map(m => ({ ...m, possessionsLeft: m.possessionsLeft - 1 }))
      .filter(m => m.possessionsLeft > 0);
    if (kept.length > 0) next[playerId] = kept;
  });
  return next;
};

export const getTriggerBoost = (lineup: Player[], stamina: Record<string, number>): number => {
  const holder = lineup.find(p => {
    const maxStamina = Math.max(100, Math.round(p.stamina ?? 100));
    const staminaPct = ((stamina[p.id] ?? maxStamina) / maxStamina) * 100;
    return hasBaseSkill(p, "Complete Engine") && staminaPct >= 40;
  });
  return holder ? 1.04 : 1.0;
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
  stamina: Record<string, number>
): boolean => {
  const holders = lineup.filter(p => getSpecialSkills(p).includes(skill));
  if (holders.length === 0) return false;
  const maxRate = Math.max(
    ...holders.map(p => getSkillQualityRate(SPECIAL_SKILL_RATES[skill], getSpecialSkillQuality(p, skill)))
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
