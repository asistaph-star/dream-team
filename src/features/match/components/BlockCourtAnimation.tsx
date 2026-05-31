import React from 'react';

interface BlockCourtAnimationProps {
  show: boolean;
}

export const BlockCourtAnimation: React.FC<BlockCourtAnimationProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="absolute -top-24 -left-12 z-[100] w-48 h-48 pointer-events-none drop-shadow-[0_0_15px_white]" style={{ animation: 'block-court-pop 1s forwards' }}>
      <img src="/block_anim.png" alt="block" className="w-full h-full object-contain" style={{ filter: 'invert(1)' }} />
    </div>
  );
};
