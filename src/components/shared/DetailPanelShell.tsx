import React from 'react';

export interface DetailPanelShellProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  glowColor: string;
  icon: React.ReactNode;
  infoContent: React.ReactNode;
  actionButtons: React.ReactNode;
}

export function DetailPanelShell({
  title,
  subtitle,
  glowColor,
  icon,
  infoContent,
  actionButtons
}: DetailPanelShellProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#35383d]">
      {/* Header Title */}
      <div className="px-4 py-2.5 bg-[#4b555d] relative z-10" style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}>
        <h2 className="text-[13px] font-bold text-gray-200">{title}</h2>
      </div>
      
      {/* Big Display Image area */}
      <div className="relative h-60 overflow-hidden flex flex-col items-center justify-center">
        {/* Thick Diagonal Stripes Background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.15]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 30px, #000 30px, #000 60px)' }} />

        {/* Soft Radial Glow Box */}
        <div className="absolute inset-0 pointer-events-none opacity-80" style={{ background: `radial-gradient(circle at center, ${glowColor}70 0%, ${glowColor}10 50%, transparent 70%)` }} />

        {/* Faded Circular Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none select-none">
          <div className="w-56 h-56 border-[8px] border-white rounded-full flex items-center justify-center">
            <div className="w-48 h-48 border-[3px] border-white rounded-full flex flex-col items-center justify-center text-center">
              <span className="text-sm font-black tracking-widest uppercase">Best Team</span>
              <span className="text-4xl font-black mt-1">SUPERSTAR</span>
              <span className="text-[10px] font-bold tracking-widest mt-1">OF THE YEAR</span>
            </div>
          </div>
        </div>
        
        {/* Shooting Stars */}
        <div className="absolute top-1/2 left-[40%] w-[2px] h-[150px] star-line pointer-events-none" />
        <div className="absolute top-1/2 right-[30%] w-[1px] h-[200px] star-line-delay pointer-events-none" />
        
        {/* Floating Item */}
        <div className="relative flex items-center justify-center z-10 transform -rotate-[15deg] hover:rotate-0 transition-transform duration-500 mt-4">
          <div className="scale-[2.5] drop-shadow-2xl">{icon}</div>
        </div>
        
        {subtitle && (
          <div className="text-[15px] font-medium text-white mt-12 tracking-wide z-10 drop-shadow-md">
            {subtitle}
          </div>
        )}
        
        {/* Bottom-left corner decoration */}
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#666]" style={{ clipPath: 'polygon(0 0, 100% 100%, 0 100%)' }} />
      </div>

      {/* Info Section */}
      <div 
        className="px-4 py-2 mt-1 relative z-10 bg-[#4b555d]" 
        style={{ clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)' }}
      >
        <h3 className="text-[13px] font-bold text-gray-300 tracking-wide">Item Info</h3>
      </div>
      
      <div 
        className="flex-1 flex flex-col bg-[#313338]"
        style={{ backgroundImage: 'repeating-linear-gradient(-45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 6px)' }}
      >
        <div className="p-4 flex-1 overflow-y-auto">
          {infoContent}
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-3">
          {actionButtons}
        </div>
      </div>
    </div>
  );
}
