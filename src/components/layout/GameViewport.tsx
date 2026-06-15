'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const BASE_WIDTH = 1536;
const BASE_HEIGHT = 864;

export interface GameViewportContextType {
  scale: number; // For backward compatibility, maps to worldScale
  worldScale: number;
  uiScale: number;
  actualScale: number;
  baseWidth: number;
  baseHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  visibleRect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  };
  isInsideStage: boolean;
}

export const GameViewportContext = createContext<GameViewportContextType | null>(null);

export const useGameViewport = () => {
  const context = useContext(GameViewportContext);
  if (!context) {
    return {
      scale: 1,
      worldScale: 1,
      uiScale: 1,
      actualScale: 1,
      baseWidth: BASE_WIDTH,
      baseHeight: BASE_HEIGHT,
      viewportWidth: BASE_WIDTH,
      viewportHeight: BASE_HEIGHT,
      visibleRect: {
        left: 0,
        top: 0,
        right: BASE_WIDTH,
        bottom: BASE_HEIGHT,
        width: BASE_WIDTH,
        height: BASE_HEIGHT,
      },
      isInsideStage: false,
    };
  }
  return context;
};

export function useGameViewportScale(options?: {
  baseWidth?: number;
  baseHeight?: number;
  mode?: "cover";
}) {
  const context = useContext(GameViewportContext);
  
  if (!context) {
    const fallbackBaseW = options?.baseWidth ?? BASE_WIDTH;
    const fallbackBaseH = options?.baseHeight ?? BASE_HEIGHT;
    return {
      scale: 1,
      worldScale: 1,
      uiScale: 1,
      actualScale: 1,
      visibleRect: {
        left: 0,
        top: 0,
        right: fallbackBaseW,
        bottom: fallbackBaseH,
        width: fallbackBaseW,
        height: fallbackBaseH,
      },
      viewportWidth: fallbackBaseW,
      viewportHeight: fallbackBaseH,
      baseWidth: fallbackBaseW,
      baseHeight: fallbackBaseH,
    };
  }

  const baseW = options?.baseWidth ?? context.baseWidth;
  const baseH = options?.baseHeight ?? context.baseHeight;

  if (baseW === context.baseWidth && baseH === context.baseHeight) {
    return {
      scale: context.isInsideStage ? 1 : context.worldScale,
      worldScale: context.isInsideStage ? 1 : context.worldScale,
      uiScale: context.isInsideStage ? 1 : context.uiScale,
      actualScale: context.actualScale,
      visibleRect: context.visibleRect,
      viewportWidth: context.viewportWidth,
      viewportHeight: context.viewportHeight,
      baseWidth: context.baseWidth,
      baseHeight: context.baseHeight,
    };
  }

  const worldScale = Math.max(context.viewportWidth / baseW, context.viewportHeight / baseH);
  const uiScaleVal = Math.max(0.72, Math.min(1.0, Math.min(context.viewportWidth / baseW, context.viewportHeight / baseH)));
  const visibleWidth = context.viewportWidth / worldScale;
  const visibleHeight = context.viewportHeight / worldScale;
  const visibleLeft = (baseW - visibleWidth) / 2;
  const visibleTop = (baseH - visibleHeight) / 2;

  return {
    scale: context.isInsideStage ? 1 : worldScale,
    worldScale: context.isInsideStage ? 1 : worldScale,
    uiScale: context.isInsideStage ? 1 : uiScaleVal,
    actualScale: worldScale,
    visibleRect: {
      left: visibleLeft,
      top: visibleTop,
      right: visibleLeft + visibleWidth,
      bottom: visibleTop + visibleHeight,
      width: visibleWidth,
      height: visibleHeight,
    },
    viewportWidth: context.viewportWidth,
    viewportHeight: context.viewportHeight,
    baseWidth: baseW,
    baseHeight: baseH,
  };
}

