import React, { useState } from "react";
import { LobbyStrategy } from "../data/strategies";

export interface CoachModalProps {
  show: boolean;
  onClose: () => void;
  strategyLevels: Record<string, { level: number; exp: number }>;
  onUpgradeStrategy: (stratName: string) => void;
  upgradeSuccess: string | null;
  offensiveStrategies: LobbyStrategy[];
  defensiveStrategies: LobbyStrategy[];
}

export function CoachModal({
  show,
  onClose,
  strategyLevels,
  onUpgradeStrategy,
  upgradeSuccess,
  offensiveStrategies,
  defensiveStrategies
}: CoachModalProps) {
  const [coachActiveTab, setCoachActiveTab] = useState<'OFF' | 'DEF'>('OFF');

  const getNextExpVal = (lvl: number): number => {
    if (lvl === 1) return 500;
    if (lvl === 2) return 1500;
    if (lvl === 3) return 4000;
    if (lvl === 4) return 10000;
    return 0;
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <style>{`#global-bottom-nav { display: none !important; }`}</style>
      {/* Standard non-skewed container for absolute pixel-perfect HD clarity */}
      <div className="w-[850px] h-[590px] rounded-2xl p-6 flex flex-col relative overflow-hidden animate-page-enter">
        
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
                  HEAD COACH STRATEGY BOARD
                </h2>
                <p className="text-[10px] text-zinc-400 font-[family-name:var(--font-outfit)] font-black tracking-[0.2em] uppercase italic">Maximize squad parameters through active match tactical mastery</p>
              </div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-3xl font-light cursor-pointer transition-colors pt-1">×</button>
          </div>

          {/* Toast Success Message */}
          {upgradeSuccess && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-500 border border-emerald-400 px-6 py-2 rounded-full text-white font-[family-name:var(--font-outfit)] font-black text-xs tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.6)] animate-[bounce_0.5s_infinite]">
              ✨ {upgradeSuccess}
            </div>
          )}

          {/* Layout Content */}
          <div className="flex-1 flex gap-6 min-h-0 relative z-10">
            
            {/* Left Side: Coach Roster Profile */}
            <div className="w-[230px] bg-zinc-900/60 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-between shadow-lg">
              <div className="flex flex-col items-center text-center">
                
                {/* Coach Avatar metallic frame */}
                <div className="relative w-32 h-[170px] z-20 mb-3" style={{ filter: 'drop-shadow(3px 3px 8px rgba(0,0,0,0.8))' }}>
                  {/* Metallic Slate Outer Frame */}
                  <div className="absolute inset-0 bg-gradient-to-b from-zinc-300 via-zinc-500 to-zinc-800" style={{ clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)' }}></div>
                  
                  {/* Glowing backdrop */}
                  <div className="absolute inset-[2.5px] bg-gradient-to-tr from-orange-600 via-red-500 to-yellow-400" style={{ clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)' }}>
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] bg-[length:100%_4px,_6px_100%] z-0 mix-blend-overlay"></div>
                    <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden">
                      <img src="/coach.png" alt="Coach Pop" className="w-[125%] h-[125%] object-cover skew-x-[6deg] drop-shadow-[-2px_2px_2px_rgba(0,0,0,0.8)] ml-2 mt-1" />
                    </div>
                  </div>
                </div>

                <div className="font-[family-name:var(--font-outfit)] text-[18px] font-black text-white uppercase tracking-wider italic leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Coach Pop</div>
                <span className="font-[family-name:var(--font-outfit)] text-[8px] font-black italic text-white tracking-[0.25em] uppercase mt-1 leading-none">MASTER STRATEGIST</span>
              </div>

              {/* Slanted Coach Report Card */}
              <div className="w-full bg-zinc-950/80 border border-white/5 p-3 rounded-lg flex flex-col gap-2 mt-4 text-[10px] skew-x-[-6deg] shadow-inner">
                <div className="skew-x-[6deg]">
                  <div className="text-zinc-400 font-[family-name:var(--font-outfit)] font-black text-center border-b border-white/5 pb-1.5 mb-1.5 text-[9px] uppercase tracking-[0.2em] italic">COACH REPORT</div>
                  
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span className="font-semibold">Total Strategies:</span>
                    <span className="font-black text-white">11 Tactics</span>
                  </div>
                  <div className="flex justify-between text-zinc-300 mb-1">
                    <span className="font-semibold">Tactics LVL Sum:</span>
                    <span className="font-black text-white">
                      {Object.values(strategyLevels).reduce((acc, s) => acc + s.level, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span className="font-semibold">Match EXP Bonus:</span>
                    <span className="font-black text-yellow-500">+50 EXP</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side: Strategies list & Upgrade control */}
            <div className="flex-1 flex flex-col min-h-0">
              
              {/* Category Slanted Tabs */}
              <div className="flex mb-4 gap-2">
                <button 
                  onClick={() => setCoachActiveTab('OFF')}
                  className={`px-6 py-2.5 text-xs font-[family-name:var(--font-outfit)] font-black tracking-[0.15em] transition-all cursor-pointer uppercase skew-x-[-12deg] border border-white/10
                    ${coachActiveTab === 'OFF' 
                      ? 'bg-zinc-800 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border-l-4 border-l-white' 
                      : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'}`}
                >
                  <span className="block skew-x-[12deg] italic">OFFENSIVE TACTICS ({offensiveStrategies.length})</span>
                </button>
                <button 
                  onClick={() => setCoachActiveTab('DEF')}
                  className={`px-6 py-2.5 text-xs font-[family-name:var(--font-outfit)] font-black tracking-[0.15em] transition-all cursor-pointer uppercase skew-x-[-12deg] border border-white/10
                    ${coachActiveTab === 'DEF' 
                      ? 'bg-zinc-800 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)] border-l-4 border-l-white' 
                      : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'}`}
                >
                  <span className="block skew-x-[12deg] italic">DEFENSIVE TACTICS ({defensiveStrategies.length})</span>
                </button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 scrollbox article-scroll min-h-0">
                {(coachActiveTab === 'OFF' ? offensiveStrategies : defensiveStrategies).map((strat) => {
                  const current = strategyLevels[strat.name] || { level: 1, exp: 0 };
                  const isMax = current.level >= 5;
                  const req = getNextExpVal(current.level);
                  const hasEnoughExp = !isMax && current.exp >= req;
                  const progressPct = isMax ? 100 : Math.min(100, (current.exp / req) * 100);

                  // 2K Premium Levels glow & background details
                  const badgeStyle = 
                    current.level === 5 ? 'text-fuchsia-400 border-fuchsia-500 bg-fuchsia-950/40 shadow-[0_0_12px_rgba(240,79,228,0.5)]' :
                    current.level === 4 ? 'text-amber-400 border-amber-500 bg-amber-950/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]' :
                    current.level === 3 ? 'text-purple-400 border-purple-500 bg-purple-950/40' :
                    current.level === 2 ? 'text-emerald-400 border-emerald-500 bg-emerald-950/40' :
                    'text-white border-white/40 bg-white/5';

                  return (
                    <div key={strat.name} className={`bg-zinc-900/70 border border-white/5 rounded-xl p-4 flex flex-col gap-3 transition-all hover:bg-zinc-900 hover:border-white/10 skew-x-[-6deg] shadow-lg relative border-l-4 border-l-white/80`}>
                      
                      {/* Unskewed block content */}
                      <div className="skew-x-[6deg] flex flex-col gap-2.5">
                        
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2.5 mb-1.5">
                              <h3 className="font-[family-name:var(--font-outfit)] font-black text-[15px] text-white tracking-wide uppercase italic">{strat.name}</h3>
                              <span className={`text-[8.5px] font-[family-name:var(--font-outfit)] font-black border-2 px-2.5 py-0.5 rounded skew-x-[-12deg] tracking-wider ${badgeStyle}`}>
                                <span className="block skew-x-[12deg]">LVL {current.level} {isMax && '★'}</span>
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 leading-relaxed font-sans mb-1.5">{strat.desc}</p>
                            
                            {/* Dynamic attribute badges */}
                            <div className="flex flex-wrap gap-2 text-[9px] font-bold font-mono">
                              <span className="bg-zinc-950/80 px-2 py-0.5 rounded border border-white/5 text-white">
                                FOCUS: {strat.focus.toUpperCase()}
                              </span>
                              <span className="bg-zinc-950/80 px-2 py-0.5 rounded border border-white/5 text-yellow-400">
                                EFFECT: {strat.stat.toUpperCase()} (+{(current.level - 1) * 2}%)
                              </span>
                            </div>
                          </div>

                          {/* Upgrading Action Trigger slanted */}
                          <button
                            onClick={() => !isMax && hasEnoughExp && onUpgradeStrategy(strat.name)}
                            disabled={isMax || !hasEnoughExp}
                            className={`px-4 py-2.5 rounded border font-[family-name:var(--font-outfit)] font-black text-[10px] tracking-[0.1em] transition-all whitespace-nowrap min-w-[125px] text-center uppercase skew-x-[-10deg] italic
                              ${isMax 
                                ? 'bg-zinc-950/50 border-white/5 text-yellow-500 cursor-not-allowed shadow-inner' 
                                : hasEnoughExp 
                                  ? 'bg-gradient-to-b from-[#cfa030] to-[#8f6514] border-yellow-400 text-white cursor-pointer hover:from-[#ffc040] hover:to-[#a87518] shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-pulse hover:scale-105'
                                  : 'bg-zinc-950/80 border-white/5 text-zinc-600 cursor-not-allowed'}`}
                          >
                            <span className="block skew-x-[10deg]">
                              {isMax ? 'MAX LEVEL' : hasEnoughExp ? 'UPGRADE TACTIC' : `NEED ${req - current.exp} EXP`}
                            </span>
                          </button>
                        </div>

                        {/* Progress bar and EXP stats */}
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex-1 h-[7px] bg-zinc-950 rounded-full overflow-hidden border border-white/5 relative">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 relative
                                ${isMax 
                                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 shadow-[0_0_8px_rgba(240,79,228,0.6)]' 
                                  : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]'}`}
                              style={{ width: `${progressPct}%` }}
                            >
                              {!isMax && <div className="absolute top-0 right-0 w-4 h-full bg-white/40 animate-pulse blur-[1px]"></div>}
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-zinc-400 font-mono whitespace-nowrap tracking-wider">
                            {isMax ? 'MAX MASTERED' : `${current.exp} / ${req} EXP`}
                          </span>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
