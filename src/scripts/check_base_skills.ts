import { mockPlayers } from '../lib/data/mockPlayers';
import { assignBaseSkillsFromStats } from '../lib/skills/assignBaseSkills';
import playersUpdate from '../lib/data/players_update.json';
import { Player } from '../lib/types/player';

const targets = [
  "Nikola Jokic",
  "Stephen Curry",
  "Shai Gilgeous-Alexander",
  "Victor Wembanyama",
  "Rudy Gobert",
  "Josh Hart",
  "Giannis Antetokounmpo",
  "Luka Doncic",
  "Jayson Tatum",
  "Joel Embiid",
  // Role players
  "Naz Reid",
  "Alex Caruso",
  "T.J. McConnell",
  "Sam Hauser",
  "Payton Pritchard",
  "Kentavious Caldwell-Pope",
  "Isaiah Hartenstein"
];

const redCounts: Record<string, number> = {};
const blueCounts: Record<string, number> = {};
const greenCounts: Record<string, number> = {};
const positionCounts: Record<string, Record<string, Record<string, number>>> = {
  PG: { Red: {}, Blue: {}, Green: {} },
  SG: { Red: {}, Blue: {}, Green: {} },
  SF: { Red: {}, Blue: {}, Green: {} },
  PF: { Red: {}, Blue: {}, Green: {} },
  C: { Red: {}, Blue: {} , Green: {} },
};

let totalPlayers = 0;

for (const p of mockPlayers) {
  const target = p.name;
  
  const updateData = Object.values(playersUpdate).find((u: any) => 
    u.currentSeasonStats?.sourceUrl && 
    p.name.toLowerCase().replace(/[^a-z]/g, '') === u.currentSeasonStats.sourceUrl.split('/').pop() || 
    (u.currentSeasonStats && target.toLowerCase().replace(/[^a-z]/g, '') === u.currentSeasonStats.seasonType)
  ) || Object.values(playersUpdate).find((u: any) => u.currentSeasonStats && target.toLowerCase().replace(/[^a-z]/g, '') === target.toLowerCase().replace(/[^a-z]/g, ''));
  
  let rawStats = p.currentSeasonStats;
  if (!rawStats) {
    const key = target.toLowerCase().replace(/[^a-z]/g, '');
    const data = (playersUpdate as any)[key];
    if (data) rawStats = data.currentSeasonStats;
  }
  if (rawStats) {
    p.currentSeasonStats = rawStats;
  }

  const [red, blue, green] = assignBaseSkillsFromStats(p);
  
  redCounts[red] = (redCounts[red] || 0) + 1;
  blueCounts[blue] = (blueCounts[blue] || 0) + 1;
  greenCounts[green] = (greenCounts[green] || 0) + 1;
  
  const pos = p.position.split('/')[0] || 'Unknown';
  if (positionCounts[pos]) {
    positionCounts[pos].Red[red] = (positionCounts[pos].Red[red] || 0) + 1;
    positionCounts[pos].Blue[blue] = (positionCounts[pos].Blue[blue] || 0) + 1;
    positionCounts[pos].Green[green] = (positionCounts[pos].Green[green] || 0) + 1;
  }
  
  totalPlayers++;

  if (targets.includes(target)) {
    console.log(`\n--- ${target} (${p.position}) OVR: ${p.ovr} ---`);
    console.log(`PPG: ${p.ppg}, RPG: ${p.rpg}, APG: ${p.apg}, SPG: ${p.spg}, BPG: ${p.bpg}`);
    console.log(`Stats used: 3PA=${p.currentSeasonStats?.threeAttemptedPerGame}, 3P%=${p.currentSeasonStats?.threePct}, FTA (calc/raw)=${p.currentSeasonStats?.freeThrowsAttemptedPerGame || (p.currentSeasonStats?.ftPct ? (p.ppg! - (2*(p.currentSeasonStats.fieldGoalsMadePerGame||0) + (p.currentSeasonStats.threeMadePerGame||0))) / (p.currentSeasonStats.ftPct / 100) : "N/A")}, OREB%=${p.currentSeasonStats?.offensiveReboundPct}, PIP=${p.currentSeasonStats?.paintPointsPerGame}`);
    console.log(`Assigned Base Skills: [${red}, ${blue}, ${green}]`);
  }
}

console.log("\n=========================");
console.log(`TOTAL PLAYERS ANALYZED: ${totalPlayers}`);
console.log("=========================\n");

console.log("--- RED SKILL DISTRIBUTION ---");
Object.entries(redCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`${k}: ${v} (${((v/totalPlayers)*100).toFixed(1)}%)`));

console.log("\n--- BLUE SKILL DISTRIBUTION ---");
Object.entries(blueCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`${k}: ${v} (${((v/totalPlayers)*100).toFixed(1)}%)`));

console.log("\n--- GREEN SKILL DISTRIBUTION ---");
Object.entries(greenCounts).sort((a,b) => b[1] - a[1]).forEach(([k,v]) => console.log(`${k}: ${v} (${((v/totalPlayers)*100).toFixed(1)}%)`));

console.log("\n--- POSITION DISTRIBUTION ---");
for (const [pos, d] of Object.entries(positionCounts)) {
  console.log(`\n[${pos}]`);
  console.log(" Red: " + Object.entries(d.Red).sort((a,b) => b[1] - a[1]).map(x => `${x[0]}(${x[1]})`).join(", "));
  console.log(" Blue: " + Object.entries(d.Blue).sort((a,b) => b[1] - a[1]).map(x => `${x[0]}(${x[1]})`).join(", "));
  console.log(" Green: " + Object.entries(d.Green).sort((a,b) => b[1] - a[1]).map(x => `${x[0]}(${x[1]})`).join(", "));
}
