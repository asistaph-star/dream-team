import React from "react";
import { EquipmentSlot } from "@/lib/types/item";
import { craftingRecipes } from "@/lib/data/mockItems";
import { ItemGlyph } from "@/components/items/ItemGlyph";

interface CraftDetailPanelProps {
  slot: EquipmentSlot;
  ownedThread: number;
  onCraft: () => void;
  onGetMaterials: () => void;
  craftResult: { success: boolean; msg?: string } | null;
  renderIcon: (slot: EquipmentSlot) => React.ReactNode;
}

const slotLabels: Record<EquipmentSlot, string> = {
  Shoes: "Footwear",
  Tshirt: "Compression Top",
  Jersey: "Game Jersey",
  Headband: "Headband",
  KneePads: "Knee Pads",
};

export function CraftDetailPanel({
  slot,
  ownedThread,
  onCraft,
  onGetMaterials,
  craftResult,
  renderIcon,
}: CraftDetailPanelProps) {
  const recipe = craftingRecipes[slot];
  const canCraft = ownedThread >= recipe.cost;
  const missing = Math.max(0, recipe.cost - ownedThread);
  const fillPercent = Math.min(100, (ownedThread / recipe.cost) * 100);
  const glowColor = canCraft ? "#10b981" : "#ef4444";

  return (
    <div className="flex-1 flex flex-col h-full bg-[#35383d]">
      <div
        className="px-4 py-2.5 bg-[#4b555d] relative z-10 flex items-center gap-2"
        style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)" }}
      >
        <div className="w-1 h-4 bg-[#d61e38] skew-x-[-15deg] shadow-[0_0_8px_rgba(214,30,56,0.6)]" />
        <h2 className="text-[13px] font-black text-gray-100 uppercase tracking-widest italic">{slotLabels[slot]}</h2>
      </div>

      <div className="relative h-52 overflow-hidden flex flex-col items-center justify-center border-b border-white/5">
        <div
          className="absolute inset-0 pointer-events-none opacity-80"
          style={{ background: `radial-gradient(circle at center, ${glowColor}55 0%, ${glowColor}10 45%, transparent 70%)` }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.12]"
          style={{
            backgroundImage: "repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 6px)",
          }}
        />
        <div className="relative z-10 w-24 h-24 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
          {renderIcon(slot)}
        </div>
        <div className="absolute bottom-3 left-0 right-0 text-center z-10">
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400/80">Blueprint · Permanent</span>
        </div>
      </div>

      <div
        className="px-4 py-2 bg-[#4b555d] relative z-10"
        style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)" }}
      >
        <h3 className="text-[12px] font-bold text-gray-300 tracking-wide uppercase">Craft Preview</h3>
      </div>

      <div
        className="flex-1 flex flex-col bg-[#313338] overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 2px, transparent 2px, transparent 6px)",
        }}
      >
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <p className="text-[12px] text-gray-300 leading-relaxed">
            Forge a random <span className="text-white font-bold">{slot}</span> piece. Stats roll within the range below when you craft.
          </p>

          <div className="bg-black/35 border border-white/5 rounded-sm p-3">
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Potential Effect</div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-emerald-400 font-black">
                +{recipe.minBonus}–{recipe.maxBonus}
                {recipe.isPercentage ? "%" : ""} {recipe.statName}
              </span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Random roll</span>
            </div>
          </div>

          <div className="bg-black/35 border border-white/5 rounded-sm p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Requirements</div>
              {canCraft ? (
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Ready</span>
              ) : (
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                  Need {missing} more
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 shrink-0">
                <ItemGlyph label="THR" sublabel="CRAFT" glowColor="#10b981" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[11px] font-bold text-gray-300">Crafting Thread</span>
                  <span className={`text-[11px] font-mono font-black ${canCraft ? "text-emerald-400" : "text-red-400"}`}>
                    {ownedThread.toLocaleString()} / {recipe.cost}
                  </span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-500 ${canCraft ? "bg-emerald-500" : "bg-red-500"}`}
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {craftResult && (
            <div
              className={`p-3 text-xs text-center border font-semibold rounded-sm ${
                craftResult.success
                  ? "bg-green-500/15 text-green-400 border-green-500/40"
                  : "bg-red-500/15 text-red-400 border-red-500/40"
              }`}
            >
              {craftResult.msg}
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-3 border-t border-white/5 bg-black/20">
          <button
            type="button"
            onClick={onGetMaterials}
            className="w-full bg-gradient-to-br from-[#1a8ff5] to-[#1671d4] hover:brightness-110 text-white py-2.5 font-bold text-[13px] shadow-sm relative"
            style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 12px 100%, 0 calc(100% - 12px))" }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-8 bg-white/10 pointer-events-none"
              style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}
            />
            <span className="relative z-10">View Mats</span>
          </button>
          <button
            type="button"
            onClick={onCraft}
            disabled={!canCraft}
            className={`w-full py-2.5 font-black text-[13px] shadow-sm relative uppercase tracking-wider ${
              canCraft
                ? "bg-[#d61e38] hover:bg-[#eb233f] text-white cursor-pointer active:scale-[0.98]"
                : "bg-[#444] text-gray-500 cursor-not-allowed"
            }`}
            style={{ clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)" }}
          >
            {canCraft && (
              <div
                className="absolute left-0 top-0 bottom-0 w-1/2 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(white 1px, transparent 1px)",
                  backgroundSize: "5px 5px",
                }}
              />
            )}
            <span className="relative z-10">Craft</span>
          </button>
        </div>
      </div>
    </div>
  );
}
