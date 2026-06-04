import { Player } from "../types/player";

/** Generates real-time NBA-themed pre-match injury reports for user and AI teams */
export function generatePreMatchInjuries(
  userRoster: Player[],
  aiRoster: Player[]
): Record<string, { status: 'HEALTHY' | 'GTD' | 'OUT' | 'DNP'; reason?: string }> {
  const injuries: Record<string, { status: 'HEALTHY' | 'GTD' | 'OUT' | 'DNP'; reason?: string }> = {};

  const makeHealthy = (p: Player) => {
    injuries[p.id] = { status: 'HEALTHY' };
  };

  userRoster.forEach(makeHealthy);
  aiRoster.forEach(makeHealthy);

  return injuries;
}

/** Replaces any starter who is OUT or DNP with the best healthy bench player */
export function calibrateLineupForInjuries(
  lineup: Player[],
  roster: Player[],
  injuries: Record<string, { status: 'HEALTHY' | 'GTD' | 'OUT' | 'DNP'; reason?: string }>
): Player[] {
  const currentLineup = [...lineup];
  for (let i = 0; i < currentLineup.length; i++) {
    const starter = currentLineup[i];
    const statusObj = injuries[starter.id];
    if (statusObj && (statusObj.status === 'OUT' || statusObj.status === 'DNP')) {
      const benchPlayers = roster.filter(p => !currentLineup.some(s => s.id === p.id));
      const healthyBench = benchPlayers.filter(p => {
        const pStatus = injuries[p.id]?.status ?? 'HEALTHY';
        return pStatus === 'HEALTHY' || pStatus === 'GTD';
      });
      // Try position match first
      let replacement = healthyBench.filter(p => p.position === starter.position).sort((a, b) => b.ovr - a.ovr)[0];
      if (!replacement) {
        // Fallback to highest OVR healthy bench player
        replacement = healthyBench.sort((a, b) => b.ovr - a.ovr)[0];
      }
      if (replacement) {
        currentLineup[i] = replacement;
      }
    }
  }
  return currentLineup;
}
