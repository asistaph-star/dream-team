export type EquipmentSlot = 'Shoes' | 'Tshirt' | 'KneePads' | 'Jersey' | 'Headband';

export interface EquipmentStatBonus {
  statName: string; // e.g., "3PT%", "Speed", "Def"
  value: number; // The actual value, e.g., 5 for +5%
  isPercentage: boolean;
}

export interface Equipment {
  id: string; // unique instance id
  blueprintId: string;
  name: string;
  slot: EquipmentSlot;
  upgradeLevel: number; // e.g., +1, +2
  bonus: EquipmentStatBonus;
}

export type MaterialId = 'mat_crafting' | 'mat_upgrade' | 'skill_tape';

export interface Material {
  id: MaterialId;
  name: string;
  description: string;
}

export interface Inventory {
  equipment: Equipment[];
  materials: Record<MaterialId, number>; // maps MaterialId to quantity
}
