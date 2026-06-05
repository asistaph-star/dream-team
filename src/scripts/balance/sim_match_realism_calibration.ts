// sim_match_realism_calibration.ts
// Phase MatchRealismCalibration — Verify NBA-Realistic Match Output After IQ and Hustle Gameplay Wiring

import { simulateTick, mockAiTeams, createInitialMatchState, computeEffective } from '../../lib/utils/matchEngine';
import { Player } from '../../lib/types/player';

interface MatchStatsAccumulator {
  games: number;
  userScore: number;
  aiScore: number;
  combinedScore: number;
  
  // User Shooting
  userFGM: number;
  userFGA: number;
  user3PM: number;
  user3PA: number;
  userFTM: number;
  userFTA: number;
  
  // AI Shooting
  aiFGM: number;
  aiFGA: number;
  ai3PM: number;
  ai3PA: number;
  aiFTM: number;
  aiFTA: number;

  // Rebounds
  userOREB: number;
  userREB: number;
  aiOREB: number;
  aiREB: number;

  // Turnovers, Steals, Blocks, Assists, Fouls
  userTO: number;
  userSTL: number;
  userBLK: number;
  userAST: number;
  userFouls: number;
  
  aiTO: number;
  aiSTL: number;
  aiBLK: number;
  aiAST: number;
  aiFouls: number;

  // Stamina and Fatigue
  endStarterStaminaUserSum: number;
  endStarterStaminaAiSum: number;
  zeroStaminaEventsSum: number;

  // Skill trigger logs
  momentumSwingTriggers: number;
  brokenPlayRescueTriggers: number;
  fiveManSqueezeTriggers: number;
  debtCollectorTriggers: number;
  glassStrikeTriggers: number;
  flopTriggers: number;
  fourPointBaitTriggers: number;
  disciplineWallTriggers: number;
  cleanContestTriggers: number;
  composureTriggers: number;
}

