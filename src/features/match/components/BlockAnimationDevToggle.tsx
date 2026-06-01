import React from "react";

interface BlockAnimationDevToggleProps {
  blockAnimationType: 'court' | 'cut-in';
  setBlockAnimationType: React.Dispatch<React.SetStateAction<'court' | 'cut-in'>>;
}

export function BlockAnimationDevToggle({
  blockAnimationType,
  setBlockAnimationType
}: BlockAnimationDevToggleProps) {
  return (
    <div className="absolute top-2 left-2 z-[200]">
      <button 
        onClick={() => setBlockAnimationType(p => p === 'court' ? 'cut-in' : 'court')} 
        className="bg-purple-600 px-4 py-2 text-white text-[10px] font-bold rounded shadow-lg border border-purple-400 opacity-50 hover:opacity-100"
      >
        DEV: Block Anim = {blockAnimationType === 'court' ? 'ON-COURT' : 'CUT-IN'}
      </button>
    </div>
  );
}
