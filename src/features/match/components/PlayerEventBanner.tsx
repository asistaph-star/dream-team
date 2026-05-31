import React from 'react';

interface BannerData {
  label: string;
  count: string;
  bg: string;
  border: string;
  glow: string;
  textColor: string;
  countColor: string;
  silhouetteImg: string;
  silhouetteFilter: string;
  topLine?: string;
}

interface PlayerEventBannerProps {
  showFtPopup: boolean;
  ftOutcome?: 'make' | 'miss';
  justScored: boolean;
  lastPointsScored?: number;
  eventText: string;
  justMissed: boolean;
  lastEventIndicator: { playerId: string; type: string; targetId?: string } | null;
  playerId: string;
}

function computeBannerData(props: PlayerEventBannerProps): BannerData | null {
  const { showFtPopup, ftOutcome, justScored, lastPointsScored, eventText, justMissed, lastEventIndicator, playerId } = props;

  if (showFtPopup) {
    if (ftOutcome === 'make') {
      return {
        label: 'FT MADE',
        count: '+1',
        // Premium Emerald Green gradient
        bg: 'linear-gradient(95deg, rgba(16,185,129,0.95) 0%, rgba(52,211,153,0.95) 50%, rgba(110,231,183,0.95) 100%)',
        border: 'rgba(110,231,183,0.9)',
        glow: 'rgba(16,185,129,0.8)',
        textColor: '#ffffff',
        countColor: '#d1fae5',
        silhouetteImg: '/silhouette_shoot.png',
        silhouetteFilter: 'none',
      };
    } else {
      return {
        label: 'FT MISS',
        count: '—',
        // Dark Gray stone style for misses
        bg: 'linear-gradient(95deg, rgba(28,25,23,0.95) 0%, rgba(68,64,60,0.95) 60%, rgba(87,83,78,0.95) 100%)',
        border: 'rgba(239,68,68,0.5)',
        glow: 'rgba(239,68,68,0.45)',
        textColor: '#fca5a5',
        countColor: '#ef4444',
        silhouetteImg: '/silhouette_shoot.png',
        silhouetteFilter: 'grayscale(1) brightness(0.55) sepia(1) hue-rotate(-45deg) saturate(3)', // neon red silhouette
        topLine: '#ef4444',
      };
    }
  } else if (justScored) {
    const is3 = lastPointsScored === 3;
    const evText = eventText.toLowerCase();
    let label = 'PTS';
    let count = '+2';

    if (evText.includes('dunk')) {
      label = 'PTS';
      count = '+2';
    } else if (is3 || evText.includes('three') || evText.includes('deep') || evText.includes('downtown')) {
      label = 'PTS';
      count = '+3';
    } else {
      label = 'PTS';
      count = '+2';
    }

    return {
      label,
      count,
      // Scoring is unified Orange theme (Fiery Gold/Orange gradient)
      bg: 'linear-gradient(95deg, rgba(234,88,12,0.95) 0%, rgba(249,115,22,0.95) 50%, rgba(251,146,60,0.95) 100%)',
      border: 'rgba(251,146,60,0.9)',
      glow: 'rgba(249,115,22,0.8)',
      textColor: '#ffffff',
      countColor: '#ffedd5',
      silhouetteImg: evText.includes('dunk') ? '/silhouette_dunk.png' : '/silhouette_shoot.png',
      silhouetteFilter: 'none',
    };
  } else if (justMissed) {
    return {
      label: 'MISS',
      count: '',
      // Gray/Red theme consistent with Turnovers and Fouls
      bg: 'linear-gradient(95deg, rgba(28,25,23,0.95) 0%, rgba(68,64,60,0.95) 60%, rgba(87,83,78,0.95) 100%)',
      border: 'rgba(239,68,68,0.5)',
      glow: 'rgba(239,68,68,0.45)',
      textColor: '#fca5a5',
      countColor: '#ef4444',
      silhouetteImg: '/silhouette_shoot.png',
      silhouetteFilter: 'grayscale(1) brightness(0.55) sepia(1) hue-rotate(-45deg) saturate(3)', // Neon red jump shot
      topLine: '#ef4444',
    };
  } else if (lastEventIndicator?.playerId === playerId) {
    const ev = lastEventIndicator!;
    switch (ev.type) {
      case 'AST':
        return {
          label: 'ASSIST', count: '+1',
          bg: 'linear-gradient(95deg, rgba(30,58,138,0.95) 0%, rgba(29,78,216,0.95) 50%, rgba(59,130,246,0.95) 100%)',
          border: 'rgba(147,197,253,0.8)', glow: 'rgba(59,130,246,0.7)',
          textColor: '#ffffff', countColor: '#dbeafe',
          silhouetteImg: '/silhouette_pass.png', silhouetteFilter: 'none',
        };
      case 'STL':
        return {
          label: 'STEAL', count: '+1',
          bg: 'linear-gradient(95deg, rgba(30,58,138,0.95) 0%, rgba(29,78,216,0.95) 50%, rgba(59,130,246,0.95) 100%)',
          border: 'rgba(147,197,253,0.8)', glow: 'rgba(59,130,246,0.7)',
          textColor: '#ffffff', countColor: '#dbeafe',
          silhouetteImg: '/silhouette_steal.png', silhouetteFilter: 'none',
        };
      case 'REB':
      case 'OREB':
        return {
          label: 'REBOUND', count: '+1',
          bg: 'linear-gradient(95deg, rgba(30,58,138,0.95) 0%, rgba(29,78,216,0.95) 50%, rgba(59,130,246,0.95) 100%)',
          border: 'rgba(147,197,253,0.8)', glow: 'rgba(59,130,246,0.7)',
          textColor: '#ffffff', countColor: '#dbeafe',
          silhouetteImg: '/silhouette_rebound.png', silhouetteFilter: 'none',
        };
      case 'BLK':
        return {
          label: 'BLOCK', count: '+1',
          bg: 'linear-gradient(95deg, rgba(30,58,138,0.95) 0%, rgba(29,78,216,0.95) 50%, rgba(59,130,246,0.95) 100%)',
          border: 'rgba(147,197,253,0.8)', glow: 'rgba(59,130,246,0.7)',
          textColor: '#ffffff', countColor: '#dbeafe',
          silhouetteImg: '/silhouette_block.png', silhouetteFilter: 'none',
        };
      case 'TOV':
        return {
          label: 'TURNOVER', count: '',
          bg: 'linear-gradient(95deg, rgba(28,25,23,0.95) 0%, rgba(68,64,60,0.95) 60%, rgba(87,83,78,0.95) 100%)',
          border: 'rgba(239,68,68,0.5)', glow: 'rgba(239,68,68,0.45)',
          textColor: '#fca5a5', countColor: '#ef4444',
          silhouetteImg: '/silhouette_steal.png',
          silhouetteFilter: 'grayscale(1) brightness(0.55) sepia(1) hue-rotate(-45deg) saturate(3)',
          topLine: '#ef4444',
        };
      case 'FOL':
        return {
          label: 'FOUL', count: '',
          bg: 'linear-gradient(95deg, rgba(28,25,23,0.95) 0%, rgba(68,64,60,0.95) 60%, rgba(87,83,78,0.95) 100%)',
          border: 'rgba(239,68,68,0.5)', glow: 'rgba(239,68,68,0.45)',
          textColor: '#fca5a5', countColor: '#ef4444',
          silhouetteImg: '/silhouette_steal.png',
          silhouetteFilter: 'grayscale(1) brightness(0.55) sepia(1) hue-rotate(-45deg) saturate(3)',
          topLine: '#ef4444',
        };
      default:
        return null;
    }
  }

  return null;
}

