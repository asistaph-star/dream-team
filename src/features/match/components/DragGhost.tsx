import React from 'react';
import { Player } from '@/lib/types/player';
import { getPlayerMaxStamina } from '@/lib/utils/matchEngine';
import { PlayerCard } from '@/components/player/PlayerCard';
import { getPlayerImage } from '@/features/match/utils/playerImages';

interface DragGhostProps {
  draggingPlayerId: string;
  matchRoster: Player[];
  roster: Player[];
  pointerPos: { x: number; y: number };
  matchScale: number;
  showSubModal: boolean;
  playerStamina: Record<string, number>;
}

export const DragGhost: React.FC<DragGhostProps> = ({
  draggingPlayerId,
  matchRoster,
  roster,
  pointerPos,
  matchScale,
  showSubModal,
  playerStamina,
}) => {
  const dragP = matchRoster.find(p => p.id === draggingPlayerId) || roster.find(p => p.id === draggingPlayerId);
  if (!dragP) return null;

  const bgImg = getPlayerImage(dragP);

  return (
    <div
      id="drag-clone"
      className="fixed pointer-events-none z-[9999] w-[120px] h-[124px]"
      style={{
        left: pointerPos.x,
        top: pointerPos.y,
        transform: `translate(-50%, -50%) scale(${matchScale * (showSubModal ? 0.70 : 0.9)})`,
        opacity: 0.9,
        filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.5))',
      }}
    >
      <PlayerCard
        player={{ ...dragP, imageUrl: bgImg, stamina: playerStamina[dragP.id] ?? 100 }}
        tooltipDirection="none"
        staminaMax={getPlayerMaxStamina(dragP)}
      />
    </div>
  );
};
