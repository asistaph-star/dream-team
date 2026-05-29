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
  | "Composure X";

const safeRatio = (a = 0, b = 0): number => a / Math.max(0.5, b);

export function assignBaseSkillsFromStats(player: Player): [BaseSkillName, BaseSkillName, BaseSkillName] {
  const ppg = player.ppg ?? player.offense / 3;
  const rpg = player.rpg ?? player.strength / 10;
  const apg = player.apg ?? player.playmaking / 15;
  const spg = player.spg ?? Math.max(0, (player.speed + player.defense - 125) / 65);
  const bpg = player.bpg ?? Math.max(0, (player.strength + player.defense - 135) / 55);
  const pfpg = player.pfpg ?? (player.defense >= 80 ? 2.0 : 2.8);
  const topg = player.topg ?? Math.max(1.0, ppg / Math.max(8, player.playmaking / 8));
  const astTo = safeRatio(apg, topg);
  const red = (() => {
    if (apg >= 5.5 && astTo >= 1.7) return "Tempo Surgeon";
    if (player.shooting >= 86 && ppg >= 18) return "Arc Pressure";
    if (pfpg >= 2.6 && ppg >= 18) return "Foul Magnet";
    if (ppg >= 22 && (player.speed >= 86 || player.strength >= 82)) return "Mismatch Caller";
    if (ppg >= 18 && player.strength >= 84) return "Power Driver";
    if (rpg >= 8 || player.strength >= 84) return "Paint Magnet";
    return "Glass Touch";
  })();

  const blue = (() => {
    if ((player.defense >= 82 || player.defense >= 160) && rpg >= 8) return "Paint Barrier";
    if (bpg >= 1.2 || player.defense >= 175 || (player.defense >= 82 && player.strength >= 78)) return "Rim Warden";
    if (spg >= 1.2 || player.speed >= 86) return "Hands Active";
    if ((player.defense >= 150 || player.defense >= 78) && player.playmaking >= 78) return "Screen Breaker";
    if ((player.defense >= 80 || player.defense >= 155) && player.shooting >= 78) return "Focus Lock";
    if ((player.defense >= 145 || player.defense >= 78) && pfpg <= 2.2) return "Discipline Wall";
    return "Shadow Guard";
  })();

  const green = (() => {
    const allAround =
      player.ovr >= 85 &&
      (player.offense >= 160 || player.offense >= 84) &&
      (player.defense >= 145 || player.defense >= 78) &&
      player.playmaking >= 78;
    if (allAround) return "Complete Engine";
    if (player.position.includes("/") || player.speed >= 84 && player.strength >= 78) return "Position Flex";
    if (player.ovr < 85 && ppg >= 16 && player.playmaking >= 72) return "Future Core";
    if (rpg >= 7.5 || player.stamina === 100) return "Iron Motor";
    if (apg >= 3.5 && astTo >= 1.5) return "Connector Hub";
    if (apg >= 3.0) return "Share Rhythm";
    if (pfpg >= 2.4 && player.defense >= 76) return "Enforcer Lift";
    return "Tempo Switch";
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
