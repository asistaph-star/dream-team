"use client";

import React, { useState, useEffect, useRef } from "react";
import { useGameState } from "@/lib/context/GameStateContext";
import { PlayerCard } from "@/components/player/PlayerCard";
import { PlayerHexProfileModal } from "@/components/player/PlayerHexProfileModal";
import { Player, PlayerPosition } from "@/lib/types/player";
import Link from "next/link";
import Image from "next/image";
import { UserCircle, CircleDollarSign, Ticket, Globe2, Plus, Sparkles, Trophy, ShieldAlert, TrendingUp, TrendingDown, RefreshCw, UserPlus } from 'lucide-react';
import { mockPlayers, getTierColor, getTierRating } from "@/lib/data/mockPlayers";

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
    lineupOverride
  } = useGameState();

  const [selectedGlobalPlayer, setSelectedGlobalPlayer] = useState<Player | null>(null);
  const [isAscending, setIsAscending] = useState(false);

  const [scale, setScale] = useState(1);
  const [time, setTime] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [coachActiveTab, setCoachActiveTab] = useState<'OFF' | 'DEF'>('OFF');
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  
  // Drag & Drop States
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [potentialDragPlayerId, setPotentialDragPlayerId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragHoverSlot, setDragHoverSlot] = useState<PlayerPosition | null>(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);

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
        if (slotEl) {
          const slot = slotEl.getAttribute('data-slot') as string;
          setLineupSlot(slot, draggingPlayerId);
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
  }, [draggingPlayerId, dragHoverSlot, setLineupSlot, potentialDragPlayerId, dragStartPos]);

  // NBA 2K Free Agents Market States
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [freeAgents, setFreeAgents] = useState<any[]>([]);
  const [faTimeLeft, setFaTimeLeft] = useState(900); // 15 mins
  const [selectedFaPlayer, setSelectedFaPlayer] = useState<any | null>(null);
  const [faStatusMessage, setFaStatusMessage] = useState<string | null>(null);
  const [faPityCounter, setFaPityCounter] = useState(0);

  // NBA 2K Chat Redesign States
  const [autoPk, setAutoPk] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { channel: "all", title: "Champion", titleColor: "text-yellow-400", user: "RUBIO", text: "5 STAR ALLEYKINGZ RECRUITS MEMBERS WITH EPIC F5!!" },
    { channel: "all", title: "Beginner", titleColor: "text-zinc-300", user: "Alvin09", text: "FS FEARS/AMEN FOR 20APK POSTED" },
    { channel: "all", title: "Beginner", titleColor: "text-zinc-300", user: "Mansanitas", text: "1220 FLAGG + 1480 JJ FOR 2010 LUKA" },
    { channel: "all", title: "DreamTeam", titleColor: "text-cyan-400", user: "Juantmadx", text: "LF DE SILVA" }
  ]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { channel: "all", title: "DreamTeam", titleColor: "text-cyan-400", user: "YOU", text: chatInput }
    ]);
    setChatInput("");
  };

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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

  const offStrategies = [
    { name: "Motion Offense", desc: "Balanced passing and off-ball movement.", focus: "PG playmaking, C screens", stat: "+2% effectiveness per level" },
    { name: "Pick & Roll", desc: "High screen action utilizing roll-man and ball handler.", focus: "PG passing, C inside scoring", stat: "+2% effectiveness per level" },
    { name: "Isolation (ISO)", desc: "Clear out space for your star scorers to play 1-on-1.", focus: "SG/SF solo scoring efficiency", stat: "+2% effectiveness per level" },
    { name: "5-Out Spacing", desc: "All 5 players spaced on perimeter to maximize open shots.", focus: "PG/SG 3PT shooting volume", stat: "+2% effectiveness per level" },
    { name: "Post Isolation", desc: "Feed the ball inside for your big men to operate.", focus: "PF/C inside physical scoring", stat: "+2% effectiveness per level" },
    { name: "Run & Gun", desc: "Ultra high-tempo transition play prioritizing speed and rapid fastbreak shots.", focus: "PG/SG/SF speed and fastbreak scoring", stat: "+2% effectiveness per level" },
    { name: "Pace & Space", desc: "Modern perimeter spacing scheme maximizing high-volume three-point looks.", focus: "SG/SF perimeter shooting and court spreading", stat: "+2% effectiveness per level" },
    { name: "Outside Shoot", desc: "Prioritize perimeter jumpers and deep spacing for your high-efficiency shooters.", focus: "PG/SG perimeter shooting volume", stat: "+2% effectiveness per level" },
    { name: "Corner 3s", desc: "Focus offensive rotations on producing open catch-and-shoot looks in the corners.", focus: "SG/SF wing & corner three-point volume", stat: "+2% effectiveness per level" },
    { name: "Inside Score", desc: "Feed the low block and slash to the rim, maximizing inside paint dominance.", focus: "PF/C interior paint physical scoring", stat: "+2% effectiveness per level" },
    { name: "Hawk Entry", desc: "Utilize high-post screens and weakside baseline cuts to slash through defenses.", focus: "SF/PF mid-range and baseline cutting", stat: "+2% effectiveness per level" },
    { name: "Outside Cut Entry", desc: "Initiate passing sequences from the perimeter, executing backdoor cuts to the rim.", focus: "SF/SG off-ball baseline cuts & assists", stat: "+2% effectiveness per level" },
    { name: "Princeton Offense", desc: "Run highly structured, constant off-ball motion requiring high-IQ passing from all 5 positions.", focus: "Balanced team playmaking & backdoors", stat: "+2% effectiveness per level" }
  ];

  const defStrategies = [
    { name: "Man-to-Man", desc: "Traditional defensive coverage tracking players 1-on-1.", focus: "Balanced defensive coverage", stat: "+2% effectiveness per level" },
    { name: "Drop Coverage", desc: "C sags into paint to protect rim while giving up mid-range.", focus: "C rim protection, interior focus", stat: "+2% effectiveness per level" },
    { name: "Switch Defense", desc: "Defenders switch screens immediately to close perimeter space.", focus: "SF/PF versatility on screens", stat: "+2% effectiveness per level" },
    { name: "Blitz/Trap", desc: "Aggressive double-teaming on key ball handlers to force mistakes.", focus: "Higher STL rate, higher stamina drain", stat: "+2% effectiveness per level" },
    { name: "2-3 Zone", desc: "Clog the interior paint with 3 zone-defenders.", focus: "Defensive Rebounding, denies driving layups", stat: "+2% effectiveness per level" },
    { name: "Full-Court Press", desc: "All-out pressure starting from the opponent's backcourt.", focus: "Massive STL boost, very high stamina drain", stat: "+2% effectiveness per level" },
    { name: "Full-court press", desc: "Aggressive full-court pressure boosting steal rate at a very high stamina drain.", focus: "Massive STL boost, very high stamina drain", stat: "+2% effectiveness per level" },
    { name: "Half-Court Press", desc: "Apply aggressive defensive pressure starting at half-court, trapping sideline ball handlers.", focus: "Moderately high STL boost, minor fatigue cost", stat: "+2% effectiveness per level" },
    { name: "Half-court press", desc: "Apply aggressive defensive pressure starting at half-court, trapping sideline ball handlers.", focus: "Moderately high STL boost, minor fatigue cost", stat: "+2% effectiveness per level" },
    { name: "3-2 Zone", desc: "Deploy a high perimeter zone designed to close down open wing and corner three-point attempts.", focus: "Denies opponent corner & wing 3PT looks", stat: "+2% effectiveness per level" },
    { name: "Protect the Lane", desc: "Instruct your defenders to drop deep inside the paint, fully protecting the rim against driving layups.", focus: "PF/C paint protection, blocks drives & layups", stat: "+2% effectiveness per level" },
    { name: "1-3-1 Zone", desc: "Deploy an active trapping zone shifting defenders dynamically to sideline pass intercept lanes.", focus: "High steal rate, forces passing turnovers", stat: "+2% effectiveness per level" },
    { name: "Combination Defense", desc: "Run a dynamic hybrid defense specifically focused on shutting down the opponent's primary high-OVR scorer.", focus: "Suppresses opponent primary star scorer", stat: "+2% effectiveness per level" }
  ];

  const getNextExpVal = (lvl: number): number => {
    if (lvl === 1) return 500;
    if (lvl === 2) return 1500;
    if (lvl === 3) return 4000;
    if (lvl === 4) return 10000;
    return 0;
  };

  const handleUpgrade = (stratName: string) => {
    const res = upgradeStrategy(stratName);
    if (res.success) {
      setUpgradeSuccess(`${stratName} successfully upgraded to Level ${res.newLevel}!`);
      setTimeout(() => setUpgradeSuccess(null), 3000);
    }
  };

  const finalCoords = {
    SF: { top: 320, left: 279 },
    C: { top: 242, left: 451 },
    PF: { top: 243, left: 661 },
    SG: { top: 424, left: 515 },
    PG: { top: 370, left: 816 }
  };

  useEffect(() => {
    const handleResize = () => {
      const scaleX = window.innerWidth / 1420;
      const scaleY = window.innerHeight / 800;
      setScale(Math.max(0.5, Math.min(scaleX, scaleY))); // Fit to window while keeping aspect ratio
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
    const coords = finalCoords[pos as keyof typeof finalCoords];
    
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
        style={{ top: `${coords.top}px`, left: `${coords.left}px`, opacity: draggingPlayerId === player?.id ? 0.5 : 1 }}
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
              <PlayerCard player={player} tooltipDirection={draggingPlayerId ? "none" : "right"} />
            ) : (
              <div className="w-[120px] h-[124px] rounded-xl border border-white/5 bg-gradient-to-br from-zinc-900/90 to-black/90 flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-sm group-hover:border-white/10 transition-colors">
                 <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:16px_16px] pointer-events-none"></div>
                 <div className="flex flex-col items-center justify-center opacity-40">
                   <Plus size={20} className="text-zinc-400 mb-1 drop-shadow-md" strokeWidth={3} />
                   <span className="text-zinc-400 font-[family-name:var(--font-outfit)] font-black tracking-[0.2em] uppercase text-[9px] italic">EMPTY</span>
                 </div>
              </div>
            )}
            <div className="absolute -bottom-[32px] left-[50%] -translate-x-[50%] w-[100px] h-[26px] text-white text-sm text-center font-bold py-0.5 rounded-full border border-white/40 z-30 shadow-lg pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(207, 160, 48, 0.6), rgba(143, 101, 20, 0.95))" }}>
              <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a1a] to-[#333] opacity-20 blur-[2px] rounded-full"></div>
              <span className="relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,1)] text-[#e8f1ff] uppercase">{pos}</span>
            </div>
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
          />
        </div>
      )}

      {selectedGlobalPlayer && (
        <PlayerHexProfileModal 
          player={selectedGlobalPlayer} 
          onClose={() => setSelectedGlobalPlayer(null)} 
          onStarUp={() => {
            setIsAscending(true);
            setTimeout(() => {
              ascendPlayer(selectedGlobalPlayer.id);
              setIsAscending(false);
            }, 1000);
          }} 
          isAscending={isAscending} 
        />
      )}
      
      <div
        id="stadium-container"
        className="relative pointer-events-auto shadow-2xl"
        style={{
          width: "1420px",
          height: "800px",
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

        {/* --- Top Left Profile (Authentic NBA 2K Street Neon Design - SHARP HD FIX) --- */}
        <div className="absolute top-[20px] left-[20px] z-50 group">
          {/* Main Container (No parent skew, completely sharp content) */}
          <div className="relative flex items-center h-[96px] w-[370px] z-10">
            
            {/* Dark Asphalt Glass Backdrop (Skewed independently so text inside stays razor-sharp) */}
            <div className="absolute inset-y-1 left-[40px] right-0 bg-zinc-900/85 backdrop-blur-md border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.1)] z-0 skew-x-[-12deg] rounded-md pointer-events-none"></div>
            
            {/* Grunge / Carbon Texture Overlay (Skewed to match backdrop shape) */}
            <div className="absolute inset-y-1 left-[40px] right-0 opacity-10 pointer-events-none mix-blend-screen skew-x-[-12deg] z-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0), radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}></div>
            
            {/* Neon Cyan Top Edge Highlight (Skewed to match backdrop shape) */}
            <div className="absolute top-1 left-[40px] right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-blue-500 to-transparent shadow-[0_0_10px_rgba(6,182,212,0.8)] skew-x-[-12deg] z-0"></div>

            {/* Sharp, Un-skewed Content Container */}
            <div className="absolute inset-y-1 left-[100px] right-8 z-10 flex flex-col justify-between py-1.5">
              
              {/* Header: Name */}
              <div className="w-full mt-[-4px]">
                <span className="font-[family-name:var(--font-outfit)] font-black text-[22px] tracking-[0.1em] uppercase text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Manager</span>
              </div>

              {/* EXP Progress Laser */}
              <div className="w-[200px] mt-0.5">
                <div className="flex justify-between items-end mb-[1px]">
                  <span className="font-[family-name:var(--font-outfit)] text-[8px] font-black italic text-zinc-400 uppercase tracking-[0.2em]">NETWORK EXP</span>
                  <span className="font-[family-name:var(--font-outfit)] text-[9px] font-bold text-white/90">{accountExp} <span className="text-zinc-600">/1000</span></span>
                </div>
                <div className="relative w-full h-[6px] bg-zinc-800 rounded-full border border-black/50 shadow-inner overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" style={{ width: `${Math.max(5, Math.min(100, (accountExp / 1000) * 100))}%` }}>
                     <div className="absolute top-0 right-0 w-4 h-full bg-white animate-pulse blur-[1px]"></div>
                  </div>
                </div>
              </div>

              {/* Currency Nodes */}
              <div className="flex items-center gap-3 w-full mt-1.5 pb-2">
                
                {/* Team Funds (Standard) */}
                <div 
                  className="flex items-center relative z-50"
                  style={{ top: "-5.3px", left: "-23.7px" }}
                >
                  <div className="flex items-center pl-2 pr-3 h-[28px] relative">
                    {/* Skewed pill backdrop */}
                    <div className="absolute inset-0 bg-zinc-950/60 border border-white/5 shadow-inner skew-x-[-12deg] pointer-events-none rounded-sm"></div>
                    <div className="relative z-10 flex items-center gap-2">
                      <div className="w-[22px] h-[22px] relative flex items-center justify-center">
                        <img src="/bg/tf_coin.png" alt="TF" className="w-full h-full object-contain mix-blend-screen hover:scale-110 transition-transform cursor-pointer drop-shadow-md rounded-full" />
                      </div>
                      <span className="font-sans text-white font-semibold text-[15px] tracking-wide drop-shadow-sm leading-none">{cash.toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={() => addCash(1000000)} className="-ml-1 flex items-center justify-center text-zinc-400 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer z-20 drop-shadow-md" title="Add 1M TF">
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
                
                {/* VC (Premium) */}
                <div 
                  className="flex items-center relative z-50"
                  style={{ top: "-6.1px", left: "-36px" }}
                >
                  <div className="flex items-center pl-2 pr-3 h-[28px] relative">
                    {/* Skewed pill backdrop */}
                    <div className="absolute inset-0 bg-zinc-950/60 border border-white/5 shadow-inner skew-x-[-12deg] pointer-events-none rounded-sm"></div>
                    <div className="relative z-10 flex items-center gap-2">
                      <div className="w-[22px] h-[22px] relative flex items-center justify-center">
                        <img src="/bg/vc_coin.png" alt="VC" className="w-full h-full object-contain mix-blend-screen hover:scale-110 transition-transform cursor-pointer drop-shadow-md rounded-full" style={{ filter: 'hue-rotate(-135deg) saturate(2.2) brightness(1.05)' }} />
                      </div>
                      <span className="font-sans text-white font-semibold text-[15px] tracking-wide drop-shadow-sm leading-none">{tk.toLocaleString()}</span>
                    </div>
                  </div>
                  <button onClick={() => addTk(1000)} className="-ml-1 flex items-center justify-center text-zinc-400 hover:text-white hover:scale-110 active:scale-95 transition-all cursor-pointer z-20 drop-shadow-md" title="Add 1000 VC">
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
              
            </div>

            {/* Avatar Section (Left Overlapping Card) */}
            <div className="absolute left-[5px] top-1/2 -translate-y-1/2 w-[86px] h-[106px] z-20 transition-transform duration-300 group-hover:scale-105 group-hover:translate-x-1" style={{ filter: 'drop-shadow(5px 5px 10px rgba(0,0,0,0.7))' }}>
              
              {/* Outer Metallic Frame with Slant */}
              <div className="absolute inset-0 bg-gradient-to-b from-zinc-300 via-zinc-500 to-zinc-800" style={{ clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)' }}></div>
              
              {/* Inner Fire Gradient Backdrop */}
              <div className="absolute inset-[2px] bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-400" style={{ clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)' }}>
                 {/* Scanline Grid */}
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] bg-[length:100%_4px,_6px_100%] z-0 mix-blend-overlay"></div>
                 
                 {/* Unskewed Image (No skew counter-skew needed since parent is perfectly sharp!) */}
                 <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden">
                   <img alt="Player" src="/avatar/avatar3.webp" className="w-[140%] h-[140%] object-cover drop-shadow-[-2px_2px_2px_rgba(6,182,212,0.6)] saturate-150 contrast-125 ml-2 mt-2" onError={(e) => { e.currentTarget.src = "https://ui-avatars.com/api/?name=2K&background=000&color=fff" }} />
                 </div>
                 
                 {/* Bottom Shadow Fade */}
                 <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/80 to-transparent z-20"></div>
              </div>
            </div>

            {/* Floating Level / OVR Diamond (Far Right - Fully sharp unskewed texts!) */}
            <div className="absolute right-[5px] top-1/2 -translate-y-1/2 w-[42px] h-[42px] z-30 transform translate-x-1/2">
              <div className="absolute inset-0 rotate-45 bg-gradient-to-br from-cyan-300 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.6)] border-[2px] border-white/50 group-hover:rotate-[225deg] transition-transform duration-700 ease-out"></div>
              <div className="absolute inset-[3px] rotate-45 bg-zinc-950 border border-cyan-500/50"></div>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <span className="text-[7px] font-black text-cyan-400 uppercase tracking-widest leading-none mb-[1px] drop-shadow-[0_0_2px_cyan]">OVR</span>
                <span className="text-[16px] font-black text-white leading-none tracking-tighter drop-shadow-[1px_1px_1px_black]">{accountLevel}</span>
              </div>
            </div>

            {/* Time / Server Banner (Unskewed text for absolute server clock sharpness!) */}
            <div className="absolute -bottom-[22px] right-[10px] z-10">
              <div className="bg-zinc-900 border border-zinc-700 shadow-[0_2px_5px_rgba(0,0,0,0.8)] px-3 py-0.5 skew-x-[-12deg] flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_5px_red] skew-x-[12deg]"></div>
                <span className="text-zinc-300 font-black italic text-[9px] tracking-widest uppercase skew-x-[12deg]">SERVER <span className="text-white ml-1">{time}</span></span>
              </div>
            </div>
            
          </div>
        </div>


        {/* --- Top Right Profile (Salary & TF - SHARP HD FIX) --- */}
        <div className="absolute top-[20px] right-[20px] z-50 group">
          {/* Main Container (No parent skew, completely sharp content) */}
          <div className="relative flex items-center h-[64px] shadow-2xl">
            
            {/* Slanted backdrop card (skewed independently so content remains pixel-perfect) */}
            <div className="absolute inset-0 bg-zinc-900/85 backdrop-blur-md border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.8),_inset_0_1px_1px_rgba(255,255,255,0.1)] skew-x-[-12deg] rounded-l-md pointer-events-none z-0"></div>
            
            {/* Carbon grid overlay skewed */}
            <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-screen skew-x-[-12deg] z-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0), radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}></div>
            
            {/* Orange glowing top highlight skewed */}
            <div className="absolute top-0 right-0 left-4 h-[2px] bg-gradient-to-l from-orange-500 via-red-500 to-transparent shadow-[0_0_10px_rgba(249,115,22,0.8)] skew-x-[-12deg] z-0"></div>

            {/* Sharp Unskewed Content Container (No counter skew needed!) */}
            <div className="relative z-10 flex items-center px-6 gap-6 h-full">
              
              {/* TF Node */}
              <div className="flex items-center gap-3">
                <div className="w-[32px] h-[32px] relative flex items-center justify-center">
                  <img src="/bg/tf_coin.png" alt="TF" className="w-full h-full object-contain mix-blend-screen drop-shadow-md rounded-full" />
                </div>
                <div className="flex flex-col justify-center">
                  <span className="font-[family-name:var(--font-outfit)] text-[9px] font-black italic text-zinc-400 uppercase tracking-[0.2em] leading-none mb-[2px]">TEAM FUNDS</span>
                  <span className="font-sans text-white font-bold text-[18px] tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">{cash.toLocaleString()}</span>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="relative z-20 w-[1px] h-[36px] bg-white/10 skew-x-[-12deg]"></div>

              {/* Salary Cap Node */}
              <div className="relative z-20 flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-[28px] h-[28px] relative flex items-center justify-center text-white drop-shadow-[0_2px_5px_rgba(0,0,0,0.5)]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="10" cy="7" r="4.5" />
                      <path d="M3 18.5C3 14.9 6.1 13 10 13c1 0 1.9.2 2.7.5A6.5 6.5 0 0 0 11 16.5c0 1.3.4 2.5 1 3.5H3v-1.5z" />
                      <circle cx="17.5" cy="16.5" r="5.5" />
                      <text x="17.5" y="19.5" fontSize="10" fontWeight="900" textAnchor="middle" fill="#09090b" fontFamily="sans-serif">$</text>
                    </svg>
                  </div>
                  <div className="flex flex-col justify-center">
                    <span className="font-[family-name:var(--font-outfit)] text-[9px] font-black italic text-zinc-400 uppercase tracking-[0.2em] leading-none mb-[2px]">SALARY CAP</span>
                    <span className="font-sans text-white font-bold text-[18px] tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none">
                      <span className={currentSalary > salaryCap ? "text-red-400" : "text-zinc-100"}>{currentSalary.toLocaleString()}</span>
                      <span className="text-zinc-500 mx-[4px] font-normal">/</span>
                      <span className="text-zinc-400">{salaryCap.toLocaleString()}</span>
                    </span>
                  </div>
                </div>
                <button className="flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all cursor-pointer z-20 drop-shadow-md bg-white/5 rounded-full p-1.5 ml-2 border border-white/5" title="Add Cap Space">
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* --- Bottom Navigation Panel --- */}
        <div className="absolute bg-black/50 backdrop-blur-sm border border-gray-600/30 rounded-t-xl" style={{ bottom: '20px', left: '820px', transform: 'translateX(-50%)', width: '800px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', zIndex: 30 }}>
          <Link href="/task">
            <img alt="task" src="/newicons/task.webp" className="cursor-pointer transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_5px_black] drop-shadow-[0_0_2px_white]" width="100" height="100" style={{ marginBottom: '15px' }} />
          </Link>
          <Link href="/inventory">
            <img alt="equipment" src="/newicons/inventory.webp" className="cursor-pointer transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_5px_black] drop-shadow-[0_0_2px_white]" width="100" height="100" style={{ marginBottom: '15px' }} />
          </Link>
          <Link href="/player">
            <img alt="player" src="/newicons/player.webp" className="cursor-pointer transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_5px_black] drop-shadow-[0_0_2px_white]" width="100" height="100" style={{ marginBottom: '15px' }} />
          </Link>
          <Link href="/alliance">
            <img alt="alliance" src="/newicons/alliance.webp" className="cursor-pointer transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_5px_black] drop-shadow-[0_0_2px_white]" width="102" height="102" style={{ marginBottom: '15px' }} />
          </Link>
          <Link href="/article">
            <img alt="article" src="/newicons/article.webp" className="cursor-pointer transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_5px_black] drop-shadow-[0_0_2px_white]" width="102" height="102" style={{ marginBottom: '15px' }} />
          </Link>
          <Link href="/shop">
            <img alt="shop" src="/newicons/shop.webp" className="cursor-pointer transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_5px_black] drop-shadow-[0_0_2px_white]" width="100" height="100" style={{ marginBottom: '15px' }} />
          </Link>
          <Link href="/match">
            <img alt="match" src="/newicons/match.webp" className="cursor-pointer transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_5px_black] drop-shadow-[0_0_2px_white]" width="100" height="100" style={{ marginBottom: '15px' }} />
          </Link>
          <Link href="/stadium">
            <img alt="stadium" src="/newicons/city.webp" className="cursor-pointer transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_5px_black] drop-shadow-[0_0_2px_white]" width="100" height="100" style={{ marginBottom: '15px' }} />
          </Link>
        </div>

        {/* --- Global Chat Box (NBA 2K STYLE - SHARP HD FIX) --- */}
        <div className="absolute bottom-[10px] left-[20px] w-[350px] z-30 group p-3">
          {/* Slanted Glassmorphic Backdrop Card (Skewed separately so scrollbars and text remain ultra-sharp and HD) */}
          <div className="absolute inset-0 bg-[#0c0d12]/95 backdrop-blur-[12px] border border-white/10 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.8)] skew-x-[-4deg] group-hover:border-cyan-500/40 transition-all duration-300 z-0 pointer-events-none"></div>
          
          {/* Subtle carbon grid backdrop overlay (Skewed matching the card backdrop) */}
          <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-screen skew-x-[-4deg] z-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0), radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}></div>

          {/* Sharp, Unskewed Interior Content Wrapper */}
          <div className="relative z-10">
            
            {/* Header Tab */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex space-x-2">
                <div className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 border border-blue-500/20 text-white font-[family-name:var(--font-outfit)] font-black tracking-wider uppercase text-[10px] rounded-md shadow-md skew-x-[-12deg] flex items-center gap-1.5">
                  <span className="skew-x-[12deg] flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80] animate-pulse"></div>
                    GLOBAL
                  </span>
                </div>
              </div>
              <div className="text-[9px] text-zinc-400 font-[family-name:var(--font-outfit)] font-black tracking-widest uppercase italic mr-1">
                SERVERS: ONLINE
              </div>
            </div>

            {/* Chat Board Box */}
            <div className="h-[135px] overflow-y-auto bg-zinc-950/90 border border-white/5 rounded-xl p-2.5 relative scrollbox article-scroll scroll-smooth">
              <div className="flex flex-col gap-2">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className="text-xs border-b border-white/[0.03] pb-1.5 last:border-0 last:pb-0 leading-relaxed break-words">
                    <span className="inline-flex items-center gap-1.5 mr-1.5 align-middle select-none">
                      {/* [all] tag */}
                      <span className="bg-red-500/10 border border-red-500/30 text-red-400 text-[8px] font-black tracking-wide uppercase px-1 rounded">
                        ALL
                      </span>
                      
                      {/* Title Badges */}
                      <span className={`text-[8px] font-black tracking-wide uppercase px-1.5 py-0.5 rounded skew-x-[-6deg] shadow-sm ${
                        msg.title === 'Champion' ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 text-yellow-400' :
                        msg.title === 'DreamTeam' ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400' :
                        'bg-zinc-700/20 border border-zinc-600/30 text-zinc-300'
                      }`}>
                        <span className="skew-x-[6deg] inline-block">{msg.title}</span>
                      </span>
                      
                      {/* Username */}
                      <span className="font-[family-name:var(--font-outfit)] font-bold text-white text-[11px] tracking-wide">
                        {msg.user}:
                      </span>
                    </span>
                    
                    {/* Message Body */}
                    <span className="text-zinc-200 text-xs font-semibold tracking-wide font-sans mt-0.5 inline align-middle">
                      {msg.text}
                    </span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Input Action Panel */}
            <div className="mt-2.5 flex space-x-2 items-center relative">
              {/* Emoji button */}
              <button className="w-9 h-9 bg-zinc-800/80 border border-white/10 hover:bg-zinc-700 hover:border-cyan-500/40 text-white rounded-lg flex items-center justify-center transition hover:scale-105 active:scale-95 shadow-md text-sm">
                😊
              </button>
              
              {/* Text input */}
              <input 
                type="text" 
                className="flex-1 h-9 bg-zinc-950/80 border border-white/10 rounded-lg px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/30 transition-all font-sans font-semibold tracking-wide shadow-inner animate-none" 
                value={chatInput} 
                onChange={e => setChatInput(e.target.value)} 
                onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
                placeholder="Type a message..." 
              />
              
              {/* Send Button */}
              <button 
                onClick={handleSendChat}
                className="h-9 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500/40 text-white font-[family-name:var(--font-outfit)] font-black tracking-wider uppercase text-xs px-4 rounded-lg shadow-lg hover:shadow-red-500/20 hover:scale-105 active:scale-95 transition-all skew-x-[-12deg]"
              >
                <span className="skew-x-[12deg] flex items-center gap-1">SEND</span>
              </button>
            </div>

          </div>
        </div>

        {/* --- Online Counter --- */}
        <div className="absolute bottom-[20px] right-[20px] flex gap-4 items-end z-30">
          <div className="relative w-24 h-24 bg-gray-800 rounded-lg shadow-xl border border-gray-700 text-center">
            <div className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
            <div className="absolute top-1 right-1 w-3 h-3 bg-green-500 rounded-full"></div>
            <div className="bg-gray-900 text-white py-1 rounded-t-lg text-[10px] font-semibold tracking-wide shadow-inner">ONLINE</div>
            <div className="flex items-center justify-center h-[calc(100%-1.5rem)]">
              <span className="text-3xl font-extrabold text-white">240</span>
            </div>
          </div>
        </div>

        {/* --- Auto PK Toggle (NBA 2K STYLE) --- */}


        {/* --- Left Side Icons --- */}
        <div className="absolute top-[160px] left-[20px] z-20">
          <img alt="gameData" src="/bg/button/gamedata.webp" className="w-[35px] h-[35px] cursor-pointer hover:scale-110 transition" />
        </div>
        <div className="absolute top-[160px] left-[70px] z-20">
          <img alt="Daily Signin" src="/bg/dailysignin.webp" className="w-[35px] h-[35px] cursor-pointer hover:scale-110 transition" />
        </div>
        <div className="absolute top-[210px] left-[20px] z-20">
          <img alt="Lottery" src="/bg/lottery.webp" className="w-[35px] h-[35px] cursor-pointer hover:scale-110 transition" />
        </div>

        {/* --- Right Side Characters --- */}
        <div className="absolute top-[60px] right-[380px] w-[150px] h-[300px] z-10 pointer-events-none">
          <img alt="Agent" onClick={() => setShowAgentModal(true)} src="/agent.png" className="w-full h-full object-contain pointer-events-auto cursor-pointer hover:scale-105 transition drop-shadow-[0_0_2px_white]" />
        </div>
        <div className="absolute top-[120px] right-[200px] w-[160px] h-[250px] z-10 pointer-events-none">
          <img alt="Coach" onClick={() => setShowCoachModal(true)} src="/coach.png" className="w-full h-full object-contain pointer-events-auto cursor-pointer hover:scale-105 transition drop-shadow-[0_0_2px_white]" />
        </div>

        {/* --- AUTO LINEUP BUTTON --- */}
        <div className="absolute top-[580px] right-[20px] w-[200px] h-[40px] z-30">
          <button onClick={autoLineup} className="w-full h-full bg-slate-800 border border-slate-700 rounded-lg shadow-lg transition-all duration-300 flex items-center justify-center text-white font-semibold text-sm hover:drop-shadow-[0_0_5px_rgba(0,0,0,0.5)] active:scale-95">
            AUTO LINEUP
          </button>
        </div>

        {/* --- ACTIVE COURT LINEUP --- */}
        {renderSlot('SF')}
        {renderSlot('C')}
        {renderSlot('PF')}
        {renderSlot('SG')}
        {renderSlot('PG')}

        {/* --- BENCH PLAYERS (PREMIUM 2K BINDER CARD STORAGE) --- */}
        <div className="absolute w-[210px] h-[360px] top-[200px] right-[20px] bg-zinc-950/90 backdrop-blur-md border border-cyan-500/30 rounded-xl p-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.9)] z-20 flex flex-col overflow-visible">
          {/* Slanted header banner */}
          <div className="bg-gradient-to-r from-cyan-950/60 to-zinc-900/60 border-b border-cyan-500/20 pb-1.5 mb-2.5 shrink-0 flex items-center justify-between px-1">
            <span className="text-white font-[family-name:var(--font-outfit)] font-black text-[12px] tracking-wider uppercase italic leading-none mt-1">RESERVES</span>
            <span className="text-cyan-400 font-mono font-bold text-[9px] leading-none bg-cyan-950/80 border border-cyan-500/20 px-1.5 py-[3px] rounded shadow-[0_0_8px_rgba(6,182,212,0.15)] flex items-center justify-center mt-0.5">
              {activeReserves.length} CARDS
            </span>
          </div>
          
          {/* Scrollable binder grid */}
          <div className="flex-1 pr-1 flex flex-col min-h-0">
            <div className="grid grid-cols-2 gap-x-2 gap-y-4" style={{ gridAutoRows: 'min-content', alignItems: 'start' }}>
              {['B1', 'B2', 'B3', 'B4', 'B5', 'B6'].map((slotKey, index) => {
                const benchPlayer = activeReserves.find(p => lineupOverride[slotKey] === p.id);
                const isHovered = dragHoverSlot === slotKey;

                return (
                  <div 
                    key={slotKey}
                    data-slot={slotKey}
                    className={`flex flex-col items-center relative z-20 transition-all ${isHovered ? 'scale-110 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]' : ''}`}
                  >
                    <div className={`relative w-[85px] h-[88px] rounded-lg border flex items-center justify-center transition-all ${isHovered ? 'border-cyan-400 bg-cyan-900/40 shadow-[inset_0_0_15px_rgba(6,182,212,0.3)]' : 'border-white/5 bg-gradient-to-br from-zinc-900/80 to-black/80 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]'}`}>
                      {!benchPlayer && (
                        <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:12px_12px]" />
                        </div>
                      )}
                      {benchPlayer ? (
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
                      ) : (
                        <div className="flex flex-col items-center justify-center opacity-30">
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
        {showCoachModal && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            {/* Standard non-skewed container for absolute pixel-perfect HD clarity */}
            <div className="w-[850px] h-[590px] rounded-2xl p-6 flex flex-col relative overflow-hidden">
              
              {/* Decoupled Skewed Backdrop & Border (eliminates chromium transform subpixel layout blur!) */}
              <div className={`absolute inset-0 bg-zinc-950/95 border-2 ${coachActiveTab === 'OFF' ? 'border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.35)]' : 'border-orange-500/40 shadow-[0_0_50px_rgba(249,115,22,0.35)]'} rounded-2xl skew-x-[-6deg] scale-x-[1.04] z-0 pointer-events-none`} />
              
              {/* Carbon Grid backdrop & Scanlines */}
              <div className="absolute inset-0 opacity-[0.1] pointer-events-none mix-blend-screen z-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0), radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}></div>
              <div className={`absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_15px_cyan] z-0 skew-x-[-6deg] scale-x-[1.04]`}></div>
              
              {/* Unskewed, perfectly flat content plane */}
              <div className="flex-1 flex flex-col min-h-0 relative z-10">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-5 relative z-10">
                  <div className="flex items-center gap-4">
                    {/* Glowing slanted icon box */}
                    <div className={`w-14 h-12 bg-gradient-to-b ${coachActiveTab === 'OFF' ? 'from-cyan-500 to-blue-600' : 'from-orange-500 to-red-600'} rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-white/20 skew-x-[-12deg]`}>
                      <Trophy className="text-white w-6 h-6 animate-bounce skew-x-[12deg]" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-[family-name:var(--font-outfit)] font-black text-white tracking-[0.08em] uppercase flex items-center gap-2 italic drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        HEAD COACH STRATEGY BOARD
                      </h2>
                      <p className="text-[10px] text-zinc-400 font-[family-name:var(--font-outfit)] font-black tracking-[0.2em] uppercase italic">Maximize squad parameters through active match tactical mastery</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCoachModal(false)} className="text-zinc-500 hover:text-white text-3xl font-light cursor-pointer transition-colors pt-1">×</button>
                </div>

                {/* Toast Success Message */}
                {upgradeSuccess && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-emerald-600 to-teal-500 border border-emerald-400 px-6 py-2 rounded-full text-white font-[family-name:var(--font-outfit)] font-black text-xs tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.6)] animate-[bounce_0.5s_infinite]">
                    ✨ {upgradeSuccess}
                  </div>
                )}

                {/* Layout Content */}
                <div className="flex-1 flex gap-6 min-h-0 relative z-10">
                  
                  {/* Left Side: Coach Roster Profile */}
                  <div className="w-[230px] bg-zinc-900/60 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-between shadow-lg">
                    <div className="flex flex-col items-center text-center">
                      
                      {/* Coach Avatar metallic frame */}
                      <div className="relative w-32 h-[170px] z-20 mb-3" style={{ filter: 'drop-shadow(3px 3px 8px rgba(0,0,0,0.8))' }}>
                        {/* Metallic Slate Outer Frame */}
                        <div className="absolute inset-0 bg-gradient-to-b from-zinc-300 via-zinc-500 to-zinc-800" style={{ clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)' }}></div>
                        
                        {/* Glowing backdrop */}
                        <div className="absolute inset-[2.5px] bg-gradient-to-tr from-orange-600 via-red-500 to-yellow-400" style={{ clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)' }}>
                          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] bg-[length:100%_4px,_6px_100%] z-0 mix-blend-overlay"></div>
                          <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden">
                            <img src="/coach.png" alt="Coach Pop" className="w-[125%] h-[125%] object-cover skew-x-[6deg] drop-shadow-[-2px_2px_2px_rgba(0,0,0,0.8)] ml-2 mt-1" />
                          </div>
                        </div>
                      </div>

                      <div className="font-[family-name:var(--font-outfit)] text-[18px] font-black text-white uppercase tracking-wider italic leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">Coach Pop</div>
                      <span className="font-[family-name:var(--font-outfit)] text-[8px] font-black italic text-cyan-400 tracking-[0.25em] uppercase mt-1 leading-none">MASTER STRATEGIST</span>
                    </div>

                    {/* Slanted Coach Report Card */}
                    <div className="w-full bg-zinc-950/80 border border-white/5 p-3 rounded-lg flex flex-col gap-2 mt-4 text-[10px] skew-x-[-6deg] shadow-inner">
                      <div className="skew-x-[6deg]">
                        <div className="text-zinc-400 font-[family-name:var(--font-outfit)] font-black text-center border-b border-white/5 pb-1.5 mb-1.5 text-[9px] uppercase tracking-[0.2em] italic">COACH REPORT</div>
                        
                        <div className="flex justify-between text-zinc-300 mb-1">
                          <span className="font-semibold">Total Strategies:</span>
                          <span className="font-black text-white">11 Tactics</span>
                        </div>
                        <div className="flex justify-between text-zinc-300 mb-1">
                          <span className="font-semibold">Tactics LVL Sum:</span>
                          <span className={`font-black ${coachActiveTab === 'OFF' ? 'text-cyan-400' : 'text-orange-400'}`}>
                            {Object.values(strategyLevels).reduce((acc, s) => acc + s.level, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-zinc-300">
                          <span className="font-semibold">Match EXP Bonus:</span>
                          <span className="font-black text-yellow-500">+50 EXP</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Strategies list & Upgrade control */}
                  <div className="flex-1 flex flex-col min-h-0">
                    
                    {/* Category Slanted Tabs */}
                    <div className="flex mb-4 gap-2">
                      <button 
                        onClick={() => setCoachActiveTab('OFF')}
                        className={`px-6 py-2.5 text-xs font-[family-name:var(--font-outfit)] font-black tracking-[0.15em] transition-all cursor-pointer uppercase skew-x-[-12deg] border border-white/10
                          ${coachActiveTab === 'OFF' 
                            ? 'bg-gradient-to-r from-cyan-600/90 to-cyan-800/90 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] border-l-4 border-l-cyan-400' 
                            : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'}`}
                      >
                        <span className="block skew-x-[12deg] italic">OFFENSIVE TACTICS ({offStrategies.length})</span>
                      </button>
                      <button 
                        onClick={() => setCoachActiveTab('DEF')}
                        className={`px-6 py-2.5 text-xs font-[family-name:var(--font-outfit)] font-black tracking-[0.15em] transition-all cursor-pointer uppercase skew-x-[-12deg] border border-white/10
                          ${coachActiveTab === 'DEF' 
                            ? 'bg-gradient-to-r from-orange-600/90 to-red-700/90 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)] border-l-4 border-l-orange-400' 
                            : 'bg-zinc-900/60 text-zinc-500 hover:text-zinc-300'}`}
                      >
                        <span className="block skew-x-[12deg] italic">DEFENSIVE TACTICS ({defStrategies.length})</span>
                      </button>
                    </div>

                    {/* Scrollable list */}
                    <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4 scrollbox article-scroll min-h-0">
                      {(coachActiveTab === 'OFF' ? offStrategies : defStrategies).map((strat) => {
                        const current = strategyLevels[strat.name] || { level: 1, exp: 0 };
                        const isMax = current.level >= 5;
                        const req = getNextExpVal(current.level);
                        const hasEnoughExp = !isMax && current.exp >= req;
                        const progressPct = isMax ? 100 : Math.min(100, (current.exp / req) * 100);

                        // 2K Premium Levels glow & background details
                        const badgeStyle = 
                          current.level === 5 ? 'text-fuchsia-400 border-fuchsia-500 bg-fuchsia-950/40 shadow-[0_0_12px_rgba(240,79,228,0.5)]' :
                          current.level === 4 ? 'text-amber-400 border-amber-500 bg-amber-950/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]' :
                          current.level === 3 ? 'text-purple-400 border-purple-500 bg-purple-950/40' :
                          current.level === 2 ? 'text-emerald-400 border-emerald-500 bg-emerald-950/40' :
                          'text-cyan-400 border-cyan-500/40 bg-cyan-950/20';

                        return (
                          <div key={strat.name} className={`bg-zinc-900/70 border border-white/5 rounded-xl p-4 flex flex-col gap-3 transition-all hover:bg-zinc-900 hover:border-white/10 skew-x-[-6deg] shadow-lg relative
                            ${coachActiveTab === 'OFF' ? 'border-l-4 border-l-cyan-500/80' : 'border-l-4 border-l-orange-500/80'}`}>
                            
                            {/* Unskewed block content */}
                            <div className="skew-x-[6deg] flex flex-col gap-2.5">
                              
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2.5 mb-1.5">
                                    <h3 className="font-[family-name:var(--font-outfit)] font-black text-[15px] text-white tracking-wide uppercase italic">{strat.name}</h3>
                                    <span className={`text-[8.5px] font-[family-name:var(--font-outfit)] font-black border-2 px-2.5 py-0.5 rounded skew-x-[-12deg] tracking-wider ${badgeStyle}`}>
                                      <span className="block skew-x-[12deg]">LVL {current.level} {isMax && '★'}</span>
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-zinc-400 leading-relaxed font-sans mb-1.5">{strat.desc}</p>
                                  
                                  {/* Dynamic attribute badges */}
                                  <div className="flex flex-wrap gap-2 text-[9px] font-bold font-mono">
                                    <span className={`bg-zinc-950/80 px-2 py-0.5 rounded border border-white/5 ${coachActiveTab === 'OFF' ? 'text-cyan-400' : 'text-orange-400'}`}>
                                      FOCUS: {strat.focus.toUpperCase()}
                                    </span>
                                    <span className="bg-zinc-950/80 px-2 py-0.5 rounded border border-white/5 text-yellow-400">
                                      EFFECT: {strat.stat.toUpperCase()} (+{(current.level - 1) * 2}%)
                                    </span>
                                  </div>
                                </div>

                                {/* Upgrading Action Trigger slanted */}
                                <button
                                  onClick={() => !isMax && hasEnoughExp && handleUpgrade(strat.name)}
                                  disabled={isMax || !hasEnoughExp}
                                  className={`px-4 py-2.5 rounded border font-[family-name:var(--font-outfit)] font-black text-[10px] tracking-[0.1em] transition-all whitespace-nowrap min-w-[125px] text-center uppercase skew-x-[-10deg] italic
                                    ${isMax 
                                      ? 'bg-zinc-950/50 border-white/5 text-yellow-500 cursor-not-allowed shadow-inner' 
                                      : hasEnoughExp 
                                        ? 'bg-gradient-to-b from-[#cfa030] to-[#8f6514] border-yellow-400 text-white cursor-pointer hover:from-[#ffc040] hover:to-[#a87518] shadow-[0_0_15px_rgba(234,179,8,0.4)] animate-pulse hover:scale-105'
                                        : 'bg-zinc-950/80 border-white/5 text-zinc-600 cursor-not-allowed'}`}
                                >
                                  <span className="block skew-x-[10deg]">
                                    {isMax ? 'MAX LEVEL' : hasEnoughExp ? 'UPGRADE TACTIC' : `NEED ${req - current.exp} EXP`}
                                  </span>
                                </button>
                              </div>

                              {/* Progress bar and EXP stats */}
                              <div className="flex items-center gap-4 mt-1">
                                <div className="flex-1 h-[7px] bg-zinc-950 rounded-full overflow-hidden border border-white/5 relative">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 relative
                                      ${isMax 
                                        ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 shadow-[0_0_8px_rgba(240,79,228,0.6)]' 
                                        : coachActiveTab === 'OFF' 
                                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]' 
                                          : 'bg-gradient-to-r from-orange-500 to-red-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]'}`}
                                    style={{ width: `${progressPct}%` }}
                                  >
                                    {!isMax && <div className="absolute top-0 right-0 w-4 h-full bg-white/40 animate-pulse blur-[1px]"></div>}
                                  </div>
                                </div>
                                <span className="text-[10px] font-black text-zinc-400 font-mono whitespace-nowrap tracking-wider">
                                  {isMax ? 'MAX MASTERED' : `${current.exp} / ${req} EXP`}
                                </span>
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

        {/* --- FREE AGENT AGENCY MARKET MODAL (PREMIUM NBA 2K GLASSMORPHIC STYLE) --- */}
        {showAgentModal && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            {/* Standard non-skewed container for absolute pixel-perfect HD clarity */}
            <div className="w-[880px] h-[610px] rounded-2xl p-6 flex flex-col relative overflow-hidden">
              
              {/* Decoupled Skewed Backdrop & Border (eliminates chromium transform subpixel layout blur!) */}
              <div className="absolute inset-0 bg-zinc-950/95 border-2 border-cyan-500/40 rounded-2xl skew-x-[-6deg] scale-x-[1.04] shadow-[0_0_50px_rgba(6,182,212,0.35)] z-0 pointer-events-none" />
              
              {/* Carbon Grid backdrop & Scanlines */}
              <div className="absolute inset-0 opacity-[0.1] pointer-events-none mix-blend-screen z-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0), radial-gradient(rgba(255, 255, 255, 1) 1px, transparent 0)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 4px 4px' }}></div>
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_15px_cyan] z-0 skew-x-[-6deg] scale-x-[1.04]"></div>
              
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
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-600 to-blue-500 border border-cyan-400 px-6 py-2 rounded-full text-white font-[family-name:var(--font-outfit)] font-black text-xs tracking-wider shadow-[0_0_25px_rgba(6,182,212,0.6)] animate-bounce">
                    {faStatusMessage}
                  </div>
                )}

                {/* Main Content Layout */}
                <div className="flex-1 flex gap-6 min-h-0">
                  
                  {/* Left Column: List of 4 Free Agents */}
                  <div className="w-[380px] flex flex-col gap-3 overflow-y-auto pr-1">
                    <div className="text-[10px] font-black text-cyan-400 tracking-widest uppercase border-b border-cyan-500/20 pb-1.5 mb-1">
                      Available Talents
                    </div>
                    
                    {freeAgents.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl p-6 text-center">
                        <span className="text-zinc-500 text-xs font-semibold">No free agents in this batch.</span>
                        <button onClick={refreshFreeAgents} className="mt-3 px-4 py-1.5 text-[9px] font-black uppercase text-cyan-400 border border-cyan-400/30 rounded hover:bg-cyan-400/10">
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
                                ? 'bg-gradient-to-r from-cyan-950/40 to-zinc-900/60 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]' 
                                : 'bg-zinc-950/80 border-white/5 hover:border-white/20 hover:bg-zinc-900/40'}`}
                          >
                            {/* Card Background Glow for Selected */}
                            {isSelected && <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />}
                            
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
                        <div className="flex gap-4 border-b border-white/[0.04] pb-4 mb-4 shrink-0">
                          <div className="w-24 h-24 rounded-xl bg-gradient-to-b from-cyan-950/80 to-zinc-900 border-2 border-cyan-500/20 relative overflow-hidden flex items-center justify-center shadow-lg">
                            {selectedFaPlayer.imageUrl ? (
                              <img src={selectedFaPlayer.imageUrl} className="w-full h-full object-cover" alt={selectedFaPlayer.name} />
                            ) : (
                              <span className="text-zinc-500 text-3xl font-black">{selectedFaPlayer.position}</span>
                            )}
                            <div className="absolute bottom-1 right-1 bg-zinc-900 border border-white/20 text-white font-black text-[9px] px-1.5 py-0.5 rounded skew-x-[-6deg]">
                              <span className="skew-x-[6deg] block">{selectedFaPlayer.position}</span>
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col justify-center">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-xl font-[family-name:var(--font-outfit)] font-black text-white uppercase italic tracking-wide">
                                {selectedFaPlayer.name}
                              </h3>
                              <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[8px] font-black px-2 py-0.5 rounded uppercase skew-x-[-6deg]">
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
                              ? 'bg-gradient-to-b from-[#06b6d4] to-[#0891b2] border-cyan-400 text-white cursor-pointer hover:scale-[1.02] shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:brightness-110 active:scale-95'
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
                      <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-950/30 border border-cyan-500/20 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                        {formatFaTime(faTimeLeft)}
                      </span>
                    </div>
                    
                    {/* PITY SYSTEM DISPLAY */}
                    <div className="flex items-center gap-1.5 border-l border-white/10 pl-4">
                      <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest" title="Guaranteed Mythic on 50th paid refresh">Pity Status</span>
                      <div className="bg-zinc-900 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-[pulse_2s_ease-in-out_infinite]" />
                        <span className="text-xs font-mono font-black text-rose-400">
                          {faPityCounter} / 50
                        </span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleRefreshFA}
                    className="flex items-center gap-2 px-4 py-2 border border-cyan-500/30 bg-cyan-950/10 rounded-xl hover:bg-cyan-500/20 active:scale-95 transition-all text-cyan-400 hover:text-white font-[family-name:var(--font-outfit)] font-black text-[10px] tracking-wider uppercase italic skew-x-[-8deg]"
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
