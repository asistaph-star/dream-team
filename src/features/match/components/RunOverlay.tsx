import React from 'react';

interface RunOverlayProps {
  activeRunOverlay: { team: 'user' | 'ai'; count: number } | null;
  aiTeamName: string;
}

export const RunOverlay: React.FC<RunOverlayProps> = ({ activeRunOverlay, aiTeamName }) => {
  if (!activeRunOverlay) return null;

  const activeRun = activeRunOverlay.count;
  const isUser = activeRunOverlay.team === 'user';
  const isHeavy = activeRun >= 10;
  const color = isUser ? '#06b6d4' : '#ef4444';
  const label = isUser ? 'MY TEAM' : aiTeamName.toUpperCase();
  const tier = activeRun >= 15 ? 'UNSTOPPABLE' : activeRun >= 10 ? 'DOMINATING' : 'ON A RUN';
  // SVG lightning bolt paths (real vector cracks, not emoji)
  const bolt1 = 'M 50 0 L 35 38 L 55 38 L 25 100 L 45 55 L 28 55 Z';
  const bolt2 = 'M 55 0 L 40 42 L 60 42 L 30 100 L 50 58 L 32 58 Z';

  return (
    <div key={`${activeRunOverlay.team}-${activeRunOverlay.count}`} className="absolute inset-0 z-[60] pointer-events-none flex items-center justify-center" style={{animation: isHeavy ? 'earthquake-heavy 0.15s infinite' : 'earthquake 0.2s infinite'}}>
      {/* Full-screen white lightning flash */}
      <div className="absolute inset-0" style={{background:'white', animation:'lightning-flash-bg 1.5s infinite'}} />
      {/* Colored ambient glow */}
      <div className="absolute inset-0" style={{background:`radial-gradient(ellipse at center, ${color}30 0%, transparent 65%)`, animation:'lightning-flash-bg 0.8s infinite 0.3s'}} />
      {/* SVG lightning bolts — left side */}
      {[80, 200, 350].map((top, i) => (
        <svg key={`l${i}`} className="absolute" style={{left: 30 + i*25, top, width:60, height:160, opacity:0, animation:`lightning-bolt 1.4s infinite ${i*0.3}s`}} viewBox="0 0 80 100">
          <path d={bolt1} fill={color} filter={`drop-shadow(0 0 18px ${color})`} />
        </svg>
      ))}
      {/* SVG lightning bolts — right side */}
      {[100, 250, 400].map((top, i) => (
        <svg key={`r${i}`} className="absolute" style={{right: 40 + i*20, top, width:60, height:160, opacity:0, animation:`lightning-bolt 1.4s infinite ${0.5 + i*0.25}s`}} viewBox="0 0 80 100">
          <path d={bolt2} fill={color} filter={`drop-shadow(0 0 18px ${color})`} />
        </svg>
      ))}
      {/* Center text — no box, just raw text with glow */}
      <div style={{textAlign:'center', position:'relative'}}>
        <div style={{fontSize:14, fontWeight:900, letterSpacing:'0.3em', color, textTransform:'uppercase', textShadow:`0 0 30px ${color}`, marginBottom:4}}>{label}</div>
        <div style={{fontSize: isHeavy ? 80 : 64, fontWeight:900, color:'white', lineHeight:1, letterSpacing:'-3px', textShadow:`0 0 40px ${color}, 0 0 80px ${color}, 0 2px 0 rgba(0,0,0,0.8)`, animation:'run-text-pop 0.4s ease-out'}}>{activeRun}-0</div>
        <div style={{fontSize: isHeavy ? 20 : 15, fontWeight:900, letterSpacing:'0.35em', color, textTransform:'uppercase', textShadow:`0 0 25px ${color}`, marginTop:6}}>{tier}</div>
      </div>
    </div>
  );
};
