"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGameState } from "@/lib/context/GameStateContext";
import { PlayerCard } from "@/components/player/PlayerCard";
import { PlayerHexProfileModal } from "@/components/player/PlayerHexProfileModal";
import { BenchSelectModal } from "@/components/player/BenchSelectModal";
import { Player, PlayerPosition } from "@/lib/types/player";
import Image from "next/image";
import { Sparkles, ShieldAlert, Database, CalendarDays, X, Plus } from 'lucide-react';
import { mockPlayers } from "@/lib/data/mockPlayers";
import { LOBBY_OFFENSIVE_STRATEGIES, LOBBY_DEFENSIVE_STRATEGIES } from "@/features/lobby/data/strategies";
import { LobbyChat } from "@/features/lobby/components/LobbyChat";
import { CoachModal } from "@/features/lobby/components/CoachModal";
import { LobbyProfileHUD } from "@/features/lobby/components/LobbyProfileHUD";
import { FreeAgentMarket, FreeAgentPlayer } from "@/features/lobby/components/FreeAgentMarket";
import { SkewedBadge } from "@/components/shared/SkewedBadge";
import { LineupArchetypePanel } from "@/components/skills/LineupArchetypePanel";
import { BottomNav } from "@/components/layout/BottomNav";
import { useGameViewportScale } from "@/lib/hooks/useGameViewportScale";

