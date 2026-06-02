import { getRequiredDuplicateCount } from '../../lib/utils/starRequirements';

const tiers = ["Silver", "Blue", "Violet", "Orange", "Red"];
for (const tier of tiers) {
  let total = 0;
  for (let lvl = 1; lvl <= 5; lvl++) {
    total += getRequiredDuplicateCount(tier, lvl);
  }
  console.log(`${tier} total: ${total}`);
}