export const GameViewport = ({
  children,
  backgroundImage,
  className = '',
  style = {},
}: {
  children: ReactNode;
  backgroundImage?: string;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const [vp, setVp] = useState({
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
  });

  useEffect(() => {
    const calc = () => {
      setVp({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  const worldScale = Math.max(vp.width / BASE_WIDTH, vp.height / BASE_HEIGHT);
  const uiScale = Math.max(0.72, Math.min(1.0, Math.min(vp.width / BASE_WIDTH, vp.height / BASE_HEIGHT)));
  const visibleWidth = vp.width / worldScale;
  const visibleHeight = vp.height / worldScale;

  const visibleLeft = (BASE_WIDTH - visibleWidth) / 2;
  const visibleTop = (BASE_HEIGHT - visibleHeight) / 2;
  const visibleRight = visibleLeft + visibleWidth;
  const visibleBottom = visibleTop + visibleHeight;

  const contextValue: GameViewportContextType = {
    scale: worldScale,
    worldScale,
    uiScale,
    actualScale: worldScale,
    baseWidth: BASE_WIDTH,
    baseHeight: BASE_HEIGHT,
    viewportWidth: vp.width,
    viewportHeight: vp.height,
    visibleRect: {
      left: visibleLeft,
      top: visibleTop,
      right: visibleRight,
      bottom: visibleBottom,
      width: visibleWidth,
      height: visibleHeight,
    },
    isInsideStage: false,
  };

  return (
    <GameViewportContext.Provider value={contextValue}>
      <div
        className={`relative overflow-hidden w-screen h-[100dvh] bg-black ${className}`}
        style={{
          backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          ...style,
        }}
      >
        {children}
      </div>
    </GameViewportContext.Provider>
  );
};

export const GameStage = ({
  children,
  className = '',
  backgroundImage,
  style = {},
  stageRef,
}: {
  children: ReactNode;
  className?: string;
  backgroundImage?: string;
  style?: React.CSSProperties;
  stageRef?: React.RefObject<HTMLDivElement | null>;
}) => {
  const context = useGameViewport();
  
  const stageContextValue: GameViewportContextType = {
    ...context,
    isInsideStage: true,
  };

  // Starting visual scale targets
  const stadiumCardVisualScale = Math.max(0.68, Math.min(0.88, context.uiScale * 0.95));
  const matchCardVisualScale = Math.max(0.62, Math.min(0.82, context.uiScale * 0.90));
  const hudVisualScale = Math.max(0.72, Math.min(0.92, context.uiScale * 0.95));
  const panelVisualScale = Math.max(0.72, Math.min(0.92, context.uiScale * 0.95));
  const bottomNavVisualScale = Math.max(0.72, Math.min(0.90, context.uiScale * 0.95));

  // Stage relative scales
  const stadiumCardStageScale = stadiumCardVisualScale / context.worldScale;
  const matchCardStageScale = matchCardVisualScale / context.worldScale;
  const hudStageScale = hudVisualScale / context.worldScale;
  const panelStageScale = panelVisualScale / context.worldScale;
  const bottomNavStageScale = bottomNavVisualScale / context.worldScale;

  return (
    <GameViewportContext.Provider value={stageContextValue}>
      <div
        ref={stageRef}
        className={`absolute overflow-hidden bg-black select-none ${className}`}
        style={{
          width: `${BASE_WIDTH}px`,
          height: `${BASE_HEIGHT}px`,
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${context.worldScale})`,
          transformOrigin: 'center center',
          backgroundImage: backgroundImage ? `url("${backgroundImage}")` : undefined,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          ...({
            '--world-scale': context.worldScale,
            '--ui-scale': context.uiScale,
            '--stadium-card-visual-scale': stadiumCardVisualScale,
            '--stadium-card-stage-scale': stadiumCardStageScale,
            '--match-card-visual-scale': matchCardVisualScale,
            '--match-card-stage-scale': matchCardStageScale,
            '--hud-visual-scale': hudVisualScale,
            '--hud-stage-scale': hudStageScale,
            '--panel-visual-scale': panelVisualScale,
            '--panel-stage-scale': panelStageScale,
            '--bottom-nav-visual-scale': bottomNavVisualScale,
            '--bottom-nav-stage-scale': bottomNavStageScale,
          } as React.CSSProperties),
          ...style,
        }}
      >
        {children}
      </div>
    </GameViewportContext.Provider>
  );
};
