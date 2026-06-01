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
  const [freeAgents, setFreeAgents] = useState<any[]>([]);
  const [faTimeLeft, setFaTimeLeft] = useState(900); // 15 mins
  const [selectedFaPlayer, setSelectedFaPlayer] = useState<any | null>(null);
  const [faStatusMessage, setFaStatusMessage] = useState<string | null>(null);
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
    setSelectedFaPlayer(selected[0] || null);
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
      setFaStatusMessage("Not enough VC to refresh (Costs 200 VC)!");
      setTimeout(() => setFaStatusMessage(null), 3000);
      return;
    }
    addTk(-200);
    refreshFreeAgents(true);
    setFaStatusMessage("Market refreshed! -200 VC");
    setTimeout(() => setFaStatusMessage(null), 3000);
  };

  const handleSignPlayer = (player: any) => {
    const res = signPlayerToRoster(player);
    if (res.success) {
      setFaStatusMessage(`CONTRACT SIGNED! Welcome ${player.name} to the team!`);
      // Filter out ONLY this specific draft choice instance, NOT all players with the same name!
      setFreeAgents(prev => prev.filter(p => p.draftInstanceId !== player.draftInstanceId));
      setSelectedFaPlayer(null);
      setTimeout(() => setFaStatusMessage(null), 4000);
    } else {
      setFaStatusMessage(res.error || "Signing failed!");
      setTimeout(() => setFaStatusMessage(null), 3000);
    }
  };

  const formatFaTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      let logW = 1420;
      let logH = 800;
      const screenAspect = window.innerWidth / window.innerHeight;
      const baseAspect = 1420 / 800;

      if (screenAspect > baseAspect) {
        logW = 800 * screenAspect;
      } else {
        logH = 1420 / screenAspect;
      }
      
      setLogDim({ w: logW, h: logH });
      setScale(window.innerWidth / logW);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
          onStarUp={() => {
            return new Promise((resolve) => {
              setIsAscending(true);
              setTimeout(() => {
                const res = ascendPlayer(selectedGlobalPlayer.id);
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
      
      <div
        id="stadium-container"
        className="relative pointer-events-auto shadow-2xl"
        style={{
          width: `${logDim.w}px`,
          height: `${logDim.h}px`,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          backgroundImage: 'url("/bg/stadium-v9.png")',
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          backgroundSize: "cover",
          backgroundColor: "black"
        }}
      >

        {/* Floating Toast for OOP Warning (Authentic NBA 2K Style) */}
        {isDraggingOOPGlobal && (
          <div className="absolute top-[80px] left-1/2 -translate-x-1/2 z-[200] pointer-events-none flex items-center justify-center animate-[fadeIn_0.2s_ease-out]">
            {/* Skewed Backdrop */}
            <div className="absolute inset-0 bg-zinc-950/95 border-[1.5px] border-red-500 shadow-[0_0_40px_rgba(220,38,38,0.6)] skew-x-[-12deg] rounded-sm" />
            
            {/* Content (Counter-skewed for sharp text) */}
            <div className="relative px-8 py-3 flex items-center gap-4">
              <div className="animate-pulse">
                <ShieldAlert className="w-6 h-6 text-red-500 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]" />
              </div>
              <div className="flex flex-col">
                <span className="text-red-500 font-mono font-bold text-[10px] tracking-[0.3em] uppercase leading-none mb-1">Tactical Alert</span>
                <span className="text-white font-[family-name:var(--font-outfit)] font-black text-lg tracking-widest leading-none drop-shadow-md">
                  OUT OF POSITION PENALTY
                </span>
              </div>
            </div>
          </div>
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


        {/* --- Global Chat Box (NBA 2K STYLE - SHARP HD FIX) --- */}
        <LobbyChat 
          messages={chatMessages} 
          chatInput={chatInput} 
          setChatInput={setChatInput} 
          onSendMessage={handleSendChat} 
        />

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
             <span className="text-white font-mono font-black text-[15px] tracking-wider drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] mt-0.5">240</span>
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

        {/* --- BENCH PLAYERS (PREMIUM 2K BINDER CARD STORAGE) --- */}
        <div className="absolute w-[210px] h-[360px] top-[200px] right-[20px] bg-[#121215]/90 backdrop-blur-md border border-white/20 rounded-xl p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.9)] z-20 flex flex-col overflow-visible">
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
            <span className="text-white font-mono font-bold text-[9px] leading-none bg-white/10 border border-white/20 px-1.5 py-[3px] rounded shadow-[0_0_8px_rgba(255,255,255,0.1)] flex items-center justify-center mt-0.5">
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
        {showAgentModal && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <style>{`#global-bottom-nav { display: none !important; }`}</style>
            {/* Standard non-skewed container for absolute pixel-perfect HD clarity */}
            <div className="w-[880px] h-[610px] rounded-2xl p-6 flex flex-col relative overflow-hidden animate-page-enter">
              
              {/* Modal Background Pattern (Unified with Player Filter) */}
              <div className="absolute inset-0 pointer-events-none flex overflow-hidden rounded-2xl bg-[#30333b] shadow-2xl border border-white/10 z-0">
                {/* Left half: Halftone Dots */}
                <div 
                  className="flex-1 opacity-[0.4] pointer-events-none mix-blend-screen animate-pulse" 
                  style={{ 
                    backgroundImage: `radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)`,
                    backgroundSize: '14px 14px',
                    backgroundPosition: '0 0, 7px 7px'
                  }} 
                />
                {/* Right half: Glass Diamond Pattern */}
                <div className="flex-1 relative">
                  <div className="absolute top-[-20%] right-[-10%] w-[120%] h-[150%] bg-white/[0.03] rotate-45 border border-white/5 backdrop-blur-[2px]" />
                  <div className="absolute top-[10%] left-[-20%] w-[80%] h-[120%] bg-black/[0.1] -rotate-12 border border-white/5 backdrop-blur-sm" />
                  <div className="absolute bottom-[-10%] right-[10%] w-[100%] h-[80%] bg-white/[0.02] rotate-[30deg] border border-white/5" />
                </div>
              </div>
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_15px_rgba(255,255,255,0.5)] z-0 skew-x-[-6deg] scale-x-[1.04]"></div>
              
              {/* Unskewed, perfectly flat content plane */}
              <div className="flex-1 flex flex-col min-h-0 relative z-10">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-[family-name:var(--font-outfit)] font-black text-white tracking-[0.08em] uppercase flex items-center gap-2 italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        FREE AGENT RECRUITMENT MARKET
                      </h2>
                      <p className="text-[10px] text-zinc-400 font-[family-name:var(--font-outfit)] font-black tracking-[0.2em] uppercase italic">
                        Sign high-impact players to dynamic team contracts using your available funds
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowAgentModal(false)} className="text-zinc-500 hover:text-white text-3xl font-light cursor-pointer transition-colors pt-1">×</button>
                </div>

                {/* Status Message Notification Overlay inside Modal */}
                {faStatusMessage && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-950/95 border border-white/20 px-8 py-2.5 skew-x-[-8deg] shadow-[0_15px_40px_rgba(0,0,0,0.9)] backdrop-blur-md">
                    <span className="block skew-x-[8deg] text-white font-[family-name:var(--font-outfit)] font-black text-[10px] tracking-[0.25em] uppercase italic drop-shadow-md">
                      {faStatusMessage}
                    </span>
                  </div>
                )}

                {/* Main Content Layout */}
                <div className="flex-1 flex gap-6 min-h-0">
                  
                  {/* Left Column: List of 4 Free Agents */}
                  <div className="w-[380px] flex flex-col gap-3 overflow-y-auto pr-1">
                    <div className="text-[10px] font-black text-white tracking-widest uppercase border-b border-white/20 pb-1.5 mb-1">
                      Available Talents
                    </div>
                    
                    {freeAgents.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-6 text-center">
                        <span className="text-zinc-500 text-xs font-semibold">No free agents in this batch.</span>
                        <button onClick={() => refreshFreeAgents()} className="mt-3 px-4 py-1.5 text-[9px] font-black uppercase text-cyan-400 border border-cyan-400/30 rounded hover:bg-cyan-400/10">
                          Reload Pool
                        </button>
                      </div>
                    ) : (
                      freeAgents.map(player => {
                        const tier = getTierRating(player.ovr);
                        const tierColor = getTierColor(tier);
                        const isSelected = selectedFaPlayer?.draftInstanceId === player.draftInstanceId;
                        
                        return (
                          <div 
                            key={player.draftInstanceId || player.id}
                            onClick={() => setSelectedFaPlayer(player)}
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300 relative group overflow-hidden
                              ${isSelected 
                                ? 'bg-zinc-900/80 border-white shadow-[0_0_10px_rgba(255,255,255,0.15)]' 
                                : 'bg-zinc-950/80 border-white/5 hover:border-white/20 hover:bg-zinc-900/40'}`}
                          >
                            {/* Card Background Glow for Selected */}
                            {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent pointer-events-none" />}
                            
                            {/* Player Mini Avatar */}
                            <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-white/10 relative overflow-hidden flex items-center justify-center shrink-0">
                              {player.imageUrl ? (
                                <img src={player.imageUrl} className="w-full h-full object-cover" alt={player.name} />
                              ) : (
                                <span className="text-zinc-500 text-xs font-bold">{player.position}</span>
                              )}
                            </div>

                            {/* Player Info block */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-white font-[family-name:var(--font-outfit)] font-black text-xs truncate">
                                  {player.name}
                                </span>
                                {/* Position badge */}
                                <span className="bg-zinc-900 border border-white/10 text-zinc-400 text-[8px] font-bold px-1 rounded uppercase">
                                  {player.position}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  Fee: <span className="text-emerald-400 font-bold">${((player.price || 500) * 10000).toLocaleString()}</span>
                                </span>
                                
                                {/* Trend Indicator */}
                                {player.priceTrend === 'up' ? (
                                  <TrendingUp className="text-emerald-400 w-3 h-3 shrink-0" />
                                ) : player.priceTrend === 'down' ? (
                                  <TrendingDown className="text-rose-400 w-3 h-3 shrink-0" />
                                ) : (
                                  <span className="text-zinc-500 text-[10px] leading-none select-none shrink-0">—</span>
                                )}
                              </div>
                            </div>

                            {/* OVR circular glowing indicator */}
                            <div className="flex flex-col items-center gap-0.5 shrink-0">
                              <div 
                                className="w-8 h-8 rounded-full flex items-center justify-center font-[family-name:var(--font-outfit)] font-black text-xs text-white border-2 shadow-inner" 
                                style={{ borderColor: tierColor, boxShadow: `0 0 10px ${tierColor}40` }}
                              >
                                {player.ovr}
                              </div>
                              <span className="text-[7px] font-black uppercase tracking-wider" style={{ color: tierColor }}>
                                {tier} TIER
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Right Column: Detailed Player Contract Details */}
                  <div className="flex-1 bg-zinc-950/80 border border-white/5 rounded-2xl p-4 flex flex-col min-h-0 relative">
                    {selectedFaPlayer ? (
                      <div className="flex-1 flex flex-col min-h-0">
                        
                        {/* Profile header with larger photo and details */}
                        <div className="flex gap-4 border-b border-white/[0.04] pb-4 mb-4">
                            <div className="shrink-0 pointer-events-none" style={{ zoom: 0.9 }}>
                              <PlayerCard player={selectedFaPlayer} />
                            </div>

                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-[family-name:var(--font-outfit)] font-black text-white uppercase italic tracking-wide">
                                {selectedFaPlayer.name}
                              </h3>
                              <span className="bg-white/10 border border-white/30 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase skew-x-[-6deg]">
                                <span className="skew-x-[6deg] block">{selectedFaPlayer.rarity}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-4 mt-2">
                              <div>
                                <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Salary Impact</div>
                                <div className="text-xs font-mono font-bold text-white">+{Math.round(selectedFaPlayer.ovr * 12.5)} points</div>
                              </div>
                              <div className="w-px h-6 bg-white/10" />
                              <div>
                                <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Acquisition Cost</div>
                                <div className="text-sm font-mono font-black text-emerald-400">${((selectedFaPlayer.price || 500) * 10000).toLocaleString()}</div>
                              </div>
                            </div>
                          </div>

                          {/* Large OVR circle badge */}
                          <div className="flex flex-col items-center justify-center shrink-0">
                            <div 
                              className="w-16 h-16 rounded-full border-4 flex items-center justify-center font-[family-name:var(--font-outfit)] font-black text-2xl text-white shadow-2xl relative"
                              style={{ 
                                borderColor: getTierColor(getTierRating(selectedFaPlayer.ovr)), 
                                boxShadow: `0 0 20px ${getTierColor(getTierRating(selectedFaPlayer.ovr))}30` 
                              }}
                            >
                              {selectedFaPlayer.ovr}
                            </div>
                            <span 
                              className="text-[9px] font-black uppercase tracking-widest mt-1 italic" 
                              style={{ color: getTierColor(getTierRating(selectedFaPlayer.ovr)) }}
                            >
                              {getTierRating(selectedFaPlayer.ovr)} TIER
                            </span>
                          </div>
                        </div>

                        {/* Player Statistics Ticker */}
                        <div className="grid grid-cols-6 gap-2 bg-zinc-950 border border-white/5 rounded-xl p-2.5 mb-4 text-center shrink-0">
                          <div>
                            <div className="text-[7px] text-zinc-500 font-black uppercase">PPG</div>
                            <div className="text-xs font-bold text-white font-mono">{selectedFaPlayer.ppg || 0.0}</div>
                          </div>
                          <div>
                            <div className="text-[7px] text-zinc-500 font-black uppercase">RPG</div>
                            <div className="text-xs font-bold text-white font-mono">{selectedFaPlayer.rpg || 0.0}</div>
                          </div>
                          <div>
                            <div className="text-[7px] text-zinc-500 font-black uppercase">APG</div>
                            <div className="text-xs font-bold text-white font-mono">{selectedFaPlayer.apg || 0.0}</div>
                          </div>
                          <div>
                            <div className="text-[7px] text-zinc-500 font-black uppercase">SPG</div>
                            <div className="text-xs font-bold text-white font-mono">{selectedFaPlayer.spg || 0.0}</div>
                          </div>
                          <div>
                            <div className="text-[7px] text-zinc-500 font-black uppercase">BPG</div>
                            <div className="text-xs font-bold text-white font-mono">{selectedFaPlayer.bpg || 0.0}</div>
                          </div>
                          <div>
                            <div className="text-[7px] text-zinc-500 font-black uppercase">TO</div>
                            <div className="text-xs font-bold text-white font-mono">{selectedFaPlayer.topg || 0.0}</div>
                          </div>
                        </div>

                        {/* Player Core Attribute Ratings */}
                        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4">
                          <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Player Profile Breakdown</div>
                          
                          {/* Attribute Progress Bars */}
                          {[
                            { label: 'Offensive Rating', val: selectedFaPlayer.offense, max: 250, color: 'from-orange-500 to-red-500' },
                            { label: 'Defensive Rating', val: selectedFaPlayer.defense, max: 250, color: 'from-cyan-500 to-blue-500' },
                            { label: 'Shooting Accuracy', val: selectedFaPlayer.shooting, max: 100, color: 'from-yellow-500 to-amber-500' },
                            { label: 'Athletic Speed', val: selectedFaPlayer.speed, max: 100, color: 'from-fuchsia-500 to-pink-500' },
                            { label: 'Physical Strength', val: selectedFaPlayer.strength, max: 100, color: 'from-emerald-500 to-teal-500' },
                            { label: 'Court Playmaking', val: selectedFaPlayer.playmaking, max: 100, color: 'from-purple-500 to-violet-500' }
                          ].map(attr => (
                            <div key={attr.label}>
                              <div className="flex justify-between items-center text-[10px] mb-1 font-semibold">
                                <span className="text-zinc-400 font-sans">{attr.label}</span>
                                <span className="text-white font-mono font-bold">{attr.val} / {attr.max}</span>
                              </div>
                              <div className="h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-white/5 relative">
                                <div 
                                  className={`h-full rounded-full bg-gradient-to-r ${attr.color}`}
                                  style={{ width: `${(attr.val / attr.max) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Big interactive sign button */}
                        <button
                          onClick={() => handleSignPlayer(selectedFaPlayer)}
                          disabled={cash < (selectedFaPlayer.price || 500) * 10000}
                          className={`w-full py-3 rounded-xl font-[family-name:var(--font-outfit)] font-black text-xs tracking-wider transition-all uppercase skew-x-[-10deg] italic border shadow-lg shrink-0
                            ${cash >= (selectedFaPlayer.price || 500) * 10000
                              ? 'bg-white border-white text-black cursor-pointer hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:brightness-110 active:scale-95'
                              : 'bg-zinc-950/80 border-white/5 text-zinc-600 cursor-not-allowed shadow-inner'}`}
                        >
                          <span className="block skew-x-[10deg] text-center">
                            {cash >= (selectedFaPlayer.price || 500) * 10000 
                              ? `EXECUTE CONTRACT SIGNING (-$${((selectedFaPlayer.price || 500) * 10000).toLocaleString()})`
                              : 'INSUFFICIENT FRANCHISE FUNDS'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl">
                        <UserPlus className="text-zinc-600 w-16 h-16 animate-pulse mb-3" />
                        <h4 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">No Agent Selected</h4>
                        <p className="text-[10px] text-zinc-500 max-w-xs mt-1 leading-relaxed">
                          Select any available free agent from the draft board list on the left to inspect their contract profile, core attributes, and execute team signings.
                        </p>
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer Section */}
                <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Market Refresh Clock</span>
                      <span className="text-xs font-mono font-black text-white bg-white/5 border border-white/20 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(255,255,255,0.05)]">
                        {formatFaTime(faTimeLeft)}
                      </span>
                    </div>
                    
                    {/* PITY SYSTEM DISPLAY */}
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest" title="Guaranteed Mythic on 50th paid refresh">Pity Status</span>
                      <div className="bg-zinc-900 border border-white/20 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-inner">
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                        <span className="text-xs font-mono font-black text-white">
                          {faPityCounter} / 50
                        </span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleRefreshFA}
                    className="flex items-center gap-2 px-4 py-2 border border-white/20 bg-white/5 rounded-xl hover:bg-white/10 active:scale-95 transition-all text-white font-[family-name:var(--font-outfit)] font-black text-[10px] tracking-wider uppercase italic skew-x-[-8deg]"
                  >
                    <RefreshCw size={11} className="animate-spin skew-x-[8deg]" style={{ animationDuration: '6s' }} />
                    <span className="skew-x-[8deg] block">REFRESH AGENTS (-200 VC)</span>
                  </button>
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
