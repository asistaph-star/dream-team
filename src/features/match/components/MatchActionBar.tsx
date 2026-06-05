import React from "react";
import { MatchState } from "@/lib/utils/matchEngine";

interface MatchActionBarProps {
  openModal: (type: "strategy" | "sub" | "energydrink") => void;
  handleTimeout: () => void;
  handleMomentum: () => void;
  matchState: MatchState;
  timeoutCountdown: number;
  momentumTimer: number;
  subCooldownEnd: number;
  cooldownNow: number;
}

function ActionButton({
  label,
  sublabel,
  onClick,
  disabled,
  cooldownSeconds,
  remaining,
}: {
  label: string;
  sublabel?: string;
  onClick?: () => void;
  disabled?: boolean;
  cooldownSeconds?: number;
  remaining?: number;
}) {
  const showCooldown = typeof cooldownSeconds === "number" && cooldownSeconds > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`relative w-[48px] h-[48px] rounded flex flex-col items-center justify-center transition-all shadow-sm justify-self-center ${
        disabled
          ? "bg-[#a6621a] cursor-not-allowed opacity-90 text-white/70"
          : "bg-[#f27420] hover:bg-[#ff893b] text-white cursor-pointer hover:scale-105 active:scale-95"
      }`}
    >
      <span className="text-[11px] font-black leading-none tracking-wider">{label}</span>
      {sublabel ? (
        <span className="text-[7px] font-bold uppercase tracking-widest leading-none mt-0.5 opacity-80">
          {sublabel}
        </span>
      ) : null}
      {showCooldown && (
        <div className="absolute inset-0 bg-black/80 rounded flex flex-col items-center justify-center text-[11px] font-black text-orange-400">
          <span className="tabular-nums">{cooldownSeconds}</span>
          <span className="text-[6px] text-gray-400 uppercase tracking-widest leading-none">CD</span>
        </div>
      )}
      {!showCooldown && typeof remaining === "number" && (
        <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 rounded-sm bg-black/70 text-[8px] font-black leading-[14px] text-center">
          {remaining}
        </span>
      )}
    </button>
  );
}

export function MatchActionBar({
  openModal,
  handleTimeout,
  matchState,
  timeoutCountdown,
  subCooldownEnd,
  cooldownNow,
}: MatchActionBarProps) {
  const subCd = cooldownNow < subCooldownEnd ? Math.ceil((subCooldownEnd - cooldownNow) / 1000) : 0;

  return (
    <div className="flex flex-col gap-1 w-[132px]">
      <div className="bg-[#1a2436] rounded-xl p-3 shadow-2xl flex flex-col border border-gray-700/30">
        <div className="text-white font-bold text-[12px] text-center mb-1 tracking-wide uppercase">
          Bench Control
        </div>
        <div className="text-[9px] text-gray-400 text-center mb-2 tabular-nums">
          Crowd {(matchState.audience || 0).toLocaleString()}
        </div>
        <div className="bg-[#101722] rounded-lg p-1.5 grid grid-cols-2 gap-1.5">
          <ActionButton
            label="SUB"
            sublabel="Swap"
            onClick={() => openModal("sub")}
            cooldownSeconds={subCd}
          />
          <ActionButton
            label="TACT"
            sublabel="Plan"
            onClick={() => openModal("strategy")}
          />
          <ActionButton
            label="T/O"
            sublabel="Rest"
            onClick={handleTimeout}
            disabled={matchState.timeoutsLeft <= 0 || timeoutCountdown > 0}
            cooldownSeconds={timeoutCountdown > 0 ? timeoutCountdown : undefined}
            remaining={timeoutCountdown > 0 ? undefined : matchState.timeoutsLeft}
          />
          <ActionButton
            label="NRG"
            sublabel="Boost"
            onClick={() => openModal("energydrink")}
            disabled={matchState.energyDrinksLeft <= 0}
            remaining={matchState.energyDrinksLeft}
          />
        </div>
      </div>
    </div>
  );
}
