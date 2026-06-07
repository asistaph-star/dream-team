"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGameState } from "@/lib/context/GameStateContext";
import { PlayerCard } from "@/components/player/PlayerCard";
import { PlayerHexProfileModal } from "@/components/player/PlayerHexProfileModal";
import { BenchSelectModal } from "@/components/player/BenchSelectModal";
import { Player, PlayerPosition } from "@/lib/types/player";
import Link from "next/link";
import Image from "next/image";
import { UserCircle, CircleDollarSign, Ticket, Globe2, Plus, Sparkles, Trophy, ShieldAlert, TrendingUp, TrendingDown, RefreshCw, UserPlus, X, ChevronLeft } from 'lucide-react';
import { mockPlayers, getTierColor, getTierRating } from "@/lib/data/mockPlayers";
import { LOBBY_OFFENSIVE_STRATEGIES, LOBBY_DEFENSIVE_STRATEGIES } from "@/features/lobby/data/strategies";
import { LobbyChat } from "@/features/lobby/components/LobbyChat";
import { CoachModal } from "@/features/lobby/components/CoachModal";
import { LobbyProfileHUD } from "@/features/lobby/components/LobbyProfileHUD";
import { FreeAgentMarket, FreeAgentPlayer } from "@/features/lobby/components/FreeAgentMarket";
import { SkewedBadge } from "@/components/shared/SkewedBadge";
import { LineupArchetypePanel } from "@/components/skills/LineupArchetypePanel";

