import React, { useState } from "react";
import { Player } from "@/lib/types/player";
import { lowPolyBg } from "@/lib/constants/visuals";
import { Shield, Sword, Zap, Activity, X, AlertTriangle, ArrowRight, ChevronsRight } from "lucide-react";
import { getDetailedAttributes, applyStarGrowth, getCumulativeStarGrowthGain } from "@/lib/utils/starGrowth";
import { PlayerCard, getStarTierAndLevel } from "@/components/player/PlayerCard";
import { SkillBadge } from "@/components/skills/SkillBadge";
import { isSkillQuality, SPECIAL_SKILL_RATES } from "@/lib/skills/skillCatalog";
import { SpecialSkillName } from "@/lib/skills/assignBaseSkills";
import { useGameState } from "@/lib/context/GameStateContext";
import { getRequiredDuplicateCount } from "@/lib/utils/starRequirements";

interface PlayerHexProfileModalProps {
  player: Player;
  onClose: () => void;
  onStarUp: (confirmSacrifice?: boolean) => Promise<any> | void;
  isAscending: boolean;
}

export function PlayerHexProfileModal({ player: initialPlayer, onClose, onStarUp, isAscending }: PlayerHexProfileModalProps) {
  const { inventory, roster, activeLineup, pendingAscendSacrificeWarning, cancelAscendSacrifice, trainSpecialSkill, acceptSkillTraining, rejectSkillTraining, pendingSkillTraining } = useGameState();
  
  // Ensure the modal always reads the absolute latest player state from the roster,
  // fixing the issue where the modal wouldn't update after a successful Star Up.
  const player = roster.find(p => p.id === initialPlayer.id) || initialPlayer;

  const [showStarUpConfirm, setShowStarUpConfirm] = useState(false);
  const [showSystemNotification, setShowSystemNotification] = useState(false);
  const [isProcessingStarUp, setIsProcessingStarUp] = useState(false);
  const [ascendOutcome, setAscendOutcome] = useState<{ 
    status: 'success' | 'failed', 
    oldStars: number, 
    newStars: number, 
    oldPower: number, 
    newPower: number 
  } | null>(null);
  
  if (!player) return null;
  const details = getDetailedAttributes(player);
  const attributeRows = [
    { label: '3-Pt', val: details.threePt },
    { label: 'Steal', val: details.steal },
    { label: '2-Pt', val: details.twoPt },
    { label: 'Block', val: details.block },
    { label: 'FT', val: details.freeThrow },
    { label: 'Reb', val: details.rebound },
    { label: 'Handle', val: details.handle },
    { label: 'On-Ball', val: details.onBall },
    { label: 'Assist', val: details.assist },
    { label: 'Calm', val: details.calm }
  ];
  const attributeVisualMax = Math.max(180, ...attributeRows.map(stat => stat.val));

  // Extract skills (fallback to placeholders if undefined in mock data)
  const baseSkills = player.baseSkills || ['Shoot', 'Pass', 'Defend'];
  const specialSkills = player.specialSkillSlots || [null, null];

  return (
    <>
      <style>{`#global-bottom-nav { display: none !important; }`}</style>
      <div 
        className="fixed inset-0 z-[10000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 perspective-1000"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
      {/* The Floating Box Container */}
      <div 
        className="w-[1050px] h-[650px] bg-zinc-950 border border-white/10 rounded-2xl flex flex-col overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] relative pointer-events-auto transform-gpu transition-all duration-300 scale-100" 
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* CRT Scanline overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-screen" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />

        {/* Modal Header */}
        <div className="h-[50px] border-b border-white/5 flex items-center justify-between px-6 bg-black/40 shrink-0 relative z-20">
          <div className="flex items-center gap-2">
            <span className="text-white/80 font-black italic tracking-[0.2em] uppercase text-[14px]">Player Profile</span>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 flex relative">
          {/* Animated Glowing Edge Dots */}
          <div 
            className="absolute inset-0 opacity-40 pointer-events-none animate-pulse z-0" 
            style={{ 
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 2px)', 
              backgroundSize: '14px 14px', 
              backgroundPosition: '0 0',
              maskImage: 'radial-gradient(ellipse at center, transparent 30%, black 90%)',
              WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 30%, black 90%)'
            }} 
          />

          {/* Left: Player Art */}
          <div className="w-[400px] h-full relative flex flex-col items-center justify-center border-r border-white/5 bg-black/20 z-10">
            <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
              <span className="text-5xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)] leading-none italic font-[family-name:var(--font-outfit)]">{player.ovr}</span>
              <div className="flex flex-col border-l border-red-500/50 pl-3">
                <span className="text-[12px] text-white/70 font-black uppercase tracking-widest">{player.position}</span>
                <span className="text-[11px] text-red-400 font-bold uppercase tracking-[0.2em]">{player.rarity}</span>
              </div>
            </div>
            
            <div className="relative w-72 h-80 mt-12 perspective-1000">
              <div className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 w-64 h-10 bg-red-600/30 blur-3xl rounded-[100%] pointer-events-none" />
              <div className="w-full h-full relative transition-transform duration-500 hover:scale-105 hover:rotate-y-6">
                {player.imageUrl ? (
                  <img src={player.imageUrl} alt={player.name} className="w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" />
                ) : (
                  <div className="w-full h-full bg-zinc-800 rounded-xl flex items-center justify-center border border-white/10 shadow-inner">
                    <span className="text-white/20 text-7xl font-black">{player.position}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 text-center relative z-20 pointer-events-none">
              <h2 className="text-3xl font-black text-white italic tracking-[0.1em] uppercase drop-shadow-md font-[family-name:var(--font-outfit)]">{player.name}</h2>
              <div className="flex justify-center gap-[12px] mt-6 items-center">
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const starInfo = getStarTierAndLevel(player.starLevel ?? 0);
                  const isActive = starInfo.level >= lvl;
                  return (
                    <div
                      key={lvl}
                      className={`w-[16px] h-[16px] rotate-45 border-2 transition-all duration-300 shadow-[0_0_10px_rgba(0,0,0,0.8)] ${
                        isActive
                          ? starInfo.colorClass
                          : "border-gray-800 bg-black/85 opacity-50"
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Attributes, Skills & Actions */}
          <div className="flex-1 h-full relative flex flex-col p-8 z-10">
            
            {/* Top Attributes Panel */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-3">
                <Activity className="text-cyan-400 w-4 h-4" />
                <h3 className="text-xs font-black text-white/70 uppercase tracking-[0.2em]">Core Attributes</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                {attributeRows.map(stat => (
                  <div key={stat.label} className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{stat.label}</span>
                      <span className="text-[12px] font-black text-white font-mono">{stat.val}</span>
                    </div>
                    <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 relative">
                      <div className="h-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.35)] transition-all duration-1000 ease-out" style={{ width: `${Math.min((stat.val / attributeVisualMax) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5-Box Skill System */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                <h3 className="text-xs font-black text-white/70 uppercase tracking-[0.2em]">Player Skills</h3>
              </div>
              
              <div className="flex gap-6 pl-2 pt-2">
                {/* 3 Base Skills */}
                {baseSkills.map((skill, idx) => (
                  <div key={`base-${idx}`} className="transform scale-[1.35] origin-center">
                    <SkillBadge 
                      name={skill} 
                      color={idx === 0 ? "red" : idx === 1 ? "blue" : "green"} 
                      locked={idx === 2 && player.ovr < 85} 
                    />
                  </div>
                ))}


                {/* Result Modal */}
                <div className="w-[1px] h-[50px] bg-white/10 mx-3" />

                {/* 2 Special/Learnable Skills */}
                {specialSkills.map((skill, idx) => {
                  const unlockStar = idx === 0 ? 1 : 5;
                  const isStarLocked = (player.starLevel || 0) < unlockStar;
                  const skillName = skill ?? "Learn";
                  const locked = isStarLocked;
                  const savedQuality = player.skillRarities?.[skillName];
                  const quality = isSkillQuality(savedQuality) ? savedQuality : "Common";
                  const hasLearnedSkill = Boolean(skill);
                  const maxRate = hasLearnedSkill ? SPECIAL_SKILL_RATES[skillName as SpecialSkillName] : undefined;
                  const skillTapeCount = inventory.materials.skill_tape ?? 0;

                  return (
                    <div key={`spec-${idx}`} className="transform scale-[1.35] origin-center">
                      <SkillBadge
                        name={skillName}
                        color="special"
                        locked={locked}
                        unlockText={`Star ${unlockStar}`}
                        quality={quality}
                        maxRate={maxRate}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hexagonal Button Cluster */}
            <div className="mt-auto relative pointer-events-auto">
              <div className="flex items-end justify-end gap-5 relative z-10 pr-2">
                
                {/* Enhance Hex */}
                <button className="group relative w-16 h-20 flex flex-col items-center justify-center cursor-not-allowed opacity-40 transition-all hover:opacity-50">
                  <div className="absolute inset-0 bg-zinc-900 border border-white/10 pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                  <Shield className="relative text-zinc-500 w-4 h-4 mb-1.5 z-10" />
                  <span className="relative text-[8px] font-bold text-zinc-400 uppercase tracking-widest z-10">Enhance</span>
                </button>

                {/* Core Hex */}
                <button className="group relative w-16 h-20 flex flex-col items-center justify-center cursor-not-allowed opacity-40 transition-all hover:opacity-50 mb-5">
                  <div className="absolute inset-0 bg-zinc-900 border border-white/10 pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                  <Sword className="relative text-zinc-500 w-4 h-4 mb-1.5 z-10" />
                  <span className="relative text-[8px] font-bold text-zinc-400 uppercase tracking-widest z-10">Core</span>
                </button>

                {/* Star Up Hex */}
                <button 
                  onClick={() => setShowStarUpConfirm(true)}
                  disabled={isAscending || (player.starLevel ?? 0) >= 25}
                  className={`group relative w-28 h-32 flex flex-col items-center justify-center transition-all ${isAscending ? 'opacity-50 cursor-wait' : ((player.starLevel ?? 0) >= 25 ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-2 cursor-pointer active:scale-90 active:translate-y-0 duration-150')}`}
                >
                  {/* Outer Glow */}
                  <div className="absolute -inset-3 bg-red-600/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  {/* Hex Shape */}
                  <div className="absolute inset-0 bg-gradient-to-b from-red-900 via-red-950 to-black border-2 border-red-500 shadow-[inset_0_0_25px_rgba(220,38,38,0.3)] transition-all pointer-events-none" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                    <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.4) 45%, transparent 50%)', backgroundSize: '200% 200%' }} />
                  </div>
                  
                  <Zap className={`relative text-white w-7 h-7 mb-1.5 z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)] ${isAscending ? 'animate-bounce' : 'group-hover:animate-pulse'}`} />
                  <span className="relative text-[10px] font-black text-white uppercase tracking-[0.2em] z-10 drop-shadow-[0_2px_4px_black]">
                    {isAscending ? 'Upgrading' : ((player.starLevel ?? 0) >= 25 ? 'Max Star' : 'Star Up')}
                  </span>
                </button>

              </div>
            </div>
            
            {/* Ascension Overlay */}
            {showStarUpConfirm && (player.starLevel ?? 0) < 25 && (() => {
              const currentStars = player.starLevel ?? 0;
              const targetStars = currentStars + 1;
              const targetInfo = getStarTierAndLevel(targetStars);
              
              let tierMult = 1.0;
              if (targetInfo.tier === "Blue") tierMult = 1.5;
              else if (targetInfo.tier === "Violet") tierMult = 2.0;
              else if (targetInfo.tier === "Orange") tierMult = 2.5;
              else if (targetInfo.tier === "Red") tierMult = 3.0;
              
              const matCost = Math.floor(20 * targetInfo.level * tierMult);
              const ownedMats = inventory?.materials?.mat_upgrade ?? 0;
              const hasEnoughMats = ownedMats >= matCost;

              const requiredDuplicates = getRequiredDuplicateCount(targetInfo.tier, targetInfo.level);

              const dupCandidates = roster.filter(
                p => p.name === player.name && 
                p.id !== player.id && 
                !activeLineup.some(al => al.id === p.id)
              );
              const hasEnoughDuplicates = dupCandidates.length >= requiredDuplicates;
              const canAscend = hasEnoughMats && hasEnoughDuplicates;

              // Calculate projected player attributes for Effect Preview
              const projectedPlayer = applyStarGrowth(player, targetStars);

              // Success rate calculation
              let baseChance = 1.0;
              let decayRate = 0.10;
              if (targetInfo.tier === "Silver") { baseChance = 1.0; } 
              else if (targetInfo.tier === "Blue") { baseChance = 0.50; } 
              else if (targetInfo.tier === "Violet") { baseChance = 0.25; } 
              else if (targetInfo.tier === "Orange") { baseChance = 0.12; } 
              else if (targetInfo.tier === "Red") { baseChance = 0.083333; }
              const starFactor = 1.0 - (targetInfo.level - 1) * decayRate;
              const ratePercent = Math.max(1, Math.floor((baseChance * starFactor) * 100));

              const executeStarUp = async (confirmSacrifice?: boolean) => {
                if (isProcessingStarUp) return;
                setIsProcessingStarUp(true);
                
                const oldStars = currentStars;
                const newStars = targetStars;
                const oldDetails = getDetailedAttributes(player);
                const newDetails = getDetailedAttributes(projectedPlayer);
                const oldPower = Math.floor(Object.values(oldDetails).reduce((a:any,b:any)=>a+b,0)*1.5 + (player.stamina??100)*2);
                const newPower = Math.floor(Object.values(newDetails).reduce((a:any,b:any)=>a+b,0)*1.5 + (projectedPlayer.stamina??100)*2);
                
                const res = await onStarUp(confirmSacrifice);
                setIsProcessingStarUp(false);
                
                if (res && res.pendingWarning) {
                  return;
                }
                
                if (res && typeof res.success !== 'undefined') {
                  setAscendOutcome({
                    status: res.success ? 'success' : 'failed',
                    oldStars, newStars, oldPower, newPower
                  });
                } else {
                  setAscendOutcome({ status: 'success', oldStars, newStars, oldPower, newPower });
                }
              };

              return (
                <>
                  <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 rounded-r-2xl border-l border-white/5 animate-[fadeIn_0.15s_ease-out]">
                  <div 
                    className="w-full h-full border border-white/10 rounded-xl p-5 flex flex-col relative overflow-hidden shadow-2xl"
                    style={{ 
                      backgroundImage: `url('${lowPolyBg}')`, 
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    
                    <div className="relative z-10 flex flex-col h-full gap-3">
                      
                      {/* Header: Effect Preview */}
                      <div className="bg-white/5 border-l-[4px] border-emerald-500 px-4 py-2 flex items-center shadow-inner rounded-r">
                        <span className="text-white text-[14px] font-black tracking-widest uppercase drop-shadow-sm">Effect Preview</span>
                      </div>

                      {/* Stats List */}
                      <div className="bg-black/40 px-5 py-4 border border-white/5 rounded-lg flex flex-col gap-4 shadow-inner">
                        {(() => {
                          const currentGrowth = getCumulativeStarGrowthGain(currentStars);
                          const targetGrowth = getCumulativeStarGrowthGain(targetStars);

                          let row3Label = "Star Level";
                          let row3Cur = `Lv ${currentStars}`;
                          let row3Proj = `Lv ${targetStars}`;

                          if (targetStars === 1) {
                            row3Label = "Special Skill 1";
                            row3Cur = "Locked";
                            row3Proj = "Unlocked";
                          } else if (targetStars === 5) {
                            row3Label = "Special Skill 2";
                            row3Cur = "Locked";
                            row3Proj = "Unlocked";
                          }

                          return (
                            <>
                              <div className="flex justify-between items-center relative">
                                <span className="text-zinc-400 text-[11px] font-black tracking-widest uppercase">All Attributes</span>
                                <div className="flex items-center gap-3 font-mono text-[14px] font-bold">
                                  <span className="text-white">{currentGrowth.attributeGain}</span>
                                  <ArrowRight className="w-3 h-3 text-zinc-600" />
                                  <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{targetGrowth.attributeGain}</span>
                                </div>
                              </div>
                              <div className="w-full h-[1px] bg-white/5" />

                              <div className="flex justify-between items-center relative">
                                <span className="text-zinc-400 text-[11px] font-black tracking-widest uppercase">Stamina</span>
                                <div className="flex items-center gap-3 font-mono text-[14px] font-bold">
                                  <span className="text-white">{currentGrowth.staminaGain}</span>
                                  <ArrowRight className="w-3 h-3 text-zinc-600" />
                                  <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{targetGrowth.staminaGain}</span>
                                </div>
                              </div>
                              <div className="w-full h-[1px] bg-white/5" />

                              <div className="flex justify-between items-center relative">
                                <span className="text-zinc-400 text-[11px] font-black tracking-widest uppercase">{row3Label}</span>
                                <div className="flex items-center gap-3 font-mono text-[14px] font-bold">
                                  <span className="text-white">{row3Cur}</span>
                                  <ArrowRight className="w-3 h-3 text-zinc-600" />
                                  <span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">{row3Proj}</span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Cost Material Header */}
                      <div className="bg-white/5 border-l-[4px] border-amber-500 px-4 py-2 flex items-center justify-between shadow-inner rounded-r mt-1">
                        <span className="text-white text-[14px] font-black tracking-widest uppercase drop-shadow-sm">Cost Material</span>
                        <span className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold">Failed attempts only consume MATs</span>
                      </div>

                      {/* Material Boxes */}
                      <div className="bg-black/40 border border-white/5 rounded-lg flex justify-center gap-10 p-5 shadow-inner">
                        
                        {/* MAT Box */}
                        <div className="flex flex-col items-center w-[100px]">
                          <div className="w-[85px] h-[85px] bg-zinc-900 border border-white/10 rounded-lg shadow-inner relative flex items-center justify-center overflow-hidden mb-3">
                            <Activity className="w-10 h-10 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] z-10" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 text-center z-20 border-t border-white/5">
                              <span className="text-white text-[10px] font-bold font-mono tracking-wider">{ownedMats}/{matCost}</span>
                            </div>
                          </div>
                          <span className="text-zinc-400 text-[10px] font-black tracking-widest uppercase">Upgrade MAT</span>
                        </div>

                        {/* Duplicate Box */}
                        {requiredDuplicates > 0 && (
                          <div className="flex flex-col items-center w-[100px]">
                            <div className="w-[85px] h-[85px] bg-zinc-900 border border-white/10 rounded-lg shadow-inner relative overflow-hidden flex items-center justify-center mb-3">
                              <img src={player.imageUrl || "/players/placeholder.png"} className={`w-full h-full object-cover object-top opacity-80`} />
                              <div className="absolute top-0 right-0 bg-amber-500 px-1.5 py-0.5 rounded-bl text-[8px] font-black text-black z-20 uppercase tracking-widest shadow-md">
                                Req
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/80 py-1 text-center z-20 border-t border-white/5">
                                <span className="text-white text-[10px] font-bold font-mono tracking-wider">
                                  <span className={hasEnoughDuplicates ? "text-white" : "text-red-500"}>{dupCandidates.length}/{requiredDuplicates}</span>
                                </span>
                              </div>
                            </div>
                            <span className="text-zinc-400 text-[10px] font-black tracking-widest uppercase text-center leading-tight">Duplicate Asset</span>
                          </div>
                        )}

                      </div>

                      {/* Rate & Actions */}
                      <div className="mt-auto flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-red-500/90 text-[18px] font-oswald tracking-tight">Rate:</span>
                          <span className="text-red-500/90 text-[18px] font-oswald font-medium tracking-tight">{ratePercent}%</span>
                        </div>
                        
                        <button 
                          onClick={() => {
                            if (isProcessingStarUp) return;
                            if (sessionStorage.getItem('skipStarUpConfirm') === 'true') {
                              executeStarUp();
                            } else {
                              setShowSystemNotification(true);
                            }
                          }}
                          disabled={!canAscend || isProcessingStarUp}
                          className={`relative w-[200px] h-[44px] flex items-center justify-center group overflow-hidden transition-all duration-150 ${
                            canAscend && !isProcessingStarUp
                              ? 'bg-[#d61e38] hover:bg-[#eb233f] cursor-pointer shadow-[0_0_15px_rgba(214,30,56,0.4)] active:scale-95 active:brightness-90' 
                              : 'bg-[#d61e38] opacity-50 cursor-not-allowed grayscale-[30%]'
                          }`}
                          style={{
                            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)'
                          }}
                        >
                          {/* Halftone Dots on Left */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none"
                            style={{
                              backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                              backgroundSize: '5px 5px',
                              maskImage: 'linear-gradient(to right, rgba(0,0,0,1), rgba(0,0,0,0))',
                              WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1), rgba(0,0,0,0))'
                            }}
                          />
                          
                          {/* Shine Effect on Right */}
                          {canAscend && (
                            <div className="absolute right-[-20%] top-0 bottom-0 w-[40px] bg-white/10 -skew-x-[25deg] pointer-events-none" />
                          )}

                          <span className={`relative z-10 text-[18px] font-oswald tracking-wide ${canAscend ? 'text-white' : 'text-white/70'}`}>
                            Star Up
                          </span>
                        </button>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Learned Skill Sacrifice Warning Modal */}
                {pendingAscendSacrificeWarning && pendingAscendSacrificeWarning.baseCardId === player.id && (
                  <div className="fixed inset-0 z-[25000] bg-black/90 flex items-center justify-center animate-[fadeIn_0.15s_ease-out]">
                    <div className="w-[450px] bg-zinc-950 border border-red-500/50 rounded-xl flex flex-col overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.3)]">
                      <div className="h-12 bg-red-600 flex items-center px-4 gap-2">
                        <AlertTriangle className="text-white w-5 h-5" />
                        <span className="text-white font-black uppercase tracking-widest text-sm">Critical Warning</span>
                      </div>
                      <div className="p-6 flex flex-col gap-4">
                        <p className="text-zinc-300 text-sm leading-relaxed">
                          This upgrade will sacrifice duplicate card(s) that have <span className="text-emerald-400 font-bold">Learned X Skills</span>. If the upgrade succeeds, those skills will be lost forever.
                        </p>
                        
                        <div className="bg-black/50 border border-white/5 rounded-lg p-3 max-h-[150px] overflow-y-auto">
                          {pendingAscendSacrificeWarning.learnedSkills.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-3 mb-2 last:mb-0 border-b border-white/5 pb-2 last:border-0 last:pb-0">
                              <div className="flex-1">
                                <div className="text-white text-xs font-bold">{s.playerName} <span className="text-zinc-500 font-mono text-[9px] font-normal">(Slot {s.slotNumber})</span></div>
                                <div className="text-emerald-400 text-sm font-black italic tracking-wide">{s.skillName}</div>
                              </div>
                              <div className="text-xs font-bold uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                                {s.rarity}
                              </div>
                            </div>
                          ))}
                        </div>

                        <p className="text-zinc-500 text-xs mt-2">
                          Note: If the upgrade fails, your duplicate(s) are not consumed. Materials will still be consumed upon confirmation.
                        </p>
                      </div>
                      
                      <div className="flex border-t border-white/10">
                        <button 
                          onClick={() => cancelAscendSacrifice()}
                          className="flex-1 py-4 text-zinc-400 font-bold uppercase tracking-widest text-sm hover:bg-white/5 transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => {
                            cancelAscendSacrifice();
                            executeStarUp(true);
                          }}
                          className="flex-1 py-4 bg-red-600/10 text-red-500 font-black uppercase tracking-widest text-sm hover:bg-red-600 hover:text-white transition-colors"
                        >
                          Confirm Sacrifice
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Training Modal Overlay */}
                {pendingSkillTraining && pendingSkillTraining.playerId === player.id && (
                  <div className="fixed inset-0 z-[25000] bg-black/90 flex items-center justify-center animate-[fadeIn_0.15s_ease-out]">
                    <div className="w-[850px] bg-[#e4e7ea] rounded-sm flex flex-col overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
                      
                      {/* Header */}
                      <div className="h-12 bg-gradient-to-r from-red-600 to-[#b91c1c] flex items-center px-6 relative z-10">
                        <span className="text-white font-black text-xl tracking-tight">Signature Skill Training</span>
                        <button 
                          onClick={() => rejectSkillTraining()} 
                          className="absolute right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/20 text-white/80 hover:text-white transition-colors cursor-pointer"
                        >
                          <X size={24} strokeWidth={3} />
                        </button>
                      </div>

                      <div className="flex flex-col relative z-10">
                        {/* Top: New Skill */}
                        <div className="h-[220px] bg-[#f8f9fa] flex items-center justify-center gap-6 px-10">
                          <div className="w-32 h-32 flex-shrink-0 bg-white shadow-md border border-gray-200 flex items-center justify-center transform scale-[1.5] origin-center">
                            <SkillBadge name={pendingSkillTraining.newSkill} color="special" quality={pendingSkillTraining.newQuality as any} />
                          </div>
                          <div className="flex flex-col flex-1 pl-4">
                            <h2 className="text-red-600 font-bold text-3xl mb-2 tracking-tight">New Skill Learned!</h2>
                            <p className="text-gray-600 text-lg leading-relaxed">
                              <span className="font-bold text-gray-800">Max Level Effect:</span> When in a game, there's a 100 rate to trigger... (Up to 100 rate at max level).
                            </p>
                          </div>
                        </div>

                        {/* Middle: Current Skills Header */}
                        <div className="h-10 bg-gray-500/90 text-white font-bold text-lg flex items-center px-6 shadow-[inset_0_4px_6px_rgba(0,0,0,0.2)]">
                          Current Signature Skill
                        </div>

                        {/* Bottom: The Slots & Action Buttons */}
                        <div className="h-[260px] bg-[#e0e3e7] flex items-center px-8 relative">
                          <div className="flex gap-10 w-full">
                            
                            {/* Slot 1 */}
                            <div className="flex flex-col flex-1 gap-4">
                              <div className="flex items-start gap-4">
                                <div className="w-24 h-24 bg-white shadow-md border border-gray-200 flex items-center justify-center transform scale-[1.15] origin-center flex-shrink-0">
                                  {specialSkills[0] ? (
                                    <SkillBadge name={specialSkills[0]} color="special" quality={(player.skillRarities?.[specialSkills[0]] as any) || "Common"} />
                                  ) : (
                                    <div className="text-gray-400 text-sm font-bold">Empty</div>
                                  )}
                                </div>
                                <div className="flex flex-col flex-1">
                                  {specialSkills[0] ? (
                                    <>
                                      <div className="text-gray-800 font-bold text-base mb-1">{specialSkills[0]}</div>
                                      <div className="text-gray-500 text-xs leading-tight">Max Level Effect: ...</div>
                                    </>
                                  ) : (
                                    <div className="text-gray-500 text-sm italic mt-2">Available Slot</div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => acceptSkillTraining(0)}
                                className="w-[180px] h-12 bg-red-600 hover:bg-red-500 text-white font-bold text-lg rounded shadow-sm transition-colors mx-auto mt-2 cursor-pointer"
                              >
                                Replace Skill1
                              </button>
                            </div>

                            {/* Slot 2 */}
                            <div className="flex flex-col flex-1 gap-4">
                              <div className="flex items-start gap-4">
                                <div className="w-24 h-24 bg-[#cfd3d8] flex flex-col items-center justify-center transform scale-[1.15] origin-center flex-shrink-0">
                                  {(player.starLevel ?? 0) < 5 ? (
                                    <>
                                      <div className="w-6 h-6 mb-1 rounded bg-gray-400/50 flex items-center justify-center"><div className="w-3 h-4 border-2 border-white rounded-t-full relative after:absolute after:w-1 after:h-1.5 after:bg-white after:-bottom-2 after:left-0.5" /></div>
                                      <span className="text-gray-500 font-bold text-xs">Player5...</span>
                                    </>
                                  ) : specialSkills[1] ? (
                                    <SkillBadge name={specialSkills[1]} color="special" quality={(player.skillRarities?.[specialSkills[1]] as any) || "Common"} />
                                  ) : (
                                    <div className="text-gray-500 text-sm font-bold">Empty</div>
                                  )}
                                </div>
                                <div className="flex flex-col flex-1">
                                  {(player.starLevel ?? 0) < 5 ? (
                                    <div className="text-gray-400 text-sm italic mt-2">Unlocks at Star 5</div>
                                  ) : specialSkills[1] ? (
                                    <>
                                      <div className="text-gray-800 font-bold text-base mb-1">{specialSkills[1]}</div>
                                      <div className="text-gray-500 text-xs leading-tight">Max Level Effect: ...</div>
                                    </>
                                  ) : (
                                    <div className="text-gray-500 text-sm italic mt-2">Available Slot</div>
                                  )}
                                </div>
                              </div>
                              {(player.starLevel ?? 0) >= 5 && (
                                <button
                                  onClick={() => acceptSkillTraining(1)}
                                  className="w-[180px] h-12 bg-red-600 hover:bg-red-500 text-white font-bold text-lg rounded shadow-sm transition-colors mx-auto mt-2 cursor-pointer"
                                >
                                  Replace Skill2
                                </button>
                              )}
                            </div>

                          </div>
                          
                          {/* Forfeit Button inside the bottom area */}
                          <button
                            onClick={() => rejectSkillTraining()}
                            className="absolute bottom-6 right-6 w-[180px] h-12 bg-[#2a2f38] hover:bg-[#1a1f28] text-white font-bold text-lg rounded shadow-md transition-colors cursor-pointer"
                            style={{ clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)' }}
                          >
                            Forfeit
                          </button>

                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* System Notification Confirm Modal */}
                {showSystemNotification && (
                  <div className="fixed inset-0 z-[20000] bg-black/80 flex items-center justify-center animate-[fadeIn_0.15s_ease-out]">
                    <style>{`
                      @keyframes modalPopIn {
                        0% { transform: scale(0.95); opacity: 0; }
                        100% { transform: scale(1); opacity: 1; }
                      }
                    `}</style>
                    <div 
                      className="w-[500px] bg-[#313338] rounded-sm overflow-hidden flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/10 relative"
                      style={{ 
                        backgroundImage: `url('${lowPolyBg}')`, 
                        backgroundSize: '100% 400px',
                        animation: 'modalPopIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.2) forwards'
                      }}
                    >
                      
                      {/* Header */}
                      <div className="px-4 py-2.5 bg-[#4b555d] flex items-center justify-between relative z-10" style={{ clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)' }}>
                        <span className="text-[14px] font-bold text-gray-200 uppercase tracking-wider">System Notification</span>
                        <button 
                          onClick={() => setShowSystemNotification(false)}
                          className="text-gray-400 hover:text-white transition-colors mr-1"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Body */}
                      <div className="p-8 flex flex-col items-center gap-6 relative z-10">
                        <p className="text-gray-300 font-medium text-[15px] text-center max-w-[80%] leading-relaxed">
                          Player Star up in progress. Current Star up success rate is <span className="text-[#d61e38] font-bold">{ratePercent}%</span>, Confirm?
                        </p>

                        <label className="flex items-center gap-2 cursor-pointer mt-2 group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded-sm border-gray-500 text-[#d61e38] focus:ring-[#d61e38] focus:ring-offset-0 bg-[#242426] cursor-pointer"
                            onChange={(e) => {
                              if (e.target.checked) {
                                sessionStorage.setItem('skipStarUpConfirm', 'true');
                              } else {
                                sessionStorage.removeItem('skipStarUpConfirm');
                              }
                            }}
                          />
                          <span className="text-gray-400 font-medium text-[13px] group-hover:text-gray-200 transition-colors">
                            Don't Show it Again for This Login
                          </span>
                        </label>

                        <button 
                          onClick={() => {
                            if (isProcessingStarUp) return;
                            setShowSystemNotification(false);
                            executeStarUp();
                          }}
                          disabled={isProcessingStarUp}
                          className={`relative w-[180px] h-[44px] flex items-center justify-center group overflow-hidden mt-2 shadow-md transition-all duration-150 ${isProcessingStarUp ? 'bg-[#d61e38] opacity-50 cursor-not-allowed grayscale-[30%]' : 'bg-[#d61e38] hover:bg-[#eb233f] cursor-pointer active:scale-95 active:brightness-90'}`}
                          style={{
                            clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)'
                          }}
                        >
                          {/* Halftone Dots on Left */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none"
                            style={{
                              backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
                              backgroundSize: '5px 5px',
                              maskImage: 'linear-gradient(to right, rgba(0,0,0,1), rgba(0,0,0,0))',
                              WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1), rgba(0,0,0,0))'
                            }}
                          />
                          <span className="relative z-10 text-white text-[16px] font-oswald tracking-wide">
                            Confirm Rank-Up
                          </span>
                        </button>

                      </div>
                    </div>
                  </div>
                )}

                {/* Result Banner Overlay */}
                {ascendOutcome && (
                  <div className="fixed inset-0 z-[30000] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={() => setAscendOutcome(null)}>
                    <style>{`
                      @keyframes bannerReveal {
                        0% { transform: scaleY(0); opacity: 0; }
                        100% { transform: scaleY(1); opacity: 1; }
                      }
                      @keyframes slideContent {
                        0% { transform: translateX(50px); opacity: 0; }
                        100% { transform: translateX(0); opacity: 1; }
                      }
                      @keyframes popCard {
                        0% { transform: translateY(-30%) scale(0.5); opacity: 0; }
                        70% { transform: translateY(-50%) scale(1.25); opacity: 1; }
                        100% { transform: translateY(-50%) scale(1.15); opacity: 1; }
                      }
                    `}</style>

                    {/* Background Container for clipping */}
                    <div className="relative w-full h-[260px] border-y-[4px] border-[#d61e38] shadow-[0_0_50px_rgba(214,30,56,0.2)]" style={{ animation: 'bannerReveal 0.3s cubic-bezier(0.175, 0.885, 0.32, 1) forwards' }} onClick={e => e.stopPropagation()}>
                       {/* Background Layer with Overflow Hidden */}
                       <div 
                         className="absolute inset-0 overflow-hidden bg-[#313338]"
                         style={{ backgroundImage: `url('${lowPolyBg}')`, backgroundSize: '100% 400px' }}
                       >
                         {/* Big Red Skewed poly on Left */}
                         <div className="absolute left-0 top-0 bottom-0 w-[450px] bg-[#d61e38]" style={{ clipPath: 'polygon(0 0, 100% 0, 75% 100%, 0% 100%)' }}>
                            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(white 3px, transparent 3px)', backgroundSize: '24px 24px', backgroundPosition: '0 0, 12px 12px' }} />
                         </div>
                       </div>

                       {/* Content Layer (NO Overflow Hidden) */}
                       <div className="absolute inset-0 pointer-events-none">
                         {/* Floating Title */}
                         <div className="absolute top-[-40px] left-1/2 -translate-x-1/2 text-white font-oswald text-[36px] font-bold drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] z-20 whitespace-nowrap tracking-wide flex items-center gap-4" style={{ animation: 'slideContent 0.4s ease-out 0.1s forwards', opacity: 0 }}>
                            {ascendOutcome.status === 'success' ? 'Star Up Success' : 'Star Up Failed'}
                         </div>
                         
                         {/* Player Card */}
                         <div className="absolute left-[110px] top-1/2 z-20 flex items-center justify-center origin-center drop-shadow-[20px_0_20px_rgba(0,0,0,0.5)] pointer-events-none" style={{ animation: 'popCard 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.1) 0.1s forwards', opacity: 0, transform: 'translateY(-50%)' }}>
                            <PlayerCard 
                              player={{ ...player, starLevel: ascendOutcome.status === 'success' ? ascendOutcome.newStars : player.starLevel }} 
                              tooltipDirection="none" 
                              scale={1.15}
                            />
                         </div>

                         {/* Content (Right Side) */}
                         <div className="ml-[450px] flex flex-col justify-center items-start h-full z-10 w-[600px] pl-10 pointer-events-auto" style={{ animation: 'slideContent 0.4s ease-out 0.2s forwards', opacity: 0 }}>
                            {ascendOutcome.status === 'failed' && (
                               <p className="text-gray-200 font-oswald text-[24px] tracking-wide font-medium">
                                 Unfortunately, the Star Up did not succeed. Keep trying!
                               </p>
                            )}
                            {ascendOutcome.status === 'success' && (
                               <div className="flex flex-col gap-6 w-full max-w-[500px]">
                                  {/* Star Level Changes */}
                                  <div className="flex items-center gap-6">
                                     {/* Render Old Stars */}
                                     <div className="flex items-center">
                                        {Array(5).fill(0).map((_, i) => {
                                          const info = getStarTierAndLevel(ascendOutcome.oldStars);
                                          const colorClass = 
                                            info.tier === 'Red' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' :
                                            info.tier === 'Orange' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]' :
                                            info.tier === 'Violet' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]' :
                                            info.tier === 'Blue' ? 'bg-[#0066ff] shadow-[0_0_8px_rgba(0,102,255,0.8)]' :
                                            'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]';
                                            
                                          return (
                                            <div key={`old-${i}`} className={`w-[18px] h-[18px] rotate-45 mx-1 transition-all ${i < info.level ? `${colorClass} border border-white/50` : 'bg-[#4b555d] border border-gray-400'}`} />
                                          );
                                        })}
                                     </div>

                                     <div className="flex items-center text-[#d61e38] drop-shadow-[0_0_12px_rgba(214,30,56,0.8)] mx-2">
                                        <ChevronsRight className="w-9 h-9 animate-[pulse_2s_ease-in-out_infinite]" strokeWidth={3} />
                                     </div>

                                     {/* Render New Stars */}
                                     <div className="flex items-center">
                                        {Array(5).fill(0).map((_, i) => {
                                          const info = getStarTierAndLevel(ascendOutcome.newStars);
                                          const colorClass = 
                                            info.tier === 'Red' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' :
                                            info.tier === 'Orange' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]' :
                                            info.tier === 'Violet' ? 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]' :
                                            info.tier === 'Blue' ? 'bg-[#0066ff] shadow-[0_0_8px_rgba(0,102,255,0.8)]' :
                                            'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]';

                                          return (
                                            <div key={`new-${i}`} className={`w-[18px] h-[18px] rotate-45 mx-1 transition-all ${i < info.level ? `${colorClass} border border-white/50` : 'bg-[#4b555d] border border-gray-400'}`} />
                                          );
                                        })}
                                     </div>
                                  </div>

                                  {/* Stats Changes */}
                                  <div className="flex flex-col gap-3 font-oswald text-[24px] text-gray-400 w-[400px]">
                                     {(() => {
                                       const oldGain = getCumulativeStarGrowthGain(ascendOutcome.oldStars);
                                       const newGain = getCumulativeStarGrowthGain(ascendOutcome.newStars);
                                       return (
                                         <>
                                     <div className="flex items-center justify-between">
                                        <span>All Attributes <span className="text-gray-200 ml-2 font-bold">+{oldGain.attributeGain}</span></span>
                                        <div className="flex items-center text-[#d61e38] drop-shadow-[0_0_8px_rgba(214,30,56,0.6)]">
                                           <ChevronsRight className="w-7 h-7" strokeWidth={3} />
                                        </div>
                                        <span className="text-[#10b981] font-bold">+{newGain.attributeGain}</span>
                                     </div>
                                     <div className="flex items-center justify-between">
                                        <span>Stamina <span className="text-gray-200 ml-2 font-bold">+{oldGain.staminaGain}</span></span>
                                        <div className="flex items-center text-[#d61e38] drop-shadow-[0_0_8px_rgba(214,30,56,0.6)]">
                                           <ChevronsRight className="w-7 h-7" strokeWidth={3} />
                                        </div>
                                        <span className="text-[#10b981] font-bold">+{newGain.staminaGain}</span>
                                     </div>
                                         </>
                                       );
                                     })()}
                                  </div>
                               </div>
                            )}
                         </div>

                         {/* Tap to close text */}
                         <div className="absolute bottom-[10px] left-[55%] -translate-x-1/2 text-gray-400 text-[14px] font-medium tracking-wide" style={{ animation: 'slideContent 0.4s ease-out 0.4s forwards', opacity: 0 }}>
                            Tap any blank area to close
                         </div>
                       </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          </div>
        </div>
      </div>
    </div>
    </>
  );
}
