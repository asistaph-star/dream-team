"use client";

import { useState } from "react";
import { useGameState } from "@/lib/context/GameStateContext";
import { EquipmentSlot, Equipment } from "@/lib/types/item";
import { mockMaterials, craftingRecipes } from "@/lib/data/mockItems";
import { getTierColor, getTierRating } from "@/lib/data/mockPlayers";
import { Player } from "@/lib/types/player";
import { Hammer, AlertTriangle, Shield, Zap, Activity, PackageOpen, ChevronRight } from "lucide-react";

import { PlayerHexProfileModal } from "@/components/player/PlayerHexProfileModal";

type Tab = 'MATERIALS' | 'EQUIPMENT' | 'CRAFTING';

const getStarTierAndLevel = (starLevel: number) => {
  if (!starLevel || starLevel === 0) return { tier: "None", level: 0, color: "text-gray-500", label: "★0", starColor: "text-gray-600" };
  const index = starLevel - 1;
  const tierIndex = Math.min(4, Math.floor(index / 5));
  const level = (index % 5) + 1;
  
  const tiers = [
    { name: "Silver", color: "text-slate-300", label: "Silver", starColor: "text-slate-300" },
    { name: "Blue", color: "text-blue-400", label: "Blue", starColor: "text-blue-400" },
    { name: "Violet", color: "text-purple-400", label: "Violet", starColor: "text-purple-400" },
    { name: "Orange", color: "text-orange-400", label: "Orange", starColor: "text-orange-400" },
    { name: "Red", color: "text-red-500", label: "Red", starColor: "text-red-500" }
  ];
  
  const tier = tiers[tierIndex] || tiers[4];
  return { tier: tier.name, level, color: tier.color, label: `${tier.label} ★${level}`, starColor: tier.starColor };
};

const getRarityColorInfo = (rarity: string) => {
  switch (rarity) {
    case "Mythic": return { name: "Red", border: "border-red-500", text: "text-red-500", bg: "bg-red-950/40" };
    case "Legendary": return { name: "Orange", border: "border-orange-500", text: "text-orange-500", bg: "bg-orange-950/40" };
    case "Epic": return { name: "Violet", border: "border-purple-500", text: "text-purple-400", bg: "bg-purple-950/40" };
    case "Rare": return { name: "Blue", border: "border-blue-500", text: "text-blue-400", bg: "bg-blue-950/40" };
    default: return { name: "Common", border: "border-slate-500", text: "text-slate-400", bg: "bg-slate-950/40" };
  }
};

