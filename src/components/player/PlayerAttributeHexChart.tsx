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
const MIN_SCALE = 120;

const polar = (index: number, total: number, radius: number) => {
  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
};

const ringPoints = (vertexCount: number, radius: number) =>
  Array.from({ length: vertexCount }, (_, index) => {
    const { x, y } = polar(index, vertexCount, radius);
    return `${x},${y}`;
  }).join(" ");

const dataPoints = (values: number[], maxRadius: number, scaleMax: number) =>
  values
    .map((value, index) => {
      const radius = (Math.max(0, value) / scaleMax) * maxRadius;
      const { x, y } = polar(index, values.length, radius);
      return `${x},${y}`;
    })
    .join(" ");

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
  scaleMax?: number;
}

export function PlayerAttributeHexChart({ axes, accentColor = "#d61e38", scaleMax: scaleMaxProp }: PlayerAttributeHexChartProps) {
  const values = axes.map((axis) => axis.value);
  const scaleMax = scaleMaxProp ?? Math.max(MIN_SCALE, ...values);
  const gridLevels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={CHART_SIZE}
        height={CHART_SIZE}
        viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
        className="drop-shadow-[0_0_18px_rgba(214,30,56,0.15)]"
        aria-label="Player attribute hex chart"
      >
        {gridLevels.map((level) => (
          <polygon
            key={level}
            points={ringPoints(axes.length, MAX_RADIUS * level)}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />
        ))}

        {axes.map((_, index) => {
          const end = polar(index, axes.length, MAX_RADIUS);
          return (
            <line
              key={`spoke-${index}`}
              x1={CENTER}
              y1={CENTER}
              x2={end.x}
              y2={end.y}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
          );
        })}

        <polygon
          points={dataPoints(values, MAX_RADIUS, scaleMax)}
          fill={`${accentColor}33`}
          stroke={accentColor}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {values.map((value, index) => {
          const radius = (Math.max(0, value) / scaleMax) * MAX_RADIUS;
          const { x, y } = polar(index, axes.length, radius);
          return (
            <circle
              key={`dot-${index}`}
              cx={x}
              cy={y}
              r="3.5"
              fill={accentColor}
              stroke="#fff"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      <div className="absolute inset-0 pointer-events-none">
        {axes.map((axis, index) => {
          const labelPoint = polar(index, axes.length, MAX_RADIUS + 22);
          return (
            <div
              key={axis.short}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: labelPoint.x, top: labelPoint.y }}
            >
              <span className="text-[9px] font-black text-white/90 uppercase tracking-widest">{axis.short}</span>
              <span className="text-[10px] font-mono font-bold text-[#d61e38]">{axis.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
