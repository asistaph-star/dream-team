import React, { RefObject } from "react";
import { Player } from "@/lib/types/player";
import { MatchState, MatchEvent, PlayerMatchStats, getPlayerMaxStamina, getStaminaPercent } from "@/lib/utils/matchEngine";
import { calculateTS } from "@/features/match/utils/calculateTS";

interface MatchBottomHUDProps {
  activeLogTab: 'pbp' | 'stats';
  setActiveLogTab: (val: 'pbp' | 'stats') => void;
  statsTeam: 'user' | 'ai';
  setStatsTeam: (val: 'user' | 'ai') => void;
  statsFilter: 'starters' | 'bench';
  setStatsFilter: (val: 'starters' | 'bench') => void;
  displayEvents: MatchEvent[];
  matchState: MatchState;
  currentLineup: Player[];
  aiTeam: any;
  getDisplayStats: (pid: string) => PlayerMatchStats;
  logEndRef: RefObject<HTMLDivElement | null>;
  roster: Player[];
  userOffStrategy: string;
  userDefStrategy: string;
}

export function MatchBottomHUD({
  activeLogTab,
  setActiveLogTab,
  statsTeam,
  setStatsTeam,
  statsFilter,
  setStatsFilter,
  displayEvents,
  matchState,
  currentLineup,
  aiTeam,
  getDisplayStats,
  logEndRef,
  roster,
  userOffStrategy,
  userDefStrategy,
}: MatchBottomHUDProps) {
  const latestEvent = displayEvents[displayEvents.length - 1];
  const recentEvents = [...displayEvents].slice(-8).reverse();
  const shortStrategy = (name: string) => {
    const trimmed = name.split("(")[0]?.trim() ?? name;
    return trimmed.length > 16 ? `${trimmed.slice(0, 16)}…` : trimmed;
  };

  return (
    <>
      {/* BOTTOM HUD - MATCH FEED */}
      <div className="w-[280px] bg-[#0d1520]/95 rounded-lg p-2 text-white border border-gray-700/80 shadow-xl shrink-0">
          <div className="flex gap-2 mb-2">
              <span className="bg-cyan-600/20 border border-cyan-500/40 px-3 py-1 text-[10px] rounded font-black uppercase tracking-widest text-cyan-300">Live Feed</span>
              <span className="bg-black/40 border border-white/10 px-3 py-1 text-[10px] rounded font-bold uppercase text-gray-400">Match</span>
          </div>
          <div className="h-28 bg-black/50 border border-white/5 rounded-sm p-2 text-[11px] overflow-y-auto flex flex-col justify-end gap-1">
              {recentEvents.length === 0 ? (
                <p><span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Tip-off pending</span></p>
              ) : (
                recentEvents.map((ev, idx) => (
                  <p key={ev.id} className={idx === 0 ? "text-[12px]" : "opacity-70"}>
                    <span className="text-yellow-400 font-bold tabular-nums">{ev.time}</span>
                    <span className={`font-black ml-1 uppercase text-[10px] ${ev.isUserTeam ? 'text-cyan-400' : 'text-red-400'}`}>
                      {ev.isUserTeam ? 'HOME' : 'AWAY'}
                    </span>
                    <span className="text-gray-200 ml-1">{ev.text}</span>
                  </p>
                ))
              )}
          </div>
      </div>

      {/* BOTTOM HUD - LOGS + STATISTICS */}
      <div className="flex-1 max-w-[740px] bg-slate-900/98 rounded-lg overflow-hidden border border-gray-700/80 shadow-2xl flex flex-col h-[166px]" style={{backdropFilter:'blur(8px)'}}>
          {/* Tab bar */}
          <div className="flex items-center bg-[#0d1520] border-b border-gray-700/60 text-[11px] font-bold">
              <button onClick={() => setActiveLogTab('pbp')} className={`px-5 py-2 transition-all border-r border-gray-700/60 ${activeLogTab === 'pbp' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer'}`}>Play by Play</button>
              <button onClick={() => setActiveLogTab('stats')} className={`px-5 py-2 transition-all ${activeLogTab === 'stats' ? 'bg-[#1e3a5f] text-cyan-300 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer'}`}>Box Score</button>
              {activeLogTab === 'stats' && (
                <div className="flex items-center gap-1 ml-auto pr-2">
                  <button onClick={() => setStatsTeam('user')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${statsTeam === 'user' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' : 'text-gray-500 hover:text-gray-300'}`}>MY TEAM</button>
                  <button onClick={() => setStatsTeam('ai')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${statsTeam === 'ai' ? 'bg-red-500/20 text-red-300 border border-red-500/50' : 'text-gray-500 hover:text-gray-300'}`}>{aiTeam.name.split(' ').slice(-1)[0].toUpperCase()}</button>
                  <span className="text-gray-700 mx-1">|</span>
                  <button onClick={() => setStatsFilter('starters')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${statsFilter === 'starters' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'text-gray-500 hover:text-gray-300'}`}>COURT</button>
                  <button onClick={() => setStatsFilter('bench')} className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${statsFilter === 'bench' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' : 'text-gray-500 hover:text-gray-300'}`}>BENCH</button>
                </div>
              )}
          </div>

          {activeLogTab === 'pbp' ? (
            <div className="flex-1 pt-2 px-3 pb-2 bg-slate-900 text-[11px] overflow-hidden flex flex-col">
              {latestEvent && (
                <div className="mb-2 rounded-sm border border-white/10 bg-black/35 px-3 py-2">
                  <div className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">Latest Play</div>
                  <p>
                    <span className="text-yellow-400 font-bold tabular-nums">{latestEvent.time}</span>
                    <span className={`font-black ml-2 uppercase text-[10px] ${latestEvent.isUserTeam ? 'text-cyan-400' : 'text-red-400'}`}>
                      {latestEvent.isUserTeam ? 'HOME' : 'AWAY'}
                    </span>
                    <span className="text-white ml-2 font-semibold">{latestEvent.text}</span>
                  </p>
                </div>
              )}
              <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col justify-end">
                <div className="space-y-1 pb-1">
                  {recentEvents.slice(1).map(ev => (
                    <p key={ev.id}>
                      <span className="text-yellow-400 font-bold tabular-nums">{ev.time}</span>
                      <span className={`font-black ml-1 uppercase text-[10px] ${ev.isUserTeam ? 'text-cyan-400' : 'text-red-400'}`}>{ev.isUserTeam ? 'HOME' : 'AWAY'}</span>
                      <span className="text-gray-300 ml-1">{ev.text}</span>
                    </p>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
              <div className="border-t border-white/5 pt-1.5 mt-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest">
                <span className="text-cyan-400 truncate max-w-[45%]">OFF: {shortStrategy(userOffStrategy)}</span>
                <span className="text-red-400 truncate max-w-[45%] text-right">DEF: {shortStrategy(userDefStrategy)}</span>
              </div>
            </div>
          ) : (() => {
            // Build player list for selected team + filter
            const userOnCourt = new Set(currentLineup.map(p => p.id));
            const allUserIds = matchState.userPlayerIds.length > 0 ? matchState.userPlayerIds : currentLineup.map(p => p.id);
            const allAiIds = aiTeam.roster.map((p: any) => p.id);
            let players: Player[] = [];
            if (statsTeam === 'user') {
              const pool = roster.filter(p => allUserIds.includes(p.id));
              players = statsFilter === 'starters' ? pool.filter(p => userOnCourt.has(p.id)) : pool.filter(p => !userOnCourt.has(p.id));
            } else {
              const activeAiIds = new Set(matchState.aiLineupIds);
              players = statsFilter === 'starters'
                ? aiTeam.roster.filter((p: any) => activeAiIds.has(p.id))
                : aiTeam.roster.filter((p: any) => !activeAiIds.has(p.id));
            }
            const gs = (pid: string) => getDisplayStats(pid);
            const stam = (pid: string) => Math.floor(matchState.playerStamina[pid] ?? 100);
            // Stat leaders for highlighting
            const allSrcIds = statsTeam === 'user' ? allUserIds : allAiIds;
            const maxPts = Math.max(0, ...allSrcIds.map((id: string) => gs(id).PTS));
            const maxReb = Math.max(0, ...allSrcIds.map((id: string) => gs(id).REB));
            const maxAst = Math.max(0, ...allSrcIds.map((id: string) => gs(id).AST));
            const maxStl = Math.max(0, ...allSrcIds.map((id: string) => gs(id).STL));
            const isHot = (pid: string) => matchState.hotPlayers[pid];
            const stamColor = (s: number) => s > 60 ? '#22c55e' : s > 30 ? '#eab308' : '#ef4444';
            const teamColor = statsTeam === 'user' ? '#06b6d4' : '#f87171';
            return (
              <div className="flex-1 overflow-y-auto no-scrollbar">
                <table className="w-full text-[10px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#0d1520] text-gray-400 uppercase tracking-wider">
                      <th className="text-left px-3 py-1.5 font-bold w-28">Player</th>
                      <th className="px-1 py-1.5 font-bold w-16">Energy</th>
                      <th className="px-2 py-1.5 font-bold">FGM-A</th>
                      <th className="px-2 py-1.5 font-bold">3PM-A</th>
                      <th className="px-2 py-1.5 font-bold">FTM-A</th>
                      <th className="px-2 py-1.5 font-bold">REB</th>
                      <th className="px-2 py-1.5 font-bold">AST</th>
                      <th className="px-2 py-1.5 font-bold">STL</th>
                      <th className="px-2 py-1.5 font-bold">BLK</th>
                      <th className="px-2 py-1.5 font-bold">TO</th>
                      <th className="px-2 py-1.5 font-bold">PF</th>
                      <th className="px-2 py-1.5 font-bold">+/-</th>
                      <th className="px-2 py-1.5 font-bold">TS%</th>
                      <th className="px-2 py-1.5 font-bold text-yellow-400">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.length === 0 && (
                      <tr><td colSpan={14} className="text-center text-gray-600 py-4 text-[10px]">No players in this group</td></tr>
                    )}
                    {players.map((p, i) => {
                      const s = gs(p.id);
                      const st = stam(p.id);
                      const stMax = getPlayerMaxStamina(p);
                      const stPct = getStaminaPercent(p, st);
                      const hot = isHot(p.id);
                      const isLeadPts = s.PTS === maxPts && maxPts > 0;
                      const isLeadReb = s.REB === maxReb && maxReb > 0;
                      const isLeadAst = s.AST === maxAst && maxAst > 0;
                      const isLeadStl = s.STL === maxStl && maxStl > 0;
                      const isDD = s.PTS >= 10 && s.REB >= 10;
                      const inFoulTrouble = (s.FOL ?? 0) >= 4;
                      const rowBg = i % 2 === 0 ? 'bg-[#0a1525]' : 'bg-[#0d1b2e]';
                      return (
                        <tr key={p.id} className={`${rowBg} border-b border-gray-800/60 transition-colors hover:bg-white/5`}>
                          {/* Player name */}
                          <td className="px-3 py-1.5">
                            <div className="flex items-center gap-1">
                              <span className="font-bold truncate max-w-[80px]" style={{color: teamColor}}>
                                {p.name.split(' ').map((n,i) => i===0 ? n[0]+'.' : n).join(' ')}
                              </span>
                              {isDD && <span className="text-[7px] bg-yellow-500/20 text-yellow-400 px-0.5 rounded font-black">DD</span>}
                              {inFoulTrouble && <span className="text-[7px] bg-red-500/20 text-red-400 px-0.5 rounded font-black animate-pulse">{s.FOL}F</span>}
                            </div>
                            <div className="text-[8px] text-gray-600">{p.position} · {p.ovr}</div>
                          </td>
                          {/* Energy bar */}
                          <td className="px-1 py-1.5">
                            <div className="flex items-center gap-1">
                                <div className="w-10 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{width:`${stPct}%`, background: stamColor(stPct)}} />
                              </div>
                              <span className="text-[9px] font-bold tabular-nums" style={{color: stamColor(stPct)}} title={`${Math.floor(stPct)}% stamina`}>{st}/{stMax}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center text-gray-300">{s.FGM ?? 0}/{s.FGA ?? 0}</td>
                          <td className="px-2 py-1.5 text-center text-gray-300">{s.TPM ?? 0}/{s.TPA ?? 0}</td>
                          <td className="px-2 py-1.5 text-center text-gray-300">{s.FTM ?? 0}/{s.FTA ?? 0}</td>
                          <td className={`px-2 py-1.5 font-bold ${isLeadReb ? 'text-cyan-400' : 'text-gray-300'}`}>
                            <div className="flex items-center justify-center gap-0.5">{s.REB}{isLeadReb && <span className="text-[8px] leading-none font-black text-cyan-500">TOP</span>}</div>
                          </td>
                          <td className={`px-2 py-1.5 font-bold ${isLeadAst ? 'text-purple-400' : 'text-gray-300'}`}>
                            <div className="flex items-center justify-center gap-0.5">{s.AST}{isLeadAst && <span className="text-[8px] leading-none font-black text-purple-400">TOP</span>}</div>
                          </td>
                          <td className={`px-2 py-1.5 font-bold ${isLeadStl ? 'text-green-400' : 'text-gray-300'}`}>
                            <div className="flex items-center justify-center gap-0.5">{s.STL}{isLeadStl && <span className="text-[8px] leading-none font-black text-green-400">TOP</span>}</div>
                          </td>
                          <td className="px-2 py-1.5 text-center text-gray-300">{s.BLK ?? 0}</td>
                          <td className={`px-2 py-1.5 text-center ${(s.TOV ?? 0) >= 4 ? 'text-red-400 font-bold' : 'text-gray-400'}`}>{s.TOV ?? 0}</td>
                          <td className={`px-2 py-1.5 text-center ${inFoulTrouble ? 'text-red-400 font-bold animate-pulse' : 'text-gray-400'}`}>{s.FOL ?? 0}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-gray-300" style={{color: (s.plusMinus ?? 0) > 0 ? '#4ade80' : (s.plusMinus ?? 0) < 0 ? '#f87171' : '#9ca3af'}}>
                            {(s.plusMinus ?? 0) > 0 ? `+${s.plusMinus}` : s.plusMinus}
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold text-gray-300" style={{color: (() => {
                            const tsVal = calculateTS(s);
                            if (tsVal === '—') return '#9ca3af';
                            const tsNum = parseFloat(tsVal);
                            if (tsNum > 100.0) return '#f59e0b'; // Gold/Orange (Exceptional)
                            if (tsNum >= 65.0) return '#22c55e'; // Green (Efficient)
                            if (tsNum >= 50.0) return '#f3f4f6'; // White (Average)
                            return '#ef4444'; // Red (Struggling)
                          })()}}>
                            {(() => {
                              const tsVal = calculateTS(s);
                              if (tsVal === '—') return '—';
                              const tsNum = parseFloat(tsVal);
                              return `${tsVal}%${tsNum > 100.0 ? ' [EFF]' : ''}`;
                            })()}
                          </td>
                          <td className={`px-2 py-1.5 font-black text-sm ${isLeadPts ? 'text-yellow-400' : 'text-white'}`}>
                            <div className="flex items-center justify-center gap-0.5">
                              {isLeadPts && <span className="text-[8px] leading-none font-black text-yellow-500">TOP</span>}
                              <span>{s.PTS}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
      </div>
    </>
  );
}