function aggregateGame(
  acc: MatchStatsAccumulator,
  state: any,
  userRoster: Player[],
  aiRoster: Player[],
  endStartersUserStamina: number[],
  endStartersAiStamina: number[],
  zeroStaminaCount: number
) {
  acc.games++;
  acc.userScore += state.userScore;
  acc.aiScore += state.aiScore;
  acc.combinedScore += (state.userScore + state.aiScore);

  let uFGA = 0, uFGM = 0, u3PA = 0, u3PM = 0, uFTA = 0, uFTM = 0, uOREB = 0, uREB = 0, uTO = 0, uSTL = 0, uBLK = 0, uAST = 0, uFouls = 0;
  let aFGA = 0, aFGM = 0, a3PA = 0, a3PM = 0, aFTA = 0, aFTM = 0, aOREB = 0, aREB = 0, aTO = 0, aSTL = 0, aBLK = 0, aAST = 0, aFouls = 0;

  Object.entries(state.playerStats).forEach(([playerId, s]: [string, any]) => {
    const isUser = userRoster.some(p => p.id === playerId);
    if (isUser) {
      uFGA += (s.FGA ?? 0); uFGM += (s.FGM ?? 0); u3PA += (s.TPA ?? 0); u3PM += (s.TPM ?? 0);
      uFTA += (s.FTA ?? 0); uFTM += (s.FTM ?? 0); uOREB += (s.OREB ?? 0); uREB += (s.REB ?? 0); uTO += (s.TOV ?? 0);
      uSTL += (s.STL ?? 0); uBLK += (s.BLK ?? 0); uAST += (s.AST ?? 0); uFouls += (s.FOL ?? 0);
    } else {
      aFGA += (s.FGA ?? 0); aFGM += (s.FGM ?? 0); a3PA += (s.TPA ?? 0); a3PM += (s.TPM ?? 0);
      aFTA += (s.FTA ?? 0); aFTM += (s.FTM ?? 0); aOREB += (s.OREB ?? 0); aREB += (s.REB ?? 0); aTO += (s.TOV ?? 0);
      aSTL += (s.STL ?? 0); aBLK += (s.BLK ?? 0); aAST += (s.AST ?? 0); aFouls += (s.FOL ?? 0);
    }
  });

  acc.userFGM += uFGM; acc.userFGA += uFGA;
  acc.user3PM += u3PM; acc.user3PA += u3PA;
  acc.userFTM += uFTM; acc.userFTA += uFTA;
  acc.userOREB += uOREB; acc.userREB += uREB;
  
  acc.aiFGM += aFGM; acc.aiFGA += aFGA;
  acc.ai3PM += a3PM; acc.ai3PA += a3PA;
  acc.aiFTM += aFTM; acc.aiFTA += aFTA;
  acc.aiOREB += aOREB; acc.aiREB += aREB;

  acc.userTO += uTO; acc.userSTL += uSTL; acc.userBLK += uBLK; acc.userAST += uAST; acc.userFouls += uFouls;
  acc.aiTO += aTO; acc.aiSTL += aSTL; acc.aiBLK += aBLK; acc.aiAST += aAST; acc.aiFouls += aFouls;

  acc.endStarterStaminaUserSum += endStartersUserStamina.reduce((a, b) => a + b, 0) / 5;
  acc.endStarterStaminaAiSum += endStartersAiStamina.reduce((a, b) => a + b, 0) / 5;
  acc.zeroStaminaEventsSum += zeroStaminaCount;

  state.events.forEach((e: any) => {
    if (!e.text) return;
    if (e.text.includes("Momentum Swing")) acc.momentumSwingTriggers++;
    if (e.text.includes("rescued") || e.text.includes("broken play")) acc.brokenPlayRescueTriggers++;
    if (e.text.includes("Five-Man Squeeze")) acc.fiveManSqueezeTriggers++;
    if (e.text.includes("Debt Collector")) acc.debtCollectorTriggers++;
    if (e.text.includes("Glass Strike")) acc.glassStrikeTriggers++;
    if (e.text.includes("Flop X")) acc.flopTriggers++;
    if (e.text.includes("Four-Point Bait X")) acc.fourPointBaitTriggers++;
    if (e.text.includes("Discipline Wall")) acc.disciplineWallTriggers++;
    if (e.text.includes("Clean Contest X")) acc.cleanContestTriggers++;
    if (e.text.includes("Composure X")) acc.composureTriggers++;
  });
}

