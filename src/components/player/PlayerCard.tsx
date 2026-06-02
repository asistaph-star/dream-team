import { useState } from "react";
import { Player, PlayerRarity } from "@/lib/types/player";
import { getTierRating, getTierColor, mockPlayers } from "@/lib/data/mockPlayers";
import { useGameState } from "@/lib/context/GameStateContext";
import { getDerivedOffenseDefense } from "@/lib/utils/starGrowth";
import { SkillBadge, SkillBadgeColor, skillQualityStyles, skillBadgeStyles } from "@/components/skills/SkillBadge";

// Inject CSS styles globally exactly once to prevent React drag-and-drop from unmounting/remounting <style> tags
if (typeof document !== 'undefined' && !document.getElementById('dt-star-styles')) {
  const style = document.createElement('style');
  style.id = 'dt-star-styles';
  style.innerHTML = `
    .gold-3d-border {
      border-width: 1.5px !important;
      border-top-color: #fef08a !important;
      border-left-color: #fef08a !important;
      border-bottom-color: #a16207 !important;
      border-right-color: #a16207 !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.8), inset 0 0 2px rgba(0,0,0,0.5);
    }
    @keyframes starPulseOrange {
      0%, 100% { filter: drop-shadow(0 0 2px rgba(249,115,22,0.4)); }
      50% { filter: drop-shadow(0 0 8px rgba(249,115,22,1)); }
    }
    @keyframes starPulseRed {
      0%, 100% { filter: drop-shadow(0 0 2px rgba(239,68,68,0.4)); }
      50% { filter: drop-shadow(0 0 8px rgba(239,68,68,1)); }
    }
    @keyframes starShine {
      0% { transform: translateX(-150%) rotate(45deg); opacity: 0; }
      10% { opacity: 1; }
      20% { transform: translateX(150%) rotate(45deg); opacity: 0; }
      100% { transform: translateX(150%) rotate(45deg); opacity: 0; }
    }
    .tier-orange-star {
      animation: starPulseOrange 2s ease-in-out infinite;
      animation-delay: calc(var(--star-index, 0) * 0.15s);
    }
    .tier-red-star {
      animation: starPulseRed 2s ease-in-out infinite;
      animation-delay: calc(var(--star-index, 0) * 0.15s);
    }
    .star-shine-effect {
      background: linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent);
      animation: starShine 3s infinite;
      animation-delay: calc(var(--star-index, 0) * 0.15s);
    }
    @media (prefers-reduced-motion: reduce) {
      .tier-orange-star, .tier-red-star, .star-shine-effect {
        animation: none;
        filter: drop-shadow(0 0 5px rgba(255,255,255,0.5));
      }
    }
  `;
  document.head.appendChild(style);
}

import { SpecialSkillName } from "@/lib/skills/assignBaseSkills";
import { getSkillQualityRate, isSkillQuality, SKILL_QUALITY_ORDER, SkillQuality, SPECIAL_SKILL_RATES } from "@/lib/skills/skillCatalog";

interface PlayerCardProps {
  player: Player;
  tooltipDirection?: "left" | "right" | "none";
  tooltipScale?: number;
  isDragOverlay?: boolean;
  staminaMax?: number;
  scale?: number;
  showPositionBox?: boolean;
  positionBoxLabel?: string;
  selected?: boolean;
}

const rarityColors: Record<PlayerRarity, string> = {
  Common: "from-gray-500 to-gray-700 border-gray-400 glow-none text-gray-300",
  Rare: "from-blue-500 to-blue-700 border-blue-400 glow-cyan text-blue-300",
  Epic: "from-purple-500 to-purple-800 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)] text-purple-300",
  Legendary: "from-yellow-400 to-orange-600 border-yellow-300 glow-gold text-yellow-300",
  Mythic: "from-red-500 to-red-900 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.7)] text-red-300",
};

const posBadgeGradients: Record<PlayerRarity, string> = {
  Common: "from-[#cfa030] to-[#8f6514]",
  Rare: "from-[#cfa030] to-[#8f6514]",
  Epic: "from-[#cfa030] to-[#8f6514]",
  Legendary: "from-[#cfa030] to-[#8f6514]",
  Mythic: "from-[#cfa030] to-[#8f6514]",
};

const firstNameColors: Record<PlayerRarity, string> = {
  Common: "text-gray-400",
  Rare: "text-cyan-400 font-bold",
  Epic: "text-purple-300 font-bold",
  Legendary: "text-yellow-400 font-bold",
  Mythic: "text-red-300 font-black",
};

