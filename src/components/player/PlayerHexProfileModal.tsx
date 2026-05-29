import React from "react";
import { Player } from "@/lib/types/player";
import { Shield, Sword, Zap, Activity } from "lucide-react";
import { getDetailedAttributes } from "@/lib/utils/starGrowth";

interface PlayerHexProfileModalProps {
  player: Player;
  onClose: () => void;
  onStarUp: () => void;
  isAscending: boolean;
}

export function PlayerHexProfileModal({ player, onClose, onStarUp, isAscending }: PlayerHexProfileModalProps) {
  if (!player) return null;
  const details = getDetailedAttributes(player);
  const attributeRows = [
    { label: '3-Pt', val: details.threePt },
    { label: 'Steal', val: details.steal },
    { label: '2-Pt', val: details.twoPt },
    { label: 'Block', val: details.block },
    { label: 'FT', val: details.freeThrow },
    { label: 'Reb', val: details.rebound },
    { label: 'Handle', val: details.handle },
    { label: 'On-Ball', val: details.onBall },
    { label: 'Assist', val: details.assist },
    { label: 'Calm', val: details.calm }
  ];
  const attributeVisualMax = Math.max(180, ...attributeRows.map(stat => stat.val));

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 perspective-1000"
      onClick={(e) => {
        // Only close if clicking exactly on the backdrop wrapper
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      
      {/* Background glow behind modal */}
      <div className="absolute w-[800px] h-[500px] bg-red-900/10 blur-[100px] pointer-events-none rounded-full" />

      {/* Main Container - Premium Tech Frame */}
      <div 
        className="w-[850px] h-[500px] relative bg-zinc-950/95 border border-white/10 rounded-2xl overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] flex transform-gpu transition-all duration-500 scale-100 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button - Brought back inside the box */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }} 
          className="absolute top-4 right-4 z-[99999] w-8 h-8 flex items-center justify-center bg-black/60 hover:bg-red-500/90 border border-white/20 hover:border-white rounded-full text-white/70 hover:text-white transition-all backdrop-blur-md cursor-pointer shadow-lg pointer-events-auto"
          title="Close Profile"
        >
          <span className="text-lg leading-none font-light -mt-0.5">✕</span>
        </button>

        {/* CRT Scanline overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />

        {/* Left Side: 3D Hologram Card Area */}
        <div className="w-[300px] h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900/80 to-black p-6 border-r border-white/5">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

          <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
            <span className="text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] leading-none italic">{player.ovr}</span>
            <div className="flex flex-col border-l border-red-500/50 pl-2">
              <span className="text-[10px] text-white/70 font-black uppercase tracking-widest">{player.position}</span>
              <span className="text-[9px] text-red-400 font-bold uppercase tracking-[0.2em]">{player.rarity}</span>
            </div>
          </div>
          
          <div className="relative w-52 h-64 mt-8 perspective-1000">
            {/* Holographic glowing base */}
            <div className="absolute bottom-[-15px] left-1/2 -translate-x-1/2 w-40 h-6 bg-red-600/30 blur-xl rounded-[100%] pointer-events-none" />
            
            <div className="w-full h-full relative transition-transform duration-500 hover:scale-105 hover:rotate-y-6">
              {player.imageUrl ? (
                <img src={player.imageUrl} alt={player.name} className="w-full h-full object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]" />
              ) : (
                <div className="w-full h-full bg-zinc-800 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                  <span className="text-white/20 text-6xl font-black">{player.position}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 text-center relative z-20 pointer-events-none">
            <h2 className="text-xl font-black text-white italic tracking-[0.1em] uppercase drop-shadow-md">{player.name}</h2>
            <div className="flex justify-center gap-1 mt-1.5 text-red-500">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`relative ${i < (player.starLevel || 0) ? 'scale-110' : 'scale-90 opacity-20'}`}>
                  <div className={`absolute inset-0 blur-sm ${i < (player.starLevel || 0) ? 'bg-red-500' : 'bg-transparent'}`} />
                  <span className="relative text-lg drop-shadow-[0_0_2px_black]">♦</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Data & Hex Menu */}
        <div className="flex-1 h-full relative flex flex-col pointer-events-none">
          
          {/* Top Attributes Panel */}
          <div className="p-8 pb-0">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
              <Activity className="text-cyan-400 w-4 h-4" />
              <h3 className="text-xs font-black text-white/70 uppercase tracking-[0.2em]">Core Attributes</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {attributeRows.map(stat => (
                <div key={stat.label} className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</span>
                    <span className="text-xs font-black text-white font-mono">{stat.val}</span>
                  </div>
                  <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 relative">
                    <div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.35)] transition-all duration-1000 ease-out" style={{ width: `${Math.min((stat.val / attributeVisualMax) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hexagonal Button Cluster */}
          <div className="mt-auto p-8 relative pointer-events-auto">
            {/* Hex connecting lines graphic */}
            <div className="absolute bottom-8 left-8 right-8 h-[1px] bg-white/5 pointer-events-none" />
            
            <div className="flex items-end justify-center gap-4 relative z-10">
              
              {/* Enhance Hex */}
              <button className="group relative w-16 h-20 flex flex-col items-center justify-center cursor-not-allowed opacity-40 transition-all hover:opacity-50">
                <div className="absolute inset-0 bg-zinc-900 border border-white/10 pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                <Shield className="relative text-zinc-500 w-4 h-4 mb-1.5 z-10" />
                <span className="relative text-[8px] font-bold text-zinc-400 uppercase tracking-widest z-10">Enhance</span>
              </button>

              {/* Core Hex */}
              <button className="group relative w-16 h-20 flex flex-col items-center justify-center cursor-not-allowed opacity-40 transition-all hover:opacity-50 mt-8">
                <div className="absolute inset-0 bg-zinc-900 border border-white/10 pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                <Sword className="relative text-zinc-500 w-4 h-4 mb-1.5 z-10" />
                <span className="relative text-[8px] font-bold text-zinc-400 uppercase tracking-widest z-10">Core</span>
              </button>

              {/* Star Up Hex */}
              <button 
                onClick={onStarUp}
                disabled={isAscending}
                className={`group relative w-24 h-28 flex flex-col items-center justify-center transition-all ${isAscending ? 'opacity-50 cursor-wait' : 'hover:-translate-y-2 cursor-pointer'} mt-4`}
              >
                {/* Outer Glow */}
                <div className="absolute -inset-3 bg-red-600/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                {/* Hex Shape */}
                <div className="absolute inset-0 bg-gradient-to-b from-red-900 via-red-950 to-black border-2 border-red-500 shadow-[inset_0_0_20px_rgba(220,38,38,0.3)] transition-all pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                  <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.4) 45%, transparent 50%)', backgroundSize: '200% 200%' }} />
                </div>
                
                <Zap className={`relative text-white w-6 h-6 mb-1.5 z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] ${isAscending ? 'animate-bounce' : 'group-hover:animate-pulse'}`} />
                <span className="relative text-[9px] font-black text-white uppercase tracking-[0.2em] z-10 drop-shadow-[0_2px_4px_black]">
                  {isAscending ? 'Upgrading' : 'Star Up'}
                </span>
              </button>

            </div>
          </div>
          
        </div>

      </div>
    </div>
  );
}
