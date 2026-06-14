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

      // Scale to fit available screen space while maintaining fixed 1420x800 aspect ratio
      const scale = Math.min(winW / BASE_W, winH / BASE_H);
      
      // Calculate letterbox/pillarbox offset translations to center the inner viewport
      const offsetX = (winW - BASE_W * scale) / 2;
      const offsetY = (winH - BASE_H * scale) / 2;

      // Calculate uiScale for the CSS variable override
      const wScale = winW / 1280;
      const hScale = winH / 760;
      const uiScale = Math.max(0.55, Math.min(1, Math.min(wScale, hScale)));
      document.documentElement.style.setProperty('--ui-scale', uiScale.toString());

      setVp({
        scale,
        logW: BASE_W,
        logH: BASE_H,
        offsetX,
        offsetY,
      });
    };

    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  return (
    <GameViewportContext.Provider value={vp}>
      <div 
        className="w-screen h-screen overflow-hidden bg-black relative"
        style={{ width: '100vw', height: '100vh' }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          .game-viewport-inner .w-screen {
            width: 100% !important;
            max-width: 100% !important;
          }
          .game-viewport-inner .h-screen,
          .game-viewport-inner .h-\\[100dvh\\],
          .game-viewport-inner .h-\\[100vh\\] {
            height: 100% !important;
            max-height: 100% !important;
          }
          .game-viewport-inner .fixed {
            position: absolute !important;
          }
          /* Prevent the top-right profile HUD from overlapping the top-left HUD on small resolutions */
          .pointer-events-auto.transition-transform.duration-300:has(img[src*="tf_coin"]) {
            transform: none !important;
          }
          .pointer-events-auto.transition-transform.duration-300:has(img[src*="tf_coin"]) > .group:first-child {
            transform: scale(var(--ui-scale, 1)) !important;
            transform-origin: top left !important;
            left: 20px !important;
            right: auto !important;
          }
          .pointer-events-auto.transition-transform.duration-300:has(img[src*="tf_coin"]) > .group:last-child {
            transform: scale(var(--ui-scale, 1)) !important;
            transform-origin: top right !important;
            right: 20px !important;
            left: auto !important;
          }
        `}} />
        <div
          className={`absolute overflow-hidden game-viewport-inner ${className}`}
          style={{
            width: `${vp.logW}px`,
            height: `${vp.logH}px`,
            transform: `translate(${vp.offsetX}px, ${vp.offsetY}px) scale(${vp.scale})`,
            transformOrigin: 'top left',
            backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundSize: 'cover',
            backgroundColor: 'black',
            ['--court-offset-x' as string]: '0px',
            ['--court-offset-y' as string]: '0px',
          }}
        >
          {children}
        </div>
      </div>
    </GameViewportContext.Provider>
  );
};
