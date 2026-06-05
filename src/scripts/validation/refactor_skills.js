import fs from 'fs';
import path from 'path';

function replaceInFile(filePath, searchRegex, replacement) {
  const content = fs.readFileSync(filePath, 'utf8');
  const updatedContent = content.replace(searchRegex, replacement);
  if (content !== updatedContent) {
    fs.writeFileSync(filePath, updatedContent);
    console.log(`Updated ${filePath}`);
  }
}

// 1. Update matchEngine.ts
const matchEnginePath = path.resolve('src/lib/utils/matchEngine.ts');
replaceInFile(matchEnginePath, 
  /import \{ hasSpecialSkillMechanic, SpecialSkillMechanicId \} from "\.\.\/skills\/skillMechanics";/,
  `import { SpecialSkillMechanicId } from "../skills/skillMechanics";\nimport { hasSpecialSkillMechanic } from "../skills/skillResolver";`
);

// 2. Update matchHelpers.ts
const matchHelpersPath = path.resolve('src/lib/match/matchHelpers.ts');
replaceInFile(matchHelpersPath,
  /import \{ hasSpecialSkillMechanic \} from "\.\.\/skills\/skillMechanics";/,
  `import { hasSpecialSkillMechanic } from "../skills/skillResolver";`
);

// 3. Update test_four_point_bait_hybrid_regression.ts
const testFourPointPath = path.resolve('src/scripts/validation/test_four_point_bait_hybrid_regression.ts');
replaceInFile(testFourPointPath,
  /const \{ hasSpecialSkillMechanic \} = require\("\.\.\/\.\.\/lib\/skills\/skillMechanics"\);/,
  `const { hasSpecialSkillMechanic } = require("../../lib/skills/skillResolver");`
);

// 4. Update test_playmaking_regression.ts
const testPlaymakingPath = path.resolve('src/scripts/validation/test_playmaking_regression.ts');
replaceInFile(testPlaymakingPath,
  /import \{ getSpecialSkillsForMechanic \} from "\.\.\/\.\.\/lib\/skills\/skillMechanics";/,
  `import { getSpecialSkillsForMechanic } from "../../lib/skills/skillResolver";`
);

// 5. Update skillMechanics.ts
const skillMechanicsPath = path.resolve('src/lib/skills/skillMechanics.ts');
let smContent = fs.readFileSync(skillMechanicsPath, 'utf8');
smContent = smContent.replace(/export const hasSpecialSkillMechanic = [\s\S]*?export const getSpecialSkillsForMechanic = [\s\S]*?};\n/m, '');
// just replace from `export const hasSpecialSkillMechanic` to the end
smContent = smContent.substring(0, smContent.indexOf('export const hasSpecialSkillMechanic ='));
fs.writeFileSync(skillMechanicsPath, smContent);
console.log(`Updated ${skillMechanicsPath}`);

// 6. Update skillResolver.ts
const skillResolverPath = path.resolve('src/lib/skills/skillResolver.ts');
let srContent = fs.readFileSync(skillResolverPath, 'utf8');
srContent = srContent.replace(
  /import \{ SpecialSkillMechanicId, getSpecialSkillsForMechanic \} from "\.\/skillMechanics";/,
  `import { SpecialSkillMechanicId, resolveSpecialSkillMechanics, doesSkillMatchMechanic } from "./skillMechanics";`
);

const newFunctions = `
export const hasSpecialSkillMechanic = (player: Player, mechanicId: SpecialSkillMechanicId): boolean => {
  const skills = getSpecialSkills(player);
  return skills.some(skill => {
    if (!skill) return false;
    return doesSkillMatchMechanic(skill, mechanicId);
  });
};

export const getPlayerSpecialSkillMechanics = (player: Player): SpecialSkillMechanicId[] => {
  const skills = getSpecialSkills(player);
  const allMechanics: SpecialSkillMechanicId[] = [];
  
  for (const skill of skills) {
    if (skill) {
      const mechanics = resolveSpecialSkillMechanics(skill);
      allMechanics.push(...mechanics);
    }
  }
  
  return Array.from(new Set(allMechanics));
};

export const getSpecialSkillsForMechanic = (player: Player, mechanicId: SpecialSkillMechanicId): string[] => {
  const skills = getSpecialSkills(player);
  return skills.filter((skill): skill is string => !!skill && doesSkillMatchMechanic(skill, mechanicId));
};
`;

srContent += newFunctions;
fs.writeFileSync(skillResolverPath, srContent);
console.log(`Updated ${skillResolverPath}`);
