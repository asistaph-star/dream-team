/**
 * Applies anti-snowball low-stamina reduction.
 * Rounds the scaled result per original matchEngine implementation.
 */
export function applyAntiSnowballScaling(drain: number, defenderStaminaPct: number): number {
  if (defenderStaminaPct < 30) {
    return Math.round(drain * 0.30);
  } else if (defenderStaminaPct < 50) {
    return Math.round(drain * 0.60);
  }
  return drain;
}

/**
 * Returns Sky Wall stamina drain amount (post-block) based on skill quality/rarity.
 * Common: 3, Rare (Fine): 5, Elite (Great): 7, Epic/Legendary (Perfect): 9
 */
export function getSkyWallDrain(rarity: string): number {
  switch (rarity) {
    case "Rare":
      return 5;
    case "Elite":
      return 7;
    case "Epic":
    case "Legendary":
      return 9;
    case "Common":
    default:
      return 3;
  }
}

/**
 * Returns Lock Chain stamina drain amount (post-steal) based on skill quality/rarity.
 * Common: 2, Rare (Fine): 4, Elite (Great): 6, Epic/Legendary (Perfect): 8
 */
export function getLockChainDrain(rarity: string): number {
  switch (rarity) {
    case "Rare":
      return 4;
    case "Elite":
      return 6;
    case "Epic":
    case "Legendary":
      return 8;
    case "Common":
    default:
      return 2;
  }
}
