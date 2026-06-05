import React from "react";

export interface ItemCardProps {
  id?: string;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  scale?: number;
  selected?: boolean;
  equipped?: boolean;
  locked?: boolean;
  quantity?: number;
  upgradeLevel?: number;
  glowColor?: string;
  showQuantity?: boolean;
  badgeText?: string;
  onClick?: () => void;
  className?: string;
}

export function ItemCard({
  id,
  icon,
  size = "md",
  scale = 1,
  selected = false,
  equipped = false,
  locked = false,
  quantity,
  upgradeLevel,
  glowColor = "#3b82f6", // Default blue glow
  showQuantity = false,
  badgeText,
  onClick,
  className = ""
}: ItemCardProps) {
  
  // Size mapping
  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-28 h-28",
    lg: "w-32 h-32"
  };

  const formatQuantity = (qty: number) => {
    if (qty >= 1000000) return `${(qty/1000000).toFixed(1)}M`;
    if (qty >= 1000) return `${(qty/1000).toFixed(1)}K`;
    return qty;
  };

  return (
    <div
      onClick={onClick}
      className={`${sizeClasses[size]} bg-[#232325] border relative group transition-all overflow-hidden ${selected ? 'border-white' : 'border-[#444] hover:border-[#666]'} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{ transform: `scale(${scale})`, transformOrigin: 'center' }}
    >
      {/* Bottom rarity solid line */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] z-20" style={{ backgroundColor: glowColor }} />
      
      {/* Fading Halftone Background */}
      <div 
        className="absolute inset-0 opacity-80 pointer-events-none mix-blend-screen animate-pulse" 
        style={{ 
          backgroundImage: `radial-gradient(${glowColor} 1px, transparent 1px), radial-gradient(${glowColor} 1px, transparent 1px)`,
          backgroundSize: '10px 10px',
          backgroundPosition: '0 0, 5px 5px',
          maskImage: 'radial-gradient(circle at center, black 10%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 10%, transparent 80%)'
        }} 
      />
      {/* Top gradient fade */}
      <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: `linear-gradient(to bottom, ${glowColor}, transparent 60%)` }} />
      
      {/* Icon Container */}
      <div className="absolute inset-0 flex items-center justify-center pt-2 z-10 drop-shadow-lg">
        {icon}
      </div>
      
      {/* Badges */}
      {(upgradeLevel !== undefined && upgradeLevel > 0) && (
        <div className="absolute top-1 left-1 text-white font-bold text-[10px] bg-black/50 px-1 z-20">
          +{upgradeLevel}
        </div>
      )}
      
      {equipped && (
        <div className="absolute top-1 right-1 text-emerald-400 font-black text-[9px] bg-emerald-900/50 px-1 rounded border border-emerald-500/30 z-20 uppercase">
          Eq
        </div>
      )}

      {locked && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60 border border-white/20 px-2 py-1">Locked</span>
        </div>
      )}

      {showQuantity && quantity !== undefined && (
        <div className="absolute bottom-1 right-0 px-1 text-white font-bold text-[11px] z-20" style={{ textShadow: '1px 1px 2px black, -1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black' }}>
          {formatQuantity(quantity)}
        </div>
      )}

      {badgeText && (
        <div className="absolute bottom-1 left-0 right-0 text-white font-bold text-[9px] text-center uppercase tracking-wider z-20" style={{ textShadow: '1px 1px 2px black, -1px -1px 0 black, 1px -1px 0 black, -1px 1px 0 black, 1px 1px 0 black' }}>
          {badgeText}
        </div>
      )}
    </div>
  );
}
