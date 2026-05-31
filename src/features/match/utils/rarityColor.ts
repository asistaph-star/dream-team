export const getRarityColor = (rarity: string): string => {
  switch (rarity) {
    case 'Mythic': return 'text-red-500';
    case 'Legendary': return 'text-yellow-500';
    case 'Epic': return 'text-purple-500';
    case 'Rare': return 'text-blue-500';
    default: return 'text-gray-400';
  }
};
