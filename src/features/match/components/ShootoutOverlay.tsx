import React from "react";
import { MatchState } from "@/lib/utils/matchEngine";

type ShootoutSequence = NonNullable<MatchState['shootoutSequence']>;

interface ShootoutOverlayProps {
  shootoutSequence: ShootoutSequence | null;
  shootoutRevealCount: number;
  aiTeamName: string;
}

export function ShootoutOverlay({
  shootoutSequence,
  shootoutRevealCount,
  aiTeamName
}: ShootoutOverlayProps) {
  if (!shootoutSequence) return null;
  
  const so = shootoutSequence;
  const revealed = shootoutRevealCount;
  
  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d1117] border-2 border-red-500 rounded-xl p-6 w-[600px] shadow-[0_0_50px_rgba(239,68,68,0.4)] flex flex-col items-center">
        <h2 className="text-3xl font-black text-red-500 tracking-widest mb-2 italic drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse">SUDDEN DEATH SHOOTOUT</h2>
        <p className="text-gray-400 text-xs mb-6 uppercase tracking-widest font-bold">First to miss loses</p>
        
        <div className="flex justify-between w-full mb-8">
          {/* User Column */}
          <div className="flex flex-col items-center flex-1">
            <div className="text-cyan-400 font-black text-lg mb-4 truncate w-full text-center">MY TEAM</div>
            <div className="flex flex-col gap-3">
              {so.results.map((r: any, i: number) => {
                const isRevealed = i < revealed;
                const isCurrent = i === Math.floor(revealed);
                return (
                  <div key={`u${i}`} className="flex items-center gap-3 w-48 bg-white/5 p-2 rounded border border-white/10">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black ${isRevealed ? (r.userMade ? 'border-green-500 bg-green-500/20 text-green-500' : 'border-red-500 bg-red-500/20 text-red-500') : (isCurrent ? 'border-yellow-400 animate-pulse bg-yellow-400/20 text-yellow-400' : 'border-gray-600 text-gray-600')}`}>
                      {isRevealed ? (r.userMade ? '✓' : '✗') : '•'}
                    </div>
                    <span className="text-white text-xs font-bold truncate flex-1">{r.userPlayerName.split(' ').pop()}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col justify-center px-4 font-black text-gray-600 italic text-2xl">VS</div>

          {/* AI Column */}
          <div className="flex flex-col items-center flex-1">
            <div className="text-red-400 font-black text-lg mb-4 truncate w-full text-center">{aiTeamName.toUpperCase()}</div>
            <div className="flex flex-col gap-3">
              {so.results.map((r: any, i: number) => {
                const isRevealed = i < revealed;
                const isCurrent = i === Math.floor(revealed);
                return (
                  <div key={`a${i}`} className="flex items-center justify-end gap-3 w-48 bg-white/5 p-2 rounded border border-white/10">
                    <span className="text-white text-xs font-bold truncate flex-1 text-right">{r.aiPlayerName.split(' ').pop()}</span>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-black ${isRevealed ? (r.aiMade ? 'border-green-500 bg-green-500/20 text-green-500' : 'border-red-500 bg-red-500/20 text-red-500') : (isCurrent ? 'border-yellow-400 animate-pulse bg-yellow-400/20 text-yellow-400' : 'border-gray-600 text-gray-600')}`}>
                      {isRevealed ? (r.aiMade ? '✓' : '✗') : '•'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {revealed >= so.results.length && (
          <div className={`text-2xl font-black mt-2 p-3 w-full text-center rounded border ${so.winner === 'user' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-red-500/20 border-red-500 text-red-400'}`}>
            {so.winner === 'user' ? 'MY TEAM WINS THE SHOOTOUT!' : `${aiTeamName.toUpperCase()} WINS THE SHOOTOUT!`}
          </div>
        )}
      </div>
    </div>
  );
}
