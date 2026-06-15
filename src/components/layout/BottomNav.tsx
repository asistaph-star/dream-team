"use client";

import { 
  ShoppingCart, 
  ClipboardEdit, 
  Store, 
  Shield, 
  Trophy, 
  DoorOpen, 
  User, 
  Package,
  Lock,
  Crown,
  Compass,
  Star
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useContext } from "react";
import { GameViewportContext, useGameViewportScale } from "@/components/layout/GameViewport";
import { useGameState } from "@/lib/context/GameStateContext";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
  const viewportContext = useContext(GameViewportContext);
  const isInside = viewportContext?.isInsideStage ?? false;
  const { visibleRect, baseWidth, baseHeight } = useGameViewportScale();
  const { accountLevel, accountExp } = useGameState();

  useEffect(() => {
    const saved = localStorage.getItem('bottomNavPos');
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch (e) {}
    } else {
      // Default to bottom center
      setPosition({ 
        x: window.innerWidth / 2 - 500, 
        y: window.innerHeight - 84 
      });
    }
  }, []);

  // Hide the global BottomNav on Stadium (/) and Match (/match) pages when outside stage,
  // because they manually render their own localized instances inside the GameStage.
  if (!isInside && (pathname === '/' || pathname === '/match')) {
    return null;
  }

  // Don't render global nav until client-side position is loaded to avoid hydration mismatch
  if (!isInside && !position) return null;

  const isCompact = isInside && visibleRect.width < 950;
  const isVeryCompact = isInside && visibleRect.width < 700;

  const navStyle = isInside
    ? {
        left: `${baseWidth / 2}px`,
        transform: `translateX(-50%) scale(var(--bottom-nav-stage-scale, 1))`,
        transformOrigin: 'bottom center',
        bottom: `${baseHeight - visibleRect.bottom + 20}px`,
        position: 'absolute' as const,
        width: '100%',
        maxWidth: `min(1100px, calc(${visibleRect.width}px - 48px))`,
      }
    : {
        left: `${position?.x ?? 0}px`,
        top: `${position?.y ?? 0}px`,
        position: 'fixed' as const,
        width: '100%',
        maxWidth: '1100px',
      };

  const navItems = [
    { icon: DoorOpen, label: "Stadium", href: "/", locked: false },
    { icon: Package, label: "Warehouse", href: "/inventory", locked: false },
    { icon: User, label: "Player", href: "/player", locked: false },
    { icon: Store, label: "Trade", href: "/trade", locked: true },
    { icon: Shield, label: "League", href: "/alliance", locked: true },
    { icon: ShoppingCart, label: "Shop", href: "/shop", locked: true },
  ];

  return (
    <nav 
      id="global-bottom-nav"
      className={`${isInside ? 'absolute' : 'fixed'} z-40 ${isVeryCompact ? 'h-[48px]' : 'h-[64px]'} bg-[#0a0d14]/90 backdrop-blur-md border border-cyan-500/10 rounded-2xl flex items-center justify-between shadow-[0_-5px_25px_rgba(6,182,212,0.15),_0_15px_40px_rgba(0,0,0,0.9)] px-4 select-none`}
      style={navStyle}
    >
      {/* Carbon Grid / Tech Matrix Background texture */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,255,255,0.06),_rgba(255,255,255,0.02))] bg-[length:100%_4px,_6px_100%]" />
        <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
      </div>

      {/* --- LEFT SECTION: PROFILE AVATAR CARD (Angled MLBB Style) --- */}
      {!isVeryCompact && (
        <div className="relative z-10 flex items-center h-full mr-2 shrink-0">
          <div 
            className="relative h-[80px] w-[170px] mt-[-16px] group transition-transform duration-300 hover:scale-105"
            style={{ filter: 'drop-shadow(3px 3px 8px rgba(0,0,0,0.5))' }}
          >
            {/* Skewed Backdrop frame */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-950/90 to-slate-900/90 border-2 border-cyan-500/30 skew-x-[-12deg] rounded-md shadow-[inset_0_0_15px_rgba(6,182,212,0.2)] pointer-events-none" />
            
            {/* Unskewed content inside the slanted frame */}
            <div className="absolute inset-0 flex items-center px-3 gap-2.5">
              {/* Avatar Frame with metallic cyan ring */}
              <div className="relative w-[42px] h-[42px] shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full p-[1.5px] shadow-[0_0_8px_rgba(34,211,238,0.6)]">
                  <div className="w-full h-full bg-slate-950 rounded-full overflow-hidden">
                    <img 
                      alt="Player" 
                      src="/avatar/avatar3.webp" 
                      className="w-[125%] h-[125%] object-cover scale-110 ml-[2px] mt-[2px]" 
                      onError={(e) => { e.currentTarget.src = "https://ui-avatars.com/api/?name=2K&background=000&color=fff" }} 
                    />
                  </div>
                </div>
                {/* Mini Diamond Level Tag */}
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-yellow-400 to-amber-500 border border-slate-900 rounded-sm px-1 py-[1px] flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  <span className="text-[9px] font-black text-slate-950 font-[family-name:var(--font-outfit)] leading-none">{accountLevel}</span>
                </div>
              </div>

              {/* Player Nickname & EXP Bar */}
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <span className="font-[family-name:var(--font-outfit)] font-black text-[12px] tracking-wider text-cyan-400 uppercase truncate leading-none mb-1 shadow-sm">
                  STUDENT
                </span>
                
                {/* Progress bar */}
                <div className="relative w-full h-[5px] bg-slate-950 rounded-full border border-white/5 overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_5px_rgba(34,211,238,0.8)]" 
                    style={{ width: `${(accountExp / 1000) * 100}%` }}
                  />
                </div>
                <span className="text-[7.5px] text-zinc-400 font-bold uppercase tracking-wider mt-1 text-right tabular-nums">
                  {accountExp}/1000
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CENTER SECTION: SLANTED MENU ITEMS --- */}
      <div className="flex-1 flex items-center justify-center h-full relative z-10 px-2 gap-0.5">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <div key={index} className="flex items-center h-full">
              <Link 
                href={item.locked ? '#' : item.href}
                className={`h-[40px] px-3.5 flex items-center justify-center gap-2 rounded-lg relative transition-all duration-200 skew-x-[-12deg] border border-transparent ${
                  item.locked 
                    ? 'cursor-not-allowed opacity-45 hover:bg-white/5' 
                    : 'cursor-pointer hover:bg-cyan-500/10 hover:border-cyan-500/20'
                } ${
                  isActive && !item.locked 
                    ? 'bg-gradient-to-b from-cyan-950/50 to-cyan-800/20 border-cyan-500/30 shadow-[inset_0_0_10px_rgba(6,182,212,0.15),_0_0_15px_rgba(6,182,212,0.1)]' 
                    : ''
                }`}
                onClick={(e) => { if (item.locked) e.preventDefault(); }}
              >
                {/* Counter-skew content so text/icons look perfectly normal */}
                <div className="skew-x-[12deg] flex items-center gap-2">
                  <div className="relative flex items-center justify-center">
                    <Icon size={isVeryCompact ? 16 : 18} className={isActive && !item.locked ? 'text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-zinc-400'} strokeWidth={2.5} />
                  </div>
                  
                  {!isCompact && (
                    <span className={`text-[13px] font-black uppercase tracking-widest ${isActive && !item.locked ? 'text-white' : 'text-zinc-400'}`}>
                      {item.label}
                    </span>
                  )}
                  {item.locked && (
                    <Lock size={11} className="text-zinc-500 shrink-0" strokeWidth={3} />
                  )}
                </div>
              </Link>
              
              {/* Slanted Divider Line */}
              {index < navItems.length - 1 && (
                <div className="w-[1px] h-[22px] bg-cyan-500/15 skew-x-[-12deg] mx-1 shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* --- RIGHT SECTION: BIG ACTION BUTTONS (MLBB MODE / RANKED) --- */}
      <div className="relative z-10 flex items-center h-full gap-2 shrink-0 pl-2">
        {/* SMALL "MODE" BUTTON */}
        {!isVeryCompact && (
          <div 
            className="h-[46px] w-[64px] bg-gradient-to-b from-cyan-600/90 to-cyan-900/90 hover:from-cyan-500 hover:to-cyan-800 border border-cyan-400/40 skew-x-[-12deg] rounded flex flex-col items-center justify-center cursor-pointer transition-all duration-200 shadow-md active:scale-95 group hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            onClick={() => router.push('/match')}
          >
            <div className="skew-x-[12deg] flex flex-col items-center leading-none">
              <Compass size={14} className="text-white mb-0.5 group-hover:rotate-45 transition-transform" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest mt-0.5">Mode</span>
            </div>
          </div>
        )}

        {/* LARGE "RANKED" / "MATCH" BUTTON */}
        <Link 
          href="/match"
          className="relative h-[80px] mt-[-16px] group transition-transform duration-300 hover:scale-105 active:scale-98"
          style={{ filter: 'drop-shadow(3px 3px 8px rgba(0,0,0,0.6))' }}
        >
          {/* Slanted Golden Grid container */}
          <div className={`absolute inset-0 bg-gradient-to-r from-amber-500/90 to-yellow-600/95 border-2 border-yellow-400/50 skew-x-[-12deg] rounded-md shadow-[0_0_20px_rgba(245,158,11,0.2),_inset_0_0_15px_rgba(255,255,255,0.2)] flex items-center justify-center ${
            isVeryCompact ? 'w-[100px]' : 'w-[200px]'
          }`}>
            {/* Gloss sheen overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          </div>

          {/* Unskewed inner details */}
          <div className={`absolute inset-0 flex items-center ${isVeryCompact ? 'justify-center px-1' : 'justify-between px-4'}`}>
            <div className="flex flex-col justify-center leading-none">
              <span className={`font-[family-name:var(--font-outfit)] font-black uppercase text-white tracking-[0.2em] italic drop-shadow-md ${
                isVeryCompact ? 'text-[14px]' : 'text-[22px]'
              }`}>
                Ranked
              </span>
              
              {!isVeryCompact && (
                <div className="flex items-center gap-0.5 mt-1">
                  <span className="text-[8px] text-amber-950 font-black tracking-widest uppercase bg-white/25 px-1 rounded shadow-sm">
                    SEASON MAP
                  </span>
                  
                  {/* Star indicators */}
                  <div className="flex gap-[1px] ml-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} size={6} fill="#78350f" stroke="none" />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Overlapping Gold Crest Badge */}
            {!isVeryCompact && (
              <div className="relative w-[48px] h-[48px] mr-[-8px] mt-[-4px] flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full border border-yellow-300 shadow-[0_4px_10px_rgba(0,0,0,0.6)] rotate-45" />
                <div className="absolute inset-[3px] bg-slate-950 rounded-full rotate-45 border border-yellow-500/20" />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Crown size={18} className="text-yellow-400 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]" strokeWidth={2.5} />
                  <span className="text-[6.5px] font-black text-yellow-300 uppercase tracking-wider font-[family-name:var(--font-outfit)] leading-none mt-[1px]">MYTH</span>
                </div>
              </div>
            )}
          </div>
        </Link>
      </div>
    </nav>
  );
}
