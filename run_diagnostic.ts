import { simulateTick, mockAiTeams, createInitialMatchState } from './src/lib/utils/matchEngine';

(global as any).__diagnostic3ptLogs = [];

const userTeamObj = mockAiTeams.HARD; // Elite User (Defense 90)
const aiTeamObj = mockAiTeams.HARD;   // Elite AI (Offense 90)

// Provide stamina and stats properly like frontend does? 
// No, let's just run it as it is, but we will see what stamina and stats actually are.
const userLineup = userTeamObj.roster.slice(0, 5).map(p => ({...p, id: p.id + '_user'}));
const allUserRoster = userTeamObj.roster.map(p => ({...p, id: p.id + '_user'}));

let m = 0;
while ((global as any).__diagnostic3ptLogs.length < 250 && m < 50) {
  let state = createInitialMatchState();
  state.userOffStrategy = 'Motion Offense';
  state.aiOffStrategy = 'Motion Offense';
  state.aiLineupIds = aiTeamObj.roster.slice(0, 5).map(p => p.id);
  
  let ticks = 0;
  while (!state.isFinished && ticks < 5000) {
    state = simulateTick(state, userTeamObj.off, userTeamObj.def, aiTeamObj, userLineup, allUserRoster);
    ticks++;
  }
  m++;
}

const logs = (global as any).__diagnostic3ptLogs;

console.log(`Collected ${logs.length} 3PT attempts.`);

if (logs.length > 0) {
  let sumBaseChance = 0;
  let sumStaminaMod = 0;
  let sumFormMod = 0;
  let sumMatchupAdj = 0;
  let sumAdditiveSum = 0;
  let sumCappedAdditive = 0;
  let sumFinalScoringChance = 0;
  let makes = 0;

  const typeCounts: Record<string, number> = {};

  for (const log of logs) {
    sumBaseChance += log.baseChance;
    sumStaminaMod += log.staminaModifier;
    sumFormMod += log.formModifier;
    sumMatchupAdj += log.matchupAdj;
    sumAdditiveSum += log.additiveBonusSum;
    sumCappedAdditive += log.cappedAdditiveBonus;
    sumFinalScoringChance += log.finalScoringChance;
    if (log.make) makes++;

    typeCounts[log.shotType] = (typeCounts[log.shotType] || 0) + 1;
  }

  console.log(`=== AVERAGES ===`);
  console.log(`baseChance (after fatigue): ${(sumBaseChance / logs.length).toFixed(3)}`);
  console.log(`staminaModifier: ${(sumStaminaMod / logs.length).toFixed(3)}`);
  console.log(`formModifier: ${(sumFormMod / logs.length).toFixed(3)}`);
  console.log(`matchupAdj: ${(sumMatchupAdj / logs.length).toFixed(3)}`);
  console.log(`additiveBonusSum: ${(sumAdditiveSum / logs.length).toFixed(3)}`);
  console.log(`cappedAdditiveBonus: ${(sumCappedAdditive / logs.length).toFixed(3)}`);
  console.log(`finalScoringChance: ${(sumFinalScoringChance / logs.length).toFixed(3)}`);
  console.log(`Actual Make %: ${((makes / logs.length) * 100).toFixed(1)}%`);
  
  console.log(`\n=== SHOT TYPE DISTRIBUTION ===`);
  console.log(typeCounts);

  console.log(`\n=== SAMPLE OF 5 ATTEMPTS ===`);
  for (let i = 0; i < 5; i++) {
    console.log(logs[Math.floor(Math.random() * logs.length)]);
  }
}
