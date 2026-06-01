import React from "react";

interface OvertimeTransitionOverlayProps {
  show: boolean;
  quarter: number;
}

export function OvertimeTransitionOverlay({ show, quarter }: OvertimeTransitionOverlayProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
      <div className="flex flex-col items-center animate-[float-up_2s_ease-out_forwards]">
        <div className="text-6xl font-black text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] tracking-widest italic">
          {quarter === 5 ? 'OVERTIME' : `${quarter - 4}OT`}
        </div>
        <div className="text-xl text-white font-bold mt-2">The game continues...</div>
      </div>
    </div>
  );
}
