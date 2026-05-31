import { Player } from '@/lib/types/player';
import { DEFAULT_PLAYER_IMAGES } from '../constants/matchConfig';

export const getPlayerImage = (p: Player | undefined): string => {
  if (!p) return '';
  return p.imageUrl || DEFAULT_PLAYER_IMAGES[p.position] || DEFAULT_PLAYER_IMAGES['SF'];
};
