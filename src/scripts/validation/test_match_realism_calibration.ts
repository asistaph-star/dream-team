// test_match_realism_calibration.ts
// Phase MatchRealismCalibration — Validation Suite

import { simulateTick, mockAiTeams, createInitialMatchState, computeEffective } from '../../lib/utils/matchEngine';
import { Player } from '../../lib/types/player';

interface ValidationBatchResult {
  avgUserScore: number;
  avgAiScore: number;
  avgCombinedScore: number;
  fgPct: number;
  threePtPct: number;
  ftPct: number;
  avgFTA: number;
  avgTO: number;
  avgAiTO: number;
  avgOREB: number;
  avgREB: number;
  avgAiREB: number;
  avgFouls: number;
  avgStarterStamina: number;
  avgZeroStaminaTicks: number;
  avgBrokenPlayRescues: number;
  avgMomentumSwings: number;
}

function runValidationBatch(
  userDifficulty: 'EASY'|'NORMAL'|'HARD',
  aiDifficulty: 'EASY'|'NORMAL'|'HARD',
  strategy: string,
  numGames: number,
  modifierFn?: (userRoster: Player[], aiRoster: Player[]) => void
): ValidationBatchResult {
  const userTeamBase = mockAiTeams[userDifficulty];
  const aiTeamBase = mockAiTeams[aiDifficulty];
  
  let totalUserScore = 0;
  let totalAiScore = 0;
  let totalFGM = 0, totalFGA = 0;
  let total3PM = 0, total3PA = 0;
  let totalFTM = 0, totalFTA = 0;
  let totalTO = 0;
  let totalAiTO = 0;
  let totalREB = 0;
  let totalAiREB = 0;
  let totalOREB = 0;
  let totalFouls = 0;
  
  let endStarterStaminaSum = 0;
  let zeroStaminaTicksSum = 0;
  let totalBrokenPlayRescues = 0;
  let totalMomentumSwings = 0;

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
      // User auto-substitution based on stamina
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

      // Halftime recovery
      if (state.halftimeShown && !halftimeTriggered) {
        halftimeTriggered = true;
        userRoster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
        aiRoster.forEach(p => state.playerStamina[p.id] = Math.min(100, state.playerStamina[p.id] + 30));
      }

      const eff = computeEffective(userLineup, state.playerStamina, state.userOffStrategy, state.userDefStrategy);
      state.ftSequence = null; 
      
      state = simulateTick(state, eff.off, eff.def, aiTeamObj, userLineup, userRoster);
      ticks++;

      userLineup.forEach(p => {
        if ((state.playerStamina[p.id] ?? 0) <= 0) zeroStaminaCount++;
      });
      aiRoster.slice(0, 5).forEach(p => {
        const courtIds = new Set(state.aiLineupIds || []);
        if (courtIds.has(p.id) && (state.playerStamina[p.id] ?? 0) <= 0) zeroStaminaCount++;
      });
    }

    totalUserScore += state.userScore;
    totalAiScore += state.aiScore;

    let uFGA = 0, uFGM = 0, u3PA = 0, u3PM = 0, uFTA = 0, uFTM = 0, uOREB = 0, uREB = 0, uTO = 0, uFouls = 0;
    let aTO = 0, aOREB = 0, aREB = 0;
    
    Object.entries(state.playerStats).forEach(([playerId, s]: [string, any]) => {
      const isUser = userRoster.some(p => p.id === playerId);
      if (isUser) {
        uFGA += (s.FGA ?? 0); uFGM += (s.FGM ?? 0); u3PA += (s.TPA ?? 0); u3PM += (s.TPM ?? 0);
        uFTA += (s.FTA ?? 0); uFTM += (s.FTM ?? 0); uOREB += (s.OREB ?? 0); uREB += (s.REB ?? 0); uTO += (s.TOV ?? 0); uFouls += (s.FOL ?? 0);
      } else {
        aTO += (s.TOV ?? 0);
        aOREB += (s.OREB ?? 0);
        aREB += (s.REB ?? 0);
      }
    });

    totalFGM += uFGM; totalFGA += uFGA;
    total3PM += u3PM; total3PA += u3PA;
    totalFTM += uFTM; totalFTA += uFTA;
    totalTO += uTO;
    totalAiTO += aTO;
    totalOREB += uOREB;
    totalREB += uREB;
    totalAiREB += aREB;
    totalFouls += uFouls;

    const endStartersUserStamina = userRoster.slice(0, 5).map(p => state.playerStamina[p.id] ?? 0);
    endStarterStaminaSum += endStartersUserStamina.reduce((a, b) => a + b, 0) / 5;
    zeroStaminaTicksSum += zeroStaminaCount;

    state.events.forEach((e: any) => {
      if (!e.text) return;
      if (e.text.includes("rescued") || e.text.includes("broken play")) totalBrokenPlayRescues++;
      if (e.text.includes("Momentum Swing")) totalMomentumSwings++;
    });
  }

  const g = numGames;
  return {
    avgUserScore: totalUserScore / g,
    avgAiScore: totalAiScore / g,
    avgCombinedScore: (totalUserScore + totalAiScore) / g,
    fgPct: totalFGM / totalFGA,
    threePtPct: total3PM / total3PA,
    ftPct: totalFTM / totalFTA,
    avgFTA: totalFTA / g,
    avgTO: totalTO / g,
    avgAiTO: totalAiTO / g,
    avgOREB: totalOREB / g,
    avgREB: totalREB / g,
    avgAiREB: totalAiREB / g,
    avgFouls: totalFouls / g,
    avgStarterStamina: endStarterStaminaSum / g,
    avgZeroStaminaTicks: zeroStaminaTicksSum / g,
    avgBrokenPlayRescues: totalBrokenPlayRescues / g,
    avgMomentumSwings: totalMomentumSwings / g
  };
}

