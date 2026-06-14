import React from "react";
import { Player } from "@/lib/types/player";
import { MatchState, computeEffective } from "@/lib/utils/matchEngine";
import { SLOT_POSITIONS } from "@/features/match/constants/matchConfig";
import { useGameViewportScale } from "@/lib/hooks/useGameViewportScale";

interface MatchScoreboardProps {
  matchState: MatchState;
  viewState: string;
  currentLineup: Player[];
  aiTeam: any;
  teamOffense: number;
  teamDefense: number;
  displayUserScore: number;
  displayAiScore: number;
  displayClock: number;
  displayPossClock: number;
  halftimeCountdown: number;
  draggingPlayerId: string | null;
  dragHoverSlotId: string | null;
  selectedDifficulty: string;
  isClutchActive: boolean;
  isClutchHigh: boolean;
  isHomeGame: boolean;
  uiRallyMode: boolean;
  userMomPct: number;
}

export function MatchScoreboard({
  matchState,
  viewState,
  currentLineup,
  aiTeam,
  teamOffense,
  teamDefense,
  displayUserScore,
  displayAiScore,
  displayClock,
  displayPossClock,
  halftimeCountdown,
  draggingPlayerId,
  dragHoverSlotId,
  selectedDifficulty,
  isClutchActive,
  isClutchHigh,
  isHomeGame,
  uiRallyMode,
  userMomPct
}: MatchScoreboardProps) {
  const simCourtLineup = (() => {
    if (draggingPlayerId && dragHoverSlotId && draggingPlayerId !== dragHoverSlotId) {
      const idx1 = currentLineup.findIndex(p => p.id === draggingPlayerId);
      const idx2 = currentLineup.findIndex(p => p.id === dragHoverSlotId);
      if (idx1 !== -1 && idx2 !== -1) {
        const lineup = [...currentLineup];
        const temp = lineup[idx1];
        lineup[idx1] = lineup[idx2];
        lineup[idx2] = temp;
        return lineup;
      }
    }
    return null;
  })();

  const simCourtEff = (() => {
    if (simCourtLineup) {
      return computeEffective(simCourtLineup, matchState.playerStamina, matchState.userOffStrategy, matchState.userDefStrategy);
    }
    return null;
  })();

  const isPreviewMode = !!simCourtEff;
  const uOff = simCourtEff ? simCourtEff.off : (matchState.effectiveUserOff || teamOffense);
  const uDef = simCourtEff ? simCourtEff.def : (matchState.effectiveUserDef || teamDefense);
  const uOffDir = uOff > matchState.prevUserOff ? '▲' : uOff < matchState.prevUserOff ? '▼' : '';
  const uDefDir = uDef > matchState.prevUserDef ? '▲' : uDef < matchState.prevUserDef ? '▼' : '';
  const aOff = matchState.effectiveAiOff || aiTeam.off;
  const aDef = matchState.effectiveAiDef || aiTeam.def;
  const aOffDir = aOff > matchState.prevAiOff ? '▲' : aOff < matchState.prevAiOff ? '▼' : '';
  const aDefDir = aDef > matchState.prevAiDef ? '▲' : aDef < matchState.prevAiDef ? '▼' : '';
  const hasWarnings = matchState.strategyWarnings && matchState.strategyWarnings.length > 0;

  const getQText = (q: number) => {
    if (q === 1) return "1ST";
    if (q === 2) return "2ND";
    if (q === 3) return "3RD";
    if (q === 4) return "4TH";
    return `${q - 4}OT`;
  };

  const getAiGradient = () => {
    if (selectedDifficulty === 'EASY') return 'from-[#a71930] to-[#5a0b17]';
    if (selectedDifficulty === 'NORMAL') return 'from-[#0b3c5d] to-[#051e30]';
    if (selectedDifficulty === 'EXPERT') return 'from-[#0f5132] to-[#082a1a]';
    if (selectedDifficulty === 'HELL_EXPERT') return 'from-[#4a0d0d] to-[#240505]';
    if (selectedDifficulty === 'DREAM_TEAM') return 'from-[#0d9488] to-[#115e59]';
    return 'from-[#b0882e] to-[#674f17]';
  };

  const getAiHeaderGrad = () => {
    if (selectedDifficulty === 'EASY') return 'to-red-950/40';
    if (selectedDifficulty === 'NORMAL') return 'to-blue-950/40';
    if (selectedDifficulty === 'EXPERT') return 'to-green-950/40';
    if (selectedDifficulty === 'HELL_EXPERT') return 'to-red-950/50';
    if (selectedDifficulty === 'DREAM_TEAM') return 'to-teal-950/40';
    return 'to-amber-950/40';
  };

  const { uiScale } = useGameViewportScale();

  return (
    <div 
      className="absolute top-8 left-1/2 flex items-start gap-10 z-50 transition-transform duration-300"
      style={{
        transform: `translateX(-50%) scale(${uiScale})`,
        transformOrigin: "top center"
      }}
    >
      <div className="flex flex-col gap-2 items-center">
        {isPreviewMode && (
          <div className="bg-cyan-500/30 border border-cyan-400 text-cyan-300 font-bold text-[8px] px-2 py-0.5 rounded animate-pulse uppercase tracking-widest shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            Previewing Swap Impact...
          </div>
        )}
        <div className={`bg-[#0c0c0e]/95 border p-2 rounded-lg flex items-center justify-around w-28 text-white transition-all duration-300 ${isPreviewMode ? 'border-cyan-400 shadow-[0_0_15px_#06b6d4] scale-105' : hasWarnings ? 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)] animate-pulse' : 'border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.2)]'}`}>
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[9px] text-gray-400 font-black tracking-widest">OFF</span>
            <span className="text-sm font-extrabold text-cyan-400 ">{uOff}</span>
            <span className={`text-[10px] font-bold ${uOffDir === '▲' ? 'text-green-400' : uOffDir === '▼' ? 'text-red-400' : 'text-gray-500'}`}>{uOffDir || '•'}</span>
          </div>
          <div className="h-6 w-px bg-gray-800/80" />
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[9px] text-gray-400 font-black tracking-widest">DEF</span>
            <span className="text-sm font-extrabold text-cyan-400 ">{uDef}</span>
            <span className={`text-[10px] font-bold ${uDefDir === '▲' ? 'text-green-400' : uDefDir === '▼' ? 'text-red-400' : 'text-gray-500'}`}>{uDefDir || '•'}</span>
          </div>
        </div>
        <div className="w-24 h-6 bg-[#374151] rounded-full border border-gray-400 overflow-hidden relative shadow-lg">
          <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500 ease-out" style={{ width: `${matchState.userMomentum}%` }} />
          <div className="absolute inset-0 flex items-center pl-3"><span className="text-white font-black text-[13px] drop-shadow-md">{Math.floor(matchState.userMomentum)}</span></div>
        </div>
        {hasWarnings && <div className="bg-orange-500/20 border border-orange-400 rounded px-2 py-0.5 text-[8px] text-orange-300 font-bold max-w-[160px] text-center">{matchState.strategyWarnings[0]}</div>}
        {(() => {
          const oopCount = (simCourtLineup || currentLineup).filter((p, i) => p.position !== SLOT_POSITIONS[i]).length;
          if (oopCount === 0) return null;
          return <div className="bg-red-600/30 border border-red-500 rounded px-2 py-0.5 text-[8px] text-red-300 font-bold animate-pulse">{oopCount} OUT OF POSITION (-{oopCount * 10}% stats)</div>;
        })()}
      </div>

      {/* Center scoreboard styled after Spurs vs Thunder NBC sports layout */}
      <div className="flex flex-col items-center select-none shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
        {/* USERNAME / IGN HEADER BAR (Futuristic Glowing Badges for Dynamic Gamer Tag Styles) */}
        <div className="w-[500px] flex justify-between items-end px-1 mb-[-2px] relative z-10">
          {/* User IGN Pill with neon glow & victory status signifiers */}
          <div className="w-[230px] h-[28px] bg-gradient-to-t from-[#0c0c0e]/95 to-cyan-950/60 border-t border-x border-cyan-500/30 rounded-t-lg flex items-center justify-between px-3 shadow-[0_-5px_15px_rgba(6,182,212,0.1)]">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-[10px] text-yellow-400">👑</span>
              <span className="text-[10px] font-black tracking-widest text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.85)] truncate  uppercase">
                nfrignaciostudent
              </span>
            </div>
            <span className="text-[8px] bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 rounded px-1 font-bold">HOME</span>
          </div>

          {/* Connector bridge */}
          <div className="w-[30px] h-[16px] bg-[#0c0c0e] border-t border-x border-gray-800/80 rounded-t flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 opacity-80" />
          </div>

          {/* AI Opponent Name Pill with matching difficulty-themed glows */}
          <div className={`w-[230px] h-[28px] bg-gradient-to-t from-[#0c0c0e]/95 ${getAiHeaderGrad()} border-t border-x border-red-500/30 rounded-t-lg flex items-center justify-between px-3 shadow-[0_-5px_15px_rgba(239,68,68,0.1)]`}>
            <span className="text-[8px] bg-red-500/20 text-red-300 border border-red-400/30 rounded px-1  font-bold">AWAY</span>
            <span className="text-[10px] font-black tracking-widest text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.85)] truncate  uppercase text-right">
              {aiTeam.name}
            </span>
          </div>
        </div>

        {/* Master Pill Scoreboard Container */}
        <div className={`w-[500px] h-[72px] bg-[#0c0c0e]/95 border-2 rounded-t-xl flex items-stretch overflow-hidden relative transition-all duration-500 ${isClutchActive ? (isClutchHigh ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.55)]' : 'border-orange-500 shadow-[0_0_15px_rgba(251,146,60,0.45)]') : 'border-gray-800/80'}`}>
          
          {/* LEFT SIDE: Home / My Team */}
          <div className="flex-1 bg-gradient-to-r from-[#24292e] to-[#121619] flex items-center justify-between px-3 border-r border-black/35 relative">
            {/* Big Digital Score */}
            <div className="flex-1 flex justify-end items-center pr-1 gap-2">
              {matchState.possessionTeam === 'user' && (
                <span className="text-[11px] filter drop-shadow-[0_0_5px_rgba(249,115,22,1)] animate-pulse select-none">🏀</span>
              )}
              <span className="text-3xl font-black  tracking-tight text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
                {displayUserScore}
              </span>
            </div>
            
            {/* Timeouts Remaining & Bonus Panel */}
            <div className="absolute left-2.5 bottom-1 flex items-center gap-1.5 select-none pointer-events-none">
              <div className="flex gap-[3px] items-center">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-[7px] h-[2.5px] rounded-sm transition-all duration-300 ${
                      i < matchState.timeoutsLeft 
                        ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]' 
                        : 'bg-gray-800 border border-gray-950'
                    }`}
                  />
                ))}
              </div>
              {matchState.isInBonus?.user && (
                <span className="text-[7px] font-black bg-yellow-500 text-black px-1 rounded animate-pulse scale-90 border border-yellow-400/20">BONUS</span>
              )}
            </div>
          </div>

          {/* MIDDLE SECTION: Time / Clock Capsule */}
          <div className="w-[140px] bg-[#060708] border-x-2 border-[#121417] flex flex-col items-center justify-center relative p-1">
            {viewState === 'HALFTIME' ? (
              <div className="w-[120px] h-[36px] bg-black border-2 border-[#f59e0b] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
                <span className="text-[#f59e0b] font-black tracking-widest text-xs uppercase shadow-black drop-shadow-md">HALFTIME {halftimeCountdown}s</span>
              </div>
            ) : (
              <>
                {/* Minimal live indicator */}
                <div className="text-[7px] font-black text-gray-500 tracking-[0.25em] flex items-center gap-1.5 uppercase mb-0.5 select-none ">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                  <span>LIVE</span>
                </div>

                {/* Big Game Clock */}
                <div className="text-xl font-black  tracking-tight text-white tabular-nums drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] leading-none my-0.5">
                  {Math.floor(displayClock / 60)}:{(displayClock % 60).toString().padStart(2, '0')}
                </div>

                {/* Bottom Row */}
                <div className="w-full flex items-center justify-between px-3 mt-1 text-gray-400">
                  {/* Quarter */}
                  <span className="text-[9px] font-black  text-gray-300 tracking-wider">
                    {getQText(matchState.quarter)}
                  </span>
                  {/* Shot Clock (Possession Clock) */}
                  {displayPossClock < displayClock && displayClock > 0 ? (
                    <span className={`text-[10px] font-black  px-1 rounded tabular-nums ${displayPossClock <= 5 ? 'text-red-500 bg-red-500/10 border border-red-500/30 animate-pulse font-extrabold shadow-[0_0_8px_rgba(239,68,68,0.3)]' : 'text-amber-400 font-bold'}`}>
                      {Math.ceil(displayPossClock)}
                    </span>
                  ) : (
                    <span className="w-[12px] h-[16px] inline-block" />
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT SIDE: Away / AI Team */}
          <div className={`flex-1 bg-gradient-to-l ${getAiGradient()} flex items-center justify-between px-3 border-l border-black/35 relative transition-all duration-500`}>
            {/* Big Digital Score */}
            <div className="flex-1 flex justify-start items-center pl-1 gap-2">
              <span className="text-3xl font-black  tracking-tight text-white tabular-nums drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">
                {displayAiScore}
              </span>
              {matchState.possessionTeam === 'ai' && (
                <span className="text-[11px] filter drop-shadow-[0_0_5px_rgba(249,115,22,1)] animate-pulse select-none">🏀</span>
              )}
            </div>

            {/* Timeouts Remaining & Bonus Panel */}
            <div className="absolute right-2.5 bottom-1 flex items-center gap-1.5 flex-row-reverse select-none pointer-events-none">
              <div className="flex gap-[3px] items-center">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-[7px] h-[2.5px] rounded-sm transition-all duration-300 ${
                      i < (matchState.aiTimeoutsLeft ?? 3)
                        ? 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.8)]' 
                        : 'bg-gray-800 border border-gray-950'
                    }`}
                  />
                ))}
              </div>
              {matchState.isInBonus?.ai && (
                <span className="text-[7px] font-black bg-yellow-500 text-black px-1 rounded animate-pulse scale-90 border border-yellow-400/20">BONUS</span>
              )}
            </div>
          </div>

        </div>

        {/* Dynamic Cheer/Rally Progress Bar under Scoreboard */}
        <div className="w-[500px] px-4 py-2 bg-[#0a0c0e]/95 border-x-2 border-b-2 border-gray-800/80 rounded-b-xl flex flex-col gap-1 shadow-lg">
          <div className="flex justify-between items-center text-[7px] font-black tracking-widest ">
            <span className={`${isHomeGame ? 'text-cyan-400 animate-pulse' : 'text-gray-400'}`}>MY TEAM CROWD ENERGY{isHomeGame ? ' [HOME]' : ''}</span>
            <span className={`${!isHomeGame ? 'text-red-400 animate-pulse' : 'text-gray-400'}`}>{aiTeam.name.toUpperCase()} CROWD ENERGY{!isHomeGame ? ' [HOME]' : ''}</span>
          </div>
          <div className="w-full h-[6px] bg-gray-900 rounded-full overflow-hidden flex border border-black/50">
            {/* User's energy segment (Cyan) */}
            <div
              className={`h-full transition-all duration-700 ease-out ${isHomeGame && uiRallyMode ? 'bg-orange-400 animate-pulse' : 'bg-cyan-500'}`}
              style={{ width: `${userMomPct}%` }}
            />
            {/* AI's energy segment (Red) */}
            <div
              className={`h-full transition-all duration-700 ease-out ${!isHomeGame && uiRallyMode ? 'bg-orange-400 animate-pulse' : 'bg-red-500'}`}
              style={{ width: `${100 - userMomPct}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 items-center">
        <div className="bg-[#0c0c0e]/95 border border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.2)] p-2 rounded-lg flex items-center justify-around w-28 text-white">
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[9px] text-gray-400 font-black tracking-widest">OFF</span>
            <span className="text-sm font-extrabold text-red-400 ">{aOff}</span>
            <span className={`text-[10px] font-bold ${aOffDir === '▲' ? 'text-green-400' : aOffDir === '▼' ? 'text-red-400' : 'text-gray-500'}`}>{aOffDir || '•'}</span>
          </div>
          <div className="h-6 w-px bg-gray-800/80" />
          <div className="flex flex-col items-center leading-tight">
            <span className="text-[9px] text-gray-400 font-black tracking-widest">DEF</span>
            <span className="text-sm font-extrabold text-red-400 ">{aDef}</span>
            <span className={`text-[10px] font-bold ${aDefDir === '▲' ? 'text-green-400' : aDefDir === '▼' ? 'text-red-400' : 'text-gray-500'}`}>{aDefDir || '•'}</span>
          </div>
        </div>
        <div className="w-24 h-6 bg-[#374151] rounded-full border border-gray-400 overflow-hidden relative shadow-lg">
          <div className="h-full bg-gradient-to-l from-yellow-400 to-orange-500 transition-all duration-500 ease-out absolute right-0" style={{ width: `${matchState.aiMomentum}%` }} />
          <div className="absolute inset-0 flex items-center justify-end pr-3"><span className="text-white font-black text-[13px] drop-shadow-md">{Math.floor(matchState.aiMomentum)}</span></div>
        </div>
      </div>
    </div>
  );
}
