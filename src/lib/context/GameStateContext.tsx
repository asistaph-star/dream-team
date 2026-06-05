"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Player, PlayerPosition } from "@/lib/types/player";
import { mockPlayers } from "@/lib/data/mockPlayers";
import { Equipment, EquipmentSlot, Inventory, MaterialId } from "@/lib/types/item";
import { craftingRecipes } from "@/lib/data/mockItems";
import { applyStarGrowth, repairStarGrowth } from "@/lib/utils/starGrowth";
import { getPlayerDuplicateKey, getAscensionCandidates, sortAscensionCandidates } from "@/lib/utils/playerCardIdentity";
import { SpecialSkillName } from "@/lib/skills/assignBaseSkills";
import { rollSkillQuality, SPECIAL_SKILL_NAMES } from "@/lib/skills/skillCatalog";
import { wouldCreateDuplicateFamily, migratePlayerSpecialSkills } from "@/lib/skills/skillMigration";
import { getRequiredDuplicateCount, hasLearnedSkills, getLearnedSkillSummary } from "@/lib/utils/starRequirements";

export interface PendingAscendWarning {
  baseCardId: string;
  targetStarLevel: number;
  requiredDuplicates: number;
  duplicateIds: string[];
  learnedSkills: { playerName: string; skillName: string; slotNumber: number; rarity: string; tier?: string | number }[];
}

const getStarTierAndLevel = (starLevel: number) => {
  if (!starLevel || starLevel === 0) return { tier: "None", level: 0 };
  const index = starLevel - 1;
  const tierIndex = Math.min(4, Math.floor(index / 5));
  const level = (index % 5) + 1;
  
  const tiers = ["Silver", "Blue", "Violet", "Orange", "Red"];
  return {
    tier: tiers[tierIndex] || "Red",
    level
  };
};

export interface MatchResult {
  exp: number;
  cash: number;
  materials: { id: MaterialId; qty: number }[];
  playersExpGained: number;
  strategyExpGained?: { offName: string; offExp: number; defName: string; defExp: number };
}

export interface StadiumLevels {
  arena: number;
  gym: number;
  lab: number;
  store: number;
}

export interface PendingSkillTraining {
  playerId: string;
  newSkill: string;
  newQuality: string;
}

interface GameState {
  tk: number;
  cash: number;
  accountLevel: number;
  accountExp: number;
  campaignStage: number;
  setCampaignStage: (stage: number) => void;
  roster: Player[];
  inventory: Inventory;
  activeLineup: Player[];
  activeReserves: Player[];
  lineupOverride: Record<string, string>;
  teamOffense: number;
  teamDefense: number;
  playerStorageLimit: number;
  expandStorage: () => { success: boolean; error?: string };
  stadiumLevels: StadiumLevels;
  passiveStoreCash: number;
  draftPlayer: (isPremium: boolean) => { success: boolean; player?: Player; error?: string };
  finishMatch: (difficulty: import("@/lib/utils/matchTypes").Difficulty, offStrategy?: string, defStrategy?: string, isWin?: boolean) => MatchResult;
  craftEquipment: (slot: EquipmentSlot) => Equipment | null;
  upgradeEquipment: (equipmentId: string) => { success: boolean; newLevel?: number; error?: string };
  upgradeFacility: (facility: keyof StadiumLevels) => { success: boolean; error?: string };
  claimStoreRevenue: () => number;
  autoLineup: () => void;
  setLineupSlot: (position: string, playerId: string) => { success: boolean; error?: string };
  clearLineupSlot: (position: string) => void;
  firePlayer: (playerId: string) => { success: boolean; refundAmount?: number; error?: string };
  addCash: (amount: number) => void;
  addTk: (amount: number) => void;
  currentSalary: number;
  salaryCap: number;
  seasonMode: 'REGULAR' | 'PLAYOFFS_FREEZE';
  setSeasonMode: (mode: 'REGULAR' | 'PLAYOFFS_FREEZE') => void;
  strategyLevels: Record<string, { level: number; exp: number }>;
  gainStrategyExp: (strategyName: string, expAmount: number) => void;
  upgradeStrategy: (strategyName: string) => { success: boolean; newLevel?: number; error?: string };
  signPlayerToRoster: (player: Player) => { success: boolean; error?: string };
  ascendPlayer: (playerId: string, confirmSacrifice?: boolean) => { success: boolean; rolled?: number; chanceNeeded?: number; error?: string; pendingWarning?: boolean };
  pendingAscendSacrificeWarning: PendingAscendWarning | null;
  cancelAscendSacrifice: () => void;
  pendingSkillTraining: PendingSkillTraining | null;
  acceptSkillTraining: (slotIndex: 0 | 1) => { success: boolean; error?: string };
  rejectSkillTraining: () => { success: boolean; error?: string };
  trainSpecialSkill: (playerId: string, options?: { force?: boolean }) => { success: boolean; skill?: string; quality?: string; error?: string };
  resetRosterProgress: () => void;
}

const normalizeInventory = (inventory: Inventory): Inventory => ({
  ...inventory,
  materials: {
    mat_crafting: inventory.materials.mat_crafting ?? 0,
    mat_upgrade: Math.max(inventory.materials.mat_upgrade ?? 0, 5000),
    skill_tape: Math.max(inventory.materials.skill_tape ?? 0, 99999),
  },
});

const getSpecialSlotUnlockStar = (specialSlotIndex: 0 | 1): number => specialSlotIndex === 0 ? 1 : 5;