const errors: string[] = [];

console.log("Running Phase MatchRealismCalibration validation checks...");

// 1. Run 100 baseline games
const baseline = runValidationBatch('NORMAL', 'NORMAL', 'Motion Offense', 100);

// Assert baseline ranges
const checkRange = (val: number, min: number, max: number, label: string) => {
  if (val < min || val > max) {
    errors.push(`FAIL: ${label} of ${val.toFixed(2)} is outside target range [${min}, ${max}]`);
  } else {
    console.log(`  [PASS] ${label}: ${val.toFixed(2)} (Target: [${min}, ${max}])`);
  }
};

checkRange(baseline.avgUserScore, 95, 130, "User Score");
checkRange(baseline.avgAiScore, 95, 130, "AI Score");
checkRange(baseline.avgCombinedScore, 190, 260, "Combined Score");
checkRange(baseline.fgPct * 100, 42, 55, "FG%");
checkRange(baseline.threePtPct * 100, 30, 42, "3PT%");
checkRange(baseline.ftPct * 100, 68, 88, "FT%");
checkRange(baseline.avgFTA, 12, 35, "FTA per Team");
checkRange(baseline.avgTO, 8, 20, "Turnovers per Team");
checkRange(baseline.avgOREB, 6, 18, "Offensive Rebounds");
checkRange(baseline.avgREB, 35, 60, "Total Rebounds");
checkRange(baseline.avgFouls, 12, 28, "Fouls per Team");

if (baseline.avgStarterStamina < 15) {
  errors.push(`FAIL: Starter end stamina collapsed to ${baseline.avgStarterStamina.toFixed(1)}`);
} else {
  console.log(`  [PASS] Starter End Stamina: ${baseline.avgStarterStamina.toFixed(1)}`);
}

// 2. High-IQ vs Low-IQ Comparison (User IQ=130, AI IQ=50)
const highLowIQ = runValidationBatch('NORMAL', 'NORMAL', 'Motion Offense', 100, (user, ai) => {
  user.forEach(p => {
    p.basketballIQ = 130;
    p.specialSkillSlots = ["BROKEN_PLAY_RESCUE", "COMPOSURE_SHIELD"];
  });
  ai.forEach(p => {
    p.basketballIQ = 50;
    p.specialSkillSlots = ["BROKEN_PLAY_RESCUE", "COMPOSURE_SHIELD"];
  });
});

