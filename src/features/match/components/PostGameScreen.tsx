import React from 'react';
import { Player } from "@/lib/types/player";
import { MatchState, PlayerMatchStats, getStaminaPercent } from "@/lib/utils/matchEngine";
import { MatchResult } from "@/lib/context/GameStateContext";
import { calculateTS } from "@/features/match/utils/calculateTS";
import { getPlayerImage } from "@/features/match/utils/playerImages";

interface PostGameScreenProps {
  reward: MatchResult;
  matchState: MatchState;
  aiTeam: { name: string; roster: Player[] };
  matchRoster: Player[];
  showPostStats: boolean;
  setShowPostStats: (show: boolean) => void;
  handleReturn: () => void;
  getDisplayStats: (playerId: string) => PlayerMatchStats;
}

export const PostGameScreen: React.FC<PostGameScreenProps> = ({
  reward,
  matchState,
  aiTeam,
  matchRoster,
  showPostStats,
  setShowPostStats,
  handleReturn,
  getDisplayStats
}) => {
  // Helper: box score table component
  const BoxScoreTable = ({ players, label, color }: { players: Player[], label: string, color: string }) => {
    const allStats = players.map(p => ({ ...p, stats: getDisplayStats(p.id), stam: Math.floor(matchState.playerStamina[p.id] ?? 100) }));
    const maxPts = Math.max(...allStats.map(s => s.stats.PTS), 0);
    return (
      <div className="mb-4">
        <h3 className={`text-sm font-black tracking-widest mb-2 ${color}`}>{label}</h3>
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-1 px-2">NAME</th>
              <th className="px-1">POS</th>
              <th className="px-1">OVR</th>
              <th className="px-1">PTS</th>
              <th className="px-1">REB</th>
              <th className="px-1">AST</th>
              <th className="px-1">STL</th>
              <th className="px-1">BLK</th>
              <th className="px-1">TOV</th>
              <th className="px-1">FT</th>
              <th className="px-1">FOL</th>
              <th className="px-1">+/-</th>
              <th className="px-1">TS%</th>
              <th className="px-1">STA%</th>
            </tr>
          </thead>
          <tbody>
            {allStats.map(p => {
              const staminaPct = Math.floor(getStaminaPercent(p, p.stam));
              const isLeader = p.stats.PTS === maxPts && maxPts > 0;
              const isHot = p.stats.PTS >= 20;
              const isLock = p.stats.STL >= 2;
              const isBoard = p.stats.REB >= 10;
              const isDD = p.stats.PTS >= 10 && p.stats.REB >= 10;
              const isTD = isDD && p.stats.AST >= 10;
              const rowBorder = isTD ? 'border-2 border-transparent bg-clip-padding' : isDD ? 'border border-yellow-500/40' : 'border-b border-gray-800';
              const rowBg = isTD ? 'bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-yellow-500/10' : isLeader ? 'bg-yellow-500/10' : '';
              const isOrebHustle = (p.stats.OREB ?? 0) >= 4;
              return (
                <tr key={p.id} className={`${rowBorder} ${rowBg}`} style={isTD ? { borderImage: 'linear-gradient(90deg, #a855f7, #06b6d4, #eab308) 1' } : undefined}>
                  <td className={`py-1.5 px-2 font-bold ${isLeader ? 'text-yellow-400' : 'text-white'}`}>
                    {isLeader && '👑 '}{p.name}
                    {isTD && <span className="ml-1 text-[8px] bg-gradient-to-r from-purple-500 to-cyan-400 text-white px-1.5 py-0.5 rounded-full font-black">TRIPLE DOUBLE</span>}
                  </td>
                  <td className="text-center text-gray-400">{p.position}</td>
                  <td className="text-center text-white font-bold">{p.ovr}</td>
                  <td className={`text-center font-bold ${isLeader ? 'text-yellow-400' : 'text-white'}`}>{p.stats.PTS}</td>
                  <td className={`text-center ${isBoard ? 'text-cyan-400 font-bold' : 'text-gray-300'}`} title={`${p.stats.OREB ?? 0}o / ${p.stats.DREB ?? 0}d`}>{p.stats.REB}</td>
                  <td className="text-center text-gray-300">{p.stats.AST}</td>
                  <td className={`text-center ${isLock ? 'text-cyan-400 font-bold' : 'text-gray-300'}`}>{p.stats.STL}</td>
                  <td className={`text-center ${(p.stats.BLK ?? 0) >= 3 ? 'text-purple-400 font-bold' : 'text-gray-300'}`}>{p.stats.BLK ?? 0}</td>
                  <td className={`text-center ${(p.stats.TOV ?? 0) >= 5 ? 'text-red-400 font-bold' : 'text-gray-300'}`}>{p.stats.TOV ?? 0}</td>
                  <td className="text-center text-gray-300">{p.stats.FTM ?? 0}/{p.stats.FTA ?? 0}</td>
                  <td className={`text-center ${(p.stats.FOL ?? 0) >= 4 ? 'text-red-400 font-bold animate-pulse' : 'text-gray-300'}`}>{p.stats.FOL ?? 0}</td>
                  <td className="text-center font-bold" style={{color: (p.stats.plusMinus ?? 0) > 0 ? '#4ade80' : (p.stats.plusMinus ?? 0) < 0 ? '#f87171' : '#9ca3af'}}>
                    {(p.stats.plusMinus ?? 0) > 0 ? `+${p.stats.plusMinus}` : p.stats.plusMinus}
                  </td>
                  <td className="text-center font-bold" style={{color: (() => {
                    const tsVal = calculateTS(p.stats);
                    if (tsVal === '—') return '#9ca3af';
                    const tsNum = parseFloat(tsVal);
                    if (tsNum > 100.0) return '#f59e0b'; // Gold/Orange (Exceptional)
                    if (tsNum >= 65.0) return '#22c55e'; // Green (Efficient)
                    if (tsNum >= 50.0) return '#f3f4f6'; // White (Average)
                    return '#ef4444'; // Red (Struggling)
                  })()}}>
                    {(() => {
                      const tsVal = calculateTS(p.stats);
                      if (tsVal === '—') return '—';
                      const tsNum = parseFloat(tsVal);
                      return `${tsVal}%${tsNum > 100.0 ? ' 🔥' : ''}`;
                    })()}
                  </td>
                  <td className={`text-center font-bold ${staminaPct < 25 ? 'text-red-500 animate-pulse' : staminaPct < 50 ? 'text-yellow-400' : 'text-gray-400'}`}>{staminaPct}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const isWin = matchState.userScore >= matchState.aiScore;
  const allUserPlayers = matchRoster.filter(p => matchState.userPlayerIds.includes(p.id));

  // MVP calculation
  const mvpCalc = allUserPlayers.map(p => {
    const s = getDisplayStats(p.id);
    return { player: p, stats: s, score: s.PTS + s.REB * 0.5 + s.AST * 0.7 + s.STL * 1.2 + (s.BLK ?? 0) * 1.0 - (s.TOV ?? 0) * 0.5 };
  }).sort((a, b) => b.score - a.score);
  const mvp = mvpCalc[0];

  // Leaders
  const scoringLeader = allUserPlayers.map(p => ({ p, s: getDisplayStats(p.id) })).sort((a, b) => b.s.PTS - a.s.PTS)[0];
  const reboundLeader = allUserPlayers.map(p => ({ p, s: getDisplayStats(p.id) })).sort((a, b) => b.s.REB - a.s.REB)[0];
  const assistLeader = allUserPlayers.map(p => ({ p, s: getDisplayStats(p.id) })).sort((a, b) => b.s.AST - a.s.AST)[0];

  // Top user and AI player images for VS display
  const userTopScorer = allUserPlayers.map(p => ({ p, pts: getDisplayStats(p.id).PTS })).sort((a, b) => b.pts - a.pts)[0];
  const aiTopScorer = aiTeam.roster.map(p => ({ p, pts: getDisplayStats(p.id).PTS })).sort((a, b) => b.pts - a.pts)[0];

  const qs = matchState.quarterScores;

  return (
    <div className="absolute inset-0 z-[200] bg-black/95 flex items-center justify-center font-sans overflow-hidden">
      {/* Background court image dimmed */}
      <div className="absolute inset-0 bg-[url('/court_bg.png')] bg-cover bg-center opacity-[0.08]" />

      {/* WIN label — left of center card */}
      <div className={`absolute top-[18%] left-[22%] text-8xl font-black tracking-widest select-none pointer-events-none z-10 ${isWin ? 'text-[#eab308]' : 'text-red-500'}`}
           style={{ transform: 'rotate(-12deg)', textShadow: `0 0 60px ${isWin ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.5)'}`, letterSpacing: '0.15em' }}>
        {isWin ? 'WIN' : 'LOSS'}
      </div>

      {/* LOSS label — right of center card */}
      <div className={`absolute top-[18%] right-[22%] text-8xl font-black tracking-widest select-none pointer-events-none z-10 ${!isWin ? 'text-[#eab308]' : 'text-red-500'}`}
           style={{ transform: 'rotate(12deg)', textShadow: `0 0 60px ${!isWin ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.5)'}`, letterSpacing: '0.15em' }}>
        {!isWin ? 'WIN' : 'LOSS'}
      </div>

      {/* ═══ MVP — Top Left of center ═══ */}
      {mvp && (
        <div className="absolute z-20" style={{ top: '12%', left: '8%' }}>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-cover bg-top border-3 border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.4)] shrink-0"
                 style={{ backgroundImage: `url('${getPlayerImage(mvp.player)}')`, borderWidth: '3px' }} />
            <div className="pt-1">
              <div className="text-[11px] font-black text-yellow-400 tracking-[0.2em] mb-1">👑 MVP</div>
              <div className="text-white font-bold text-sm">{mvp.player.name}</div>
              <div className="flex gap-3 mt-1.5 text-xs font-black">
                <span className="text-yellow-400">PTS {mvp.stats.PTS}</span>
                <span className="text-gray-300">AST {mvp.stats.AST}</span>
                <span className="text-gray-300">REB {mvp.stats.REB}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SCORING LEADER — Left Center ═══ */}
      <div className="absolute z-20" style={{ top: '40%', left: '8%' }}>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-cover bg-top border-2 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] shrink-0"
               style={{ backgroundImage: `url('${getPlayerImage(scoringLeader.p)}')` }} />
          <div>
            <div className="text-[9px] font-black text-orange-400 tracking-[0.2em]">SCORING LEADER</div>
            <div className="text-white font-bold text-xs mt-0.5">{scoringLeader.p.name}</div>
            <div className="text-orange-400 text-sm font-black mt-0.5">PTS {scoringLeader.s.PTS}</div>
          </div>
        </div>
      </div>

      {/* ═══ REBOUND LEADER — Bottom Left ═══ */}
      <div className="absolute z-20" style={{ bottom: '22%', left: '8%' }}>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-cover bg-top border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0"
               style={{ backgroundImage: `url('${getPlayerImage(reboundLeader.p)}')` }} />
          <div>
            <div className="text-[9px] font-black text-cyan-400 tracking-[0.2em]">REBOUND LEADER</div>
            <div className="text-white font-bold text-xs mt-0.5">{reboundLeader.p.name}</div>
            <div className="text-cyan-400 text-sm font-black mt-0.5">REB {reboundLeader.s.REB}</div>
          </div>
        </div>
      </div>

      {/* ═══ ASSIST LEADER — Bottom Center-Left ═══ */}
      <div className="absolute z-20" style={{ bottom: '8%', left: '8%' }}>
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-cover bg-top border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] shrink-0"
               style={{ backgroundImage: `url('${getPlayerImage(assistLeader.p)}')` }} />
          <div>
            <div className="text-[9px] font-black text-green-400 tracking-[0.2em]">ASSIST LEADER</div>
            <div className="text-white font-bold text-xs mt-0.5">{assistLeader.p.name}</div>
            <div className="text-green-400 text-sm font-black mt-0.5">AST {assistLeader.s.AST}</div>
          </div>
        </div>
      </div>

      {/* ═══ REWARDS PANEL — Right Side of Center ═══ */}
      <div className="absolute z-20 w-[380px] p-6 bg-[#0c1825]/90 backdrop-blur-[15px] border-2 border-cyan-500/30 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col gap-4"
           style={{ top: '12%', right: '8%' }}>
        <div className="text-[11px] font-black text-cyan-400 tracking-[0.2em] uppercase border-b border-cyan-500/20 pb-2">
          🎁 MATCH REWARDS
        </div>
        
        {/* Cash Reward */}
        <div className="flex items-center justify-between bg-[#112235]/60 border border-white/5 p-3 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <div className="text-xs font-bold text-gray-300">Club Cash</div>
          </div>
          <div className="text-lg font-black text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.2)]">
            +${reward.cash.toLocaleString()}
          </div>
        </div>

        {/* Account EXP */}
        <div className="flex flex-col bg-[#112235]/60 border border-white/5 p-3 rounded-xl gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⭐</span>
              <div className="text-xs font-bold text-gray-300">Account Experience</div>
            </div>
            <div className="text-sm font-black text-cyan-400">
              +{reward.exp} EXP
            </div>
          </div>
        </div>

        {/* Material Drops */}
        {reward.materials && reward.materials.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[9px] font-black text-gray-400 tracking-[0.1em] uppercase">LOOT SECURED</div>
            <div className="grid grid-cols-2 gap-2">
              {reward.materials.map((mat) => {
                const isUpgrade = mat.id === 'mat_upgrade';
                const isSkillTape = mat.id === 'skill_tape';
                const label = isSkillTape ? 'Skill Tape' : isUpgrade ? 'Upgrade Module' : 'Crafting Alloy';
                const color = isSkillTape
                  ? 'border-red-500/30 bg-red-500/5 text-red-300'
                  : isUpgrade
                    ? 'border-amber-500/30 bg-amber-500/5 text-amber-300'
                    : 'border-slate-500/30 bg-slate-500/5 text-slate-300';
                return (
                  <div key={mat.id} className={`flex items-center justify-between border p-2.5 rounded-lg ${color}`}>
                    <div className="text-[10px] font-bold truncate max-w-[100px]">{label}</div>
                    <div className="text-xs font-black">x{mat.qty}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Strategy Mastery Progression */}
        {reward.strategyExpGained && (
          <div className="flex flex-col gap-2 border-t border-cyan-500/20 pt-3 mt-1">
            <div className="text-[9px] font-black text-cyan-400 tracking-[0.15em] uppercase flex items-center gap-1.5">
              🧠 COACHING STRATEGY EXPERIENCE
            </div>
            <div className="flex flex-col gap-2.5">
              {/* Offensive Strategy */}
              <div className="flex flex-col bg-[#0b131e] border border-cyan-500/10 p-2.5 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-white truncate max-w-[180px]">{reward.strategyExpGained.offName}</span>
                  <span className="text-[9px] font-black text-yellow-400">+50 EXP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[8px] font-black text-cyan-500 bg-cyan-950/50 border border-cyan-500/20 px-1 rounded">OFF</div>
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" style={{ width: '100%' }}>
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Defensive Strategy */}
              <div className="flex flex-col bg-[#0b131e] border border-cyan-500/10 p-2.5 rounded-lg">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-bold text-white truncate max-w-[180px]">{reward.strategyExpGained.defName}</span>
                  <span className="text-[9px] font-black text-yellow-400">+50 EXP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[8px] font-black text-rose-500 bg-rose-950/50 border border-rose-500/20 px-1 rounded">DEF</div>
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden relative">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full" style={{ width: '100%' }}>
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ CENTER MODAL — Score VS Card ═══ */}
      <div className="relative z-30 flex flex-col items-center">
        {/* Team names header */}
        <div className="flex w-[520px] mb-[-2px] relative z-10">
          <div className="flex-1 bg-[#0c1825]/95 border border-cyan-500/30 rounded-tl-xl px-4 py-2.5 text-center">
            <span className="text-sm font-black text-cyan-400 tracking-widest uppercase">My Team</span>
          </div>
          <div className="flex-1 bg-[#0c1825]/95 border border-red-500/30 rounded-tr-xl px-4 py-2.5 text-center">
            <span className="text-sm font-black text-red-400 tracking-widest uppercase">{aiTeam.name}</span>
          </div>
        </div>

        {/* Score boxes with VS between */}
        <div className="flex w-[520px] relative">
          <div className={`flex-1 py-3 text-center font-black text-3xl ${isWin ? 'bg-cyan-500/15 text-cyan-300' : 'bg-[#141e2e] text-gray-400'} border border-cyan-500/20`}>
            {matchState.userScore}
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-xl font-black text-gray-500 tracking-widest">VS</div>
          <div className={`flex-1 py-3 text-center font-black text-3xl ${!isWin ? 'bg-red-500/15 text-red-300' : 'bg-[#141e2e] text-gray-400'} border border-red-500/20`}>
            {matchState.aiScore}
          </div>
        </div>

        {/* Player images showcase */}
        <div className="relative w-[520px] h-[260px] bg-gradient-to-b from-[#080e1a] via-[#0a1628] to-[#0c1e36] border-x border-gray-700/30 flex overflow-hidden">
          {/* User team top scorer */}
          <div className="flex-1 flex items-center justify-center relative">
            <div className="w-44 h-56 bg-cover bg-top rounded-xl border-2 border-cyan-500/50 shadow-[0_0_40px_rgba(6,182,212,0.25)]"
                 style={{ backgroundImage: `url('${getPlayerImage(userTopScorer?.p)}')` }} />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded-full text-[9px] font-bold text-cyan-400 whitespace-nowrap border border-cyan-500/30">
              {userTopScorer?.p.name} — {userTopScorer?.pts} PTS
            </div>
          </div>

          {/* AI team top scorer */}
          <div className="flex-1 flex items-center justify-center relative">
            <div className="w-44 h-56 bg-cover bg-top rounded-xl border-2 border-red-500/50 shadow-[0_0_40px_rgba(239,68,68,0.25)]"
                 style={{ backgroundImage: `url('${getPlayerImage(aiTopScorer?.p)}')` }} />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded-full text-[9px] font-bold text-red-400 whitespace-nowrap border border-red-500/30">
              {aiTopScorer?.p.name} — {aiTopScorer?.pts} PTS
            </div>
          </div>
        </div>

        {/* Bottom buttons */}
        <div className="flex w-[520px] gap-0">
          <button onClick={handleReturn}
                  className="flex-1 py-3 bg-[#1a2332] border border-gray-600 rounded-bl-xl text-white font-black text-sm tracking-widest hover:bg-[#243347] transition-colors cursor-pointer uppercase">
            Close
          </button>
          <button onClick={() => setShowPostStats(!showPostStats)}
                  className="flex-1 py-3 bg-[#1a2332] border border-gray-600 rounded-br-xl text-cyan-400 font-black text-sm tracking-widest hover:bg-[#243347] transition-colors cursor-pointer uppercase">
            Statistics
          </button>
        </div>
      </div>

      {/* Statistics Sub-Modal (toggled by button) */}
      {showPostStats && (
        <div className="absolute inset-0 z-[300] bg-black/90 flex items-center justify-center overflow-y-auto p-6">
          <div className="w-full max-w-3xl bg-[#121c29]/95 border-2 border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-white tracking-widest">MATCH STATISTICS</h3>
              <button onClick={() => setShowPostStats(false)} className="text-gray-400 hover:text-white text-2xl font-bold cursor-pointer">×</button>
            </div>
            <BoxScoreTable players={allUserPlayers} label="MY TEAM" color="text-cyan-400" />
            <div className="border-t border-gray-700 my-3" />
            <BoxScoreTable players={aiTeam.roster} label={aiTeam.name.toUpperCase()} color="text-red-400" />
            {/* Quarter breakdown */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-[11px] text-center whitespace-nowrap">
                <thead><tr className="text-gray-500 border-b border-gray-700">
                  <th className="text-left px-2 py-1 min-w-[100px]"></th>
                  {[1,2,3,4].map(q => <th key={q} className="px-2 w-12">Q{q}</th>)}
                  {matchState.otScores.user.map((_, i) => <th key={`ot${i}`} className="px-2 w-12 text-yellow-500 font-black">{i === 0 ? 'OT' : `${i+1}OT`}</th>)}
                  <th className="px-2 font-black w-16">FINAL</th>
                </tr></thead>
                <tbody>
                  <tr className="border-b border-gray-800">
                    <td className="text-left px-2 py-1 text-cyan-400 font-bold">MY TEAM</td>
                    {qs.user.map((s, i) => <td key={i} className={`px-2 font-bold ${s > qs.ai[i] ? 'text-yellow-400' : 'text-white'}`}>{s}</td>)}
                    {matchState.otScores.user.map((s, i) => <td key={`otu${i}`} className={`px-2 font-bold ${s > matchState.otScores.ai[i] ? 'text-yellow-400' : 'text-white'}`}>{s}</td>)}
                    <td className="px-2 font-black text-cyan-400">{matchState.userScore}</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="text-left px-2 py-1 text-red-400 font-bold">{aiTeam.name.toUpperCase()}</td>
                    {qs.ai.map((s, i) => <td key={i} className={`px-2 font-bold ${s > qs.user[i] ? 'text-yellow-400' : 'text-white'}`}>{s}</td>)}
                    {matchState.otScores.ai.map((s, i) => <td key={`ota${i}`} className={`px-2 font-bold ${s > matchState.otScores.user[i] ? 'text-yellow-400' : 'text-white'}`}>{s}</td>)}
                    <td className="px-2 font-black text-red-400">{matchState.aiScore}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowPostStats(false)} className="flex-1 py-2 rounded-xl font-black bg-gray-700 text-white hover:bg-gray-600 transition-all cursor-pointer uppercase tracking-widest text-sm">Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
