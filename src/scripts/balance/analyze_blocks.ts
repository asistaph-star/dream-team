import { mockAiTeams } from "../../lib/utils/matchEngine";
import { getBlockRating } from "../../lib/utils/playerIdentity";

const BLK_W: Record<string, number> = { C: 1.8, PF: 1.3, SF: 0.9, SG: 0.5, PG: 0.3 };

let count = 0;
let totalDef = 0;
let totalBlk = 0;
let weightedDef = 0;
let weightedBlk = 0;
let totalW = 0;

let bigDef = 0;
let bigBlk = 0;
let bigCount = 0;

Object.values(mockAiTeams).forEach(team => {
  team.roster.forEach(p => {
    count++;
    const def = p.defense || 0;
    const blk = getBlockRating(p);
    
    totalDef += def;
    totalBlk += blk;
    
    const w = BLK_W[p.position] || 0.9;
    weightedDef += def * w;
    weightedBlk += blk * w;
    totalW += w;
    
    if (p.position === 'C' || p.position === 'PF') {
      bigDef += def;
      bigBlk += blk;
      bigCount++;
    }
  });
});

console.log(`Total Players: ${count}`);
console.log(`Avg Defense: ${(totalDef / count).toFixed(2)}`);
console.log(`Avg Block: ${(totalBlk / count).toFixed(2)}`);
console.log(`Avg Weighted Defense: ${(weightedDef / totalW).toFixed(2)}`);
console.log(`Avg Weighted Block: ${(weightedBlk / totalW).toFixed(2)}`);
console.log(`Big (C/PF) Avg Defense: ${(bigDef / bigCount).toFixed(2)}`);
console.log(`Big (C/PF) Avg Block: ${(bigBlk / bigCount).toFixed(2)}`);
