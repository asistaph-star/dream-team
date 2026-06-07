import React from 'react';
import { lowPolyBg } from "@/lib/constants/visuals";

export interface SidebarTab {
  id: string;
  label: React.ReactNode;
}

export interface SidebarTabsProps {
  tabs: SidebarTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  activeTabClassName?: string;
  dotClassName?: string;
}

export function SidebarTabs({
  tabs,
  activeTab,
  onTabChange,
  className = "w-[160px] pt-5 shadow-xl",
  activeTabClassName = "w-[172px]",
  dotClassName = "w-2.5 h-2.5"
}: SidebarTabsProps) {
  return (
    <div 
      className={`bg-[#2a2b2f] flex flex-col shrink-0 relative z-10 ${className}`}
      style={{ backgroundImage: `url('${lowPolyBg}')`, backgroundSize: '100% 400px' }}
    >
      {/* Fading Right Border */}
      <div className="absolute top-0 right-0 bottom-0 w-[1px] bg-gradient-to-b from-white/40 via-white/10 to-transparent pointer-events-none z-30" />
      
      <div className="relative z-10 flex flex-col gap-1 w-full mt-2 pl-0">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex items-center justify-center py-4 text-[13px] font-bold tracking-wide transition-all ${
                isActive ? `bg-gradient-to-r from-white/95 to-gray-300 text-[#111] shadow-[0_5px_15px_rgba(0,0,0,0.5)] z-40 ${activeTabClassName}` : 'text-gray-500 hover:text-white pr-4 w-full'
              }`}
              style={{ clipPath: isActive ? 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)' : 'none' }}
            >
              <div className="relative z-10 text-center leading-tight mr-2">
                {tab.label}
              </div>
              {isActive && (
                <div className={`absolute right-[14px] rounded-full bg-[#ff7300] shadow-[0_0_8px_#ff7300] ${dotClassName}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
