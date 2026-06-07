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
  const [vp, setVp] = useState({
    scale: 1, logW: BASE_W, logH: BASE_H, offsetX: 0, offsetY: 0,
  });

  useEffect(() => {
    const calc = () => {
      const winW = window.innerWidth;
      const winH = window.innerHeight;
      // Contain-fit: always pick the smaller ratio so the whole
      // 1420x800 stage fits inside the window (letterbox/pillarbox).
      const scale = Math.min(winW / BASE_W, winH / BASE_H);
      setVp({
        scale,
        logW: BASE_W,
        logH: BASE_H,
        offsetX: 0,
        offsetY: 0,
      });
    };
    calc();
    window.addEventListener('resize', calc);
    window.addEventListener('orientationchange', calc);
    return () => {
      window.removeEventListener('resize', calc);
      window.removeEventListener('orientationchange', calc);
    };
  }, []);

  return (
    <GameViewportContext.Provider value={vp}>
      {/* Outer fills the window and centers the stage */}
      <div
        className="fixed inset-0 flex items-center justify-center overflow-hidden bg-black"
        style={{
          backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
        }}
      >
        {/* Reserved box: scaled dimensions actually take layout space */}
        <div
          style={{
            width: `${BASE_W * vp.scale}px`,
            height: `${BASE_H * vp.scale}px`,
            position: 'relative',
          }}
        >
          {/* The real stage at logical 1420x800, scaled from top-left */}
          <div
            className={`relative ${className}`}
            style={{
              width: `${BASE_W}px`,
              height: `${BASE_H}px`,
              transform: `scale(${vp.scale})`,
              transformOrigin: 'top left',
              ['--court-offset-x' as string]: `0px`,
              ['--court-offset-y' as string]: `0px`,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </GameViewportContext.Provider>
  );
};