const lastNameColors: Record<PlayerRarity, string> = {
  Common: "text-gray-200 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)]",
  Rare: "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]",
  Epic: "text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]",
  Legendary: "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]",
  Mythic: "text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.7)]",
};

export const getStarTierAndLevel = (starLevel: number) => {
  if (!starLevel || starLevel === 0) return { tier: "None", level: 0, colorClass: "" };
  const index = starLevel - 1;
  const tierIndex = Math.min(4, Math.floor(index / 5));
  const level = (index % 5) + 1;

  const tiers = [
    { name: "Silver", color: "border-slate-300 bg-slate-400 shadow-[0_0_5px_rgba(203,213,225,0.85)]" },
    { name: "Blue", color: "border-blue-400 bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.85)]" },
    { name: "Violet", color: "border-purple-400 bg-purple-600 shadow-[0_0_5px_rgba(168,85,247,0.85)]" },
    { name: "Orange", color: "border-orange-400 bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.85)]" },
    { name: "Red", color: "border-red-400 bg-red-600 shadow-[0_0_5px_rgba(239,68,68,0.85)]" }
  ];

  return {
    tier: tiers[tierIndex]?.name || "Red",
    level,
    colorClass: tiers[tierIndex]?.color || "border-red-400 bg-red-600 shadow-[0_0_5px_rgba(239,68,68,0.85)]"
  };
};

