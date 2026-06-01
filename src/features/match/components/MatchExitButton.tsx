import React from "react";

interface MatchExitButtonProps {
  onExit: () => void;
}

export function MatchExitButton({ onExit }: MatchExitButtonProps) {
  return (
    <div className="absolute top-8 right-8 z-50">
      <button 
        onClick={onExit} 
        className="bg-red-600/90 hover:bg-red-500 text-white w-10 h-10 rounded-full text-xl font-bold flex items-center justify-center cursor-pointer transition-colors border border-red-300 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
      >
        ✕
      </button>
    </div>
  );
}
