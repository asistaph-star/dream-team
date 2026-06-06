import React from "react";
import { SKILL_QUALITY_ORDER, getSkillQualityRate, SkillQuality } from "@/lib/skills/skillCatalog";
import { getSkillDisplayName } from "@/lib/skills/skillDisplay";

export type SkillBadgeColor = "red" | "blue" | "green" | "special";

export const skillBadgeStyles: Record<SkillBadgeColor, string> = {
  red: "bg-neutral-950/80 border-[#ff8b96] text-white shadow-red-500/30",
  blue: "bg-neutral-950/80 border-[#8fd7ff] text-white shadow-blue-500/30",
  green: "bg-neutral-950/80 border-[#a3ffc2] text-white shadow-emerald-500/30",
  special: "bg-neutral-950/80 border-[#ffe597] text-white shadow-amber-500/30",
};

export const skillQualityStyles: Record<SkillQuality, string> = {
  Common: "bg-neutral-950/80 border-[#9dffb7] text-white shadow-emerald-500/30",
  Rare: "bg-neutral-950/80 border-[#95dcff] text-white shadow-blue-500/30",
  Elite: "bg-neutral-950/80 border-[#efb6ff] text-white shadow-purple-500/30",
  Epic: "bg-neutral-950/80 border-[#ffe59a] text-white shadow-orange-500/30",
  Legendary: "bg-neutral-950/80 border-[#ffa2ad] text-white shadow-red-500/30",
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

  // Official Family Names (IDs and display formats)
  "deep_strike": "deep-strike",
  "deep strike": "deep-strike",
  "court_vision_engine": "court-vision-engine",
  "court vision engine": "court-vision-engine",
  "poster_spark": "poster-spark",
  "poster spark": "poster-spark",
  "flop": "flop",
  "broken_play_rescue": "broken-play-rescue",
  "broken play rescue": "broken-play-rescue",
  "sky_wall": "sky-wall",
  "sky wall": "sky-wall",
  "lock_chain": "lock-chain",
  "lock chain": "lock-chain",
  "defensive_anchor": "defensive-anchor",
  "defensive anchor": "defensive-anchor",
  "clean_challenge": "clean-challenge",
  "clean challenge": "clean-challenge",
  "glass_strike": "glass-strike",
  "glass strike": "glass-strike",
  "bench_captain": "bench-captain",
  "bench captain": "bench-captain",
  "momentum_swing": "momentum-swing",
  "momentum swing": "momentum-swing",
  "composure_shield": "composure-shield",
  "composure shield": "composure-shield",
  "gameplan_jammer": "gameplan-jammer",
  "gameplan jammer": "gameplan-jammer",
  "timeout_reset": "timeout-reset",
  "timeout reset": "timeout-reset",

  // Legacy Input Compatibility (resolved internally to clean paths)
  "red dot x": "deep-strike",
  "four-point bait x": "deep-strike",
  "chain pass x": "court-vision-engine",
  "lung burner x": "poster-spark",
  "contact tax x": "poster-spark",
  "flop x": "flop",
  "false-whistle-x": "broken-play-rescue",
  "false whistle x": "broken-play-rescue",
  "cage step x": "lock-chain",
  "corner trap x": "defensive-anchor",
  "five-man squeeze x": "defensive-anchor",
  "five man squeeze x": "defensive-anchor",
  "clean contest x": "clean-challenge",
  "pressure coach x": "bench-captain",
  "composure x": "composure-shield",
  "dead air x": "gameplan-jammer",
  "debt collector x": "gameplan-jammer",
  "cold timeout x": "timeout-reset",
};

const familySkillSlugs = new Set([
  "deep-strike",
  "court-vision-engine",
  "poster-spark",
  "flop",
  "broken-play-rescue",
  "sky-wall",
  "lock-chain",
  "defensive-anchor",
  "clean-challenge",
  "glass-strike",
  "bench-captain",
  "momentum-swing",
  "composure-shield",
  "gameplan-jammer",
  "timeout-reset"
]);

export function getSkillArtSrc(name: string, color: SkillBadgeColor, locked?: boolean, quality: SkillQuality = "Common"): string {
  if (locked) return "/skills/locked-85.png";
  if (color === "special" && name === "Learn") return "/skills/learn-slot.png";
  const slug = skillArtMap[name.toLowerCase()] ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  
  if (familySkillSlugs.has(slug)) {
    return `/skills/family/${slug}.png`;
  }
  
  if (color === "special") return `/skills/special/${slug}-${quality.toLowerCase()}.png`;
  return `/skills/${slug}.png`;
}

