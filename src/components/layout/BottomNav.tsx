"use client";

import { 
  ShoppingCart, 
  Store, 
  Shield, 
  DoorOpen, 
  User, 
  Package,
  Lock,
  Crown,
  Compass,
  Star,
  Swords
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

  // Responsive breakpoints based on visible width
  const vw = isInside ? visibleRect.width : 1200;
  const isCompact = vw < 950;
  const isVeryCompact = vw < 700;

  // Positioning: inside stage uses visibleRect anchoring, outside uses fixed
  const navStyle: React.CSSProperties = isInside
    ? {
        left: `${visibleRect.left}px`,
        width: `${visibleRect.width}px`,
        bottom: `${baseHeight - visibleRect.bottom}px`,
        position: 'absolute',
      }
    : {
        left: `${position?.x ?? 0}px`,
        top: `${position?.y ?? 0}px`,
        position: 'fixed',
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

  // Bar height adapts to available space
  const barHeight = isVeryCompact ? 56 : 78;

  return (
    <nav 
      id="global-bottom-nav"
      className={`z-40 select-none overflow-visible`}
      style={{
        ...navStyle,
        height: `${barHeight}px`,
      }}
    >
      {/* ===== BACKGROUND PANEL ===== */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'rgba(8, 10, 14, 0.92)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -12px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      />
      {/* Top highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none z-10" />
      {/* Angular accent triangles for depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute inset-0" style={{ 
          clipPath: 'polygon(0 0, 100% 0, 0 100%)',
          background: 'rgba(255,255,255,0.015)',
        }} />
        <div className="absolute inset-0" style={{ 
          clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
          background: 'rgba(0,0,0,0.3)',
        }} />
      </div>

      {/* ===== CONTENT WRAPPER ===== */}
      <div className="relative z-10 flex items-center h-full w-full">

        {/* --- LEFT: PROFILE / BATTLE PASS BLOCK --- */}
        {!isVeryCompact && (
          <div 
            className="flex items-center h-full shrink-0 pl-2"
            style={{
              transform: isInside ? 'scale(var(--bottom-nav-stage-scale, 1))' : undefined,
              transformOrigin: 'bottom left',
            }}
          >
            <div 
              className="relative flex items-center gap-2.5 px-3 group cursor-pointer"
              style={{
                height: `${barHeight + 18}px`,
                width: isCompact ? '80px' : '200px',
                marginTop: `-18px`,
                filter: 'drop-shadow(2px 3px 8px rgba(0,0,0,0.6))',
              }}
            >
              {/* Skewed dark backdrop */}
              <div 
                className="absolute inset-0 rounded-md"
                style={{
                  background: 'linear-gradient(135deg, #1c1e26 0%, #111318 100%)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transform: 'skewX(-12deg)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              />
              {/* Orange accent top edge */}
              <div 
                className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.5), transparent)',
                  transform: 'skewX(-12deg)',
                }}
              />

              {/* Content (not skewed) */}
              <div className="relative z-10 flex items-center gap-2.5">
                {/* 2K Circle Badge */}
                <div className="relative w-[42px] h-[42px] shrink-0">
                  <div className="absolute inset-0 bg-[#0c0e14] rounded-full border border-amber-500/40 flex items-center justify-center shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                    <span className="text-white font-[family-name:var(--font-outfit)] font-black text-[14px] leading-none tracking-tight">2K</span>
                  </div>
                  {/* Level badge */}
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-amber-400 to-amber-600 border border-[#0a0c12] rounded-sm px-1 py-[1.5px] shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    <span className="text-[8px] font-black text-slate-950 font-[family-name:var(--font-outfit)] leading-none">{accountLevel}</span>
                  </div>
                </div>

                {/* Title + EXP */}
                {!isCompact && (
                  <div className="flex flex-col justify-center min-w-0" style={{ width: '100px' }}>
                    <span className="font-[family-name:var(--font-outfit)] font-black text-[11px] tracking-[0.15em] text-amber-400 uppercase truncate leading-none mb-1">
                      STUDENT
                    </span>
                    <div className="relative w-full h-[4px] bg-[#1a1c24] rounded-full border border-white/[0.04] overflow-hidden">
                      <div 
                        className="absolute top-0 left-0 h-full rounded-full"
                        style={{ 
                          width: `${(accountExp / 1000) * 100}%`,
                          background: 'linear-gradient(90deg, #f59e0b, #ea580c)',
                          boxShadow: '0 0 4px rgba(245,158,11,0.4)',
                        }}
                      />
                    </div>
                    <span className="text-[7px] text-zinc-500 font-bold tracking-wider mt-0.5 text-right tabular-nums">
                      {accountExp}/1000
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- CENTER: NAV TABS --- */}
        <div 
          className="flex-1 flex items-center justify-center h-full relative px-1"
          style={{
            transform: isInside ? 'scale(var(--bottom-nav-stage-scale, 1))' : undefined,
            transformOrigin: 'bottom center',
          }}
        >
          <div className="flex items-center h-full gap-0.5">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <div key={index} className="flex items-center h-full">
                  <Link 
                    href={item.locked ? '#' : item.href}
                    className="relative flex items-center justify-center transition-all duration-200"
                    style={{
                      height: `${isVeryCompact ? 38 : 44}px`,
                      padding: isVeryCompact ? '0 8px' : (isCompact ? '0 10px' : '0 14px'),
                      transform: 'skewX(-12deg)',
                      borderRadius: '4px',
                      border: isActive && !item.locked
                        ? '1px solid rgba(6,182,212,0.25)'
                        : '1px solid transparent',
                      background: isActive && !item.locked
                        ? 'linear-gradient(180deg, rgba(6,182,212,0.12) 0%, rgba(6,182,212,0.04) 100%)'
                        : 'transparent',
                      boxShadow: isActive && !item.locked
                        ? 'inset 0 0 12px rgba(6,182,212,0.08), 0 0 8px rgba(6,182,212,0.06)'
                        : 'none',
                      opacity: item.locked ? 0.35 : 1,
                      cursor: item.locked ? 'not-allowed' : 'pointer',
                    }}
                    onClick={(e) => { if (item.locked) e.preventDefault(); }}
                  >
                    {/* Active top glow line */}
                    {isActive && !item.locked && (
                      <div 
                        className="absolute top-0 left-2 right-2 h-[2px] rounded-full"
                        style={{ background: 'linear-gradient(90deg, transparent, #06b6d4, transparent)' }}
                      />
                    )}
                    {/* Counter-skew for content */}
                    <div className="flex items-center gap-2" style={{ transform: 'skewX(12deg)' }}>
                      <Icon 
                        size={isVeryCompact ? 16 : 20} 
                        className={isActive && !item.locked ? 'text-cyan-400' : 'text-zinc-500'} 
                        strokeWidth={2.5} 
                      />
                      {/* Labels: always show on desktop, icon-only on very compact */}
                      {!isVeryCompact && (
                        <span 
                          className={`font-black uppercase tracking-[0.06em] ${
                            isActive && !item.locked ? 'text-white' : 'text-zinc-500'
                          }`}
                          style={{ fontSize: isCompact ? '11px' : '13px' }}
                        >
                          {item.label}
                        </span>
                      )}
                      {item.locked && (
                        <Lock size={9} className="text-zinc-600 shrink-0" strokeWidth={3} />
                      )}
                    </div>
                  </Link>
                  
                  {/* Divider */}
                  {index < navItems.length - 1 && (
                    <div 
                      className="shrink-0"
                      style={{
                        width: '1px',
                        height: isVeryCompact ? '18px' : '22px',
                        background: 'rgba(255,255,255,0.06)',
                        transform: 'skewX(-12deg)',
                        margin: '0 3px',
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* --- RIGHT: MODE + RANKED ACTION BLOCK --- */}
        <div 
          className="flex items-center h-full gap-2 shrink-0 pr-2"
          style={{
            transform: isInside ? 'scale(var(--bottom-nav-stage-scale, 1))' : undefined,
            transformOrigin: 'bottom right',
          }}
        >
          {/* MODE BUTTON */}
          {!isVeryCompact && (
            <div 
              className="flex flex-col items-center justify-center cursor-pointer transition-all duration-200 active:scale-95 group"
              style={{
                height: `${isCompact ? 42 : 48}px`,
                width: `${isCompact ? 56 : 64}px`,
                background: 'linear-gradient(180deg, #1e2028 0%, #14161c 100%)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '4px',
                transform: 'skewX(-12deg)',
              }}
              onClick={() => router.push('/match')}
            >
              <div className="flex flex-col items-center leading-none" style={{ transform: 'skewX(12deg)' }}>
                <Compass size={isCompact ? 14 : 16} className="text-zinc-300 mb-0.5 group-hover:rotate-45 transition-transform" />
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mt-0.5">Mode</span>
              </div>
            </div>
          )}

          {/* RANKED / MATCH BUTTON -- rises above the bar */}
          <Link 
            href="/match"
            className="relative group transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] shrink-0"
            style={{ 
              height: `${barHeight + 18}px`,
              width: isVeryCompact ? '90px' : (isCompact ? '140px' : '200px'),
              marginTop: `-18px`,
              filter: 'drop-shadow(2px 3px 8px rgba(0,0,0,0.6))',
            }}
          >
            {/* Gold skewed background */}
            <div 
              className="absolute inset-0 rounded-md"
              style={{
                width: isVeryCompact ? '90px' : (isCompact ? '140px' : '200px'),
                background: 'linear-gradient(135deg, #f59e0b 0%, #eab308 50%, #d97706 100%)',
                border: '2px solid rgba(253,224,71,0.4)',
                transform: 'skewX(-12deg)',
                boxShadow: '0 4px 16px rgba(245,158,11,0.25)',
              }}
            >
              {/* Gloss sheen */}
              <div 
                className="absolute inset-0 rounded pointer-events-none"
                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 50%)' }}
              />
              <div 
                className="absolute inset-0 rounded pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
              />
            </div>

            {/* Content (not skewed) */}
            <div 
              className="absolute inset-0 flex items-center"
              style={{ 
                width: isVeryCompact ? '90px' : (isCompact ? '140px' : '200px'),
                padding: isVeryCompact ? '0 8px' : '0 16px',
                justifyContent: isVeryCompact ? 'center' : 'space-between',
              }}
            >
              <div className="flex flex-col justify-center leading-none">
                <span 
                  className="font-[family-name:var(--font-outfit)] font-black uppercase text-white italic drop-shadow-md"
                  style={{ 
                    fontSize: isVeryCompact ? '14px' : (isCompact ? '18px' : '22px'),
                    letterSpacing: '0.12em',
                  }}
                >
                  Ranked
                </span>
                
                {!isVeryCompact && !isCompact && (
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[7px] text-amber-950 font-black tracking-widest uppercase bg-white/20 px-1 py-[1px] rounded">
                      SEASON MAP
                    </span>
                    <div className="flex gap-[1px] ml-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={6} fill="#78350f" stroke="none" />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Gold Crest Badge */}
              {!isVeryCompact && (
                <div className="relative w-[44px] h-[44px] flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-full border border-yellow-300 shadow-[0_4px_10px_rgba(0,0,0,0.6)] rotate-45" />
                  <div className="absolute inset-[3px] bg-[#0c0e14] rounded-full rotate-45 border border-yellow-500/20" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Crown size={16} className="text-yellow-400 drop-shadow-[0_2px_4px_rgba(245,158,11,0.4)]" strokeWidth={2.5} />
                    <span className="text-[6px] font-black text-yellow-300 uppercase tracking-wider font-[family-name:var(--font-outfit)] leading-none mt-[1px]">MYTH</span>
                  </div>
                </div>
              )}
            </div>
          </Link>
        </div>

      </div>
    </nav>
  );
}
