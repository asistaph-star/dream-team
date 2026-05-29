"use client";

export default function ArticlePage() {
  return (
    <div className="flex flex-col h-full w-full p-4 overflow-y-auto max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-dt-cyan mb-2">League Newsletter & Articles</h1>
      <p className="text-gray-400 text-sm mb-6">Stay up to date with the latest matches, player rankings, and league stats.</p>

      <div className="flex flex-col gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl shadow-lg">
          <div className="text-[10px] text-dt-cyan font-bold tracking-wider uppercase mb-1">League Headline</div>
          <h2 className="text-lg font-bold text-white mb-2">BaseKings Continues Level Up Surge</h2>
          <p className="text-xs text-gray-400 mb-3">After upgrading their starting lineup and drafting elite legends, BaseKings has officially reached level 4 management, climbing the local ranks.</p>
          <div className="text-[10px] text-gray-500 font-mono">Date: Today • Reads: 14,800</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl shadow-lg opacity-70">
          <div className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mb-1">Trading Bulletin</div>
          <h2 className="text-base font-bold text-gray-300 mb-2">Market Watch: Mythic Cards Stable</h2>
          <p className="text-xs text-gray-400 mb-2">The secondary market sees high demands for SSS cards. Overall OVR continues to rise across active alliances.</p>
          <div className="text-[10px] text-gray-500 font-mono">Date: Yesterday • Reads: 9,200</div>
        </div>
      </div>
    </div>
  );
}
