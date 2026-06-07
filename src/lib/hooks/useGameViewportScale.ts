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
