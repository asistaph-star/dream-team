import React from "react";
import { Player } from "@/lib/types/player";
import { ViewState } from "@/features/match/types";

interface PreMatchScreenProps {
  preIsHome: boolean;
  preAiTeam: { name: string };
  userPlayers: Player[];
  aiPlayers: Player[];
  setViewState: (state: ViewState) => void;
}

export const PreMatchScreen: React.FC<PreMatchScreenProps> = ({
  preIsHome,
  preAiTeam,
  userPlayers,
  aiPlayers,
  setViewState,
}) => {
  return (
    <div className="fixed inset-0 z-[200] bg-[#070b13] flex flex-col items-center justify-between p-8 font-mono animate-[fadeIn_0.3s_ease-out] overflow-y-auto">
      {/* Neon scanlines */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_bottom,rgba(255,255,255,0),rgba(255,255,255,0)_50%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.3))] bg-[length:100%_4px]" />
      
      {/* Header */}
      <div className="w-full max-w-4xl text-center mt-4">
        <div className="text-[10px] text-cyan-400 font-bold tracking-[0.4em] uppercase mb-1">STADIUM MATCHUP PREVIEW</div>
        <h2 className="text-3xl font-black text-white tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2">
          NBA LIVE MATCH CENTER
        </h2>
        <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent mt-3" />
      </div>

      {/* Roster Reports */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 my-6">
        {/* My Team */}
        <div className="bg-black/60 border border-cyan-500/20 rounded-xl p-5 shadow-[0_0_25px_rgba(6,182,212,0.05)]">
          <h3 className="text-sm font-black text-cyan-400 tracking-wider mb-4 border-b border-cyan-500/10 pb-2 flex justify-between">
            <span>MY TEAM</span>
            <span className="text-xs text-gray-500 font-normal">HOME COURT: {preIsHome ? 'YES' : 'NO'}</span>
          </h3>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2 no-scrollbar">
            {userPlayers.map(p => {
              return (
                <div key={p.id} className="flex items-center justify-between p-2 rounded border border-gray-800 bg-[#0c121e] transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-cyan-950 border border-cyan-500/30 text-cyan-400 font-bold px-1.5 py-0.5 rounded">{p.position}</span>
                    <span className="text-white font-bold text-xs">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400">OVR: <b className="text-white">{p.ovr}</b></span>
                    <div className="text-[9px] border px-2 py-0.5 rounded font-black tracking-wider uppercase text-green-400 border-green-500/20 bg-green-500/5">
                      ● READY
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Team */}
        <div className="bg-black/60 border border-red-500/20 rounded-xl p-5 shadow-[0_0_25px_rgba(239,68,68,0.05)]">
          <h3 className="text-sm font-black text-red-400 tracking-wider mb-4 border-b border-red-500/10 pb-2 flex justify-between">
            <span>{preAiTeam.name.toUpperCase()}</span>
            <span className="text-xs text-gray-500 font-normal">STADIUM: {preIsHome ? 'AWAY' : 'HOME'}</span>
          </h3>
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-2 no-scrollbar">
            {aiPlayers.map(p => {
              return (
                <div key={p.id} className="flex items-center justify-between p-2 rounded border border-gray-800 bg-[#0c121e] transition-all">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-red-950 border border-red-500/30 text-red-400 font-bold px-1.5 py-0.5 rounded">{p.position}</span>
                    <span className="text-white font-bold text-xs">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400">OVR: <b className="text-white">{p.ovr}</b></span>
                    <div className="text-[9px] border px-2 py-0.5 rounded font-black tracking-wider uppercase text-green-400 border-green-500/20 bg-green-500/5">
                      ● READY
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tip-Off CTA Button */}
      <div className="w-full max-w-4xl text-center mb-4">
        <button
          onClick={() => setViewState('SIMULATING')}
          className="w-full max-w-md py-4 rounded-xl font-black text-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_50px_rgba(6,182,212,0.7)] hover:scale-105 transition-all uppercase tracking-widest cursor-pointer border border-cyan-300/40"
        >
          TIP-OFF MATCH
        </button>
        <div className="text-[10px] text-gray-500 mt-2">Home court advantage: {preIsHome ? 'My Team (+5% crowd energy)' : 'Opponent'}</div>
      </div>
    </div>
  );
};
