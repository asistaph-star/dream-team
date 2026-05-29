"use client";

import React, { useState, useEffect } from "react";
import { useGameState } from "@/lib/context/GameStateContext";
import { 
  Building, 
  HeartPulse, 
  Store, 
  ArrowUpCircle, 
  Coins, 
  Trophy, 
  ChevronRight, 
  Sparkles, 
  Flame 
} from "lucide-react";

export default function StadiumFacilities() {
  const { 
    cash, 
    tk,
    stadiumLevels, 
    passiveStoreCash, 
    upgradeFacility, 
    claimStoreRevenue 
  } = useGameState();

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [floatingParticles, setFloatingParticles] = useState<Array<{ id: number, text: string, x: number, y: number }>>([]);
  const [particleId, setParticleId] = useState(0);

  // Trigger floating notifications
  const triggerToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpgrade = (facility: 'arena' | 'gym' | 'lab' | 'store', name: string) => {
    const currentLvl = stadiumLevels[facility];
    const cost = currentLvl * 50000;
    
    const result = upgradeFacility(facility);
    if (result.success) {
      triggerToast(`Successfully upgraded ${name} to Level ${currentLvl + 1}!`, 'success');
      
      // Add a visual flash particle next to upgrade click
      const newId = particleId + 1;
      setParticleId(newId);
      setFloatingParticles(prev => [...prev, {
        id: newId,
        text: "✨ UPGRADED",
        x: Math.floor(Math.random() * 60) + 20,
        y: Math.floor(Math.random() * 60) + 20
      }]);
      setTimeout(() => {
        setFloatingParticles(prev => prev.filter(p => p.id !== newId));
      }, 1500);

    } else {
      triggerToast(result.error || "Upgrade failed", 'error');
    }
  };

  const handleClaimRevenue = (e: React.MouseEvent) => {
    if (passiveStoreCash === 0) {
      triggerToast("No passive revenue accumulated yet. Wait for sales!", 'error');
      return;
    }

    const claimed = claimStoreRevenue();
    triggerToast(`Claimed $${claimed.toLocaleString()} Cash from Franchise Store!`, 'success');

    // Spawn a glowing floating cash number particle exactly where clicked
    const rect = e.currentTarget.getBoundingClientRect();
    const newId = particleId + 1;
    setParticleId(newId);
    setFloatingParticles(prev => [...prev, {
      id: newId,
      text: `+$${claimed.toLocaleString()} Cash! 💵`,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }]);

    setTimeout(() => {
      setFloatingParticles(prev => prev.filter(p => p.id !== newId));
    }, 2000);
  };

  // Cost calculation helper
  const getUpgradeCost = (lvl: number) => lvl * 50000;

  return (
    <div className="flex flex-col h-full w-full p-4 overflow-y-auto max-w-5xl mx-auto font-sans relative no-scrollbar">
      
      {/* 1. FLOATING TOAST FEEDBACK NOTIFICATION */}
      {toast && (
        <div className={`fixed top-[110px] right-6 z-50 px-4 py-2.5 rounded-lg border shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-5 duration-300 ${
          toast.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]' 
            : 'bg-red-950/90 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.25)]'
        }`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span className="text-xs font-bold font-mono tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* 2. SUB-HEADER UPGRADES & PASSIVE BALANCE DOCK */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white leading-tight uppercase tracking-tight">
            Stadium Facilities
          </h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5 uppercase tracking-widest text-dt-cyan">
            Corporate Tycoon Operations Center
          </p>
        </div>

        {/* Local Wallet Balances */}
        <div className="flex items-center gap-3 bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl self-start">
          <div className="flex flex-col font-mono">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">CASH OPERATIONS</span>
            <span className="text-sm font-bold text-white font-mono flex items-center gap-1">
              💵 {cash.toLocaleString()}
            </span>
          </div>
          <div className="w-[1px] h-6 bg-slate-800" />
          <div className="flex flex-col font-mono pr-2">
            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">TK TOKEN BALANCE</span>
            <span className="text-sm font-bold text-amber-500 font-mono flex items-center gap-1">
              🪙 {tk.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 3. CORE TYCOON PASSIVE REVENUE SHOP BILLBOARD */}
      <div className="w-full bg-gradient-to-r from-slate-950 via-[#0d141e] to-slate-950 border border-dt-cyan/30 rounded-xl p-5 mb-8 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        
        {/* Hologram backing lines */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, #00c3ff, #00c3ff 2px, transparent 2px, transparent 8px)' }} />

        {/* Banner Details */}
        <div className="z-10 relative">
          <div className="flex items-center gap-2 mb-1.5">
            <Store className="text-dt-cyan w-5 h-5" />
            <span className="text-[10px] font-black tracking-widest text-dt-cyan font-mono uppercase">
              Passive Souvenir & Ticket Shop
            </span>
          </div>
          <h2 className="text-lg font-black text-white leading-tight uppercase">
            Franchise Megastore Revenue
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-md font-sans">
            Your Megastore accumulates passive sales revenue in real-time, even while you are offline. Upgrading it increases the passive income generation speed.
          </p>
        </div>

        {/* Real-time Ticking Counter & Claim Trigger */}
        <div 
          onClick={handleClaimRevenue}
          className="z-10 relative bg-[#070b10] border border-slate-800 hover:border-dt-cyan rounded-xl p-4 w-full md:w-[260px] text-center shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group"
        >
          {/* Floating numeric particles will render in this absolute portal wrapper */}
          {floatingParticles.map(p => (
            <div 
              key={p.id} 
              className="absolute text-xs font-black font-mono text-emerald-400 pointer-events-none animate-float-fade"
              style={{ left: `${p.x}px`, top: `${p.y}px` }}
            >
              {p.text}
            </div>
          ))}

          <span className="text-[8px] font-bold text-gray-500 font-mono tracking-widest block mb-1">
            ACCUMULATED SALES REVENUE
          </span>
          
          <div className="text-2xl font-black font-mono text-emerald-400 leading-none py-1.5 flex items-center justify-center gap-1.5">
            💵 ${passiveStoreCash.toLocaleString()}
          </div>

          <div className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 px-4 rounded-lg text-[10px] tracking-widest uppercase transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-2 font-mono group-hover:scale-102">
            Claim Revenue
          </div>
        </div>

      </div>

      {/* 4. ISOMETRIC COMPLEXES / SVG BLUEPRINT CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
        
        {/* CARD 1: MAIN ARENA */}
        {renderFacilityCard(
          'arena', 
          'Dream Team Arena', 
          'Increases standard and VIP ticket sales capacity, boosting match Cash rewards dynamically.',
          `Match Cash rewards scaled by +${stadiumLevels.arena * 10}%`,
          `Next: +${(stadiumLevels.arena + 1) * 10}%`,
          <Building className="text-dt-cyan w-9 h-9" />
        )}

        {/* CARD 2: TRAINING GYM */}
        {renderFacilityCard(
          'gym', 
          'Training Gym Complex', 
          'Enhances player court practice drills and clocks, multiplier scaling in-match OVR player EXP rewards.',
          `Match Player EXP scaled by +${stadiumLevels.gym * 15}%`,
          `Next: +${(stadiumLevels.gym + 1) * 15}%`,
          <span className="text-3xl text-[#e67e22] animate-pulse">🏀</span>
        )}

        {/* CARD 3: BIO-RECOVERY LAB */}
        {renderFacilityCard(
          'lab', 
          'Bio-Recovery Clinic', 
          'Reduces match stamina drain, boosting roster energy restoration efficiency.',
          `Stamina restore rate boosted by +${stadiumLevels.lab * 5}%`,
          `Next: +${(stadiumLevels.lab + 1) * 5}%`,
          <HeartPulse className="text-red-500 w-9 h-9" />
        )}

        {/* CARD 4: FRANCHISE MEGASTORE */}
        {renderFacilityCard(
          'store', 
          'Franchise Megastore', 
          'Boosts passive snack & merchandise sales revenue accumulated every second.',
          `Offline passive ticking sales rate: $${stadiumLevels.store * 5}/sec`,
          `Next: $${(stadiumLevels.store + 1) * 5}/sec`,
          <Store className="text-amber-500 w-9 h-9" />
        )}

      </div>

    </div>
  );

  // Sub-renderer for upgrade blueprint complex cards
  function renderFacilityCard(
    facility: 'arena' | 'gym' | 'lab' | 'store', 
    name: string, 
    desc: string,
    statCurrent: string,
    statNext: string,
    icon: React.ReactNode
  ) {
    const lvl = stadiumLevels[facility];
    const cost = getUpgradeCost(lvl);
    const hasEnough = cash >= cost;

    return (
      <div className="bg-[#0b121e]/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xl relative group overflow-hidden">
        
        {/* Blueprint background grid lines overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />

        <div className="z-10 relative">
          
          {/* Header Row */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-md">
                {icon}
              </div>
              <div>
                <h3 className="font-black text-slate-100 text-sm leading-tight uppercase">
                  {name}
                </h3>
                <span className="text-[9px] bg-dt-cyan/10 border border-dt-cyan/30 text-dt-cyan font-bold font-mono px-2 py-0.2 rounded-full uppercase mt-1 inline-block">
                  Level {lvl} Operations
                </span>
              </div>
            </div>

            {/* Circular SVG blueprint progression ring */}
            <div className="relative w-12 h-12 flex items-center justify-center bg-slate-950 rounded-full border border-slate-850">
              <svg className="w-full h-full transform -rotate-90">
                <circle 
                  cx="24" cy="24" r="18" 
                  fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" 
                />
                <circle 
                  cx="24" cy="24" r="18" 
                  fill="none" stroke="#00c3ff" strokeWidth="3" 
                  strokeDasharray={`${2 * Math.PI * 18}`}
                  strokeDashoffset={`${2 * Math.PI * 18 * (1 - (lvl % 10) / 10)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute text-[10px] font-black font-mono text-slate-200">
                {lvl * 10}%
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-400 font-sans mb-4 leading-relaxed">
            {desc}
          </p>

          {/* Statistics Comparison Meters */}
          <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-3 flex flex-col gap-1.5 font-mono mb-4">
            <div className="flex justify-between text-[10px] text-slate-300">
              <span>CURRENT STATUS:</span>
              <span className="text-dt-cyan font-bold">{statCurrent}</span>
            </div>
            <div className="w-full h-[1px] bg-slate-850" />
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>UPGRADE BONUS:</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                {statNext} <ArrowUpCircle size={10} className="text-emerald-400" />
              </span>
            </div>
          </div>

        </div>

        {/* Upgrade Transaction Controls */}
        <div className="z-10 relative flex items-center justify-between gap-4 border-t border-slate-850 pt-3 mt-2">
          
          {/* Cost details */}
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-gray-500 tracking-wider uppercase font-mono">UPGRADE COST</span>
            <span className={`text-xs font-mono font-bold flex items-center gap-1 ${hasEnough ? 'text-white' : 'text-red-400 font-semibold animate-pulse'}`}>
              💵 {cost.toLocaleString()}
            </span>
          </div>

          {/* Action button */}
          <button 
            onClick={() => handleUpgrade(facility, name)}
            className={`font-black py-2 px-5 rounded-lg text-[10px] tracking-widest uppercase transition-all duration-300 flex items-center gap-1.5 ${
              hasEnough 
                ? 'bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 border border-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-102 active:scale-95' 
                : 'bg-slate-900 border border-slate-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            UPGRADE FACILITY <ChevronRight size={12} />
          </button>

        </div>

      </div>
    );
  }
}
