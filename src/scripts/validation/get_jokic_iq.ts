import { mockPlayers } from "../../lib/data/mockPlayers";
import { deriveAttributesFromNbaStats } from "../../lib/utils/nbaAttributeMapper";

const playersWithIQ = mockPlayers.map(p => {
  const derived = deriveAttributesFromNbaStats(p);
  return {
    name: p.name,
    position: p.position,
    rarity: p.rarity,
    basketballIQ: derived.basketballIQ,
    hustle: derived.hustle,
    finishing: derived.finishing
  };
});

// Sort by Basketball IQ descending
playersWithIQ.sort((a, b) => b.basketballIQ - a.basketballIQ);

console.log("Top 10 Players with the Highest Basketball IQ:");
playersWithIQ.slice(0, 10).forEach((p, index) => {
  console.log(`${index + 1}. ${p.name} (${p.position} - ${p.rarity}) | IQ: ${p.basketballIQ} | Hustle: ${p.hustle} | Finishing: ${p.finishing}`);
});
