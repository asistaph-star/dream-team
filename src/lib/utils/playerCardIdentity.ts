import { Player } from "../types/player";

export function getPlayerDuplicateKey(player: Player): string {
  if (player.nbaPlayerId) return player.nbaPlayerId;
  if (player.playerId) return player.playerId;
  if (player.sourcePlayerId) return player.sourcePlayerId;
  return player.name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

export function isCardInstanceActive(
  card: Player,
  activeLineup: any,
  activeReserves: any
): boolean {
  if (!card || !card.id) return false;

  const matchesCollection = (item: any): boolean => {
    if (!item) return false;
    if (typeof item === "string") {
      return item === card.id;
    }
    if (typeof item === "object" && item !== null && "id" in item) {
      return item.id === card.id;
    }
    return false;
  };

  const checkShape = (collection: any): boolean => {
    if (!collection) return false;

    if (collection instanceof Set) {
      if (collection.has(card.id)) return true;
      for (const val of collection) {
        if (matchesCollection(val)) return true;
      }
      return false;
    }

    if (Array.isArray(collection)) {
      return collection.some(matchesCollection);
    }

    if (collection instanceof Map) {
      if (collection.has(card.id)) return true;
      for (const [key, val] of collection) {
        if (key === card.id || matchesCollection(val) || matchesCollection(key)) return true;
      }
      return false;
    }

    if (typeof collection === "object") {
      if (collection[card.id] === true || collection[card.id] !== undefined) {
        const val = collection[card.id];
        if (val === true || val === card.id) return true;
      }

      for (const key of Object.keys(collection)) {
        if (key === card.id && (collection[key] === true || collection[key] === card.id)) return true;
        const val = collection[key];
        if (matchesCollection(val)) return true;
      }
    }

    return false;
  };

  return checkShape(activeLineup) || checkShape(activeReserves);
}

export function hasLearnedSpecialSkills(player: Player): boolean {
  if (!player.specialSkillSlots) return false;
  return player.specialSkillSlots.some(slot => slot !== null && slot !== undefined);
}

export function getAscensionCandidates(
  player: Player,
  roster: Player[],
  activeLineup: any,
  activeReserves: any
): Player[] {
  const targetKey = getPlayerDuplicateKey(player);
  return roster.filter(
    p => getPlayerDuplicateKey(p) === targetKey &&
    p.id !== player.id &&
    !isCardInstanceActive(p, activeLineup, activeReserves)
  );
}

export function sortAscensionCandidates(candidates: Player[]): Player[] {
  return [...candidates].sort((a, b) => {
    const aHas = hasLearnedSpecialSkills(a) ? 1 : 0;
    const bHas = hasLearnedSpecialSkills(b) ? 1 : 0;
    return aHas - bHas;
  });
}
