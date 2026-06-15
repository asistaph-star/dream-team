'use client';

import React from 'react';
import { useGameViewport } from './GameViewport';

export const GameStage = ({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const { scale, baseWidth, baseHeight } = useGameViewport();

  return (
    <div
      className={`absolute overflow-hidden shadow-2xl ${className}`}
      style={{
        width: `${baseWidth}px`,
        height: `${baseHeight}px`,
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
