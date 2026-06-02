import { Player } from "@/lib/types/player";

export function getRequiredDuplicateCount(tier: string, targetStarLevel: number): number {
  if (tier === "Silver" || tier === "Blue") return targetStarLevel >= 4 ? 1 : 0;
  if (tier === "Violet") return targetStarLevel >= 2 ? 1 : 0;
  if (tier === "Orange") return 1;
  if (tier === "Red") return targetStarLevel >= 4 ? 2 : 1;
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