export function StadiumStage() {
  const {
    tk,
    cash,
    accountLevel,
    accountExp,
    activeLineup,
    activeReserves,
    roster,
    autoLineup,
    addCash,
    addTk,
    currentSalary,
    salaryCap,
    strategyLevels,
    upgradeStrategy,
    signPlayerToRoster,
    ascendPlayer,
    setLineupSlot,
    clearLineupSlot,
    lineupOverride
  } = useGameState();

  const {
    uiScale
  } = useGameViewportScale();

  const [isReservesOpen, setIsReservesOpen] = useState(false);
  const [selectedGlobalPlayer, setSelectedGlobalPlayer] = useState<Player | null>(null);
  const [isAscending, setIsAscending] = useState(false);

  const [time, setTime] = useState("");
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Manila' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [chatInput, setChatInput] = useState("");
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  const [benchSelectSlot, setBenchSelectSlot] = useState<string | null>(null);
  
  // Drag & Drop States
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [potentialDragPlayerId, setPotentialDragPlayerId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragHoverSlot, setDragHoverSlot] = useState<PlayerPosition | null>(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  // Hardcoded coordinates manually adjusted for 1536x864 layout space
  const defaultCoords = {
    SF: { top: 346, left: 302 },
    C: { top: 261, left: 488 },
    PF: { top: 262, left: 715 },
    SG: { top: 458, left: 557 },
    PG: { top: 400, left: 883 }
  };
  const [customCoords, setCustomCoords] = useState(defaultCoords);

  useEffect(() => {
    const saved = localStorage.getItem("courtLayout");
    if (saved) {
      try {
        setCustomCoords(JSON.parse(saved));
      } catch(e) {}
    }
  }, []);

  useEffect(() => {
    if (!draggingPlayerId && !potentialDragPlayerId) return;

    const handlePointerMove = (e: PointerEvent) => {
      setPointerPos({ x: e.clientX, y: e.clientY });
      
      // Drag threshold check
      if (potentialDragPlayerId && !draggingPlayerId && dragStartPos) {
        const dist = Math.hypot(e.clientX - dragStartPos.x, e.clientY - dragStartPos.y);
        if (dist > 10) {
          hasDraggedRef.current = true;
          setDraggingPlayerId(potentialDragPlayerId);
          setPotentialDragPlayerId(null);
        }
      }

      if (draggingPlayerId) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = el?.closest('[data-slot]');
        if (slotEl) {
          const slot = slotEl.getAttribute('data-slot') as PlayerPosition;
          if (dragHoverSlot !== slot) setDragHoverSlot(slot);
        } else {
          if (dragHoverSlot !== null) setDragHoverSlot(null);
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (draggingPlayerId) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = el?.closest('[data-slot]');
        const originalPlayer = roster.find(p => p.id === draggingPlayerId);
        
        const targetSlot = slotEl ? slotEl.getAttribute('data-slot') as PlayerPosition : null;
        
        if (originalPlayer && targetSlot) {
          setLineupSlot(targetSlot, draggingPlayerId);
        }
      }
      setDraggingPlayerId(null);
      setDragHoverSlot(null);
      setPotentialDragPlayerId(null);
      setDragStartPos(null);
      
      setTimeout(() => {
        hasDraggedRef.current = false;
      }, 0);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingPlayerId, dragHoverSlot, setLineupSlot, potentialDragPlayerId, dragStartPos, roster]);

  // Free Agents states
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [freeAgents, setFreeAgents] = useState<FreeAgentPlayer[]>([]);
  const [faTimeLeft, setFaTimeLeft] = useState(900);
  const [faPityCounter, setFaPityCounter] = useState(0);

  const [chatMessages, setChatMessages] = useState<{ channel: string, title: string, titleColor: string, user: string, text: string }[]>([]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { channel: "all", title: "DreamTeam", titleColor: "text-cyan-400", user: "YOU", text: chatInput }
    ]);
    setChatInput("");
  };

  const refreshFreeAgents = (isManual: boolean = false) => {
    const pool = mockPlayers;
    const selected: any[] = [];
    const seenNames = new Set<string>();
    
    const triggerPity = faPityCounter >= 49;
    let mythicSpawned = false;
    
    while (selected.length < 5) {
      const roll = Math.random();
      let targetRarity = "Common";
      
      if (triggerPity && !mythicSpawned && selected.length === 0) {
        targetRarity = "Mythic";
      } else {
        if (roll < 0.002) targetRarity = "Mythic";
        else if (roll < 0.017) targetRarity = "Legendary";
        else if (roll < 0.070) targetRarity = "Epic";
        else if (roll < 0.220) targetRarity = "Rare";
      }

      let validPlayers = pool.filter(p => p.rarity === targetRarity && !seenNames.has(p.name));
      
      if (validPlayers.length === 0) {
        const checkOrder = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
        for (const fallbackRarity of checkOrder) {
          validPlayers = pool.filter(p => p.rarity === fallbackRarity && !seenNames.has(p.name));
          if (validPlayers.length > 0) break;
        }
      }
      
      if (validPlayers.length === 0) break;
      
      const p = validPlayers[Math.floor(Math.random() * validPlayers.length)];
      seenNames.add(p.name);
      
      if (p.rarity === "Mythic") mythicSpawned = true;
      
      selected.push({
        ...p,
        draftInstanceId: `${p.id}_fa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    }
    
    if (mythicSpawned) {
      setFaPityCounter(0);
    } else if (isManual) {
      setFaPityCounter(prev => prev + 1);
    }
    
    setFreeAgents(selected);
    if (!isManual) {
      setFaTimeLeft(900);
    }
  };

  useEffect(() => {
    if (freeAgents.length === 0) {
      refreshFreeAgents(false);
    }
  }, [roster]);

  useEffect(() => {
    const timer = setInterval(() => {
      setFaTimeLeft(prev => {
        if (prev <= 1) {
          refreshFreeAgents(false);
          return 900;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [roster, faPityCounter]);

  const handleRefreshFA = () => {
    if (tk < 200) {
      return { success: false, error: "Not enough VC to refresh (Costs 200 VC)!" };
    }
    addTk(-200);
    refreshFreeAgents(true);
    return { success: true, message: "Market refreshed! -200 VC" };
  };

  const handleSignPlayer = (player: FreeAgentPlayer) => {
    const res = signPlayerToRoster(player);
    if (res.success) {
      setFreeAgents(prev => prev.filter(p => p.draftInstanceId !== player.draftInstanceId));
    }
    return res;
  };

  const offStrategies = LOBBY_OFFENSIVE_STRATEGIES;
  const defStrategies = LOBBY_DEFENSIVE_STRATEGIES;

  const handleUpgrade = (stratName: string) => {
    const res = upgradeStrategy(stratName);
    if (res.success) {
      setUpgradeSuccess(`${stratName} successfully upgraded to Level ${res.newLevel}!`);
      setTimeout(() => setUpgradeSuccess(null), 3000);
    }
  };

  const getPlayerForSlot = (pos: PlayerPosition) => {
    const overrideId = lineupOverride[pos];
    if (overrideId) {
      return roster.find(player => player.id === overrideId);
    }
    return undefined;
  };

  const renderSlot = (pos: PlayerPosition) => {
    const player = getPlayerForSlot(pos);
    const coords = customCoords[pos as keyof typeof customCoords];
    
    const finalLeft = coords.left;
    const finalTop = coords.top;
    
    const isHovered = dragHoverSlot === pos;
    const draggingPlayer = draggingPlayerId ? roster.find(p => p.id === draggingPlayerId) : null;
    const isWrongPosition = draggingPlayer && draggingPlayer.position !== pos;

    return (
      <div
        data-slot={pos}
        onPointerDown={(e) => {
          if (player) {
            e.preventDefault();
            setPotentialDragPlayerId(player.id);
            setDragStartPos({ x: e.clientX, y: e.clientY });
            setPointerPos({ x: e.clientX, y: e.clientY });
          }
        }}
        onClick={() => {
          if (player && !hasDraggedRef.current) {
            setSelectedGlobalPlayer(player);
          }
        }}
        className={`absolute pointer-events-auto transition-all ${isHovered ? 'z-50' : 'z-20 hover:z-50'} ${!draggingPlayerId && player ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ 
          top: `${finalTop}px`, 
          left: `${finalLeft}px`, 
          opacity: draggingPlayerId === player?.id ? 0.5 : 1,
          transform: `scale(${isHovered ? 1.1 : 1})`,
          transformOrigin: "center center"
        }}
      >
        <div className="flex flex-col items-center relative">
          {isHovered && draggingPlayer && (
            <div className={`absolute -inset-4 z-40 rounded-xl border-2 flex items-center justify-center transition-all pointer-events-none ${isWrongPosition ? 'border-red-500/80 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-emerald-500/80 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)]'}`}>
               <span className={`font-black text-xl italic tracking-wider ${isWrongPosition ? 'text-red-500/80' : 'text-emerald-400/80'}`}>
                 {isWrongPosition ? 'OOP' : 'SWAP'}
               </span>
            </div>
          )}

          <div className="w-[120px] relative pointer-events-auto">
            {player ? (
              <PlayerCard player={player} tooltipDirection={draggingPlayerId ? "none" : "right"} showPositionBox={true} positionBoxLabel={pos} />
            ) : (
              <div className="w-[120px] h-[124px] rounded-xl border border-white/5 bg-gradient-to-br from-zinc-900/90 to-black/90 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-sm group-hover:border-white/10 transition-colors">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:16px_16px] pointer-events-none"></div>
                  <div className="flex flex-col items-center justify-center opacity-40">
                    <Plus size={20} className="text-zinc-400 mb-1 drop-shadow-md" strokeWidth={3} />
                    <span className="text-zinc-400 font-[family-name:var(--font-outfit)] font-black tracking-[0.2em] uppercase text-[9px] italic">EMPTY</span>
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReservesPanelContent = () => {
    return (
      <>
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-white/[0.02]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}></div>
          <div className="absolute inset-0 bg-black/[0.2]" style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}></div>
          <div className="absolute inset-0 bg-white/[0.03]" style={{ clipPath: "polygon(50% 0, 100% 0, 100% 50%)" }}></div>
          <div className="absolute inset-0 bg-black/[0.15]" style={{ clipPath: "polygon(0 50%, 50% 100%, 0 100%)" }}></div>
          <div className="absolute inset-0 bg-white/[0.01]" style={{ clipPath: "polygon(20% 0, 80% 0, 50% 100%)" }}></div>
        </div>

        <div className="relative bg-gradient-to-r from-zinc-800/80 to-zinc-900/60 border-b border-white/20 pb-1.5 mb-2.5 shrink-0 flex items-center justify-between px-1 z-10">
          <span className="text-white font-[family-name:var(--font-outfit)] font-black text-[12px] tracking-wider uppercase italic leading-none mt-1">RESERVES</span>
          <span className="text-white font-bold text-[9px] leading-none bg-white/10 border border-white/20 px-1.5 py-[3px] rounded shadow-[0_0_8px_rgba(255,255,255,0.1)] flex items-center justify-center mt-0.5">
            {activeReserves.length} CARDS
          </span>
        </div>
        
        <div className="relative flex-1 pr-1 flex flex-col min-h-0 z-10 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-2 gap-x-2 gap-y-4" style={{ gridAutoRows: 'min-content', alignItems: 'start' }}>
            {['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map((slotKey) => {
              const benchPlayer = activeReserves.find(p => lineupOverride[slotKey] === p.id);
              const isHovered = dragHoverSlot === slotKey;

              return (
                <div 
                  key={slotKey}
                  data-slot={slotKey}
                  className={`flex flex-col items-center relative z-20 hover:z-[60] transition-all ${isHovered ? 'scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''}`}
                >
                  <div className={`relative group/bench w-[85px] h-[88px] rounded-lg border flex items-center justify-center transition-all ${isHovered ? 'border-white bg-white/10 shadow-[inset_0_0_15px_rgba(255,255,255,0.2)]' : 'border-white/5 bg-black/20 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]'}`}>
                    {!benchPlayer && (
                      <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
                        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:12px_12px] opacity-50" />
                      </div>
                    )}
                    {benchPlayer ? (
                      <>
                        <div 
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setPotentialDragPlayerId(benchPlayer.id);
                            setDragStartPos({ x: e.clientX, y: e.clientY });
                            setPointerPos({ x: e.clientX, y: e.clientY });
                          }}
                          className={`absolute top-0 left-0 origin-top-left ${draggingPlayerId === benchPlayer.id ? 'opacity-50' : 'hover:z-50 hover:scale-105 cursor-grab active:cursor-grabbing'}`} 
                          style={{ transform: 'scale(0.708)' }}
                          onClick={() => {
                            if (!hasDraggedRef.current) {
                              setSelectedGlobalPlayer(benchPlayer);
                            }
                          }}
                        >
                          <PlayerCard player={benchPlayer} tooltipDirection={draggingPlayerId ? "none" : "left"} tooltipScale={1.412} />
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearLineupSlot(slotKey);
                          }}
                          className="absolute -top-2 -right-2 z-[60] w-6 h-6 bg-red-600 rounded-full text-white flex items-center justify-center border-2 border-zinc-900 opacity-0 group-hover/bench:opacity-100 transition-opacity shadow-[0_0_10px_rgba(220,38,38,0.8)] hover:bg-red-500 hover:scale-110 active:scale-95 cursor-pointer"
                          title="Unbench Player"
                        >
                          <X size={14} strokeWidth={3} />
                        </button>
                      </>
                    ) : (
                      <div 
                        className="absolute inset-0 flex flex-col items-center justify-center opacity-30 hover:opacity-100 hover:bg-white/5 transition-all cursor-pointer z-30 rounded-lg pointer-events-auto"
                        onClick={() => {
                          if (draggingPlayerId) {
                            setLineupSlot(slotKey as any, draggingPlayerId);
                          } else {
                            setBenchSelectSlot(slotKey);
                          }
                        }}
                      >
                        <Plus size={14} className="text-zinc-400 mb-0.5" strokeWidth={3} />
                        <span className="text-zinc-400 font-[family-name:var(--font-outfit)] font-black uppercase text-[10px] tracking-widest italic">{slotKey}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  const draggingPlayerGlobal = draggingPlayerId ? roster.find(p => p.id === draggingPlayerId) : null;
  const isDraggingOOPGlobal = draggingPlayerGlobal && dragHoverSlot && draggingPlayerGlobal.position !== dragHoverSlot;

  const starting5 = (["PG", "SG", "SF", "PF", "C"] as PlayerPosition[])
    .map(pos => getPlayerForSlot(pos))
    .filter((p): p is Player => p !== undefined);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none">
      {draggingPlayerId && (
        <style dangerouslySetInnerHTML={{ __html: `* { cursor: none !important; }` }} />
      )}
      
      {/* Drag & Drop Ghost Image (placed relative to parent canvas size, unscaled) */}
      {draggingPlayerId && (
        <div 
          className="fixed pointer-events-none z-[100]"
          style={{
            left: pointerPos.x - 60,
            top: pointerPos.y - 90,
            transform: `scale(${0.8 * uiScale})`,
            opacity: 0.9,
            filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.5))'
          }}
        >
          <PlayerCard 
            player={roster.find(p => p.id === draggingPlayerId)!} 
            tooltipDirection="none" 
            isDragOverlay={true}
          />
        </div>
      )}

      {selectedGlobalPlayer && (
        <PlayerHexProfileModal 
          player={selectedGlobalPlayer} 
          onClose={() => setSelectedGlobalPlayer(null)} 
          onStarUp={(confirmSacrifice?: boolean) => {
            return new Promise((resolve) => {
              setIsAscending(true);
              setTimeout(() => {
                const res = ascendPlayer(selectedGlobalPlayer.id, confirmSacrifice);
                setIsAscending(false);
                resolve(res);
              }, 1000);
            });
          }} 
          isAscending={isAscending} 
        />
      )}

      {benchSelectSlot && (
        <BenchSelectModal 
          benchSelectSlot={benchSelectSlot}
          roster={roster}
          activeLineup={activeLineup}
          activeReserves={activeReserves}
          lineupOverride={lineupOverride}
          onClose={() => setBenchSelectSlot(null)}
          onAssignPlayer={(playerId) => {
            setLineupSlot(benchSelectSlot as any, playerId);
            setBenchSelectSlot(null);
          }}
          onUnbenchPlayer={() => {
            clearLineupSlot(benchSelectSlot);
            setBenchSelectSlot(null);
          }}
        />
      )}
      
      {/* 1. GAME WORLD BACKGROUND LAYER */}
      <div
        id="stadium-container"
        className="absolute inset-0 pointer-events-auto shadow-2xl overflow-hidden"
        style={{
          width: '100%',
          height: '100%',
          backgroundImage: 'url("/bg/stadium-v9.png")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          backgroundSize: "cover",
          backgroundColor: "black"
        }}
      >
        {/* Clickable Characters */}
        <div className="absolute top-[65px] left-[963px] w-[162px] h-[324px] z-10 pointer-events-none">
          <img alt="Coach" onClick={() => setShowCoachModal(true)} src="/coach.png" className="w-full h-full object-contain pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 drop-shadow-[0_0_2px_white]" />
        </div>

        {/* ACTIVE COURT LINEUP */}
        {renderSlot('SF')}
        {renderSlot('C')}
        {renderSlot('PF')}
        {renderSlot('SG')}
        {renderSlot('PG')}
      </div>

      {/* 2. UI SAFE OVERLAY LAYER */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-30 overflow-hidden">
        
        {/* Floating Toast for OOP Warning */}
        {isDraggingOOPGlobal && (
          <div className="pointer-events-auto absolute top-[120px] left-1/2 -translate-x-1/2 z-[200]">
            <SkewedBadge 
              className="flex items-center justify-center animate-[fadeIn_0.2s_ease-out]"
              innerClassName="border-[1.5px] border-red-500 shadow-[0_0_40px_rgba(220,38,38,0.6)] rounded-sm"
            >
              <div className="relative px-8 py-3 flex items-center gap-4">
                <div className="animate-pulse">
                  <ShieldAlert className="w-6 h-6 text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-red-500 font-bold text-[10px] tracking-[0.3em] uppercase leading-none mb-1">Tactical Alert</span>
                  <span className="text-white font-[family-name:var(--font-outfit)] font-black text-lg tracking-widest leading-none drop-shadow-md">
                    OUT OF POSITION PENALTY
                  </span>
                </div>
              </div>
            </SkewedBadge>
          </div>
        )}

        {/* Unified Profile HUD */}
        <div className="absolute inset-x-0 top-0 pointer-events-none">
          <LobbyProfileHUD
            accountLevel={accountLevel || 0}
            accountExp={accountExp}
            cash={cash}
            tk={tk}
            time={time}
            currentSalary={currentSalary}
            salaryCap={salaryCap}
            onAddCash={addCash}
            onAddTk={addTk}
            uiScale={1}
          />
        </div>

        {/* Left Side Icons + Lineup Archetypes Panel */}
        <div 
          className="absolute left-6 top-[135px] flex flex-col gap-4 pointer-events-auto max-w-[280px]"
        >
          {/* Left Side Icons */}
          <div className="flex items-center gap-3">
            <div 
              title="Game Data"
              className="w-[42px] h-[42px] rounded-xl bg-[#121316]/80 backdrop-blur-md border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:border-white/20 group relative"
            >
              <Database size={20} className="text-[#ff9d00] filter drop-shadow-[0_0_4px_rgba(255,157,0,0.4)]" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#ff9d00]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            
            <div 
              title="Daily Signin"
              className="w-[42px] h-[42px] rounded-xl bg-[#121316]/80 backdrop-blur-md border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:border-white/20 group relative"
            >
              <CalendarDays size={20} className="text-[#00ffcc] filter drop-shadow-[0_0_4px_rgba(0,255,204,0.4)]" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#00ffcc]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div 
              title="Lottery"
              className="w-[42px] h-[42px] rounded-xl bg-[#121316]/80 backdrop-blur-md border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/[0.08] active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.5)] hover:border-white/20 group relative"
            >
              <Sparkles size={20} className="text-[#e040fb] filter drop-shadow-[0_0_4px_rgba(224,64,251,0.4)]" />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#e040fb]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          
          <div className="relative w-[240px]">
            <LineupArchetypePanel startingLineup={starting5} />
          </div>
        </div>

        {/* Global Chat Box */}
        <div 
          className="absolute pointer-events-auto"
          style={{
            left: "24px",
            bottom: "105px",
            width: "350px"
          }}
        >
          <LobbyChat 
            messages={chatMessages} 
            chatInput={chatInput} 
            setChatInput={setChatInput} 
            onSendMessage={handleSendChat} 
          />
        </div>

        {/* Bench binder container statically placed on the right */}
        <div 
          className="absolute w-[210px] h-[360px] top-[200px] right-6 bg-[#121215]/90 backdrop-blur-md border border-white/20 rounded-xl p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.9)] z-20 flex flex-col overflow-visible pointer-events-auto"
        >
          {renderReservesPanelContent()}
        </div>

        {/* Auto Lineup Button */}
        <div 
          className="absolute top-[580px] right-6 w-[210px] h-[38px] z-30 pointer-events-auto"
        >
          <button onClick={autoLineup} className="w-full h-full relative group overflow-hidden rounded-[4px] border border-white/20 bg-[#121215]/90 backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all duration-300 active:scale-[0.98] hover:border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] transition-opacity duration-300 pointer-events-none"></div>
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:4px_4px] opacity-10 pointer-events-none"></div>
            <span className="relative z-10 text-white font-[family-name:var(--font-outfit)] font-black text-[13px] tracking-[0.2em] uppercase italic drop-shadow-md mt-0.5">
              Auto Lineup
            </span>
          </button>
        </div>

        {/* Online Server Counter */}
        <div 
          className="absolute top-[630px] right-6 w-[210px] h-[36px] bg-[#121215]/90 backdrop-blur-md border border-white/20 rounded-[4px] shadow-[0_4px_15px_rgba(0,0,0,0.6)] flex items-center justify-between px-3 z-30 overflow-hidden pointer-events-auto"
        >
          <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:4px_4px] opacity-10 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
          <div className="flex items-center gap-2 relative z-10">
             <div className="relative flex items-center justify-center w-3 h-3">
               <div className="absolute w-full h-full bg-emerald-400 rounded-full animate-ping opacity-75"></div>
               <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
             </div>
             <span className="text-zinc-300 font-[family-name:var(--font-outfit)] font-bold text-[11px] tracking-widest uppercase mt-0.5">Servers</span>
          </div>
          <div className="relative z-10 flex items-center">
             <span className="text-white font-black text-[15px] tracking-wider drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] mt-0.5">240</span>
          </div>
        </div>

        {/* Bottom Navigation Toolbar absolute inside GameStage */}
        <div className="absolute bottom-[20px] left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
          <BottomNav />
        </div>
      </div>

      <CoachModal
        show={showCoachModal}
        onClose={() => setShowCoachModal(false)}
        strategyLevels={strategyLevels}
        onUpgradeStrategy={handleUpgrade}
        upgradeSuccess={upgradeSuccess}
        offensiveStrategies={offStrategies}
        defensiveStrategies={defStrategies}
      />

      <FreeAgentMarket
        show={showAgentModal}
        onClose={() => setShowAgentModal(false)}
        freeAgents={freeAgents}
        faTimeLeft={faTimeLeft}
        faPityCounter={faPityCounter}
        cash={cash}
        tk={tk}
        onRefreshFA={handleRefreshFA}
        onSignPlayer={handleSignPlayer}
      />
    </div>
  );
}
