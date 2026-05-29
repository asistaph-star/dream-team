"use client";

import { 
  ClipboardList, 
  Package, 
  Users, 
  ShieldAlert, 
  FileText,
  ShoppingCart, 
  Swords, 
  Home
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { icon: ClipboardList, label: "TASK", href: "/task" },
  { icon: Package, label: "INVENTORY", href: "/inventory" },
  { icon: Users, label: "PLAYER", href: "/player" },
  { icon: ShieldAlert, label: "ALLIANCE", href: "/alliance" },
  { icon: FileText, label: "ARTICLE", href: "/article" },
  { icon: ShoppingCart, label: "SHOP", href: "/shop" },
  { icon: Swords, label: "MATCH", href: "/match" },
  { icon: Home, label: "CITY", href: "/" },
];

export function BottomNav() {
  const pathname = usePathname();
  
  // Do not show bottom nav on the active match simulation page, main lobby, or player screen to prevent clashing overlays
  if (pathname === '/' || pathname === '/match' || pathname === '/player') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-[85px] bg-gradient-to-t from-black to-transparent flex justify-center items-end gap-2 sm:gap-5 pb-2 pointer-events-none">
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        
        return (
          <Link 
            key={index} 
            href={item.href}
            className={`flex flex-col items-center w-[65px] pointer-events-auto cursor-pointer transition-transform hover:-translate-y-1 group ${isActive ? 'text-[#3498db]' : 'text-[#8e9eab]'}`}
          >
            <div className={`w-[42px] h-[42px] rounded-[8px] mb-1.5 flex items-center justify-center transition-colors ${isActive ? 'bg-[#3498db]/20 border border-[#3498db]' : 'bg-[#1c2833] border border-[#34495e] group-hover:border-[#3498db]/50'}`}>
              <Icon size={22} className={isActive ? 'text-[#3498db]' : 'text-[#8e9eab] group-hover:text-gray-300'} />
            </div>
            <span className="text-[9px] font-bold tracking-wider">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
