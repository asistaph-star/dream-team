import { mockPlayers } from './src/lib/data/mockPlayers';

let defWeightedSum = 0;
let rebWeightedSum = 0;
let count = 0;
const REB_W: Record<string, number> = { C: 2.0, PF: 1.6, SF: 1.0, SG: 0.6, PG: 0.4 };

mockPlayers.forEach(p => {
  const w = REB_W[p.position] || 1.0;
  defWeightedSum += p.defense * w;
  rebWeightedSum += (p.rebound ?? Math.round((p.defense + p.strength) / 2)) * w;
  count++;
});

console.log(`Avg Weighted Defense: ${defWeightedSum / count}`);
console.log(`Avg Weighted Rebound: ${rebWeightedSum / count}`);
