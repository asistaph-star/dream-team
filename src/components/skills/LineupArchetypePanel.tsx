import React, { useState } from "react";
import { Player } from "@/lib/types/player";
import { resolveLineupArchetypes } from "@/lib/lineup/lineupArchetypeResolver";
import { ArchetypeResult } from "@/lib/lineup/types";
import { Trophy, ChevronDown, ChevronUp, ShieldAlert, Sparkles } from "lucide-react";

interface LineupArchetypePanelProps {
  startingLineup: Player[];
}

export function LineupArchetypePanel({ startingLineup }: LineupArchetypePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const summary = resolveLineupArchetypes(startingLineup);

  const { primary, secondary } = summary;

  const getLevelColor = (levelLabel: string) => {
    switch (levelLabel) {
      case "Gold":
        return {
          badge: "from-[#ffd700] via-[#d4af37] to-[#8c7853] border-[#ffd700] text-yellow-100 shadow-yellow-500/20",
          text: "text-yellow-400 drop-shadow-[0_0_5px_rgba(253,224,71,0.5)]",
        };
      case "Silver":
        return {
          badge: "from-[#e2e8f0] via-[#94a3b8] to-[#475569] border-[#cbd5e1] text-slate-100 shadow-slate-500/20",
          text: "text-slate-300 drop-shadow-[0_0_5px_rgba(203,213,225,0.5)]",
        };
      case "Bronze":
        return {
          badge: "from-[#d97706] via-[#b45309] to-[#78350f] border-[#f59e0b] text-amber-100 shadow-amber-500/20",
          text: "text-amber-500 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]",
        };
      default:
        return {
          badge: "from-zinc-700 via-zinc-800 to-zinc-950 border-zinc-600 text-zinc-400 shadow-black/30",
          text: "text-zinc-500",
        };
    }
  };

  const renderEnhancerBadge = (enhancer: string) => {
    const cleanName = enhancer.replace(/_/g, " ");
    return (
      <span
        key={enhancer}
        className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-400 font-[family-name:var(--font-outfit)] font-black uppercase text-[8px] tracking-wider px-1.5 py-0.5 rounded shadow-sm"
      >
        {cleanName}
      </span>
    );
  };

  return (
    <div className="absolute top-[260px] left-[20px] w-[240px] z-30 group p-3 pointer-events-auto">
      {/* Slanted Glassmorphic Backdrop Card (matching LobbyChat style) */}
      <div className="absolute inset-0 bg-[#0c0d12]/95 backdrop-blur-[12px] border border-white/10 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.8)] skew-x-[-3deg] group-hover:border-white/30 transition-all duration-300 z-0 pointer-events-none"></div>

      {/* Low Poly / Glass Facets Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60 skew-x-[-3deg] z-0 rounded-2xl">
        <div className="absolute inset-0 bg-white/[0.02]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}></div>
        <div className="absolute inset-0 bg-black/[0.4]" style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}></div>
        <div className="absolute inset-0 bg-white/[0.03]" style={{ clipPath: "polygon(50% 0, 100% 0, 100% 50%)" }}></div>
      </div>

      {/* Sharp, Unskewed Interior Content */}
      <div className="relative z-10 text-left">
        {/* Header Tab */}
        <div className="flex justify-between items-center mb-2.5">
          <div className="px-3 py-1 bg-zinc-800 border border-white/20 text-white font-[family-name:var(--font-outfit)] font-black tracking-wider uppercase text-[9px] rounded-md shadow-[0_0_8px_rgba(255,255,255,0.1)] skew-x-[-10deg] flex items-center gap-1.5">
            <span className="skew-x-[10deg] flex items-center gap-1">
              <Trophy size={10} className="text-yellow-400 animate-pulse" />
              STRATEGY
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-zinc-400 hover:text-white p-0.5 transition-colors cursor-pointer"
            title={isExpanded ? "Collapse Details" : "Expand Details"}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Primary Archetype HUD */}
        {primary ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-black text-white uppercase tracking-wider leading-none">
                {primary.displayName.replace(" Lineup", "")}
              </span>
              <div
                className={`text-[8px] font-black uppercase tracking-wider border rounded px-1.5 py-0.5 bg-gradient-to-br shadow-[0_0_10px_var(--tw-shadow-color)] ${
                  getLevelColor(primary.levelLabel).badge
                }`}
              >
                {primary.levelLabel}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-zinc-950 rounded-full border border-white/5 overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r transition-all duration-300 ${
                    primary.levelLabel === "Gold"
                      ? "from-yellow-500 to-amber-300"
                      : primary.levelLabel === "Silver"
                      ? "from-slate-400 to-zinc-200"
                      : "from-amber-600 to-yellow-600"
                  }`}
                  style={{ width: `${Math.min(100, (primary.signalCount / 7) * 100)}%` }}
                ></div>
              </div>
              <span className="text-[10px] font-bold text-zinc-400 shrink-0 leading-none">
                {primary.signalCount}/7
              </span>
            </div>

            {/* Level specific notices */}
            {primary.level < 3 && primary.requiredSignalsForNextLevel > 0 && (
              <span className="text-[9px] text-zinc-500 font-semibold leading-none">
                Next level: Need {primary.requiredSignalsForNextLevel} more signals
              </span>
            )}
            {primary.level === 2 && primary.signalCount >= 7 && (
              <span className="text-[8px] text-red-400 font-bold leading-none flex items-center gap-1">
                <ShieldAlert size={8} />
                Needs 3+ distinct contributing players
              </span>
            )}

            {/* Foul-Draw Preview Note */}
            {primary.id === "foul-draw" && (
              <div className="mt-1.5 p-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-[8px] leading-tight text-yellow-200/90 font-semibold flex flex-col gap-1">
                <div className="font-bold flex items-center gap-1 text-yellow-300">
                  <ShieldAlert size={8} className="text-yellow-400 animate-pulse shrink-0" />
                  <span>Foul-Draw archetype detected — gameplay scaling not active yet.</span>
                </div>
                <div>
                  <span className="text-zinc-400">Enhancers:</span> FLOP, DEEP_STRIKE, COMPOSURE_SHIELD.
                </div>
                <div>
                  <span className="text-zinc-400">Counters:</span> CLEAN_CHALLENGE, Discipline Wall, Focus Lock.
                </div>
                <div className="text-[7.5px] italic text-yellow-400/80">
                  Future: Flop and 3PT foul pressure may scale after balance audit.
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-2 text-center">
            <span className="text-[11px] text-zinc-500 font-bold tracking-widest uppercase">
              No Active Archetype
            </span>
          </div>
        )}

        {/* Secondary Archetype indicator */}
        {!isExpanded && secondary && (
          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
              Secondary:
            </span>
            <span className="text-[9px] text-white font-semibold uppercase leading-none truncate max-w-[120px]">
              {secondary.displayName.replace(" Lineup", "")} ({secondary.signalCount} sigs)
            </span>
          </div>
        )}

        {/* Detailed Expanded View */}
        {isExpanded && (
          <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1 no-scrollbar animate-[fadeIn_0.2s_ease-out]">
            {/* Contributors Section */}
            {primary && primary.playerContributions.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">
                  Lineup Contributors:
                </span>
                <div className="flex flex-col gap-1 pl-1">
                  {primary.playerContributions.map((c) => (
                    <div key={c.playerId} className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-white font-bold truncate max-w-[150px]">
                          • {c.playerName}
                        </span>
                        {c.contributedSkills.length > 0 && (
                          <span className="text-[8px] text-emerald-400 font-black">
                            +{c.contributedSkills.length} sigs
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-0.5 pl-2">
                        {c.contributedSkills.map((sk) => (
                          <span
                            key={sk}
                            className="text-[7.5px] text-zinc-400 font-semibold bg-zinc-950/60 px-1 py-0.5 rounded border border-white/5"
                          >
                            {sk}
                          </span>
                        ))}
                        {c.lockedGreenSkill && (
                          <span
                            key={c.lockedGreenSkill}
                            className="text-[7.5px] text-red-500/80 font-bold bg-zinc-950/60 px-1 py-0.5 rounded border border-red-500/20 line-through decoration-red-500/60"
                            title="Green skill locked (OVR < 85)"
                          >
                            {c.lockedGreenSkill} (OVR &lt; 85)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Base Skills */}
            {primary && primary.missingSignalOptions.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">
                  Missing Signal Options:
                </span>
                <div className="flex flex-wrap gap-1 pl-1">
                  {primary.missingSignalOptions.slice(0, 4).map((sk) => (
                    <span
                      key={sk}
                      className="text-[7.5px] text-zinc-500 font-bold bg-zinc-950/40 px-1.5 py-0.5 rounded border border-white/[0.02]"
                    >
                      {sk}
                    </span>
                  ))}
                  {primary.missingSignalOptions.length > 4 && (
                    <span className="text-[7.5px] text-zinc-600 font-black">
                      +{primary.missingSignalOptions.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Active Enhancers */}
            {primary && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">
                  Enhancer Special Skills:
                </span>
                {primary.matchingEnhancers.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pl-1">
                    {primary.matchingEnhancers.map(renderEnhancerBadge)}
                  </div>
                ) : (
                  <span className="text-[8px] text-zinc-600 font-semibold italic pl-1">
                    No enhancers active in starters
                  </span>
                )}
              </div>
            )}

            {/* Secondary Archetype breakdown */}
            {secondary && (
              <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">
                  Secondary Strategy Core:
                </span>
                <div className="flex justify-between items-center pl-1">
                  <span className="text-[9.5px] text-zinc-300 font-bold uppercase">
                    {secondary.displayName.replace(" Lineup", "")}
                  </span>
                  <span className="text-[9.5px] text-zinc-400 font-black">
                    {secondary.signalCount} sigs
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
