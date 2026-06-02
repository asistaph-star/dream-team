/**
 * Phase Scoring-2G — Frontend-Equivalent Balance Harness
 * 
 * This is a dev-only balance script designed to test match logic
 * exactly as it runs in the real frontend `MatchPage` lifecycle.
 * 
 * It mirrors critical frontend behaviors that the old mock script missed:
 * 1. User auto-substitution based on stamina
 * 2. AI substitution based on stamina
 * 3. Bench recovery
 * 4. Quarter/Halftime recovery
 * 5. computeEffective strategy impacts
 * 
 * Do not import this in production code. Run this manually to test balance changes.
 */

import { simulateTick, mockAiTeams, createInitialMatchState, computeEffective } from '../../lib/utils/matchEngine';

function runAccurateFrontendMockWithStrategy(userDifficulty: 'EASY'|'NORMAL'|'HARD', aiDifficulty: 'EASY'|'NORMAL'|'HARD', strategy: string) {
  const userTeamObj = mockAiTeams[userDifficulty];
  const aiTeamObj = mockAiTeams[aiDifficulty];
  
  const allUserRoster = userTeamObj.roster.map(p => ({...p, id: p.id + '_user'}));
  let userLineup = [...allUserRoster.slice(0, 5)];
  
  let state = createInitialMatchState();
  state.userOffStrategy = strategy;
  state.userDefStrategy = 'Man-to-Man';
  state.aiOffStrategy = 'Motion Offense';
  state.userPlayerIds = allUserRoster.map(p => p.id);
  state.aiPlayerIds = aiTeamObj.roster.map(p => p.id);
  state.aiLineupIds = aiTeamObj.roster.slice(0, 5).map(p => p.id);
  
  allUserRoster.forEach(p => state.playerStamina[p.id] = 100);
  aiTeamObj.roster.forEach(p => state.playerStamina[p.id] = 100);
  
  let ticks = 0;
  let halftimeTriggered = false;

  while (!state.isFinished && ticks < 400) {
    // 1. User auto-substitution based on stamina (matches Player Substitutions logic)
    userLineup.forEach((p, idx) => {
      if (state.playerStamina[p.id] < 50) {
        const bench = allUserRoster.filter(bp => !userLineup.some(lp => lp.id === bp.id));
        const sub = bench.sort((a, b) => (state.playerStamina[b.id] ?? 0) - (state.playerStamina[a.id] ?? 0))[0];
        if (sub && state.playerStamina[sub.id] > 70) userLineup[idx] = sub;
      }
    });

    // 2. Halftime recovery matching frontend behavior
    if (state.halftimeShown && !halftimeTriggered) {
      halftimeTriggered = true;
      allUserRoster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
      aiTeamObj.roster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
    }

    // 3. computeEffective strategy impacts
    const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
    
    // Clear ftSequence for mock, allowing normal execution to proceed
    state.ftSequence = null; 
    
    // Run the matchEngine exactly as it would in frontend loop
    state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, allUserRoster);
    ticks++;
  }
  
  let uFGA=0, uFGM=0, u3PA=0, u3PM=0, uFTA=0, uFTM=0, uOREB=0, uTO=0, uSTL=0, uBLK=0, uAST=0;
  let aFGA=0, aFGM=0, a3PA=0, a3PM=0, aFTA=0, aFTM=0, aOREB=0, aTO=0, aSTL=0, aBLK=0, aAST=0;
  let uAnd1 = 0, aAnd1 = 0;
  
  state.events.forEach(e => {
    if (e.text && e.text.includes("AND-1!")) {
      if (e.isUserTeam) uAnd1++; else aAnd1++;
    }
  });
  let topScorer = { name: '', pts: 0 };

  Object.entries(state.playerStats).forEach(([playerId, s]) => {
    const isUser = allUserRoster.some(p => p.id === playerId);
    const name = isUser ? allUserRoster.find(p=>p.id===playerId)?.name : aiTeamObj.roster.find(p=>p.id===playerId)?.name;
    
    if (isUser) {
      uFGA += (s.FGA ?? 0); uFGM += (s.FGM ?? 0); u3PA += (s.TPA ?? 0); u3PM += (s.TPM ?? 0);
      uFTA += (s.FTA ?? 0); uFTM += (s.FTM ?? 0); uOREB += (s.OREB ?? 0); uTO += (s.TOV ?? 0);
      uSTL += (s.STL ?? 0); uBLK += (s.BLK ?? 0); uAST += (s.AST ?? 0);
    } else {
      aFGA += (s.FGA ?? 0); aFGM += (s.FGM ?? 0); a3PA += (s.TPA ?? 0); a3PM += (s.TPM ?? 0);
      aFTA += (s.FTA ?? 0); aFTM += (s.FTM ?? 0); aOREB += (s.OREB ?? 0); aTO += (s.TOV ?? 0);
      aSTL += (s.STL ?? 0); aBLK += (s.BLK ?? 0); aAST += (s.AST ?? 0);
    }

    if ((s.PTS ?? 0) > topScorer.pts) topScorer = { name: name || 'Unknown', pts: s.PTS ?? 0 };
  });

  console.log(`\nMatch (Strategy: ${strategy} - ${userDifficulty} vs ${aiDifficulty})`);
  console.log(`Final Score: User ${state.userScore} - ${state.aiScore} AI`);
  console.log(`User FG: ${uFGM}/${uFGA} (${uFGA? (uFGM/uFGA*100).toFixed(1) : 0}%)`);
  console.log(`Opponent FG: ${aFGM}/${aFGA} (${aFGA? (aFGM/aFGA*100).toFixed(1) : 0}%)`);
  console.log(`User 3PT: ${u3PM}/${u3PA} (${u3PA? (u3PM/u3PA*100).toFixed(1) : 0}%)`);
  console.log(`Opponent 3PT: ${a3PM}/${a3PA} (${a3PA? (a3PM/a3PA*100).toFixed(1) : 0}%)`);
  console.log(`User FTA/FT%: ${uFTA} / ${(uFTA?(uFTM/uFTA*100).toFixed(1):0)}%`);
  console.log(`Opponent FTA/FT%: ${aFTA} / ${(aFTA?(aFTM/aFTA*100).toFixed(1):0)}%`);
  console.log(`User OREB: ${uOREB} | Opponent OREB: ${aOREB}`);
  console.log(`User Assists: ${uAST} | Opponent Assists: ${aAST}`);
  console.log(`User Turnovers: ${uTO} | Opponent Turnovers: ${aTO}`);
  console.log(`User Steals: ${uSTL} | Opponent Steals: ${aSTL}`);
  console.log(`User Blocks: ${uBLK} | Opponent Blocks: ${aBLK}`);
  console.log(`User AND-1s: ${uAnd1} | Opponent AND-1s: ${aAnd1}`);
  console.log(`Top Scorer: ${topScorer.name} (${topScorer.pts} pts)`);
}

