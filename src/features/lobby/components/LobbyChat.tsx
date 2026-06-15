import React, { useEffect, useRef } from "react";
import { useGameViewportScale } from "@/components/layout/GameViewport";

export interface ChatMessage {
  channel: string;
  title: string;
  titleColor: string;
  user: string;
  text: string;
}

interface LobbyChatProps {
  messages: ChatMessage[];
  chatInput: string;
  setChatInput: (val: string) => void;
  onSendMessage: () => void;
}

export function LobbyChat({ messages, chatInput, setChatInput, onSendMessage }: LobbyChatProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { visibleRect, baseHeight } = useGameViewportScale();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div 
      className="absolute w-[350px] z-30 group p-3"
      style={{
        left: `${visibleRect.left + 24}px`,
        bottom: `${baseHeight - visibleRect.bottom + 100}px`
      }}
    >
      {/* Slanted Glassmorphic Backdrop Card (Skewed separately so scrollbars and text remain ultra-sharp and HD) */}
      <div className="absolute inset-0 bg-[#0c0d12]/95 backdrop-blur-[12px] border border-white/10 rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.8)] skew-x-[-4deg] group-hover:border-white/30 transition-all duration-300 z-0 pointer-events-none"></div>
      
      {/* Low Poly / Glass Facets Background Pattern (Skewed matching the card backdrop) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-60 skew-x-[-4deg] z-0 rounded-2xl">
        <div className="absolute inset-0 bg-white/[0.02]" style={{ clipPath: "polygon(0 0, 100% 0, 0 100%)" }}></div>
        <div className="absolute inset-0 bg-black/[0.4]" style={{ clipPath: "polygon(0 100%, 100% 0, 100% 100%)" }}></div>
        <div className="absolute inset-0 bg-white/[0.03]" style={{ clipPath: "polygon(50% 0, 100% 0, 100% 50%)" }}></div>
        <div className="absolute inset-0 bg-black/[0.3]" style={{ clipPath: "polygon(0 50%, 50% 100%, 0 100%)" }}></div>
        <div className="absolute inset-0 bg-white/[0.01]" style={{ clipPath: "polygon(20% 0, 80% 0, 50% 100%)" }}></div>
        <div className="absolute inset-0 bg-black/[0.2]" style={{ clipPath: "polygon(80% 0, 100% 50%, 50% 100%)" }}></div>
      </div>

      {/* Sharp, Unskewed Interior Content Wrapper */}
      <div className="relative z-10">
        
        {/* Header Tab */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex space-x-2">
            <div className="px-3 py-1 bg-zinc-800 border border-white/20 text-white font-[family-name:var(--font-outfit)] font-black tracking-wider uppercase text-[10px] rounded-md shadow-[0_0_8px_rgba(255,255,255,0.1)] skew-x-[-12deg] flex items-center gap-1.5">
              <span className="skew-x-[12deg] flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399] animate-pulse"></div>
                GLOBAL
              </span>
            </div>
          </div>
          <div className="text-[9px] text-zinc-400 font-[family-name:var(--font-outfit)] font-black tracking-widest uppercase italic mr-1">
            SERVERS: ONLINE
          </div>
        </div>

        {/* Chat Board Box */}
        <div className="h-[135px] overflow-y-auto bg-zinc-950/90 border border-white/5 rounded-xl p-2.5 relative scrollbox article-scroll scroll-smooth">
          <div className="flex flex-col gap-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="text-xs border-b border-white/[0.03] pb-1.5 last:border-0 last:pb-0 leading-relaxed break-words">
                <span className="inline-flex items-center gap-1.5 mr-1.5 align-middle select-none">
                  {/* [all] tag */}
                  <span className="bg-white/10 border border-white/20 text-white text-[8px] font-black tracking-wide uppercase px-1 rounded">
                    ALL
                  </span>
                  
                  {/* Title Badges */}
                  <span className={`text-[8px] font-black tracking-wide uppercase px-1.5 py-0.5 rounded skew-x-[-6deg] shadow-sm ${
                    msg.title === 'Champion' ? 'bg-white/15 border border-white/30 text-white drop-shadow-[0_0_2px_rgba(255,255,255,0.4)]' :
                    msg.title === 'DreamTeam' ? 'bg-white/10 border border-white/20 text-zinc-100' :
                    'bg-zinc-700/20 border border-zinc-600/30 text-zinc-300'
                  }`}>
                    <span className="skew-x-[6deg] inline-block">{msg.title}</span>
                  </span>
                  
                  {/* Username */}
                  <span className="font-[family-name:var(--font-outfit)] font-bold text-white text-[11px] tracking-wide">
                    {msg.user}:
                  </span>
                </span>
                
                {/* Message Body */}
                <span className="text-zinc-200 text-xs font-semibold tracking-wide font-sans mt-0.5 inline align-middle">
                  {msg.text}
                </span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Action Panel */}
        <div className="mt-2.5 flex space-x-2 items-center relative">
          {/* Emoji button */}
          <button className="w-9 h-9 bg-zinc-800/80 border border-white/10 hover:bg-zinc-700 hover:border-white/30 text-white rounded-lg flex items-center justify-center transition hover:scale-105 active:scale-95 shadow-md text-sm">
            😊
          </button>
          
          {/* Text input */}
          <input 
            type="text" 
            className="flex-1 h-9 bg-zinc-950/80 border border-white/10 rounded-lg px-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all font-sans font-semibold tracking-wide shadow-inner animate-none" 
            value={chatInput} 
            onChange={e => setChatInput(e.target.value)} 
            onKeyDown={e => { if (e.key === 'Enter') onSendMessage(); }}
            placeholder="Type a message..." 
          />
          
          {/* Send Button */}
          <button 
            onClick={onSendMessage}
            className="h-9 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-[family-name:var(--font-outfit)] font-black tracking-wider uppercase text-xs px-4 rounded-lg shadow-lg hover:shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all skew-x-[-12deg]"
          >
            <span className="skew-x-[12deg] flex items-center gap-1">SEND</span>
          </button>
        </div>

      </div>
    </div>
  );
}
