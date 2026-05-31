import React from 'react';

interface ClutchFrameProps {
  show: boolean;
}

export const ClutchFrame: React.FC<ClutchFrameProps> = ({ show }) => {
  if (!show) return null;

  return (
    <div className="absolute inset-0 rounded border-2 border-yellow-400 animate-pulse pointer-events-none z-[60]" style={{ boxShadow: '0 0 12px rgba(250,204,21,0.6)' }} />
  );
};
