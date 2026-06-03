import { Player } from "../types/player";

export type BaseSkillName =
  | "Tempo Surgeon"
  | "Paint Magnet"
  | "Arc Pressure"
  | "Mismatch Caller"
  | "Glass Touch"
  | "Foul Magnet"
  | "Power Driver"
  | "Rim Warden"
  | "Screen Breaker"
  | "Shadow Guard"
  | "Hands Active"
  | "Discipline Wall"
  | "Paint Barrier"
  | "Focus Lock"
  | "Complete Engine"
  | "Iron Motor"
  | "Connector Hub"
  | "Tempo Switch"
  | "Position Flex"
  | "Future Core"
  | "Share Rhythm"
  | "Enforcer Lift";

export type SpecialSkillName =
  | "Red Dot X"
  | "Four-Point Bait X"
  | "Lung Burner X"
  | "Chain Pass X"
  | "Debt Collector X"
  | "Five-Man Squeeze X"
  | "Cold Timeout X"
  | "Dead Air X"
  | "Clean Contest X"
  | "Contact Tax X"
  | "Cage Step X"
  | "Corner Trap X"
  | "Pressure Coach X"
  | "Flop X"
  | "Composure X"
  | "CLEAN_CHALLENGE"
  | "COMPOSURE_SHIELD"
  | "TIMEOUT_RESET"
  | "COURT_VISION_ENGINE"
  | "BENCH_CAPTAIN"
  | "LOCK_CHAIN"
  | "SKY_WALL"
  | "DEFENSIVE_ANCHOR";

const safeRatio = (a = 0, b = 0): number => a / Math.max(0.5, b);

export function assignBaseSkillsFromStats(player: Player): [BaseSkillName, BaseSkillName, BaseSkillName] {
  const stats = player.currentSeasonStats;
  const ppg = player.ppg ?? player.offense / 3;
  const rpg = player.rpg ?? player.strength / 10;
  const apg = player.apg ?? player.playmaking / 15;
  const spg = player.spg ?? Math.max(0, (player.speed + player.defense - 125) / 65);
  const bpg = player.bpg ?? Math.max(0, (player.strength + player.defense - 135) / 55);
  const pfpg = player.pfpg ?? (player.defense >= 80 ? 2.0 : 2.8);
  const topg = player.topg ?? Math.max(1.0, ppg / Math.max(8, player.playmaking / 8));
  const astTo = safeRatio(apg, topg);

  // Extract detailed seasonal identity
  // We calculate FTA from FGM/3PM if possible, otherwise 0 to prevent fake thresholds.
  const fta = stats?.freeThrowsAttemptedPerGame ?? (stats?.ftPct ? (ppg - (2 * (stats.fieldGoalsMadePerGame ?? 0) + (stats.threeMadePerGame ?? 0))) / (stats.ftPct / 100) : 0);
  const threePA = stats?.threeAttemptedPerGame ?? 0;
  const threePct = stats?.threePct ?? 0;
  const orebPct = stats?.offensiveReboundPct ?? 0;
  const pip = stats?.paintPointsPerGame ?? 0;

  const red = (() => {
    const candidates: { skill: BaseSkillName; score: number }[] = [];
    if (threePA >= 5.0 && threePct >= 36.0) candidates.push({ skill: "Arc Pressure", score: (threePA / 7.5) * 10 });
    if (apg >= 5.5 && astTo >= 1.7) candidates.push({ skill: "Tempo Surgeon", score: (apg / 7.5) * 10 });
    if (fta >= 5.0) candidates.push({ skill: "Foul Magnet", score: (fta / 6.5) * 10 });
    if (pip >= 10.0 || (stats?.twoPct && stats.twoPct >= 55.0 && stats.twoAttemptedPerGame && stats.twoAttemptedPerGame >= 8.0)) {
      const paintScore = pip > 0 ? (pip / 12.0) : (stats?.twoAttemptedPerGame ?? 0) / 12.0;
      candidates.push({ skill: "Paint Magnet", score: paintScore * 10 });
    }
    if (ppg >= 22 && (player.speed >= 86 || player.strength >= 82)) candidates.push({ skill: "Mismatch Caller", score: (ppg / 28.0) * 10 });
    if (ppg >= 18 && player.strength >= 84) candidates.push({ skill: "Power Driver", score: (ppg / 28.0) * 10 });
    if (orebPct >= 8.0 || (stats?.secondChancePointsPerGame && stats.secondChancePointsPerGame >= 3.0)) {
      candidates.push({ skill: "Glass Touch", score: orebPct >= 8.0 ? (orebPct / 12.0) * 10 : ((stats?.secondChancePointsPerGame ?? 0) / 4.0) * 10 });
    }

    if (candidates.length > 0) return candidates.sort((a, b) => b.score - a.score)[0].skill;

    // Fallback logic based on highest identity attribute
    return [
      { skill: "Arc Pressure" as BaseSkillName, score: player.threePt ?? 0 },
      { skill: "Power Driver" as BaseSkillName, score: player.finishing ?? 0 },
      { skill: "Glass Touch" as BaseSkillName, score: player.rebound ?? 0 },
      { skill: "Tempo Surgeon" as BaseSkillName, score: player.assist ?? 0 }
    ].sort((a, b) => b.score - a.score)[0].skill;
  })();

  const blue = (() => {
    const candidates: { skill: BaseSkillName; score: number }[] = [];
    if ((player.defense >= 82 || player.defense >= 160) && rpg >= 8) candidates.push({ skill: "Paint Barrier", score: (rpg / 10.0) * 10 });
    if (bpg >= 1.2 || player.defense >= 175 || (player.defense >= 82 && player.strength >= 78)) candidates.push({ skill: "Rim Warden", score: (bpg / 2.0) * 10 });
    if (spg >= 1.2 || player.speed >= 86) candidates.push({ skill: "Hands Active", score: (spg / 1.8) * 10 });
    if ((player.defense >= 150 || player.defense >= 78) && player.playmaking >= 78) candidates.push({ skill: "Screen Breaker", score: (player.defense / 180) * 10 });
    if ((player.defense >= 80 || player.defense >= 155) && player.shooting >= 78) candidates.push({ skill: "Focus Lock", score: (player.defense / 180) * 10 });
    if ((player.defense >= 145 || player.defense >= 78) && pfpg <= 2.2) candidates.push({ skill: "Discipline Wall", score: ((4.0 - pfpg) / 2.0) * 10 });
    
    if (candidates.length > 0) return candidates.sort((a, b) => b.score - a.score)[0].skill;

    return [
      { skill: "Hands Active" as BaseSkillName, score: player.steal ?? 0 },
      { skill: "Rim Warden" as BaseSkillName, score: player.block ?? 0 },
      { skill: "Focus Lock" as BaseSkillName, score: player.onBall ?? 0 },
      { skill: "Shadow Guard" as BaseSkillName, score: player.defense ?? 0 }
    ].sort((a, b) => b.score - a.score)[0].skill;
  })();

  const green = (() => {
    const candidates: { skill: BaseSkillName; score: number }[] = [];
    const allAround =
      player.ovr >= 85 &&
      (player.offense >= 160 || player.offense >= 84) &&
      (player.defense >= 145 || player.defense >= 78) &&
      player.playmaking >= 78;
    if (allAround) candidates.push({ skill: "Complete Engine", score: (player.ovr / 90) * 10 });
    if (player.position.includes("/") || player.speed >= 84 && player.strength >= 78) candidates.push({ skill: "Position Flex", score: ((player.speed + player.strength) / 180) * 10 });
    if (player.ovr < 85 && ppg >= 16 && player.playmaking >= 72) candidates.push({ skill: "Future Core", score: (ppg / 20.0) * 10 });
    if (rpg >= 7.5 || player.stamina === 100) candidates.push({ skill: "Iron Motor", score: (rpg / 10.0) * 10 });
    if (apg >= 3.5 && astTo >= 1.5) candidates.push({ skill: "Connector Hub", score: (apg / 7.0) * 10 });
    if (apg >= 3.0) candidates.push({ skill: "Share Rhythm", score: (apg / 6.0) * 10 });
    if (pfpg >= 2.4 && player.defense >= 76) candidates.push({ skill: "Enforcer Lift", score: (pfpg / 3.5) * 10 });
    
    if (candidates.length > 0) return candidates.sort((a, b) => b.score - a.score)[0].skill;

    return [
      { skill: "Connector Hub" as BaseSkillName, score: player.assist ?? 0 },
      { skill: "Iron Motor" as BaseSkillName, score: player.rebound ?? 0 },
      { skill: "Tempo Switch" as BaseSkillName, score: player.speed ?? 0 }
    ].sort((a, b) => b.score - a.score)[0].skill;
  })();

  return [red, blue, green];
}

