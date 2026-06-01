import React from 'react';
import { Player } from "@/lib/types/player";
import { MatchState } from "@/lib/utils/matchEngine";
import { MATCH_STAMINA_UI_CONFIG } from "@/features/match/constants/matchConfig";

interface EnergyDrinkModalProps {
  show: boolean;
  onClose: () => void;
  currentLineup: Player[];
  energyDrinkPick: string | null;
  setEnergyDrinkPick: (id: string) => void;
  onConfirm: () => void;
  matchState: MatchState;
  getPlayerMaxStamina: (p: Player) => number;
  getStaminaPercent: (p: Player, current: number) => number;
}

export const EnergyDrinkModal: React.FC<EnergyDrinkModalProps> = ({
  show,
  onClose,
  currentLineup,
  energyDrinkPick,
  setEnergyDrinkPick,
  onConfirm,
  matchState,
  getPlayerMaxStamina,
  getStaminaPercent
}) => {
  if (!show) return null;

  const staminaColor = (val: number) => val > 60 ? 'bg-green-500' : val > 30 ? 'bg-yellow-500' : 'bg-red-500';
  const gts = (matchState.quarter - 1) * 720 + (720 - matchState.clock);
  const anyLow = currentLineup.some(p => getStaminaPercent(p, matchState.playerStamina[p.id]) < 40);
  const allFresh = currentLineup.every(p => getStaminaPercent(p, matchState.playerStamina[p.id]) > 60);
  const selectedLocked = energyDrinkPick ? (() => { const lu = matchState.energyDrinkLocked[energyDrinkPick]; return !!lu && gts < lu; })() : false;

  return (
    <div className="absolute inset-0 bg-black/45 backdrop-blur-md z-[200] flex items-center justify-center transition-all">
      <div className="bg-[#1a2332] border-2 border-green-500/60 rounded-xl w-[480px] p-6 shadow-[0_0_40px_rgba(34,197,94,0.3)]">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-black text-white tracking-widest">ENERGY BOOST</h2>
          <button onClick={onClose} className="text-white text-2xl hover:text-red-400 cursor-pointer">✕</button>
        </div>
        <p className="text-gray-400 text-xs mb-1">{matchState.energyDrinksLeft} remaining - Choose a player to restore +{MATCH_STAMINA_UI_CONFIG.energyDrinkRecovery} stamina</p>
        {anyLow && <p className="text-yellow-400 text-[10px] mb-3 font-bold">Best use: target players below 40 stamina</p>}
        {allFresh && <p className="text-amber-500 text-[10px] mb-3 font-bold">All players fresh — consider saving boosts for Q4</p>}
        <div className="space-y-2 mb-4">
          {currentLineup.map(p => {
            const stam = matchState.playerStamina[p.id] ?? 100;
            const stamPct = getStaminaPercent(p, stam);
            const lockedUntil = matchState.energyDrinkLocked[p.id];
            const isLocked = !!lockedUntil && gts < lockedUntil;
            const lockRem = isLocked ? Math.max(0, lockedUntil - gts) : 0;
            const isLow = stamPct < 40;
            return (
              <button key={p.id}
                onClick={() => !isLocked && setEnergyDrinkPick(p.id)}
                disabled={isLocked}
                className={`w-full p-3 rounded-lg border-2 flex items-center gap-3 text-left transition-all
                  ${isLocked ? 'opacity-40 cursor-not-allowed border-gray-600 bg-gray-900/50'
                  : energyDrinkPick === p.id ? 'border-green-400 bg-green-500/10 cursor-pointer'
                  : 'border-gray-700 bg-[#0f1923] hover:border-gray-500 cursor-pointer'}`}>
                <div className="bg-[#d87625] text-white text-[10px] font-black px-2 py-0.5 rounded">{p.position}</div>
                <div className="flex-1">
                  <div className="text-white text-sm font-bold flex items-center gap-1">
                    {p.name}
                    {isLow && !isLocked && <span className="text-yellow-400 text-[10px] font-bold ml-1">LOW</span>}
                    {isLocked && <span className="text-gray-400 text-[10px] ml-1">{lockRem}s</span>}
                  </div>
                  <div className="flex gap-2 text-[10px] mt-0.5">
                    <span className="text-gray-400">OVR <b className="text-white">{p.ovr}</b></span>
                    <span className={`font-bold ${stamPct < 40 ? 'text-red-400' : stamPct < 60 ? 'text-yellow-400' : 'text-green-400'}`}>{Math.floor(stam)} STA</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full mt-1 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${staminaColor(stamPct)}`} style={{ width: `${stamPct}%` }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            disabled={!energyDrinkPick || selectedLocked}
            className={`flex-1 py-2 rounded-lg font-black text-sm tracking-widest transition-all
              ${energyDrinkPick && !selectedLocked
                ? 'bg-green-500 text-white hover:bg-green-400 cursor-pointer shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
            CONFIRM
          </button>
          <button onClick={onClose} className="flex-1 py-2 rounded-lg font-black text-sm bg-gray-700 text-white hover:bg-gray-600 cursor-pointer">CANCEL</button>
        </div>
      </div>
    </div>
  );
};
