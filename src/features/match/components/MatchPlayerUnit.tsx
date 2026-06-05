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
}) => {
  const staminaPct = Math.max(0, Math.min(100, (stam / Math.max(staminaMax, 1)) * 100));
  const ringColor = staminaPct > 60 ? "#22c55e" : staminaPct > 30 ? "#eab308" : "#ef4444";

  return (
    <div
      key={p.id}
      data-slot-id={dataSlotId}
      className={className}
      style={style}
      onPointerDown={onPointerDown}
    >
      <PlayerStatusIcons isHot={isHot} isCold={isCold} />
      
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

      <div
        className="relative pointer-events-none flex flex-col items-center justify-center w-full z-30 rounded-lg p-[3px]"
        style={{
          transform: "scale(1.05)",
          background: `conic-gradient(${ringColor} ${staminaPct * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
        }}
      >
        <div className="relative flex flex-col items-center justify-center w-full rounded-[6px] bg-black/35">
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
