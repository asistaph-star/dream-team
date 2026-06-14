"use client";

import { useState, useEffect } from "react";
import { ItemCard } from "@/components/items/ItemCard";
import { useGameState } from "@/lib/context/GameStateContext";
import { EquipmentSlot, Equipment } from "@/lib/types/item";
import { mockMaterials, craftingRecipes } from "@/lib/data/mockItems";
import Link from "next/link";
import { SidebarTabs } from "@/components/shared/SidebarTabs";
import { DetailPanelShell } from "@/components/shared/DetailPanelShell";
import { ItemGlyph } from "@/components/items/ItemGlyph";
import { CraftDetailPanel } from "@/features/inventory/components/CraftDetailPanel";
import { CraftRevealModal } from "@/features/inventory/components/CraftRevealModal";

type Tab = 'MATERIALS' | 'EQUIPMENT' | 'CRAFTING';

const CRAFT_SLOTS = Object.keys(craftingRecipes) as EquipmentSlot[];

const MATERIAL_GLYPHS: Record<string, { label: string; sublabel: string; glowColor: string }> = {
  skill_tape: { label: "TAPE", sublabel: "SKILL", glowColor: "rgba(239,68,68,0.8)" },
  mat_upgrade: { label: "STN", sublabel: "UPGR", glowColor: "rgba(168,85,247,0.8)" },
  mat_crafting: { label: "THR", sublabel: "CRFT", glowColor: "rgba(16,185,129,0.8)" },
  mat_fluid: { label: "FLD", sublabel: "FLUID", glowColor: "rgba(59,130,246,0.8)" },
};

const EQUIPMENT_GLYPHS: Record<string, { label: string; sublabel: string }> = {
  Shoes: { label: "SHO", sublabel: "FEET" },
  Tshirt: { label: "TOP", sublabel: "BASE" },
  Jersey: { label: "JRS", sublabel: "GAME" },
  Headband: { label: "HBD", sublabel: "HEAD" },
  KneePads: { label: "KPD", sublabel: "KNEE" },
};

const getMaterialIcon = (id: string) => {
  const glyph = MATERIAL_GLYPHS[id] ?? { label: "MAT", sublabel: "ITEM", glowColor: "rgba(234,179,8,0.8)" };
  return <ItemGlyph label={glyph.label} sublabel={glyph.sublabel} glowColor={glyph.glowColor} />;
};

