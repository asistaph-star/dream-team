import React from "react";

interface FreeThrowPopupProps {
  ftSequence: {
    shooterId: string;
    shooterName: string;
    totalShots: number;
    isAnd1: boolean;
    results: ("make" | "miss")[];
    foulCommitterName: string;
    foulCommitterFouls: number;
    isUserTeam: boolean;
  } | null;
  activeFtIndex: number;
  activeFtStatus: "idle" | "aiming" | "shooting" | "resolved";
}

export function FreeThrowPopup({
  ftSequence,
  activeFtIndex,
  activeFtStatus,
}: FreeThrowPopupProps) {
  if (!ftSequence) return null;

  return (
    <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1 bg-[#0c0c0e]/95 border-2 border-yellow-500 rounded-xl px-3 py-1.5 shadow-[0_0_20px_rgba(234,179,8,0.5)] animate-bounce select-none pointer-events-none whitespace-nowrap">
      <span className="text-[8px] font-black text-yellow-400 tracking-widest uppercase">
        {ftSequence.isAnd1 ? "AND-1 FT" : "FREE THROW"}
      </span>
      <div className="flex gap-2 items-center justify-center">
        {ftSequence.results.map((r, i) => {
          if (i < activeFtIndex) {
            // Resolved past shots
            return (
              <div key={i} className="relative flex items-center justify-center w-6 h-6">
                {r === "make" ? (
                  <span
                    className="text-xl filter drop-shadow-[0_0_6px_rgba(34,197,94,1)]"
                    style={{ textShadow: "0 0 10px rgba(34,197,94,0.8)" }}
                  >
                    🏀
                  </span>
                ) : (
                  <span className="text-xl opacity-20 grayscale">🏀</span>
                )}
              </div>
            );
          } else if (i === activeFtIndex) {
            // Current active shot - Dynamic high stakes suspense phases
            if (activeFtStatus === "aiming") {
              return (
                <div key={i} className="relative flex items-center justify-center w-6 h-6">
                  <div className="w-5 h-5 rounded-full border-2 border-dashed border-yellow-400 animate-spin flex items-center justify-center shadow-[0_0_8px_rgba(234,179,8,0.4)]">
                    <span className="text-[8px] font-black text-yellow-400">🎯</span>
                  </div>
                </div>
              );
            } else if (activeFtStatus === "shooting") {
              return (
                <div key={i} className="relative flex items-center justify-center w-6 h-6">
                  <div
                    className="text-xl relative animate-bounce flex items-center justify-center"
                    style={{ animationDuration: "0.4s" }}
                  >
                    🏀
                    <div className="absolute inset-0 rounded-full bg-orange-500/40 blur-[3px] animate-ping" />
                  </div>
                </div>
              );
            } else {
              // resolved
              return (
                <div key={i} className="relative flex items-center justify-center w-6 h-6">
                  {r === "make" ? (
                    <span
                      className="text-xl filter drop-shadow-[0_0_8px_rgba(16,185,129,1)] scale-110 duration-200"
                      style={{ textShadow: "0 0 12px rgba(16,185,129,0.9)" }}
                    >
                      🏀
                    </span>
                  ) : (
                    <span className="text-xl opacity-20 grayscale scale-95 duration-200">🏀</span>
                  )}
                </div>
              );
            }
          } else {
            // Future shots
            return (
              <div key={i} className="relative flex items-center justify-center w-6 h-6">
                <div className="w-2.5 h-2.5 rounded-full bg-gray-700 border border-gray-900 shadow-inner" />
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