export function PlayerCard({ 
  player: initialPlayer, 
  tooltipDirection = "right", 
  tooltipScale, 
  isDragOverlay = false, 
  staminaMax,
  scale = 1,
  showPositionBox = false,
  positionBoxLabel,
  selected = false
}: PlayerCardProps) {
  const [showFireConfirm, setShowFireConfirm] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const { roster, firePlayer } = useGameState();

  const player = roster.find(p => p.id === initialPlayer.id) || initialPlayer;
  const tierRating = getTierRating(player.ovr);
  const tierColor = getTierColor(tierRating);
  const mainStarInfo = getStarTierAndLevel(player.starLevel ?? 0);
  const currentStamina = player.stamina ?? 100;
  const effectiveStaminaMax = Math.max(100, Math.round(staminaMax ?? currentStamina));
  const staminaPct = Math.max(0, Math.min(100, (currentStamina / effectiveStaminaMax) * 100));

  // Split name for NBA 2K stacked name style
  const nameParts = player.name.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const handleConfirmFire = () => {
    setModalError(null);
    const result = firePlayer(player.id);
    if (result.success) {
      setShowFireConfirm(false);
    } else {
      setModalError(result.error || "Failed to fire player");
    }
  };

  return (
    <>
      <div 
        className={`group relative w-[120px] h-[124px] cursor-pointer transform hover:-translate-y-1.5 transition-all duration-300 z-10 hover:z-50 bg-transparent origin-center ${selected ? 'ring-[3px] ring-white/80 shadow-[0_0_30px_rgba(255,255,255,0.4)] rounded-[14px]' : ''}`}
        style={{ transform: `scale(${scale})` }}
      >
        {/* 1. TOP-LEFT OVR & POSITION (Crisp & Clean Match Style) */}
        <div className="absolute top-1 left-1 z-[60] flex flex-col items-center select-none font-sans">
          <span className="text-white text-[16px] font-extrabold leading-none tracking-tighter drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.8)] mb-[1px]">
            {player.ovr}
          </span>
          <span className={`bg-gradient-to-b ${posBadgeGradients[player.rarity]} text-white text-[8px] font-bold px-[4px] py-[0.5px] rounded-[1px] shadow-[0_1px_2px_rgba(0,0,0,0.6)] leading-none select-none`}>
            {player.position}
          </span>
        </div>

        {/* 2. FROSTED INJURY OVERLAY (OUT Indicator) */}
        {player.isInjured && (
          <div className="absolute top-1 right-1 z-[60] bg-rose-600/90 border border-red-400 text-white text-[7.5px] font-black px-1.5 py-0.5 rounded shadow-[0_1px_4px_rgba(220,38,38,0.6)] animate-pulse select-none uppercase tracking-wider">
            ⚠️ OUT
          </div>
        )}

        {/* 3. DYNAMIC HEADSHOT (using match gameplay's robust backgroundImage masking) */}
        <div
          className="absolute bottom-[28px] left-0 w-full h-[115px] z-[40]"
          style={{
            backgroundImage: `url('${imageError ? "/players/placeholder.png" : (player.imageUrl ? (player.imageUrl.startsWith("http") ? player.imageUrl : `https://www.dreamteamph.com/${player.imageUrl.startsWith("/") ? player.imageUrl.slice(1) : player.imageUrl}`) : "/players/placeholder.png")}')`,
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            filter: player.isInjured ? 'grayscale(0.6) contrast(1.1) brightness(0.7)' : 'none'
          }}
        ></div>

        {/* 3.5. VERTICAL STACK OF 5 STAR-UP DIAMONDS ON THE RIGHT EDGE */}

        <div className="absolute right-[5px] top-[26px] flex flex-col gap-[4.5px] z-[55] select-none">
          {/* Localized Fire Aura behind the stars for max mastery */}
          {mainStarInfo.tier === 'Red' && mainStarInfo.level === 5 && (
            <div className={`absolute inset-[-4px] z-[-1] pointer-events-none blur-[6px] bg-red-600/30 rounded-full ${isDragOverlay ? '' : 'animate-pulse'}`} />
          )}
          {mainStarInfo.tier === 'Orange' && mainStarInfo.level === 5 && (
            <div className={`absolute inset-[-4px] z-[-1] pointer-events-none blur-[6px] bg-orange-500/30 rounded-full ${isDragOverlay ? '' : 'animate-pulse'}`} />
          )}
          
          {[5, 4, 3, 2, 1].map((lvl, index) => {
            const starInfo = getStarTierAndLevel(player.starLevel ?? 0);
            const isActive = starInfo.level >= lvl;
            const isOrange = mainStarInfo.tier === 'Orange'; // Permanently attach to node based on tier
            const isRed = mainStarInfo.tier === 'Red'; // Permanently attach to node based on tier
            const tierClass = isOrange ? 'tier-orange-star' : isRed ? 'tier-red-star' : '';
            
            return (
              <div
                key={`star-${index}`}
                className={`relative rotate-45 transition-all duration-300 ${tierClass} ${
                  isActive
                    ? `${starInfo.colorClass} gold-3d-border`
                    : "border border-gray-800 bg-black/85"
                }`}
                style={{
                  width: isActive ? '8px' : '6px',
                  height: isActive ? '8px' : '6px',
                  '--star-index': index,
                  ...(isDragOverlay ? { animation: 'none' } : {})
                } as React.CSSProperties}
              >
                {/* Always render shine element so DOM doesn't remount, hide with opacity if not active */}
                <div className={`absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-300 ${isActive && tierClass && !isDragOverlay ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] pointer-events-none star-shine-effect" />
                </div>
              </div>
            );
          })}
        </div>

        {/* 4. MATCH STYLE INFO PANEL */}
        <div className="absolute bottom-0 left-0 w-full h-[38px] box-border bg-[#0f0f14]/85 backdrop-blur-[6px] border-t border-white/5 rounded-b-[8px] flex flex-col overflow-hidden z-[50]">

          {/* Stamina Bar */}
          <div className="relative w-full h-[4px] bg-gradient-to-r from-red-500 via-orange-500 to-emerald-500 overflow-hidden">
            <div
              className="absolute top-0 right-0 h-full bg-[#1f2937] transition-all duration-1000"
              style={{ width: `${100 - staminaPct}%` }}
            />
          </div>

          {/* BOTTOM NAME CENTERED */}
          <div className="flex-1 w-full flex flex-col items-center justify-center py-[3px] px-[8px] cursor-default text-center font-sans">
            <span className={`${firstNameColors[player.rarity] || 'text-[#cfa030]'} text-[7px] font-bold uppercase tracking-[0.3px] leading-none mb-[1.5px] truncate w-full`}>
              {firstName}
            </span>
            <span className={`${lastNameColors[player.rarity] || 'text-white'} text-[11px] font-extrabold uppercase leading-none tracking-tight truncate w-full`}>
              {lastName}
            </span>
          </div>
        </div>


        {/* Hover Side Popover */}
        {tooltipDirection !== "none" && (
          <div
            className={`absolute -top-12 ${tooltipDirection === "right" ? "left-full ml-2 origin-left" : "right-full mr-2 origin-right"} z-40 w-64 bg-[#070b19]/95 backdrop-blur-md border border-gray-600 rounded-lg p-3 hidden group-hover:flex flex-col justify-between text-xs animate-[fadeIn_0.15s_ease-out] select-none pointer-events-auto shadow-2xl`}
            style={{ transform: tooltipScale ? `scale(${tooltipScale})` : "none" }}
          >
            <StatsContent
              player={player}
              tierColor={tierColor}
              tierRating={tierRating}
              isHover={true}
              onFireClick={() => setShowFireConfirm(true)}
              onClose={() => { }}
            />
          </div>
        )}
        
        {/* PREMIUM STADIUM SLOT LABEL */}
        {showPositionBox && positionBoxLabel && (
          <PlayerPositionBadge label={positionBoxLabel} />
        )}
      </div>

      {/* 5. PREMIUM GLASSMORPHIC DISMISS CONFIRMATION MODAL */}
      {showFireConfirm && (
        <div
          onClick={(e) => { e.stopPropagation(); setShowFireConfirm(false); }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-[3px] flex items-center justify-center font-sans"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-[380px] p-6 bg-[#0a0f1d]/95 border-2 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center text-center backdrop-blur-md relative ${player.starLevel === 5 ? 'border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.2)]' : 'border-red-500/40 shadow-[0_0_50px_rgba(239,68,68,0.3)]'}`}
          >
            <h3 className={`text-xl font-black tracking-widest mb-1 uppercase bg-clip-text text-transparent ${player.starLevel === 5 ? 'bg-gradient-to-r from-orange-400 to-amber-600' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}>Dismiss Roster Card?</h3>
            <p className="text-xs text-gray-400 font-mono mb-4">Are you sure you want to dismiss this asset from your squad?</p>

            {/* Player Mini-Card Preview */}
            <div className="flex items-center gap-4 bg-black/50 p-3 rounded-lg border border-red-500/20 w-full mb-6">
              <div className="w-12 h-12 rounded-full border border-orange-500/40 overflow-hidden bg-slate-800 shrink-0">
                <img
                  src={player.imageUrl ? (player.imageUrl.startsWith("http") ? player.imageUrl : `https://www.dreamteamph.com/${player.imageUrl.startsWith("/") ? player.imageUrl.slice(1) : player.imageUrl}`) : "/players/placeholder.png"}
                  alt={player.name}
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-black text-sm truncate leading-tight">{player.name}</div>
                <div className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase tracking-wide">{player.position} | OVR {player.ovr}</div>
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="w-full bg-[#060b13] border border-white/5 rounded-xl p-3 mb-4 text-left font-mono text-xs flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Market Price:</span>
                <span className="text-white font-bold">{player.price ?? 2500} TF</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Refund Status:</span>
                <span className={player.isInjured ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                  {player.isInjured ? "95% (Injured Asset Tax)" : "100% (Healthy)"}
                </span>
              </div>
              <div className="h-[1px] bg-white/10 my-1" />
              <div className="flex justify-between text-sm">
                <span className="text-gray-300 font-bold">Total Refund:</span>
                <span className="text-[#eab308] font-black">{Math.floor((player.price ?? 2500) * (player.isInjured ? 0.95 : 1))} TF</span>
              </div>

              {player.isInjured && (
                <div className="mt-2 text-[9px] bg-rose-500/10 border border-rose-500/20 text-rose-400 p-2 rounded leading-tight font-sans font-extrabold text-center uppercase tracking-wide">
                  ⚠️ INJURED ASSET DUMP PENALTY applied (5% TAX)
                </div>
              )}
            </div>

            {/* Error Message Section */}
            {modalError && (
              <div className="w-full mb-4 p-2.5 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-400 text-[10px] font-bold text-center leading-snug animate-[shake_0.2s_ease-in-out]">
                {modalError}
              </div>
            )}

            {/* Actions */}
            <div className="flex w-full gap-3">
              <button
                onClick={() => setShowFireConfirm(false)}
                className="flex-1 py-2 rounded-xl bg-gray-800 text-white font-bold text-[10px] uppercase hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Keep Player
              </button>
              <button
                onClick={handleConfirmFire}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-black text-[10px] uppercase shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:from-red-500 hover:to-rose-600 transition-all cursor-pointer"
              >
                Confirm Dismiss
              </button>
            </div>
          </div>
        </div>
      )}


    </>
  );
}

interface StatsContentProps {
  player: Player;
  tierColor: string;
  tierRating: string;
  isHover: boolean;
  onFireClick: () => void;
  onClose: () => void;
}

function getPreviewBaseSkills(player: Player): [string, string, string] {
  if ((player.apg ?? 0) >= 6 || player.playmaking >= 88) {
    return ["Tempo Surgeon", player.defense >= 160 ? "Help Wall" : "Screen Breaker", "Complete Engine"];
  }
  if ((player.bpg ?? 0) >= 1.5 || player.defense >= 185) {
    return ["Paint Magnet", "Rim Warden", "Iron Motor"];
  }
  if (player.shooting >= 88 || (player.ppg ?? 0) >= 25) {
    return ["Arc Pressure", "Shadow Guard", "Complete Engine"];
  }
  if ((player.spg ?? 0) >= 1.3 || player.speed >= 88) {
    return ["Mismatch Caller", "Hands Active", "Tempo Switch"];
  }
  return ["Glass Touch", "Discipline Wall", "Connector Hub"];
}

function StatsContent({ player, tierColor, tierRating, isHover, onFireClick, onClose }: StatsContentProps) {
  const { inventory } = useGameState();
  const fallbackBaseSkills = getPreviewBaseSkills(player);
  const baseSkills = player.baseSkills ?? fallbackBaseSkills;
  const specialSkills = player.specialSkillSlots ?? [];
  const starLevel = player.starLevel ?? 0;
  const skillTapeCount = inventory.materials.skill_tape ?? 0;
  const basePlayer = mockPlayers.find(p => p.id === player.id) ?? mockPlayers.find(p => p.name === player.name && p.position === player.position);
  const baseDerived = getDerivedOffenseDefense(basePlayer ?? player);
  const baseOffense = baseDerived.offense;
  const baseDefense = baseDerived.defense;
  const baseStamina = basePlayer?.stamina ?? 100;
  const offenseBonus = Math.max(0, Math.round((player.offense ?? baseOffense) - baseOffense));
  const defenseBonus = Math.max(0, Math.round((player.defense ?? baseDefense) - baseDefense));
  const staminaBonus = Math.max(0, Math.floor((player.stamina ?? baseStamina) - baseStamina));

  const StatWithBonus = ({ base, bonus }: { base: number; bonus: number }) => (
    <span className="font-extrabold flex items-baseline gap-1">
      <span className="text-white">{Math.round(base)}</span>
      {bonus > 0 && <span className="text-emerald-400 text-[9px] font-black">+{bonus}</span>}
    </span>
  );

  return (
    <>
      {/* Live Injury Name Display */}
      {player.isInjured && (
        <div className="w-full bg-rose-500/15 border border-rose-500/35 text-rose-400 text-[9px] font-black uppercase tracking-wider p-1 rounded text-center mb-1">
          OUT: {player.injuryName || "Resting"}
        </div>
      )}

      {/* Economy and calculated Attributes */}
      <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10.5px] text-gray-300 font-mono py-1 leading-tight">
        <div className="flex gap-1 items-center">
          <span className="text-gray-400 font-semibold font-sans">Rating:</span>
          <span style={{ color: tierColor }} className="font-black">{tierRating}</span>
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-gray-400 font-semibold font-sans">Stamina:</span>
          <StatWithBonus base={baseStamina} bonus={staminaBonus} />
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-gray-400 font-semibold font-sans">Offense:</span>
          <StatWithBonus base={baseOffense} bonus={offenseBonus} />
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-gray-400 font-semibold font-sans">Salary:</span>
          <span className="text-white font-extrabold">{player.salary ?? 500}</span>
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-gray-400 font-semibold font-sans">Defense:</span>
          <StatWithBonus base={baseDefense} bonus={defenseBonus} />
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-gray-400 font-semibold font-sans">Price:</span>
          <span className="text-white font-extrabold flex gap-0.5 items-center">
            {player.price ?? 2500}
            {player.priceTrend === 'up' && <span className="text-emerald-500 font-black">↑</span>}
            {player.priceTrend === 'down' && <span className="text-rose-500 font-black">↓</span>}
          </span>
        </div>
      </div>

      {/* White Divider Line */}
      <div className="h-[1px] bg-white/20 my-1" />

      {/* Core Peak Basketball Stats Grid */}
      <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 text-[10.5px] font-mono text-gray-200 leading-tight">
        <div className="flex gap-1 items-center">
          <span className="text-gray-400">PPG:</span>
          <span className="font-extrabold text-white">{player.ppg?.toFixed(1) ?? '0.0'}</span>
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-gray-400">AST:</span>
          <span className="font-extrabold text-white">{player.apg?.toFixed(1) ?? '0.0'}</span>
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-gray-400">RPG:</span>
          <span className="font-extrabold text-white">{player.rpg?.toFixed(1) ?? '0.0'}</span>
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-gray-400">STL:</span>
          <span className="font-extrabold text-white">{player.spg?.toFixed(1) ?? '0.0'}</span>
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-gray-400">BLK:</span>
          <span className="font-extrabold text-white">{player.bpg?.toFixed(1) ?? '0.0'}</span>
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-gray-400">TO:</span>
          <span className="font-extrabold text-white">{player.topg?.toFixed(1) ?? '0.0'}</span>
        </div>

        <div className="col-span-2 border-t border-gray-700/50 pt-2 mt-1">
          <div className="flex items-center justify-between gap-2">
            {baseSkills.map((skillName, index) => (
              <SkillBadge
                key={`${skillName}-${index}`}
                name={skillName}
                color={index === 0 ? "red" : index === 1 ? "blue" : "green"}
                locked={index === 2 && player.ovr < 85}
              />
            ))}
            {[0, 1].map(index => {
              const unlockStar = index === 0 ? 1 : 5;
              const isStarLocked = starLevel < unlockStar;
              const hasLearnedSkill = Boolean(specialSkills[index]);
              const skillName = specialSkills[index] ?? "Learn";
              const locked = isStarLocked;
              const savedQuality = player.skillRarities?.[skillName];
              const quality = isSkillQuality(savedQuality) ? savedQuality : "Common";
              const maxRate = hasLearnedSkill ? SPECIAL_SKILL_RATES[skillName as SpecialSkillName] : undefined;
              return (
                <SkillBadge
                  key={`special-${index}-${skillName}`}
                  name={skillName}
                  color="special"
                  locked={locked}
                  unlockText={`Star ${unlockStar}`}
                  quality={quality}
                />
              );
            })}
          </div>
        </div>

        {/* Actions Button Row */}
        <div className="flex justify-evenly font-bold col-span-2 mt-2 border-t border-gray-700/50 pt-2 w-full gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onFireClick(); }}
            className="text-red-500 hover:text-red-400 uppercase tracking-wide cursor-pointer bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-2 py-0.5 rounded text-[9px] font-black"
          >
            Dismiss
          </button>
          {!isHover && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="text-gray-400 hover:text-gray-300 uppercase tracking-wide cursor-pointer bg-gray-800/40 border border-gray-700/40 px-2 py-0.5 rounded text-[9px] font-black"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function PlayerPositionBadge({ label }: { label: string }) {
  const isOOP = label.includes('(OOP)');
  const displayLabel = label.replace(' (OOP)', '');
  
  return (
    <div className="absolute -bottom-[26px] left-[50%] -translate-x-[50%] w-[120px] h-[24px] flex items-center justify-center rounded-[4px] border border-white/20 shadow-[0_4px_10px_rgba(0,0,0,0.8)] overflow-hidden pointer-events-none z-[70]">
      {/* Dark Faceted Glass Base */}
      <div className="absolute inset-0 bg-[#1e1e24]">
        {/* Low Poly / Glass Facets */}
        <div className="absolute inset-0 bg-white/[0.04]" style={{ clipPath: "polygon(0 0, 65% 0, 35% 100%)" }}></div>
        <div className="absolute inset-0 bg-black/[0.25]" style={{ clipPath: "polygon(40% 100%, 100% 0, 100% 100%)" }}></div>
        <div className="absolute inset-0 bg-white/[0.06]" style={{ clipPath: "polygon(55% 0, 100% 0, 85% 100%)" }}></div>
        <div className="absolute inset-0 bg-black/[0.15]" style={{ clipPath: "polygon(0 100%, 35% 0, 65% 100%)" }}></div>
        
        {/* Soft Glass Edge Sheen */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </div>
      
      {/* Clean, Premium Typography */}
      <span className={`relative z-10 font-sans text-[13px] font-black uppercase tracking-[0.2em] drop-shadow-[0_2px_4px_rgba(0,0,0,1)] ${isOOP ? 'text-red-400' : 'text-white'}`}>
        {displayLabel}
        {isOOP && <span className="text-[9px] ml-1 opacity-80">OOP</span>}
      </span>
    </div>
  );
}
