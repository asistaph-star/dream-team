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
  Lock
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useContext } from "react";
import { GameViewportContext, useGameViewportScale } from "@/components/layout/GameViewport";

const navItems = [
  { icon: Package, label: "Warehouse", href: "/inventory", locked: false },
  { icon: ShoppingCart, label: "Shop", href: "/shop", locked: true },
  { icon: ClipboardEdit, label: "Contract", href: "/contract", locked: true },
  { icon: Store, label: "Trade", href: "/trade", locked: true },
  { icon: Shield, label: "League", href: "/alliance", locked: true },
  { icon: Trophy, label: "Match", href: "/match", locked: false },
  { icon: DoorOpen, label: "Stadium", href: "/", locked: false },
  { icon: User, label: "Player", href: "/player", locked: false, hasNotification: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
  const viewportContext = useContext(GameViewportContext);
  const isInside = viewportContext?.isInsideStage ?? false;
  const { visibleRect, baseWidth, baseHeight } = useGameViewportScale();

  useEffect(() => {
    const saved = localStorage.getItem('bottomNavPos');
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
      } catch (e) {}
    } else {
      // Default to bottom center
      setPosition({ 
        x: window.innerWidth / 2 - 450, 
        y: window.innerHeight - 84 
      });
    }
  }, []);

  // Hide the global BottomNav on Stadium (/) and Match (/match) pages, because
  // they manually render their own localized instances inside the GameStage.
  if (!isInside && (pathname === '/' || pathname === '/match')) {
    return null;
  }

  // Don't render global nav until client-side position is loaded to avoid hydration mismatch
  if (!isInside && !position) return null;

  const isCompact = isInside && visibleRect.width < 950;

  const navStyle = isInside
    ? {
        left: `${baseWidth / 2}px`,
        transform: `translateX(-50%)`,
        bottom: `${baseHeight - visibleRect.bottom + 20}px`,
        position: 'absolute' as const,
        width: '100%',
        maxWidth: isCompact ? '480px' : '900px',
      }
    : {
        left: `${position?.x ?? 0}px`,
        top: `${position?.y ?? 0}px`,
        position: 'fixed' as const,
        width: '100%',
        maxWidth: '900px',
      };

  return (
    <nav 
      id="global-bottom-nav"
      className={`${isInside ? 'absolute' : 'fixed'} z-40 h-[64px] bg-[#121316] border border-white/5 rounded-xl flex items-center shadow-[0_15px_40px_rgba(0,0,0,0.8)] overflow-hidden`}
      style={navStyle}
    >
      {/* Low Poly / Glass Facets Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60">
        <div className="absolute inset-0 bg-white/[0.02]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}></div>
        <div className="absolute inset-0 bg-black/[0.4]" style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}></div>
        <div className="absolute inset-0 bg-white/[0.03]" style={{ clipPath: "polygon(50% 0, 100% 0, 100% 50%)" }}></div>
        <div className="absolute inset-0 bg-black/[0.3]" style={{ clipPath: "polygon(0 50%, 50% 100%, 0 100%)" }}></div>
        <div className="absolute inset-0 bg-white/[0.01]" style={{ clipPath: "polygon(20% 0, 80% 0, 50% 100%)" }}></div>
        <div className="absolute inset-0 bg-black/[0.2]" style={{ clipPath: "polygon(80% 0, 100% 50%, 50% 100%)" }}></div>
      </div>
      
      <div className="flex h-full w-full relative z-10">
        
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={index} 
              href={item.locked ? '#' : item.href}
              className={`flex-1 flex items-center justify-center gap-2 relative transition-all ${item.locked ? 'cursor-not-allowed opacity-60 hover:bg-white/5' : 'cursor-pointer hover:bg-white/10'} ${isActive && !item.locked ? 'bg-white/5 shadow-[inset_0_-2px_0_#fff]' : ''}`}
              onClick={(e) => { if(item.locked) e.preventDefault(); }}
            >
              <div className="relative flex items-center justify-center pointer-events-none">
                <Icon size={20} className={isActive && !item.locked ? 'text-white' : 'text-[#b3b3b3]'} strokeWidth={2.5} />
              </div>
              
              <div className="flex items-start relative pointer-events-none">
                <span className={`text-[14px] font-bold tracking-wide ${isActive && !item.locked ? 'text-white' : 'text-[#b3b3b3]'} ${isCompact ? 'hidden' : ''}`}>
                  {item.label}
                </span>
                {item.locked && (
                  <Lock size={12} className="text-[#888] ml-1 mt-[1px]" strokeWidth={3} />
                )}
                {item.hasNotification && (
                  <div className="absolute -top-1 -right-3 w-2 h-2 bg-gradient-to-br from-[#ff8c00] to-[#ff0000] rounded-full shadow-[0_0_6px_rgba(255,0,0,0.8)] border border-[#121316]" />
                )}
              </div>
              
              {/* Separator Line */}
              {index < navItems.length - 1 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-[32px] bg-white/[0.08]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
