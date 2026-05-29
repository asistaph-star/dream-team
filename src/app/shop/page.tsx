"use client";

import { useState } from "react";
import { useGameState } from "@/lib/context/GameStateContext";
import { Player } from "@/lib/types/player";
import { DraftRevealModal } from "@/components/shop/DraftRevealModal";
import { Sparkles, DollarSign } from "lucide-react";

export default function ShopPage() {
  const { tk, cash, draftPlayer } = useGameState();
  const [draftedPlayer, setDraftedPlayer] = useState<Player | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDraft = (isPremium: boolean) => {
    setErrorMsg(null);
    const result = draftPlayer(isPremium);
    
    if (result.success && result.player) {
      setDraftedPlayer(result.player);
    } else {
      setErrorMsg(result.error || "Failed to draft player");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Top Header */}
      <div className="p-4 bg-dt-navy-dark border-b border-dt-surface-border sticky top-0 z-10">
        <h1 className="text-xl font-bold text-dt-gold leading-tight drop-shadow-md">Draft & Shop</h1>
        <p className="text-xs text-gray-400 font-mono">Recruit new talent for your Dream Team.</p>
      </div>

      {/* Error Message Toast */}
      {errorMsg && (
        <div className="absolute top-20 left-4 right-4 bg-dt-red border border-red-400 text-white p-3 rounded-lg z-20 text-center font-bold text-sm shadow-lg animate-[fadeInUp_0.3s_ease-out]">
          {errorMsg}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-4 overflow-y-auto space-y-6">
        
        {/* Premium Draft Pack */}
        <div className="relative glass-panel rounded-2xl p-1 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-dt-gold via-dt-navy to-dt-navy-dark opacity-30 group-hover:opacity-50 transition-opacity" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-dt-gold blur-[60px] opacity-20" />
          
          <div className="relative bg-dt-navy-dark rounded-xl p-5 border border-dt-gold/30 flex flex-col items-center">
            <div className="absolute top-3 left-3 bg-dt-red text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              Hot
            </div>
            
            <div className="w-24 h-32 rounded-lg bg-gradient-to-b from-dt-gold to-orange-600 mb-4 flex items-center justify-center glow-gold border-2 border-yellow-300 shadow-xl transform group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="text-white w-10 h-10" />
            </div>
            
            <h3 className="text-lg font-black text-white italic tracking-wider uppercase">Premium Draft</h3>
            <p className="text-xs text-dt-gold mb-4 text-center mt-1">High chance for Epic & Legendary. Tiny chance for Mythic!</p>
            
            <button 
              onClick={() => handleDraft(true)}
              className="w-full py-3 rounded-full bg-gradient-to-r from-dt-gold to-orange-500 text-dt-navy-dark font-black tracking-widest flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)]"
            >
              <span>3,000 TK</span>
            </button>
          </div>
        </div>

        {/* Standard Draft Pack */}
        <div className="relative glass-panel rounded-2xl p-1 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-500 via-dt-navy to-dt-navy-dark opacity-20 group-hover:opacity-30 transition-opacity" />
          
          <div className="relative bg-dt-navy-dark rounded-xl p-5 border border-gray-600/50 flex flex-col items-center">
            
            <div className="w-24 h-32 rounded-lg bg-gradient-to-b from-gray-400 to-gray-700 mb-4 flex items-center justify-center border-2 border-gray-400 shadow-lg transform group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-black text-2xl">?</span>
            </div>
            
            <h3 className="text-lg font-black text-gray-200 italic tracking-wider uppercase">Standard Draft</h3>
            <p className="text-xs text-gray-400 mb-4 text-center mt-1">Common to Epic players. Good for building depth.</p>
            
            <button 
              onClick={() => handleDraft(false)}
              className="w-full py-3 rounded-full bg-dt-surface border border-dt-surface-border text-white font-bold tracking-widest flex items-center justify-center gap-2 hover:bg-white hover:text-dt-navy-dark transition-colors"
            >
              <DollarSign size={16} />
              <span>10.0M Cash</span>
            </button>
          </div>
        </div>

        {/* Padding for Bottom Nav */}
        <div className="h-6" />
      </div>

      {/* The Reveal Modal overlay */}
      <DraftRevealModal 
        player={draftedPlayer} 
        onClose={() => setDraftedPlayer(null)} 
      />
    </div>
  );
}