function runBatch(
  userDifficulty: 'EASY'|'NORMAL'|'HARD',
  aiDifficulty: 'EASY'|'NORMAL'|'HARD',
  strategy: string,
  numGames: number,
  modifierFn?: (userRoster: Player[], aiRoster: Player[]) => void
): MatchStatsAccumulator {
  const userTeamBase = mockAiTeams[userDifficulty];
  const aiTeamBase = mockAiTeams[aiDifficulty];
  
  const acc: MatchStatsAccumulator = {
    games: 0, userScore: 0, aiScore: 0, combinedScore: 0,
    userFGM: 0, userFGA: 0, user3PM: 0, user3PA: 0, userFTM: 0, userFTA: 0,
    aiFGM: 0, aiFGA: 0, ai3PM: 0, ai3PA: 0, aiFTM: 0, aiFTA: 0,
    userOREB: 0, userREB: 0, aiOREB: 0, aiREB: 0,
    userTO: 0, userSTL: 0, userBLK: 0, userAST: 0, userFouls: 0,
    aiTO: 0, aiSTL: 0, aiBLK: 0, aiAST: 0, aiFouls: 0,
    endStarterStaminaUserSum: 0, endStarterStaminaAiSum: 0, zeroStaminaEventsSum: 0,
    momentumSwingTriggers: 0, brokenPlayRescueTriggers: 0, fiveManSqueezeTriggers: 0,
    debtCollectorTriggers: 0, glassStrikeTriggers: 0, flopTriggers: 0,
    fourPointBaitTriggers: 0, disciplineWallTriggers: 0, cleanContestTriggers: 0,
    composureTriggers: 0
  };

  for (let i = 0; i < numGames; i++) {
    const userRoster = userTeamBase.roster.map(p => ({ ...p, id: p.id + '_user', starLevel: 5 }));
    const aiRoster = aiTeamBase.roster.map(p => ({ ...p, starLevel: 5 }));

    if (modifierFn) {
      modifierFn(userRoster, aiRoster);
    }

    let userLineup = [...userRoster.slice(0, 5)];

    let state = createInitialMatchState();
    state.userOffStrategy = strategy;
    state.userDefStrategy = 'Man-to-Man';
    state.aiOffStrategy = 'Motion Offense';
    state.userPlayerIds = userRoster.map(p => p.id);
    state.aiPlayerIds = aiRoster.map(p => p.id);
    state.aiLineupIds = aiRoster.slice(0, 5).map(p => p.id);
    state.disableAiCoach = true;

    userRoster.forEach(p => state.playerStamina[p.id] = 100);
    aiRoster.forEach(p => state.playerStamina[p.id] = 100);

    let ticks = 0;
    let halftimeTriggered = false;
    let zeroStaminaCount = 0;

    const aiTeamObj = {
      ...aiTeamBase,
      roster: aiRoster
    };

    while (!state.isFinished && ticks < 400) {
      // 1. User auto-substitution based on stamina
      userLineup.forEach((p, idx) => {
        if (state.playerStamina[p.id] < 50) {
          const bench = userRoster.filter(bp => !userLineup.some(lp => lp.id === bp.id));
          const sub = bench.sort((a, b) => (state.playerStamina[b.id] ?? 0) - (state.playerStamina[a.id] ?? 0))[0];
          if (sub && state.playerStamina[sub.id] > 70) userLineup[idx] = sub;
        }
      });

      // Symmetrical AI auto-substitution based on stamina
      const currentAiLineup = state.aiLineupIds.map(id => aiRoster.find(p => p.id === id)!).filter(Boolean);
      const newAiLineupIds = [...state.aiLineupIds];
      currentAiLineup.forEach((p, idx) => {
        if (state.playerStamina[p.id] < 50) {
          const bench = aiRoster.filter(bp => !newAiLineupIds.includes(bp.id));
          const sub = bench.sort((a, b) => (state.playerStamina[b.id] ?? 0) - (state.playerStamina[a.id] ?? 0))[0];
          if (sub && state.playerStamina[sub.id] > 70) {
            newAiLineupIds[idx] = sub.id;
          }
        }
      });
      state.aiLineupIds = newAiLineupIds;

      // 2. Halftime recovery
      if (state.halftimeShown && !halftimeTriggered) {
        halftimeTriggered = true;
        userRoster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
        aiRoster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
      }

      // 3. computeEffective strategy impacts
      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null; 
      
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, userRoster);
      ticks++;

      // Count ticks where an active player has <= 0 stamina
      userLineup.forEach(p => {
        if ((state.playerStamina[p.id] ?? 0) <= 0) zeroStaminaCount++;
      });
      aiRoster.slice(0, 5).forEach(p => {
        const courtIds = new Set(state.aiLineupIds || []);
        if (courtIds.has(p.id) && (state.playerStamina[p.id] ?? 0) <= 0) zeroStaminaCount++;
      });
    }

    const endStartersUserStamina = userRoster.slice(0, 5).map(p => state.playerStamina[p.id] ?? 0);
    const endStartersAiStamina = aiRoster.slice(0, 5).map(p => state.playerStamina[p.id] ?? 0);

    aggregateGame(acc, state, userRoster, aiRoster, endStartersUserStamina, endStartersAiStamina, zeroStaminaCount);
  }

  return acc;
}