console.log(`  IQ check - High-IQ turnovers: ${highLowIQ.avgTO.toFixed(1)} vs AI Low-IQ turnovers: ${highLowIQ.avgAiTO.toFixed(1)}`);
if (highLowIQ.avgTO >= highLowIQ.avgAiTO) {
  errors.push(`FAIL: High-IQ team did not commit fewer turnovers than Low-IQ team (${highLowIQ.avgTO.toFixed(1)} >= ${highLowIQ.avgAiTO.toFixed(1)})`);
} else {
  console.log(`  [PASS] High-IQ team commits fewer turnovers than Low-IQ team.`);
}
if (highLowIQ.avgTO === 0) {
  errors.push("FAIL: High-IQ team has 0 turnovers (turnovers were erased entirely)");
} else {
  console.log(`  [PASS] High-IQ team has non-zero turnovers (${highLowIQ.avgTO.toFixed(1)}).`);
}

// 3. High-Hustle vs Low-Hustle Comparison (User Hustle=130, AI Hustle=50)
const highLowHustle = runValidationBatch('NORMAL', 'NORMAL', 'Motion Offense', 100, (user, ai) => {
  user.forEach(p => {
    p.hustle = 130;
    p.specialSkillSlots = ["GLASS_STRIKE", "MOMENTUM_SWING"];
  });
  ai.forEach(p => {
    p.hustle = 50;
    p.specialSkillSlots = ["GLASS_STRIKE", "MOMENTUM_SWING"];
  });
});

console.log(`  Hustle check - High-Hustle rebounds: ${highLowHustle.avgREB.toFixed(1)} vs AI Low-Hustle rebounds: ${highLowHustle.avgAiREB.toFixed(1)}`);
if (highLowHustle.avgREB <= highLowHustle.avgAiREB) {
  errors.push(`FAIL: High-Hustle team did not get more rebounds than Low-Hustle team (${highLowHustle.avgREB.toFixed(1)} <= ${highLowHustle.avgAiREB.toFixed(1)})`);
} else {
  console.log(`  [PASS] High-Hustle team gets more rebounds than Low-Hustle team.`);
}

// 4. Symmetry Check
const diffScore = Math.abs(baseline.avgUserScore - baseline.avgAiScore);
console.log(`  Symmetry check - Score difference in identical teams: ${diffScore.toFixed(1)}`);
if (diffScore > 6.0) {
  errors.push(`FAIL: Symmetry mismatch between identical teams (${diffScore.toFixed(1)} > 6.0)`);
} else {
  console.log(`  [PASS] User and AI remain symmetrical (diff within 6.0 pts).`);
}

// 5. Skill trigger bounds check
console.log(`  Skill check - Broken Play Rescues: ${(highLowIQ.avgBrokenPlayRescues).toFixed(2)} per game`);
console.log(`  Skill check - Momentum Swings: ${(highLowHustle.avgMomentumSwings).toFixed(2)} per game`);
if (highLowIQ.avgBrokenPlayRescues > 4.0) {
  errors.push(`FAIL: Broken Play Rescue triggers exceeded limits (${highLowIQ.avgBrokenPlayRescues.toFixed(2)} > 4.0)`);
} else {
  console.log(`  [PASS] Broken Play Rescue triggers are within limits.`);
}

if (highLowHustle.avgMomentumSwings > 8.0) {
  errors.push(`FAIL: Momentum Swing triggers exceeded limits (${highLowHustle.avgMomentumSwings.toFixed(2)} > 8.0)`);
} else {
  console.log(`  [PASS] Momentum Swing triggers are within limits.`);
}

if (errors.length > 0) {
  console.error("\nValidation failed with errors:");
  errors.forEach(e => console.error(e));
  process.exit(1);
} else {
  console.log("\nAll match realism calibration checks PASSED successfully!");
  process.exit(0);
}
