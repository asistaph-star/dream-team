import React, { useState, useEffect } from "react";
import { PlayerPosition, PlayerRarity } from "@/lib/types/player";

export const rarities: (PlayerRarity | "All")[] = ['All', 'Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
export const positions: (PlayerPosition | "All")[] = ['All', 'C', 'SF', 'PF', 'SG', 'PG'];
export const teams: string[] = ['All', 'Milwaukee Bucks', 'Dallas Mavericks', 'New Orleans Pelicans', 'Phoenix Suns', 'Minnesota Timberwolves'];

export interface PlayerFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRarity: PlayerRarity | "All";
  currentPosition: PlayerPosition | "All";
  currentTeam: string | "All";
  onApply: (filters: {
    rarity: PlayerRarity | "All";
    position: PlayerPosition | "All";
    team: string | "All";
  }) => void;
}

export function PlayerFilterModal({
  isOpen,
  onClose,
  currentRarity,
  currentPosition,
  currentTeam,
  onApply
}: PlayerFilterModalProps) {
  const [pendingRarity, setPendingRarity] = useState<PlayerRarity | "All">(currentRarity);
  const [pendingPosition, setPendingPosition] = useState<PlayerPosition | "All">(currentPosition);
  const [pendingTeam, setPendingTeam] = useState<string | "All">(currentTeam);

  useEffect(() => {
    if (isOpen) {
      setPendingRarity(currentRarity);
      setPendingPosition(currentPosition);
      setPendingTeam(currentTeam);
    }
  }, [isOpen, currentRarity, currentPosition, currentTeam]);

  if (!isOpen) return null;

  const handleResetFilter = () => {
    setPendingRarity('All');
    setPendingPosition('All');
    setPendingTeam('All');
  };

  const handleConfirmFilter = () => {
    onApply({
      rarity: pendingRarity,
      position: pendingPosition,
      team: pendingTeam
    });
  };

  return (
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
          <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors relative z-10 drop-shadow-md">
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
                    onClick={() => setPendingRarity(r as PlayerRarity | 'All')}
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
                    onClick={() => setPendingPosition(p as PlayerPosition | 'All')}
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
  );
}
