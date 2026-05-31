"use client";

import { useState } from "react";
import { PlayerCard } from "@/components/player/PlayerCard";
import { PlayerPosition, PlayerRarity } from "@/lib/types/player";
import { ChevronLeft, ChevronDown, Search, ArrowDownUp } from "lucide-react";
import { useGameState } from "@/lib/context/GameStateContext";
import Link from "next/link";

type Tab = 'ALL' | 'STARTING LINEUP' | 'BENCH' | 'AVAILABLE' | 'DUPLICATES';

const lowPolyBg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400" preserveAspectRatio="none"><polygon points="0,0 200,0 100,150" fill="%23303136"/><polygon points="0,0 100,150 0,250" fill="%2326272b"/><polygon points="200,0 200,200 100,150" fill="%232c2d31"/><polygon points="0,250 100,150 200,200" fill="%2328292d"/><polygon points="200,200 100,150 150,400" fill="%232a2b2f"/><polygon points="0,250 200,200 0,400" fill="%2325262a"/><polygon points="0,400 200,200 200,400" fill="%232e2f33"/></svg>`;

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
  const [pendingRarity, setPendingRarity] = useState<PlayerRarity | 'All'>('All');
  const [pendingPosition, setPendingPosition] = useState<PlayerPosition | 'All'>('All');
  const [pendingTeam, setPendingTeam] = useState<string | 'All'>('All');

  const rarities: (PlayerRarity | 'All')[] = ['All', 'Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
  const positions: (PlayerPosition | 'All')[] = ['All', 'C', 'SF', 'PF', 'SG', 'PG'];
  const teams: string[] = ['All', 'Milwaukee Bucks', 'Dallas Mavericks', 'New Orleans Pelicans', 'Phoenix Suns', 'Minnesota Timberwolves'];

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
      default: return true;
    }
  });

  const handleOpenFilter = () => {
    setPendingRarity(activeRarity);
    setPendingPosition(activePosition);
    setPendingTeam(activeTeam);
    setIsFilterModalOpen(true);
  };

  const handleResetFilter = () => {
    setPendingRarity('All');
    setPendingPosition('All');
    setPendingTeam('All');
  };

  const handleConfirmFilter = () => {
    setActiveRarity(pendingRarity);
    setActivePosition(pendingPosition);
    setActiveTeam(pendingTeam);
    setIsFilterModalOpen(false);
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
        <div 
          className="w-[180px] bg-[#2a2b2f] flex flex-col shrink-0 relative pt-7"
          style={{ backgroundImage: `url('${lowPolyBg}')`, backgroundSize: '100% 400px' }}
        >
          {/* Fading Right Border */}
          <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none z-30" />

          <div className="relative z-10 flex flex-col gap-1 w-full mt-2 pl-0">
            {(['ALL', 'STARTING LINEUP', 'BENCH', 'AVAILABLE', 'DUPLICATES'] as Tab[]).map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex items-center justify-center py-4 text-[13px] font-bold tracking-wide transition-all ${
                  activeTab === tab ? 'bg-gradient-to-r from-white/95 to-gray-300 text-[#111] shadow-[0_5px_15px_rgba(0,0,0,0.5)] z-40 w-[192px]' : 'text-gray-500 hover:text-white pr-4 w-full'
                }`}
                style={{ clipPath: activeTab === tab ? 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)' : 'none' }}
              >
                <div className="text-center leading-tight mr-2">
                  <div>{tab.split(' ')[0]}</div>
                  {tab.split(' ')[1] && <div>{tab.split(' ')[1]}</div>}
                </div>
                {activeTab === tab && (
                  <div className="absolute right-[14px] w-2 h-2 rounded-full bg-[#ff7300] shadow-[0_0_8px_#ff7300]" />
                )}
              </button>
            ))}
          </div>
        </div>

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
                const isDuplicate = nameCounts[player.name] > 1;

                return (
                  <div 
                    key={player.id} 
                    className={`transform transition-transform hover:-translate-y-1 hover:scale-[1.02] cursor-pointer relative`}
                    style={{ zoom: '1.15' }} 
                  >
                    <div>
                      <PlayerCard player={player} />
                    </div>
                    
                    {/* Micro Status Badges (NBA 2K Skewed Floating Design - HD Text Fix) */}
                    {isExactLineup && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-[3px] flex items-center justify-center">
                        <div className="absolute inset-0 bg-zinc-950/95 border border-emerald-500/50 shadow-[0_4px_15px_rgba(16,185,129,0.5)] skew-x-[-12deg] z-0 pointer-events-none"></div>
                        <span className="relative z-10 font-[family-name:var(--font-outfit)] font-black italic text-[8px] uppercase tracking-[0.2em] text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">
                          STARTING
                        </span>
                      </div>
                    )}
                    {isExactBench && (
                      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 px-3 py-[3px] flex items-center justify-center">
                        <div className="absolute inset-0 bg-zinc-950/95 border border-cyan-500/50 shadow-[0_4px_15px_rgba(6,182,212,0.5)] skew-x-[-12deg] z-0 pointer-events-none"></div>
                        <span className="relative z-10 font-[family-name:var(--font-outfit)] font-black italic text-[8px] uppercase tracking-[0.2em] text-cyan-400 drop-shadow-[0_0_5px_rgba(6,182,212,0.8)]">
                          BENCH
                        </span>
                      </div>
                    )}
                    {!isExactLineup && !isExactBench && isDuplicate && (
                      <div className="absolute -bottom-1.5 -right-1 z-20 w-[22px] h-[18px] flex items-center justify-center" title="Duplicate Copy">
                        <div className="absolute inset-0 bg-zinc-950/95 border border-purple-500/50 shadow-[0_4px_15px_rgba(168,85,247,0.5)] skew-x-[-12deg] z-0 pointer-events-none"></div>
                        <svg className="relative z-10 text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
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
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[800px] h-[500px] bg-[#30333b] relative border border-white/10 shadow-2xl flex flex-col">
            {/* Modal Background Pattern */}
            <div className="absolute inset-0 pointer-events-none flex overflow-hidden">
              {/* Left half: Halftone Dots (Warehouse box style) */}
              <div 
                className="flex-1 opacity-[0.4] pointer-events-none mix-blend-screen animate-pulse" 
                style={{ 
                  backgroundImage: `radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)`,
                  backgroundSize: '14px 14px',
                  backgroundPosition: '0 0, 7px 7px'
                }} 
              />
              {/* Right half: Glass Diamond Pattern */}
              <div className="flex-1 relative">
                <div className="absolute top-[-20%] right-[-10%] w-[120%] h-[150%] bg-white/[0.03] rotate-45 border border-white/5 backdrop-blur-[2px]" />
                <div className="absolute top-[10%] left-[-20%] w-[80%] h-[120%] bg-black/[0.1] -rotate-12 border border-white/5 backdrop-blur-sm" />
                <div className="absolute bottom-[-10%] right-[10%] w-[100%] h-[80%] bg-white/[0.02] rotate-[30deg] border border-white/5" />
              </div>
            </div>

            {/* Modal Header */}
            <div className="h-12 bg-[#212328]/50 flex items-center justify-between px-4 border-b border-white/10 relative z-10 shrink-0">
              <span className="text-white font-black tracking-wide text-[16px] relative z-10 drop-shadow-md">Player Filter</span>
              <button onClick={() => setIsFilterModalOpen(false)} className="text-white hover:text-gray-300 transition-colors relative z-10 drop-shadow-md">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Modal Body: 3 Columns */}
            <div className="flex-1 flex flex-col p-4 relative z-10 overflow-hidden">
              <div className="w-full h-fit border border-white/10 flex flex-col bg-[#2a2d34]/60">
                {/* Column Headers (Grid 1x3) */}
                <div className="flex w-full h-[34px] bg-[#161719] border-b border-white/10 shrink-0">
                  <div className="flex-1 flex items-center justify-center text-[#c5ab84] font-bold text-[12px] border-r border-white/10">Quality</div>
                  <div className="flex-1 flex items-center justify-center text-[#c5ab84] font-bold text-[12px] border-r border-white/10">Position</div>
                  <div className="flex-1 flex items-center justify-center text-[#c5ab84] font-bold text-[12px]">Team</div>
                </div>

                {/* Column Content */}
                <div className="flex w-full">
                  {/* Quality Column */}
                  <div className="flex-1 flex flex-col border-r border-white/10">
                    {rarities.map((r) => (
                      <button
                        key={`rarity-${r}`}
                        onClick={() => setPendingRarity(r)}
                        className={`h-[40px] flex items-center justify-center text-[13px] shrink-0 border-y-[0.5px] border-x-0 ${pendingRarity === r ? 'border-white text-white font-bold bg-white/5 z-10' : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                      >
                        {r === 'All' ? 'All' : r}
                      </button>
                    ))}
                  </div>

                  {/* Position Column */}
                  <div className="flex-1 flex flex-col border-r border-white/10">
                    {positions.map((p) => (
                      <button
                        key={`pos-${p}`}
                        onClick={() => setPendingPosition(p)}
                        className={`h-[40px] flex items-center justify-center text-[13px] shrink-0 border-y-[0.5px] border-x-0 ${pendingPosition === p ? 'border-white text-white font-bold bg-white/5 z-10' : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  {/* Team Column */}
                  <div className="flex-1 flex flex-col">
                    {teams.map((t) => (
                      <button
                        key={`team-${t}`}
                        onClick={() => setPendingTeam(t)}
                        className={`h-[40px] flex items-center justify-center text-[13px] shrink-0 border-y-[0.5px] border-x-0 ${pendingTeam === t ? 'border-white text-white font-bold bg-white/5 z-10' : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="h-[80px] flex items-center justify-center gap-12 relative z-10 shrink-0">
              <button 
                onClick={handleResetFilter}
                className="w-[140px] h-[36px] bg-[#0095ff] text-white font-bold text-[15px] hover:bg-[#0080db] transition-colors flex items-center justify-center"
                style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
              >
                Reset
              </button>
              <button 
                onClick={handleConfirmFilter}
                className="w-[140px] h-[36px] bg-[#ee2a40] text-white font-bold text-[15px] hover:bg-[#d62438] transition-colors flex items-center justify-center"
                style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
