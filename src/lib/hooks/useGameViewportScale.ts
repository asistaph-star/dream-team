import { useState, useEffect } from "react";

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
    let rAFId: number;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      // Cover-style scaling formula
      const scale = Math.max(w / baseWidth, h / baseHeight);
      
      const visibleVirtualWidth = w / scale;
      const visibleVirtualHeight = h / scale;
      
      const virtualXMin = (baseWidth - visibleVirtualWidth) / 2;
      const virtualXMax = (baseWidth + visibleVirtualWidth) / 2;
      
      const virtualYMin = (baseHeight - visibleVirtualHeight) / 2;
      const virtualYMax = (baseHeight + visibleVirtualHeight) / 2;
      
      // UI Scale calculation for responsive shrinking without bars
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
  }, [baseWidth, baseHeight]);

  return dimensions;
}