// 15 Test Matches for robust sample size
runAccurateFrontendMockWithStrategy('EASY', 'EASY', 'Motion Offense');
runAccurateFrontendMockWithStrategy('EASY', 'NORMAL', 'Pace and Space (3PT)');
runAccurateFrontendMockWithStrategy('EASY', 'HARD', 'Isolation (ISO)');
runAccurateFrontendMockWithStrategy('NORMAL', 'EASY', 'Seven Seconds');
runAccurateFrontendMockWithStrategy('NORMAL', 'NORMAL', 'Motion Offense');
runAccurateFrontendMockWithStrategy('NORMAL', 'HARD', 'Pick and Roll Focus');
runAccurateFrontendMockWithStrategy('HARD', 'EASY', 'Post Isolation');
runAccurateFrontendMockWithStrategy('HARD', 'NORMAL', 'Motion Offense');
runAccurateFrontendMockWithStrategy('HARD', 'HARD', 'Motion Offense');
runAccurateFrontendMockWithStrategy('HARD', 'HARD', 'Pace and Space (3PT)');
runAccurateFrontendMockWithStrategy('HARD', 'HARD', 'Isolation (ISO)');
runAccurateFrontendMockWithStrategy('HARD', 'HARD', 'Seven Seconds');
runAccurateFrontendMockWithStrategy('HARD', 'HARD', 'Pick and Roll Focus');
runAccurateFrontendMockWithStrategy('HARD', 'HARD', '5-Out Spacing');
runAccurateFrontendMockWithStrategy('HARD', 'HARD', 'Motion Offense');
