const fs = require('fs');
const { execSync } = require('child_process');

const matchEnginePath = './src/lib/utils/matchEngine.ts';
const originalContent = fs.readFileSync(matchEnginePath, 'utf8');

const variants = [
  { name: 'Variant A', cap: '0.06', diff: '-0.095' },
  { name: 'Variant B', cap: '0.04', diff: '-0.095' },
  { name: 'Variant C', cap: '0.02', diff: '-0.095' },
  { name: 'Variant D', cap: '0.04', diff: '-0.115' },
];

for (const variant of variants) {
  let newContent = originalContent;
  
  // Replace CAP
  newContent = newContent.replace(/const MAX_3PT_POSITIVE_ADDITIVE_BONUS = [\d.-]+;/, `const MAX_3PT_POSITIVE_ADDITIVE_BONUS = ${variant.cap};`);
  
  // Replace Difficulty (all 3 occurrences)
  newContent = newContent.replace(/const shotValueDifficulty = is3PT \? [\d.-]+ : 0;/g, `const shotValueDifficulty = is3PT ? ${variant.diff} : 0;`);
  newContent = newContent.replace(/const aiBlitzShotValueDifficulty = is3PT \? [\d.-]+ : 0;/g, `const aiBlitzShotValueDifficulty = is3PT ? ${variant.diff} : 0;`);
  newContent = newContent.replace(/const aiShotValueDifficulty = is3PT \? [\d.-]+ : 0;/g, `const aiShotValueDifficulty = is3PT ? ${variant.diff} : 0;`);
  
  fs.writeFileSync(matchEnginePath, newContent);
  
  console.log(`\n======================================================`);
  console.log(`RUNNING ${variant.name} (Cap: ${variant.cap}, Diff: ${variant.diff})`);
  console.log(`======================================================\n`);
  
  try {
    const output = execSync('npx tsx sim_scoring_audit.ts', { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
  } catch (e) {
    console.error(`Error running ${variant.name}:`, e.message);
  }
}

// Restore original
fs.writeFileSync(matchEnginePath, originalContent);
console.log('Restored original matchEngine.ts');
