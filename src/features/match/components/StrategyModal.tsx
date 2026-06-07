import React from 'react';
import { MatchState } from "@/lib/utils/matchEngine";

interface StrategyModalProps {
  show: boolean;
  onClose: () => void;
  matchState: MatchState;
  offCooldownEnd: number;
  defCooldownEnd: number;
  cooldownNow: number;
  onOffStrategyChange: (name: string) => void;
  onDefStrategyChange: (name: string) => void;
  offensiveStrategies: Record<string, any>;
  defensiveStrategies: Record<string, any>;
}

export const StrategyModal: React.FC<StrategyModalProps> = ({
  show,
  onClose,
  matchState,
  offCooldownEnd,
  defCooldownEnd,
  cooldownNow,
  onOffStrategyChange,
  onDefStrategyChange,
  offensiveStrategies,
  defensiveStrategies,
}) => {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-black/45 backdrop-blur-md z-[200] flex items-center justify-center transition-all">
      <div className="bg-[#1a2332] border-2 border-yellow-500/60 rounded-xl w-[calc(100%-2rem)] max-w-[900px] max-h-[85vh] overflow-y-auto p-4 sm:p-6 shadow-[0_0_40px_rgba(234,179,8,0.3)]">
          <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-white tracking-widest">STRATEGY</h2>
              <button onClick={onClose} className="text-white text-2xl hover:text-red-400 cursor-pointer">✕</button>
          </div>
          {/* Offense */}
          <h3 className="text-yellow-400 font-bold text-sm tracking-widest mb-3 uppercase">Offense Strategies</h3>
          <div className="grid grid-cols-2 gap-3 mb-6">
              {Object.entries(offensiveStrategies).map(([name, mods]) => {
                  const isActive = matchState.userOffStrategy === name;
                  const onCooldown = cooldownNow < offCooldownEnd && !isActive;
                  const cdSec = Math.ceil((offCooldownEnd - cooldownNow) / 1000);
                  return (
                      <button key={name} onClick={() => onOffStrategyChange(name)}
                          className={`relative p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${isActive ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-gray-700 bg-[#0f1923] hover:border-gray-500'} ${onCooldown ? 'opacity-40' : ''}`}>
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-white font-bold text-sm">{name}</span>
                              <span className="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded">BASE</span>
                          </div>
                          <div className="flex gap-1">
                              {['C','PF','SF','SG','PG'].map(pos => {
                                  const val = Math.round((mods[pos] || 1) * 100);
                                  return <span key={pos} className={`text-[10px] font-bold px-2 py-0.5 rounded ${val > 100 ? 'bg-yellow-500/20 text-yellow-400' : val < 100 ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>{pos} {val}%</span>;
                              })}
                          </div>
                          {onCooldown && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg"><span className="text-red-400 font-bold text-lg">{cdSec}s</span></div>}
                      </button>
                  );
              })}
          </div>
          {/* Defense */}
          <h3 className="text-yellow-400 font-bold text-sm tracking-widest mb-3 uppercase">Defense Strategies</h3>
          <div className="grid grid-cols-2 gap-3">
              {Object.entries(defensiveStrategies).map(([name, mods]) => {
                  const isActive = matchState.userDefStrategy === name;
                  const onCooldown = cooldownNow < defCooldownEnd && !isActive;
                  const cdSec = Math.ceil((defCooldownEnd - cooldownNow) / 1000);
                  return (
                      <button key={name} onClick={() => onDefStrategyChange(name)}
                          className={`relative p-4 rounded-lg border-2 text-left transition-all cursor-pointer ${isActive ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-gray-700 bg-[#0f1923] hover:border-gray-500'} ${onCooldown ? 'opacity-40' : ''}`}>
                          <div className="flex justify-between items-center mb-3">
                              <span className="text-white font-bold text-sm">{name}</span>
                              <span className="bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded">BASE</span>
                          </div>
                          <div className="flex gap-1">
                              {['C','PF','SF','SG','PG'].map(pos => {
                                  const val = Math.round((mods[pos] || 1) * 100);
                                  return <span key={pos} className={`text-[10px] font-bold px-2 py-0.5 rounded ${val > 100 ? 'bg-yellow-500/20 text-yellow-400' : val < 100 ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>{pos} {val}%</span>;
                              })}
                          </div>
                          {onCooldown && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-lg"><span className="text-red-400 font-bold text-lg">{cdSec}s</span></div>}
                      </button>
                  );
              })}
          </div>
      </div>
    </div>
  );
};
