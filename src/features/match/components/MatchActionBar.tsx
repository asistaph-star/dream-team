import React from "react";
import { MatchState } from "@/lib/utils/matchEngine";

interface MatchActionBarProps {
  openModal: (type: 'strategy' | 'sub' | 'energydrink') => void;
  handleTimeout: () => void;
  handleMomentum: () => void;
  matchState: MatchState;
  timeoutCountdown: number;
  momentumTimer: number;
  subCooldownEnd: number;
  cooldownNow: number;
}

export function MatchActionBar({
  openModal,
  handleTimeout,
  handleMomentum,
  matchState,
  timeoutCountdown,
  momentumTimer,
  subCooldownEnd,
  cooldownNow
}: MatchActionBarProps) {
  return (
    <div className="flex flex-col gap-1 w-[132px]">
      {/* 2x2 Action Panel */}
      <div className="bg-[#1a2436] rounded-xl p-3 shadow-2xl flex flex-col border border-gray-700/30">
        <div className="text-white font-bold text-[13px] text-center mb-2 tracking-wide">
          Audience: {(matchState.audience || 0).toLocaleString()}
        </div>
        <div className="bg-[#101722] rounded-lg p-1.5 grid grid-cols-2 gap-1.5">
          {/* SUB */}
          <button
            onClick={() => openModal('sub')}
            className="bg-[#f27420] hover:bg-[#ff893b] text-white w-[48px] h-[48px] rounded flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 justify-self-center relative"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="30" height="30">
              <path d="M16 8c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zM8 12c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" />
              <path d="M8 14c-2.33 0-7 1.17-7 3.5V20h10v-2.5c0-2.33-4.67-3.5-7-3.5zm13 1h-3.5v-2l-4 3 4 3v-2H21v-2z" />
            </svg>
            {cooldownNow < subCooldownEnd && (
              <div className="absolute inset-0 bg-black/80 rounded flex flex-col items-center justify-center text-[11px] font-black text-orange-400">
                <span>{Math.ceil((subCooldownEnd - cooldownNow) / 1000)}s</span>
                <span className="text-[6px] text-gray-400 uppercase tracking-widest leading-none">
                  CD
                </span>
              </div>
            )}
          </button>
          
          {/* STRAT */}
          <button
            onClick={() => openModal('strategy')}
            className="bg-[#f27420] hover:bg-[#ff893b] text-white w-[48px] h-[48px] rounded flex flex-col items-center justify-center transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 justify-self-center"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
              <rect x="2" y="2" width="20" height="20" rx="2" fill="white" />
              <circle cx="12" cy="12" r="4" fill="none" stroke="#f27420" strokeWidth="1.5" />
              <path d="M12 2v20" stroke="#f27420" strokeWidth="1.5" strokeDasharray="2 2" />
              <circle cx="6" cy="6" r="1.5" fill="#f27420" />
              <circle cx="18" cy="18" r="1.5" fill="#f27420" />
              <path d="M6 7l4 3M18 17l-4-3" stroke="#f27420" strokeWidth="1.5" />
            </svg>
          </button>
          
          {/* TIMEOUT */}
          <button
            onClick={handleTimeout}
            disabled={matchState.timeoutsLeft <= 0 || timeoutCountdown > 0}
            className={`${
              matchState.timeoutsLeft > 0 && timeoutCountdown === 0
                ? 'bg-[#f27420] hover:bg-[#ff893b] cursor-pointer hover:scale-105 active:scale-95'
                : 'bg-[#a6621a] cursor-not-allowed opacity-90'
            } text-white w-[48px] h-[48px] rounded flex flex-col items-center justify-center transition-all shadow-sm relative justify-self-center`}
          >
            {timeoutCountdown > 0 ? (
              <>
                <span className="text-lg font-black leading-none">{timeoutCountdown}</span>
                <span className="text-[6px] font-black tracking-wider leading-none">WAIT</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                  <circle cx="12" cy="12" r="11" fill="none" stroke="white" strokeWidth="2.5" />
                  <rect x="8" y="7" width="3" height="10" fill="white" />
                  <rect x="13" y="7" width="3" height="10" fill="white" />
                </svg>
              </>
            )}
          </button>
          
          {/* BOOST */}
          <button
            onClick={() => openModal('energydrink')}
            disabled={matchState.energyDrinksLeft <= 0}
            className={`${
              matchState.energyDrinksLeft > 0
                ? 'bg-[#f27420] hover:bg-[#ff893b] cursor-pointer hover:scale-105 active:scale-95'
                : 'bg-[#a6621a] cursor-not-allowed opacity-90'
            } text-[#e0e0e0] w-[48px] h-[48px] rounded flex flex-col items-center justify-center transition-all shadow-sm relative justify-self-center`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28" transform="rotate(30)">
              <path d="M8 2h8v2h-1l-1 2v14a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V6L7 4H6V2zm2 5v2h4V7h-4zm2 8a2 2 0 0 0 2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 2 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
