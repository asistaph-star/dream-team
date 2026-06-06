import React from 'react';
import { Player } from '@/lib/types/player';
import { PlayerCard } from '@/components/player/PlayerCard';
import { PlayerStatusIcons } from './PlayerStatusIcons';
import { PlayerEventBanner } from './PlayerEventBanner';
import { BlockCourtAnimation } from './BlockCourtAnimation';
import { FreeThrowPopup } from './FreeThrowPopup';
import { ClutchFrame } from './ClutchFrame';
import { PlayerAvailabilityOverlay } from './PlayerAvailabilityOverlay';
import { FoulPips } from './FoulPips';
import { PlayerTooltip } from './PlayerTooltip';
import { ShotMeter } from './ShotMeter';

export interface MatchPlayerUnitProps {
  player: Player;
  dataSlotId?: string;
  className: string;
  style: React.CSSProperties;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;

  isHot: boolean;
  isCold: boolean;

  showFtPopup: boolean;
  ftOutcome?: 'make' | 'miss';
  justScored: boolean;
  lastPointsScored?: number;
  eventText: string;
  justMissed: boolean;
  lastEventIndicator: { playerId: string; type: string; targetId?: string } | null;

  showBlockAnimation: boolean;

  ftSequence?: any;
  activeFtIndex: number;
  activeFtStatus: 'idle' | 'aiming' | 'shooting' | 'resolved';

  showClutchFrame: boolean;

  bgImage: string;
  stam: number;
  isFouledOut: boolean;
  staminaMax: number;
  displayPos: string;
  isOutOfPosition: boolean;

  fouls: number;

  tier: string;
  tierColor: string;
  pStats: any;
  formRating?: number;

  activeShotMeter: any;
  shotMeterProgress: number;
  shotMeterStatus: 'idle' | 'filling' | 'holding' | 'release' | 'done';
  shotMeterFeedback: string;
  activeMarks?: { mark: string; possessionsLeft: number }[];
}

export const MatchPlayerUnit: React.FC<MatchPlayerUnitProps> = ({
  player: p,
  dataSlotId,
  className,
  style,
  onPointerDown,
  isHot,
  isCold,
  showFtPopup,
  ftOutcome,
  justScored,
  lastPointsScored,
  eventText,
  justMissed,
  lastEventIndicator,
  showBlockAnimation,
  ftSequence,
  activeFtIndex,
  activeFtStatus,
  showClutchFrame,
  bgImage,
  stam,
  isFouledOut,
  staminaMax,
  displayPos,
  isOutOfPosition,
  fouls,
  tier,
  tierColor,
  pStats,
  formRating,
  activeShotMeter,
  shotMeterProgress,
  shotMeterStatus,
  shotMeterFeedback,
  activeMarks = [],
}) => {
  return (
    <div
      key={p.id}
      data-slot-id={dataSlotId}
      className={className}
      style={style}
      onPointerDown={onPointerDown}
    >
      <PlayerStatusIcons isHot={isHot} isCold={isCold} />

      {activeMarks.length > 0 && (
        <div className="absolute top-[8px] left-[-42px] flex flex-col gap-1.5 z-55 pointer-events-none select-none">
          {activeMarks.map((m, idx) => (
            <div key={idx} className="relative w-7 h-7 flex items-center justify-center">
              <img
                src={`/marks/${m.mark.toLowerCase()}.png`}
                alt={m.mark}
                className="w-full h-full object-contain filter drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.95)] drop-shadow-[0_0_2px_rgba(0,0,0,0.85)]"
              />
              <span
                className="absolute bottom-[-3px] right-[-3px] bg-neutral-950/95 border border-neutral-700/80 text-[8px] font-black text-white leading-none px-[3.5px] py-[1.5px] rounded-sm shadow-md"
                style={{ textShadow: '0 1px 2px rgba(0,0,0,1)' }}
              >
                {m.possessionsLeft}
              </span>
            </div>
          ))}
        </div>
      )}
      
      {/* ═══ PREMIUM SLANTED BANNERS ═══ */}
      <PlayerEventBanner
        showFtPopup={showFtPopup}
        ftOutcome={ftOutcome}
        justScored={justScored}
        lastPointsScored={lastPointsScored}
        eventText={eventText}
        justMissed={justMissed}
        lastEventIndicator={lastEventIndicator}
        playerId={p.id}
      />

      <BlockCourtAnimation show={showBlockAnimation} />

      {ftSequence && ftSequence.shooterId === p.id && (
        <FreeThrowPopup
          ftSequence={ftSequence}
          activeFtIndex={activeFtIndex}
          activeFtStatus={activeFtStatus}
        />
      )}

      <div className="relative pointer-events-none flex flex-col items-center justify-center w-full z-30" style={{ transform: 'scale(1.05)' }}>
        <ClutchFrame show={showClutchFrame} />

        <PlayerCard
          player={{ ...p, imageUrl: bgImage, stamina: stam, isInjured: isFouledOut }}
          tooltipDirection="none"
          staminaMax={staminaMax}
          showPositionBox={true}
          positionBoxLabel={`${displayPos}${isOutOfPosition ? ' (OOP)' : ''}`}
        />
        
        <PlayerAvailabilityOverlay
          isOutOfPosition={isOutOfPosition}
          isFouledOut={isFouledOut}
        />
      </div>

      {/* FOUL PIPS */}
      <FoulPips fouls={fouls} />

      {/* DTPH-Style Hover Tooltip */}
      <PlayerTooltip
        player={p}
        stamina={stam}
        tier={tier}
        tierColor={tierColor}
        playerStats={pStats}
        formRating={formRating}
        activeMarks={activeMarks}
      />

      {/* ═══ NBA 2K-STYLE SHOT METER OVERLAY ═══ */}
      {activeShotMeter && activeShotMeter.playerId === p.id && (
        <ShotMeter
          activeShotMeter={activeShotMeter}
          shotMeterProgress={shotMeterProgress}
          shotMeterStatus={shotMeterStatus}
          shotMeterFeedback={shotMeterFeedback}
        />
      )}
    </div>
  );
};
