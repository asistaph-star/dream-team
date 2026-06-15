import React from "react";
import { useGameViewportScale } from "@/components/layout/GameViewport";

interface MatchExitButtonProps {
  onExit: () => void;
}

export function MatchExitButton({ onExit }: MatchExitButtonProps) {
  const { visibleRect, baseWidth } = useGameViewportScale();
  return (
    <div 
      className="absolute z-50"
      style={{
        right: `${baseWidth - visibleRect.right + 32}px`,
        top: `${visibleRect.top + 32}px`
      }}
    >
      <button 
        onClick={onExit} 
        className="bg-red-600/90 hover:bg-red-500 text-white w-10 h-10 rounded-full text-xl font-bold flex items-center justify-center cursor-pointer transition-colors border border-red-300 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
      >
        ✕
      </button>
    </div>
  );
}