export const PlayerEventBanner: React.FC<PlayerEventBannerProps> = (props) => {
  const bannerData = computeBannerData(props);
  if (!bannerData) return null;

  return (
    <div
      className="absolute -top-[54px] left-0 w-full z-40 pointer-events-none select-none flex items-center justify-center"
      style={{
        animation: `${props.showFtPopup ? 'banner-pop 0.55s' : 'banner-pop 1.5s'} cubic-bezier(0.25, 1, 0.5, 1) forwards`,
        height: '38px',
      }}
    >
      {/* Centering wrapper */}
      <div style={{ position: 'relative', width: '84px', height: '22px' }}>
        {/* Slanted Glassmorphic Container (Perfect Centering, 0% checkerboard) */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '84px',
          height: '22px',
          borderRadius: '2px',
          background: bannerData.bg,
          border: `1px solid ${bannerData.border}`,
          boxShadow: `0 0 15px ${bannerData.glow}, 0 4px 10px rgba(0,0,0,0.75)`,
          transform: 'skewX(-15deg)', // Elegant slant
          overflow: 'visible',
        }}>
          {/* Neon Top Line accent for turnovers/fouls */}
          {bannerData.topLine && (
            <div style={{
              position: 'absolute', top: -1, left: -1, right: -1, height: '2px',
              background: bannerData.topLine,
              boxShadow: `0 0 6px ${bannerData.topLine}`,
            }} />
          )}

          {/* Diagonal White Glare overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 60%)',
          }} />

          {/* Text overlaid inside slanted panel (un-skewed back to be straight) */}
          <div style={{
            transform: 'skewX(15deg)', // Un-skew the text content
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px', // Standard space between stat name and count
            paddingLeft: '10px', // Small offset to balance the silhouette overlap on the left
            paddingRight: '2px',
            width: '100%',
            height: '100%',
          }}>
            <span style={{
              color: bannerData.textColor,
              fontSize: '9px',
              fontWeight: 950,
              letterSpacing: '1px',
              textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 4px rgba(0,0,0,0.5)',
            }}>
              {bannerData.label}
            </span>
            {bannerData.count && (
              <span style={{
                color: bannerData.countColor,
                fontSize: '10px',
                fontWeight: 950,
                textShadow: `0 0 8px ${bannerData.countColor}, 0 1px 3px rgba(0,0,0,0.9)`,
              }}>
                {bannerData.count}
              </span>
            )}
          </div>
        </div>

        {/* Glowing Event-Specific Silhouette overlapping on the left (Un-skewed & connected perfectly!) */}
        <div style={{
          position: 'absolute',
          left: '-18px', // Anchored perfectly overlapping on the left of the container
          bottom: '-8px',
          width: '38px',
          height: '38px',
          zIndex: 10,
          filter: `drop-shadow(0 1px 2.5px rgba(0,0,0,0.85)) drop-shadow(0 0 3px ${bannerData.glow})`,
        }}>
          {/* Circular Neon Radial Aura backing */}
          <div style={{
            position: 'absolute',
            inset: '-6px',
            background: `radial-gradient(circle, ${bannerData.glow} 0%, transparent 75%)`,
            opacity: 0.22,
            zIndex: -1,
          }} />

          {/* Render the premium AI silhouette image */}
          <img
            src={bannerData.silhouetteImg}
            alt="silhouette"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: bannerData.silhouetteFilter,
            }}
          />
        </div>
      </div>
    </div>
  );
};
