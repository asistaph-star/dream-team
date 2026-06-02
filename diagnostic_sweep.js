const fs = require('fs');
const { execSync } = require('child_process');

const matchEnginePath = './src/lib/utils/matchEngine.ts';
const originalContent = fs.readFileSync(matchEnginePath, 'utf8');

// We will inject logging into the AI main path right after `isSuccess` is calculated.
// Around line 2642: const isSuccess = Math.random() < aiFinalChance;
let newContent = originalContent;

const logCode = `
          if (is3PT && global.__diagnostic3ptLogs) {
            global.__diagnostic3ptLogs.push({
              shooterName: scorer.name,
              shooterRating: scorer.shooting || scorer.ovr,
              defenderName: primaryDefender?.name || 'None',
              defenderRating: primaryDefender?.defense || 0,
              shotType: shotType,
              is3PT: is3PT,
              baseChance: finalChance, // baseChance * aiTeamFatigueContext
              staminaModifier: aiScorerStamMod,
              formModifier: newFormRating[scorer.id],
              clutchModifier: aiClutchMod,
              decisionWeightMod: 1.0, // AI main path doesn't have decisionWeightMod
              homeCourtAdj: aiHomeAdj,
              matchupAdj: matchupAdj,
              skillShotBonus: aiSkillShotBonus,
              realEfficiencyAdj: aiRealEfficiencyAdj,
              shotValueDifficulty: aiShotValueDifficulty,
              additiveBonusSum: aiAdditiveBonusSum,
              cappedAdditiveBonus: aiCappedAdditiveBonus,
              finalScoringChance: aiFinalChance,
              make: isSuccess
            });
          }
`;

newContent = newContent.replace('const isSuccess = Math.random() < aiFinalChance;', 'const isSuccess = Math.random() < aiFinalChance;' + logCode);

fs.writeFileSync(matchEnginePath, newContent);
console.log('Injected logging into matchEngine.ts');

try {
  const output = execSync('npx tsx run_diagnostic.ts', { encoding: 'utf8', stdio: 'pipe' });
  console.log(output);
} catch (e) {
  console.error('Error running diagnostic:', e.message);
} finally {
  fs.writeFileSync(matchEnginePath, originalContent);
  console.log('Restored matchEngine.ts');
}