function printReport(title: string, r: MatchStatsAccumulator) {
  const g = r.games;
  console.log(`\n==================================================`);
  console.log(`BATCH: ${title} (${g} Games)`);
  console.log(`==================================================`);
  console.log(`Average Score:       User ${ (r.userScore / g).toFixed(1) } - ${ (r.aiScore / g).toFixed(1) } AI (Combined: ${ (r.combinedScore / g).toFixed(1) })`);
  console.log(`User FG%:            ${ (r.userFGM / r.userFGA * 100).toFixed(1) }% (${r.userFGM}/${r.userFGA})`);
  console.log(`AI FG%:              ${ (r.aiFGM / r.aiFGA * 100).toFixed(1) }% (${r.aiFGM}/${r.aiFGA})`);
  console.log(`User 3PT%:           ${ (r.user3PM / r.user3PA * 100).toFixed(1) }% (${r.user3PM}/${r.user3PA})`);
  console.log(`AI 3PT%:             ${ (r.ai3PM / r.ai3PA * 100).toFixed(1) }% (${r.ai3PM}/${r.ai3PA})`);
  console.log(`User FT% / FTA:      ${ (r.userFTM / r.userFTA * 100).toFixed(1) }% / ${ (r.userFTA / g).toFixed(1) } FTA`);
  console.log(`AI FT% / FTA:        ${ (r.aiFTM / r.aiFTA * 100).toFixed(1) }% / ${ (r.aiFTA / g).toFixed(1) } FTA`);
  console.log(`Average Rebounds:    User ${ (r.userREB / g).toFixed(1) } (Off: ${ (r.userOREB / g).toFixed(1) }) | AI ${ (r.aiREB / g).toFixed(1) } (Off: ${ (r.aiOREB / g).toFixed(1) })`);
  console.log(`Average Turnovers:   User ${ (r.userTO / g).toFixed(1) } | AI ${ (r.aiTO / g).toFixed(1) }`);
  console.log(`Average Steals:      User ${ (r.userSTL / g).toFixed(1) } | AI ${ (r.aiSTL / g).toFixed(1) }`);
  console.log(`Average Blocks:      User ${ (r.userBLK / g).toFixed(1) } | AI ${ (r.aiBLK / g).toFixed(1) }`);
  console.log(`Average Assists:     User ${ (r.userAST / g).toFixed(1) } | AI ${ (r.aiAST / g).toFixed(1) }`);
  console.log(`Average Fouls:       User ${ (r.userFouls / g).toFixed(1) } | AI ${ (r.aiFouls / g).toFixed(1) }`);
  console.log(`Starter End Stamina: User ${ (r.endStarterStaminaUserSum / g).toFixed(1) } | AI ${ (r.endStarterStaminaAiSum / g).toFixed(1) }`);
  console.log(`Zero Stamina Ticks:  ${ (r.zeroStaminaEventsSum / g).toFixed(1) } ticks per game`);
  console.log(`--------------------------------------------------`);
  console.log(`Skill Trigger Logs (Total over ${g} games):`);
  console.log(`- Momentum Swing:      ${r.momentumSwingTriggers}`);
  console.log(`- Broken Play Rescue:  ${r.brokenPlayRescueTriggers}`);
  console.log(`- Five-Man Squeeze:    ${r.fiveManSqueezeTriggers}`);
  console.log(`- Debt Collector:      ${r.debtCollectorTriggers}`);
  console.log(`- Glass Strike:        ${r.glassStrikeTriggers}`);
  console.log(`- Flop X:              ${r.flopTriggers}`);
  console.log(`- Four-Point Bait X:   ${r.fourPointBaitTriggers}`);
  console.log(`- Discipline Wall:     ${r.disciplineWallTriggers}`);
  console.log(`- Clean Contest X:     ${r.cleanContestTriggers}`);
  console.log(`- Composure X:         ${r.composureTriggers}`);
  console.log(`==================================================\n`);
}

// Run the simulation sweep
const N = 50;

