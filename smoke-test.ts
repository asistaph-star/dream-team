import { mockAiTeams, simulateTick, createInitialMatchState } from "./src/lib/utils/matchEngine";
import { Player } from "./src/lib/types/player";

const mockUserRoster: Player[] = [
  { id: 'user_1', name: 'Stephen Curry', position: 'PG', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 96, offense: 99, defense: 75, shooting: 99, speed: 90, strength: 60, playmaking: 95 },
  { id: 'user_2', name: 'Devin Booker', position: 'SG', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 94, offense: 96, defense: 78, shooting: 95, speed: 85, strength: 70, playmaking: 85 },
  { id: 'user_3', name: 'LeBron James', position: 'SF', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 98, offense: 97, defense: 90, shooting: 85, speed: 88, strength: 95, playmaking: 98 },
  { id: 'user_4', name: 'Giannis Antetokounmpo', position: 'PF', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 97, offense: 95, defense: 96, shooting: 70, speed: 85, strength: 99, playmaking: 80 },
  { id: 'user_5', name: 'Nikola Jokic', position: 'C', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 98, offense: 98, defense: 80, shooting: 90, speed: 65, strength: 95, playmaking: 99 },
  { id: 'user_bench_1', name: 'Alex Caruso', position: 'PG', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 80, offense: 75, defense: 95, shooting: 80, speed: 85, strength: 75, playmaking: 78 },
  { id: 'user_bench_2', name: 'Malik Monk', position: 'SG', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 82, offense: 88, defense: 65, shooting: 88, speed: 88, strength: 65, playmaking: 80 },
  { id: 'user_bench_3', name: 'Josh Hart', position: 'SF', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 83, offense: 78, defense: 85, shooting: 75, speed: 80, strength: 85, playmaking: 75 },
  { id: 'user_bench_4', name: 'Bobby Portis', position: 'PF', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 82, offense: 85, defense: 75, shooting: 82, speed: 70, strength: 88, playmaking: 65 },
  { id: 'user_bench_5', name: 'Naz Reid', position: 'C', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 84, offense: 88, defense: 78, shooting: 85, speed: 75, strength: 85, playmaking: 70 },
];
const mockUserLineup = mockUserRoster.slice(0, 5);
const hardTeam = mockAiTeams.HARD; // GSW

let state = createInitialMatchState();
state.difficulty = 'HARD';
state.aiLineupIds = hardTeam.roster.slice(0, 5).map(p => p.id);
state.playerStamina = {};
mockUserRoster.forEach(p => state.playerStamina[p.id] = 100);
hardTeam.roster.forEach(p => state.playerStamina[p.id] = 100);

let ticks = 0;
let userPossessions = 0;
let aiPossessions = 0;

// To track possessions correctly, we watch for clock/quarter changes or turnover indicators.
// But simulateTick gives us events. 
// A simple way is to count FGA + TOV + FTA/2 (roughly). 
// Or better, track whenever possessionTeam flips, plus fastbreaks.

while (!state.isFinished && ticks < 20000) {
  const prevPoss = state.possessionTeam;
  const prevClock = state.clock;
  
  state = simulateTick(state, 99, 99, hardTeam, mockUserLineup, mockUserRoster);
  
  if (state.clock !== prevClock) {
    if (prevPoss === 'user') userPossessions++;
    else aiPossessions++;
  }
  
  ticks++;
}

console.log("\n=========================================");
console.log("🏀 SMOKE TEST: FULL GAME SIMULATION 🏀");
console.log("=========================================\n");

console.log(`FINAL SCORE: User ${state.userScore} - ${state.aiScore} AI (${hardTeam.name})`);
console.log(`Quarter: ${state.quarter}, Clock: ${state.clock}`);
console.log(`Total Engine Ticks: ${ticks}`);
console.log(`Estimated Possessions: User ${userPossessions} - ${aiPossessions} AI (Total: ${userPossessions + aiPossessions})`);

console.log("\n--- TEAM STATS ---");
let userTOV = 0, aiTOV = 0;
let userFGA = 0, aiFGA = 0;
let userFGM = 0, aiFGM = 0;
let userTPM = 0, userTPA = 0, aiTPM = 0, aiTPA = 0;
let userREB = 0, aiREB = 0;
let userFOL = 0, aiFOL = 0;

