"use client";

import { useState } from "react";
import { PlayerCard } from "@/components/player/PlayerCard";
import { PlayerPosition } from "@/lib/types/player";
import { ChevronLeft, ChevronDown, Search, ArrowDownUp } from "lucide-react";
import { useGameState } from "@/lib/context/GameStateContext";
import Link from "next/link";

type FilterTab = "ALL" | PlayerPosition;
const positions: FilterTab[] = ["ALL", "PG", "SG", "SF", "PF", "C"];

export default function PlayerPage() {
  const { roster, activeLineup, activeReserves, playerStorageLimit, expandStorage } = useGameState();
  const [activeTab, setActiveTab] = useState<'roster' | 'stock'>('roster');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<FilterTab>("ALL");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortOption, setSortOption] = useState<"ovr_desc" | "ovr_asc" | "name_asc" | "name_desc">("ovr_desc");

  const sortLabels = {
    "ovr_desc": "Overall (High)",
    "ovr_asc": "Overall (Low)",
    "name_asc": "Name (A-Z)",
    "name_desc": "Name (Z-A)"
  };

  // Determine active IDs (Roster = Lineup + Reserves)
  const activeIds = new Set<string>();
  Object.values(activeLineup).forEach(p => p && activeIds.add(p.id));
  activeReserves.forEach(p => p && activeIds.add(p.id));

  // Filter based on Roster vs Stock
  const baseList = activeTab === 'roster' 
    ? roster.filter(p => activeIds.has(p.id))
    : roster.filter(p => !activeIds.has(p.id));

  // Apply Search and Position filters
  let filteredList = baseList.filter(p => positionFilter === "ALL" || p.position === positionFilter);
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredList = filteredList.filter(p => 
      (p.name && p.name.toLowerCase().includes(query)) ||
      (p.team && p.team.toLowerCase().includes(query))
    );
  }

  // Apply Sort
  filteredList.sort((a, b) => {
    if (sortOption === "ovr_desc") return b.ovr - a.ovr;
    if (sortOption === "ovr_asc") return a.ovr - b.ovr;
    if (sortOption === "name_asc") return a.name.localeCompare(b.name);
    if (sortOption === "name_desc") return b.name.localeCompare(a.name);
    return 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col font-sans overflow-hidden bg-[#0c1017]">
      
      {/* Global Dotted Background Pattern */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 0), radial-gradient(rgba(255,255,255,1) 1px, transparent 0)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px' }} />

      {/* Header matching screenshot exactly */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 shrink-0 bg-[#0c1017] border-b border-white/[0.05]">
        
        {/* Left: < Player */}
        <div className="flex items-center gap-2 w-[300px]">
          <Link href="/" className="text-[#ef4444] hover:text-[#dc2626] transition-colors drop-shadow-md flex items-center">
            <ChevronLeft size={40} strokeWidth={2.5} />
          </Link>
          <span className="text-[28px] font-bold text-white drop-shadow-md tracking-wide">Player</span>
        </div>

        {/* Center: Roster | Stock Tabs */}
        <div className="flex items-center shadow-lg">
          <button 
            onClick={() => setActiveTab('roster')}
            className={`px-8 py-2 text-sm font-bold transition-colors ${activeTab === 'roster' ? 'bg-[#ef4444] text-white relative' : 'bg-[#3f3f46] text-zinc-300 hover:bg-[#52525b]'}`}
          >
            Roster
            {activeTab === 'roster' && (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#ef4444]"></div>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('stock')}
            className={`px-8 py-2 text-sm font-bold transition-colors ${activeTab === 'stock' ? 'bg-[#ef4444] text-white relative' : 'bg-[#3f3f46] text-zinc-300 hover:bg-[#52525b]'}`}
          >
            Stock
            {activeTab === 'stock' && (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#ef4444]"></div>
            )}
          </button>
        </div>

        {/* Right: Player Count */}
        <div className="flex justify-end w-[300px]">
          <div className="flex items-center bg-[#27272a]/90 px-3 py-1.5 shadow-md">
            <span className="text-zinc-300 text-[15px] font-medium mr-2">Player Count:</span>
            <span className="text-white text-[15px] font-medium mr-3">{roster.length}/{playerStorageLimit}</span>
            <button 
              onClick={() => {
                if (window.confirm("Expand Player Storage limit by +10? This will cost 100 VC.")) {
                  const res = expandStorage();
                  if (!res.success) alert(res.error);
                }
              }}
              className="text-[#eab308] hover:text-[#fde047] font-black text-xl leading-none px-1 transition-colors drop-shadow"
              title="Expand Capacity"
            >
              +
            </button>
          </div>
        </div>

      </div>

      {/* Grid Content - Strict 5 Columns inside a Big Box */}
      <div className="relative z-10 flex-1 overflow-hidden px-10 py-6 flex justify-center">
        <div className="max-w-max h-full bg-[#0c1017]/95 backdrop-blur-md border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(6,182,212,0.1)] flex flex-col relative">
          {/* Inner dots for the container to match screenshot modal */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,1) 1px, transparent 0), radial-gradient(rgba(255,255,255,1) 1px, transparent 0)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px' }} />
          
          <div className="relative z-10 flex flex-col h-full">
            {/* Filter and Search Bar */}
            <div className="flex items-center gap-4 w-full mb-6 text-sm text-zinc-400 shrink-0">
              
              {/* Search Bar */}
              <div className="relative bg-[#1a1d24] rounded-lg border border-white/5 flex items-center px-3 py-1.5 w-[220px] shadow-inner">
                <Search size={16} className="text-zinc-500 mr-2" />
                <input 
                  type="text" 
                  placeholder="Search players..." 
                  className="bg-transparent border-none outline-none text-white w-full placeholder-zinc-600 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Position Filter */}
              <div className="flex items-center bg-[#1a1d24] rounded-lg border border-white/5 p-1 gap-1 shadow-inner">
                {positions.map(pos => (
                  <button 
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={`px-3 py-1 rounded-md font-bold text-[11px] tracking-wider transition-colors ${positionFilter === pos ? 'bg-[#ef4444] text-white shadow-md' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <div 
                  onClick={() => setIsSortOpen(!isSortOpen)}
                  className="flex items-center bg-[#1a1d24] rounded-lg border border-white/5 px-3 py-1.5 cursor-pointer hover:bg-white/5 transition-colors gap-2 shadow-inner"
                >
                  <ArrowDownUp size={14} className="text-zinc-500" />
                  <span className="font-bold text-white text-xs whitespace-nowrap">Sort: {sortLabels[sortOption]}</span>
                  <ChevronDown size={14} className="text-zinc-500" />
                </div>
                {isSortOpen && (
                  <div className="absolute top-full mt-2 w-full min-w-[140px] bg-[#1a1d24] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                    {Object.entries(sortLabels).map(([key, label]) => (
                      <div 
                        key={key} 
                        onClick={() => { setSortOption(key as any); setIsSortOpen(false); }}
                        className={`px-3 py-2 text-xs font-bold cursor-pointer hover:bg-white/10 transition-colors ${sortOption === key ? 'text-[#ef4444]' : 'text-zinc-300'}`}
                      >
                        {label}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="font-medium tracking-wide text-xs ml-auto">
                SHOWING <span className="text-white font-bold">{filteredList.length}</span> OF {baseList.length}
              </div>

            </div>

            {/* Grid */}
            <div className="overflow-y-auto flex-1 no-scrollbar pr-2 pt-10 -mt-4">
              {filteredList.length > 0 ? (
                <div className="grid grid-cols-5 gap-x-4 gap-y-10 max-w-max mx-auto justify-items-center place-items-start pb-10">
                  {filteredList.map((player) => (
                    <div 
                      key={player.id} 
                      className="transform transition-transform hover:-translate-y-1 hover:scale-[1.02] cursor-pointer"
                      style={{ zoom: '1.3' }} 
                    >
                      <PlayerCard player={player} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                  <Search size={48} className="opacity-20 mb-4" />
                  <p className="font-bold text-xl drop-shadow">No players match the criteria</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom scroll indicator matching screenshot */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 animate-bounce pointer-events-none opacity-70">
        <ChevronDown className="text-[#eab308]" size={32} />
      </div>

    </div>
  );
}
