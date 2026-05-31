import { PlayerMatchStats } from '@/lib/utils/matchEngine';

export const calculateTS = (s: PlayerMatchStats): string => {
  const fga = s.FGA ?? 0;
  const fta = s.FTA ?? 0;
  const pts = s.PTS ?? 0;
  const attempts = fga + 0.44 * fta;
  if (attempts < 1.0) return "—"; // Not enough attempts (volume) for meaningful TS%
  return ((pts / (2 * attempts)) * 100).toFixed(1);
};