export function getBacklightGlow(color: SkillBadgeColor, quality: SkillQuality = "Common"): string {
  if (color !== "special") {
    if (color === "red") return "rgba(255, 75, 95, 0.35)";
    if (color === "blue") return "rgba(57, 184, 255, 0.35)";
    if (color === "green") return "rgba(83, 242, 140, 0.35)";
    return "rgba(255, 255, 255, 0.15)";
  }
  const qualityGlows: Record<SkillQuality, string> = {
    Common: "rgba(64, 227, 111, 0.25)",
    Rare: "rgba(63, 200, 255, 0.35)",
    Elite: "rgba(210, 99, 255, 0.4)",
    Epic: "rgba(255, 211, 91, 0.4)",
    Legendary: "rgba(255, 83, 104, 0.45)",
  };
  return qualityGlows[quality] || "rgba(255, 255, 255, 0.15)";
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
  const displayName = getSkillDisplayName(shortName);
  const activeQuality = quality ?? "Common";

  let resolvedColor = color;
  if (color === "special" && shortName !== "Learn") {
    const nameLower = shortName.toLowerCase();
    if (
      nameLower === "deep_strike" ||
      nameLower === "deep strike" ||
      nameLower === "red dot x" ||
      nameLower === "four-point bait x" ||
      nameLower === "court_vision_engine" ||
      nameLower === "court vision engine" ||
      nameLower === "chain pass x" ||
      nameLower === "poster_spark" ||
      nameLower === "poster spark" ||
      nameLower === "lung burner x" ||
      nameLower === "contact tax x" ||
      nameLower === "flop" ||
      nameLower === "flop x" ||
      nameLower === "broken_play_rescue" ||
      nameLower === "broken play rescue"
    ) {
      resolvedColor = "red";
    } else if (
      nameLower === "sky_wall" ||
      nameLower === "sky wall" ||
      nameLower === "lock_chain" ||
      nameLower === "lock chain" ||
      nameLower === "cage step x" ||
      nameLower === "defensive_anchor" ||
      nameLower === "defensive anchor" ||
      nameLower === "corner trap x" ||
      nameLower === "five-man squeeze x" ||
      nameLower === "five man squeeze x" ||
      nameLower === "clean_challenge" ||
      nameLower === "clean challenge" ||
      nameLower === "clean contest x" ||
      nameLower === "glass_strike" ||
      nameLower === "glass strike"
    ) {
      resolvedColor = "blue";
    } else if (
      nameLower === "bench_captain" ||
      nameLower === "bench captain" ||
      nameLower === "pressure coach x" ||
      nameLower === "momentum_swing" ||
      nameLower === "momentum swing" ||
      nameLower === "composure_shield" ||
      nameLower === "composure shield" ||
      nameLower === "composure x" ||
      nameLower === "gameplan_jammer" ||
      nameLower === "gameplan jammer" ||
      nameLower === "dead air x" ||
      nameLower === "debt collector x" ||
      nameLower === "timeout_reset" ||
      nameLower === "timeout reset" ||
      nameLower === "cold timeout x"
    ) {
      resolvedColor = "green";
    }
  }

  const artSrc = getSkillArtSrc(shortName, color, locked, activeQuality);
  const lockLabel = unlockText ? `Unlocks at ${unlockText}` : "Locked 85+";
  const unlockedStyle = color === "special" ? skillQualityStyles[activeQuality] : skillBadgeStyles[resolvedColor];
  const isLearnSlot = color === "special" && shortName === "Learn";
  const showFlameAura = color === "special" && !locked;
  const flameTier = isLearnSlot ? "learn" : activeQuality.toLowerCase();

  const glowColor = getBacklightGlow(resolvedColor, activeQuality);
  const badgeFace = (
    <div
      className={`relative z-[1] flex h-10 w-10 items-center justify-center overflow-hidden rounded-[8px] border-2 transition-transform duration-150 group-hover/skill:scale-110 ${
        locked 
          ? "bg-gradient-to-br from-zinc-700 via-zinc-900 to-black border-zinc-500/60 text-zinc-400 opacity-80 shadow-[0_0_10px_rgba(0,0,0,0.45)]" 
          : `${unlockedStyle} ${showFlameAura ? "shadow-[0_0_6px_rgba(0,0,0,0.55)]" : "shadow-[0_0_16px_var(--tw-shadow-color)]"}`
      }`}
    >
      {!locked && (
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`
          }}
        />
      )}
      <img
        src={`${artSrc}?v=6`}
        alt={locked ? "Locked skill" : displayName}
        className="absolute inset-0 h-full w-full object-contain p-[3px] contrast-[1.08] saturate-[1.14] drop-shadow-[0_2px_3px_rgba(0,0,0,0.85)] z-[1]"
        draggable={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.12),transparent_30%,rgba(0,0,0,0.2)_100%)] z-[2]" />
    </div>
  );

  return (
    <div
      className={`group/skill relative h-10 w-10 shrink-0 ${showFlameAura ? "skill-badge-shell" : ""}`}
      title={locked ? `${displayName} ${lockLabel}` : `${displayName}${color === "special" ? ` (${activeQuality})` : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!locked && onClick) onClick();
      }}
    >
      {showFlameAura && (
        <div className={`skill-flame-aura skill-flame-aura--${flameTier}`} aria-hidden>
          <span className="skill-flame-base" />
          <span className="skill-flame-tongue skill-flame-tongue-1" />
          <span className="skill-flame-tongue skill-flame-tongue-2" />
          <span className="skill-flame-tongue skill-flame-tongue-3" />
          <span className="skill-flame-tongue skill-flame-tongue-4" />
          <span className="skill-flame-ember" />
        </div>
      )}
      {badgeFace}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 hidden min-w-32 -translate-x-1/2 rounded border border-white/10 bg-black/95 px-2 py-1 text-[8px] font-black uppercase tracking-wide text-white shadow-xl group-hover/skill:block">
        <div className="whitespace-nowrap">{locked ? lockLabel : displayName}</div>
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
