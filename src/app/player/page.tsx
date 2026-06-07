"use client";

import { useState } from "react";
import { PlayerCard } from "@/components/player/PlayerCard";
import { PlayerPosition, PlayerRarity } from "@/lib/types/player";
import { ChevronLeft, ChevronDown, Search, ArrowDownUp } from "lucide-react";
import { useGameState } from "@/lib/context/GameStateContext";
import Link from "next/link";
import { SidebarTabs } from "@/components/shared/SidebarTabs";
import { SkewedBadge } from "@/components/shared/SkewedBadge";
import { lowPolyBg } from "@/lib/constants/visuals";
import { PlayerFilterModal, rarities } from "@/features/player/components/PlayerFilterModal";

type Tab = 'ALL' | 'STARTING LINEUP' | 'BENCH' | 'AVAILABLE' | 'DUPLICATES';

export default function PlayerPage() {
  const { roster, activeLineup, activeReserves } = useGameState();
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const [isRarityOpen, setIsRarityOpen] = useState(false);

  // Active Filter States
  const [activeRarity, setActiveRarity] = useState<PlayerRarity | 'All'>('All');
  const [activePosition, setActivePosition] = useState<PlayerPosition | 'All'>('All');
  const [activeTeam, setActiveTeam] = useState<string | 'All'>('All');

  // Modal State
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Count names to detect duplicates globally
  const nameCounts = roster.reduce((acc, p) => {
    acc[p.name] = (acc[p.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredRoster = roster.filter(player => {
    if (activeRarity !== 'All' && player.rarity !== activeRarity) return false;
    if (activePosition !== 'All' && player.position !== activePosition) return false;
    if (activeTeam !== 'All' && player.team !== activeTeam) return false;
    return true;
  });

  const tabFilteredRoster = filteredRoster.filter(player => {
    const inLineup = activeLineup.some(al => al.id === player.id);
    const inBench = activeReserves.some(ar => ar.id === player.id);
    const isDuplicate = nameCounts[player.name] > 1;

    switch (activeTab) {
      case 'ALL': return true;
      case 'STARTING LINEUP': return inLineup;
      case 'BENCH': return inBench;
      case 'AVAILABLE': return !inLineup && !inBench;
      case 'DUPLICATES': return isDuplicate;
    }
  }).sort((a, b) => {
    if (activeTab === 'ALL') {
      const aInLineup = activeLineup.some(al => al.id === a.id);
      const bInLineup = activeLineup.some(bl => bl.id === b.id);
      if (aInLineup && !bInLineup) return -1;
      if (!aInLineup && bInLineup) return 1;

      const aInBench = activeReserves.some(ar => ar.id === a.id);
      const bInBench = activeReserves.some(br => br.id === b.id);
      if (aInBench && !bInBench) return -1;
      if (!aInBench && bInBench) return 1;
    }
    
    // Sort by OVR descending as fallback
    return (b.ovr || 0) - (a.ovr || 0);
  });

  const handleOpenFilter = () => {
    setIsFilterModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#1c1d21] text-gray-200 overflow-hidden font-sans select-none relative">
      {/* Global Stone Wall Texture Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.25] mix-blend-overlay"
        style={{ backgroundImage: 'url(/textures/stone_bg.png)', backgroundSize: 'cover' }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 to-transparent z-0" />
      
      {/* Header exactly like screenshot */}
      <div className="relative z-20 flex items-center justify-between h-[60px] bg-transparent shrink-0 pr-4">
        {/* Fading white line at the bottom */}
        <div className="absolute bottom-0 left-0 w-[60%] h-[1px] bg-gradient-to-r from-white/40 via-white/5 to-transparent pointer-events-none" />
        {/* Left: < Player Bag */}
        <div className="flex items-center gap-3 pl-4">
          <Link href="/" className="text-white hover:text-gray-300 transition-colors drop-shadow-md">
            <ChevronLeft size={36} strokeWidth={3} />
          </Link>
          <span className="text-[20px] font-bold text-white drop-shadow-md tracking-wide">Player Bag</span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center h-[44px]">
          {/* Owned Players */}
          <span className="text-[13px] text-gray-500 font-medium tracking-wide mr-6">
            Owned Players: {roster.length}
          </span>
          
          {/* Filter Button with circling glow animation */}
          <button 
            onClick={handleOpenFilter}
            className="relative overflow-hidden h-full px-12 flex items-center justify-center border-l border-white/5 cursor-pointer"
          >
            <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_270deg,#00ffff_360deg)] animate-spin opacity-90" />
            <div className="absolute inset-[1.5px] bg-gradient-to-b from-[#2096fc] to-[#1a8ff5]" />
            <span className="relative z-10 text-white font-bold text-[13px] tracking-wide drop-shadow-md">Filter</span>
          </button>
          
          {/* Rarity Dropdown (Quick Filter) */}
          <div 
            className="relative flex items-center justify-between bg-[#131417] h-full px-5 border-l border-white/5 shadow-inner w-[160px] cursor-pointer hover:bg-[#1a1c21] transition-colors"
            onClick={() => setIsRarityOpen(!isRarityOpen)}
          >
            <span className="text-[13px] font-bold text-gray-400">
              {activeRarity === 'All' ? 'Rarity' : activeRarity}
            </span>
            <ChevronDown size={18} className="text-white" strokeWidth={3} />

            {isRarityOpen && (
              <div className="absolute top-[44px] left-[-1px] w-[calc(100%+1px)] bg-[#131417] border border-white/5 shadow-2xl z-50 flex flex-col">
                {rarities.map(r => (
                  <div 
                    key={r}
                    onClick={() => setActiveRarity(r)}
                    className={`px-5 py-3 text-[13px] font-bold hover:bg-white/5 ${activeRarity === r ? 'text-white bg-white/5' : 'text-gray-400 hover:text-gray-200'}`}
                  >
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area (Sidebar + Grid) */}
      <div className="relative z-10 flex flex-1 overflow-hidden">
        
        {/* ── Left Sidebar ── */}
        <SidebarTabs
          tabs={(['ALL', 'STARTING LINEUP', 'BENCH', 'AVAILABLE', 'DUPLICATES'] as Tab[]).map((tab) => ({
            id: tab,
            label: (
              <>
                <div>{tab.split(' ')[0]}</div>
                {tab.split(' ')[1] && <div>{tab.split(' ')[1]}</div>}
              </>
            )
          }))}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as Tab)}
          className="w-[180px] pt-7"
          activeTabClassName="w-[192px]"
          dotClassName="w-2 h-2"
        />

        {/* ── Right Content Grid ── */}
        <div className="flex-1 px-5 pt-5 pb-5 relative z-10 flex flex-col">
          {/* Container for Players & Dot Grid */}
          <div className="flex-1 bg-white/[0.02] relative flex flex-col overflow-hidden rounded-sm border border-white/5 shadow-inner">
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
          
          <div className="flex-1 overflow-y-auto no-scrollbar pt-7 pl-4 pr-10 pb-20 relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-12 gap-x-6 justify-items-start place-items-start max-w-[1500px] mx-auto">
              {tabFilteredRoster.map((player) => {
                const isExactLineup = activeLineup.some(p => p.id === player.id);
                const isExactBench = activeReserves.some(p => p.id === player.id);
                const isNameUsed = !isExactLineup && !isExactBench && (activeLineup.some(p => p.name === player.name) || activeReserves.some(p => p.name === player.name));
                const isDuplicate = nameCounts[player.name] > 1;

                return (
                  <div 
                    key={player.id} 
                    className={`transform transition-transform hover:-translate-y-1 hover:scale-[1.02] cursor-pointer relative hover:z-[100]`}
                    style={{ zoom: '1.15' }} 
                  >
                    <div>
                      <PlayerCard player={player} />
                    </div>
                    
                    {/* Micro Status Badges (NBA 2K Skewed Floating Design - HD Text Fix) */}
                    {isExactLineup && (
                      <div className="absolute -top-1.5 -right-1.5 z-[110] group flex flex-col items-end">
                        <div className="w-[22px] h-[22px] bg-zinc-950/95 border border-emerald-500/50 rounded flex items-center justify-center shadow-[0_4px_10px_rgba(16,185,129,0.4)] cursor-help">
                          <svg className="text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </div>
                        {/* Custom Tooltip */}
                        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 w-[140px] shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[120]">
                          <div className="absolute inset-0 rounded border border-white/10 z-0 overflow-hidden" style={{ backgroundImage: `url('${lowPolyBg}')`, backgroundSize: 'cover' }}>
                            <div className="absolute inset-0 bg-black/20"></div>
                          </div>
                          <div className="absolute -left-[4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-[#2a2b2f] border-b border-l border-white/10 rotate-45 z-0"></div>
                          <div className="relative z-10 flex flex-col gap-1 text-left p-2">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-emerald-400 drop-shadow-sm">Starting Lineup</span>
                            <span className="font-[family-name:var(--font-outfit)] text-[9px] leading-[1.3] text-gray-300">
                              This player is currently active in your main starting rotation.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {isExactBench && (
                      <div className="absolute -top-1.5 -right-1.5 z-[110] group flex flex-col items-end">
                        <div className="w-[22px] h-[22px] bg-zinc-950/95 border border-cyan-500/50 rounded flex items-center justify-center shadow-[0_4px_10px_rgba(6,182,212,0.4)] cursor-help">
                          <svg className="text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        {/* Custom Tooltip */}
                        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 w-[140px] shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[120]">
                          <div className="absolute inset-0 rounded border border-white/10 z-0 overflow-hidden" style={{ backgroundImage: `url('${lowPolyBg}')`, backgroundSize: 'cover' }}>
                            <div className="absolute inset-0 bg-black/20"></div>
                          </div>
                          <div className="absolute -left-[4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-[#2a2b2f] border-b border-l border-white/10 rotate-45 z-0"></div>
                          <div className="relative z-10 flex flex-col gap-1 text-left p-2">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-cyan-400 drop-shadow-sm">Bench</span>
                            <span className="font-[family-name:var(--font-outfit)] text-[9px] leading-[1.3] text-gray-300">
                              This player is currently assigned to your bench rotation.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {isNameUsed && (
                      <div className="absolute -top-1.5 -right-1.5 z-[110] group flex flex-col items-end">
                        <div className="w-[22px] h-[22px] bg-zinc-950/95 border border-amber-500/50 rounded flex items-center justify-center shadow-[0_4px_10px_rgba(245,158,11,0.4)] cursor-help">
                          <svg className="text-amber-400 drop-shadow-[0_0_5px_rgba(245,158,11,0.8)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </div>
                        {/* Custom Tooltip */}
                        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 w-[140px] shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[120]">
                          <div className="absolute inset-0 rounded border border-white/10 z-0 overflow-hidden" style={{ backgroundImage: `url('${lowPolyBg}')`, backgroundSize: 'cover' }}>
                            <div className="absolute inset-0 bg-black/20"></div>
                          </div>
                          <div className="absolute -left-[4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-[#2a2b2f] border-b border-l border-white/10 rotate-45 z-0"></div>
                          <div className="relative z-10 flex flex-col gap-1 text-left p-2">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-amber-400 drop-shadow-sm">Active Clone</span>
                            <span className="font-[family-name:var(--font-outfit)] text-[9px] leading-[1.3] text-gray-300">
                              Another copy of this player is in your lineup. Select this card to swap them.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {!isExactLineup && !isExactBench && !isNameUsed && isDuplicate && (
                      <div className="absolute -top-1.5 -right-1.5 z-[110] group flex flex-col items-end">
                        <div className="w-[22px] h-[22px] bg-zinc-950/95 border border-purple-500/50 rounded flex items-center justify-center shadow-[0_4px_10px_rgba(168,85,247,0.4)] cursor-help">
                          <svg className="text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        </div>
                        {/* Custom Tooltip */}
                        <div className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 w-[140px] shadow-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[120]">
                          <div className="absolute inset-0 rounded border border-white/10 z-0 overflow-hidden" style={{ backgroundImage: `url('${lowPolyBg}')`, backgroundSize: 'cover' }}>
                            <div className="absolute inset-0 bg-black/20"></div>
                          </div>
                          <div className="absolute -left-[4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-[#2a2b2f] border-b border-l border-white/10 rotate-45 z-0"></div>
                          <div className="relative z-10 flex flex-col gap-1 text-left p-2">
                            <span className="font-bold uppercase tracking-wider text-[9px] text-purple-400 drop-shadow-sm">Duplicate Card</span>
                            <span className="font-[family-name:var(--font-outfit)] text-[9px] leading-[1.3] text-gray-300">
                              You own multiple copies of this player. Duplicates can be used for star-up ascensions.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
      {/* ── Player Filter Modal ── */}
      <PlayerFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        currentRarity={activeRarity}
        currentPosition={activePosition}
        currentTeam={activeTeam}
        onApply={(filters) => {
          setActiveRarity(filters.rarity);
          setActivePosition(filters.position);
          setActiveTeam(filters.team);
          setIsFilterModalOpen(false);
        }}
      />

    </div>
  );
}
