import React from 'react';
import { Player } from '@/lib/types/player';

interface PlayerStats {
  PTS: number;
  REB: number;
  AST: number;
  STL: number;
  BLK: number;
  TOV: number;
  OREB?: number;
  DREB?: number;
  FTM?: number;
  FTA?: number;
  FOL?: number;
}

interface PlayerTooltipProps {
  player: Player;
  stamina: number;
  tier: string;
  tierColor: string;
  playerStats: PlayerStats;
  formRating?: number;
  activeMarks?: { mark: string; possessionsLeft: number }[];
}

const MARK_DESCRIPTIONS: Record<string, string> = {
  Exposed: 'perimeter pressure',
  Tilted: 'mental/foul discipline pressure',
  Hooked: 'drive/pass pressure',
  Pinned: 'positioning pressure',
  Static: 'tactical disruption',
};

export const PlayerTooltip: React.FC<PlayerTooltipProps> = ({
  player: p,
  stamina: stam,
  tier,
  tierColor,
  playerStats: pStats,
  formRating = 1.0,
  activeMarks = [],
}) => {
  return (
    <div className="player-tooltip">
      <div className="tt-header">
        <span className="tt-name">{p.name}</span>
        <span className="tt-pos">{p.position}</span>
      </div>
      <div className="tt-body">
        <div className="tt-row"><span>Rating: <b style={{ color: tierColor }}>{tier}</b></span><span>Stamina: <b>{stam}</b></span></div>
        <div className="tt-row"><span>Offense: <b style={{ color: '#fb923c' }}>{p.offense}</b></span><span>Defense: <b style={{ color: '#22d3ee' }}>{p.defense}</b></span></div>
        <div className="tt-row flex justify-between gap-1 mt-1 border-t border-white/10 pt-1">
          <span className="text-[10px] text-gray-400">SHO <b className="text-white">{p.shooting ?? 80}</b></span>
          <span className="text-[10px] text-gray-400">SPD <b className="text-white">{p.speed ?? 80}</b></span>
          <span className="text-[10px] text-gray-400">STR <b className="text-white">{p.strength ?? 80}</b></span>
          <span className="text-[10px] text-gray-400">PLY <b className="text-white">{p.playmaking ?? 80}</b></span>
        </div>
      </div>
      <div className="tt-stats">
        <span><b>{pStats.PTS}</b> PTS</span>
        <span><b>{pStats.REB}</b> REB ({pStats.OREB ?? 0}o / {pStats.DREB ?? 0}d)</span>
        <span><b>{pStats.AST}</b> AST</span>
        <span><b>{pStats.STL}</b> STL</span>
        <span><b>{pStats.TOV}</b> TOV</span>
        <span><b>{pStats.BLK}</b> BLK</span>
        <span><b>{pStats.FTM ?? 0}/{pStats.FTA ?? 0}</b> FT</span>
        <span><b>{pStats.FOL ?? 0}</b>/5 FOL</span>
      </div>
      {activeMarks.length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-white/10 px-3 pb-1.5 flex flex-col gap-1">
          <div className="text-[9px] uppercase font-black tracking-wider text-red-400/90">Active Marks</div>
          <div className="flex flex-col gap-1.5">
            {activeMarks.map((m, idx) => {
              const desc = MARK_DESCRIPTIONS[m.mark] || '';
              return (
                <div key={idx} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-300">
                    <img
                      src={`/marks/${m.mark.toLowerCase()}.png`}
                      alt=""
                      className="w-3.5 h-3.5 object-contain"
                    />
                    <span className="font-bold text-white">{m.mark}</span>
                    <span className="text-gray-400">({m.possessionsLeft} pos left)</span>
                  </div>
                  {desc && (
                    <div className="text-[9px] text-gray-400 pl-5 italic">
                      {desc}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {(() => {
        if (formRating >= 1.10) return <div className="tt-hot">On Fire - Carrying the game!</div>;
        if (formRating >= 1.05) return <div style={{ textAlign: 'center', fontSize: 10, color: '#22c55e', padding: 4, background: 'rgba(34,197,94,0.1)', fontWeight: 'bold' }}>Hot Streak</div>;
        if (formRating <= 0.90) return <div style={{ textAlign: 'center', fontSize: 10, color: '#60a5fa', padding: 4, background: 'rgba(96,165,250,0.1)', fontWeight: 'bold' }}>Ice Cold</div>;
        if (formRating <= 0.95) return <div style={{ textAlign: 'center', fontSize: 10, color: '#94a3b8', padding: 4, background: 'rgba(148,163,184,0.1)', fontWeight: 'bold' }}>Cold</div>;
        return null;
      })()}
      <div className="tt-rarity" style={{ color: tierColor }}>[{p.rarity} — {tier}]</div>
    </div>
  );
};