const rollSpecialSkillName = (): SpecialSkillName => {
  return SPECIAL_SKILL_NAMES[Math.floor(Math.random() * SPECIAL_SKILL_NAMES.length)];
};

const normalizeRoster = (players: Player[]): Player[] => {
  // Inject Max Christie if he doesn't exist so the user has a Common SG for testing
  const rosterArray = [...players];
  if (!rosterArray.some(p => p.id === 'p_christie')) {
    const christie = mockPlayers.find(p => p.id === 'p_christie');
    if (christie) {
      rosterArray.push({ ...christie, id: 'p_christie', starLevel: 25 });
    }
  }

  return rosterArray.map(player => {
    const baseline = mockPlayers.find(p => p.id === player.id) ?? mockPlayers.find(p => p.name === player.name && p.position === player.position);
    
    let targetStarLevel = player.starLevel ?? 0;
    let targetRarity = player.rarity;

    // Inject MAX STARS for testing Common PG and Common SG
    if (player.id === "p_vincent" || player.id === "p_christie") {
      targetStarLevel = 25;
      targetRarity = "Common";
    }
    
    const updatedPlayer = { 
      ...player, 
      starLevel: targetStarLevel, 
      rarity: targetRarity,
      sourcePlayerId: player.sourcePlayerId ?? baseline?.sourcePlayerId ?? baseline?.id
    };
    const migratedPlayer = migratePlayerSpecialSkills(updatedPlayer);
    return unlockSpecialSkillQualities(repairStarGrowth(migratedPlayer, baseline), targetStarLevel);
  });
};

const unlockSpecialSkillQualities = (player: Player, targetStars: number): Player => {
  const specialSkillSlots = player.specialSkillSlots ?? [null, null];
  const skillRarities = { ...(player.skillRarities ?? {}) };

  if (targetStars >= 1 && specialSkillSlots[0] && !skillRarities[specialSkillSlots[0]]) {
    skillRarities[specialSkillSlots[0]] = rollSkillQuality();
  }

  if (targetStars >= 5 && specialSkillSlots[1] && !skillRarities[specialSkillSlots[1]]) {
    skillRarities[specialSkillSlots[1]] = rollSkillQuality();
  }

  return { ...player, specialSkillSlots, skillRarities };
};

const GameStateContext = createContext<GameState | undefined>(undefined);

