import React from "react";
import { SKILL_QUALITY_ORDER, getSkillQualityRate, SkillQuality } from "@/lib/skills/skillCatalog";

export type SkillBadgeColor = "red" | "blue" | "green" | "special";

export const skillBadgeStyles: Record<SkillBadgeColor, string> = {
  red: "from-[#ff4b5f] via-[#a70f26] to-[#27040a] border-[#ff8b96] text-white shadow-red-500/30",
  blue: "from-[#39b8ff] via-[#1163d8] to-[#061b48] border-[#8fd7ff] text-white shadow-blue-500/30",
  green: "from-[#53f28c] via-[#10994b] to-[#062b18] border-[#a3ffc2] text-white shadow-emerald-500/30",
  special: "from-[#ffd45c] via-[#e04435] to-[#351006] border-[#ffe597] text-white shadow-amber-500/30",
};

export const skillQualityStyles: Record<SkillQuality, string> = {
  Common: "from-[#40e36f] via-[#11863d] to-[#041c0d] border-[#9dffb7] text-white shadow-emerald-500/30",
  Rare: "from-[#3fc8ff] via-[#1465e8] to-[#061842] border-[#95dcff] text-white shadow-blue-500/30",
  Elite: "from-[#d263ff] via-[#7c28d6] to-[#23053e] border-[#efb6ff] text-white shadow-purple-500/30",
  Epic: "from-[#ffd35b] via-[#ee7a1f] to-[#341101] border-[#ffe59a] text-white shadow-orange-500/30",
  Legendary: "from-[#ff5368] via-[#d61022] to-[#310407] border-[#ffa2ad] text-white shadow-red-500/30",
};

const skillArtMap: Record<string, string> = {
  "tempo surgeon": "tempo-surgeon",
  "screen breaker": "screen-breaker",
  "complete engine": "complete-engine",
  "paint magnet": "paint-magnet",
  "rim warden": "rim-warden",
  "iron motor": "iron-motor",
  "arc pressure": "arc-pressure",
  "shadow guard": "shadow-guard",
  "mismatch caller": "mismatch-caller",
  "hands active": "hands-active",
  "tempo switch": "tempo-switch",
  "glass touch": "glass-touch",
  "discipline wall": "discipline-wall",
  "connector hub": "connector-hub",
  "debt collector x": "debt-collector-x",
  "clean_challenge": "clean-contest-x",
  "composure_shield": "composure-x",
  "timeout_reset": "cold-timeout-x",
  "court_vision_engine": "chain-pass-x",
  "bench_captain": "pressure-coach-x",
  "lock_chain": "cage-step-x",
  "sky_wall": "rim-warden",
};

export function getSkillArtSrc(name: string, color: SkillBadgeColor, locked?: boolean, quality: SkillQuality = "Common"): string {
  if (locked) return "/skills/locked-85.png";
  if (color === "special" && name === "Learn") return "/skills/learn-slot.png";
  const slug = skillArtMap[name.toLowerCase()] ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (color === "special") return `/skills/special-art/${slug}.png`;
  return `/skills/${slug}.png`;
}

export interface SkillBadgeProps {
  name: string;
  color: SkillBadgeColor;
  locked?: boolean;
  unlockText?: string;
  quality?: SkillQuality;
  maxRate?: number;
  tapeCount?: number;
  onClick?: () => void;
  actionLabel?: string;
}

export function SkillBadge({
  name,
  color,
  locked,
  unlockText,
  quality,
  maxRate,
  tapeCount,
  onClick,
  actionLabel,
}: SkillBadgeProps) {
  const shortName = name.replace(/\s+/g, " ").trim();
  const activeQuality = quality ?? "Common";
  const artSrc = getSkillArtSrc(shortName, color, locked, activeQuality);
  const lockLabel = unlockText ? `Unlocks at ${unlockText}` : "Locked 85+";
  const unlockedStyle = color === "special" ? skillQualityStyles[activeQuality] : skillBadgeStyles[color];

  return (
    <div
      className={`group/skill relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border-2 bg-gradient-to-br shadow-[0_0_16px_var(--tw-shadow-color)] transition-transform duration-150 hover:scale-110 ${locked ? "from-zinc-700 via-zinc-900 to-black border-zinc-500/60 text-zinc-400 opacity-80 shadow-black/30" : unlockedStyle
        } ${!locked && color === "special" && (activeQuality === "Epic" || activeQuality === "Legendary") ? "skill-fire-aura" : ""} ${!locked && color === "special" && activeQuality === "Legendary" ? "skill-fire-aura-legendary" : ""}`}
      title={locked ? `${shortName} ${lockLabel}` : `${shortName}${color === "special" ? ` (${activeQuality})` : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!locked && onClick) onClick();
      }}
    >
      <img
        src={artSrc}
        alt={locked ? "Locked skill" : shortName}
        className="absolute inset-0 h-full w-full object-contain p-[3px] contrast-[1.08] saturate-[1.14] drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)]"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_30%,rgba(0,0,0,0.2)_100%)]" />
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden min-w-32 -translate-x-1/2 rounded border border-white/10 bg-black/95 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-white shadow-xl group-hover/skill:block">
        <div className="whitespace-nowrap">{locked ? lockLabel : shortName}</div>
        {!locked && color === "special" && maxRate && (
          <div className="mt-1 grid gap-0.5 text-left  text-[7px] normal-case tracking-normal">
            {SKILL_QUALITY_ORDER.map((tier) => (
              <div
                key={tier}
                className={`flex justify-between gap-2 ${tier === activeQuality ? "text-yellow-300" : "text-zinc-300"}`}
              >
                <span>{tier}</span>
                <span>{getSkillQualityRate(maxRate, tier)}</span>
              </div>
            ))}
            <div className="mt-1 border-t border-white/10 pt-1 text-[7px] text-red-200">
              Skill Tape: {tapeCount ?? 0} | {actionLabel ?? "Click reroll"}
            </div>
          </div>
        )}
        {!locked && color === "special" && !maxRate && (
          <div className="mt-1 border-t border-white/10 pt-1 text-[7px] text-red-200">
            Skill Tape: {tapeCount ?? 0} | {actionLabel ?? "Click learn"}
          </div>
        )}
      </div>
    </div>
  );
}
