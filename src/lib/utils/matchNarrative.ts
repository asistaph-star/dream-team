import { Player } from "../types/player";
import { MatchState, formatClock, MatchEvent } from "./matchTypes";

const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
const eid = () => Date.now().toString() + '_' + Math.random().toString(36).slice(2);

export function makeEvent(q: number, clock: number, text: string, isUser: boolean, pts: number = 0, pid?: string): MatchEvent {
  return { id: eid(), time: `Q${q} ${formatClock(clock)}`, text, isUserTeam: isUser, pointsScored: pts, activePlayerId: pid };
}

import { ShotType, isThreePointer } from "./shotEngine";

// Scoring narratives (Professional, clean sports style)
export function scoreText(scorer: Player, shot: ShotType, strategy: string, momentumActive: boolean): string {
  const fire = momentumActive ? " [MOMENTUM]" : "";
  const pts = isThreePointer(shot) ? 3 : 2;
  
  if (pts === 3) {
    if (shot === 'stepBackThree') return `${scorer.name} connects on a step-back three (+3)${fire}`;
    if (shot === 'pullUpThree') return `${scorer.name} pulls up from deep and drills it (+3)${fire}`;
    if (shot === 'cornerThree') return `${scorer.name} finds space in the corner for three (+3)${fire}`;
    if (shot === 'catchAndShoot') return `${scorer.name} catch and shoot from downtown (+3)${fire}`;
    return `${scorer.name} hits from deep (+3)${fire}`;
  }
  
  if (shot === 'dunk') return `${scorer.name} rises up and throws it down (+2)${fire}`;
  if (shot === 'euroStep') return `${scorer.name} with a clean euro-step finish (+2)${fire}`;
  if (shot === 'floater') return `${scorer.name} drops in the soft floater (+2)${fire}`;
  if (shot === 'fadeaway') return `${scorer.name} hits the tough fadeaway (+2)${fire}`;
  if (shot === 'hookShot') return `${scorer.name} with the classic hook shot (+2)${fire}`;
  if (shot === 'powerLayup') return `${scorer.name} bullies their way for the power layup (+2)${fire}`;
  if (shot === 'putBack') return `${scorer.name} cleans up the glass for the put-back (+2)${fire}`;
  if (shot === 'pullUpMid') return `${scorer.name} stops and pops from mid-range (+2)${fire}`;
  
  return `${scorer.name} gets the bucket (+2)${fire}`;
}

export function clutchScoreText(player: Player, shot: ShotType, situation: { intensity: string, active: boolean }): string {
  const pfx = situation.intensity === 'high' ? "CLUTCH: " : "";
  const pts = isThreePointer(shot) ? 3 : 2;
  const r = player.rarity;
  
  if (r === 'Mythic' || r === 'Legendary') {
    return Math.random() < 0.5
      ? `${pfx}${player.name} ICE COLD: clutch ${pts}-pointer!`
      : `${pfx}${player.name} is built for this moment: MONEY!`;
  }
  if (r === 'Epic') return `${pfx}${player.name} steps up BIG: ${pts}-pointer!`;
  return `${pfx}${player.name} hits the huge shot!`;
}