export function assignSpecialSkillsFromStats(player: Player): (SpecialSkillName | null)[] {
  const ppg = player.ppg ?? player.offense / 3;
  const apg = player.apg ?? player.playmaking / 15;
  const spg = player.spg ?? Math.max(0, (player.speed + player.defense - 125) / 65);
  const bpg = player.bpg ?? Math.max(0, (player.strength + player.defense - 135) / 55);
  const pfpg = player.pfpg ?? (player.defense >= 80 ? 2.0 : 2.8);
  const skills: SpecialSkillName[] = [];
  const addSkill = (skill: SpecialSkillName) => {
    if (!skills.includes(skill)) skills.push(skill);
  };
  if (player.name.toLowerCase().includes("shai gilgeous-alexander")) addSkill("Flop X");
  if (player.shooting >= 86 && ppg >= 18) addSkill("Red Dot X");
  if (player.shooting >= 92 && ppg >= 24) addSkill("Four-Point Bait X");
  if (player.strength >= 84 && ppg >= 18) addSkill("Lung Burner X");
  if (apg >= 5.5) addSkill("Chain Pass X");
  if (spg >= 1.2 || bpg >= 1.2) addSkill("Debt Collector X");
  if (player.defense >= 175 || player.defense >= 84) addSkill("Five-Man Squeeze X");
  if (player.ovr >= 88 && player.playmaking >= 75) addSkill("Cold Timeout X");
  if (player.defense >= 160 && player.playmaking >= 75) addSkill("Dead Air X");
  if ((player.defense >= 150 || player.defense >= 78) && pfpg <= 2.2) addSkill("Clean Contest X");
  if (player.strength >= 82 && ppg >= 18) addSkill("Contact Tax X");
  if (spg >= 1.2 || player.speed >= 86) addSkill("Cage Step X");
  if ((player.defense >= 80 || player.defense >= 150) && player.speed >= 78) addSkill("Corner Trap X");
  if (player.ovr >= 86 && player.playmaking >= 72) addSkill("Pressure Coach X");
  if (pfpg >= 2.4 || ppg >= 22) addSkill("Flop X");
  if (pfpg <= 2.0 && player.defense >= 78) addSkill("Composure X");

  return [skills[0] ?? null, skills[1] ?? null];
}
