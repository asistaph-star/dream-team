import React from 'react';

interface ActiveShotMeter {
  playerId: string;
  isSuccess: boolean;
  isAiTeam: boolean;
}

interface ShotMeterProps {
  activeShotMeter: ActiveShotMeter | null | undefined;
  shotMeterProgress: number;
  shotMeterStatus: 'idle' | 'filling' | 'holding' | 'release' | 'done';
  shotMeterFeedback: string;
}

export const ShotMeter: React.FC<ShotMeterProps> = ({
  activeShotMeter,
  shotMeterProgress,
  shotMeterStatus,
  shotMeterFeedback,
}) => {
  if (!activeShotMeter) return null;

  return (
    <>
      <div className="absolute -right-14 top-1/2 -translate-y-1/2 w-16 h-28 z-[150] pointer-events-none select-none flex items-center justify-center">
        <svg width="60" height="100" viewBox="0 0 60 100" className="overflow-visible">
          <defs>
            <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 1. Track BG */}
          <path
            d="M 10,90 A 45,45 0 0,0 10,10"
            fill="none"
            stroke="rgba(15, 23, 42, 0.75)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* 2. Target Green Zone */}
          <path
            d="M 10,90 A 45,45 0 0,0 10,10"
            fill="none"
            stroke="#10b981"
            strokeWidth="8"
            strokeDasharray="141.37"
            strokeDashoffset={141.37 * (1 - 0.94)}
            style={{ filter: 'url(#glow-green)', opacity: 0.9 }}
          />

          {/* 3. Progress Filling */}
          <path
            d="M 10,90 A 45,45 0 0,0 10,10"
            fill="none"
            stroke={
              shotMeterStatus === 'release'
                ? (activeShotMeter.isSuccess ? '#10b981' : '#ef4444')
                : '#facc15'
            }
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="141.37"
            strokeDashoffset={141.37 * (1 - Math.min(100, shotMeterProgress) / 100)}
            style={{
              filter: shotMeterStatus === 'release' 
                ? (activeShotMeter.isSuccess ? 'url(#glow-green)' : 'url(#glow-red)')
                : 'none'
            }}
          />

          {/* 4. Target Marker */}
          <line
            x1="45" y1="20" x2="55" y2="20"
            stroke="white"
            strokeWidth="2.5"
          />
        </svg>
        
        <div 
          className="absolute text-[8px] font-black tracking-tighter px-1 rounded-sm shadow-md"
          style={{
            bottom: `${Math.min(100, shotMeterProgress) * 0.8}%`,
            left: '25px',
            background: shotMeterStatus === 'release'
              ? (activeShotMeter.isSuccess ? '#10b981' : '#ef4444')
              : '#facc15',
            color: 'black',
            transition: 'all 0.05s ease-out',
            transform: 'scale(1.1)',
          }}
        >
          {Math.round(shotMeterProgress)}%
        </div>
      </div>

      {/* ═══ NBA 2K-STYLE "GREEN RELEASE" / MISS TEXT TIMING FEEDBACK SPARK SPLASH OVERLAY ═══ */}
      {shotMeterStatus === 'release' && (
        <div className="absolute inset-0 z-[200] pointer-events-none select-none flex flex-col items-center justify-center">
          {activeShotMeter.isSuccess ? (
            <>
              <div className="absolute inset-[-40px] opacity-40 animate-ping rounded-full blur-xl" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.7) 0%, transparent 70%)' }} />
              
              <div className="absolute inset-[-20px] overflow-visible">
                {[0, 1, 2, 3, 4, 5, 6, 7].map(i => {
                  const angle = (i * 360) / 8;
                  const delay = i * 0.05;
                  return (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-emerald-400"
                      style={{
                        top: '50%',
                        left: '50%',
                        boxShadow: '0 0 10px #10b981, 0 0 20px #34d399',
                        transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-40px)`,
                        animation: `particle-blow 0.8s ease-out ${delay}s forwards`,
                        opacity: 0,
                        // Custom rotation variable for particle-blow keyframes
                        ['--rot' as any]: `${angle}deg`
                      }}
                    />
                  );
                })}
              </div>

              <div 
                className="absolute -top-16 bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-500 text-white font-sans font-black text-[10px] px-2.5 py-1 rounded shadow-[0_0_20px_rgba(16,185,129,0.8)] border border-emerald-300 uppercase tracking-widest whitespace-nowrap"
                style={{
                  transform: 'skewX(-12deg) scale(1.15)',
                  animation: 'splash-bounce 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 8px rgba(16,185,129,0.6)',
                }}
              >
                🟢 GREEN RELEASE 🟢
              </div>
            </>
          ) : (
            <>
              <div 
                className="absolute -top-12 bg-gradient-to-r from-orange-600 to-red-600 text-white font-sans font-black text-[8px] px-2 py-0.5 rounded shadow-[0_0_12px_rgba(239,68,68,0.6)] border border-orange-400 uppercase tracking-wider whitespace-nowrap"
                style={{
                  transform: 'skewX(-10deg)',
                  animation: 'splash-bounce 0.5s ease-out forwards',
                  textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                }}
              >
                {shotMeterFeedback}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};
