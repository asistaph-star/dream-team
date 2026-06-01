"use client";

import { useState } from "react";
import { ItemCard } from "@/components/items/ItemCard";
import { useGameState } from "@/lib/context/GameStateContext";
import { EquipmentSlot, Equipment } from "@/lib/types/item";
import { mockMaterials, craftingRecipes } from "@/lib/data/mockItems";
import { ChevronLeft, ChevronRight, Gem, Hammer, AlertTriangle, PackageOpen, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SidebarTabs } from "@/components/shared/SidebarTabs";
import { lowPolyBg } from "@/lib/constants/visuals";

type Tab = 'MATERIALS' | 'EQUIPMENT' | 'CRAFTING';

const diagonalStripes = `repeating-linear-gradient(45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 6px)`;

const RawItem = ({ icon, glowColor }: { icon: string, glowColor: string }) => (
  <div className="relative w-full h-full flex items-center justify-center">
    <div 
      className="text-4xl md:text-5xl transition-all duration-300 relative z-10" 
      style={{ filter: `drop-shadow(0 5px 15px ${glowColor}) saturate(1.2)` }}
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
    inventory, cash, tk, 
    craftEquipment, upgradeEquipment
  } = useGameState();
  
  const [activeTab, setActiveTab] = useState<Tab>('MATERIALS');
  
  const [selectedEquip, setSelectedEquip] = useState<Equipment | null>(null);
  const [selectedMatId, setSelectedMatId] = useState<string | null>(null);
  const [selectedCraftSlot, setSelectedCraftSlot] = useState<EquipmentSlot | null>(null);

  const [upgradeResult, setUpgradeResult] = useState<{ success: boolean; msg?: string } | null>(null);
  const [craftResult, setCraftResult] = useState<{ success: boolean; msg?: string } | null>(null);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedEquip(null);
    setSelectedMatId(null);
    setSelectedCraftSlot(null);
    setUpgradeResult(null);
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'MATERIALS', label: 'Items' },
    { id: 'EQUIPMENT', label: 'Equipment' },
    { id: 'CRAFTING', label: 'Crafting' }
  ];

  return (
    <div className="flex flex-col h-full w-full bg-[#1c1d21] text-gray-200 overflow-hidden font-sans select-none relative">
      {/* Global Stone Wall Texture Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.25] mix-blend-overlay"
        style={{ backgroundImage: 'url(/textures/stone_bg.png)', backgroundSize: 'cover' }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 to-transparent z-0" />
      <style>{`
        @keyframes shooting-star {
          0% { transform: translate(-50%, -50%) rotate(40deg) translateY(-250px); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate(-50%, -50%) rotate(40deg) translateY(250px); opacity: 0; }
        }
        .star-line {
          animation: shooting-star 2.5s infinite linear;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.8) 50%, transparent);
        }
        .star-line-delay {
          animation: shooting-star 3.5s infinite linear 1.2s;
          background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.4) 50%, transparent);
        }
      `}</style>

      {/* ── Top Header ── */}
      <div className="relative z-20 flex items-center justify-between h-[60px] bg-transparent shrink-0 pr-4">
        {/* Fading white line at the bottom */}
        <div className="absolute bottom-0 left-0 w-[60%] h-[1px] bg-gradient-to-r from-white/40 via-white/5 to-transparent pointer-events-none" />
        
        {/* Left: < Warehouse */}
        <div className="flex items-center gap-3 pl-4">
          <Link href="/" className="text-white hover:text-gray-300 transition-colors drop-shadow-md relative z-10">
            <ChevronLeft size={36} className="text-white font-black" strokeWidth={3} />
          </Link>
          <span className="text-[20px] font-bold text-white drop-shadow-md tracking-wide relative z-10">Warehouse</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative z-10">

        {/* ── Left Sidebar ── */}
        <SidebarTabs
          tabs={tabs.map(t => ({ id: t.id, label: <span>{t.label}</span> }))}
          activeTab={activeTab}
          onTabChange={(id) => handleTabChange(id as Tab)}
          className="w-[160px] pt-5 shadow-xl"
          activeTabClassName="w-[172px]"
          dotClassName="w-2.5 h-2.5"
        />

        {/* ── Middle Grid ── */}
        <div className="flex-1 px-5 pt-5 pb-5 relative z-10 flex flex-col">
          {/* Container for Items & Dot Grid */}
          <div className="flex-1 bg-white/[0.02] relative flex flex-col overflow-hidden rounded-sm">
            {/* Animated Glowing Edge Dots */}
            <div 
              className="absolute inset-0 opacity-40 pointer-events-none animate-pulse" 
              style={{ 
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 2px)', 
                backgroundSize: '14px 14px', 
                backgroundPosition: '0 0',
                maskImage: 'radial-gradient(ellipse at center, transparent 30%, black 90%)',
                WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 30%, black 90%)'
              }} 
            />
            
            <div className="flex-1 overflow-y-auto p-4 relative z-10 no-scrollbar">
              <div className="flex flex-wrap gap-4">
            
            {/* MATERIALS GRID */}
            {activeTab === 'MATERIALS' && Object.entries(inventory.materials).map(([id, qty]) => {
              const mat = mockMaterials[id];
              if (!mat) return null;
              const isSelected = selectedMatId === id;
              const glowColor = id === 'skill_tape' ? '#ef4444' : id === 'mat_upgrade' ? '#a855f7' : id === 'mat_crafting' ? '#10b981' : '#3b82f6';
              
              return (
                <ItemCard
                  key={id}
                  id={id}
                  icon={getMaterialIcon(id)}
                  glowColor={glowColor}
                  quantity={qty}
                  showQuantity={true}
                  selected={isSelected}
                  onClick={() => setSelectedMatId(id)}
                />
              );
            })}

            {/* EQUIPMENT GRID */}
            {activeTab === 'EQUIPMENT' && inventory.equipment.map(eq => {
              const isSelected = selectedEquip?.id === eq.id;
              const glowColor = eq.upgradeLevel > 5 ? '#f59e0b' : eq.upgradeLevel > 2 ? '#a855f7' : '#3b82f6';
              return (
                <ItemCard
                  key={eq.id}
                  id={eq.id}
                  icon={getEquipmentEmoji(eq.slot)}
                  glowColor={glowColor}
                  quantity={1}
                  showQuantity={true}
                  upgradeLevel={eq.upgradeLevel}
                  selected={isSelected}
                  onClick={() => setSelectedEquip(eq)}
                />
              );
            })}

            {/* CRAFTING GRID */}
            {activeTab === 'CRAFTING' && Object.entries(craftingRecipes).map(([slot, recipe]) => {
              const isSelected = selectedCraftSlot === slot;
              const glowColor = '#10b981';
              return (
                <ItemCard
                  key={slot}
                  id={slot}
                  icon={getEquipmentEmoji(slot)}
                  glowColor={glowColor}
                  selected={isSelected}
                  badgeText="Blueprint"
                  onClick={() => setSelectedCraftSlot(slot as EquipmentSlot)}
                  className="grayscale opacity-70 mix-blend-luminosity hover:mix-blend-normal hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                />
              );
            })}

              </div>
              
              {/* Empty States */}
              {((activeTab === 'EQUIPMENT' && inventory.equipment.length === 0)) && (
                <div className="flex items-center justify-center h-full opacity-50 absolute inset-0 pointer-events-none">
                  <div className="text-gray-500 font-bold tracking-wide">
                    No items found
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Detail Panel ── */}
        <div className="w-[300px] z-20 flex flex-col shrink-0 pt-5 pb-5 pr-5 h-full">
          <div className="flex-1 bg-[#313338] border border-white/10 rounded-sm flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
          
          {/* DETAILS: MATERIALS */}
          {activeTab === 'MATERIALS' && selectedMatId && (() => {
            const mat = mockMaterials[selectedMatId];
            const qty = inventory.materials[selectedMatId as keyof typeof inventory.materials] || 0;
            const glowColor = selectedMatId === 'skill_tape' ? '#ef4444' : selectedMatId === 'mat_upgrade' ? '#a855f7' : selectedMatId === 'mat_crafting' ? '#10b981' : '#3b82f6';
            
            return (
              <div className="flex-1 flex flex-col h-full bg-[#35383d]">
                {/* Header Title */}
                <div className="px-4 py-2.5 bg-[#4b555d] relative z-10" style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
                  <h2 className="text-[13px] font-bold text-gray-200">{mat.name}</h2>
                </div>
                
                {/* Big Display Image area */}
                <div className="relative h-60 overflow-hidden flex flex-col items-center justify-center">
                  {/* Thick Diagonal Stripes Background */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.15]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 30px, #000 30px, #000 60px)' }} />

                  {/* Soft Radial Glow Box */}
                  <div className="absolute inset-0 pointer-events-none opacity-80" style={{ background: `radial-gradient(circle at center, ${glowColor}70 0%, ${glowColor}10 50%, transparent 70%)` }} />

                  {/* Faded Circular Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none select-none">
                    <div className="w-56 h-56 border-[6px] border-white rounded-full flex items-center justify-center">
                      <div className="w-48 h-48 border-[2px] border-white rounded-full flex flex-col items-center justify-center text-center">
                        <span className="text-sm font-black tracking-widest uppercase">Best Team</span>
                        <span className="text-4xl font-black mt-1">SUPERSTAR</span>
                        <span className="text-[10px] font-bold tracking-widest mt-1">OF THE YEAR</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Shooting Stars */}
                  <div className="absolute top-1/2 left-[40%] w-[2px] h-[150px] star-line pointer-events-none" />
                  <div className="absolute top-1/2 right-[30%] w-[1px] h-[200px] star-line-delay pointer-events-none" />
                  
                  {/* Floating Item */}
                  <div className="relative flex items-center justify-center z-10 transform -rotate-[15deg] hover:rotate-0 transition-transform duration-500 mt-4">
                    <div className="scale-[2.5] drop-shadow-2xl">{getMaterialIcon(selectedMatId)}</div>
                  </div>
                  
                  <div className="text-[15px] font-medium text-white mt-12 tracking-wide z-10 drop-shadow-md">Owned: {qty.toLocaleString()}</div>
                  
                  {/* Bottom-left corner decoration */}
                  <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#666]" style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }} />
                </div>

                {/* Info Section */}
                <div 
                  className="px-4 py-2 mt-1 relative z-10 bg-[#4b555d]" 
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <h3 className="text-[13px] font-bold text-gray-300 tracking-wide">Item Info</h3>
                </div>
                
                <div 
                  className="flex-1 flex flex-col bg-[#313338]"
                  style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 6px)' }}
                >
                  <div className="p-4 flex-1 overflow-y-auto">
                    <p className="text-[13px] text-gray-300 leading-relaxed">{mat.description}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-3">
                    <button className="w-full bg-gradient-to-br from-[#1a8ff5] to-[#1671d4] hover:brightness-110 text-white py-2.5 font-bold text-[14px] shadow-sm relative" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}>
                      <div className="absolute top-0 left-0 bottom-0 w-8 bg-white/10" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                      <span className="relative z-10">Get</span>
                    </button>
                    <button className="w-full bg-gradient-to-br from-[#e5303c] to-[#be1824] hover:brightness-110 text-white py-2.5 font-bold text-[14px] shadow-sm relative" style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
                      <div className="absolute top-0 left-0 bottom-0 w-8 bg-white/10" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                      <span className="relative z-10">Use</span>
                    </button>
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
            const glowColor = currentLevel > 5 ? '#f59e0b' : currentLevel > 2 ? '#a855f7' : '#3b82f6';
            
            return (
              <div className="flex-1 flex flex-col h-full bg-[#35383d]">
                {/* Header Title */}
                <div className="px-4 py-2.5 bg-[#4b555d] relative z-10" style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
                  <h2 className="text-[13px] font-bold text-gray-200">Lv.{currentLevel} {selectedEquip.name}</h2>
                </div>
                
                {/* Big Display Image area */}
                <div className="relative h-60 overflow-hidden flex flex-col items-center justify-center">
                  {/* Thick Diagonal Stripes Background */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.15]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 30px, #000 30px, #000 60px)' }} />

                  {/* Soft Radial Glow Box */}
                  <div className="absolute inset-0 pointer-events-none opacity-80" style={{ background: `radial-gradient(circle at center, ${glowColor}70 0%, ${glowColor}10 50%, transparent 70%)` }} />

                  {/* Faded Circular Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none select-none">
                    <div className="w-56 h-56 border-[8px] border-white rounded-full flex items-center justify-center">
                      <div className="w-48 h-48 border-[3px] border-white rounded-full flex flex-col items-center justify-center text-center">
                        <span className="text-sm font-black tracking-widest uppercase">Best Team</span>
                        <span className="text-4xl font-black mt-1">SUPERSTAR</span>
                        <span className="text-[10px] font-bold tracking-widest mt-1">OF THE YEAR</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Shooting Stars */}
                  <div className="absolute top-1/2 left-[40%] w-[2px] h-[150px] star-line pointer-events-none" />
                  <div className="absolute top-1/2 right-[30%] w-[1px] h-[200px] star-line-delay pointer-events-none" />
                  
                  {/* Floating Item */}
                  <div className="relative flex items-center justify-center z-10 transform -rotate-[15deg] hover:rotate-0 transition-transform duration-500 mt-4">
                    <div className="scale-[2.5] drop-shadow-2xl">{getEquipmentEmoji(selectedEquip.slot)}</div>
                  </div>
                  
                  <div className="text-[15px] font-medium text-white mt-12 tracking-wide z-10 drop-shadow-md">Owned: 1</div>
                  
                  {/* Bottom-left corner decoration */}
                  <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#666]" style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }} />
                </div>

                {/* Info Section */}
                <div 
                  className="px-4 py-2 mt-1 relative z-10 bg-[#4b555d]" 
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <h3 className="text-[13px] font-bold text-gray-300 tracking-wide">Item Info</h3>
                </div>
                
                <div 
                  className="flex-1 flex flex-col bg-[#313338]"
                  style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 6px)' }}
                >
                  <div className="p-4 flex-1 overflow-y-auto">
                    <p className="text-xs text-gray-300 leading-relaxed mb-4">
                      Equip this gear to boost player attributes. Higher levels yield stronger bonuses.
                    </p>
                    
                    <div className="bg-[#242426] p-3 border border-[#444] mb-4">
                      <div className="text-xs text-gray-400 mb-1">Current Effect</div>
                      <div className="text-sm text-green-400 font-bold">+{selectedEquip.bonus.value}{selectedEquip.bonus.isPercentage ? '%' : ''} {selectedEquip.bonus.statName}</div>
                    </div>

                    <div className="text-[13px] text-gray-400 font-semibold mb-2">Enhancement</div>
                    <div className="bg-[#242426] p-3 border border-[#444] grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Success Rate: </span>
                        <span className={successRate >= 70 ? 'text-green-400' : 'text-yellow-400'}>{successRate.toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cash: </span>
                        <span className={cash >= cashCost ? 'text-white' : 'text-red-400'}>${(cashCost/1000).toFixed(0)}K</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500">Stones Needed: </span>
                        <span className={inventory.materials.mat_upgrade >= matCost ? 'text-purple-400' : 'text-red-400'}>{matCost} / {inventory.materials.mat_upgrade}</span>
                      </div>
                    </div>
                    
                    {upgradeResult && (
                      <div className={`mt-2 p-2 text-xs text-center border font-semibold ${upgradeResult.success ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
                        {upgradeResult.msg}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-3">
                    <button className="w-full bg-gradient-to-br from-[#1a8ff5] to-[#1671d4] hover:brightness-110 text-white py-2.5 font-bold text-[14px] shadow-sm relative" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}>
                      <div className="absolute top-0 left-0 bottom-0 w-8 bg-white/10" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                      <span className="relative z-10">Equip</span>
                    </button>
                    <button 
                      onClick={handleUpgrade}
                      disabled={!canUpgrade}
                      className={`w-full py-2.5 font-bold text-[14px] shadow-sm relative ${canUpgrade ? 'bg-gradient-to-br from-[#e5303c] to-[#be1824] hover:brightness-110 text-white' : 'bg-[#444] text-gray-500 cursor-not-allowed'}`}
                      style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
                    >
                      {canUpgrade && <div className="absolute top-0 left-0 bottom-0 w-8 bg-white/10" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />}
                      <span className="relative z-10">Enhance</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* DETAILS: CRAFTING */}
          {activeTab === 'CRAFTING' && selectedCraftSlot && (() => {
            const recipe = craftingRecipes[selectedCraftSlot as EquipmentSlot];
            const canCraft = inventory.materials.mat_crafting >= recipe.cost;
            const glowColor = '#10b981';
            
            return (
              <div className="flex-1 flex flex-col h-full bg-[#35383d]">
                {/* Header Title */}
                <div className="px-4 py-2.5 bg-[#4b555d] relative z-10" style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
                  <h2 className="text-[13px] font-bold text-gray-200">{selectedCraftSlot} Blueprint</h2>
                </div>
                
                {/* Big Display Image area */}
                <div className="relative h-60 overflow-hidden flex flex-col items-center justify-center">
                  {/* Thick Diagonal Stripes Background */}
                  <div className="absolute inset-0 pointer-events-none opacity-[0.15]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 30px, #000 30px, #000 60px)' }} />

                  {/* Soft Radial Glow Box */}
                  <div className="absolute inset-0 pointer-events-none opacity-80" style={{ background: `radial-gradient(circle at center, ${glowColor}70 0%, ${glowColor}10 50%, transparent 70%)` }} />

                  {/* Faded Circular Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none select-none">
                    <div className="w-56 h-56 border-[8px] border-white rounded-full flex items-center justify-center">
                      <div className="w-48 h-48 border-[3px] border-white rounded-full flex flex-col items-center justify-center text-center">
                        <span className="text-sm font-black tracking-widest uppercase">Best Team</span>
                        <span className="text-4xl font-black mt-1">SUPERSTAR</span>
                        <span className="text-[10px] font-bold tracking-widest mt-1">OF THE YEAR</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Shooting Stars */}
                  <div className="absolute top-1/2 left-[40%] w-[2px] h-[150px] star-line pointer-events-none" />
                  <div className="absolute top-1/2 right-[30%] w-[1px] h-[200px] star-line-delay pointer-events-none" />
                  
                  {/* Floating Item */}
                  <div className="relative flex items-center justify-center z-10 transform -rotate-[15deg] hover:rotate-0 transition-transform duration-500 mt-4">
                    <div className="scale-[2.5] drop-shadow-2xl">{getEquipmentEmoji(selectedCraftSlot)}</div>
                  </div>
                  
                  <div className="text-[15px] font-medium text-white mt-12 tracking-wide z-10 drop-shadow-md">Owned: 1 (Permanent)</div>
                  
                  {/* Bottom-left corner decoration */}
                  <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#666]" style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }} />
                </div>

                {/* Info Section */}
                <div 
                  className="px-4 py-2 mt-1 relative z-10 bg-[#4b555d]" 
                  style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
                >
                  <h3 className="text-[13px] font-bold text-gray-300 tracking-wide">Item Info</h3>
                </div>
                
                <div 
                  className="flex-1 flex flex-col bg-[#313338]"
                  style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 6px)' }}
                >
                  <div className="p-4 flex-1 overflow-y-auto">
                    <p className="text-xs text-gray-300 leading-relaxed mb-4">
                      Use Crafting Thread to forge a random piece of {selectedCraftSlot} equipment. Stats are rolled randomly upon crafting.
                    </p>
                    
                    <div className="bg-[#242426] p-3 border border-[#444] mb-4">
                      <div className="text-xs text-gray-400 mb-1">Potential Effect</div>
                      <div className="text-sm text-green-400 font-bold">+{recipe.minBonus}–{recipe.maxBonus}{recipe.isPercentage ? '%' : ''} {recipe.statName}</div>
                    </div>

                    <div className="text-[13px] text-gray-400 font-semibold mb-2">Requirements</div>
                    <div className="bg-[#242426] p-3 border border-[#444] flex justify-between items-center text-xs">
                      <span className="text-gray-500">Crafting Thread: </span>
                      <span className={canCraft ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{recipe.cost} / {inventory.materials.mat_crafting}</span>
                    </div>

                    {craftResult && (
                      <div className={`mt-2 p-2 text-xs text-center border font-semibold ${craftResult.success ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-red-500/20 text-red-400 border-red-500/50'}`}>
                        {craftResult.msg}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-3">
                    <button className="w-full bg-gradient-to-br from-[#1a8ff5] to-[#1671d4] hover:brightness-110 text-white py-2.5 font-bold text-[14px] shadow-sm relative" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}>
                      <div className="absolute top-0 left-0 bottom-0 w-8 bg-white/10" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                      <span className="relative z-10">Get Mat.</span>
                    </button>
                    <button 
                      onClick={handleCraft}
                      disabled={!canCraft}
                      className={`w-full py-2.5 font-bold text-[14px] shadow-sm relative ${canCraft ? 'bg-gradient-to-br from-[#e5303c] to-[#be1824] hover:brightness-110 text-white' : 'bg-[#444] text-gray-500 cursor-not-allowed'}`}
                      style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
                    >
                      {canCraft && <div className="absolute top-0 left-0 bottom-0 w-8 bg-white/10" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />}
                      <span className="relative z-10">Craft</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* DETAILS: EMPTY STATE */}
          {!selectedEquip && !selectedMatId && !selectedCraftSlot && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 p-6 text-center">
              <PackageOpen size={48} className="mb-4 text-gray-500" />
              <div className="text-sm font-semibold tracking-wide text-white">Select an Item</div>
              <div className="text-xs text-gray-400 mt-2">Click any item in the grid to view details and perform actions.</div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

