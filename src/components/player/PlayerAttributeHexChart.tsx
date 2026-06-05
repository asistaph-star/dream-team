import React from "react";
import { DetailedAttributes } from "@/lib/utils/starGrowth";

export interface HexAxis {
  label: string;
  short: string;
  value: number;
}

const CHART_SIZE = 220;
const CENTER = CHART_SIZE / 2;
const MAX_RADIUS = 78;
const SCALE_MAX = 99;

const polar = (index: number, total: number, radius: number) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
};

const toClipPolygon = (values: number[], maxRadius: number) => {
  const points = values
    .map((value, index) => {
      const radius = (Math.min(value, SCALE_MAX) / SCALE_MAX) * maxRadius;
      const { x, y } = polar(index, values.length, radius);
      return `${(x / CHART_SIZE) * 100}% ${(y / CHART_SIZE) * 100}%`;
    })
    .join(", ");
  return `polygon(${points})`;
};

export const buildHexAxes = (details: DetailedAttributes): HexAxis[] => [
  {
    label: "Shooting",
    short: "SHOOT",
    value: Math.round((details.threePt + details.twoPt + details.freeThrow) / 3),
  },
  {
    label: "Finishing",
    short: "FIN",
    value: details.finishing,
  },
  {
    label: "Playmaking",
    short: "PLAY",
    value: Math.round((details.handle + details.assist) / 2),
  },
  {
    label: "Defense",
    short: "DEF",
    value: Math.round((details.steal + details.block + details.onBall) / 3),
  },
  {
    label: "Rebounding",
    short: "REB",
    value: details.rebound,
  },
  {
    label: "Mental",
    short: "IQ",
    value: Math.round((details.basketballIQ + details.hustle + details.calm) / 3),
  },
];

interface PlayerAttributeHexChartProps {
  axes: HexAxis[];
  accentColor?: string;
}

export function PlayerAttributeHexChart({ axes, accentColor = "#d61e38" }: PlayerAttributeHexChartProps) {
  const values = axes.map((axis) => axis.value);
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div
      className="relative drop-shadow-[0_0_18px_rgba(214,30,56,0.15)]"
      style={{ width: CHART_SIZE, height: CHART_SIZE }}
      aria-label="Player attribute hex chart"
    >
      {gridLevels.map((level) => (
        <div
          key={level}
          className="absolute inset-0 border border-white/[0.08]"
          style={{ clipPath: toClipPolygon(axes.map(() => SCALE_MAX * level), MAX_RADIUS * level) }}
        />
      ))}

      {axes.map((_, index) => {
        const end = polar(index, axes.length, MAX_RADIUS);
        const angleDeg = (index / axes.length) * 360 - 90;
        const length = Math.hypot(end.x - CENTER, end.y - CENTER);
        return (
          <div
            key={`spoke-${index}`}
            className="absolute left-1/2 top-1/2 w-px bg-white/10 origin-top"
            style={{
              height: length,
              transform: `translate(-50%, 0) rotate(${angleDeg}deg)`,
            }}
          />
        );
      })}

      <div
        className="absolute inset-0 border-2"
        style={{
          clipPath: toClipPolygon(values, MAX_RADIUS),
          backgroundColor: `${accentColor}33`,
          borderColor: accentColor,
        }}
      />

      {values.map((value, index) => {
        const radius = (Math.min(value, SCALE_MAX) / SCALE_MAX) * MAX_RADIUS;
        const { x, y } = polar(index, axes.length, radius);
        return (
          <div
            key={`dot-${index}`}
            className="absolute w-[7px] h-[7px] rounded-full border border-white"
            style={{
              left: x,
              top: y,
              transform: "translate(-50%, -50%)",
              backgroundColor: accentColor,
            }}
          />
        );
      })}

      {axes.map((axis, index) => {
        const labelPoint = polar(index, axes.length, MAX_RADIUS + 22);
        return (
          <div
            key={axis.short}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
            style={{ left: labelPoint.x, top: labelPoint.y }}
          >
            <span className="text-[9px] font-black text-white/90 uppercase tracking-widest">{axis.short}</span>
            <span className="text-[10px] font-mono font-bold text-[#d61e38]">{axis.value}</span>
          </div>
        );
      })}
    </div>
  );
}
