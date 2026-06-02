import { mockAiTeams, createInitialMatchState, computeEffective } from './src/lib/utils/matchEngine';

const userTeamObj = mockAiTeams['HARD'];
const aiTeamObj = mockAiTeams['HARD'];

const allUserRoster = userTeamObj.roster.map(p => ({...p, id: p.id + '_user'}));
const userLineup = allUserRoster.slice(0, 5);
const aiLineup = aiTeamObj.roster.slice(0, 5);

const state = createInitialMatchState();
allUserRoster.forEach(p => state.playerStamina[p.id] = 100);
aiTeamObj.roster.forEach(p => state.playerStamina[p.id] = 100);

const userEff = computeEffective(userLineup, state.playerStamina, 'Motion Offense', 'Man-to-Man', 1.0, 1.0);
const aiEff = computeEffective(aiLineup, state.playerStamina, 'Motion Offense', 'Man-to-Man', 1.0, 1.0);

console.log('User Eff:', userEff);
console.log('AI Eff:', aiEff);

const userRawOff = userLineup.reduce((s, p) => s + p.offense, 0);
const userRawDef = userLineup.reduce((s, p) => s + p.defense, 0);

console.log('User Raw Off:', userRawOff);
console.log('User Raw Def:', userRawDef);