const getEquipmentGlyph = (slot: string) => {
  const glyph = EQUIPMENT_GLYPHS[slot] ?? { label: "EQP", sublabel: "GEAR" };
  return <ItemGlyph label={glyph.label} sublabel={glyph.sublabel} glowColor="rgba(6,182,212,0.8)" />;
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
  const [craftedItem, setCraftedItem] = useState<Equipment | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsNarrow(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (activeTab === 'CRAFTING' && !selectedCraftSlot) {
      setSelectedCraftSlot(CRAFT_SLOTS[0]);
    }
  }, [activeTab, selectedCraftSlot]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedEquip(null);
    setSelectedMatId(null);
    setSelectedCraftSlot(tab === 'CRAFTING' ? CRAFT_SLOTS[0] : null);
    setUpgradeResult(null);
    setCraftResult(null);
  };

  const handleCraft = () => {
    if (!selectedCraftSlot) return;
    const res = craftEquipment(selectedCraftSlot);
    if (res) {
      setCraftedItem(res);
      setCraftResult({ success: true, msg: `Forged ${res.name}!` });
    } else {
      setCraftResult({ success: false, msg: "Not enough Crafting Thread!" });
    }
    setTimeout(() => setCraftResult(null), 3000);
  };

  const handleViewMaterials = () => {
    setActiveTab('MATERIALS');
    setSelectedMatId('mat_crafting');
    setSelectedCraftSlot(null);
    setCraftResult(null);
  };

  const handleViewCraftedEquipment = () => {
    if (!craftedItem) return;
    const latest = inventory.equipment.find((e) => e.id === craftedItem.id) ?? craftedItem;
    setActiveTab('EQUIPMENT');
    setSelectedEquip(latest);
    setSelectedCraftSlot(null);
    setCraftedItem(null);
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

  const renderDetailContent = () => {
    return (
      <>
        {/* DETAILS: MATERIALS */}
        {activeTab === 'MATERIALS' && selectedMatId && (() => {
          const mat = mockMaterials[selectedMatId];
          const qty = inventory.materials[selectedMatId as keyof typeof inventory.materials] || 0;
          const glowColor = selectedMatId === 'skill_tape' ? '#ef4444' : selectedMatId === 'mat_upgrade' ? '#a855f7' : selectedMatId === 'mat_crafting' ? '#10b981' : '#3b82f6';
          
          return (
            <DetailPanelShell
              title={mat.name}
              glowColor={glowColor}
              icon={getMaterialIcon(selectedMatId)}
              subtitle={`Owned: ${qty.toLocaleString()}`}
              infoContent={
                <p className="text-[13px] text-gray-300 leading-relaxed">{mat.description}</p>
              }
              actionButtons={
                <>
                  <button className="w-full bg-gradient-to-br from-[#1a8ff5] to-[#1671d4] hover:brightness-110 text-white py-2.5 font-bold text-[14px] shadow-sm relative" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}>
                    <div className="absolute top-0 left-0 bottom-0 w-8 bg-white/10" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                    <span className="relative z-10">Get</span>
                  </button>
                  <button className="w-full bg-gradient-to-br from-[#e5303c] to-[#be1824] hover:brightness-110 text-white py-2.5 font-bold text-[14px] shadow-sm relative" style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
                    <div className="absolute top-0 left-0 bottom-0 w-8 bg-white/10" style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                    <span className="relative z-10">Use</span>
                  </button>
                </>
              }
            />
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
            <DetailPanelShell
              title={`Lv.${currentLevel} ${selectedEquip.name}`}
              glowColor={glowColor}
              icon={getEquipmentGlyph(selectedEquip.slot)}
              subtitle="Owned: 1"
              infoContent={
                <>
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
                </>
              }
              actionButtons={
                <>
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
                </>
              }
            />
          );
        })()}

        {/* DETAILS: CRAFTING */}
        {activeTab === 'CRAFTING' && selectedCraftSlot && (
          <CraftDetailPanel
            slot={selectedCraftSlot}
            ownedThread={inventory.materials.mat_crafting}
            onCraft={handleCraft}
            onGetMaterials={handleViewMaterials}
            craftResult={craftResult}
            renderIcon={getEquipmentGlyph}
          />
        )}

        {/* DETAILS: EMPTY STATE */}
        {((activeTab === 'MATERIALS' && !selectedMatId) ||
          (activeTab === 'EQUIPMENT' && !selectedEquip)) && (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 p-6 text-center">
            <div className="w-14 h-14 border-2 border-dashed border-gray-500 rounded-sm flex items-center justify-center mb-4 text-[10px] font-black tracking-widest text-gray-500">
              EMPTY
            </div>
            <div className="text-sm font-semibold tracking-wide text-white">Select an Item</div>
            <div className="text-xs text-gray-400 mt-2">Click any item in the grid to view details and perform actions.</div>
          </div>
        )}
      </>
    );
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
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>

      {/* ── Top Header ── */}
      <div className="relative z-20 flex items-center justify-between h-[60px] bg-transparent shrink-0 pr-4">
        {/* Fading white line at the bottom */}
        <div className="absolute bottom-0 left-0 w-[60%] h-[1px] bg-gradient-to-r from-white/40 via-white/5 to-transparent pointer-events-none" />
        
        {/* Left: < Warehouse */}
        <div className="flex items-center gap-3 pl-4">
          <Link href="/" className="text-white hover:text-gray-300 transition-colors drop-shadow-md relative z-10 w-9 h-9 flex items-center justify-center font-black text-2xl leading-none">
            ‹
          </Link>
          <span className="text-[20px] font-bold text-white drop-shadow-md tracking-wide relative z-10">Warehouse</span>
        </div>
      </div>

      {/* Mobile Horizontal Tabs */}
      {isNarrow && (
        <div className="w-full flex overflow-x-auto no-scrollbar gap-1.5 px-4 py-2.5 bg-black/25 border-b border-white/5 relative z-10 shrink-0">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-1.5 text-[10px] font-[family-name:var(--font-outfit)] font-black uppercase tracking-wider italic rounded border transition-all whitespace-nowrap cursor-pointer
                  ${isActive 
                    ? 'bg-zinc-800 text-white border-white shadow-[0_0_10px_rgba(255,255,255,0.15)] border-l-2' 
                    : 'bg-zinc-950/60 text-zinc-500 border-white/5 hover:text-zinc-300'}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      <div className={`flex flex-1 overflow-hidden relative z-10 ${isNarrow ? 'flex-col' : 'flex-row'}`}>

        {/* ── Left Sidebar ── */}
        {!isNarrow && (
          <SidebarTabs
            tabs={tabs.map(t => ({ id: t.id, label: <span>{t.label}</span> }))}
            activeTab={activeTab}
            onTabChange={(id) => handleTabChange(id as Tab)}
            className="w-[160px] pt-5 shadow-xl"
            activeTabClassName="w-[172px]"
            dotClassName="w-2.5 h-2.5"
          />
        )}

        {/* ── Middle Grid ── */}
        <div className="flex-1 px-5 pt-5 pb-5 relative z-10 flex flex-col min-w-0">
          {activeTab === 'CRAFTING' && (
            <div className="mb-4 bg-[#313338] border border-white/10 rounded-sm px-4 py-3 flex items-center justify-between shrink-0">
              <div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Crafting Thread</div>
                <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                  {inventory.materials.mat_crafting.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Blueprints</div>
                <div className="text-sm font-bold text-white mt-0.5">{CRAFT_SLOTS.length} slots available</div>
              </div>
            </div>
          )}

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
                  icon={getEquipmentGlyph(eq.slot)}
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
            {activeTab === 'CRAFTING' && CRAFT_SLOTS.map((slot) => {
              const recipe = craftingRecipes[slot];
              const isSelected = selectedCraftSlot === slot;
              const canAfford = inventory.materials.mat_crafting >= recipe.cost;
              const glowColor = canAfford ? '#10b981' : '#64748b';
              return (
                <ItemCard
                  key={slot}
                  id={slot}
                  icon={getEquipmentGlyph(slot)}
                  glowColor={glowColor}
                  selected={isSelected}
                  badgeText={canAfford ? "Ready" : `${recipe.cost} THR`}
                  onClick={() => setSelectedCraftSlot(slot)}
                  className={canAfford ? "" : "opacity-80"}
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

        {/* ── Right Detail Panel (Desktop only) ── */}
        {!isNarrow && (
          <div className="w-[340px] z-20 flex flex-col shrink-0 pt-5 pb-5 pr-5 h-full">
            <div className="flex-1 bg-[#313338] border border-white/10 rounded-sm flex flex-col shadow-[0_0_15px_rgba(0,0,0,0.5)] overflow-hidden">
              {renderDetailContent()}
            </div>
          </div>
        )}

        {/* Detail Panel Drawer (for mobile/tablet width < 1024px) */}
        {isNarrow && (selectedMatId || selectedEquip || selectedCraftSlot) && (
          <>
            <div 
              onClick={() => {
                setSelectedMatId(null);
                setSelectedEquip(null);
                setSelectedCraftSlot(null);
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-35 pointer-events-auto"
            />
            <div 
              className="fixed bottom-0 left-0 right-0 bg-[#313338] border-t border-white/10 rounded-t-xl z-40 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.8)] flex flex-col max-h-[85vh] animate-[slideUp_0.25s_ease-out] pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-3 border-b border-white/5 pb-2 shrink-0">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Item details</span>
                <button 
                  onClick={() => {
                    setSelectedMatId(null);
                    setSelectedEquip(null);
                    setSelectedCraftSlot(null);
                  }}
                  className="text-zinc-400 hover:text-white font-black text-sm uppercase px-2 py-0.5 rounded border border-white/5 bg-white/5 cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="overflow-y-auto pr-1">
                {renderDetailContent()}
              </div>
            </div>
          </>
        )}
      </div>

      {craftedItem && (
        <CraftRevealModal
          equipment={craftedItem}
          renderIcon={getEquipmentGlyph}
          onClose={() => setCraftedItem(null)}
          onViewEquipment={handleViewCraftedEquipment}
        />
      )}
    </div>
  );
}