const RawItem = ({ icon, glowColor }: { icon: string, glowColor: string }) => (
  <div className="relative w-full h-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
    {/* Subtle radial aura behind the item */}
    <div 
      className="absolute inset-0 opacity-20 group-hover:opacity-50 transition-opacity duration-300 pointer-events-none" 
      style={{ background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)` }} 
    />
    
    {/* The Item */}
    <div 
      className="text-5xl md:text-7xl transition-all duration-300 group-hover:-translate-y-2 relative z-10" 
      style={{ filter: `drop-shadow(0 15px 15px ${glowColor}) saturate(1.5)` }}
    >
      {icon}
    </div>
  </div>
);

const getMaterialIcon = (id: string) => {
  if (id === 'skill_tape') return <RawItem icon="TAPE" glowColor="rgba(239,68,68,0.8)" />;
  if (id === 'mat_upgrade') return <RawItem icon="💎" glowColor="rgba(168,85,247,0.8)" />;
  if (id === 'mat_crafting') return <RawItem icon="🧵" glowColor="rgba(16,185,129,0.8)" />;
  if (id === 'mat_fluid') return <RawItem icon="🧪" glowColor="rgba(59,130,246,0.8)" />;
  return <RawItem icon="💰" glowColor="rgba(234,179,8,0.8)" />;
};

const getEquipmentEmoji = (slot: string) => {
  let icon = '📦';
  if (slot === 'Shoes') icon = '👟';
  if (slot === 'Tshirt') icon = '👕';
  if (slot === 'Jersey') icon = '🎽';
  if (slot === 'Headband') icon = '🥽';
  if (slot === 'KneePads') icon = '🦿';
  return <RawItem icon={icon} glowColor="rgba(6,182,212,0.8)" />;
};

export default function InventoryPage() {
  const { 
    inventory, cash, roster, activeLineup, activeReserves, tk, playerStorageLimit, expandStorage,
    craftEquipment, upgradeEquipment, ascendPlayer, setLineupSlot
  } = useGameState();
  
  const [activeTab, setActiveTab] = useState<Tab>('MATERIALS');
  
  const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);
  const [selectedMatId, setSelectedMatId] = useState<string | null>(null);
  const [selectedCraftSlot, setSelectedCraftSlot] = useState<EquipmentSlot | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const [upgradeResult, setUpgradeResult] = useState<{ success: boolean; msg?: string } | null>(null);
  const [isAscending, setIsAscending] = useState(false);
  const [ascensionStatus, setAscensionStatus] = useState<{ success: boolean; msg?: string } | null>(null);
  const [craftResult, setCraftResult] = useState<{ success: boolean; msg?: string } | null>(null);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedEquip(null);
    setSelectedMatId(null);
    setSelectedCraftSlot(null);
    setSelectedPlayerId(null);
    setUpgradeResult(null);
    setAscensionStatus(null);
    setCraftResult(null);
  };

  const handleCraft = () => {
    if (!selectedCraftSlot) return;
    const res = craftEquipment(selectedCraftSlot);
    if (res) {
      setCraftResult({ success: true, msg: `Crafted ${res.name} (+${res.bonus.value}${res.bonus.isPercentage ? '%' : ''})` });
    } else {
      setCraftResult({ success: false, msg: "Not enough Crafting Thread!" });
    }
    setTimeout(() => setCraftResult(null), 3000);
  };

  const handleUpgrade = () => {
    if (!selectedEquip) return;
    const res = upgradeEquipment(selectedEquip.id);
    if (res.success) {
      setUpgradeResult({ success: true, msg: "Upgrade Successful!" });
      const updated = inventory.equipment.find(e => e.id === selectedEquip.id);
      if (updated) setSelectedEquip(updated);
    } else {
      setUpgradeResult({ success: false, msg: res.error });
    }
    setTimeout(() => setUpgradeResult(null), 3000);
  };

  const handleAscension = () => {
    const selectedPlayer = roster.find(p => p.id === selectedPlayerId);
    if (!selectedPlayer) return;
    setIsAscending(true);
    
    setTimeout(() => {
      const res = ascendPlayer(selectedPlayer.id);
      setIsAscending(false);
      if (res.success) {
        setAscensionStatus({ success: true, msg: `Ascension Successful! ★${(selectedPlayer.starLevel ?? 0) + 1} Unlocked` });
      } else {
        setAscensionStatus({ success: false, msg: res.error });
      }
    }, 1200);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'MATERIALS', label: 'Prop' },
    { id: 'EQUIPMENT', label: 'Gear' },
    { id: 'CRAFTING', label: 'Craft' }
  ];

  const selectedPlayer = roster.find(p => p.id === selectedPlayerId) || null;
  const storagePlayers = roster.filter(p => !activeLineup.find(a => a.id === p.id) && !activeReserves.find(a => a.id === p.id));

  return (
    <div className="flex h-full w-full bg-gradient-to-br from-slate-900 via-zinc-900 to-zinc-950 text-white overflow-hidden font-sans relative">
      {/* Carbon dot grid backdrop */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 0), radial-gradient(rgba(255,255,255,1) 1px, transparent 0)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px' }} />

      {/* ── Left Sidebar ── */}
      <div className="w-[200px] sm:w-[240px] bg-zinc-900/60 backdrop-blur-md border-r border-white/10 flex flex-col pt-10 z-10 shadow-[10px_0_30px_rgba(0,0,0,0.3)]">
        <div className="px-8 mb-10 border-l-4 border-cyan-500 ml-4">
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase text-shadow-sm leading-none">INVENTORY</h1>
        </div>
        <div className="flex flex-col gap-2 px-4">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative px-6 py-4 text-left font-black tracking-widest uppercase transition-all overflow-hidden skew-x-[-8deg] ${
                  isActive ? 'text-white border-r-4 border-cyan-400' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5 border-r-4 border-transparent'
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-cyan-600/30" />
                )}
                <span className="relative z-10 text-sm italic skew-x-[8deg] block">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Middle Grid ── */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto relative z-10">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 auto-rows-max">
          
          {/* MATERIALS GRID */}
          {activeTab === 'MATERIALS' && Object.entries(inventory.materials).map(([id, qty]) => {
            const mat = mockMaterials[id];
            if (!mat) return null;
            const isSelected = selectedMatId === id;
            const bgColor = id === 'skill_tape' ? 'from-red-600 to-red-950' : id === 'mat_upgrade' ? 'from-purple-600 to-purple-900' : id === 'mat_crafting' ? 'from-green-600 to-green-900' : 'from-blue-600 to-blue-900';
            return (
              <div
                key={id}
                onClick={() => setSelectedMatId(id)}
                className={`aspect-square relative cursor-pointer group transition-transform ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a0b]' : ''}`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {getMaterialIcon(id)}
                </div>
                <div className="absolute bottom-1 right-2 text-white font-black text-xs drop-shadow-md z-20 italic">
                  {qty >= 1000 ? `${(qty/1000).toFixed(1)}K` : qty}
                </div>
              </div>
            );
          })}

          {/* EQUIPMENT GRID */}
          {activeTab === 'EQUIPMENT' && inventory.equipment.map(eq => {
            const isSelected = selectedEquip?.id === eq.id;
            return (
              <div
                key={eq.id}
                onClick={() => setSelectedEquip(eq)}
                className={`aspect-square relative cursor-pointer group transition-transform ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a0b]' : ''}`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {getEquipmentEmoji(eq.slot)}
                </div>
                {eq.upgradeLevel > 0 && (
                  <div className="absolute top-2 left-2 bg-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 skew-x-[-6deg] z-20 shadow-[2px_2px_0_rgba(0,0,0,1)]">
                    <span className="skew-x-[6deg] block">+{eq.upgradeLevel}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* CRAFTING GRID */}
          {activeTab === 'CRAFTING' && Object.entries(craftingRecipes).map(([slot, recipe]) => {
            const isSelected = selectedCraftSlot === slot;
            return (
              <div
                key={slot}
                onClick={() => setSelectedCraftSlot(slot as EquipmentSlot)}
                className={`aspect-square relative cursor-pointer group transition-transform ${isSelected ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#0a0a0b]' : ''}`}
              >
                <div className="absolute inset-0 flex items-center justify-center grayscale opacity-80 mix-blend-luminosity hover:mix-blend-normal hover:grayscale-0 transition-all duration-300">
                  {getEquipmentEmoji(slot)}
                </div>
                <div className="absolute bottom-2 right-2 z-20">
                  <span className="text-[9px] font-black text-black bg-cyan-400 px-2 py-0.5 skew-x-[-6deg] inline-block shadow-[2px_2px_0_rgba(0,0,0,1)]">
                    <span className="skew-x-[6deg] block">RECIPE</span>
                  </span>
                </div>
              </div>
            );
          })}


        </div>
        
        {/* Empty States */}
        {((activeTab === 'EQUIPMENT' && inventory.equipment.length === 0)) && (
          <div className="flex items-center justify-center h-full opacity-50 absolute inset-0 pointer-events-none">
            <div className="text-zinc-500 font-bold uppercase tracking-widest bg-zinc-900/50 px-6 py-3 rounded-xl border border-white/5">
              No items found
            </div>
          </div>
        )}
      </div>

      {/* ── Right Detail Panel ── */}
      <div className="w-[300px] sm:w-[340px] bg-zinc-900/70 backdrop-blur-md border-l border-white/10 z-20 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.3)] h-full overflow-hidden shrink-0">
        
        {/* DETAILS: MATERIALS */}
        {activeTab === 'MATERIALS' && selectedMatId && (() => {
          const mat = mockMaterials[selectedMatId];
          const qty = inventory.materials[selectedMatId as keyof typeof inventory.materials] || 0;
          return (
            <div className="flex-1 p-6 flex flex-col overflow-y-auto">
              <div className="flex justify-center mb-6 mt-4">
                <div className="w-32 h-32 relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent rounded-full blur-xl" />
                  <div className="scale-150">{getMaterialIcon(selectedMatId)}</div>
                </div>
              </div>
              <div className="text-center mb-6">
                <div className="text-sm font-bold text-zinc-400 mb-1">Owned: <span className="text-white">{qty.toLocaleString()}</span></div>
                <div className="bg-gradient-to-r from-transparent via-cyan-600 to-transparent py-2 px-4 shadow-[0_0_15px_rgba(8,145,178,0.2)]">
                  <h2 className="text-lg font-black text-white italic tracking-widest uppercase">{mat.name}</h2>
                </div>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed mb-6">{mat.description}</p>
              
              <div className="mt-auto">
                <div className="border-t border-white/10 pt-4 relative">
                  <span className="absolute -top-2 left-4 bg-zinc-900 px-2 text-[10px] font-black text-cyan-400 uppercase tracking-widest">How to Obtain</span>
                  <div className="flex flex-col gap-2 mt-3">
                    <div className="flex justify-between items-center bg-white/5 hover:bg-white/10 cursor-pointer p-3 text-xs font-bold text-zinc-300 rounded transition-colors">
                      Store - Items <ChevronRight size={14} className="text-zinc-500" />
                    </div>
                    <div className="flex justify-between items-center bg-white/5 hover:bg-white/10 cursor-pointer p-3 text-xs font-bold text-zinc-300 rounded transition-colors">
                      Career Challenge <ChevronRight size={14} className="text-zinc-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* DETAILS: EQUIPMENT */}
        {activeTab === 'EQUIPMENT' && selectedEquip && (() => {
          const currentLevel = selectedEquip.upgradeLevel;
          const matCost = currentLevel + 1;
          const cashCost = (currentLevel + 1) * 5000;
          const successRate = Math.max(0.1, 0.90 - (currentLevel * 0.15)) * 100;
          const canUpgrade = inventory.materials.mat_upgrade >= matCost && cash >= cashCost;
          
          return (
            <div className="flex-1 p-6 flex flex-col overflow-y-auto">
              <div className="flex justify-center mb-6 mt-4">
                <div className="w-32 h-32 relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 to-transparent rounded-full blur-xl" />
                  <div className="scale-150">{getEquipmentEmoji(selectedEquip.slot)}</div>
                </div>
              </div>
              <div className="text-center mb-4">
                <div className="text-sm font-bold text-zinc-400 mb-1">Level <span className="text-yellow-400">+{currentLevel}</span></div>
                <div className="bg-gradient-to-r from-transparent via-blue-600 to-transparent py-2 shadow-[0_0_15px_rgba(37,99,235,0.2)]">
                  <h2 className="text-lg font-black text-white italic tracking-widest uppercase">{selectedEquip.name}</h2>
                </div>
              </div>
              
              <div className="bg-zinc-800/80 rounded-xl p-4 mb-6 border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] skew-x-[-2deg]">
                <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1 italic skew-x-[2deg]">Effect</div>
                <div className="text-lg font-black text-cyan-400 italic skew-x-[2deg]">
                  +{selectedEquip.bonus.value}{selectedEquip.bonus.isPercentage ? '%' : ''} {selectedEquip.bonus.statName}
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-5 relative">
                <span className="absolute -top-[10px] left-4 bg-zinc-800 px-3 text-[10px] font-black text-cyan-400 uppercase tracking-widest italic skew-x-[-6deg] rounded-sm">Upgrade Info</span>
                <div className="grid grid-cols-3 gap-2 bg-zinc-800/50 rounded-xl p-3 text-center mb-1 border border-white/5 skew-x-[-2deg]">
                  <div className="skew-x-[2deg]">
                    <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider italic">Rate</div>
                    <div className={`text-sm font-black italic ${successRate >= 70 ? 'text-emerald-400' : 'text-yellow-400'}`}>{successRate.toFixed(0)}%</div>
                  </div>
                  <div className="skew-x-[2deg]">
                    <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider italic">Stones</div>
                    <div className={`text-sm font-black font-mono italic ${inventory.materials.mat_upgrade >= matCost ? 'text-purple-400' : 'text-rose-400'}`}>{matCost}</div>
                  </div>
                  <div className="skew-x-[2deg]">
                    <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider italic">Cash</div>
                    <div className={`text-sm font-black font-mono italic ${cash >= cashCost ? 'text-emerald-400' : 'text-rose-400'}`}>${(cashCost/1000).toFixed(0)}K</div>
                  </div>
                </div>

                {upgradeResult && (
                  <div className={`py-2 px-3 rounded-lg text-center text-[10px] font-black italic border skew-x-[-4deg] ${upgradeResult.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                    <span className="skew-x-[4deg] block">{upgradeResult.msg}</span>
                  </div>
                )}

                <button
                  onClick={handleUpgrade}
                  disabled={!canUpgrade}
                  className={`w-full py-4 font-black text-base tracking-widest uppercase italic transition-all active:scale-95 skew-x-[-6deg] overflow-hidden relative ${
                    canUpgrade
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-700 text-white shadow-[0_5px_15px_rgba(6,182,212,0.4)] hover:shadow-[0_5px_25px_rgba(6,182,212,0.6)] border-b-4 border-blue-900'
                      : 'bg-zinc-900 text-zinc-600 border-b-4 border-zinc-950 cursor-not-allowed'
                  }`}
                >
                  {canUpgrade && <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:200%_100%] animate-[shine_2s_infinite]" />}
                  <span className="skew-x-[6deg] block relative z-10">Enhance</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* DETAILS: CRAFTING */}
        {activeTab === 'CRAFTING' && selectedCraftSlot && (() => {
          const recipe = craftingRecipes[selectedCraftSlot as EquipmentSlot];
          const canCraft = inventory.materials.mat_crafting >= recipe.cost;
          return (
            <div className="flex-1 p-6 flex flex-col overflow-y-auto">
              <div className="flex justify-center mb-6 mt-4">
                <div className="w-32 h-32 relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-b from-green-500/20 to-transparent rounded-full blur-xl" />
                  <div className="scale-150">{getEquipmentEmoji(selectedCraftSlot)}</div>
                </div>
              </div>
              <div className="text-center mb-6">
                <div className="text-sm font-bold text-zinc-400 mb-1">Recipe Blueprint</div>
                <div className="bg-gradient-to-r from-transparent via-zinc-600 to-transparent py-2 shadow-[0_0_15px_rgba(82,82,91,0.2)]">
                  <h2 className="text-lg font-black text-white italic tracking-widest uppercase">Craft {selectedCraftSlot}</h2>
                </div>
              </div>
              
              <div className="bg-black/30 rounded-xl p-4 mb-6 border border-white/5">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Potential Effect</div>
                <div className="text-sm font-black text-green-400">
                  +{recipe.minBonus}–{recipe.maxBonus}{recipe.isPercentage ? '%' : ''} {recipe.statName}
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4 relative">
                <span className="absolute -top-2 left-4 bg-zinc-900 px-2 text-[10px] font-black text-cyan-400 uppercase tracking-widest">Requirement</span>
                
                <div className="bg-black/30 rounded-xl p-3 flex justify-between items-center mb-1 border border-white/5">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cost (Thread)</span>
                  <span className={`text-sm font-black font-mono ${canCraft ? 'text-green-400' : 'text-rose-400'}`}>
                    {recipe.cost}
                  </span>
                </div>

                {craftResult && (
                  <div className={`py-2 px-3 rounded-lg text-center text-[10px] font-bold border ${craftResult.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                    {craftResult.msg}
                  </div>
                )}

                <button
                  onClick={handleCraft}
                  disabled={!canCraft}
                  className={`w-full py-3.5 rounded-lg font-black text-sm tracking-widest uppercase italic transition-all active:scale-95 ${
                    canCraft
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] border border-green-400'
                      : 'bg-zinc-800 text-zinc-600 border border-white/5 cursor-not-allowed'
                  }`}
                >
                  <span className="flex items-center justify-center gap-2"><Hammer size={16} /> Craft Gear</span>
                </button>
              </div>
            </div>
          );
        })()}
        {/* DETAILS: EMPTY STATE */}
        {!selectedEquip && !selectedMatId && !selectedCraftSlot && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 p-6 text-center">
            <PackageOpen size={48} className="mb-4 text-zinc-500" />
            <div className="text-sm font-black uppercase tracking-widest text-white">Select an Item</div>
            <div className="text-[10px] text-zinc-400 mt-2">Click any card in the grid to view details and perform actions.</div>
          </div>
        )}
      </div>

      {isAscending && selectedPlayer && (
        <PlayerHexProfileModal 
          player={selectedPlayer} 
          onClose={() => setIsAscending(false)} 
          onStarUp={() => {
            const res = ascendPlayer(selectedPlayer.id);
            if (!res.success) alert(res.error);
          }} 
          isAscending={false} 
        />
      )}
    </div>
  );
}
