'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const BASE_W = 1420;
const BASE_H = 800;

type GameViewportContextType = {
  scale: number;
  logW: number;
  logH: number;
  offsetX: number;
  offsetY: number;
};

const GameViewportContext = createContext<GameViewportContextType>({
  scale: 1, logW: BASE_W, logH: BASE_H, offsetX: 0, offsetY: 0,
});

export const useGameViewport = () => useContext(GameViewportContext);

export const GameViewport = ({
  children,
  backgroundImage,
  className = '',
}: {
  children: ReactNode;
  backgroundImage?: string;
  className?: string;
}) => {
  const [vp, setVp] = useState({ scale: 1, logW: BASE_W, logH: BASE_H, offsetX: 0, offsetY: 0 });

  useEffect(() => {
    const calc = () => {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      const winRatio = winW / winH;
      const baseRatio = BASE_W / BASE_H;

      let scale: number, logW: number, logH: number, offsetX: number, offsetY: number;

      if (winRatio > baseRatio) {
        // Wider than base — expand width to fill
        scale = winH / BASE_H;
        logW = winW / scale;
        logH = BASE_H;
        offsetX = (logW - BASE_W) / 2;
        offsetY = 0;
      } else {
        // Taller than base — expand height to fill
        scale = winW / BASE_W;
        logW = BASE_W;
        logH = winH / scale;
        offsetX = 0;
        offsetY = (logH - BASE_H) / 2;
      }

      setVp({ scale, logW, logH, offsetX, offsetY });
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  return (
    <GameViewportContext.Provider value={vp}>
      <div
        className={`relative overflow-hidden ${className}`}
        style={{
          width: `${vp.logW}px`,
          height: `${vp.logH}px`,
          transform: `scale(${vp.scale})`,
          transformOrigin: 'center center',
          backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundColor: 'black',
          ['--court-offset-x' as string]: `${vp.offsetX}px`,
          ['--court-offset-y' as string]: `${vp.offsetY}px`,
        }}
      >
        {children}
      </div>
    </GameViewportContext.Provider>
  );
};