export default function AuthenticLobby() {
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

  const [selectedGlobalPlayer, setSelectedGlobalPlayer] = useState<Player | null>(null);
  const [isAscending, setIsAscending] = useState(false);

  const [scale, setScale] = useState(1);
  const [logDim, setLogDim] = useState({ w: 1420, h: 800 });
  const [time, setTime] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  const [benchSelectSlot, setBenchSelectSlot] = useState<string | null>(null);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [showReservesDrawer, setShowReservesDrawer] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);

  // Track narrow viewport for drawer behavior
  useEffect(() => {
    const checkWidth = () => setIsNarrowViewport(window.innerWidth < 900);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);
  
  // Drag & Drop States
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [potentialDragPlayerId, setPotentialDragPlayerId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragHoverSlot, setDragHoverSlot] = useState<PlayerPosition | null>(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

  const defaultCoords = {
    SF: { top: 320, left: 279 },
    C: { top: 242, left: 451 },
    PF: { top: 243, left: 661 },
    SG: { top: 424, left: 515 },
    PG: { top: 370, left: 816 }
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
          // Pass the drop action directly to the game engine. 
          // GameStateContext safely handles overwriting, identical-slot drops, and swapping.
          setLineupSlot(targetSlot, draggingPlayerId);
        }
      }
      setDraggingPlayerId(null);
      setDragHoverSlot(null);
      setPotentialDragPlayerId(null);
      setDragStartPos(null);
      
      // Clear drag flag after a tiny delay so onClick can read it
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
  }, [draggingPlayerId, dragHoverSlot, setLineupSlot, potentialDragPlayerId, dragStartPos, scale, roster]);

  // NBA 2K Free Agents Market States
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [freeAgents, setFreeAgents] = useState<FreeAgentPlayer[]>([]);
  const [faTimeLeft, setFaTimeLeft] = useState(900); // 15 mins
  const [faPityCounter, setFaPityCounter] = useState(0);

  // NBA 2K Chat Redesign States
  const [autoPk, setAutoPk] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ channel: string, title: string, titleColor: string, user: string, text: string }[]>([]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { channel: "all", title: "DreamTeam", titleColor: "text-cyan-400", user: "YOU", text: chatInput }
    ]);
    setChatInput("");
  };

  // NBA 2K Free Agents Market Logic Functions
  const refreshFreeAgents = (isManual: boolean = false) => {
    const pool = mockPlayers;
    const selected: any[] = [];
    const seenNames = new Set<string>();
    
    // Pity System Check
    const triggerPity = faPityCounter >= 49; // On the 50th refresh (0-indexed effectively)
    let mythicSpawned = false;
    
    // Brutal Real-World Gacha Drop Rates (Carried by Pity System):
    // 0.2% Mythic | 1.5% Legendary | 5.3% Epic | 15.0% Rare | 78.0% Common
    while (selected.length < 5) {
      const roll = Math.random();
      let targetRarity = "Common";
      
      // Force a Mythic spawn on the first slot if Pity is triggered
      if (triggerPity && !mythicSpawned && selected.length === 0) {
        targetRarity = "Mythic";
      } else {
        if (roll < 0.002) targetRarity = "Mythic";
        else if (roll < 0.017) targetRarity = "Legendary";
        else if (roll < 0.070) targetRarity = "Epic";
        else if (roll < 0.220) targetRarity = "Rare";
      }

      let validPlayers = pool.filter(p => p.rarity === targetRarity && !seenNames.has(p.name));
      
      // Fallback if the specific rarity pool is exhausted (e.g. 0 Common players available)
      // Cascade upwards from the lowest tier to protect the game's economy from Mythic flooding!
      if (validPlayers.length === 0) {
        const checkOrder = ["Common", "Rare", "Epic", "Legendary", "Mythic"];
        for (const fallbackRarity of checkOrder) {
          validPlayers = pool.filter(p => p.rarity === fallbackRarity && !seenNames.has(p.name));
          if (validPlayers.length > 0) break;
        }
      }
      
      // Extreme fallback if literally all unique players are exhausted
      if (validPlayers.length === 0) break;
      
      const p = validPlayers[Math.floor(Math.random() * validPlayers.length)];
      seenNames.add(p.name);
      
      if (p.rarity === "Mythic") mythicSpawned = true;
      
      selected.push({
        ...p,
        draftInstanceId: `${p.id}_fa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });
    }
    
    // Reset pity if Mythic pulled, else increment ONLY if manual refresh
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
      // Filter out ONLY this specific draft choice instance, NOT all players with the same name!
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

  useEffect(() => {
    const handleResize = () => {
      // Contain-fit: always pick the smaller ratio so the whole
      // 1420x800 stage fits inside the window (letterbox/pillarbox).
      const s = Math.min(window.innerWidth / 1420, window.innerHeight / 800);
      setLogDim({ w: 1420, h: 800 });
      setScale(s);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Manila' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    
    // Calculate offsets to keep players anchored to the background image center
    const offsetX = (logDim.w - 1420) / 2;
    const offsetY = (logDim.h - 800) / 2;
    
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
        className={`absolute pointer-events-auto transition-transform ${isHovered ? 'scale-110 z-50' : 'z-20 hover:z-50'} ${!draggingPlayerId && player ? 'cursor-grab active:cursor-grabbing' : ''}`}
        style={{ top: `${coords.top + offsetY}px`, left: `${coords.left + offsetX}px`, opacity: draggingPlayerId === player?.id ? 0.5 : 1 }}
      >
        <div className="flex flex-col items-center relative">
          
          {/* Drop Zone Highlight (No Blur) */}
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

  const draggingPlayerGlobal = draggingPlayerId ? roster.find(p => p.id === draggingPlayerId) : null;
  const isDraggingOOPGlobal = draggingPlayerGlobal && dragHoverSlot && draggingPlayerGlobal.position !== dragHoverSlot;

  const starting5 = (["PG", "SG", "SF", "PF", "C"] as PlayerPosition[])
    .map(pos => getPlayerForSlot(pos))
    .filter((p): p is Player => p !== undefined);

  return (
    <main className="relative w-screen h-[100dvh] overflow-hidden bg-black flex items-center justify-center pointer-events-none">
      {draggingPlayerId && (
        <style dangerouslySetInnerHTML={{ __html: `* { cursor: none !important; }` }} />
      )}
      
      {/* Drag & Drop Ghost Image */}
      {draggingPlayerId && (
        <div 
          className="fixed pointer-events-none z-[100]"
          style={{
            left: pointerPos.x - 60,
            top: pointerPos.y - 90,
            transform: 'scale(0.8)',
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

      {/* --- BENCH PLAYER SELECT MODAL --- */}
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
      
      {/* Reserved box: scaled dimensions take layout space */}
      <div style={{ width: `${1420 * scale}px`, height: `${800 * scale}px`, position: 'relative' }}>
      <div
        id="stadium-container"
        className="relative pointer-events-auto shadow-2xl"
        style={{
          width: '1420px',
          height: '800px',
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          backgroundImage: 'url("/bg/stadium-v9.png")',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundColor: 'black'
        }}
      >

        {/* Floating Toast for OOP Warning (Authentic NBA 2K Style) */}
        {isDraggingOOPGlobal && (
          <SkewedBadge 
            className="absolute top-[80px] left-1/2 -translate-x-1/2 z-[200] pointer-events-none flex items-center justify-center animate-[fadeIn_0.2s_ease-out]"
            innerClassName="border-[1.5px] border-red-500 shadow-[0_0_40px_rgba(220,38,38,0.6)] rounded-sm"
          >
            {/* Content (Counter-skewed for sharp text) */}
            <div className="relative px-8 py-3 flex items-center gap-4">
              <div className="animate-pulse">
                <ShieldAlert className="w-6 h-6 text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-red-500  font-bold text-[10px] tracking-[0.3em] uppercase leading-none mb-1">Tactical Alert</span>
                <span className="text-white font-[family-name:var(--font-outfit)] font-black text-lg tracking-widest leading-none drop-shadow-md">
                  OUT OF POSITION PENALTY
                </span>
              </div>
            </div>
          </SkewedBadge>
        )}

        {/* --- Unified Profile HUD (Top Left & Right - SHARP HD FIX) --- */}
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
        />


        {/* Chat drawer toggle on narrow screens */}
        {isNarrowViewport && (
          <button
            onClick={() => setShowChatDrawer(!showChatDrawer)}
            className="absolute bottom-[10px] left-[8px] z-30 bg-[#121215]/90 backdrop-blur-md border border-white/20 rounded-lg px-2.5 py-2 shadow-lg flex items-center gap-1.5 hover:bg-white/10 transition-all"
          >
            <span className="text-white font-[family-name:var(--font-outfit)] font-black text-[10px] tracking-wider uppercase">{showChatDrawer ? 'CLOSE' : 'CHAT'}</span>
          </button>
        )}

        {/* --- Global Chat Box (NBA 2K STYLE - SHARP HD FIX) --- */}
        <div className={`transition-all duration-300 ${isNarrowViewport && !showChatDrawer ? '-translate-x-[400px] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
          <LobbyChat 
            messages={chatMessages} 
            chatInput={chatInput} 
            setChatInput={setChatInput} 
            onSendMessage={handleSendChat} 
          />
        </div>

        {/* --- Lineup Archetypes Panel (NBA 2K STYLE - SHARP HD FIX) --- */}
        <LineupArchetypePanel startingLineup={starting5} />

        {/* --- Online Counter --- */}
        <div className="absolute top-[625px] right-[20px] w-[210px] h-[36px] bg-[#121215]/90 backdrop-blur-md border border-white/20 rounded-[4px] shadow-[0_4px_15px_rgba(0,0,0,0.6)] flex items-center justify-between px-3 z-30 overflow-hidden">
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
             <span className="text-white  font-black text-[15px] tracking-wider drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] mt-0.5">240</span>
          </div>
        </div>

        {/* --- Auto PK Toggle (NBA 2K STYLE) --- */}


        {/* --- Left Side Icons --- */}
        <div className="absolute top-[160px] left-[20px] z-20">
          <img alt="gameData" src="/bg/button/gamedata.webp" className="w-[35px] h-[35px] cursor-pointer hover:scale-110 transition" />
        </div>
        <div className="absolute top-[160px] left-[70px] z-20">
          <img alt="Daily Signin" src="/bg/dailysignin.webp" className="w-[35px] h-[35px] cursor-pointer hover:scale-110 transition" />
          <img alt="Daily Signin" src="/bg/dailysignin.webp" className="w-[35px] h-[35px] cursor-pointer hover:scale-110 active:scale-95 transition" />
        </div>
        <div className="absolute top-[210px] left-[20px] z-20">
          <img alt="Lottery" src="/bg/lottery.webp" className="w-[35px] h-[35px] cursor-pointer hover:scale-110 active:scale-95 transition" />
        </div>

        {/* --- Right Side Characters --- */}
        <div className="absolute top-[60px] right-[380px] w-[150px] h-[300px] z-10 pointer-events-none">
          <img alt="Agent" onClick={() => setShowAgentModal(true)} src="/agent.png" className="w-full h-full object-contain pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 drop-shadow-[0_0_2px_white]" />
        </div>
        <div className="absolute top-[120px] right-[200px] w-[160px] h-[250px] z-10 pointer-events-none">
          <img alt="Coach" onClick={() => setShowCoachModal(true)} src="/coach.png" className="w-full h-full object-contain pointer-events-auto cursor-pointer hover:scale-105 active:scale-95 transition-all duration-200 drop-shadow-[0_0_2px_white]" />
        </div>

        {/* --- AUTO LINEUP BUTTON --- */}
        <div className="absolute top-[575px] right-[20px] w-[210px] h-[38px] z-30">
          <button onClick={autoLineup} className="w-full h-full relative group overflow-hidden rounded-[4px] border border-white/20 bg-[#121215]/90 backdrop-blur-md shadow-[0_4px_15px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all duration-300 active:scale-[0.98] hover:border-white hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {/* Glass sheen */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
            {/* Cyber glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] transition-opacity duration-300 pointer-events-none"></div>
            {/* Mesh texture */}
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[length:4px_4px] opacity-10 pointer-events-none"></div>
            
            <span className="relative z-10 text-white font-[family-name:var(--font-outfit)] font-black text-[13px] tracking-[0.2em] uppercase italic drop-shadow-md mt-0.5">
              Auto Lineup
            </span>
          </button>
        </div>

        {/* --- ACTIVE COURT LINEUP --- */}
        {renderSlot('SF')}
        {renderSlot('C')}
        {renderSlot('PF')}
        {renderSlot('SG')}
        {renderSlot('PG')}

        {/* --- RESERVES DRAWER TOGGLE (visible only on narrow screens) --- */}
        {isNarrowViewport && (
          <button
            onClick={() => setShowReservesDrawer(!showReservesDrawer)}
            className="absolute top-[200px] right-[8px] z-30 bg-[#121215]/90 backdrop-blur-md border border-white/20 rounded-lg px-2.5 py-2 shadow-lg flex items-center gap-1.5 hover:bg-white/10 transition-all"
          >
            <span className="text-white font-[family-name:var(--font-outfit)] font-black text-[10px] tracking-wider uppercase">{showReservesDrawer ? 'CLOSE' : 'BENCH'}</span>
            <span className="text-white font-bold text-[9px] bg-white/10 border border-white/20 px-1.5 py-[2px] rounded">{activeReserves.length}</span>
          </button>
        )}

        {/* --- BENCH PLAYERS (PREMIUM 2K BINDER CARD STORAGE) --- */}
        <div className={`absolute w-[210px] h-[360px] top-[200px] right-[20px] bg-[#121215]/90 backdrop-blur-md border border-white/20 rounded-xl p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.9)] z-20 flex flex-col overflow-visible transition-all duration-300 ${isNarrowViewport && !showReservesDrawer ? 'translate-x-[240px] opacity-0 pointer-events-none' : 'translate-x-0 opacity-100'}`}>
          {/* Low Poly / Glass Facets Texture for the entire panel */}
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-white/[0.02]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}></div>
            <div className="absolute inset-0 bg-black/[0.2]" style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}></div>
            <div className="absolute inset-0 bg-white/[0.03]" style={{ clipPath: "polygon(50% 0, 100% 0, 100% 50%)" }}></div>
            <div className="absolute inset-0 bg-black/[0.15]" style={{ clipPath: "polygon(0 50%, 50% 100%, 0 100%)" }}></div>
            <div className="absolute inset-0 bg-white/[0.01]" style={{ clipPath: "polygon(20% 0, 80% 0, 50% 100%)" }}></div>
          </div>

          {/* Slanted header banner */}
          <div className="relative bg-gradient-to-r from-zinc-800/80 to-zinc-900/60 border-b border-white/20 pb-1.5 mb-2.5 shrink-0 flex items-center justify-between px-1 z-10">
            <span className="text-white font-[family-name:var(--font-outfit)] font-black text-[12px] tracking-wider uppercase italic leading-none mt-1">RESERVES</span>
            <span className="text-white  font-bold text-[9px] leading-none bg-white/10 border border-white/20 px-1.5 py-[3px] rounded shadow-[0_0_8px_rgba(255,255,255,0.1)] flex items-center justify-center mt-0.5">
              {activeReserves.length} CARDS
            </span>
          </div>
          
          {/* Scrollable binder grid */}
          <div className="relative flex-1 pr-1 flex flex-col min-h-0 z-10">
            <div className="grid grid-cols-2 gap-x-2 gap-y-4" style={{ gridAutoRows: 'min-content', alignItems: 'start' }}>
              {['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map((slotKey, index) => {
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
                          {/* UNBENCH HOVER BUTTON */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearLineupSlot(slotKey);
                            }}
                            className="absolute -top-2 -right-2 z-[60] w-6 h-6 bg-red-600 rounded-full text-white flex items-center justify-center border-2 border-zinc-900 opacity-0 group-hover/bench:opacity-100 transition-opacity shadow-[0_0_10px_rgba(220,38,38,0.8)] hover:bg-red-500 hover:scale-110 active:scale-95"
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
                              // If holding a player, drop them here
                              setLineupSlot(slotKey as any, draggingPlayerId);
                            } else {
                              // Open modal to select player
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
        </div>

        {/* --- COACH STRATEGY PROGRESSION MODAL (NBA 2K STYLE) --- */}
        <CoachModal
          show={showCoachModal}
          onClose={() => setShowCoachModal(false)}
          strategyLevels={strategyLevels}
          onUpgradeStrategy={handleUpgrade}
          upgradeSuccess={upgradeSuccess}
          offensiveStrategies={offStrategies}
          defensiveStrategies={defStrategies}
        />

        {/* --- FREE AGENT AGENCY MARKET MODAL (PREMIUM NBA 2K GLASSMORPHIC STYLE) --- */}
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
      </div>
    </main>
  );
}
