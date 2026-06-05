import React from "react";

interface MatchTacticsStripProps {
  offStrategy: string;
  defStrategy: string;
  offCooldownEnd: number;
  defCooldownEnd: number;
  cooldownNow: number;
  onOpenStrategy: () => void;
}

const shortStrategy = (name: string) => {
  const trimmed = name.split("(")[0]?.trim() ?? name;
  return trimmed.length > 14 ? `${trimmed.slice(0, 14)}…` : trimmed;
};

const cooldownSeconds = (end: number, now: number) => Math.max(0, Math.ceil((end - now) / 1000));

function TacticButton({
  label,
  value,
  cooldownEnd,
  cooldownNow,
  accent,
  onClick,
}: {
  label: string;
  value: string;
  cooldownEnd: number;
  cooldownNow: number;
  accent: "cyan" | "red";
  onClick: () => void;
}) {
  const cd = cooldownSeconds(cooldownEnd, cooldownNow);
  const onCooldown = cd > 0;
  const accentClasses =
    accent === "cyan"
      ? "border-cyan-500/40 hover:border-cyan-400/70 text-cyan-300"
      : "border-red-500/40 hover:border-red-400/70 text-red-300";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-sm border bg-black/45 px-2.5 py-2 transition-colors ${accentClasses} ${
        onCooldown ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500">{label}</span>
        {onCooldown ? (
          <span className="text-[9px] font-mono font-black text-amber-400 tabular-nums">{cd}s</span>
        ) : (
          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Ready</span>
        )}
      </div>
      <div className="text-[10px] font-bold text-white truncate mt-0.5 uppercase tracking-wide">
        {shortStrategy(value)}
      </div>
    </button>
  );
}

export function MatchTacticsStrip({
  offStrategy,
  defStrategy,
  offCooldownEnd,
  defCooldownEnd,
  cooldownNow,
  onOpenStrategy,
}: MatchTacticsStripProps) {
  return (
    <div className="w-[132px] bg-[#101722]/95 border border-gray-700/50 rounded-xl p-2 shadow-2xl">
      <div className="text-[9px] font-black uppercase tracking-[0.22em] text-gray-400 text-center mb-2">
        Game Plan
      </div>
      <div className="flex flex-col gap-1.5">
        <TacticButton
          label="Offense"
          value={offStrategy}
          cooldownEnd={offCooldownEnd}
          cooldownNow={cooldownNow}
          accent="cyan"
          onClick={onOpenStrategy}
        />
        <TacticButton
          label="Defense"
          value={defStrategy}
          cooldownEnd={defCooldownEnd}
          cooldownNow={cooldownNow}
          accent="red"
          onClick={onOpenStrategy}
        />
      </div>
    </div>
  );
}
