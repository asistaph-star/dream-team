import React from 'react';
import { Player } from '@/lib/types/player';
import { PlayerCard } from '@/components/player/PlayerCard';

interface SubstitutionModalProps {
  show: boolean;
  onClose: () => void;
  matchRoster: Player[];
  currentLineup: Player[];
  activeLineup: Player[];
  activeReserves: Player[];
  matchState: any;
  cooldownNow: number;
  subCooldownEnd: number;
  subCourtPick: string | null;
  subBenchPick: string | null;
  onConfirm: () => void;
  dragHoverSlotId: string | null;
  draggingPlayerId: string | null;
  setPotentialDragPlayerId: (id: string) => void;
  setDragStartPos: (pos: { x: number; y: number }) => void;
  computeEffective: (lineup: Player[], staminaMap: Record<string, number>, offSt: string, defSt: string) => { off: number; def: number };
  SLOT_POSITIONS: readonly string[];
  courtPositions: Record<string, { x: number; y: number }>;
  getPlayerImage: (p: Player) => string;
  getPlayerMaxStamina: (p: Player) => number;
}

export const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  show,
  onClose,
  matchRoster,
  currentLineup,
  activeLineup,
  activeReserves,
  matchState,
  cooldownNow,
  subCooldownEnd,
  subCourtPick,
  subBenchPick,
  onConfirm,
  dragHoverSlotId,
  draggingPlayerId,
  setPotentialDragPlayerId,
  setDragStartPos,
  computeEffective,
  SLOT_POSITIONS,
  courtPositions,
  getPlayerImage,
  getPlayerMaxStamina,
}) => {
  if (!show) return null;

  const benchPlayers = matchRoster.filter(p => !currentLineup.find(lp => lp.id === p.id));
  
  // Compute Offense and Defense exactly as the match engine does
  let curEff = computeEffective(currentLineup, matchState.playerStamina, matchState.userOffStrategy, matchState.userDefStrategy);
  
  // Calculate Salary for active lineup + reserves
  const currentSalary = [...activeLineup, ...activeReserves].reduce((sum, p) => sum + Math.round(p.salary ?? p.ovr * 12.5), 0);
  const maxSalary = 15000;
  
  const isCooldownActive = cooldownNow < subCooldownEnd;
  
  // Ensure exactly 6 bench slots
  const paddedBench = [...benchPlayers];
  while (paddedBench.length < 6) {
    paddedBench.push(null as any);
  }

  return (
    <div className="fixed inset-0 z-[300] bg-[#1c1d21] flex flex-col font-sans select-none overflow-hidden">
      {/* Global Stone Wall Texture Overlay */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.25] mix-blend-overlay"
        style={{ backgroundImage: 'url(/textures/stone_bg.png)', backgroundSize: 'cover' }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/5 to-transparent z-0" />

      {/* Header */}
      <div className="relative z-20 flex items-center justify-between h-[60px] bg-transparent shrink-0 pr-4 w-full mt-2">
        <div className="absolute bottom-0 left-0 w-[60%] h-[1px] bg-gradient-to-r from-white/40 via-white/5 to-transparent pointer-events-none" />
        
        <div className="flex items-center gap-3 pl-4 cursor-pointer hover:text-gray-300 transition-colors" onClick={onClose}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white drop-shadow-md">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span className="text-[18px] font-bold text-white drop-shadow-md tracking-wide">Starting Lineup</span>
        </div>

        <div className="flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-black text-lg tracking-wider drop-shadow-lg">{curEff.off}</span>
              <span className="text-gray-500 text-[10px] font-bold uppercase">OFF</span>
            </div>
            <div className="h-4 w-[1px] bg-white/20"></div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-[10px] font-bold uppercase">DEF</span>
              <span className="text-blue-400 font-black text-lg tracking-wider drop-shadow-lg">{curEff.def}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-4">
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Team Salary</span>
            <div className="flex items-baseline gap-1">
              <span className="text-white text-[14px] font-bold">{currentSalary.toLocaleString()}</span>
              <span className="text-gray-500 text-[10px]">/ {maxSalary.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-[75px] left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <span className="text-[12px] font-medium tracking-wide text-gray-500">
          Long press to view player info
        </span>
      </div>

      {/* Unified Court and Bench Container */}
      <div className="relative z-10 flex flex-col w-full max-w-[1040px] mx-auto mt-6 mb-8 border border-white/10 bg-[#12141a]/60 rounded-sm">
        {/* Court Display (Half Court mimicking screenshot) */}
        <div className="relative w-full h-[480px] flex items-center justify-center overflow-hidden">
        {/* Wireframe Court Lines mimicking drawing */}
        <div className="absolute inset-0 top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-[550px] h-[450px] border-[2px] border-white/30 overflow-hidden pointer-events-none opacity-40">
          {/* Top center circle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] rounded-full border-[2px] border-white/30" />

          {/* Outer side marks */}
          <div className="absolute top-[140px] left-0 w-[15px] h-[2px] bg-white/30" />
          <div className="absolute top-[140px] right-0 w-[15px] h-[2px] bg-white/30" />

          {/* 3-Point Arc (Center at basket) */}
          <div className="absolute bottom-[40px] left-1/2 -translate-x-1/2 translate-y-1/2 w-[640px] h-[640px] rounded-full border-[2px] border-white/30" />

          {/* Paint (Key) */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[160px] h-[200px] border-[2px] border-white/30 border-b-0" />

          {/* Free throw circle (Top solid, bottom dashed) */}
          <div className="absolute bottom-[120px] left-1/2 -translate-x-1/2 w-[160px] h-[160px]">
              <div className="absolute top-0 left-0 w-full h-1/2 border-[2px] border-b-0 border-white/30 rounded-t-full" />
              <div className="absolute bottom-0 left-0 w-full h-1/2 border-[2px] border-t-0 border-white/30 border-dashed rounded-b-full" />
          </div>

          {/* Paint hash marks (Left) */}
          <div className="absolute bottom-[120px] left-[calc(50%-80px)] w-[10px] h-[2px] bg-white/30 -translate-x-full" />
          <div className="absolute bottom-[100px] left-[calc(50%-80px)] w-[10px] h-[2px] bg-white/30 -translate-x-full" />
          <div className="absolute bottom-[80px] left-[calc(50%-80px)] w-[10px] h-[2px] bg-white/30 -translate-x-full" />
          <div className="absolute bottom-[60px] left-[calc(50%-80px)] w-[10px] h-[2px] bg-white/30 -translate-x-full" />
          {/* Paint hash marks (Right) */}
          <div className="absolute bottom-[120px] left-[calc(50%+80px)] w-[10px] h-[2px] bg-white/30" />
          <div className="absolute bottom-[100px] left-[calc(50%+80px)] w-[10px] h-[2px] bg-white/30" />
          <div className="absolute bottom-[80px] left-[calc(50%+80px)] w-[10px] h-[2px] bg-white/30" />
          <div className="absolute bottom-[60px] left-[calc(50%+80px)] w-[10px] h-[2px] bg-white/30" />

          {/* Basket */}
          <div className="absolute bottom-[32px] left-1/2 -translate-x-1/2 w-[16px] h-[16px] rounded-full border-[2px] border-white/30" />
        </div>

        {/* Active Lineup Players on Court */}
        {currentLineup.map((p, idx) => {
          const slotPos = SLOT_POSITIONS[idx];
          const stam = matchState.playerStamina[p.id] ?? 100;
          
          const coords = courtPositions[slotPos] || { x: 50, y: 50 };
          
          // Hover calculations
          const isHovered = dragHoverSlotId === p.id;
          const draggingPlayer = draggingPlayerId ? matchRoster.find(r => r.id === draggingPlayerId) : null;
          const hoverOffDiff = (isHovered && draggingPlayer) ? draggingPlayer.offense - p.offense : 0;
          const hoverDefDiff = (isHovered && draggingPlayer) ? draggingPlayer.defense - p.defense : 0;
          
          return (
            <div key={p.id} 
              data-drag-id={p.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center transform transition-all cursor-grab active:cursor-grabbing ${isHovered ? 'scale-[1.15] z-40' : 'hover:scale-105 z-20'} ${draggingPlayerId === p.id ? 'opacity-0 pointer-events-none' : ''}`}
              style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
              onPointerDown={(e) => {
                 e.preventDefault();
                 if (isCooldownActive) return;
                 setPotentialDragPlayerId(p.id);
                 setDragStartPos({ x: e.clientX, y: e.clientY });
              }}
            >
              <div className="pointer-events-none relative transition-all">
                 <PlayerCard 
                   player={{ ...p, imageUrl: getPlayerImage(p), stamina: stam }} 
                   tooltipDirection="none" 
                   staminaMax={getPlayerMaxStamina(p)}
                   scale={0.80}
                   selected={isHovered}
                   showPositionBox={true}
                   positionBoxLabel={slotPos}
                 />
                 {isHovered && draggingPlayer && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 bg-[#12141a]/95 border border-white/10 rounded-full px-4 py-1 shadow-[0_0_20px_rgba(0,0,0,0.8)] z-[100] whitespace-nowrap backdrop-blur-sm pointer-events-none">
                       <span className={`text-sm font-black ${hoverOffDiff > 0 ? 'text-[#4ade80]' : hoverOffDiff < 0 ? 'text-[#f87171]' : 'text-gray-400'}`}>
                         {hoverOffDiff > 0 ? `+${hoverOffDiff}` : hoverOffDiff} <span className="text-[10px] text-gray-400 ml-1 tracking-widest">OFF</span>
                       </span>
                       <div className="w-px h-3 bg-white/20" />
                       <span className={`text-sm font-black ${hoverDefDiff > 0 ? 'text-[#4ade80]' : hoverDefDiff < 0 ? 'text-[#f87171]' : 'text-gray-400'}`}>
                         <span className="text-[10px] text-gray-400 mr-1 tracking-widest">DEF</span> {hoverDefDiff > 0 ? `+${hoverDefDiff}` : hoverDefDiff}
                       </span>
                    </div>
                 )}
              </div>
            </div>
          );
        })}
        </div>

      {/* Bench Row (Exactly 7 slots matching screenshot) */}
      <div className="relative z-20 w-full h-[190px] border-t border-white/10 flex items-center justify-center shrink-0 pb-4">
         <div className="flex gap-3 items-end justify-center h-full pt-4 max-w-[1000px] w-full px-8">
            {paddedBench.map((p, idx) => {
              if (!p) {
                 return (
                   <div key={`empty-${idx}`} className="flex-1 max-w-[120px] h-[140px] border border-white/10 bg-white/[0.02] flex flex-col items-center justify-center shadow-inner rounded-sm relative overflow-hidden">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white/80 z-10">
                       <path d="M17 11V7A5 5 0 007 7v4H5v10h14V11h-2zm-8-4a3 3 0 116 0v4H9V7z"></path>
                     </svg>
                   </div>
                 );
              }

              const stam = matchState.playerStamina[p.id] ?? 100;
              const isFouledOut = (matchState.fouledOut ?? []).includes(p.id);
              const statusObj = matchState.injuries[p.id];
              const isDNP = statusObj && (statusObj.status === 'OUT' || statusObj.status === 'DNP');
              const isUnavailable = isFouledOut || isDNP;
              const isHovered = dragHoverSlotId === p.id;
              const draggingPlayer = draggingPlayerId ? matchRoster.find(r => r.id === draggingPlayerId) : null;
              const hoverOffDiff = (isHovered && draggingPlayer) ? draggingPlayer.offense - p.offense : 0;
              const hoverDefDiff = (isHovered && draggingPlayer) ? draggingPlayer.defense - p.defense : 0;

               return (
                <div key={p.id} 
                   data-drag-id={p.id}
                   className={`flex-1 max-w-[120px] h-[140px] border border-white/10 bg-white/[0.02] shadow-inner rounded-sm transition-all cursor-grab active:cursor-grabbing relative flex items-center justify-center overflow-visible ${isHovered ? 'scale-110 z-40 border-white/30 bg-white/5' : 'hover:scale-105 z-20'} ${isUnavailable ? 'opacity-40 grayscale' : draggingPlayerId === p.id ? 'opacity-0 pointer-events-none' : ''}`}
                   onPointerDown={(e) => {
                     if (isUnavailable || isCooldownActive) return;
                     e.preventDefault();
                     setPotentialDragPlayerId(p.id);
                     setDragStartPos({ x: e.clientX, y: e.clientY });
                   }}
                >
                   <div className={`pointer-events-none flex items-center justify-center w-full h-full pb-4 relative`}>
                     <PlayerCard 
                       player={{ ...p, imageUrl: getPlayerImage(p), stamina: stam, isInjured: isUnavailable }} 
                       tooltipDirection="none" 
                       staminaMax={getPlayerMaxStamina(p)}
                       scale={0.70}
                       selected={isHovered}
                     />
                     {isHovered && draggingPlayer && (
                       <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 bg-[#12141a]/95 border border-white/10 rounded-full px-4 py-1 shadow-[0_0_20px_rgba(0,0,0,0.8)] z-[100] whitespace-nowrap backdrop-blur-sm pointer-events-none">
                          <span className={`text-sm font-black ${hoverOffDiff > 0 ? 'text-[#4ade80]' : hoverOffDiff < 0 ? 'text-[#f87171]' : 'text-gray-400'}`}>
                            {hoverOffDiff > 0 ? `+${hoverOffDiff}` : hoverOffDiff} <span className="text-[10px] text-gray-400 ml-1 tracking-widest">OFF</span>
                          </span>
                          <div className="w-px h-3 bg-white/20" />
                          <span className={`text-sm font-black ${hoverDefDiff > 0 ? 'text-[#4ade80]' : hoverDefDiff < 0 ? 'text-[#f87171]' : 'text-gray-400'}`}>
                            <span className="text-[10px] text-gray-400 mr-1 tracking-widest">DEF</span> {hoverDefDiff > 0 ? `+${hoverDefDiff}` : hoverDefDiff}
                          </span>
                       </div>
                     )}
                   </div>
                   {isFouledOut && <div className="absolute bottom-1 right-1 text-red-400 text-[10px] font-bold bg-black/80 px-1 border border-red-500/50 shadow-md">DQ</div>}
                   {isDNP && <div className="absolute bottom-1 right-1 text-red-400 text-[10px] font-bold bg-black/80 px-1 border border-red-500/50 shadow-md">DNP</div>}
                </div>
              );
            })}
         </div>
      </div>
      </div>

      {/* Cooldown Timer Overlay for Subs (if active) */}
      {isCooldownActive && (
         <div className="absolute right-8 bottom-[180px] pointer-events-none text-red-400 font-bold text-[12px] tracking-wider uppercase drop-shadow-md bg-black/40 px-3 py-1 rounded-sm border border-red-500/30">
            SUB CD: {Math.ceil((subCooldownEnd - cooldownNow) / 1000)}s
         </div>
      )}

    </div>
  );
};