export function missText(scorer: Player, shot: ShotType, strategy: string): string {
  const misses: Record<string, string[]> = {
    stepBackThree: [
      `${scorer.name} steps back from deep, but it rattles out`,
      `${scorer.name} tries the step-back three... no good`,
      `${scorer.name} pulls the step-back from beyond the arc... misses`
    ],
    pullUpThree: [
      `${scorer.name} pulls up in transition, but misses the mark`,
      `${scorer.name} stops and fires from three... off the back iron`,
      `${scorer.name} takes a quick pull-up three... no luck`
    ],
    cornerThree: [
      `${scorer.name} gets the feed in the corner... short`,
      `${scorer.name} fires a corner three... bounces off the rim`,
      `${scorer.name} catches in the corner, releases... off-target`
    ],
    catchAndShoot: [
      `${scorer.name} catches and fires instantly... missed`,
      `${scorer.name} gets a clean look, catches and shoots... doesn't go`,
      `${scorer.name} with a quick catch and shoot opportunity... off the front rim`
    ],
    dunk: [
      `${scorer.name} goes up high but clangs the dunk off the back of the rim`,
      `${scorer.name} tries to throw it down, but misses the dunk`,
      `${scorer.name} rises up for the hammer and gets rejected by the rim`
    ],
    euroStep: [
      `${scorer.name} drives, uses the euro-step, but the finger roll rolls off`,
      `${scorer.name} slices inside with a euro-step... but can't finish the scoop`,
      `${scorer.name} wiggles through the defense, euro-steps... but the layup misses`
    ],
    floater: [
      `${scorer.name} floats a soft tear-drop... too strong`,
      `${scorer.name} gets in the lane, launches the floater... off the backboard and out`,
      `${scorer.name} drives, launches a high floater... rimmed out`
    ],
    fadeaway: [
      `${scorer.name} fades away over the defender... misses`,
      `${scorer.name} backs down, turns, fades... hits nothing but iron`,
      `${scorer.name} attempts the difficult fadeaway jumper... no good`
    ],
    hookShot: [
      `${scorer.name} hooks it over the defender... just a bit too strong`,
      `${scorer.name} tries the sweeping hook... doesn't drop`,
      `${scorer.name} spins into the lane for a hook shot... no good`
    ],
    powerLayup: [
      `${scorer.name} muscles inside for a power layup... but can't get the bounce`,
      `${scorer.name} initiates contact, goes up strong... missed the layin`,
      `${scorer.name} tries to bully their way to the hoop, but misses the power finish`
    ],
    putBack: [
      `${scorer.name} grabs the offensive board, tries the put-back... missed it`,
      `${scorer.name} leaps for the tip-in... bounces off`,
      `${scorer.name} works hard on the glass, tries a quick put-back... can't convert`
    ],
    pullUpMid: [
      `${scorer.name} stops and pops from mid-range... off-target`,
      `${scorer.name} pulls up from the elbow... misses the jumper`,
      `${scorer.name} steps into a mid-range jumper... short`
    ],
    stepBackMid: [
      `${scorer.name} tries a slick step-back mid-range... no good`,
      `${scorer.name} steps back from the mid-post, releases... off the iron`,
      `${scorer.name} uses the step-back space-creator... but misses the jumper`
    ],
    fingerRoll: [
      `${scorer.name} drives past the defender, tries the finger roll... rolls out`,
      `${scorer.name} glides to the basket for a finger roll... too long`,
      `${scorer.name} attempts the smooth finger roll... bounces off the rim`
    ],
    drivingLayup: [
      `${scorer.name} drives hard to the cup... misses the contested layup`,
      `${scorer.name} slices through the defense, goes up for the layup... no good`,
      `${scorer.name} attacks the rim, tries the layin... fails to convert`
    ],
    bankShot: [
      `${scorer.name} tries to use the glass... but it misses the window`,
      `${scorer.name} takes the angled bank shot... too hard off the board`,
      `${scorer.name} launches the bank shot... no good`
    ]
  };

  const pool = misses[shot] || [
    `${scorer.name} misses the shot`,
    `${scorer.name}'s shot is off-target`,
    `${scorer.name} fails to convert`
  ];

  return pick(pool);
}

export function clutchMissText(player: Player, situation: { intensity: string, active: boolean }): string {
  const pfx = situation.intensity === 'high' ? "CLUTCH: " : "";
  return `${pfx}${player.name} misses the crucial shot`;
}

// Context-aware narrative injections (Clean, emoji-free)
export function fatigueNarrative(teamName: string, avgStam: number, q: number, players: Player[], stamina: Record<string, number>): string | null {
  if (avgStam >= 40) return null;
  const tired = players.filter(p => (stamina[p.id] ?? 100) < 30);
  const tiredPlayer = tired.length > 0 ? tired[Math.floor(Math.random() * tired.length)] : null;
  const lines = [
    `${teamName} is running low on stamina in Q${q}`,
    `Fatigue setting in: ${teamName} requires stamina replenishment`,
    tiredPlayer ? `${tiredPlayer.name} looks fatigued on court` : null,
  ].filter(Boolean) as string[];
  return pick(lines);
}

export function runNarrative(teamName: string, run: number): string | null {
  if (run < 6) return null;
  return pick([
    `${teamName} on an active run: ${run} unanswered points!`,
    `${run} unanswered points for ${teamName}!`,
    `${teamName} on a ${run}-0 scoring run!`,
  ]);
}

export function dominantNarrative(player: Player, pts: number): string | null {
  if (pts < 20) return null;
  return pick([
    `${player.name} is taking control of this game: ${pts} points`,
    `Dominant performance: ${player.name} has ${pts} PTS`,
  ]);
}

export function hotNarrative(player: Player, consecutive: number): string | null {
  if (consecutive === 2) return `${player.name} is heating up`;
  if (consecutive >= 3) return `${player.name} is locked in!`;
  return null;
}

export function strategyDegradeText(strategy: string, reason: string): string {
  return `${strategy} strategy compromised: ${reason}`;
}

export function strategyRevertText(from: string, to: string, player?: string): string {
  if (player) return `${from} strategy collapsed: ${player} cannot maintain pace. Reverting to ${to}`;
  return `${from} strategy broken down. Reverting to ${to}`;
}

export function aiStrategyChangeText(teamName: string, strategy: string): string {
  return `${teamName} tactical adjustment: switching to ${strategy}`;
}

export function pickAndRollText(pg: Player, big: Player, success: boolean): string {
  if (success) return `${pg.name} runs the pick and roll with ${big.name}`;
  return `Pick and Roll broken down: ${big.name} is fatigued`;
}

export function trapNarrative(scorerName: string, success: boolean, teamName?: string): string {
  if (success) return `Trap broken: ${scorerName} finds the open teammate for the assist (+2)`;
  return `${teamName || 'Defense'} attempts a trap but ${scorerName} beats the pressure`;
}
