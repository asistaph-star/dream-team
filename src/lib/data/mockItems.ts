import { Material, EquipmentSlot } from '../types/item';

export const mockMaterials: Record<string, Material> = {
  mat_crafting: {
    id: 'mat_crafting',
    name: 'Crafting Thread',
    description: 'A basic material used to craft new equipment pieces.',
  },
  mat_upgrade: {
    id: 'mat_upgrade',
    name: 'Enhancement Stone',
    description: 'Used to upgrade equipment to higher levels (+1, +2). Success rate decreases at higher levels.',
  },
  skill_tape: {
    id: 'skill_tape',
    name: 'Skill Tape',
    description: 'Used to reroll the quality of a learned special skill without changing the skill itself.',
  }
};

// Define recipes: how much "Crafting Thread" is needed for each slot.
export const craftingRecipes: Record<EquipmentSlot, { cost: number; statName: string; minBonus: number; maxBonus: number; isPercentage: boolean }> = {
  'Shoes': { cost: 50, statName: 'Speed', minBonus: 2, maxBonus: 7, isPercentage: false },
  'Tshirt': { cost: 40, statName: 'Stamina', minBonus: 10, maxBonus: 30, isPercentage: false },
  'KneePads': { cost: 30, statName: 'Defense', minBonus: 3, maxBonus: 8, isPercentage: false },
  'Jersey': { cost: 60, statName: '3PT', minBonus: 2, maxBonus: 5, isPercentage: true },
  'Headband': { cost: 30, statName: 'Focus', minBonus: 1, maxBonus: 5, isPercentage: true },
};
