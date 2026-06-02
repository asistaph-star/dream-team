"use client";

import { ShoppingCart } from "lucide-react";

export default function ShopPage() {
  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Top Header */}
      <div className="p-4 bg-dt-navy-dark border-b border-dt-surface-border sticky top-0 z-10">
        <h1 className="text-xl font-bold text-dt-gold leading-tight drop-shadow-md">Draft & Shop</h1>
        <p className="text-xs text-gray-400 ">Recruit new talent for your Dream Team.</p>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col items-center justify-center space-y-6">
        <div className="relative glass-panel rounded-2xl p-10 overflow-hidden flex flex-col items-center max-w-md w-full border border-dt-gold/20 shadow-[0_0_30px_rgba(234,179,8,0.1)]">
          <div className="w-24 h-24 rounded-full bg-dt-navy-dark flex items-center justify-center mb-6 shadow-lg border border-dt-surface-border">
            <ShoppingCart className="text-gray-500 w-10 h-10" />
          </div>
          <h2 className="text-2xl font-black text-white italic tracking-widest uppercase mb-2">Coming Soon</h2>
          <p className="text-sm text-gray-400 text-center ">
            We are working on a new shop experience. Gacha mechanics have been completely removed!
          </p>
        </div>
      </div>
    </div>
  );
}
