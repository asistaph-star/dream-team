import React from "react";

interface ItemGlyphProps {
  label: string;
  sublabel?: string;
  glowColor: string;
}

export function ItemGlyph({ label, sublabel, glowColor }: ItemGlyphProps) {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <div
        className="absolute inset-2 border border-white/10 rounded-sm pointer-events-none"
        style={{ boxShadow: `inset 0 0 18px ${glowColor}55, 0 0 14px ${glowColor}33` }}
      />
      <span
        className="relative z-10 text-base font-black tracking-[0.18em] text-white"
        style={{ textShadow: `0 0 10px ${glowColor}` }}
      >
        {label}
      </span>
      {sublabel ? (
        <span className="relative z-10 text-[8px] font-bold text-white/45 tracking-[0.22em] mt-1 uppercase">
          {sublabel}
        </span>
      ) : null}
    </div>
  );
}
