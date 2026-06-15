'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface GameViewportContextType {
  scale: number;
  baseWidth: number;
  baseHeight: number;
  isViewscaled: boolean;
}

export const GameViewportContext = createContext<GameViewportContextType>({
  scale: 1,
  baseWidth: 1536,
  baseHeight: 864,
  isViewscaled: false,
});

export const useGameViewport = () => useContext(GameViewportContext);

export const GameViewport = ({
  children,
  baseWidth = 1536,
  baseHeight = 864,
}: {
  children: ReactNode;
  baseWidth?: number;
  baseHeight?: number;
}) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const s = Math.min(w / baseWidth, h / baseHeight);
      setScale(s);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [baseWidth, baseHeight]);

  return (
    <GameViewportContext.Provider value={{ scale, baseWidth, baseHeight, isViewscaled: true }}>
      <div 
        className="fixed inset-0 w-screen h-screen overflow-hidden bg-black select-none z-0 flex items-center justify-center"
      >
        {children}
      </div>
    </GameViewportContext.Provider>
  );
};
