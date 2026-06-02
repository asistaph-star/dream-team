import { assignBaseSkillsFromStats } from '../lib/skills/assignBaseSkills';
import playersUpdate from '../lib/data/players_update.json';
import { Player } from '../lib/types/player';

const targets = [
  "Naz Reid",
  "Alex Caruso",
  "T.J. McConnell",
  "Sam Hauser",
  "Payton Pritchard",
  "Kentavious Caldwell-Pope",
  "Isaiah Hartenstein"
];

for (const target of targets) {
  const key = target.toLowerCase().replace(/[^a-z]/g, '');
  const data = (playersUpdate as any)[key];
  if (!data) {
    console.log(`Could not find ${target} in players_update.json`);
    continue;
  }
  
  const stats = data.currentSeasonStats;
  const p: any = {
    id: key,
    name: target,
    position: "Bench", // generic
    ovr: data.ovr,
    offense: data.ovr,
    defense: data.ovr,
    shooting: data.ovr,
    speed: data.ovr,
    strength: data.ovr,
    playmaking: data.ovr,
    rebound: data.ovr,
    assist: data.ovr,
    finishing: data.ovr,
    steal: data.ovr,
    block: data.ovr,
    onBall: data.ovr,
    ppg: stats?.pointsPerGame || 0,
    rpg: stats?.reboundsPerGame || 0,
    apg: stats?.assistsPerGame || 0,
    spg: stats?.stealsPerGame || 0,
    bpg: stats?.blocksPerGame || 0,
    topg: stats?.turnoversPerGame || 0,
    pfpg: stats?.foulsPerGame || 0,
    currentSeasonStats: stats
  };

  const [red, blue, green] = assignBaseSkillsFromStats(p as Player);
  
  console.log(`\n--- ${target} ---`);
  console.log(`PPG: ${p.ppg}, RPG: ${p.rpg}, APG: ${p.apg}, SPG: ${p.spg}, BPG: ${p.bpg}`);
  console.log(`Stats used: 3PA=${stats?.threeAttemptedPerGame}, 3P%=${stats?.threePct}, FTA (calc/raw)=${stats?.freeThrowsAttemptedPerGame || (stats?.ftPct ? (p.ppg! - (2*(stats.fieldGoalsMadePerGame||0) + (stats.threeMadePerGame||0))) / (stats.ftPct / 100) : "N/A")}, OREB%=${stats?.offensiveReboundPct}, PIP=${stats?.paintPointsPerGame}`);
  console.log(`Assigned Base Skills: [${red}, ${blue}, ${green}]`);
}