export function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [tk, setTk] = useState(9999); // Premium currency
  const [cash, setCash] = useState(9999999999); // 9.9 Billion Cash / Team Funds!
  
  const [accountLevel, setAccountLevel] = useState(1);
  const [accountExp, setAccountExp] = useState(0);
  const [campaignStage, setCampaignStage] = useState(1);
  
  const [stadiumLevels, setStadiumLevels] = useState<StadiumLevels>({
    arena: 1,
    gym: 1,
    lab: 1,
    store: 1
  });
  
  const [passiveStoreCash, setPassiveStoreCash] = useState(0);
  const [seasonMode, setSeasonMode] = useState<'REGULAR' | 'PLAYOFFS_FREEZE'>('PLAYOFFS_FREEZE');
  const [lineupOverride, setLineupOverride] = useState<Record<string, string>>({});
  const [playerStorageLimit, setPlayerStorageLimit] = useState(100);
  const [pendingSkillTraining, setPendingSkillTraining] = useState<PendingSkillTraining | null>(null);
  const [pendingAscendSacrificeWarning, setPendingAscendSacrificeWarning] = useState<PendingAscendWarning | null>(null);

  const cancelAscendSacrifice = () => setPendingAscendSacrificeWarning(null);

  const [strategyLevels, setStrategyLevels] = useState<Record<string, { level: number; exp: number }>>({
    "Motion Offense": { level: 1, exp: 0 },
    "Pick & Roll": { level: 1, exp: 0 },
    "Isolation (ISO)": { level: 1, exp: 0 },
    "5-Out Spacing": { level: 1, exp: 0 },
    "Post Isolation": { level: 1, exp: 0 },
    "Run & Gun": { level: 1, exp: 0 },
    "Pace & Space": { level: 1, exp: 0 },
    "Outside Shoot": { level: 1, exp: 0 },
    "Corner 3s": { level: 1, exp: 0 },
    "Inside Score": { level: 1, exp: 0 },
    "Hawk Entry": { level: 1, exp: 0 },
    "Outside Cut Entry": { level: 1, exp: 0 },
    "Princeton Offense": { level: 1, exp: 0 },
    "Man-to-Man": { level: 1, exp: 0 },
    "Drop Coverage": { level: 1, exp: 0 },
    "Switch Defense": { level: 1, exp: 0 },
    "Blitz/Trap": { level: 1, exp: 0 },
    "2-3 Zone": { level: 1, exp: 0 },
    "Full-Court Press": { level: 1, exp: 0 },
    "Full-court press": { level: 1, exp: 0 },
    "Half-Court Press": { level: 1, exp: 0 },
    "Half-court press": { level: 1, exp: 0 },
    "3-2 Zone": { level: 1, exp: 0 },
    "Protect the Lane": { level: 1, exp: 0 },
    "1-3-1 Zone": { level: 1, exp: 0 },
    "Combination Defense": { level: 1, exp: 0 },
  });

  const getStrategyNextExp = (level: number): number => {
    if (level === 1) return 500;
    if (level === 2) return 1500;
    if (level === 3) return 4000;
    if (level === 4) return 10000;
    return 999999;
  };

  const gainStrategyExp = (strategyName: string, expAmount: number) => {
    setStrategyLevels(prev => {
      const current = prev[strategyName];
      if (!current) return prev;
      if (current.level >= 5) return prev;
      const newExp = current.exp + expAmount;
      return {
        ...prev,
        [strategyName]: { ...current, exp: newExp }
      };
    });
  };

  const upgradeStrategy = (strategyName: string): { success: boolean; newLevel?: number; error?: string } => {
    let result: { success: boolean; newLevel?: number; error?: string } = { success: false };
    setStrategyLevels(prev => {
      const current = prev[strategyName];
      if (!current) {
        result = { success: false, error: "Strategy not found" };
        return prev;
      }
      if (current.level >= 5) {
        result = { success: false, error: "Strategy is already at maximum level" };
        return prev;
      }
      const needed = getStrategyNextExp(current.level);
      if (current.exp < needed) {
        result = { success: false, error: "Not enough EXP to upgrade this strategy" };
        return prev;
      }
      const nextLevel = current.level + 1;
      result = { success: true, newLevel: nextLevel };
      return {
        ...prev,
        [strategyName]: {
          level: nextLevel,
          exp: current.exp - needed
        }
      };
    });
    return result;
  };

  const [inventory, setInventory] = useState<Inventory>({
    equipment: [],
    materials: {
      'mat_crafting': 99999, // Infinite test mats!
      'mat_upgrade': 99999,
      'skill_tape': 99999,
    }
  });

  // Starting Roster: Strictly Silver (Common) and Blue (Rare) tier cards to ensure proper game progression
  const [roster, setRoster] = useState<Player[]>([
    mockPlayers.find(p => p.id === "p_vincent") || mockPlayers[4],       // Gabe Vincent (PG - Common/Silver)
    mockPlayers.find(p => p.id === "p_013") || mockPlayers[12],          // Anthony Edwards (SG - Rare/Blue)
    mockPlayers.find(p => p.id === "p_livingston") || mockPlayers[6],   // Chris Livingston (SF - Common/Silver)
    mockPlayers.find(p => p.id === "p_okeke") || mockPlayers[3],         // Chuma Okeke (PF - Rare/Blue)
    mockPlayers.find(p => p.id === "p_goldin") || mockPlayers[2],        // Vladislav Goldin (C - Common/Silver)
    // Bench
    mockPlayers.find(p => p.id === "p_thor") || mockPlayers[5],          // JT Thor (PF - Common/Silver)
    mockPlayers.find(p => p.id === "p_015") || mockPlayers[14],          // Jakob Poeltl (C - Common/Silver)
    mockPlayers.find(p => p.id === "p_016") || mockPlayers[15],          // Duop Reath (PF - Common/Silver)
    mockPlayers.find(p => p.id === "p_014") || mockPlayers[13],          // Stephen Curry (PG - Rare/Blue)
  ]);

  const resetRosterProgress = () => {
    const freshRoster = [
      mockPlayers.find(p => p.id === "p_vincent") || mockPlayers[4],
      mockPlayers.find(p => p.id === "p_013") || mockPlayers[12],
      mockPlayers.find(p => p.id === "p_livingston") || mockPlayers[6],
      mockPlayers.find(p => p.id === "p_okeke") || mockPlayers[3],
      mockPlayers.find(p => p.id === "p_goldin") || mockPlayers[2],
      mockPlayers.find(p => p.id === "p_thor") || mockPlayers[5],
      mockPlayers.find(p => p.id === "p_015") || mockPlayers[14],
      mockPlayers.find(p => p.id === "p_016") || mockPlayers[15],
      mockPlayers.find(p => p.id === "p_014") || mockPlayers[13],
    ].map(p => ({ ...p, starLevel: 0 }));

    setRoster(freshRoster);
    setCash(9999999999);
    setTk(9999);
    setPlayerStorageLimit(100);
    setLineupOverride({});
    setInventory({
      equipment: [],
      materials: {
        'mat_crafting': 99999,
        'mat_upgrade': 99999,
        'skill_tape': 99999,
      }
    });

    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("dream_team_save_v1");
      } catch (e) {}
    }
  };

  const expandStorage = () => {
    if (tk < 100) return { success: false, error: "Not enough VC to expand storage (Costs 100 VC)!" };
    setTk(prev => prev - 100);
    setPlayerStorageLimit(prev => prev + 10);
    return { success: true };
  };

  // --- STATE PERSISTENCE LAYER (localStorage) ---
  // Load state on mount safely
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dream_team_save_v1");
        if (saved) {
          const data = JSON.parse(saved);
          if (data.tk !== undefined) setTk(data.tk);
          if (data.cash !== undefined) setCash(data.cash);
          if (data.accountLevel !== undefined) setAccountLevel(data.accountLevel);
          if (data.accountExp !== undefined) setAccountExp(data.accountExp);
          if (data.campaignStage !== undefined) setCampaignStage(data.campaignStage);
          if (data.stadiumLevels !== undefined) setStadiumLevels(data.stadiumLevels);
          if (data.roster !== undefined) setRoster(normalizeRoster(data.roster));
          if (data.inventory !== undefined) setInventory(normalizeInventory(data.inventory));
          if (data.lineupOverride !== undefined) setLineupOverride(data.lineupOverride);
          if (data.strategyLevels !== undefined) setStrategyLevels(data.strategyLevels);
          if (data.playerStorageLimit !== undefined) setPlayerStorageLimit(data.playerStorageLimit);
          if (data.pendingSkillTraining !== undefined) setPendingSkillTraining(data.pendingSkillTraining);
        }
      } catch (err) {
        console.error("Failed to load saved Dream Team progression:", err);
      } finally {
        setIsLoaded(true);
      }
    } else {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!roster.some(player => (player.starLevel ?? 0) > 0 || player.starGrowthAppliedLevel === undefined)) return;
    setRoster(prev => normalizeRoster(prev));
  }, [isLoaded]);

  // Save state dynamically when mutated
  useEffect(() => {
    if (!isLoaded) return;
    if (typeof window !== "undefined") {
      try {
        const stateToSave = {
          tk,
          cash,
          accountLevel,
          accountExp,
          campaignStage,
          stadiumLevels,
          roster,
          inventory,
          lineupOverride,
          strategyLevels,
          playerStorageLimit,
          pendingSkillTraining
        };
        localStorage.setItem("dream_team_save_v1", JSON.stringify(stateToSave));
      } catch (err) {
        console.error("Failed to save Dream Team progression:", err);
      }
    }
  }, [isLoaded, tk, cash, accountLevel, accountExp, campaignStage, stadiumLevels, roster, inventory, lineupOverride, strategyLevels, playerStorageLimit, pendingSkillTraining]);

  // Derived state: active lineup and reserves
  // Ensure that no two players with the exact same NAME can be in the lineup at the same time!
  const usedLineupNames = new Set<string>();
  
  // 1. Process Court Overrides first
  const courtOverrides = (['PG', 'SG', 'SF', 'PF', 'C'] as const).map(pos => {
    const overrideId = lineupOverride[pos];
    if (overrideId) {
      const p = roster.find(player => player.id === overrideId);
      if (p && !usedLineupNames.has(p.name)) {
        usedLineupNames.add(p.name);
        return { pos, p };
      }
    }
    return null;
  });

  // 2. Process Explicit Bench Overrides
  const activeReserves = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map(pos => {
    const overrideId = lineupOverride[pos];
    if (overrideId) {
      const p = roster.find(player => player.id === overrideId);
      if (p && !usedLineupNames.has(p.name)) {
        usedLineupNames.add(p.name);
        return p;
      }
    }
    return null;
  }).filter(Boolean) as Player[];

  // 3. Process Court Fallbacks for empty slots
  const activeLineup = (['PG', 'SG', 'SF', 'PF', 'C'] as const).map(pos => {
    const overrideMatch = courtOverrides.find(co => co?.pos === pos);
    if (overrideMatch) return overrideMatch.p;

    // Fallback: if no override, find the best player for this position
    const fallback = [...roster]
      .filter(p => p.position === pos && !p.isInjured && !usedLineupNames.has(p.name))
      .sort((a, b) => b.ovr - a.ovr)[0];
    
    if (fallback) {
      usedLineupNames.add(fallback.name);
      return fallback;
    }
    return null;
  }).filter(Boolean) as Player[];
  
  // Calculate Salary
  const salaryCap = 15000;
  // Salary is now ONLY paid for players on the court and the bench
  const currentSalary = [...activeLineup, ...activeReserves].reduce((sum, p) => sum + Math.round(p.salary ?? p.ovr * 12.5), 0);
  
  // Calculate Team OFF and DEF from individual player stats + equipment
  let teamOffense = 0;
  let teamDefense = 0;
  activeLineup.forEach(p => {
    let off = p.offense;
    let def = p.defense;
    if (p.equipped) {
      Object.values(p.equipped).forEach(eq => {
        if (!eq) return;
        if (eq.bonus.statName === '3PT' || eq.bonus.statName === 'Speed') off += eq.bonus.value;
        if (eq.bonus.statName === 'Defense' || eq.bonus.statName === 'Stamina') def += eq.bonus.value;
      });
    }
    teamOffense += off;
    teamDefense += def;
  });
  teamOffense = Math.floor(teamOffense);
  teamDefense = Math.floor(teamDefense);

  const draftPlayer = (isPremium: boolean): { success: boolean; player?: Player; error?: string } => {
    if (isPremium && tk < 3000) return { success: false, error: "Not enough TK to purchase this pack!" };
    if (!isPremium && cash < 10000000) return { success: false, error: "Not enough Cash to purchase this pack!" };

    if (isPremium) setTk(prev => prev - 3000);
    else setCash(prev => prev - 10000000);

    const rand = Math.random();
    let selectedPlayer: Player;

    if (isPremium) {
      if (rand < 0.10) selectedPlayer = mockPlayers[0];
      else if (rand < 0.40) selectedPlayer = mockPlayers[1];
      else if (rand < 0.80) selectedPlayer = mockPlayers[4];
      else selectedPlayer = mockPlayers[5];
    } else {
      if (rand < 0.05) selectedPlayer = mockPlayers[3];
      else if (rand < 0.20) selectedPlayer = mockPlayers[6];
      else selectedPlayer = mockPlayers[7];
    }

    const newPlayer = { 
      ...selectedPlayer, 
      id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sourcePlayerId: selectedPlayer.sourcePlayerId ?? selectedPlayer.id
    };
    setRoster(prev => [newPlayer, ...prev]);

    return { success: true, player: newPlayer };
  };

  const finishMatch = (difficulty: import("@/lib/utils/matchTypes").Difficulty, offStrategy?: string, defStrategy?: string, isWin?: boolean): MatchResult => {
    let multiplier = 1;
    if (difficulty === 'NORMAL') multiplier = 2;
    if (difficulty === 'HARD') multiplier = 3.5;
    if (difficulty === 'EXPERT') multiplier = 5.0;
    if (difficulty === 'HELL_EXPERT') multiplier = 8.0;
    if (difficulty === 'DREAM_TEAM') multiplier = 10.0;

    // Calculate rewards with stadium level multipliers
    const gainedExp = Math.floor(50 * multiplier * (1 + stadiumLevels.gym * 0.15));
    const gainedCash = Math.floor(5000 * multiplier * (1 + stadiumLevels.arena * 0.1));
    const gainedCraftingMats = Math.floor((Math.random() * 5 + 2) * multiplier);
    
    let gainedUpgradeMats = 0;
    if (difficulty === 'DREAM_TEAM') {
      gainedUpgradeMats = Math.floor(Math.random() * 12 + 6);
    } else if (difficulty === 'HELL_EXPERT') {
      gainedUpgradeMats = Math.floor(Math.random() * 8 + 4);
    } else if (difficulty === 'EXPERT') {
      gainedUpgradeMats = Math.floor(Math.random() * 5 + 2);
    } else if (difficulty === 'HARD') {
      gainedUpgradeMats = Math.floor(Math.random() * 3 + 1);
    } else {
      gainedUpgradeMats = Math.random() > 0.5 ? 1 : 0;
    }

    let tapeChance = 0.02;
    if (difficulty === 'DREAM_TEAM') tapeChance = 0.75;
    else if (difficulty === 'HELL_EXPERT') tapeChance = 0.50;
    else if (difficulty === 'EXPERT') tapeChance = 0.25;
    else if (difficulty === 'HARD') tapeChance = 0.12;
    else if (difficulty === 'NORMAL') tapeChance = 0.05;
    const gainedSkillTapes = Math.random() < tapeChance ? 1 : 0;

    // Apply Account EXP
    let newExp = accountExp + gainedExp;
    let newLevel = accountLevel;
    const expNeeded = newLevel * 100; // simple formula
    if (newExp >= expNeeded) {
      newLevel += 1;
      newExp -= expNeeded;
    }
    setAccountLevel(newLevel);
    setAccountExp(newExp);
    setCash(prev => prev + gainedCash);
    if (isWin) {
      setCampaignStage(prev => Math.min(prev + 1, 30)); // max 30 stages
    }

    // Give EXP to Roster (simplified: all players get EXP)
    setRoster(prev => prev.map(p => {
      let pExp = p.exp + gainedExp;
      let pLevel = p.level;
      if (pExp >= pLevel * 50 && pLevel < p.maxLevel) {
        pLevel += 1;
        pExp = 0;
      }
      return { ...p, exp: pExp, level: pLevel, ovr: p.ovr };
    }));

    // Give Materials
    setInventory(prev => ({
      ...prev,
      materials: {
        ...prev.materials,
        mat_crafting: prev.materials.mat_crafting + gainedCraftingMats,
        mat_upgrade: prev.materials.mat_upgrade + gainedUpgradeMats,
        skill_tape: (prev.materials.skill_tape ?? 0) + gainedSkillTapes,
      }
    }));

    // Award strategy EXP
    if (offStrategy) {
      gainStrategyExp(offStrategy, 50);
    }
    if (defStrategy) {
      gainStrategyExp(defStrategy, 50);
    }

    const materialsDropped = [];
    if (gainedCraftingMats > 0) materialsDropped.push({ id: 'mat_crafting' as MaterialId, qty: gainedCraftingMats });
    if (gainedUpgradeMats > 0) materialsDropped.push({ id: 'mat_upgrade' as MaterialId, qty: gainedUpgradeMats });
    if (gainedSkillTapes > 0) materialsDropped.push({ id: 'skill_tape' as MaterialId, qty: gainedSkillTapes });

    return {
      exp: gainedExp,
      cash: gainedCash,
      materials: materialsDropped,
      playersExpGained: gainedExp,
      strategyExpGained: offStrategy && defStrategy ? {
        offName: offStrategy,
        offExp: 50,
        defName: defStrategy,
        defExp: 50
      } : undefined
    };
  };

  const craftEquipment = (slot: EquipmentSlot): Equipment | null => {
    const recipe = craftingRecipes[slot];
    if (inventory.materials.mat_crafting < recipe.cost) return null;

    // Deduct mats
    setInventory(prev => ({
      ...prev,
      materials: {
        ...prev.materials,
        mat_crafting: prev.materials.mat_crafting - recipe.cost
      }
    }));

    // Roll stats
    const randomBonus = Math.floor(Math.random() * (recipe.maxBonus - recipe.minBonus + 1)) + recipe.minBonus;
    
    const newEquip: Equipment = {
      id: `eq_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      blueprintId: `bp_${slot.toLowerCase()}`,
      name: `Basic ${slot}`,
      slot,
      upgradeLevel: 0,
      bonus: {
        statName: recipe.statName,
        value: randomBonus,
        isPercentage: recipe.isPercentage
      }
    };

    setInventory(prev => ({
      ...prev,
      equipment: [...prev.equipment, newEquip]
    }));

    return newEquip;
  };

  const upgradeEquipment = (equipmentId: string): { success: boolean; newLevel?: number; error?: string } => {
    const equipIndex = inventory.equipment.findIndex(e => e.id === equipmentId);
    if (equipIndex === -1) return { success: false, error: "Equipment not found" };

    const equip = inventory.equipment[equipIndex];
    const currentLevel = equip.upgradeLevel;
    
    // Cost scales with level
    const matCost = currentLevel + 1;
    const cashCost = (currentLevel + 1) * 5000;

    if (inventory.materials.mat_upgrade < matCost) return { success: false, error: "Not enough Upgrade Stones" };
    if (cash < cashCost) return { success: false, error: "Not enough Cash" };

    // Deduct resources
    setInventory(prev => ({
      ...prev,
      materials: {
        ...prev.materials,
        mat_upgrade: prev.materials.mat_upgrade - matCost
      }
    }));
    setCash(prev => prev - cashCost);

    // Probability: +0->+1 = 90%, +1->+2 = 75%, +2->+3 = 60%, drops by 15% each time
    const successRate = Math.max(0.1, 0.90 - (currentLevel * 0.15));
    const isSuccess = Math.random() <= successRate;

    if (isSuccess) {
      const updatedEquip = { ...equip, upgradeLevel: currentLevel + 1 };
      // Increase stat bonus by 10% base value roughly
      updatedEquip.bonus.value += equip.bonus.isPercentage ? 1 : 2;

      setInventory(prev => {
        const newEq = [...prev.equipment];
        newEq[equipIndex] = updatedEquip;
        return { ...prev, equipment: newEq };
      });
      return { success: true, newLevel: currentLevel + 1 };
    } else {
      return { success: false, error: "Upgrade failed! Materials lost." };
    }
  };

  // Passive store cash accumulator loop
  useEffect(() => {
    const interval = setInterval(() => {
      setPassiveStoreCash(prev => {
        const cap = stadiumLevels.store * 50000;
        const gain = stadiumLevels.store * 15;
        return Math.min(cap, prev + gain);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [stadiumLevels.store]);

  const claimStoreRevenue = () => {
    const claimed = passiveStoreCash;
    setCash(prev => prev + claimed);
    setPassiveStoreCash(0);
    return claimed;
  };

  const upgradeFacility = (facility: keyof StadiumLevels) => {
    const currentLvl = stadiumLevels[facility];
    const cost = currentLvl * 50000;
    if (cash < cost) {
      return { success: false, error: "Not enough Cash" };
    }
    setCash(prev => prev - cost);
    setStadiumLevels(prev => ({
      ...prev,
      [facility]: currentLvl + 1
    }));
    return { success: true };
  };

  const autoLineup = () => {
    setLineupOverride(() => {
      const copy: Record<string, string> = {};
      const usedNames = new Set<string>();

      // 1. Fill Court first
      (['PG', 'SG', 'SF', 'PF', 'C'] as PlayerPosition[]).forEach(pos => {
        const bestPlayer = [...roster]
          .filter(p => p.position === pos && !p.isInjured && !usedNames.has(p.name))
          .sort((a, b) => b.ovr - a.ovr)[0];
        
        if (bestPlayer) {
          copy[pos] = bestPlayer.id;
          usedNames.add(bestPlayer.name);
        }
      });

      // 2. Fill Bench with the highest OVR remaining players (regardless of position)
      const remainingPlayers = [...roster]
        .filter(p => !p.isInjured && !usedNames.has(p.name))
        .sort((a, b) => b.ovr - a.ovr);

      ['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].forEach((benchSlot, index) => {
        if (remainingPlayers[index]) {
          copy[benchSlot] = remainingPlayers[index].id;
          usedNames.add(remainingPlayers[index].name);
        }
      });

      return copy;
    });
  };

  // Auto-fill lineup on fresh start if it is completely empty
  useEffect(() => {
    if (isLoaded && roster.length > 0 && Object.keys(lineupOverride).length === 0) {
      autoLineup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, roster.length, Object.keys(lineupOverride).length]);

  const setLineupSlot = (position: string, playerId: string): { success: boolean; error?: string } => {
    const p = roster.find(player => player.id === playerId);
    if (p && p.isInjured) {
      return { success: false, error: `Cannot slot ${p.name} into the lineup: Player is injured!` };
    }
    
    setLineupOverride(prev => {
      const copy = { ...prev };
      
      // Determine where the dragged player came from
      let oldPos: string | null = null;
      for (const [pos, id] of Object.entries(copy)) {
        if (id === playerId) {
          oldPos = pos;
          break;
        }
      }
      if (!oldPos && p) {
        // Check if they were on the court implicitly via fallback
        const isOnCourtFallback = activeLineup.some(al => al.id === playerId);
        if (isOnCourtFallback) {
          oldPos = p.position; // Fallback logic always places them in their native position
        }
      }

      // Determine who is currently in the target slot explicitly
      const explicitDisplacedId = copy[position];
      
      // 1. Remove the dragged player from its old position
      if (oldPos) {
        delete copy[oldPos];
      }
      
      // 2. Remove any other assigned instance with the exact same NAME (enforce One-Player Rule actively)
      if (p) {
        for (const [pos, id] of Object.entries(copy)) {
          const assignedPlayer = roster.find(r => r.id === id);
          if (assignedPlayer && assignedPlayer.name === p.name && id !== playerId) {
            delete copy[pos];
          }
        }
      }
      
      // 3. Assign the target player to the requested slot
      copy[position] = playerId;
      
      // 4. Perform the swap for the displaced player
      if (oldPos && oldPos !== position) {
        if (explicitDisplacedId && explicitDisplacedId !== playerId) {
          const displacedPlayer = roster.find(r => r.id === explicitDisplacedId);
          // Only swap if the displaced player doesn't have the same name (which we just unassigned)
          if (!displacedPlayer || (p && displacedPlayer.name !== p.name)) {
            copy[oldPos] = explicitDisplacedId;
          }
        }
      }
      
      return copy;
    });
    return { success: true };
  };

  const clearLineupSlot = (position: string) => {
    setLineupOverride(prev => {
      const copy = { ...prev };
      delete copy[position];
      return copy;
    });
  };

  const firePlayer = (playerId: string): { success: boolean; refundAmount?: number; error?: string } => {
    const player = roster.find(p => p.id === playerId);
    if (!player) return { success: false, error: "Player not found" };

    if (roster.length <= 5) {
      return { success: false, error: "Roster violation: You must have at least 5 players in your squad!" };
    }

    const price = player.price || 500;
    const taxPenalty = player.isInjured ? 0.95 : 1.00;
    const refundAmount = Math.floor(price * taxPenalty);

    // Clear overrides if they contain the fired player
    setLineupOverride(prev => {
      const copy = { ...prev };
      for (const [pos, id] of Object.entries(copy)) {
        if (id === playerId) {
          delete copy[pos];
        }
      }
      return copy;
    });

    setRoster(prev => prev.filter(p => p.id !== playerId));
    setCash(prev => prev + refundAmount);

    return { success: true, refundAmount };
  };

  const addCash = (amount: number) => setCash(prev => prev + amount);
  const addTk = (amount: number) => setTk(prev => prev + amount);

  const signPlayerToRoster = (player: Player): { success: boolean; error?: string } => {
    // Enforce hard cap: Court(5) + Bench(6) + StorageLimit
    if (roster.length >= 11 + playerStorageLimit) {
      return { success: false, error: `Roster Full! Maximum capacity reached (Limit: ${11 + playerStorageLimit}). Upgrade Storage.` };
    }

    const cost = (player.price || 500) * 10000;
    if (cash < cost) {
      return { success: false, error: "Not enough Cash to sign this player!" };
    }

    setCash(prev => prev - cost);
    const newPlayer = { 
      ...player, 
      id: `p_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sourcePlayerId: player.sourcePlayerId ?? player.id
    };
    setRoster(prev => [newPlayer, ...prev]);
    return { success: true };
  };

  const trainSpecialSkill = (
    playerId: string,
    options?: { force?: boolean }
  ): { success: boolean; skill?: string; quality?: string; error?: string } => {
    const player = roster.find(p => p.id === playerId);
    if (!player) return { success: false, error: "Player not found on your roster!" };

    if (pendingSkillTraining && !options?.force) {
      return { success: false, error: "Please resolve your pending training before rolling again." };
    }

    if ((player.starLevel ?? 0) < 1) {
      return { success: false, error: "Player must be at least Star 1 to learn special skills." };
    }

    if ((inventory.materials.skill_tape ?? 0) < 1) {
      return { success: false, error: "Not enough Skill Tape to train a special skill." };
    }

    const specialSkillSlots = [...(player.specialSkillSlots ?? [null, null])] as (string | null)[];
    
    let skill = rollSpecialSkillName();
    // Duplicate Protection: Do not roll a skill they already have equipped, or a skill from the same family
    while (specialSkillSlots.includes(skill) || wouldCreateDuplicateFamily(player, skill)) {
      skill = rollSpecialSkillName();
    }
    const quality = rollSkillQuality();

    setInventory(prev => ({
      ...prev,
      materials: {
        ...prev.materials,
        skill_tape: Math.max(0, (prev.materials.skill_tape ?? 0) - 1),
      }
    }));

    setPendingSkillTraining({
      playerId,
      newSkill: skill,
      newQuality: quality
    });

    return { success: true, skill, quality };
  };

  const acceptSkillTraining = (slotIndex: 0 | 1): { success: boolean; error?: string } => {
    if (!pendingSkillTraining) return { success: false, error: "No pending training found." };
    
    const player = roster.find(p => p.id === pendingSkillTraining.playerId);
    if (!player) return { success: false, error: "Player not found." };
    
    const starRequired = getSpecialSlotUnlockStar(slotIndex);
    if ((player.starLevel ?? 0) < starRequired) {
      return { success: false, error: `Special slot ${slotIndex + 1} unlocks at Star ${starRequired}.` };
    }

    setRoster(prev => prev.map(p => {
      if (p.id !== pendingSkillTraining.playerId) return p;
      const specialSkillSlots = [...(p.specialSkillSlots ?? [null, null])];
      specialSkillSlots[slotIndex] = pendingSkillTraining.newSkill;
      return {
        ...p,
        specialSkillSlots,
        skillRarities: {
          ...(p.skillRarities ?? {}),
          [pendingSkillTraining.newSkill]: pendingSkillTraining.newQuality as any,
        },
      };
    }));
    
    setPendingSkillTraining(null);
    return { success: true };
  };

  const rejectSkillTraining = (): { success: boolean; error?: string } => {
    if (!pendingSkillTraining) return { success: false, error: "No pending training found." };
    setPendingSkillTraining(null);
    return { success: true };
  };

  const ascendPlayer = (playerId: string, confirmSacrifice?: boolean): { success: boolean; rolled?: number; chanceNeeded?: number; error?: string; pendingWarning?: boolean } => {
    const playerIndex = roster.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      return { success: false, error: "Player not found on your roster!" };
    }
    const player = roster[playerIndex];
    const currentStars = player.starLevel ?? 0;

    if (currentStars >= 25) {
      return { success: false, error: "This card is already at maximum ascension (Red ★5)!" };
    }

    const targetStars = currentStars + 1;
    const targetInfo = getStarTierAndLevel(targetStars);
    const tier = targetInfo.tier;
    const lvl = targetInfo.level;

    // Calculate MAT cost: 20 * level * tierMult
    let tierMult = 1.0;
    if (tier === "Blue") tierMult = 1.5;
    else if (tier === "Violet") tierMult = 2.0;
    else if (tier === "Orange") tierMult = 2.5;
    else if (tier === "Red") tierMult = 3.0;

    const matCost = Math.floor(20 * lvl * tierMult);

    if (inventory.materials.mat_upgrade < matCost) {
      return { success: false, error: `Not enough Upgrade MATs! Required: ${matCost}, Owned: ${inventory.materials.mat_upgrade}` };
    }

    const requiredDuplicates = getRequiredDuplicateCount(tier, lvl);

    let duplicatesToSacrifice: Player[] = [];
    if (requiredDuplicates > 0) {
      const dupCandidates = getAscensionCandidates(player, roster, activeLineup, activeReserves);

      if (dupCandidates.length < requiredDuplicates) {
        return { 
          success: false, 
          error: `Ascension requires sacrificing ${requiredDuplicates} exact Duplicate(s) of ${player.name} that are NOT in your active starting 5 lineup or reserves bench!` 
        };
      }
      
      const sortedDupCandidates = sortAscensionCandidates(dupCandidates);
      
      duplicatesToSacrifice = sortedDupCandidates.slice(0, requiredDuplicates);
      
      if (!confirmSacrifice) {
        const skillsToWarn: PendingAscendWarning["learnedSkills"] = [];
        for (const dup of duplicatesToSacrifice) {
          const summaries = getLearnedSkillSummary(dup);
          if (summaries.length > 0) {
            summaries.forEach(s => skillsToWarn.push({ ...s, playerName: dup.name }));
          }
        }
        if (skillsToWarn.length > 0) {
          setPendingAscendSacrificeWarning({
            baseCardId: playerId,
            targetStarLevel: targetStars,
            requiredDuplicates,
            duplicateIds: duplicatesToSacrifice.map(d => d.id),
            learnedSkills: skillsToWarn
          });
          return { success: false, pendingWarning: true };
        }
      }
    }

    // Success rate calculation based on Star Color Tier
    let baseChance = 1.0;
    let decayRate = 0.10;
    if (tier === "Silver") {
      baseChance = 1.0;
      decayRate = 0.10;
    } else if (tier === "Blue") {
      baseChance = 0.50;
      decayRate = 0.10;
    } else if (tier === "Violet") {
      baseChance = 0.25;
      decayRate = 0.10;
    } else if (tier === "Orange") {
      baseChance = 0.12;
      decayRate = 0.10;
    } else if (tier === "Red") {
      baseChance = 0.083333;
      decayRate = 0.10;
    }

    const starFactor = 1.0 - (lvl - 1) * decayRate;
    const successChance = baseChance * starFactor;

    const rolled = Math.random();
    const isSuccess = rolled <= successChance;

    setInventory(prev => ({
      ...prev,
      materials: {
        ...prev.materials,
        mat_upgrade: prev.materials.mat_upgrade - matCost
      }
    }));

    if (isSuccess) {
      setRoster(prev => {
        const idsToRemove = new Set(duplicatesToSacrifice.map(d => d.id));
        const afterSacrifice = prev.filter(p => !idsToRemove.has(p.id));
        return afterSacrifice.map(p => {
          if (p.id === playerId) {
            return unlockSpecialSkillQualities(applyStarGrowth(p, targetStars), targetStars);
          }
          return p;
        });
      });

      return {
        success: true,
        rolled: Math.round(rolled * 100),
        chanceNeeded: Math.round(successChance * 100)
      };
    } else {
      return {
        success: false,
        rolled: Math.round(rolled * 100),
        chanceNeeded: Math.round(successChance * 100),
        error: "Ascension Failed! Upgrade Stones have been consumed, but your player cards are completely safe."
      };
    }
  };

  return (
    <GameStateContext.Provider value={{ 
      tk, 
      cash, 
      accountLevel, 
      accountExp, 
      campaignStage,
      roster, 
      inventory, 
      activeLineup, 
      activeReserves,
      lineupOverride,
      teamOffense, 
      teamDefense, 
      playerStorageLimit,
      expandStorage,
      stadiumLevels, 
      passiveStoreCash, 
      draftPlayer, 
      finishMatch, 
      craftEquipment, 
      upgradeEquipment, 
      upgradeFacility, 
      claimStoreRevenue, 
      autoLineup, 
      setLineupSlot,
      clearLineupSlot,
      firePlayer,
      addCash,
      addTk,
      currentSalary,
      salaryCap,
      seasonMode,
      setSeasonMode,
      strategyLevels,
      gainStrategyExp,
      upgradeStrategy,
      signPlayerToRoster,
      ascendPlayer,
      pendingSkillTraining,
      acceptSkillTraining,
      rejectSkillTraining,
      trainSpecialSkill,
      resetRosterProgress,
      setCampaignStage,
      pendingAscendSacrificeWarning,
      cancelAscendSacrifice,
    }}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error("useGameState must be used within a GameStateProvider");
  }
  return context;
}
