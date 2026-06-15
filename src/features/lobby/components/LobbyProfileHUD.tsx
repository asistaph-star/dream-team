import React from "react";
import { Plus } from "lucide-react";
import { useGameViewportScale } from "@/components/layout/GameViewport";

export interface LobbyProfileHUDProps {
  accountLevel: number;
  accountExp: number;
  cash: number;
  tk: number;
  time: string;
  currentSalary: number;
  salaryCap: number;
  onAddCash: (amount: number) => void;
  onAddTk: (amount: number) => void;
}

export function LobbyProfileHUD({
  accountLevel,
  accountExp,
  cash,
  tk,
  time,
  currentSalary,
  salaryCap,
  onAddCash,
  onAddTk
}: LobbyProfileHUDProps) {
  const { visibleRect, baseWidth } = useGameViewportScale();

  return (
    <>
      {/* --- Top Left Profile (Authentic NBA 2K Street Neon Design - SHARP HD FIX) --- */}
      <div 
        className="absolute z-50 group"
        style={{
          left: `${visibleRect.left + 24}px`,
          top: `${visibleRect.top + 20}px`,
          transform: 'scale(var(--hud-stage-scale, 1))',
          transformOrigin: 'top left'
        }}
      >
        {/* Main Container (No parent skew, completely sharp content) */}
        <div className="relative flex items-center h-[96px] w-[370px] z-10">
          
          {/* Dark Asphalt Glass Backdrop (Skewed independently so text inside stays razor-sharp) */}
          <div className="absolute inset-y-1 left-[40px] right-0 bg-zinc-900/85 backdrop-blur-md border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.1)] z-0 skew-x-[-12deg] rounded-md pointer-events-none"></div>
          
          {/* Grunge / Carbon Texture Overlay (Skewed to match backdrop shape) */}
          <div className="absolute inset-y-1 left-[40px] right-0 opacity-10 pointer-events-none mix-blend-screen skew-x-[-12deg] z-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0), radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}></div>
          
          {/* White Top Edge Highlight (Skewed to match backdrop shape) */}
          <div className="absolute top-1 left-[40px] right-0 h-[2px] bg-gradient-to-r from-white via-white/50 to-transparent shadow-[0_0_10px_rgba(255,255,255,0.5)] skew-x-[-12deg] z-0"></div>

          {/* Sharp, Un-skewed Content Container */}
          <div className="absolute inset-y-1 left-[100px] right-8 z-10 flex flex-col justify-between py-1.5">
            
            {/* Header: Name */}
            <div className="w-full mt-[-4px]">
              <span className="font-[family-name:var(--font-outfit)] font-black text-[22px] tracking-[0.1em] uppercase text-red-500 drop-shadow-[0_2px_4px_rgba(220,38,38,0.5)]">DEVELOPER</span>
            </div>

            {/* EXP Progress Laser */}
            <div className="w-[200px] mt-0.5">
              <div className="flex justify-between items-end mb-[1px]">
                <span className="font-[family-name:var(--font-outfit)] text-[8px] font-black italic text-zinc-400 uppercase tracking-[0.2em]">NETWORK EXP</span>
                <span className="font-[family-name:var(--font-outfit)] text-[9px] font-bold text-white/90">{accountExp} <span className="text-zinc-600">/1000</span></span>
              </div>
              <div className="relative w-full h-[6px] bg-zinc-800 rounded-full border border-black/50 shadow-inner overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" style={{ width: `${Math.max(5, Math.min(100, (accountExp / 1000) * 100))}%` }}>
                   <div className="absolute top-0 right-0 w-4 h-full bg-white animate-pulse blur-[1px]"></div>
                </div>
              </div>
            </div>

            {/* Currency Nodes */}
            <div className="flex items-center gap-3 w-full mt-1.5 pb-2">
              
              {/* Team Funds (Standard) */}
              <div 
                className="flex items-center relative z-50"
                style={{ top: "-5.3px", left: "-23.7px" }}
              >
                <div className="flex items-center pl-2 pr-3 h-[28px] relative">
                  {/* Skewed pill backdrop */}
                  <div className="absolute inset-0 bg-zinc-950/60 border border-white/5 shadow-inner skew-x-[-12deg] pointer-events-none rounded-sm"></div>
                  <div className="relative z-10 flex items-center gap-2">
                    <div className="w-[22px] h-[22px] relative flex items-center justify-center">
                      <img src="/bg/tf_coin.png" alt="TF" className="w-full h-full object-contain mix-blend-screen hover:scale-110 transition-transform cursor-pointer drop-shadow-md rounded-full" />
                    </div>
                    <span className="font-sans text-white font-semibold text-[15px] tracking-wide drop-shadow-sm leading-none">{cash.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={() => onAddCash(1000000)} className="-ml-1 flex items-center justify-center text-zinc-400 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer z-20 drop-shadow-md" title="Add 1M TF">
                  <Plus size={18} strokeWidth={3} />
                </button>
              </div>
              
              {/* VC (Premium) */}
              <div 
                className="flex items-center relative z-50"
                style={{ top: "-6.1px", left: "-36px" }}
              >
                <div className="flex items-center pl-2 pr-3 h-[28px] relative">
                  {/* Skewed pill backdrop */}
                  <div className="absolute inset-0 bg-zinc-950/60 border border-white/5 shadow-inner skew-x-[-12deg] pointer-events-none rounded-sm"></div>
                  <div className="relative z-10 flex items-center gap-2">
                    <div className="w-[22px] h-[22px] relative flex items-center justify-center">
                      <img src="/bg/vc_coin.png" alt="VC" className="w-full h-full object-contain mix-blend-screen hover:scale-110 transition-transform cursor-pointer drop-shadow-md rounded-full" style={{ filter: 'hue-rotate(-135deg) saturate(2.2) brightness(1.05)' }} />
                    </div>
                    <span className="font-sans text-white font-semibold text-[15px] tracking-wide drop-shadow-sm leading-none">{tk.toLocaleString()}</span>
                  </div>
                </div>
                <button onClick={() => onAddTk(1000)} className="-ml-1 flex items-center justify-center text-zinc-400 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer z-20 drop-shadow-md" title="Add 1000 VC">
                  <Plus size={18} strokeWidth={3} />
                </button>
              </div>
            </div>
            
          </div>

          {/* Avatar Section (Left Overlapping Card) */}
          <div className="absolute left-[5px] top-1/2 -translate-y-1/2 w-[86px] h-[106px] z-20 transition-transform duration-300 group-hover:scale-105 group-hover:translate-x-1" style={{ filter: 'drop-shadow(5px 5px 10px rgba(0,0,0,0.7))' }}>
            
            {/* Outer Metallic Frame with Slant */}
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-300 via-zinc-500 to-zinc-800" style={{ clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)' }}></div>
            
            {/* Inner Fire Gradient Backdrop */}
            <div className="absolute inset-[2px] bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-400" style={{ clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)' }}>
               {/* Scanline Grid */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] bg-[length:100%_4px,_6px_100%] z-0 mix-blend-overlay"></div>
               
               {/* Unskewed Image (No skew counter-skew needed since parent is perfectly sharp!) */}
               <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden">
                 <img alt="Player" src="/avatar/avatar3.webp" className="w-[140%] h-[140%] object-cover drop-shadow-[-2px_2px_2px_rgba(6,182,212,0.6)] saturate-150 contrast-125 ml-2 mt-2" onError={(e) => { e.currentTarget.src = "https://ui-avatars.com/api/?name=2K&background=000&color=fff" }} />
               </div>
               
               {/* Bottom Shadow Fade */}
               <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/80 to-transparent z-20"></div>
            </div>
          </div>

          {/* Floating Level / OVR Diamond (Far Right - Fully sharp unskewed texts!) */}
          {(() => {
            const lvl = accountLevel || 0;
            const ovrTheme = 
              lvl >= 50 ? { from: 'from-orange-400', to: 'to-red-600', shadow: 'rgba(249,115,22,0.6)', border: 'border-orange-500/50', text: 'text-orange-400', drop: 'drop-shadow-[0_0_2px_orange]' } :
              lvl >= 40 ? { from: 'from-fuchsia-400', to: 'to-pink-600', shadow: 'rgba(244,114,182,0.6)', border: 'border-fuchsia-500/50', text: 'text-fuchsia-400', drop: 'drop-shadow-[0_0_2px_fuchsia]' } :
              lvl >= 30 ? { from: 'from-purple-400', to: 'to-indigo-600', shadow: 'rgba(168,85,247,0.6)', border: 'border-purple-500/50', text: 'text-purple-400', drop: 'drop-shadow-[0_0_2px_purple]' } :
              lvl >= 20 ? { from: 'from-cyan-400', to: 'to-blue-600', shadow: 'rgba(6,182,212,0.6)', border: 'border-cyan-500/50', text: 'text-cyan-400', drop: 'drop-shadow-[0_0_2px_cyan]' } :
              lvl >= 10 ? { from: 'from-emerald-400', to: 'to-teal-600', shadow: 'rgba(52,211,153,0.6)', border: 'border-emerald-500/50', text: 'text-emerald-400', drop: 'drop-shadow-[0_0_2px_emerald]' } :
              { from: 'from-zinc-200', to: 'to-zinc-500', shadow: 'rgba(255,255,255,0.4)', border: 'border-white/50', text: 'text-white', drop: 'drop-shadow-[0_0_2px_white]' };

            return (
              <div className="absolute right-[5px] top-1/2 -translate-y-1/2 w-[42px] h-[42px] z-30 transform translate-x-1/2">
                <div className={`absolute inset-0 rotate-45 bg-gradient-to-br ${ovrTheme.from} ${ovrTheme.to} border-[2px] border-white/50 group-hover:rotate-[225deg] transition-transform duration-700 ease-out`} style={{ boxShadow: `0 0 15px ${ovrTheme.shadow}` }}></div>
                <div className={`absolute inset-[3px] rotate-45 bg-zinc-950 border ${ovrTheme.border}`}></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                  <span className={`text-[7px] font-black ${ovrTheme.text} uppercase tracking-widest leading-none mb-[1px] ${ovrTheme.drop}`}>OVR</span>
                  <span className="text-[16px] font-black text-white leading-none tracking-tighter drop-shadow-[1px_1px_1px_black]">{accountLevel}</span>
                </div>
              </div>
            );
          })()}

          {/* Time / Server Banner (Unskewed text for absolute server clock sharpness!) */}
          <div className="absolute -bottom-[22px] right-[10px] z-10">
            <div className="bg-zinc-900 border border-zinc-700 shadow-[0_2px_5px_rgba(0,0,0,0.8)] px-3 py-0.5 skew-x-[-12deg] flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red] skew-x-[12deg]"></div>
              <span className="text-zinc-300 font-black italic text-[9px] tracking-widest uppercase skew-x-[12deg]">SERVER <span className="text-white ml-1">{time}</span></span>
            </div>
          </div>
          
        </div>
      </div>

      {/* --- Top Right Profile (Salary & TF - SHARP HD FIX) --- */}
      <div 
        className="absolute z-50 group"
        style={{
          right: `${baseWidth - visibleRect.right + 24}px`,
          top: `${visibleRect.top + 20}px`,
          transform: 'scale(var(--hud-stage-scale, 1))',
          transformOrigin: 'top right'
        }}
      >
        {/* Main Container (No parent skew, completely sharp content) */}
        <div className="relative flex items-center h-[64px] shadow-2xl">
          
          {/* Slanted backdrop card (skewed independently so content remains pixel-perfect) */}
          <div className="absolute inset-0 bg-zinc-900/85 backdrop-blur-md border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.1)] skew-x-[-12deg] rounded-l-md pointer-events-none z-0"></div>
          
          {/* Carbon grid overlay skewed */}
          <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-screen skew-x-[-12deg] z-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0), radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}></div>
          
          {/* White top highlight skewed */}
          <div className="absolute top-0 right-0 left-4 h-[2px] bg-gradient-to-l from-white via-white/50 to-transparent shadow-[0_0_10px_rgba(255,255,255,0.5)] skew-x-[-12deg] z-0"></div>

          {/* Sharp Unskewed Content Container (No counter skew needed!) */}
          <div className="relative z-10 flex items-center px-6 gap-6 h-full">
            
            {/* TF Node */}
            <div className="flex items-center gap-3">
              <div className="w-[32px] h-[32px] relative flex items-center justify-center">
                <img src="/bg/tf_coin.png" alt="TF" className="w-full h-full object-contain mix-blend-screen drop-shadow-md rounded-full" />
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-[family-name:var(--font-outfit)] text-[9px] font-black italic text-zinc-400 uppercase tracking-[0.2em] leading-none mb-[2px]">TEAM FUNDS</span>
                <span className="font-sans text-white font-bold text-[18px] tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">{cash.toLocaleString()}</span>
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="relative z-20 w-[1px] h-[36px] bg-white/10 skew-x-[-12deg]"></div>

            {/* Salary Cap Node */}
            <div className="relative z-20 flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-[28px] h-[28px] relative flex items-center justify-center text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10" cy="7" r="4.5" />
                    <path d="M3 18.5C3 14.9 6.1 13 10 13c1 0 1.9.2 2.7.5A6.5 6.5 0 0 0 11 16.5c0 1.3.4 2.5 1 3.5H3v-1.5z" />
                    <circle cx="17.5" cy="16.5" r="5.5" />
                    <text x="17.5" y="19.5" fontSize="10" fontWeight="900" textAnchor="middle" fill="#09090b" fontFamily="sans-serif">$</text>
                  </svg>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="font-[family-name:var(--font-outfit)] text-[9px] font-black italic text-zinc-400 uppercase tracking-[0.2em] leading-none mb-[2px]">SALARY CAP</span>
                  <span className="font-sans text-white font-bold text-[18px] tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
                    <span className={currentSalary > salaryCap ? "text-red-400" : "text-zinc-100"}>{currentSalary.toLocaleString()}</span>
                    <span className="text-zinc-500 mx-[4px] font-normal">/</span>
                    <span className="text-zinc-400">{salaryCap.toLocaleString()}</span>
                  </span>
                </div>
              </div>
              <button className="flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all cursor-pointer z-20 drop-shadow-md bg-white/5 rounded-full p-1.5 ml-2 border border-white/5" title="Add Cap Space">
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
