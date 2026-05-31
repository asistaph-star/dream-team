import React from 'react';

interface PlayerAvailabilityOverlayProps {
  isOutOfPosition: boolean;
  isFouledOut: boolean;
}

export const PlayerAvailabilityOverlay: React.FC<PlayerAvailabilityOverlayProps> = ({
  isOutOfPosition,
  isFouledOut,
}) => {
  return (
    <>
      {isOutOfPosition && (
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow-lg z-[60]">
          OOP
        </div>
      )}
      {isFouledOut && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-[65] rounded-xl backdrop-blur-[2px]">
          <span className="text-red-500 text-2xl font-black tracking-widest font-mono">DQ</span>
          <span className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mt-1">6 FOULS</span>
        </div>
      )}
    </>
  );
};
