import React from "react";
import { Equipment } from "@/lib/types/item";
import { lowPolyBg } from "@/lib/constants/visuals";

interface CraftRevealModalProps {
  equipment: Equipment;
  renderIcon: (slot: string) => React.ReactNode;
  onClose: () => void;
  onViewEquipment: () => void;
}

export function CraftRevealModal({ equipment, renderIcon, onClose, onViewEquipment }: CraftRevealModalProps) {
  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-[420px] bg-[#2a2b2f] border border-white/10 rounded-sm overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] relative"
        style={{ backgroundImage: `url('${lowPolyBg}')`, backgroundSize: "cover" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-12 bg-[#4b555d] flex items-center justify-between px-4"
          style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-emerald-400 skew-x-[-15deg]" />
            <span className="text-white font-black uppercase tracking-widest text-sm italic">Craft Success</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors font-black text-sm"
            aria-label="Close"
          >
            X
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center">
          <div className="relative mb-4 w-24 h-24">
            <div className="absolute inset-0 blur-2xl bg-emerald-500/30 rounded-full scale-150" />
            <div className="relative w-full h-full">{renderIcon(equipment.slot)}</div>
          </div>

          <h2 className="text-xl font-black text-white uppercase tracking-wide italic mt-6">{equipment.name}</h2>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest mt-1">{equipment.slot} · Lv.0</p>

          <div className="mt-5 w-full bg-black/40 border border-emerald-500/30 rounded-sm px-4 py-3">
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Rolled Bonus</div>
            <div className="text-2xl font-black text-emerald-400">
              +{equipment.bonus.value}
              {equipment.bonus.isPercentage ? "%" : ""}{" "}
              <span className="text-base text-white">{equipment.bonus.statName}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full mt-6">
            <button
              onClick={onClose}
              className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-black text-[11px] uppercase tracking-widest rounded-sm"
            >
              Keep Crafting
            </button>
            <button
              onClick={() => {
                onViewEquipment();
                onClose();
              }}
              className="py-2.5 bg-[#d61e38] hover:bg-[#eb233f] text-white font-black text-[11px] uppercase tracking-widest rounded-sm shadow-[0_0_15px_rgba(214,30,56,0.35)]"
            >
              View Gear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
