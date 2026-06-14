import React, { useState } from "react";
import { TrendingUp, TrendingDown, UserPlus, RefreshCw } from "lucide-react";
import { PlayerCard } from "@/components/player/PlayerCard";
import { getTierColor, getTierRating } from "@/lib/data/mockPlayers";
import { Player } from "@/lib/types/player";

export type FreeAgentPlayer = Player & { draftInstanceId?: string };

export interface FreeAgentMarketProps {
  show: boolean;
  onClose: () => void;
  freeAgents: FreeAgentPlayer[];
  faTimeLeft: number;
  faPityCounter: number;
  cash: number;
  tk: number;
  onRefreshFA: () => { success: boolean; message?: string; error?: string };
  onSignPlayer: (player: FreeAgentPlayer) => { success: boolean; error?: string };
}

export function FreeAgentMarket({
  show,
  onClose,
  freeAgents,
  faTimeLeft,
  faPityCounter,
  cash,
  tk,
  onRefreshFA,
  onSignPlayer
}: FreeAgentMarketProps) {
  const [selectedFaPlayer, setSelectedFaPlayer] = useState<FreeAgentPlayer | null>(null);
  const [faStatusMessage, setFaStatusMessage] = useState<string | null>(null);

  const formatFaTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRefresh = () => {
    const res = onRefreshFA();
    setFaStatusMessage(res.success ? res.message! : res.error!);
    setTimeout(() => setFaStatusMessage(null), 3000);
  };

  const handleSign = (player: FreeAgentPlayer) => {
    const res = onSignPlayer(player);
    if (res.success) {
      setFaStatusMessage(`CONTRACT SIGNED! Welcome ${player.name} to the team!`);
      setSelectedFaPlayer(null);
      setTimeout(() => setFaStatusMessage(null), 4000);
    } else {
      setFaStatusMessage(res.error || "Signing failed!");
      setTimeout(() => setFaStatusMessage(null), 3000);
    }
  };

  const [modalScale, setModalScale] = useState(1);

  React.useEffect(() => {
    if (!show) return;
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scaleX = w < 920 ? (w - 24) / 880 : 1;
      const scaleY = h < 650 ? (h - 24) / 610 : 1;
      setModalScale(Math.max(0.4, Math.min(1, Math.min(scaleX, scaleY))));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <style>{`#global-bottom-nav { display: none !important; }`}</style>
      {/* Standard non-skewed container for absolute pixel-perfect HD clarity */}
      <div 
        className="rounded-2xl p-6 flex flex-col relative overflow-hidden animate-page-enter shadow-2xl transition-transform duration-300"
        style={{
          width: '880px',
          height: '610px',
          transform: `scale(${modalScale})`,
          transformOrigin: 'center center'
        }}
      >
        
        {/* Modal Background Pattern (Unified with Player Filter) */}
        <div className="absolute inset-0 pointer-events-none flex overflow-hidden rounded-2xl bg-[#30333b] shadow-2xl border border-white/10 z-0">
          {/* Left half: Halftone Dots */}
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
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_15px_rgba(255,255,255,0.5)] z-0 skew-x-[-6deg] scale-x-[1.04]"></div>
        
        {/* Unskewed, perfectly flat content plane */}
        <div className="flex-1 flex flex-col min-h-0 relative z-10">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-5 relative z-10">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-2xl font-[family-name:var(--font-outfit)] font-black text-white tracking-[0.08em] uppercase flex items-center gap-2 italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  FREE AGENT RECRUITMENT MARKET
                </h2>
                <p className="text-[10px] text-zinc-400 font-[family-name:var(--font-outfit)] font-black tracking-[0.2em] uppercase italic">
                  Sign high-impact players to dynamic team contracts using your available funds
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-3xl font-light cursor-pointer transition-colors pt-1">×</button>
          </div>

          {/* Status Message Notification Overlay inside Modal */}
          {faStatusMessage && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-950/95 border border-white/20 px-8 py-2.5 skew-x-[-8deg] shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-md">
              <span className="block skew-x-[8deg] text-white font-[family-name:var(--font-outfit)] font-black text-[10px] tracking-[0.25em] uppercase italic drop-shadow-md">
                {faStatusMessage}
              </span>
            </div>
          )}

          {/* Main Content Layout */}
          <div className="flex-1 flex gap-6 min-h-0">
            
            {/* Left Column: List of 4 Free Agents */}
            <div className="w-[380px] flex flex-col gap-3 overflow-y-auto pr-1">
              <div className="text-[10px] font-black text-white tracking-widest uppercase border-b border-white/20 pb-1.5 mb-1">
                Available Talents
              </div>
              
              {freeAgents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-6 text-center">
                  <span className="text-zinc-500 text-xs font-semibold">No free agents in this batch.</span>
                  <button onClick={handleRefresh} className="mt-3 px-4 py-1.5 text-[9px] font-black uppercase text-cyan-400 border border-cyan-400/30 rounded hover:bg-cyan-400/10">
                    Reload Pool
                  </button>
                </div>
              ) : (
                freeAgents.map(player => {
                  const tier = getTierRating(player.ovr);
                  const tierColor = getTierColor(tier);
                  const isSelected = selectedFaPlayer?.draftInstanceId === player.draftInstanceId;
                  
                  return (
                    <div 
                      key={player.draftInstanceId || player.id}
                      onClick={() => setSelectedFaPlayer(player)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300 relative group overflow-hidden
                        ${isSelected 
                          ? 'bg-zinc-900/80 border-white shadow-[0_0_10px_rgba(255,255,255,0.15)]' 
                          : 'bg-zinc-950/80 border-white/5 hover:border-white/20 hover:bg-zinc-900/40'}`}
                    >
                      {/* Card Background Glow for Selected */}
                      {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />}
                      
                      {/* Player Mini Avatar */}
                      <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/10 relative overflow-hidden flex items-center justify-center shrink-0">
                        {player.imageUrl ? (
                          <img src={player.imageUrl} className="w-full h-full object-cover" alt={player.name} />
                        ) : (
                          <span className="text-zinc-500 text-xs font-bold">{player.position}</span>
                        )}
                      </div>

                      {/* Player Info block */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-[family-name:var(--font-outfit)] font-black text-xs truncate">
                            {player.name}
                          </span>
                          {/* Position badge */}
                          <span className="bg-zinc-900 border border-white/10 text-zinc-400 text-[8px] font-bold px-1 rounded uppercase">
                            {player.position}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-400 ">
                            Fee: <span className="text-emerald-400 font-bold">${((player.price || 500) * 10000).toLocaleString()}</span>
                          </span>
                          
                          {/* Trend Indicator */}
                          {player.priceTrend === 'up' ? (
                            <TrendingUp className="text-emerald-400 w-3 h-3 shrink-0" />
                          ) : player.priceTrend === 'down' ? (
                            <TrendingDown className="text-rose-400 w-3 h-3 shrink-0" />
                          ) : (
                            <span className="text-zinc-500 text-[10px] leading-none select-none shrink-0">—</span>
                          )}
                        </div>
                      </div>

                      {/* OVR circular glowing indicator */}
                      <div className="flex flex-col items-center gap-0.5 shrink-0">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-[family-name:var(--font-outfit)] font-black text-xs text-white border-2 shadow-inner" 
                          style={{ borderColor: tierColor, boxShadow: `0 0 10px ${tierColor}40` }}
                        >
                          {player.ovr}
                        </div>
                        <span className="text-[7px] font-black uppercase tracking-wider" style={{ color: tierColor }}>
                          {tier} TIER
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Right Column: Detailed Player Contract Details */}
            <div className="flex-1 bg-zinc-950/80 border border-white/5 rounded-2xl p-4 flex flex-col min-h-0 relative">
              {selectedFaPlayer ? (
                <div className="flex-1 flex flex-col min-h-0">
                  
                  {/* Profile header with larger photo and details */}
                  <div className="flex gap-4 border-b border-white/[0.04] pb-4 mb-4">
                      <div className="shrink-0 pointer-events-none" style={{ zoom: 0.9 }}>
                        <PlayerCard player={selectedFaPlayer} />
                      </div>

                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-[family-name:var(--font-outfit)] font-black text-white uppercase italic tracking-wide">
                          {selectedFaPlayer.name}
                        </h3>
                        <span className="bg-white/10 border border-white/30 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase skew-x-[-6deg]">
                          <span className="skew-x-[6deg] block">{selectedFaPlayer.rarity}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Salary Impact</div>
                          <div className="text-xs  font-bold text-white">+{Math.round(selectedFaPlayer.ovr * 12.5)} points</div>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div>
                          <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Acquisition Cost</div>
                          <div className="text-sm  font-black text-emerald-400">${((selectedFaPlayer.price || 500) * 10000).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    {/* Large OVR circle badge */}
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <div 
                        className="w-16 h-16 rounded-full border-4 flex items-center justify-center font-[family-name:var(--font-outfit)] font-black text-2xl text-white shadow-2xl relative"
                        style={{ 
                          borderColor: getTierColor(getTierRating(selectedFaPlayer.ovr)), 
                          boxShadow: `0 0 20px ${getTierColor(getTierRating(selectedFaPlayer.ovr))}30` 
                        }}
                      >
                        {selectedFaPlayer.ovr}
                      </div>
                      <span 
                        className="text-[9px] font-black uppercase tracking-widest mt-1 italic" 
                        style={{ color: getTierColor(getTierRating(selectedFaPlayer.ovr)) }}
                      >
                        {getTierRating(selectedFaPlayer.ovr)} TIER
                      </span>
                    </div>
                  </div>

                  {/* Player Statistics Ticker */}
                  <div className="grid grid-cols-6 gap-2 bg-zinc-950 border border-white/5 rounded-xl p-2.5 mb-4 text-center shrink-0">
                    <div>
                      <div className="text-[7px] text-zinc-500 font-black uppercase">PPG</div>
                      <div className="text-xs font-bold text-white ">{selectedFaPlayer.ppg || 0.0}</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-zinc-500 font-black uppercase">RPG</div>
                      <div className="text-xs font-bold text-white ">{selectedFaPlayer.rpg || 0.0}</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-zinc-500 font-black uppercase">APG</div>
                      <div className="text-xs font-bold text-white ">{selectedFaPlayer.apg || 0.0}</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-zinc-500 font-black uppercase">SPG</div>
                      <div className="text-xs font-bold text-white ">{selectedFaPlayer.spg || 0.0}</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-zinc-500 font-black uppercase">BPG</div>
                      <div className="text-xs font-bold text-white ">{selectedFaPlayer.bpg || 0.0}</div>
                    </div>
                    <div>
                      <div className="text-[7px] text-zinc-500 font-black uppercase">TO</div>
                      <div className="text-xs font-bold text-white ">{selectedFaPlayer.topg || 0.0}</div>
                    </div>
                  </div>

                  {/* Player Core Attribute Ratings */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4">
                    <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Player Profile Breakdown</div>
                    
                    {/* Attribute Progress Bars */}
                    {[
                      { label: 'Offensive Rating', val: selectedFaPlayer.offense, max: 250, color: 'from-orange-500 to-red-500' },
                      { label: 'Defensive Rating', val: selectedFaPlayer.defense, max: 250, color: 'from-cyan-500 to-blue-500' },
                      { label: 'Shooting Accuracy', val: selectedFaPlayer.shooting, max: 100, color: 'from-yellow-500 to-amber-500' },
                      { label: 'Athletic Speed', val: selectedFaPlayer.speed, max: 100, color: 'from-fuchsia-500 to-pink-500' },
                      { label: 'Physical Strength', val: selectedFaPlayer.strength, max: 100, color: 'from-emerald-500 to-teal-500' },
                      { label: 'Court Playmaking', val: selectedFaPlayer.playmaking, max: 100, color: 'from-purple-500 to-violet-500' }
                    ].map(attr => (
                      <div key={attr.label}>
                        <div className="flex justify-between items-center text-[10px] mb-1 font-semibold">
                          <span className="text-zinc-400 font-sans">{attr.label}</span>
                          <span className="text-white  font-bold">{attr.val} / {attr.max}</span>
                        </div>
                        <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5 relative">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${attr.color}`}
                            style={{ width: `${(attr.val / attr.max) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Big interactive sign button */}
                  <button
                    onClick={() => handleSign(selectedFaPlayer)}
                    disabled={cash < (selectedFaPlayer.price || 500) * 10000}
                    className={`w-full py-3 rounded-xl font-[family-name:var(--font-outfit)] font-black text-xs tracking-wider transition-all uppercase skew-x-[-10deg] italic border shadow-lg shrink-0
                      ${cash >= (selectedFaPlayer.price || 500) * 10000
                        ? 'bg-white border-white text-black cursor-pointer hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-95'
                        : 'bg-zinc-950/80 border-white/5 text-zinc-600 cursor-not-allowed shadow-inner'}`}
                  >
                    <span className="block skew-x-[10deg] text-center">
                      {cash >= (selectedFaPlayer.price || 500) * 10000 
                        ? `EXECUTE CONTRACT SIGNING (-$${((selectedFaPlayer.price || 500) * 10000).toLocaleString()})`
                        : 'INSUFFICIENT FRANCHISE FUNDS'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl">
                  <UserPlus className="text-zinc-600 w-16 h-16 animate-pulse mb-3" />
                  <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">No Agent Selected</h4>
                  <p className="text-[10px] text-zinc-500 max-w-xs mt-1 leading-relaxed">
                    Select any available free agent from the draft board list on the left to inspect their contract profile, core attributes, and execute team signings.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Footer Section */}
          <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Market Refresh Clock</span>
                <span className="text-xs  font-black text-white bg-white/5 border border-white/20 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                  {formatFaTime(faTimeLeft)}
                </span>
              </div>
              
              {/* PITY SYSTEM DISPLAY */}
              <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest" title="Guaranteed Mythic on 50th paid refresh">Pity Status</span>
                <div className="bg-zinc-900 border border-white/20 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-inner">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                  <span className="text-xs  font-black text-white">
                    {faPityCounter} / 50
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 border border-white/20 bg-white/5 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white font-[family-name:var(--font-outfit)] font-black text-[10px] tracking-wider uppercase italic skew-x-[-8deg]"
            >
              <RefreshCw size={11} className="animate-spin skew-x-[8deg]" style={{ animationDuration: '6s' }} />
              <span className="skew-x-[8deg] block">REFRESH AGENTS (-200 VC)</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
