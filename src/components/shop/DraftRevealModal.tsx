import { Player, PlayerRarity } from "@/lib/types/player";
import { PlayerCard } from "@/components/player/PlayerCard";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

interface DraftRevealModalProps {
  player: Player | null;
  onClose: () => void;
}

const rarityThemes: Record<PlayerRarity, { text: string, bg: string, ring: string }> = {
  Common: { text: "text-gray-300", bg: "bg-gray-900/90", ring: "ring-gray-500" },
  Rare: { text: "text-blue-400", bg: "bg-blue-900/90", ring: "ring-blue-500" },
  Epic: { text: "text-purple-400 text-shadow-purple", bg: "bg-purple-900/90", ring: "ring-purple-500" },
  Legendary: { text: "text-yellow-400 text-shadow-gold", bg: "bg-yellow-900/90", ring: "ring-yellow-400" },
  Mythic: { text: "text-red-500 text-shadow-red animate-pulse", bg: "bg-red-950/95", ring: "ring-red-500" },
};

export function DraftRevealModal({ player, onClose }: DraftRevealModalProps) {
  const [stage, setStage] = useState<"hidden" | "animating" | "revealed">("hidden");

  useEffect(() => {
    if (player) {
      setStage("animating");
      // Simulate animation delay before showing the card
      const timer = setTimeout(() => {
        setStage("revealed");
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setStage("hidden");
    }
  }, [player]);

  if (!player || stage === "hidden") return null;

  const theme = rarityThemes[player.rarity];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-dt-navy-dark/95 backdrop-blur-md">
      {/* Top right close button */}
      {stage === "revealed" && (
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-dt-surface border border-dt-surface-border flex items-center justify-center text-white hover:text-dt-cyan transition-colors z-10"
        >
          <X size={24} />
        </button>
      )}

      {stage === "animating" ? (
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="relative w-32 h-32">
            <div className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${theme.ring}`} />
            <div className={`absolute inset-4 rounded-full border-4 border-b-transparent animate-[spin_1.5s_linear_infinite_reverse] ${theme.ring} opacity-50`} />
            <div className={`absolute inset-0 flex items-center justify-center ${theme.text} font-black text-2xl`}>
              ?
            </div>
          </div>
          <h2 className="text-xl font-mono text-white animate-pulse tracking-widest uppercase">Opening Pack...</h2>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full max-w-sm animate-[fadeInUp_0.5s_ease-out]">
          
          {/* Rarity Text */}
          <div className="mb-8 text-center relative w-full">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-32 ${theme.bg} blur-3xl opacity-50 -z-10`} />
            <h2 className={`text-4xl font-black italic tracking-widest uppercase ${theme.text}`}>
              {player.rarity}
            </h2>
            <p className="text-white text-sm font-mono mt-2 uppercase tracking-widest">New Player Acquired!</p>
          </div>

          {/* The Card */}
          <div className="w-full max-w-[280px] transform hover:scale-105 transition-transform duration-300">
            <PlayerCard player={player} />
          </div>

          {/* Action Button */}
          <button 
            onClick={onClose}
            className="mt-12 px-8 py-3 bg-dt-surface border border-dt-surface-border text-white rounded-full font-bold uppercase tracking-wider hover:bg-white hover:text-dt-navy-dark transition-colors"
          >
            Tap to Continue
          </button>
        </div>
      )}
    </div>
  );
}
