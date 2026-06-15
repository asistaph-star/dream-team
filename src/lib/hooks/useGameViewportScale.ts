import { useState, useEffect, useContext } from "react";
import { GameViewportContext } from "@/components/layout/GameViewport";

export interface GameViewportScale {
  scale: number;
  viewportWidth: number;
  viewportHeight: number;
  virtualXMin: number;
  virtualXMax: number;
  virtualYMin: number;
  virtualYMax: number;
  visibleVirtualWidth: number;
  visibleVirtualHeight: number;
  uiScale: number;
}

export function useGameViewportScale(baseWidth = 1420, baseHeight = 800) {
  const gameVp = useContext(GameViewportContext);

  const [dimensions, setDimensions] = useState<GameViewportScale>({
    scale: 1,
    viewportWidth: baseWidth,
    viewportHeight: baseHeight,
    virtualXMin: 0,
    virtualXMax: baseWidth,
    virtualYMin: 0,
    virtualYMax: baseHeight,
    visibleVirtualWidth: baseWidth,
    visibleVirtualHeight: baseHeight,
    uiScale: 1,
  });

  useEffect(() => {
    if (gameVp && gameVp.isViewscaled) {
      setDimensions({
        scale: gameVp.scale,
        viewportWidth: gameVp.baseWidth,
        viewportHeight: gameVp.baseHeight,
        virtualXMin: 0,
        virtualXMax: gameVp.baseWidth,
        virtualYMin: 0,
        virtualYMax: gameVp.baseHeight,
        visibleVirtualWidth: gameVp.baseWidth,
        visibleVirtualHeight: gameVp.baseHeight,
        uiScale: 1,
      });
      return;
    }

    let rAFId: number;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      const scale = Math.max(w / baseWidth, h / baseHeight);
      
      const visibleVirtualWidth = w / scale;
      const visibleVirtualHeight = h / scale;
      
      const virtualXMin = (baseWidth - visibleVirtualWidth) / 2;
      const virtualXMax = (baseWidth + visibleVirtualWidth) / 2;
      
      const virtualYMin = (baseHeight - visibleVirtualHeight) / 2;
      const virtualYMax = (baseHeight + visibleVirtualHeight) / 2;
      
      const wScale = w / 1280;
      const hScale = h / 760;
      const uiScale = Math.max(0.55, Math.min(1, Math.min(wScale, hScale)));
      document.documentElement.style.setProperty('--ui-scale', uiScale.toString());
      
      setDimensions({
        scale,
        viewportWidth: w,
        viewportHeight: h,
        virtualXMin,
        virtualXMax,
        virtualYMin,
        virtualYMax,
        visibleVirtualWidth,
        visibleVirtualHeight,
        uiScale,
      });
    };

    const handleResizeThrottled = () => {
      cancelAnimationFrame(rAFId);
      rAFId = requestAnimationFrame(handleResize);
    };

    handleResize();
    window.addEventListener("resize", handleResizeThrottled);
    
    return () => {
      window.removeEventListener("resize", handleResizeThrottled);
      cancelAnimationFrame(rAFId);
    };
  }, [baseWidth, baseHeight, gameVp]);

  return dimensions;
}