for (const p of mockUserRoster) {
  const stats = state.playerStats[p.id];
  if (!stats) continue;
  userTOV += stats.TOV || 0;
  userFGA += stats.FGA || 0;
  userFGM += stats.FGM || 0;
  userTPA += stats.TPA || 0;
  userTPM += stats.TPM || 0;
  userREB += stats.REB || 0;
  userFOL += stats.FOL || 0;
}

for (const p of hardTeam.roster) {
  const stats = state.playerStats[p.id];
  if (!stats) continue;
  aiTOV += stats.TOV || 0;
  aiFGA += stats.FGA || 0;
  aiFGM += stats.FGM || 0;
  aiTPA += stats.TPA || 0;
  aiTPM += stats.TPM || 0;
  aiREB += stats.REB || 0;
  aiFOL += stats.FOL || 0;
}

console.log(`Turnovers: User ${userTOV} - ${aiTOV} AI`);
console.log(`Field Goals: User ${userFGM}/${userFGA} (${((userFGM/userFGA)*100).toFixed(1)}%) - ${aiFGM}/${aiFGA} (${((aiFGM/aiFGA)*100).toFixed(1)}%) AI`);
console.log(`3PT: User ${userTPM}/${userTPA} (${((userTPM/userTPA)*100).toFixed(1)}%) - ${aiTPM}/${aiTPA} (${((aiTPM/aiTPA)*100).toFixed(1)}%) AI`);
console.log(`Rebounds: User ${userREB} - ${aiREB} AI`);
console.log(`Fouls: User ${userFOL} - ${aiFOL} AI`);

console.log("\n--- USER BOX SCORE ---");
for (const p of mockUserRoster) {
  const s = state.playerStats[p.id];
  if (!s || (s.PTS===0 && s.AST===0 && s.REB===0 && s.TOV===0)) continue;
  console.log(`${p.name.padEnd(25)} | PTS: ${String(s.PTS).padStart(2)} | REB: ${String(s.REB).padStart(2)} | AST: ${String(s.AST).padStart(2)} | STL: ${String(s.STL).padStart(2)} | TOV: ${String(s.TOV).padStart(2)} | FG: ${s.FGM}/${s.FGA} | 3PT: ${s.TPM}/${s.TPA}`);
}

console.log("\n--- AI BOX SCORE ---");
for (const p of hardTeam.roster) {
  const s = state.playerStats[p.id];
  if (!s || (s.PTS===0 && s.AST===0 && s.REB===0 && s.TOV===0)) continue;
  console.log(`${p.name.padEnd(25)} | PTS: ${String(s.PTS).padStart(2)} | REB: ${String(s.REB).padStart(2)} | AST: ${String(s.AST).padStart(2)} | STL: ${String(s.STL).padStart(2)} | TOV: ${String(s.TOV).padStart(2)} | FG: ${s.FGM}/${s.FGA} | 3PT: ${s.TPM}/${s.TPA}`);
}

// Validation 
console.log("\n=========================================");
console.log("SMOKE TEST VALIDATION");
console.log("=========================================");
const passTOV = (userTOV >= 9 && userTOV <= 17) && (aiTOV >= 9 && aiTOV <= 17);
const passUserPoss = userPossessions >= 85 && userPossessions <= 115;
const passAiPoss = aiPossessions >= 85 && aiPossessions <= 115;
const possessionRatio = Math.max(userPossessions, aiPossessions) / Math.max(1, Math.min(userPossessions, aiPossessions));
const passSymmetry = possessionRatio <= 1.3; // Neither team should have >30% more possessions
const passPoss = passUserPoss && passAiPoss && passSymmetry;
const passScore = (state.userScore >= 95 && state.userScore <= 135) && (state.aiScore >= 95 && state.aiScore <= 135);

console.log(`Turnovers (Target 11-14): ${passTOV ? '✅ PASS' : '❌ FAIL'} (${userTOV}, ${aiTOV})`);
console.log(`User Possessions (Target 85-115): ${passUserPoss ? '✅ PASS' : '❌ FAIL'} (${userPossessions})`);
console.log(`AI Possessions (Target 85-115): ${passAiPoss ? '✅ PASS' : '❌ FAIL'} (${aiPossessions})`);
console.log(`Possession Symmetry (≤1.3x ratio): ${passSymmetry ? '✅ PASS' : '❌ FAIL'} (ratio: ${possessionRatio.toFixed(2)})`);
console.log(`Scoring (Target 95-135): ${passScore ? '✅ PASS' : '❌ FAIL'} (${state.userScore}, ${state.aiScore})`);
console.log("=========================================\n");