// 1. Baseline
const baseline = runBatch('NORMAL', 'NORMAL', 'Motion Offense', N);
printReport('Baseline (Standard Roster)', baseline);

// 2. High-IQ vs Low-IQ
const highLowIQ = runBatch('NORMAL', 'NORMAL', 'Motion Offense', N, (user, ai) => {
  user.forEach(p => {
    p.basketballIQ = 130;
    // Inject BROKEN_PLAY_RESCUE and COMPOSURE_SHIELD
    p.specialSkillSlots = ["BROKEN_PLAY_RESCUE", "COMPOSURE_SHIELD"];
  });
  ai.forEach(p => {
    p.basketballIQ = 50;
    p.specialSkillSlots = ["BROKEN_PLAY_RESCUE", "COMPOSURE_SHIELD"];
  });
});
printReport('High-IQ + Special Skills (User: 130) vs Low-IQ (AI: 50)', highLowIQ);

// 3. High-Hustle vs Low-Hustle
const highLowHustle = runBatch('NORMAL', 'NORMAL', 'Motion Offense', N, (user, ai) => {
  user.forEach(p => {
    p.hustle = 130;
    // Inject GLASS_STRIKE and MOMENTUM_SWING
    p.specialSkillSlots = ["GLASS_STRIKE", "MOMENTUM_SWING"];
  });
  ai.forEach(p => {
    p.hustle = 50;
    p.specialSkillSlots = ["GLASS_STRIKE", "MOMENTUM_SWING"];
  });
});
printReport('High-Hustle + Special Skills (User: 130) vs Low-Hustle (AI: 50)', highLowHustle);

// 4. Balanced Teams (NORMAL vs NORMAL, checking symmetry)
const balancedSymmetry = runBatch('NORMAL', 'NORMAL', 'Motion Offense', N);
printReport('Symmetry Check (NORMAL vs NORMAL)', balancedSymmetry);

// 5. Stamina-Heavy Lineups (using Seven Seconds strategy with BENCH_CAPTAIN injected)
const staminaHeavy = runBatch('NORMAL', 'NORMAL', 'Seven Seconds', N, (user, ai) => {
  user.forEach(p => p.specialSkillSlots = ["BENCH_CAPTAIN", null]);
  ai.forEach(p => p.specialSkillSlots = ["BENCH_CAPTAIN", null]);
});
printReport('Stamina-Heavy Strategy (Seven Seconds with Bench Captains)', staminaHeavy);

// 6. Foul-Draw Lineups (using Isolation strategy, giving FLOP/CLEAN_CHALLENGE)
const foulDrawLineups = runBatch('NORMAL', 'NORMAL', 'Isolation (ISO)', N, (user, ai) => {
  user.forEach(p => {
    p.shooting = 95;
    p.speed = 90;
    p.calm = 95;
    p.specialSkillSlots = ["FLOP", "DEEP_STRIKE"]; // triggers Flop and Four-Point Bait
  });
  ai.forEach(p => {
    p.specialSkillSlots = ["CLEAN_CHALLENGE", "COMPOSURE_SHIELD"];
  });
});
printReport('Foul-Draw vs Defense (User FLOP/DEEP_STRIKE vs AI CLEAN/COMPOSURE)', foulDrawLineups);

// 7. Defensive Anchor / Paint Pressure
const defensiveAnchorLineups = runBatch('NORMAL', 'NORMAL', 'Motion Offense', N, (user, ai) => {
  // Give user team some Debt to let Debt Collector trigger
  user.forEach(p => {
    p.specialSkillSlots = [null, null];
  });
  // Give AI team Defensive Anchor, Five-Man Squeeze, and LOCK_CHAIN
  ai.forEach(p => {
    p.defense = 95;
    p.calm = 95;
    p.specialSkillSlots = ["DEFENSIVE_ANCHOR", "LOCK_CHAIN"];
  });
});
printReport('Defensive Anchor & Lock Chain (AI Roster Boosted)', defensiveAnchorLineups);
