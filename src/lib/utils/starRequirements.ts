import { Player } from "@/lib/types/player";

export function getRequiredDuplicateCount(tier: string, targetStarLevel: number): number {
  if (tier === "Silver") {
    if (targetStarLevel === 1) return 1;
    if (targetStarLevel === 5) return 1;
    return 0;
  }
  if (tier === "Blue") {
    if (targetStarLevel === 5) return 2;
    return 0;
  }
  if (tier === "Violet") {
    if (targetStarLevel === 3) return 2;
    if (targetStarLevel === 5) return 2;
    return 0;
  }
  if (tier === "Orange") {
    if (targetStarLevel === 3) return 1;
    if (targetStarLevel === 4) return 2;
    if (targetStarLevel === 5) return 2;
    return 0;
  }
  if (tier === "Red") {
    if (targetStarLevel === 1) return 2;
    if (targetStarLevel === 3) return 2;
    if (targetStarLevel === 5) return 3;
    return 0;
  }
  return 0;
}

export function hasLearnedSkills(player: Player): boolean {
  if (!player.specialSkillSlots) return false;
  return player.specialSkillSlots.some(slot => slot !== null && slot !== undefined);
}

export function getLearnedSkillSummary(player: Player) {
  const summaries: { skillName: string; slotNumber: number; rarity: string; tier?: string | number }[] = [];
  if (player.specialSkillSlots && player.skillRarities) {
    player.specialSkillSlots.forEach((skillName, index) => {
      if (skillName) {
        summaries.push({
          skillName,
          slotNumber: index + 1,
          rarity: player.skillRarities![index] || "Common",
          tier: player.skillTiers ? player.skillTiers[index] : undefined
        });
      }
    });
  }
  return summaries;
}
