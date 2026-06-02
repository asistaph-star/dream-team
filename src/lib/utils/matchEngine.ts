import { Player, PlayerPosition, PlayerRarity } from "../types/player";
import {
  Difficulty, PlayerMatchStats, MatchEvent, MatchState,
  emptyStats, getStaminaMod, getPlayerStaminaMod, getStaminaPercent, computeTeamScore, formatClock,
  OFFENSIVE_STRATEGIES, DEFENSIVE_STRATEGIES,
  computeEffective, avgStamina, createInitialMatchState, clampForm,
  getShotZoneModifier, getMatchupBonus, getShotClockReset,
  getShotClockViolationChance,
  getPlayerMaxStamina,
  getEffectiveRevertThreshold, isStrategyRevertBlocked
} from "./matchTypes";
import { makeEvent, scoreText, missText, fatigueNarrative, runNarrative, dominantNarrative, hotNarrative, strategyDegradeText, strategyRevertText, aiStrategyChangeText, trapNarrative, clutchScoreText, clutchMissText } from "./matchNarrative";
import { generateShot, ShotType } from "./shotEngine";
import { evaluateAICoach } from "./matchAI";
import { getFreeThrowRating, getFoulDrawTendency, getFinishingRating, getThreePtRating, getReboundRating, getStealRating, getBlockRating, getHandleRating, getAssistRating, getShotIdentityEfficiencyAdjustment, getOnBallDefenseRating, getSpeedRating, getStrengthRating, getOffenseRating, getTwoPtRating, getStaminaRating } from "./playerIdentity";
import {
  addMark,
  consumeMark,
  decayMarks,
  drainStamina,
  hasAnyMark,
  hasBaseSkill,
  hasMark,
  getSpecialSkills,
  removeOldestMark,
  rollBaseSkill,
  rollSpecial,
} from "../skills/skillResolver";
import { assignBaseSkillsFromStats, assignSpecialSkillsFromStats } from "../skills/assignBaseSkills";

// Re-export everything the UI needs
export type { Difficulty, PlayerMatchStats, MatchEvent, MatchState } from "./matchTypes";
export { createInitialMatchState, getStaminaMod, getPlayerStaminaMod, getStaminaPercent, getPlayerMaxStamina, computeTeamScore, computeEffective, avgStamina, OFFENSIVE_STRATEGIES, DEFENSIVE_STRATEGIES, formatClock, clampForm, emptyStats, getShotZoneModifier, getMatchupBonus, getShotClockReset, getSkillHolders, hasSkillStack, getEnteredPlayerIds, resolveFlagrantFoul, translateOffIQBoost, translateDefIQBoost, isStrategyRevertBlocked, getEffectiveRevertThreshold, isSkillBlocked, getSkillRate } from "./matchTypes";

const MAX_3PT_POSITIVE_ADDITIVE_BONUS = 0.08;

function getIndividualThreePointShotMod(shooting: number | undefined): number {
  return Math.max(0.72, Math.min(1.0, 0.72 + ((shooting ?? 50) / 100) * 0.35));
}

const isShaiGilgeousAlexander = (player: Player): boolean => {
  return player.name.toLowerCase().includes("shai gilgeous-alexander");
};

const getFlopFoulPressureBonus = (scorer: Player): number => {
  const baseBonus = 0.04;
  return isShaiGilgeousAlexander(scorer) && getSpecialSkills(scorer).includes("Flop X") ? baseBonus * 2 : baseBonus;
};



const getStaminaCostScale = (player: Player | undefined): number => {
  const maxStamina = getPlayerMaxStamina(player);
  return Math.min(1.15, Math.max(1, Math.sqrt(maxStamina / 100)));
};

const STAMINA_CONFIG = {
  movement: {
    normalPerSecond: 0.020,
    randomPerSecond: 0.004,
    fastbreak: 1.50,
    earlyOffense: 1.20,
    fullCourtPress: 1.16,
    overtime: 1.18,
    road: 0.08,
  },
  shooting: {
    openCatchShoot: 2.4,
    normalJumper: 3.8,
    pullUp: 5.2,
    stepBackOrFadeaway: 7.0,
    contestedShot: 6.2,
    heavilyContestedShot: 8.8,
    blockedJumper: 11.5,
  },
  rim: {
    drive: 5.8,
    layup: 7.0,
    dunk: 8.0,
    contactFinish: 10.5,
    blockedLayup: 13.5,
    blockedDunk: 15.5,
    offensiveFoul: 9.0,
  },
  ballHandling: {
    quickTouch: 0.45,
    turnover: 1.85,
    isolation: 2.5,
    lateClockCreation: 2.4,
    doubleTeamEscape: 3.2,
  },
  defense: {
    lightContest: 1.8,
    hardCloseout: 2.8,
    jumpContest: 3.6,
    blockAttempt: 4.8,
    successfulBlock: 5.6,
    failedBlock: 6.4,
    stealAttempt: 4.2,
    successfulSteal: 5.2,
    failedSteal: 7.0,
    pressChase: 1.4,
    trapRotation: 1.8,
    foul: 1.0,
    scoredOnContest: 1.2,
  },
  rebounding: {
    easyRebound: 2.0,
    normalRebound: 2.8,
    contestedRebound: 4.8,
    offensiveReboundBattle: 5.4,
    putbackAttempt: 5.0,
  },
  recovery: {
    benchHomePerTick: 1.5,
    benchAwayPerTick: 1.2,
    timeout: 5,
    quarterBreak: 3,
    halftime: 6,
    overtimeBreak: 8,
    skillSupport: 8,
  },
  modifiers: {
    globalWorkloadScale: 0.74,
    make: 0.82,
    miss: 1.06,
    foul: 0.92,
    block: 1.22,
    heavyContact: 1.18,
    clutchTime: 1.08,
    overtime: 1.18,
    highUsage: 1.08,
    backToBackPossession: 1.08,
    alreadyTired: 1.10,
    exhausted: 1.18,
    transition: 1.12,
    lateClock: 1.12,
    fullCourtPress: 1.12,
    orebSecondChance: 1.10,
  },
} as const;

export const getCounterModifier = (offense: string, defense: string): { offMult: number; narrative: string } => {
  // 🛡️ Defense Countering Offense
  
  // Outside Shoot & Corner 3s countered by 3-2 Zone & Switch Defense
  if ((offense === "Outside Shoot" || offense === "Corner 3s" || offense === "5-Out Spacing") && 
      (defense === "3-2 Zone" || defense === "Switch Defense")) {
    return { 
      offMult: 0.90, 
      narrative: `Broadcast Booth: "The defensive rotation shifts beautifully to seal the perimeter, completely smothering the outside shooters!"` 
    };
  }

  // Inside Score countered by Protect the Lane & 2-3 Zone
  if ((offense === "Inside Score" || offense === "Post Isolation") && 
      (defense === "Protect the Lane" || defense === "2-3 Zone")) {
    return { 
      offMult: 0.90, 
      narrative: `Courtside Report: "The interior defense packs the key, completely walling off the driving lane!"` 
    };
  }

  // Pick & Roll countered by Blitz/Trap & Switch Defense & Combination Defense
  if (offense === "Pick & Roll" && 
      (defense === "Blitz/Trap" || defense === "Switch Defense" || defense === "Combination Defense")) {
    return { 
      offMult: 0.92, 
      narrative: `Sideline Analyst: "The defenders communicate perfectly on the high screen, intercepting the pick-and-roll action!"` 
    };
  }

  // Run & Gun countered by Half-court press & Full-court press
  if (offense === "Run & Gun" && 
      (defense === "Half-court press" || defense === "Half-Court Press" || 
       defense === "Full-court press" || defense === "Full-Court Press")) {
    return { 
      offMult: 0.91, 
      narrative: `Broadcast Booth: "The trapping defense stops the ball early, halting the transition run in its tracks!"` 
    };
  }

  // Princeton Offense, Hawk Entry, Outside Cut Entry countered by Man-to-Man & Combination Defense
  if ((offense === "Princeton Offense" || offense === "Hawk Entry" || offense === "Outside Cut Entry") && 
      (defense === "Man-to-Man" || defense === "Combination Defense" || defense === "Switch Defense")) {
    return { 
      offMult: 0.92, 
      narrative: `Scouting Insight: "Disciplined defender switches and tight off-ball coverage successfully check the backdoor cutters!"` 
    };
  }

  // 🏀 Offense Countering Defense (Offense exploits Defense)
  
  // 2-3 Zone & Protect the Lane exposed by Outside Shoot & Corner 3s & 5-Out Spacing
  if ((defense === "2-3 Zone" || defense === "Protect the Lane") && 
      (offense === "Outside Shoot" || offense === "Corner 3s" || offense === "5-Out Spacing")) {
    return { 
      offMult: 1.08, 
      narrative: `Broadcast Booth: "Excellent perimeter ball movement draws the packed zone defenders out, creating wide-open looks from deep!"` 
    };
  }

  // Full-court press & Half-court press & Blitz/Trap broken by Princeton Offense & Motion Offense & Pick & Roll
  if ((defense === "Full-court press" || defense === "Full-Court Press" || 
       defense === "Half-court press" || defense === "Half-Court Press" || 
       defense === "Blitz/Trap") && 
      (offense === "Princeton Offense" || offense === "Motion Offense" || offense === "Pick & Roll")) {
    return { 
      offMult: 1.08, 
      narrative: `Sideline Analyst: "Crisp team passing and quick ball reversals shred the high-pressure defensive trap!"` 
    };
  }

  // 3-2 Zone exposed by Inside Score & Post Isolation & Hawk Entry
  if (defense === "3-2 Zone" && 
      (offense === "Inside Score" || offense === "Post Isolation" || offense === "Hawk Entry")) {
    return { 
      offMult: 1.09, 
      narrative: `Courtside Report: "The defense is stretched high on the perimeter, leaving the low block exposed for easy inside scoring!"` 
    };
  }

  // Switch Defense punished by Isolation (ISO) & Post Isolation
  if (defense === "Switch Defense" && 
      (offense === "Isolation (ISO)" || offense === "Post Isolation")) {
    return { 
      offMult: 1.07, 
      narrative: `Scouting Insight: "Defensive screen switching creates a major mismatch on the block, letting the primary scorer operate 1-on-1!"` 
    };
  }

  // 1-3-1 Zone punished by Princeton Offense & Motion Offense
  if (defense === "1-3-1 Zone" && 
      (offense === "Princeton Offense" || offense === "Motion Offense")) {
    return { 
      offMult: 1.08, 
      narrative: `Broadcast Booth: "Methodical player cuts and passing completely bypass the active trapping zone along the sidelines!"` 
    };
  }

  return { offMult: 1.0, narrative: "" };
};

export const getSubtleStrategyHint = (strategy: string, isOffense: boolean): string => {
  const clean = strategy.trim();
  if (isOffense) {
    switch (clean) {
      case "Outside Shoot":
        return Math.random() < 0.5 
          ? "Their perimeter players are moving out, stretching our defenders far beyond the arc."
          : "They seem heavily focused on creating space along the outer boundary.";
      case "Corner 3s":
        return Math.random() < 0.5 
          ? "Their wings are continuously flaring out towards the corners, waiting to spot up."
          : "The baseline boundaries look crowded as they hunt for quick kick-out looks.";
      case "Inside Score":
        return Math.random() < 0.5 
          ? "They are aggressively attacking the restricted area and cutting deep inside."
          : "It looks like their primary goal is paint dominance and high-percentage rim scoring.";
      case "Hawk Entry":
        return Math.random() < 0.5 
          ? "Their big men are setting screens around the elbow, looking to free up baseline cutters."
          : "They're running high post entry sets to slide their wings backdoor.";
      case "Outside Cut Entry":
        return Math.random() < 0.5 
          ? "The ball is staying out on the perimeter while their off-ball guards look to slice backdoor."
          : "They are holding the perimeter and scanning for quick baseline cuts.";
      case "Princeton Offense":
        return Math.random() < 0.5 
          ? "They are moving in constant, deliberate patterns, waiting patiently to bait a defensive over-pursuit."
          : "Their offense is playing extremely slow and methodical, relying heavily on backdoors.";
      case "Isolation (ISO)":
        return Math.random() < 0.5 
          ? "The floor is completely cleared out on one side as their primary scorer sizes up 1-on-1."
          : "They've completely stopped ball movement, letting one player operate solo.";
      case "Pick & Roll":
        return Math.random() < 0.5 
          ? "Their big man is high at the key, continuously setting screens for the ball handler."
          : "They are looking to exploit screen-and-roll action on almost every sequence.";
      case "Run & Gun":
        return Math.random() < 0.5 
          ? "They are pushing the ball immediately on the outlet, hunting for rapid transition looks."
          : "Their players are flying up the court in transition, trying to score under 7 seconds.";
      case "Motion Offense":
        return Math.random() < 0.5 
          ? "They are moving the ball fluidly from side to side, keeping all 5 players in continuous action."
          : "Their offense is balanced, executing quick passes and off-ball movement.";
      case "5-Out Spacing":
        return Math.random() < 0.5 
          ? "All five of their players have completely cleared out of the paint, standing beyond the three-point line."
          : "They are utilizing total five-man perimeter spacing to drag our rim protectors out.";
      case "Post Isolation":
        return Math.random() < 0.5 
          ? "They are feeding the low block immediately, letting their big man push physical back-down plays."
          : "Their offense is slowing down to let their post players operate down low.";
      case "Pace & Space":
        return Math.random() < 0.5 
          ? "They are playing at a modern, uptempo speed, hunting early-clock three-point looks."
          : "They are continuously moving the ball to look for open high-volume outer shots.";
      default:
        return "";
    }
  } else {
    // Defense Hints
    switch (clean) {
      case "Full-court press":
      case "Full-Court Press":
        return Math.random() < 0.5 
          ? "Their defenders have suddenly locked up on us full-court, swarming our inbound passer."
          : "The defense looks extremely aggressive, matching us stride-for-stride from our own backcourt.";
      case "Half-court press":
      case "Half-Court Press":
        return Math.random() < 0.5 
          ? "Their guards are waiting past the timeline, locking in traps along the sidelines."
          : "They've locked down on defense past midcourt, trying to pressure our handlers into early turnovers.";
      case "3-2 Zone":
        return Math.random() < 0.5 
          ? "Their defense is standing high and wide on the perimeter, stunting heavily at our wing shooters."
          : "They've packed the outer arc in a high zone, making it extremely difficult to get clean wing passes.";
      case "Protect the Lane":
        return Math.random() < 0.5 
          ? "Their defenders have completely sagged back, packing the restricted area and walling off the rim."
          : "They are refusing to contest our mid-range, completely focused on stopping inside drives.";
      case "1-3-1 Zone":
        return Math.random() < 0.5 
          ? "They've deployed a highly active, shifting zone, actively trying to intercept sideline passes."
          : "Their defensive zone is shifting dynamically, trapping our ball handler near the sideline corners.";
      case "Combination Defense":
        return Math.random() < 0.5 
          ? "They are running a hybrid scheme — one defender is matching our top star step-for-step while the others play zone."
          : "They've locked down their best defender onto our primary scorer, ignoring the rest of our motion.";
      case "Man-to-Man":
        return Math.random() < 0.5 
          ? "They are playing disciplined, traditional coverage, matching up strictly one-on-one."
          : "Their defenders are tracking their individual assignments with traditional focus.";
      case "2-3 Zone":
        return Math.random() < 0.5 
          ? "They are clogging the interior paint with three zone-defenders stationed low."
          : "Their defense is packed tight inside a 2-3 alignment, inviting us to shoot from the outside.";
      case "Drop Coverage":
        return Math.random() < 0.5 
          ? "Their big man sags low on every screen action, giving up the mid-range to protect the rim."
          : "They are dropping their center deep inside the paint, daring us to take perimeter jump shots.";
      case "Switch Defense":
        return Math.random() < 0.5 
          ? "They are switching screen assignments instantly, closing down all off-ball spacing."
          : "Their defenders are fluidly switching every single screening action without hesitation.";
      case "Blitz/Trap":
        return Math.random() < 0.5 
          ? "They are throwing sudden double teams at our ball handler, trying to force panic passes."
          : "They are aggressively trapping key playmakers to force early turnovers.";
      default:
        return "";
    }
  }
};

// ─── AI TEAM DATA (unchanged) ───
const aiPlayer = (id: string, name: string, pos: PlayerPosition, ovr: number, off: number, def: number, rarity: PlayerRarity, img: string, shooting: number, speed: number, strength: number, playmaking: number): Player => ({
  id, name, position: pos, rarity, level: Math.round(ovr / 2), maxLevel: 50, exp: 0, ovr, offense: off, defense: def, imageUrl: img, shooting, speed, strength, playmaking
});
const withAssignedSkills = (roster: Player[]): Player[] =>
  roster.map(p => ({
    ...p,
    baseSkills: p.baseSkills ?? assignBaseSkillsFromStats(p),
    specialSkillSlots: p.specialSkillSlots ?? assignSpecialSkillsFromStats(p),
  }));
const buildAiTeam = (name: string, arena: string, color: string, roster: Player[]) => ({
  name,
  arena,
  color,
  roster: withAssignedSkills(roster),
  off: roster.slice(0, 5).reduce((sum, p) => sum + p.offense, 0),
  def: roster.slice(0, 5).reduce((sum, p) => sum + p.defense, 0),
});

export const mockAiTeams: Record<Difficulty, { name: string; arena: string; off: number; def: number; color: string; roster: Player[] }> = {
  EASY: buildAiTeam('Portland Trail Blazers', 'Moda Center', 'text-green-400', [
    { id: 'por_scoot_henderson', name: 'Scoot Henderson', position: 'PG', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 78, offense: 76, defense: 72, shooting: 68, speed: 90, strength: 62, playmaking: 82, imageUrl: 'https://www.dreamteamph.com/players/newplayers/blazers/scoothenderson.webp' },
    { id: 'por_anfernee_simons', name: 'Anfernee Simons', position: 'SG', rarity: 'Epic', level: 30, maxLevel: 30, exp: 0, ovr: 83, offense: 84, defense: 65, shooting: 86, speed: 82, strength: 52, playmaking: 78, imageUrl: 'https://www.dreamteamph.com/players/newplayers/blazers/anferneesimons.webp' },
    { id: 'por_deni_avdija', name: 'Deni Avdija', position: 'SF', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 80, offense: 80, defense: 82, shooting: 74, speed: 76, strength: 74, playmaking: 72, imageUrl: 'https://www.dreamteamph.com/players/newplayers/blazers/deniavdija.webp' },
    { id: 'por_jerami_grant', name: 'Jerami Grant', position: 'PF', rarity: 'Epic', level: 30, maxLevel: 30, exp: 0, ovr: 82, offense: 82, defense: 76, shooting: 82, speed: 75, strength: 72, playmaking: 68, imageUrl: 'https://www.dreamteamph.com/players/newplayers/blazers/jeramigrant.webp' },
    { id: 'por_deandre_ayton', name: 'Deandre Ayton', position: 'C', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 80, offense: 80, defense: 78, shooting: 62, speed: 68, strength: 82, playmaking: 55, imageUrl: 'https://www.dreamteamph.com/players/newplayers/blazers/deandreayton.webp' },
    { id: 'por_dalano_banton', name: 'Dalano Banton', position: 'PG', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 75, offense: 74, defense: 70, shooting: 70, speed: 84, strength: 58, playmaking: 72, imageUrl: 'https://www.dreamteamph.com/players/newplayers/blazers/dalanobanton.webp' },
    { id: 'por_shaedon_sharpe', name: 'Shaedon Sharpe', position: 'SG', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 79, offense: 80, defense: 72, shooting: 76, speed: 85, strength: 60, playmaking: 70, imageUrl: 'https://www.dreamteamph.com/players/newplayers/blazers/shaedonsharpe.webp' },
    { id: 'por_toumani_camara', name: 'Toumani Camara', position: 'SF', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 76, offense: 70, defense: 80, shooting: 70, speed: 74, strength: 72, playmaking: 62, imageUrl: 'https://www.dreamteamph.com/players/newplayers/blazers/toumanicamara.webp' },
    { id: 'por_jabari_walker', name: 'Jabari Walker', position: 'PF', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 76, offense: 72, defense: 74, shooting: 68, speed: 70, strength: 76, playmaking: 60, imageUrl: 'https://www.dreamteamph.com/players/newplayers/blazers/jabariwalker.webp' },
    { id: 'por_donovan_clingan', name: 'Donovan Clingan', position: 'C', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 76, offense: 70, defense: 78, shooting: 50, speed: 58, strength: 84, playmaking: 52, imageUrl: 'https://www.dreamteamph.com/players/newplayers/blazers/donovanclingan.webp' }
  ]),
  NORMAL: buildAiTeam('New York Knicks', 'Madison Square Garden', 'text-dt-cyan', [
    { id: 'nyk_jalen_brunson', name: 'Jalen Brunson', position: 'PG', rarity: 'Legendary', level: 30, maxLevel: 30, exp: 0, ovr: 93, offense: 94, defense: 78, shooting: 90, speed: 85, strength: 64, playmaking: 92, imageUrl: 'https://www.dreamteamph.com/players/newplayers/knicks/jalenbrunson.webp' },
    { id: 'nyk_mikal_bridges', name: 'Mikal Bridges', position: 'SG', rarity: 'Epic', level: 30, maxLevel: 30, exp: 0, ovr: 84, offense: 80, defense: 84, shooting: 82, speed: 78, strength: 65, playmaking: 72, imageUrl: 'https://www.dreamteamph.com/players/newplayers/knicks/mikalbridges.webp' },
    { id: 'nyk_og_anunoby', name: 'OG Anunoby', position: 'SF', rarity: 'Epic', level: 30, maxLevel: 30, exp: 0, ovr: 84, offense: 78, defense: 88, shooting: 80, speed: 76, strength: 75, playmaking: 65, imageUrl: 'https://www.dreamteamph.com/players/newplayers/knicks/oganunoby.webp' },
    { id: 'nyk_karl_anthony_towns', name: 'Karl-Anthony Towns', position: 'PF', rarity: 'Legendary', level: 30, maxLevel: 30, exp: 0, ovr: 89, offense: 90, defense: 76, shooting: 88, speed: 72, strength: 80, playmaking: 70, imageUrl: 'https://www.dreamteamph.com/players/newplayers/knicks/karlanthonytowns.webp' },
    { id: 'nyk_mitchell_robinson', name: 'Mitchell Robinson', position: 'C', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 79, offense: 68, defense: 84, shooting: 40, speed: 64, strength: 86, playmaking: 48, imageUrl: 'https://www.dreamteamph.com/players/newplayers/knicks/mitchellrobinson.webp' },
    { id: 'nyk_cameron_payne', name: 'Cameron Payne', position: 'PG', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 75, offense: 75, defense: 68, shooting: 78, speed: 82, strength: 52, playmaking: 76, imageUrl: 'https://www.dreamteamph.com/players/newplayers/knicks/cameronpayne.webp' },
    { id: 'nyk_miles_mcbride', name: 'Miles McBride', position: 'SG', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 77, offense: 76, defense: 76, shooting: 80, speed: 82, strength: 55, playmaking: 70, imageUrl: 'https://www.dreamteamph.com/players/newplayers/knicks/milesmcbride.webp' },
    { id: 'nyk_josh_hart', name: 'Josh Hart', position: 'SF', rarity: 'Epic', level: 30, maxLevel: 30, exp: 0, ovr: 82, offense: 78, defense: 82, shooting: 75, speed: 80, strength: 72, playmaking: 78, imageUrl: 'https://www.dreamteamph.com/players/newplayers/knicks/joshhart.webp' },
    { id: 'nyk_precious_achiuwa', name: 'Precious Achiuwa', position: 'PF', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 77, offense: 74, defense: 76, shooting: 65, speed: 74, strength: 78, playmaking: 58, imageUrl: 'https://www.dreamteamph.com/players/newplayers/knicks/preciousachiuwa.webp' },
    { id: 'nyk_jericho_sims', name: 'Jericho Sims', position: 'C', rarity: 'Common', level: 30, maxLevel: 30, exp: 0, ovr: 73, offense: 64, defense: 74, shooting: 35, speed: 68, strength: 78, playmaking: 45, imageUrl: 'https://www.dreamteamph.com/players/newplayers/knicks/jerichosims.webp' }
  ]),
  HARD: buildAiTeam('Golden State Warriors', 'Chase Center', 'text-dt-gold', [
    { id: 'gsw_stephen_curry', name: 'Stephen Curry', position: 'PG', rarity: 'Mythic', level: 30, maxLevel: 30, exp: 0, ovr: 95, offense: 97, defense: 78, shooting: 99, speed: 85, strength: 60, playmaking: 95, imageUrl: 'https://www.dreamteamph.com/players/newplayers/warriors/stephencurry.webp' },
    { id: 'gsw_brandin_podziemski', name: 'Brandin Podziemski', position: 'SG', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 78, offense: 76, defense: 74, shooting: 78, speed: 78, strength: 62, playmaking: 76, imageUrl: 'https://www.dreamteamph.com/players/newplayers/warriors/brandinpodziemski.webp' },
    { id: 'gsw_andrew_wiggins', name: 'Andrew Wiggins', position: 'SF', rarity: 'Epic', level: 30, maxLevel: 30, exp: 0, ovr: 80, offense: 78, defense: 78, shooting: 78, speed: 80, strength: 70, playmaking: 68, imageUrl: 'https://www.dreamteamph.com/players/newplayers/warriors/andrewwiggins.webp' },
    { id: 'gsw_jonathan_kuminga', name: 'Jonathan Kuminga', position: 'PF', rarity: 'Epic', level: 30, maxLevel: 30, exp: 0, ovr: 80, offense: 80, defense: 74, shooting: 72, speed: 84, strength: 76, playmaking: 68, imageUrl: 'https://www.dreamteamph.com/players/newplayers/warriors/jonathankuminga.webp' },
    { id: 'gsw_trayce_jackson_davis', name: 'Trayce Jackson-Davis', position: 'C', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 78, offense: 68, defense: 78, shooting: 40, speed: 70, strength: 78, playmaking: 62, imageUrl: 'https://www.dreamteamph.com/players/newplayers/warriors/traycejacksondavis.webp' },
    { id: 'gsw_deanthony_melton', name: 'De\'Anthony Melton', position: 'PG', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 78, offense: 75, defense: 78, shooting: 78, speed: 80, strength: 60, playmaking: 72, imageUrl: 'https://www.dreamteamph.com/players/newplayers/warriors/deanthonymelton.webp' },
    { id: 'gsw_buddy_hield', name: 'Buddy Hield', position: 'SG', rarity: 'Epic', level: 30, maxLevel: 30, exp: 0, ovr: 80, offense: 82, defense: 68, shooting: 88, speed: 75, strength: 58, playmaking: 68, imageUrl: 'https://www.dreamteamph.com/players/newplayers/warriors/buddyhield.webp' },
    { id: 'gsw_gary_payton_ii', name: 'Gary Payton II', position: 'SF', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 77, offense: 72, defense: 84, shooting: 70, speed: 82, strength: 65, playmaking: 64, imageUrl: 'https://www.dreamteamph.com/players/newplayers/warriors/garypaytonii.webp' },
    { id: 'gsw_draymond_green', name: 'Draymond Green', position: 'PF', rarity: 'Epic', level: 30, maxLevel: 30, exp: 0, ovr: 81, offense: 74, defense: 86, shooting: 72, speed: 70, strength: 78, playmaking: 84, imageUrl: 'https://www.dreamteamph.com/players/newplayers/warriors/draymondgreen.webp' },
    { id: 'gsw_kevon_looney', name: 'Kevon Looney', position: 'C', rarity: 'Rare', level: 30, maxLevel: 30, exp: 0, ovr: 76, offense: 68, defense: 76, shooting: 40, speed: 58, strength: 80, playmaking: 60, imageUrl: 'https://www.dreamteamph.com/players/newplayers/warriors/kevonlooney.webp' }
  ]),
};

// ─── MAIN TICK ───
export function simulateTick(
  state: MatchState,
  userOff: number, userDef: number,
  aiTeamObj: typeof mockAiTeams[Difficulty],
  userLineup: Player[],
  allUserRoster: Player[]
): MatchState {
  if (state.isFinished) return state;

  let newActiveShotMeter: MatchState['activeShotMeter'] = null;

  // ═══ SKILL BUFF RESET (skills re-apply each tick) ═══
  const newTeamSkillBuffs: MatchState['teamSkillBuffs'] = {
    user: { offIQ: 0, defIQ: 0, revertBlocked: false, revertThresholdBonus: 0 },
    ai:   { offIQ: 0, defIQ: 0, revertBlocked: false, revertThresholdBonus: 0 },
  };
  const newActiveSkillBuffs: MatchState['activeSkillBuffs'] = {};

  let nextAiLineupIds = state.aiLineupIds && state.aiLineupIds.length === 5
    ? [...state.aiLineupIds]
    : aiTeamObj.roster.slice(0, 5).map(p => p.id);

  let aiLineup = nextAiLineupIds.map(id => aiTeamObj.roster.find(p => p.id === id)!).filter(Boolean);
  if (aiLineup.length !== 5) {
    aiLineup = aiTeamObj.roster.slice(0, 5);
    nextAiLineupIds = aiLineup.map(p => p.id);
  }
  const playerById = new Map([...allUserRoster, ...aiTeamObj.roster].map(p => [p.id, p]));
  const recoverToMax = (player: Player, amount: number, staminaMap: Record<string, number> = state.playerStamina): number => {
    return Math.min(getPlayerMaxStamina(player), (staminaMap[player.id] ?? getPlayerMaxStamina(player)) + amount);
  };
  const staminaPct = (player: Player): number => getStaminaPercent(player, newStamina[player.id]);
  let currentPossession = state.possessionTeam;
  if (!currentPossession) {
    currentPossession = Math.random() < 0.5 ? 'user' : 'ai';
  }

  let timeElapsed = -1;
  let pace: 'fastbreak' | 'early_offense' | 'oreb' | 'late_clock' | 'normal' = 'normal';

  const activeOffStrategy = currentPossession === 'user' ? state.userOffStrategy : state.aiOffStrategy;
  const offStam = avgStamina(currentPossession === 'user' ? userLineup : aiLineup, state.playerStamina);
  const defStam = avgStamina(currentPossession === 'user' ? aiLineup : userLineup, state.playerStamina);
  const staminaAdvantage = offStam - defStam;

  switch (state.lastPlayCategory) {
    case 'steal':
      timeElapsed = Math.floor(Math.random() * 5) + 4; // 4-8s
      pace = 'fastbreak';
      break;
    case 'block':
      timeElapsed = Math.floor(Math.random() * 5) + 5; // 5-9s
      pace = 'fastbreak';
      break;
    case 'miss_oreb':
      if (Math.random() < 0.10) {
        timeElapsed = Math.floor(Math.random() * 4) + 3; // 3-6s quick putback
      } else {
        timeElapsed = Math.floor(Math.random() * 5) + 6; // 6-10s reset
      }
      pace = 'oreb';
      break;
    case 'miss_dreb':
      if (staminaAdvantage >= 15 && Math.random() < 0.05) {
        timeElapsed = Math.floor(Math.random() * 5) + 6; // 6-10s outlet
        pace = 'fastbreak';
      } else {
        timeElapsed = -1; // Fallback to strategy
        pace = 'normal';
      }
      break;
    case 'turnover':
      if (Math.random() < 0.10) {
        timeElapsed = Math.floor(Math.random() * 5) + 4; // 4-8s live-ball
        pace = 'fastbreak';
      } else {
        timeElapsed = -1; // Fallback to strategy
        pace = 'normal';
      }
      break;
    case 'made_shot':
      if (activeOffStrategy === '5-Out Spacing' && Math.random() < 0.05) {
        timeElapsed = Math.floor(Math.random() * 5) + 8; // 8-12s
        pace = 'early_offense';
      } else {
        timeElapsed = -1; // Fallback to strategy
        pace = 'normal';
      }
      break;
    case 'foul_reset':
      if (Math.random() < 0.10) {
        timeElapsed = Math.floor(Math.random() * 5) + 3; // 3-7s
      } else {
        timeElapsed = -1;
      }
      pace = 'normal';
      break;
    case 'start_quarter':
    default:
      timeElapsed = -1;
      pace = 'normal';
      break;
  }

  // If pace resolved to normal, apply strategy-based timing if no event forced a time
  if (pace === 'normal') {
    let strategyTime = 0;
    if (activeOffStrategy === 'Isolation (ISO)' && state.clock <= 60) {
      strategyTime = Math.floor(Math.random() * 5) + 20; // 20-24s
      pace = 'late_clock';
    } else if (activeOffStrategy === 'Isolation (ISO)' || activeOffStrategy === 'Post Isolation') {
      strategyTime = Math.floor(Math.random() * 6) + 17; // 17-22s
    } else if (activeOffStrategy === 'Pick & Roll') {
      strategyTime = Math.floor(Math.random() * 6) + 13; // 13-18s
    } else if (activeOffStrategy === '5-Out Spacing') {
      strategyTime = Math.floor(Math.random() * 6) + 11; // 11-16s
    } else {
      strategyTime = Math.floor(Math.random() * 7) + 12; // 12-18s normal half-court
    }

    if (timeElapsed === -1) {
      timeElapsed = strategyTime;
    }
  }

  // Fix 4: LATE GAME CLOCK OVERRIDE (Urgency overrides strategy)
  if ((state.quarter === 4 || state.quarter >= 5) && state.clock <= 24) {
    const isUserPoss = currentPossession === 'user';
    const activeTeamScore = isUserPoss ? state.userScore : state.aiScore;
    const opponentTeamScore = isUserPoss ? state.aiScore : state.userScore;
    
    if (activeTeamScore >= opponentTeamScore) {
      // Winning or tied team: hold for last shot / drain clock
      timeElapsed = Math.floor(Math.random() * 5) + 20; // 20-24s
      pace = 'late_clock';
    } else {
      // Losing team: extreme urgency to score
      timeElapsed = Math.floor(Math.random() * 5) + 6; // 6-10s
      pace = 'fastbreak';
    }
  }

  let shotClockViolationFired = false;
  // If remaining shot clock is less than or equal to the time elapsed for the play, a violation occurs!
  if (state.possessionClock !== undefined && state.possessionClock > 0 && timeElapsed >= state.possessionClock) {
    timeElapsed = Math.max(1, state.possessionClock); // burn exactly the remaining shot clock time
    shotClockViolationFired = true;
  }

  let nextPossessionTeam: 'user' | 'ai' | null = currentPossession;
  let nextLastPlayCategory = state.lastPlayCategory;

  let newClock = state.clock - timeElapsed;
  let newQuarter = state.quarter;
  let finished = false;
  let quarterEnded = false;

  const newTeamFouls = { user: [...state.teamFouls.user], ai: [...state.teamFouls.ai] };
  const newIsInBonus = { user: state.isInBonus.user, ai: state.isInBonus.ai };
  const newOTScores = { user: [...(state.otScores?.user ?? [])], ai: [...(state.otScores?.ai ?? [])] };

  if (newClock <= 0) {
    if (newQuarter < 4) { 
      newQuarter += 1; newClock = 720; quarterEnded = true; 
      nextPossessionTeam = null;
      nextLastPlayCategory = 'made_shot';
    } else {
      newClock = 0;
      const tied = state.userScore === state.aiScore;
      if (tied && (state.otPeriod ?? 0) < 3) {
        // OVERTIME TRIGGERED
        finished = false;
        newQuarter += 1;
        newClock = 300; // 5 minutes
        
        const newOTPeriod = (state.otPeriod ?? 0) + 1;
        quarterEnded = true;
        
        newTeamFouls.user.push(0);
        newTeamFouls.ai.push(0);
        
        newOTScores.user.push(0);
        newOTScores.ai.push(0);
        
        const otText = newOTPeriod === 1 ? 'First' : newOTPeriod === 2 ? 'Double' : 'Triple';
        const ev = makeEvent(newQuarter, newClock, `OVERTIME: Game tied at ${state.userScore}. ${otText} OT — 5 minutes remaining.`, true);
        
        const newEventsList = [ev, ...state.events].slice(0, 50);
        
        // Return OT state
        return {
          ...state,
          isOT: true,
          otPeriod: newOTPeriod,
          otScores: newOTScores,
          teamFouls: newTeamFouls,
          isInBonus: { user: false, ai: false },
          quarter: newQuarter,
          clock: newClock,
          isFinished: false,
          events: newEventsList,
          possessionTeam: null,
          lastPlayCategory: 'made_shot',
          playerStamina: Object.fromEntries(Object.entries(state.playerStamina).map(([k, v]) => {
            const player = playerById.get(k);
            const recovery = STAMINA_CONFIG.recovery.overtimeBreak;
            return [k, player ? Math.min(getPlayerMaxStamina(player), v + recovery) : Math.min(100, v + recovery)];
          })),
        };
      } else if (tied && (state.otPeriod ?? 0) >= 3) {
        // TRIPLE OT LIMIT REACHED - SUDDEN DEATH
        finished = true; // Set true for shootout to end game
      } else {
        finished = true; 
      }
    }
  }

  // Update gameTimeSec formula for OT
  const gameTimeSec = newQuarter <= 4
    ? (newQuarter - 1) * 720 + (720 - newClock)
    : 2880 + (newQuarter - 5) * 300 + (300 - newClock);
  const newStamina = { ...state.playerStamina };
  const newPlayerStats: Record<string, PlayerMatchStats> = {};
  Object.keys(state.playerStats).forEach(k => { newPlayerStats[k] = { ...state.playerStats[k] }; });
  const ensureStats = (id: string) => { if (!newPlayerStats[id]) newPlayerStats[id] = emptyStats(); };
  const newEvents: MatchEvent[] = [];
  const decayed = decayMarks(state.skillMarks ?? {}, state.markImmunity ?? {});
  let newSkillMarks: MatchState['skillMarks'] = decayed.nextMarks;
  let newMarkImmunity: MatchState['markImmunity'] = decayed.nextImmunity;

  // Substitution clear: remove marks and immunities for players who went to the bench
  const onCourtIds = new Set([...userLineup, ...aiLineup].map(p => p.id));
  Object.keys(newSkillMarks).forEach(id => {
    if (!onCourtIds.has(id)) delete newSkillMarks[id];
  });
  Object.keys(newMarkImmunity).forEach(id => {
    if (!onCourtIds.has(id)) delete newMarkImmunity[id];
  });

  const warnings: string[] = [];
  const newSkillUsedThisGame: MatchState['skillUsedThisGame'] = { ...(state.skillUsedThisGame ?? {}) };
  const teamSkillKey = (isUserTeam: boolean): string => isUserTeam ? "user" : "ai";
  const hasTeamSkillUsed = (isUserTeam: boolean, skillUse: string): boolean =>
    (newSkillUsedThisGame[teamSkillKey(isUserTeam)] ?? []).includes(skillUse);
  const markTeamSkillUsed = (isUserTeam: boolean, skillUse: string): void => {
    const key = teamSkillKey(isUserTeam);
    newSkillUsedThisGame[key] = [...(newSkillUsedThisGame[key] ?? []), skillUse];
  };
  // Form rating state
  const newFormRating: Record<string, number> = { ...state.formRating };
  const newFormFired: Record<string, { hot108: boolean; hot112: boolean; cold092: boolean; cold088: boolean; recovered: boolean }> = {};
  Object.keys(state.formNarrativeFired).forEach(k => { newFormFired[k] = { ...state.formNarrativeFired[k] }; });
  const newHotFromForm: Record<string, boolean> = { ...state.hotFromForm };
  const ensureForm = (id: string) => { if (newFormRating[id] === undefined) newFormRating[id] = 1.0; };
  const ensureFormFired = (id: string) => { if (!newFormFired[id]) newFormFired[id] = { hot108: false, hot112: false, cold092: false, cold088: false, recovered: true }; };
  let stealPlayerId = '';
  let eventIndicator: { playerId: string; type: 'BLK' | 'STL' | 'TOV' | 'REB' | 'OREB' | 'AST' | 'FOL' } | undefined;
  const skillLog = (text: string, isUserTeam: boolean) => {
    newEvents.push(makeEvent(newQuarter, newClock, `SKILL: ${text}`, isUserTeam));
  };
  const getLowestStaminaPlayer = (lineup: Player[]): Player =>
    [...lineup].sort((a, b) => (newStamina[a.id] ?? 100) - (newStamina[b.id] ?? 100))[0] ?? lineup[0];
  const applyDebtCollector = (
    triggerTeam: Player[],
    targetTeam: Player[],
    target: Player,
    isTriggerUser: boolean
  ) => {
    if (!hasMark(newSkillMarks, target.id, "Debt")) return;
    if (!rollSpecial(triggerTeam, "Debt Collector X", newStamina)) return;
    newSkillMarks = consumeMark(newSkillMarks, target.id, "Debt");
    const splashTargets = targetTeam
      .filter(p => p.id !== target.id)
      .sort((a, b) => (newStamina[a.id] ?? 100) - (newStamina[b.id] ?? 100))
      .slice(0, 2);
    splashTargets.forEach(p => drainStamina(newStamina, p, targetTeam, 45));
    skillLog(`Debt Collector X spreads stamina damage from ${target.name}`, isTriggerUser);
  };
  const applyFiveManSqueeze = (
    triggerTeam: Player[],
    targetTeam: Player[],
    isTriggerUser: boolean
  ) => {
    if (!rollSpecial(triggerTeam, "Five-Man Squeeze X", newStamina)) return;
    const markedCount = targetTeam.filter(p => hasAnyMark(newSkillMarks, p.id)).length;
    const amount = markedCount >= 3 ? 60 : 40;
    targetTeam.forEach(p => drainStamina(newStamina, p, targetTeam, amount));
    skillLog(`Five-Man Squeeze X drains ${amount} stamina from the opposing five`, isTriggerUser);
  };
  const tryColdTimeout = (team: Player[], isUserTeam: boolean) => {
    const markedPlayers = team.filter(p => (newSkillMarks[p.id] ?? []).length > 0);
    const teamAvgStamina = avgStamina(team, newStamina);
    if (teamAvgStamina >= 65 && markedPlayers.length === 0) return;
    const useKey = `Cold Timeout X Q${newQuarter}`;
    if (hasTeamSkillUsed(isUserTeam, useKey)) return;
    if (!rollSpecial(team, "Cold Timeout X", newStamina)) return;
    markTeamSkillUsed(isUserTeam, useKey);
    let cleansed = 0;
    markedPlayers.forEach(p => {
      const before = newSkillMarks[p.id]?.length ?? 0;
      if (before > 0) {
        const { nextMarks, cleansedMark } = removeOldestMark(newSkillMarks, p.id);
        newSkillMarks = nextMarks;
        if (cleansedMark) {
          const currentImmunities = newMarkImmunity[p.id] ?? [];
          if (!currentImmunities.some(m => m.mark === cleansedMark)) {
            currentImmunities.push({ mark: cleansedMark, possessionsLeft: 1 });
          }
          newMarkImmunity[p.id] = currentImmunities;
        }
        cleansed++;
      }
    });
    const recoveryTargets = [...team]
      .sort((a, b) => (newStamina[a.id] ?? 100) - (newStamina[b.id] ?? 100))
      .slice(0, teamAvgStamina < 65 ? 2 : 1);
    recoveryTargets.forEach(p => recoverSkillStamina(p, 12));
    const recoveryText = recoveryTargets.length > 0 ? `steadies ${recoveryTargets.length} tired player${recoveryTargets.length > 1 ? "s" : ""}` : "";
    const cleanseText = cleansed > 0 ? `cleanses ${cleansed} pressure mark${cleansed !== 1 ? "s" : ""}` : "";
    const joiner = cleanseText && recoveryText ? " and " : "";
    skillLog(`Cold Timeout X ${cleanseText}${joiner}${recoveryText}`, isUserTeam);
  };
  const tryDeadAir = (
    disruptingTeam: Player[],
    target: Player | undefined,
    isDisruptingUser: boolean,
    sourceText: string
  ): boolean => {
    if (!target || !rollSpecial(disruptingTeam, "Dead Air X", newStamina)) return false;
    newSkillMarks = addMark(newSkillMarks, newMarkImmunity, target.id, "Static", "Dead Air X", 2);
    skillLog(`Dead Air X blocks ${target.name}'s ${sourceText} in mid-air and applies Static`, isDisruptingUser);
    return true;
  };
  const tryShadowGuard = (defendingTeam: Player[], isDefendingUser: boolean): boolean => {
    if (!rollBaseSkill(defendingTeam, "Shadow Guard", newStamina)) return false;
    skillLog(`Shadow Guard cuts off the perimeter trigger`, isDefendingUser);
    return true;
  };
  const recoverSkillStamina = (player: Player, amount: number): boolean => {
    if (hasMark(newSkillMarks, player.id, "Pinned")) return false;
    newStamina[player.id] = recoverToMax(player, amount, newStamina);
    return true;
  };
  const applyPressureCoach = (sourceTeam: Player[], targetTeam: Player[], isSourceUser: boolean) => {
    if (!rollSpecial(sourceTeam, "Pressure Coach X", newStamina)) return;
    const targets = targetTeam.filter(p => hasAnyMark(newSkillMarks, p.id));
    if (targets.length === 0) return;
    targets.forEach(p => drainStamina(newStamina, p, targetTeam, 12));
    skillLog(`Pressure Coach X taxes ${targets.length} marked opponent${targets.length > 1 ? "s" : ""}`, isSourceUser);
  };
  const applyHookedTax = (team: Player[], isUserTeam: boolean) => {
    const hooked = team.filter(p => hasMark(newSkillMarks, p.id, "Hooked"));
    hooked.forEach(p => {
      drainStamina(newStamina, p, team, 38);
      skillLog(`${p.name} pays the Hooked stamina tax`, isUserTeam);
    });
  };
  const applyGreenSupport = (team: Player[], isUserTeam: boolean) => {
    team.forEach(p => {
      if (hasBaseSkill(p, "Future Core")) {
        ensureForm(p.id);
        if (newFormRating[p.id] < 1.0) newFormRating[p.id] = clampForm(newFormRating[p.id] + 0.006);
      }
    });
    const foulsThisQuarter = isUserTeam ? newTeamFouls.user[newQuarter - 1] : newTeamFouls.ai[newQuarter - 1];
    if (foulsThisQuarter > 0 && rollBaseSkill(team, "Enforcer Lift", newStamina)) {
      team.forEach(p => recoverSkillStamina(p, 6));
      skillLog(`Enforcer Lift turns physical play into team energy`, isUserTeam);
    }
  };

  // ═══ ENERGY DRINK: Lock helpers ═══
  const newEnergyDrinkLocked = { ...state.energyDrinkLocked };
  const isEnergyDrinkLocked = (playerId: string): boolean => {
    const lockedUntil = newEnergyDrinkLocked[playerId];
    return !!lockedUntil && gameTimeSec < lockedUntil;
  };
  // ═══ ENERGY DRINK: PendingForm one-tick boost ═══
  if (state.energyDrinkPendingForm) {
    const pid = state.energyDrinkPendingForm;
    ensureForm(pid);
    // Clutch amplification: +0.06 in high clutch, +0.04 otherwise
    const isHighClutch = newQuarter === 4 && newClock <= 60 && Math.abs(state.userScore - state.aiScore) <= 5;
    newFormRating[pid] = clampForm(newFormRating[pid] + (isHighClutch ? 0.06 : 0.04));
  }

  // ═══ STEP 1: BENCH RECOVERY + BENCH FORM NORMALIZATION ═══
  const activeIds = new Set([...userLineup.map(p => p.id), ...aiLineup.map(p => p.id)]);
  allUserRoster.forEach(p => {
    if (!activeIds.has(p.id)) {
      const benchRecovery = state.isHomeGame ? STAMINA_CONFIG.recovery.benchHomePerTick : STAMINA_CONFIG.recovery.benchAwayPerTick;
      newStamina[p.id] = recoverToMax(p, benchRecovery, newStamina);
      // Bench form normalization: drift toward 1.0
      ensureForm(p.id);
      const f = newFormRating[p.id];
      if (f > 1.0) newFormRating[p.id] = clampForm(f - 0.003);
      else if (f < 1.0) newFormRating[p.id] = clampForm(f + 0.003);
    }
  });

  // Recover stamina for AI bench players as well!
  aiTeamObj.roster.forEach(p => {
    if (!activeIds.has(p.id)) {
      const benchRecovery = !state.isHomeGame ? STAMINA_CONFIG.recovery.benchHomePerTick : STAMINA_CONFIG.recovery.benchAwayPerTick;
      newStamina[p.id] = recoverToMax(p, benchRecovery, newStamina);
      ensureForm(p.id);
      const f = newFormRating[p.id];
      if (f > 1.0) newFormRating[p.id] = clampForm(f - 0.003);
      else if (f < 1.0) newFormRating[p.id] = clampForm(f + 0.003);
    }
  });

  // Quarter break form normalization (all active players drift 0.01 toward 1.0)
  if (quarterEnded) {
    [...userLineup, ...aiLineup].forEach(p => {
      ensureForm(p.id);
      const f = newFormRating[p.id];
      if (f > 1.0) newFormRating[p.id] = clampForm(f - 0.01);
      else if (f < 1.0) newFormRating[p.id] = clampForm(f + 0.01);
    });
  }

  // ═══ STEP 2: BASE STAMINA DECAY (REBALANCED FOR REAL NBA FATIGUE) ═══
  const decayPlayer = (p: Player) => {
    let c = newStamina[p.id] ?? 100;
    
    // 1. Time decay: scales dynamically with play clock elapsed (calibrated for high tactical rotation needs)
    // A standard 15-second compressed play burns roughly ~0.33 base stamina.
    let baseLoss = timeElapsed * (STAMINA_CONFIG.movement.normalPerSecond + Math.random() * STAMINA_CONFIG.movement.randomPerSecond);
    
    // 2. Pace fatigue multiplier (high sprint transition play drains extra energy)
    if (pace === 'fastbreak') baseLoss *= STAMINA_CONFIG.movement.fastbreak;       // Fastbreak sprint tax
    else if (pace === 'early_offense') baseLoss *= STAMINA_CONFIG.movement.earlyOffense; // Early transition tax
    if (state.quarter >= 5) baseLoss *= STAMINA_CONFIG.movement.overtime;
    
    // 3. Muscle exhaustion curve: tired players tire out faster
    if (c < 68) baseLoss *= 1.15; // Mild fatigue acceleration
    if (c < 45) baseLoss *= 1.30; // Severe fatigue acceleration
    
    c -= baseLoss;
    newStamina[p.id] = Math.max(0, Math.min(getPlayerMaxStamina(p), c));
  };
  userLineup.forEach(decayPlayer);
  aiLineup.forEach(decayPlayer);

  // Road fatigue tax: Away team active players drain extra 0.08 stamina per play (travel fatigue)
  if (!state.isHomeGame) {
    userLineup.forEach(p => { newStamina[p.id] = Math.max(0, (newStamina[p.id] ?? 100) - STAMINA_CONFIG.movement.road); });
  } else {
    aiLineup.forEach(p => { newStamina[p.id] = Math.max(0, (newStamina[p.id] ?? 100) - STAMINA_CONFIG.movement.road); });
  }
  tryColdTimeout(userLineup, true);
  tryColdTimeout(aiLineup, false);
  applyPressureCoach(userLineup, aiLineup, true);
  applyPressureCoach(aiLineup, userLineup, false);
  applyHookedTax(userLineup, true);
  applyHookedTax(aiLineup, false);
  applyGreenSupport(userLineup, true);
  applyGreenSupport(aiLineup, false);
  [...userLineup, ...aiLineup].forEach(p => {
    const team = userLineup.some(u => u.id === p.id) ? userLineup : aiLineup;
    const isUserTeam = team === userLineup;
    const currentStaminaPct = staminaPct(p);
    const ironMotorIdentity = getStaminaRating(p);
    const ironMotorTriggerRate = Math.max(60, Math.min(95, 55 + ironMotorIdentity * 0.40));
    if (hasBaseSkill(p, "Iron Motor") && currentStaminaPct <= 70 && Math.random() * 1000 < ironMotorTriggerRate) {
      const ironMotorScale = 0.85 + (ironMotorIdentity / 100) * 0.30;
      recoverSkillStamina(p, 12 * ironMotorScale);
      if (currentStaminaPct <= 45) skillLog(`${p.name}'s Iron Motor restores stamina`, isUserTeam);
    }
  });

  // 4. Quarter Break Recovery: applied cleanly to the entire team at quarter transition
  if (quarterEnded) {
    const isHalftime = state.quarter === 2;
    const breakRecovery = isHalftime ? STAMINA_CONFIG.recovery.halftime : STAMINA_CONFIG.recovery.quarterBreak;
    
    allUserRoster.forEach(p => {
      newStamina[p.id] = recoverToMax(p, breakRecovery, newStamina);
    });
    aiTeamObj.roster.forEach(p => {
      newStamina[p.id] = recoverToMax(p, breakRecovery, newStamina);
    });
  }

  // ═══ STEP 3: CHECK STRATEGY CONDITIONS (Layer 3) ═══
  let currentOff = state.userOffStrategy;
  let currentDef = state.userDefStrategy;
  const userAvg = avgStamina(userLineup, newStamina);

  // OOP detection + narrative (fires ~every 10 ticks when OOP active)
  const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const oopPlayers = userLineup.filter((p, i) => p.position !== SLOTS[i]);
  if (oopPlayers.length > 0 && Math.random() < 0.1) {
    const oop = oopPlayers[0];
    const slot = SLOTS[userLineup.indexOf(oop)];
    warnings.push(`ALERT: ${oop.name} (${oop.position}) playing out of position at ${slot}`);
  }

  // ISO check
  if (currentOff === "Isolation (ISO)") {
    const star = [...userLineup].sort((a, b) => b.ovr - a.ovr)[0];
    if (staminaPct(star) < 40) {
      currentOff = "Motion Offense";
      newEvents.push(makeEvent(newQuarter, newClock, strategyRevertText("Isolation (ISO)", "Motion Offense", star.name), true));
    }
  }

  // Pick & Roll check
  if (currentOff === "Pick & Roll") {
    const pg = userLineup.find(p => p.position === 'PG');
    const big = userLineup.find(p => p.position === 'C' || p.position === 'PF');
    if (pg && big && (staminaPct(pg) < 45 || staminaPct(big) < 45)) {
      const tired = staminaPct(pg) < 45 ? pg : big!;
      warnings.push(`Pick & Roll DEGRADED — ${tired.name} fatigued`);
    }
  }

  // 5-Out check
  if (currentOff === "5-Out Spacing" && userAvg < 55) {
    warnings.push("5-Out Spacing DEGRADED — team too fatigued for spacing");
  }

  // Run & Gun check
  if (currentOff === "Run & Gun") {
    if (userAvg < 50) {
      currentOff = "Motion Offense";
      newEvents.push(makeEvent(newQuarter, newClock, strategyRevertText("Run & Gun", "Motion Offense", "Team"), true));
    } else if (userAvg < 65) {
      warnings.push("Run & Gun DEGRADED — team losing transition speed");
    }
  }

  // Pace & Space check
  if (currentOff === "Pace & Space") {
    const sg = userLineup.find(p => p.position === 'SG');
    const sf = userLineup.find(p => p.position === 'SF');
    if (sg && sf && (staminaPct(sg) < 45 || staminaPct(sf) < 45)) {
      const tired = staminaPct(sg) < 45 ? sg : sf!;
      warnings.push(`Pace & Space DEGRADED — shooter ${tired.name} fatigued`);
    }
  }

  // Outside Shoot check
  if (currentOff === "Outside Shoot") {
    const pg = userLineup.find(p => p.position === 'PG');
    const sg = userLineup.find(p => p.position === 'SG');
    if (pg && sg && (staminaPct(pg) < 40 || staminaPct(sg) < 40)) {
      const tired = staminaPct(pg) < 40 ? pg : sg!;
      warnings.push(`Outside Shoot DEGRADED — perimeter threat ${tired.name} fatigued`);
    }
  }

  // Corner 3s check
  if (currentOff === "Corner 3s") {
    const sg = userLineup.find(p => p.position === 'SG');
    const sf = userLineup.find(p => p.position === 'SF');
    if (sg && sf && (staminaPct(sg) < 40 || staminaPct(sf) < 40)) {
      const tired = staminaPct(sg) < 40 ? sg : sf!;
      warnings.push(`Corner 3s DEGRADED — corner shooter ${tired.name} fatigued`);
    }
  }

  // Inside Score check
  if (currentOff === "Inside Score") {
    const pf = userLineup.find(p => p.position === 'PF');
    const c = userLineup.find(p => p.position === 'C');
    if (pf && c && (staminaPct(pf) < 40 || staminaPct(c) < 40)) {
      const tired = staminaPct(pf) < 40 ? pf : c!;
      warnings.push(`Inside Score DEGRADED — paint physical presence ${tired.name} fatigued`);
    }
  }

  // Hawk Entry check
  if (currentOff === "Hawk Entry") {
    const sf = userLineup.find(p => p.position === 'SF');
    const pf = userLineup.find(p => p.position === 'PF');
    if (sf && pf && (staminaPct(sf) < 40 || staminaPct(pf) < 40)) {
      const tired = staminaPct(sf) < 40 ? sf : pf!;
      warnings.push(`Hawk Entry DEGRADED — cutter/screener ${tired.name} fatigued`);
    }
  }

  // Outside Cut Entry check
  if (currentOff === "Outside Cut Entry") {
    const sf = userLineup.find(p => p.position === 'SF');
    const sg = userLineup.find(p => p.position === 'SG');
    if (sf && sg && (staminaPct(sf) < 40 || staminaPct(sg) < 40)) {
      const tired = staminaPct(sf) < 40 ? sf : sg!;
      warnings.push(`Outside Cut Entry DEGRADED — wing playmaker/cutter ${tired.name} fatigued`);
    }
  }

  // Princeton Offense check
  if (currentOff === "Princeton Offense" && userAvg < 50) {
    currentOff = "Outside Shoot";
    newEvents.push(makeEvent(newQuarter, newClock, strategyRevertText("Princeton Offense", "Outside Shoot", "Team"), true));
  }

  // Switch Defense auto-revert
  if (currentDef === "Switch Defense") {
    const weak = userLineup.find(p => staminaPct(p) < 40);
    if (weak) {
      currentDef = "Man-to-Man";
      newEvents.push(makeEvent(newQuarter, newClock, strategyRevertText("Switch Defense", "Man-to-Man", weak.name), true));
    }
  }

  // Full-court press auto-revert
  if (currentDef === "Full-court press" || currentDef === "Full-Court Press") {
    if (userAvg < 40) {
      currentDef = "Man-to-Man";
      newEvents.push(makeEvent(newQuarter, newClock, strategyRevertText(currentDef, "Man-to-Man", "Team"), true));
    } else if (userAvg < 55) {
      warnings.push("Full-court press DEGRADED — low team stamina for press");
    }
  }

  // Half-court press auto-revert
  if (currentDef === "Half-court press" || currentDef === "Half-Court Press") {
    if (userAvg < 45) {
      currentDef = "Man-to-Man";
      newEvents.push(makeEvent(newQuarter, newClock, strategyRevertText(currentDef, "Man-to-Man", "Team"), true));
    } else if (userAvg < 60) {
      warnings.push("Half-court press DEGRADED — team too fatigued to trap sideline");
    }
  }

  // Protect the Lane check
  if (currentDef === "Protect the Lane") {
    const pf = userLineup.find(p => p.position === 'PF');
    const c = userLineup.find(p => p.position === 'C');
    if (pf && c && (staminaPct(pf) < 40 || staminaPct(c) < 40)) {
      const tired = staminaPct(pf) < 40 ? pf : c!;
      warnings.push(`Protect the Lane DEGRADED — rim protectors fatigued (${tired.name})`);
    }
  }

  // 3-2 Zone check
  if (currentDef === "3-2 Zone" && userAvg < 50) {
    warnings.push("3-2 Zone DEGRADED — team too slow to cover the wings");
  }

  // 1-3-1 Zone check
  if (currentDef === "1-3-1 Zone" && userAvg < 50) {
    currentDef = "Man-to-Man";
    newEvents.push(makeEvent(newQuarter, newClock, strategyRevertText("1-3-1 Zone", "Man-to-Man", "Team"), true));
  }

  // Blitz/Trap degradation
  if (currentDef === "Blitz/Trap" && userAvg < 50) {
    warnings.push("Blitz/Trap DEGRADED — team too fatigued to trap");
  }

  // ═══ STEP 4: RECALCULATE TEAM STATS (Layer 4) ═══
  // ISO scaling
  let offMult = 1.0;
  if (currentOff === "Isolation (ISO)") {
    const star = [...userLineup].sort((a, b) => b.ovr - a.ovr)[0];
    const ss = newStamina[star.id] ?? 100;
    offMult = ss >= 70 ? 1.05 : ss >= 50 ? 1.0 : ss >= 30 ? 0.92 : 0.85;
  }
  if (currentOff === "Pick & Roll") {
    const pg = userLineup.find(p => p.position === 'PG');
    const big = userLineup.find(p => p.position === 'C' || p.position === 'PF');
    if (pg && big && (staminaPct(pg) < 45 || staminaPct(big) < 45)) offMult = 0.98 / 1.02;
  }
  if (currentOff === "Run & Gun") {
    offMult = userAvg >= 75 ? 1.06 : userAvg >= 60 ? 1.02 : 0.94;
  }
  if (currentOff === "Pace & Space") {
    const sg = userLineup.find(p => p.position === 'SG');
    const sf = userLineup.find(p => p.position === 'SF');
    const avgShooterStamina = ((newStamina[sg?.id ?? ''] ?? 100) + (newStamina[sf?.id ?? ''] ?? 100)) / 2;
    offMult = avgShooterStamina >= 70 ? 1.04 : avgShooterStamina >= 50 ? 1.00 : 0.92;
  }
  if (currentOff === "Outside Shoot") {
    const pg = userLineup.find(p => p.position === 'PG');
    const sg = userLineup.find(p => p.position === 'SG');
    const avgPerimeterStam = ((newStamina[pg?.id ?? ''] ?? 100) + (newStamina[sg?.id ?? ''] ?? 100)) / 2;
    offMult = avgPerimeterStam >= 70 ? 1.04 : avgPerimeterStam >= 50 ? 1.00 : 0.92;
  }
  if (currentOff === "Corner 3s") {
    const sg = userLineup.find(p => p.position === 'SG');
    const sf = userLineup.find(p => p.position === 'SF');
    const avgShooterStam = ((newStamina[sg?.id ?? ''] ?? 100) + (newStamina[sf?.id ?? ''] ?? 100)) / 2;
    offMult = avgShooterStam >= 70 ? 1.05 : avgShooterStam >= 50 ? 1.01 : 0.91;
  }
  if (currentOff === "Inside Score") {
    const pf = userLineup.find(p => p.position === 'PF');
    const c = userLineup.find(p => p.position === 'C');
    const avgBigStam = ((newStamina[pf?.id ?? ''] ?? 100) + (newStamina[c?.id ?? ''] ?? 100)) / 2;
    offMult = avgBigStam >= 70 ? 1.05 : avgBigStam >= 50 ? 1.01 : 0.90;
  }
  if (currentOff === "Hawk Entry") {
    const sf = userLineup.find(p => p.position === 'SF');
    const pf = userLineup.find(p => p.position === 'PF');
    const avgPostStam = ((newStamina[sf?.id ?? ''] ?? 100) + (newStamina[pf?.id ?? ''] ?? 100)) / 2;
    offMult = avgPostStam >= 68 ? 1.03 : avgPostStam >= 48 ? 1.00 : 0.93;
  }
  if (currentOff === "Outside Cut Entry") {
    const sf = userLineup.find(p => p.position === 'SF');
    const sg = userLineup.find(p => p.position === 'SG');
    const avgCutStam = ((newStamina[sf?.id ?? ''] ?? 100) + (newStamina[sg?.id ?? ''] ?? 100)) / 2;
    offMult = avgCutStam >= 70 ? 1.04 : avgCutStam >= 50 ? 1.00 : 0.92;
  }
  if (currentOff === "Princeton Offense") {
    offMult = userAvg >= 75 ? 1.05 : userAvg >= 60 ? 1.02 : 0.94;
  }

  const userOffLevel = state.strategyLevels?.[currentOff]?.level || 1;
  const userDefLevel = state.strategyLevels?.[currentDef]?.level || 1;
  const strategyOffMultiplier = 1.0 + (userOffLevel - 1) * 0.02;
  const strategyDefMultiplier = 1.0 + (userDefLevel - 1) * 0.02;

  // ─── TACTICAL COUNTER STRATEGY MODIFIERS ───
  let userCounterMult = 1.0;
  const userCounterObj = getCounterModifier(currentOff, state.aiDefStrategy);
  if (userCounterObj.offMult !== 1.0) {
    userCounterMult = userCounterObj.offMult;
    if (Math.random() < 0.12) {
      newEvents.push(makeEvent(newQuarter, newClock, `[COACH ADVANTAGE] ${userCounterObj.narrative}`, true));
    }
  }

  let aiCounterMult = 1.0;
  const aiCounterObj = getCounterModifier(state.aiOffStrategy, currentDef);
  if (aiCounterObj.offMult !== 1.0) {
    aiCounterMult = aiCounterObj.offMult;
    if (Math.random() < 0.12) {
      newEvents.push(makeEvent(newQuarter, newClock, `[COACH ADVANTAGE] ${aiCounterObj.narrative}`, true));
    }
  }

  const userEffRaw = computeEffective(userLineup, newStamina, currentOff, currentDef, offMult * strategyOffMultiplier * userCounterMult, strategyDefMultiplier);
  const userEff = {
    off: userEffRaw.off + newTeamSkillBuffs.user.offIQ,
    def: userEffRaw.def + newTeamSkillBuffs.user.defIQ,
  };
  const aiEffRaw = computeEffective(aiLineup, newStamina, state.aiOffStrategy, state.aiDefStrategy, aiCounterMult);
  const aiEff = {
    off: aiEffRaw.off + newTeamSkillBuffs.ai.offIQ,
    def: aiEffRaw.def + newTeamSkillBuffs.ai.defIQ,
  };

  // ═══ STEP 5: AI STRATEGY UPDATE (Layer 6) ═══
  const aiCoach = evaluateAICoach(state, aiLineup, userLineup, aiTeamObj.roster, aiTeamObj.name, newQuarter, newClock, gameTimeSec, state.difficulty);
  const aiOffStrat = aiCoach.aiOff;
  const aiDefStrat = aiCoach.aiDef;
  const lastAiChange = aiCoach.lastAiStrategyChange;
  const aiTimeoutsLeft = aiCoach.aiTimeoutsLeft;
  const hotFocusTarget = aiCoach.hotPlayerFocusTarget;
  const lastAiSubCheck = aiCoach.lastAiSubCheck;
  newEvents.push(...aiCoach.events);

  if (aiCoach.aiStaminaBoosts) {
    for (const [playerId, boost] of Object.entries(aiCoach.aiStaminaBoosts)) {
      const player = playerById.get(playerId);
      newStamina[playerId] = player ? recoverToMax(player, boost, newStamina) : Math.min(100, (newStamina[playerId] ?? 100) + boost);
    }
  }

  if (aiCoach.aiSub) {
    const idx = nextAiLineupIds.indexOf(aiCoach.aiSub.outId);
    const incomingPlayer = aiTeamObj.roster.find(p => p.id === aiCoach.aiSub!.inId);
    const outgoingPlayer = aiTeamObj.roster.find(p => p.id === aiCoach.aiSub!.outId);
    // Validate: only apply sub if incoming player's position matches the slot's expected position
    // The slot position is determined by the outgoing player's position (or the fixed slot order)
    const slotPositions = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
    const slotPos = slotPositions[idx] ?? outgoingPlayer?.position;
    const positionMatch = incomingPlayer && (incomingPlayer.position === slotPos || incomingPlayer.position === outgoingPlayer?.position);
    if (idx !== -1 && incomingPlayer && positionMatch) {
      nextAiLineupIds[idx] = aiCoach.aiSub.inId;
      // Re-resolve aiLineup — do NOT filter(Boolean), keep exact slots
      const resolved = nextAiLineupIds.map(id => aiTeamObj.roster.find(p => p.id === id));
      if (resolved.every(p => p !== undefined)) {
        aiLineup = resolved as Player[];
      }
      // else: sub failed validation silently — keep current lineup intact
    }
  }

  // AI timeout stamina boost (if AI called a timeout this tick)
  if (aiTimeoutsLeft < state.aiTimeoutsLeft) {
    aiLineup.forEach(p => { newStamina[p.id] = recoverToMax(p, STAMINA_CONFIG.recovery.timeout, newStamina); });
    nextLastPlayCategory = 'made_shot';
  }

  // Hot player defensive focus: +6% DEF vs hot player's pos, +10% vs ISO star
  let aiIsoCounter = 1.0;
  if (hotFocusTarget && state.hotPlayers[hotFocusTarget]) {
    const isISO = currentOff === "Isolation (ISO)";
    aiIsoCounter = isISO ? 1.10 : 1.06;
  }

  // ═══ STEP 6: DETERMINE POSSESSION ═══
  const eUO = userEff.off;
  const eAD = aiEff.def * aiIsoCounter;
  const eAO = aiEff.off;
  const eUD = userEff.def;
  const isUserPoss = currentPossession === 'user';

  // ═══ STEP 7: RESOLVE SCORING (Layer 2) ═══
  let momentumActive = state.momentumActive;
  const momentumEndTime = state.momentumEndTime;
  if (momentumActive && Date.now() >= momentumEndTime) {
    momentumActive = false;
    newEvents.push(makeEvent(newQuarter, newClock, "Momentum fades... back to business.", true));
  }
  const momentumBonus = momentumActive ? 1.08 : 1.0;
  const hasHotUser = userLineup.some(p => state.hotPlayers[p.id]);
  const hasHotAi = aiLineup.some(p => state.hotPlayers[p.id]);

  // ═══ STEP 8: HOME COURT ADVANTAGE (Layer 1 — Single Source of Truth) ═══
  const userIsHome = state.isHomeGame;

  // ═══ STEP 8 LAYER 2: HOME COURT STATE OBJECT ═══
  const scoreDiff = Math.abs(state.userScore - state.aiScore);
  const clutchSituation = {
    active: (newQuarter === 4 && newClock <= 120 && scoreDiff <= 8) || newQuarter >= 5,
    intensity: newQuarter >= 5 && newClock <= 60 && scoreDiff <= 5 ? 'high' as const
      : newQuarter >= 5 ? 'medium' as const
      : newQuarter === 4 && newClock <= 60 && scoreDiff <= 5 ? 'high' as const
      : newQuarter === 4 && newClock <= 120 && scoreDiff <= 8 ? 'medium' as const
      : 'none' as const,
    scoreDiff,
    isUserLeading: state.userScore > state.aiScore,
  };

  // crowdEnergy always forced to 1.0 in clutch (Layer 6 compound rule)
  // Base crowd energy mirrors home team momentum, reacting dynamically to runs
  const homeMomentum = userIsHome ? state.userMomentum : state.aiMomentum;
  const baseCrowdEnergy = Math.max(0.20, homeMomentum / 100);
  const effectiveCrowdEnergy = clutchSituation.active ? 1.0 : baseCrowdEnergy;

  const homeCourt = {
    userIsHome,
    homeTeam: userIsHome ? 'user' : 'ai' as 'user' | 'ai',
    crowdEnergy: newQuarter >= 5 ? 1.0 : effectiveCrowdEnergy,
    // Rally mode: home crowd rallies when HOME team is losing by ≤10 or entire OT
    rallyMode: newQuarter >= 5 ? true : (userIsHome
      ? state.userScore < state.aiScore && scoreDiff <= 10
      : state.aiScore < state.userScore && scoreDiff <= 10),
  };

  // ═══ STEP 8 LAYER 3: HOME COURT SCORING HELPERS ═══
  const getHomeCourtBoost = (player: Player): number => {
    const base: Record<string, number> = {
      'Mythic':    0.005,
      'Legendary': 0.010,
      'Epic':      0.015,
      'Rare':      0.020,
      'Common':    0.025,
    };
    const rarityBoost = base[player.rarity] ?? 0.015;
    const energyScaled = rarityBoost * homeCourt.crowdEnergy;
    const rallyBonus = homeCourt.rallyMode ? 0.01 : 0.00;
    return Math.min(0.025, energyScaled + rallyBonus);
  };

  const getAwayPenalty = (player: Player): number => {
    const base: Record<string, number> = {
      'Mythic':    0.005,
      'Legendary': 0.008,
      'Epic':      0.010,
      'Rare':      0.012,
      'Common':    0.015,
    };
    const rarityPenalty = base[player.rarity] ?? 0.010;
    const energyScaled = rarityPenalty * homeCourt.crowdEnergy;
    const rallyPenalty = homeCourt.rallyMode ? 0.01 : 0.00;
    return Math.min(0.020, energyScaled + rallyPenalty);
  };

  let pointsScored = 0;
  let activePlayerId = "";
  let scoringTeamIsUser = isUserPoss;
  type ShotStaminaOutcome = 'make' | 'miss' | 'block' | 'foul';
  type DefensiveEffortType = 'failedBlock' | 'failedSteal' | 'pressChase' | 'trapRotation';
  const shotStaminaAttempts: Array<{ playerId: string; shotType: ShotType; is3PT: boolean; outcome: ShotStaminaOutcome; context?: 'normal' | 'oreb' }> = [];
  const defensiveStaminaAttempts: Array<{ playerId: string; shotType: ShotType; outcome: ShotStaminaOutcome; is3PT: boolean }> = [];
  const defensiveEffortAttempts: Array<{ playerId: string; type: DefensiveEffortType }> = [];
  const actionWorkload = {
    possessionTeam: currentPossession,
    possessionStyle: activeOffStrategy,
    defensiveStrategy: currentPossession === 'user' ? state.aiDefStrategy : state.userDefStrategy,
    isTransition: pace === 'fastbreak' || pace === 'early_offense',
    isLateClock: pace === 'late_clock',
    isOvertime: state.quarter >= 5,
    shots: shotStaminaAttempts,
    defensiveContests: defensiveStaminaAttempts,
    defensiveEfforts: defensiveEffortAttempts,
    rebounderId: undefined as string | undefined,
  };
  const trackShotStamina = (playerId: string, shotType: ShotType, is3PT: boolean, outcome: ShotStaminaOutcome, context: 'normal' | 'oreb' = 'normal') => {
    shotStaminaAttempts.push({ playerId, shotType, is3PT, outcome, context });
  };
  const trackDefensiveStamina = (player: Player | undefined, shotType: ShotType, is3PT: boolean, outcome: ShotStaminaOutcome) => {
    if (player) defensiveStaminaAttempts.push({ playerId: player.id, shotType, is3PT, outcome });
  };
  const trackDefensiveEffort = (player: Player | undefined, type: DefensiveEffortType) => {
    if (player) defensiveEffortAttempts.push({ playerId: player.id, type });
  };

  // ═══ TURNOVER HELPERS ═══
  const TOV_W: Record<string, number> = { PG: 1.4, SG: 1.2, SF: 1.0, PF: 0.7, C: 0.5 };
  const pickCommitter = (lineup: Player[]): Player => {
    const ws = lineup.map(p => {
      const base = TOV_W[p.position] || 1.0;
      const plyMod = 1.0 - ((getHandleRating(p) - 50) / 100);
      return Math.max(0.1, base * plyMod);
    });
    const tw = ws.reduce((s, w) => s + w, 0);
    let r = Math.random() * tw;
    for (let i = 0; i < lineup.length; i++) { r -= ws[i]; if (r <= 0) return lineup[i]; }
    return lineup[lineup.length - 1];
  };
  const getTovStamMod = (avg: number) => avg >= 70 ? 1.0 : avg >= 50 ? 1.10 : avg >= 30 ? 1.22 : 1.35;
  const unforcedTovMsg = (c: Player, team: string): string => {
    const msgs = [
      `${c.name} turns it over: bad pass`,
      `${c.name} called for the travel`,
      `Shot clock violation: ${team}`,
      `${c.name} loses the handle`,
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  };
  let turnoverOccurred = false;
  let blockOccurred = false;

  // ═══ PILLAR 3: ROLLING USAGE WINDOW (Hero Ball Tax) ═══
  // Track rolling last 20 possessions per player. If any player exceeds 35% usage rate
  // within the window, apply a progressive defensive focus penalty. [DESIGN PARAMETER]
  const USAGE_WINDOW = 20;
  const newPossessionHistory = [...(state.possessionHistory || [])].slice(-USAGE_WINDOW);
  const getUsageMod = (playerId: string, team: 'user' | 'ai'): number => {
    const window = newPossessionHistory.filter(h => h.team === team);
    if (window.length < 5) return 1.0; // not enough data yet
    const playerUses = window.filter(h => h.playerId === playerId).length;
    const usageRate = playerUses / window.length;
    // 35% threshold from plan [DESIGN PARAMETER]
    if (usageRate >= 0.50) return 0.82; // extreme hero ball
    if (usageRate >= 0.42) return 0.88; // heavy usage
    if (usageRate >= 0.35) return 0.94; // above threshold — defense keying in
    return 1.0;
  };

  // ═══ BLOCK HELPER ═══
  const BLK_W: Record<string, number> = { C: 1.8, PF: 1.3, SF: 0.9, SG: 0.5, PG: 0.3 };
  const pickBlocker = (lineup: Player[]): Player => {
    const ws = lineup.map(p => BLK_W[p.position] || 0.9);
    const tw = ws.reduce((s, w) => s + w, 0);
    let r = Math.random() * tw;
    for (let i = 0; i < lineup.length; i++) { r -= ws[i]; if (r <= 0) return lineup[i]; }
    return lineup[lineup.length - 1];
  };
  const tryBlock = (defLineup: Player[], shooter: Player, isDefUser: boolean, shotType: ShotType = 'pullUpMid', is3PT = false): boolean => {
    const candidate = pickBlocker(defLineup);
    const rimWardenTriggered = rollBaseSkill(defLineup, "Rim Warden", newStamina);
    const baseBlockChance = (getBlockRating(candidate) / 100) * (rimWardenTriggered ? 0.095 : 0.055);
    const stamMod = getPlayerStaminaMod(candidate, newStamina[candidate.id]);
    const blockChance = baseBlockChance * stamMod;
    const blockRoll = Math.random();
    if (blockRoll < blockChance) {
      // Block occurred!
      blockOccurred = true;
      ensureStats(candidate.id);
      newPlayerStats[candidate.id].BLK = (newPlayerStats[candidate.id].BLK ?? 0) + 1;
      // Form updates
      ensureForm(candidate.id);
      newFormRating[candidate.id] = clampForm(newFormRating[candidate.id] + 0.04);
      ensureForm(shooter.id);
      newFormRating[shooter.id] = clampForm(newFormRating[shooter.id] - 0.03);
      // Play-by-play
      const clutch = newQuarter === 4 && Math.abs(state.userScore - state.aiScore) <= 5;
      const isBigOnSmall = (candidate.position === 'C' || candidate.position === 'PF') && (shooter.position === 'PG' || shooter.position === 'SG');
      const isISO = isDefUser ? currentDef === 'Isolation (ISO)' : currentOff === 'Isolation (ISO)';
      let msg: string;
      if (clutch) {
        const teamName = isDefUser ? 'My Team' : aiTeamObj.name;
        msg = `BLOCK: ${candidate.name} keeps ${teamName} alive!`;
      } else if (isISO) {
        msg = `BLK: ${candidate.name} rejects ${shooter.name}. ISO shut down`;
      } else if (isBigOnSmall) {
        msg = `BLK: ${candidate.name} sends it to the stands!`;
      } else {
        msg = `BLK: ${candidate.name} swats it away!`;
      }
      newEvents.push(makeEvent(newQuarter, newClock, msg, isDefUser));
      if (rimWardenTriggered) {
        skillLog(`${candidate.name}'s Rim Warden powers the block`, isDefUser);
      }
      applyFiveManSqueeze(defLineup, isDefUser ? aiLineup : userLineup, isDefUser);
      eventIndicator = { playerId: candidate.id, type: 'BLK' };
      return true;
    }
    const failedJumpWindow = is3PT ? 0.10 : 0.18;
    if (blockRoll < blockChance + failedJumpWindow) {
      trackDefensiveEffort(candidate, 'failedBlock');
    }
    return false;
  };

  // ═══ REBOUND HELPER ═══
  const REB_W: Record<string, number> = { C: 2.0, PF: 1.6, SF: 1.0, SG: 0.6, PG: 0.4 };
  const teamRebScore = (lineup: Player[]): number =>
    lineup.reduce((s, p) => s + getReboundRating(p) * (REB_W[p.position] || 1.0) * getPlayerStaminaMod(p, newStamina[p.id]), 0);
  const getOffensiveReboundChance = (attReb: number, defReb: number, glassScale: number, barrierScale: number): number => {
    const share = attReb / Math.max(1, attReb + defReb);
    const matchupSwing = (share - 0.5) * 0.34;
    return Math.min(Math.max(0.23 + matchupSwing + (glassScale > 0 ? 0.055 * glassScale : 0) - (barrierScale > 0 ? 0.06 * barrierScale : 0), 0.10), 0.36);
  };
  const pickRebounder = (lineup: Player[]): Player => {
    const ws = lineup.map(p => (REB_W[p.position] || 1.0) * getReboundRating(p));
    const tw = ws.reduce((s, w) => s + w, 0);
    let r = Math.random() * tw;
    for (let i = 0; i < lineup.length; i++) { r -= ws[i]; if (r <= 0) return lineup[i]; }
    return lineup[lineup.length - 1];
  };
  const awardReb = (p: Player, type: 'OREB' | 'DREB') => {
    ensureStats(p.id);
    if (type === 'OREB') {
      newPlayerStats[p.id].OREB = (newPlayerStats[p.id].OREB ?? 0) + 1;
      ensureForm(p.id); newFormRating[p.id] = clampForm(newFormRating[p.id] + 0.015);
    } else {
      newPlayerStats[p.id].DREB = (newPlayerStats[p.id].DREB ?? 0) + 1;
      ensureForm(p.id); newFormRating[p.id] = clampForm(newFormRating[p.id] + 0.01);
    }
    newPlayerStats[p.id].REB = (newPlayerStats[p.id].OREB ?? 0) + (newPlayerStats[p.id].DREB ?? 0);
    actionWorkload.rebounderId = p.id;
  };

  // ═══ FOUL HELPERS ═══
  const getFoulStamMod = (avg: number) => avg >= 70 ? 1.0 : avg >= 50 ? 1.12 : avg >= 30 ? 1.28 : 1.45;
  const FOUL_W: Record<string, number> = { PG: 1.4, SG: 1.2, SF: 1.0, PF: 0.8, C: 0.6 };
  const pickFoulCommitter = (lineup: Player[]): Player => {
    const eligible = lineup.filter(p => (newPlayerStats[p.id]?.FOL ?? 0) < 4);
    const pool = eligible.length > 0 ? eligible : lineup;
    const ws = pool.map(p => (FOUL_W[p.position] || 1.0) * (1.0 / (p.defense / 100)));
    const tw = ws.reduce((s, w) => s + w, 0);
    let r = Math.random() * tw;
    for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  };

  const getAssistChance = (passer: Player): number => {
    return Math.max(0.38, Math.min(0.72, 0.38 + ((getAssistRating(passer) ?? 70) / 330)));
  };

  // ═══ STEP 7: CLUTCH HELPERS (Layers 2, 3, 8) ═══
  const getClutchRating = (player: Player): number => {
    const base: Record<string, number> = {
      'Mythic':    0.13,
      'Legendary': 0.09,
      'Epic':      0.04,
      'Rare':      0.00,
      'Common':   -0.03,
    };
    return base[player.rarity] ?? 0.00;
  };

  const getClutchMod = (player: Player, situation: typeof clutchSituation): number => {
    if (!situation.active) return 1.0;
    const clutchRating = getClutchRating(player);
    const intensityMult = situation.intensity === 'high' ? 1.4 : 1.0;
    const currentForm = newFormRating[player.id] ?? 1.0;
    const formAmplification = currentForm >= 1.10 ? 0.03 : currentForm <= 0.90 ? -0.02 : 0.00;
    const staminaOverride = 0.04;
    const totalMod = 1.0 + (clutchRating * intensityMult) + formAmplification + staminaOverride;
    return Math.max(0.88, Math.min(1.20, totalMod));
  };

  
  
  const newFouledOut = [...state.fouledOut];
  let nonShootingFoulToFT = false;
  let shootingFoulOccurred = false;
  let ftSequenceResult: MatchState['ftSequence'] = null;
  let pendingAutoSubResult: MatchState['pendingAutoSub'] = null;

  const updateBonusState = () => {
    newIsInBonus.user = newTeamFouls.user[newQuarter - 1] >= 5;
    newIsInBonus.ai = newTeamFouls.ai[newQuarter - 1] >= 5;
  };

  // Reset bonus at quarter transition (new quarter slot starts at 0)
  if (quarterEnded) {
    updateBonusState();
    newSkillMarks = {};
    newMarkImmunity = {};
  }

  const getFTChance = (shooterId: string): number => {
    const shooter = userLineup.find(p => p.id === shooterId) || aiLineup.find(p => p.id === shooterId);
    const ftRating = shooter ? getFreeThrowRating(shooter) : 75;
    const normalizedFt = ftRating > 100 ? 60 + ((ftRating - 100) * 0.45) : ftRating;
    const baseChance = Math.min(0.90, Math.max(0.62, 0.74 + (normalizedFt - 75) * 0.0025));
    
    const stm = shooter ? getPlayerStaminaMod(shooter, newStamina[shooterId]) : getStaminaMod(newStamina[shooterId] ?? 100);
    let penalty = 0;
    if (stm >= 1.0) penalty = 0;
    else if (stm >= 0.95) penalty = -0.03;
    else if (stm >= 0.88) penalty = -0.07;
    else if (stm >= 0.80) penalty = -0.11;
    else penalty = -0.15;
    const hotBonus = (newFormRating[shooterId] ?? 1.0) >= 1.10 ? 0.05 : 0;
    const ftClutchRating = shooter ? getClutchRating(shooter) : 0;
    const clutchBonus = clutchSituation.active
      ? ftClutchRating * (clutchSituation.intensity === 'high' ? 1.3 : 1.0)
      : 0;

    // ─── Layer 4 (Step 8): Crowd noise penalty for AWAY team FT shooters ───
    const shooterIsAway = userIsHome
      ? aiLineup.some(p => p.id === shooterId)   // user is home → AI is away
      : userLineup.some(p => p.id === shooterId); // AI is home → user is away
    const crowdNoisePenalty = shooterIsAway
      ? (() => {
          const base = 0.03;
          const energyPenalty = base * homeCourt.crowdEnergy;
          // Layer 6: Away FT clutchAmplifier always 'high' during clutch (hostile crowd never quiets)
          const clutchAmplifier = clutchSituation.active ? 2.0
            : clutchSituation.intensity === 'medium' ? 1.5
            : 1.0;
          const rarityResistance: Record<string, number> = {
            'Mythic':    0.30,
            'Legendary': 0.45,
            'Epic':      0.60,
            'Rare':      0.75,
            'Common':    0.90,
          };
          const resistance = rarityResistance[shooter?.rarity ?? 'Common'];
          return energyPenalty * clutchAmplifier * resistance;
        })()
      : 0; // Home team FTs — no crowd noise penalty

    return Math.max(0.50, Math.min(0.95, baseChance + penalty + hotBonus + clutchBonus - crowdNoisePenalty));
  };

  const runFTSequence = (shooterId: string, shooterName: string, totalShots: number, isAnd1: boolean,
    committerName: string, committerFouls: number, isUserTeam: boolean) => {
    const results: ('make' | 'miss')[] = [];
    const ftChance = getFTChance(shooterId);
    ensureStats(shooterId); ensureForm(shooterId);
    for (let i = 0; i < totalShots; i++) {
      if (Math.random() < ftChance) {
        results.push('make');
        newPlayerStats[shooterId].FTM += 1;
        newPlayerStats[shooterId].PTS += 1;
        newFormRating[shooterId] = clampForm(newFormRating[shooterId] + 0.02);
      } else {
        results.push('miss');
        newFormRating[shooterId] = clampForm(newFormRating[shooterId] - 0.025);
        // Clutch FT miss extra sting (Layer 5)
        if (clutchSituation.active && i === totalShots - 1) {
          newFormRating[shooterId] = clampForm(newFormRating[shooterId] - 0.04);
        }
      }
      newPlayerStats[shooterId].FTA += 1;
    }
    const ftm = results.filter(r => r === 'make').length;
    let summaryEvent;
    if (ftm === totalShots) {
      summaryEvent = makeEvent(newQuarter, newClock, `${shooterName} perfect from the line (${ftm}/${totalShots})`, isUserTeam);
    } else if (ftm === 0 && totalShots >= 2) {
      summaryEvent = makeEvent(newQuarter, newClock, `${shooterName} missed from the stripe (0/${totalShots})`, isUserTeam);
    } else {
      summaryEvent = makeEvent(newQuarter, newClock, `${shooterName} ${ftm}/${totalShots} from the line`, isUserTeam);
    }
    summaryEvent.isHiddenDuringFT = true;
    newEvents.push(summaryEvent);

    // Last FT missed & not And-1 → DREB
    if (results[results.length - 1] === 'miss' && !isAnd1) {
      const defLineup = isUserTeam ? aiLineup : userLineup;
      const dreb = pickRebounder(defLineup);
      awardReb(dreb, 'DREB');
      eventIndicator = { playerId: dreb.id, type: 'REB' };
      const rebEvent = makeEvent(newQuarter, newClock, `${dreb.name} grabs the board off the miss`, !isUserTeam);
      rebEvent.isHiddenDuringFT = true;
      newEvents.push(rebEvent);
    }
    ftSequenceResult = {
      shooterId, shooterName, totalShots, isAnd1, results,
      foulCommitterName: committerName, foulCommitterFouls: committerFouls, isUserTeam,
    };
    if (ftm > 0) { pointsScored += ftm; activePlayerId = shooterId; }
  };
  // ─── SUBTLE Broadcaster/Sideline strategy hint commentary (14% chance per possession resolution tick) ───
  if (Math.random() < 0.14) {
    const hintPrefixes = [
      "Sideline Analyst:",
      "Courtside Report:",
      "Broadcast Booth:",
      "Scouting Insight:",
      "Coaching Staff:"
    ];
    const prefix = hintPrefixes[Math.floor(Math.random() * hintPrefixes.length)];
    if (isUserPoss) {
      // User is on offense, AI is on defense. Hint at AI's current Defense Strategy!
      const hintMsg = getSubtleStrategyHint(state.aiDefStrategy, false);
      if (hintMsg) {
        newEvents.push(makeEvent(newQuarter, newClock, `${prefix} "${hintMsg}"`, true));
      }
    } else {
      // AI is on offense, user is on defense. Hint at AI's current Offense Strategy!
      const hintMsg = getSubtleStrategyHint(state.aiOffStrategy, true);
      if (hintMsg) {
        newEvents.push(makeEvent(newQuarter, newClock, `${prefix} "${hintMsg}"`, true));
      }
    }
  }

  if (isUserPoss) {
    if (shotClockViolationFired) {
      // Guaranteed shot clock violation
      const ballHandler = userLineup.find(p => p.position === 'PG') || userLineup[0];
      ensureStats(ballHandler.id);
      newPlayerStats[ballHandler.id].TOV = (newPlayerStats[ballHandler.id].TOV ?? 0) + 1;
      newFormRating[ballHandler.id] = clampForm((newFormRating[ballHandler.id] ?? 1.0) - 0.02);
      turnoverOccurred = true;
      newEvents.push(makeEvent(newQuarter, newClock,
        `Shot clock violation: ${ballHandler.name} held the ball too long. AI ball`, true
      ));
      nextPossessionTeam = 'ai';
      nextLastPlayCategory = 'turnover';
    } else {
    // ═══ PILLAR 6: TURNOVER CHECK — fires BEFORE shot math [NBA DATA: 11-14 TOV/game]
    // Base rate calibrated so each team turns it over ~12-13 times per 100 possessions.
    // Factors: playmaking quality, defensive pressure, shot clock urgency, stamina.
    const userAvgPly = userLineup.reduce((s, p) => s + getHandleRating(p), 0) / 5;
    // Base TOV rate: ~12% per possession baseline, scaled by ball-handling skill
    // (league avg playmaking ~72 → ~11-12% rate; poor playmaking → higher)
    const baseTOVRate = 0.085 * (80 / Math.max(55, userAvgPly));
    // Defensive pressure modifier (Pillar 4 interaction — Blitz/Trap forces more mistakes)
    const defPressureMod = state.aiDefStrategy === 'Blitz/Trap' ? 1.35
      : state.aiDefStrategy === 'Full-Court Press' ? 1.25
      : state.aiDefStrategy === 'Switch Defense' ? 1.08
      : 1.0;
    // Pillar 5 interaction — fatigued players are turnover-prone
    const tovStamMod = getTovStamMod(userAvg);
    // Late clock desperation forces risky passes [DESIGN PARAMETER]
    const lateClockMod = pace === 'late_clock' ? 1.30 : 1.0;
    let handsActivePressure = 1.0;
    if (rollBaseSkill(aiLineup, "Hands Active", newStamina)) {
      const holders = aiLineup.filter(p => p.baseSkills?.includes("Hands Active"));
      const maxStealRating = holders.length > 0 ? Math.max(...holders.map(p => getStealRating(p))) : 50;
      const handsActiveScale = 0.85 + (maxStealRating / 100) * 0.30;
      handsActivePressure = 1.18 * handsActiveScale;
    }
    let screenBreakerPressure = 1.0;
    if ((currentOff === "Pick & Roll" || currentOff === "Motion Offense") && rollBaseSkill(aiLineup, "Screen Breaker", newStamina)) {
      const holders = aiLineup.filter(p => hasBaseSkill(p, "Screen Breaker"));
      const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getOnBallDefenseRating(p))) : 50;
      const screenBreakerScale = 0.85 + (maxRating / 100) * 0.30;
      screenBreakerPressure = 1.12 * screenBreakerScale;
    }
    const cageStepPressure = rollSpecial(aiLineup, "Cage Step X", newStamina) ? 1.12 : 1.0;
    const finalTOVChance = Math.min(0.25, baseTOVRate * defPressureMod * tovStamMod * lateClockMod * handsActivePressure * screenBreakerPressure * cageStepPressure);
    if (Math.random() < finalTOVChance) {
      turnoverOccurred = true;
      const committer = pickCommitter(userLineup);
      if (cageStepPressure > 1) {
        newSkillMarks = addMark(newSkillMarks, newMarkImmunity, committer.id, "Hooked", "Cage Step X", 2);
        skillLog(`Cage Step X hooks ${committer.name}'s handle`, false);
      }
      activePlayerId = committer.id;
      ensureStats(committer.id);
      newPlayerStats[committer.id].TOV = (newPlayerStats[committer.id].TOV ?? 0) + 1;
      eventIndicator = { playerId: committer.id, type: 'TOV' };
      ensureForm(committer.id);
      newFormRating[committer.id] = clampForm(newFormRating[committer.id] - 0.035);
      const pfx = clutchSituation.active ? 'CRUCIAL TURNOVER — ' : '';
      if (Math.random() < 0.55) {
        // Weighted random steal selection — distributes steals across roster by defensive rating
        const stlWeights = aiLineup.map(p => getStealRating(p));
        const stlTotalW = stlWeights.reduce((s, w) => s + w, 0);
        let stlR = Math.random() * stlTotalW;
        let stl = aiLineup[aiLineup.length - 1];
        for (let si = 0; si < aiLineup.length; si++) { stlR -= stlWeights[si]; if (stlR <= 0) { stl = aiLineup[si]; break; } }
        ensureStats(stl.id); newPlayerStats[stl.id].STL += 1;
        stealPlayerId = stl.id;
        eventIndicator = { playerId: stl.id, type: 'STL' };
        ensureForm(stl.id); newFormRating[stl.id] = clampForm(newFormRating[stl.id] + 0.04);
        const iso = currentOff === "Isolation (ISO)";
        newEvents.push(makeEvent(newQuarter, newClock, `${pfx}STL: ${stl.name} ${iso ? 'strips ' + committer.name + '. ISO broken down' : 'picks off ' + committer.name}`, false));
        if (handsActivePressure > 1) skillLog(`${stl.name}'s Hands Active forced the steal window`, false);
        applyFiveManSqueeze(aiLineup, userLineup, false);
        nextPossessionTeam = 'ai';
        nextLastPlayCategory = 'steal';
      } else {
        newEvents.push(makeEvent(newQuarter, newClock, `${pfx}${unforcedTovMsg(committer, 'My Team')}`, false));
        if (screenBreakerPressure > 1) skillLog(`Screen Breaker disrupts My Team's action`, false);
        nextPossessionTeam = 'ai';
        nextLastPlayCategory = 'turnover';
      }
    } else {
      // No turnover — check fouls then scoring

      // ── SHOT CLOCK VIOLATION CHECK ──
      // Applied before the play resolves: ~3% base rate, higher with tired ISO / press defense
      const sclViolationChance = getShotClockViolationChance(
        currentOff, userAvg, state.aiDefStrategy
      );
      if (Math.random() < sclViolationChance) {
        // Shot clock violation — turnover, possession changes
        const ballHandler = userLineup.find(p => p.position === 'PG') || userLineup[0];
        ensureStats(ballHandler.id);
        newPlayerStats[ballHandler.id].TOV = (newPlayerStats[ballHandler.id].TOV ?? 0) + 1;
        newFormRating[ballHandler.id] = clampForm((newFormRating[ballHandler.id] ?? 1.0) - 0.02);
        turnoverOccurred = true;
        newEvents.push(makeEvent(newQuarter, newClock,
          `Shot clock violation: ${ballHandler.name} held the ball too long. AI ball`, true
        ));
        nextPossessionTeam = 'ai';
        nextLastPlayCategory = 'turnover';
      }

      if (!turnoverOccurred) {
        // ═══ ROLL NSF: NON-SHOOTING FOUL CHECK (AI defending user) ═══
        const defAvg_nsf = avgStamina(aiLineup, newStamina);
        const nsfChance = 0.045 * getFoulStamMod(defAvg_nsf); // ~5-6 NSF/game per team
        if (Math.random() < nsfChance) {
        const committer = pickFoulCommitter(aiLineup);
        ensureStats(committer.id);
        newPlayerStats[committer.id].FOL = (newPlayerStats[committer.id].FOL ?? 0) + 1;
        newTeamFouls.ai[newQuarter - 1] += 1;
        updateBonusState();
        ensureForm(committer.id); newFormRating[committer.id] = clampForm(newFormRating[committer.id] - 0.02);
        eventIndicator = { playerId: committer.id, type: 'FOL' };
        if (newIsInBonus.ai) {
          nonShootingFoulToFT = true;
          const ballHandler = [...userLineup].sort((a, b) => b.ovr - a.ovr)[0];
          newEvents.push(makeEvent(newQuarter, newClock, `Foul on ${committer.name} (${newPlayerStats[committer.id].FOL}/5) BONUS: ${ballHandler.name} to the line for 2`, true));
          ensureStats(ballHandler.id); ensureForm(ballHandler.id);
          newFormRating[ballHandler.id] = clampForm(newFormRating[ballHandler.id] + 0.02);
          runFTSequence(ballHandler.id, ballHandler.name, 2, false, committer.name, newPlayerStats[committer.id].FOL, true);
          // After FTs, ball goes to AI (inbound)
          nextPossessionTeam = 'ai';
          nextLastPlayCategory = 'foul_reset';
          if (newIsInBonus.ai && newTeamFouls.ai[newQuarter - 1] === 5) {
            newEvents.push(makeEvent(newQuarter, newClock, `${aiTeamObj.name} in the BONUS: every foul now sends to the line`, true));
          }
        } else {
          newEvents.push(makeEvent(newQuarter, newClock, `Loose ball foul on ${committer.name} (${newPlayerStats[committer.id].FOL}/5). My Team retains possession`, true));
          nextPossessionTeam = 'user';
          nextLastPlayCategory = 'foul_reset';
        }
      }

      // Only run scoring if NSF didn't send to FT line
      if (!nonShootingFoulToFT) {
        const baseChance = Math.max(0.30, Math.min(0.80, eUO / ((eUO + eAD) || 1)));
        const avgStamMod = getStaminaMod(userAvg);
        const teamFatigueContext = 0.88 + avgStamMod * 0.12;
        let finalChance = baseChance * teamFatigueContext * momentumBonus;
        if (hasHotUser) finalChance *= 1.04;

        let scorer = userLineup[userLineup.length - 1];
        if (currentOff === "Isolation (ISO)") {
          scorer = [...userLineup].sort((a, b) => b.ovr - a.ovr)[0];
        } else if (currentOff === "Post Isolation") {
          // Auto-pick highest OVR big (C or PF)
          const bigs = userLineup
            .filter(p => p.position === 'C' || p.position === 'PF')
            .sort((a, b) => b.ovr - a.ovr);
          scorer = bigs[0] || [...userLineup].sort((a, b) => b.ovr - a.ovr)[0];
        } else {
          const ws = userLineup.map(p => p.offense + p.shooting);
          const tw = ws.reduce((sum, w) => sum + w, 0);
          let r = Math.random() * tw;
          for (let i = 0; i < userLineup.length; i++) {
            r -= ws[i];
            if (r <= 0) {
              scorer = userLineup[i];
              break;
            }
          }
        }
        activePlayerId = scorer.id;
        ensureStats(scorer.id);

        const shooterStam = newStamina[scorer.id] ?? 100;
        const shooterStamMod = getPlayerStaminaMod(scorer, shooterStam);
        let is3PTBaseCheck = undefined as boolean | undefined;
        // 5-Out forces 3PT; Post-ISO forbids 3PT (post players don't shoot 3s)
        if (currentOff === "5-Out Spacing" && staminaPct(scorer) >= 50) is3PTBaseCheck = true;
        if (currentOff === "Post Isolation") is3PTBaseCheck = false;
        const shotInfo = generateShot(scorer, newFormRating[scorer.id] || 1.0, staminaPct(scorer), is3PTBaseCheck, pace);
        const is3PT = shotInfo.is3PT;
        const shotType = shotInfo.type;
        ensureForm(scorer.id);

        // Identify primary defender (opponent player in same slot for matchup bonus)
        const SLOT_POS = ['PG','SG','SF','PF','C'] as const;
        const scorerSlotIdx = SLOT_POS.indexOf(scorer.position as typeof SLOT_POS[number]);
        const primaryDefender = scorerSlotIdx >= 0 ? aiLineup[scorerSlotIdx] : undefined;
        const matchupBonus = getMatchupBonus(scorer, primaryDefender) + (hasBaseSkill(scorer, "Position Flex") ? 0.02 : 0);
        if (matchupBonus >= 0.12 && primaryDefender) {
          newEvents.push(makeEvent(newQuarter, newClock,
            `MISMATCH: ${scorer.name} has a clear advantage over ${primaryDefender.name}`, true
          ));
        }

        // ═══ tryBlock — BEFORE Roll F and Roll 3 (confirmed Step 4 order) ═══
        let skillShotBonus = 0;
        if (is3PT && rollBaseSkill(userLineup, "Arc Pressure", newStamina)) {
          const jammed = tryDeadAir(aiLineup, scorer, false, "Arc Pressure");
          const shadowed = !jammed && tryShadowGuard(aiLineup, false);
          const focused = !jammed && !shadowed && rollBaseSkill(aiLineup, "Focus Lock", newStamina);
          const arcScale = 0.80 + (getThreePtRating(scorer) / 100) * 0.40;
          
          let shadowRemaining = 0.015;
          if (shadowed) {
            const holders = aiLineup.filter(p => hasBaseSkill(p, "Shadow Guard"));
            const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getOnBallDefenseRating(p))) : (primaryDefender ? getOnBallDefenseRating(primaryDefender) : 50);
            const shadowScale = 0.85 + (maxRating / 100) * 0.30;
            shadowRemaining = 0.015 / shadowScale;
          }
          
          let focusRemaining = 0.02;
          if (focused) {
            const holders = aiLineup.filter(p => hasBaseSkill(p, "Focus Lock"));
            const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getOnBallDefenseRating(p))) : (primaryDefender ? getOnBallDefenseRating(primaryDefender) : 50);
            const focusScale = 0.85 + (maxRating / 100) * 0.30;
            focusRemaining = 0.02 / focusScale;
          }
          
          skillShotBonus += jammed ? 0.005 : shadowed ? shadowRemaining : focused ? focusRemaining : 0.035 * arcScale;
          skillLog(`${scorer.name}'s Arc Pressure creates a cleaner three`, true);
          if (focused) skillLog(`Focus Lock contains the shooting rhythm`, false);
          if (!jammed && !shadowed && !focused && primaryDefender && rollSpecial(userLineup, "Red Dot X", newStamina)) {
            newSkillMarks = addMark(newSkillMarks, newMarkImmunity, primaryDefender.id, "Exposed", "Red Dot X", 3);
            skillLog(`Red Dot X marks ${primaryDefender.name} as Exposed`, true);
          }
        }
        if (!is3PT && rollBaseSkill(userLineup, "Paint Magnet", newStamina)) {
          const jammed = tryDeadAir(aiLineup, scorer, false, "Paint Magnet");
          const paintScale = 0.85 + (getFinishingRating(scorer) / 100) * 0.30;
          skillShotBonus += jammed ? 0.005 : 0.03 * paintScale;
          skillLog(`${scorer.name}'s Paint Magnet bends the defense`, true);
          if (!jammed && primaryDefender && staminaPct(primaryDefender) < 45) {
            newSkillMarks = addMark(newSkillMarks, newMarkImmunity, primaryDefender.id, "Tilted", "Paint Magnet", 3);
            skillLog(`${scorer.name}'s Paint Magnet tilts tired defender ${primaryDefender.name}`, true);
          }
        }
        if (!is3PT && primaryDefender && rollBaseSkill(userLineup, "Power Driver", newStamina)) {
          skillShotBonus += 0.02;
          const drain = drainStamina(newStamina, primaryDefender, aiLineup, 32);
          skillLog(`${scorer.name}'s Power Driver drains ${drain} stamina at the rim`, true);
        }
        if (!is3PT && primaryDefender && staminaPct(primaryDefender) < 65 && rollSpecial(userLineup, "Contact Tax X", newStamina)) {
          newSkillMarks = addMark(newSkillMarks, newMarkImmunity, primaryDefender.id, "Tilted", "Contact Tax X", 3);
          drainStamina(newStamina, primaryDefender, aiLineup, 45);
          skillLog(`Contact Tax X tilts and taxes ${primaryDefender.name}`, true);
        }
        if (is3PT && primaryDefender && rollSpecial(aiLineup, "Corner Trap X", newStamina)) {
          newSkillMarks = addMark(newSkillMarks, newMarkImmunity, scorer.id, "Pinned", "Corner Trap X", 2);
          skillShotBonus -= 0.025;
          skillLog(`Corner Trap X pins ${scorer.name} on the perimeter`, false);
        }
        if (primaryDefender && hasAnyMark(newSkillMarks, primaryDefender.id) && rollBaseSkill(userLineup, "Mismatch Caller", newStamina)) {
          const jammed = tryDeadAir(aiLineup, scorer, false, "Mismatch Caller");
          skillShotBonus += jammed ? 0.005 : 0.025;
          skillLog(`${scorer.name}'s Mismatch Caller attacks a marked defender`, true);
        }
        if (rollBaseSkill(userLineup, "Tempo Surgeon", newStamina)) {
          const jammed = tryDeadAir(aiLineup, scorer, false, "Tempo Surgeon");
          const holders = userLineup.filter(p => p.baseSkills?.includes("Tempo Surgeon"));
          const maxTempo = holders.length > 0 ? Math.max(...holders.map(p => Math.round((getHandleRating(p) + getAssistRating(p)) / 2))) : 50;
          const tempoScale = 0.85 + (maxTempo / 100) * 0.30;
          skillShotBonus += jammed ? (0.003 * tempoScale) : (0.018 * tempoScale);
          skillLog(`Tempo Surgeon creates a cleaner offensive read`, true);
        }
        if ((pace === "fastbreak" || pace === "early_offense") && rollBaseSkill(userLineup, "Tempo Switch", newStamina)) {
          skillShotBonus += 0.025;
          skillLog(`${scorer.name}'s Tempo Switch boosts the early attack`, true);
        }
        if (hasMark(newSkillMarks, scorer.id, "Static")) {
          skillShotBonus -= 0.025;
        }

        tryBlock(aiLineup, scorer, false, shotType, is3PT);
        if (blockOccurred) {
          trackShotStamina(scorer.id, shotType, is3PT, 'block');
          trackDefensiveStamina(primaryDefender, shotType, is3PT, 'block');
          nextPossessionTeam = 'ai';
          nextLastPlayCategory = 'block';
        }

        if (!blockOccurred) {
          // ═══ ROLL F: SHOOTING FOUL CHECK ═══
          const defAvg_sf = avgStamina(aiLineup, newStamina);
          const clutchFoulBoost = clutchSituation.active ? getClutchRating(scorer) * 0.5 : 0;
          const foulDrawTendency = scorer ? getFoulDrawTendency(scorer) : 0.4;
          const foulDrawMod = 0.90 + foulDrawTendency * 0.25;
          let sfChance = ((is3PT ? 0.044 : 0.086) * getFoulStamMod(defAvg_sf) * foulDrawMod) + clutchFoulBoost; // NBA avg ~20-25 FTA/team/game
          if (primaryDefender && hasMark(newSkillMarks, primaryDefender.id, "Tilted")) sfChance += 0.035;
          if (primaryDefender && staminaPct(primaryDefender) < 60 && rollBaseSkill(userLineup, "Foul Magnet", newStamina)) {
            const foulMagnetScale = 0.90 + getFoulDrawTendency(scorer) * 0.25;
            sfChance += 0.035 * foulMagnetScale;
            skillLog(`${scorer.name}'s Foul Magnet pressures a tired defender`, true);
          }
          if (primaryDefender && hasMark(newSkillMarks, primaryDefender.id, "Tilted") && rollSpecial(userLineup, "Flop X", newStamina)) {
            const flopBonus = getFlopFoulPressureBonus(scorer);
            sfChance += flopBonus;
            skillLog(`Flop X sells the contact into foul pressure${flopBonus > 0.04 ? " - SGA doubles it" : ""}`, true);
          }
          if (is3PT && primaryDefender && hasMark(newSkillMarks, primaryDefender.id, "Exposed") && rollSpecial(userLineup, "Four-Point Bait X", newStamina)) {
            const composed = rollSpecial(aiLineup, "Composure X", newStamina);
            const cleanContest = !composed && rollSpecial(aiLineup, "Clean Contest X", newStamina);
            const disciplineWall = !cleanContest && rollBaseSkill(aiLineup, "Discipline Wall", newStamina);
            if (composed) {
              skillLog(`Composure X cancels the forced foul pressure`, false);
              skillShotBonus -= 0.02;
            } else if (cleanContest) {
              skillLog(`Clean Contest X shuts down Four-Point Bait X`, false);
              skillShotBonus -= 0.03;
            } else if (disciplineWall) {
              skillLog(`Discipline Wall holds off Four-Point Bait X`, false);
              const holders = aiLineup.filter(p => hasBaseSkill(p, "Discipline Wall"));
              const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getOnBallDefenseRating(p))) : (primaryDefender ? getOnBallDefenseRating(primaryDefender) : 50);
              const disciplineScale = 0.85 + (maxRating / 100) * 0.30;
              skillShotBonus -= 0.03 * disciplineScale;
            } else {
              sfChance += 0.09;
              skillLog(`Four-Point Bait X pressures the Exposed defender`, true);
            }
          }
          const MAX_SHOOTING_FOUL_CHANCE = 0.28;
          sfChance = Math.min(MAX_SHOOTING_FOUL_CHANCE, sfChance);
          if (Math.random() < sfChance) {
            shootingFoulOccurred = true;
            trackShotStamina(scorer.id, shotType, is3PT, 'foul');
            trackDefensiveStamina(primaryDefender, shotType, is3PT, 'foul');
            const committer = pickFoulCommitter(aiLineup);
            ensureStats(committer.id); ensureForm(committer.id);
            newPlayerStats[committer.id].FOL = (newPlayerStats[committer.id].FOL ?? 0) + 1;
            newFormRating[committer.id] = clampForm(newFormRating[committer.id] - 0.02);
            newTeamFouls.ai[newQuarter - 1] += 1;
            updateBonusState();
            ensureForm(scorer.id); newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + 0.02);
            const ftCount = is3PT ? 3 : 2;
            newEvents.push(makeEvent(newQuarter, newClock, `Shooting foul on ${committer.name} (${newPlayerStats[committer.id].FOL}/5): ${scorer.name} to the line for ${ftCount}`, true));
            eventIndicator = { playerId: committer.id, type: 'FOL' };
            runFTSequence(scorer.id, scorer.name, ftCount, false, committer.name, newPlayerStats[committer.id].FOL, true);
            // After FTs, ball goes to AI (inbound)
            nextPossessionTeam = 'ai';
            nextLastPlayCategory = 'foul_reset';
          }
        }

        // ═══ ROLL 3: MAKE/MISS (only if no block and no shooting foul) ═══
        if (!blockOccurred && !shootingFoulOccurred) {
          // ═══ PILLAR 2+3+4: INTERACTION MATRIX — multiplicative with hard guardrails ═══
          // Formula: Final_Shot_Prob = Base × Stamina × Defense × Usage
          // Source: Implementation Plan Interaction Matrix [DESIGN PARAMETER]
          const clutchMod = getClutchMod(scorer, clutchSituation);
          // Pillar 4: Zone modifier scales defensive pressure per shot type
          const zoneMod = getShotZoneModifier(shotType, state.aiDefStrategy);
          const pressMod = (state.aiDefStrategy === 'Full-Court Press') ? getShotZoneModifier(shotType, 'Full-Court Press') : 1.0;
          // Pillar 3: Hero ball usage tax applied multiplicatively
          const usageMod = getUsageMod(scorer.id, 'user');
          // Fast break bypass: ignore defensive mod on open-court break (Pillar 1 interaction)
          const effectiveZoneMod = pace === 'fastbreak' ? 1.0 : zoneMod;
          const effectivePressMod = pace === 'fastbreak' ? 1.0 : pressMod;
          // Assemble: Base × Stamina × Defense(zone) × Defense(press) × Usage × Clutch
          const clutchAdjustedChance = finalChance * shooterStamMod * newFormRating[scorer.id] * clutchMod * effectiveZoneMod * effectivePressMod * usageMod;
          const matchupAdj = matchupBonus;
          // Layer 3 (Step 8): Home court scoring adjustment
          const userHomeAdj = userIsHome
            ? getHomeCourtBoost(scorer)
            : -getAwayPenalty(scorer);
          const goodSubRatio = state.subsMade > 0 ? state.goodSubsMade / state.subsMade : 0.5;
          const decisionWeightMod = 1.0 + ((goodSubRatio - 0.5) * 0.05);
          // Pillar 2: Hard probability guardrails — floor 15%, ceiling 85% [DESIGN PARAMETER]
          const shotValueDifficulty = is3PT ? -0.095 : 0;
          const realEfficiencyAdj = getShotIdentityEfficiencyAdjustment(scorer, is3PT, shotType);
          
          const additiveBonusSum = userHomeAdj + matchupAdj + skillShotBonus + realEfficiencyAdj;
          const cappedAdditiveBonus = (is3PT && additiveBonusSum > 0) 
            ? Math.min(additiveBonusSum, MAX_3PT_POSITIVE_ADDITIVE_BONUS)
            : additiveBonusSum;

          const individual3ptMod = is3PT ? getIndividualThreePointShotMod(scorer.shooting) : 1.0;
          const adjustedChanceWithIndividual3PT = (clutchAdjustedChance * decisionWeightMod) * individual3ptMod;

          const finalScoringChance = Math.max(0.15, Math.min(0.85, adjustedChanceWithIndividual3PT + cappedAdditiveBonus + shotValueDifficulty));
          const isSuccess = Math.random() < finalScoringChance;
          if (is3PT) {
            const baseHalfWidth = 2.0;
            const ratingBoost = Math.max(-1.5, ((scorer.shooting ?? 80) - 80) * 0.08);
            const rarityBoost = scorer.rarity === 'Mythic' ? 1.2 : (scorer.rarity === 'Legendary' ? 0.7 : (scorer.rarity === 'Epic' ? 0.3 : 0));
            const stratBoost = currentOff === 'Run & Gun' ? 0.8 : (currentOff === 'Pace & Space' ? 0.4 : 0);
            const opponentDef = state.aiDefStrategy;
            const defPenalty = (opponentDef === 'Half-Court Trap' || opponentDef === 'Full-Court Press') ? -0.5 : 0;
            
            const totalHalfWidth = baseHalfWidth + ratingBoost + rarityBoost + stratBoost + defPenalty;
            const greenWindowStart = Math.max(80, 94 - totalHalfWidth);
            const greenWindowEnd = Math.min(99, 94 + totalHalfWidth);

            const releaseProgress = isSuccess
              ? Math.floor(Math.random() * (greenWindowEnd - greenWindowStart + 1)) + greenWindowStart
              : (Math.random() < 0.5
                  ? Math.floor(Math.random() * 8) + 75
                  : Math.floor(Math.random() * 8) + Math.ceil(greenWindowEnd) + 1
                );
            const feedback = isSuccess
              ? "Excellent Release!"
              : (releaseProgress < greenWindowStart ? "Slightly Early" : "Slightly Late");
              
            newActiveShotMeter = {
              playerId: scorer.id,
              shooterName: scorer.name,
              is3PT: true,
              isSuccess,
              shotType,
              releaseProgress,
              greenWindowStart,
              greenWindowEnd,
              feedback,
              isAiTeam: false,
            };
          }
          if (isSuccess) {
            trackShotStamina(scorer.id, shotType, is3PT, 'make');
            trackDefensiveStamina(primaryDefender, shotType, is3PT, 'make');
            // Record to possession history for rolling usage window
            newPossessionHistory.push({ team: 'user', playerId: scorer.id, wasTOV: false });
            pointsScored = is3PT ? 3 : 2;
            newPlayerStats[scorer.id].PTS += pointsScored;
            // Shot tracking
            newPlayerStats[scorer.id].FGM = (newPlayerStats[scorer.id].FGM ?? 0) + 1;
            newPlayerStats[scorer.id].FGA = (newPlayerStats[scorer.id].FGA ?? 0) + 1;
            if (is3PT) {
              newPlayerStats[scorer.id].TPM = (newPlayerStats[scorer.id].TPM ?? 0) + 1;
              newPlayerStats[scorer.id].TPA = (newPlayerStats[scorer.id].TPA ?? 0) + 1;
            }
            const evtText = clutchSituation.active
              ? clutchScoreText(scorer, shotType, clutchSituation)
              : scoreText(scorer, shotType, currentOff, momentumActive);
            newEvents.push(makeEvent(newQuarter, newClock, evtText, true, pointsScored, scorer.id));
            if (primaryDefender && hasAnyMark(newSkillMarks, primaryDefender.id) && rollSpecial(userLineup, "Lung Burner X", newStamina)) {
              const hadDebt = hasMark(newSkillMarks, primaryDefender.id, "Debt");
              const drain = drainStamina(newStamina, primaryDefender, aiLineup, hadDebt ? 190 : 110);
              skillLog(`Lung Burner X drains ${drain} stamina from ${primaryDefender.name}`, true);
              applyDebtCollector(userLineup, aiLineup, primaryDefender, true);
            }
            // Layer 7: clutch form delta on make
            if (clutchSituation.active) {
              const formBoost = clutchSituation.intensity === 'high' ? 0.04 : 0.02;
              newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + formBoost);
              if (scorer.rarity === 'Mythic' && is3PT && newFormRating[scorer.id] >= 1.10) newHotFromForm[scorer.id] = true;
            }
            nextPossessionTeam = 'ai';
            nextLastPlayCategory = 'made_shot';
            const tm = userLineup.filter(p => p.id !== scorer.id);
            if (tm.length > 0 && Math.random() < 0.60) {
              const a = tm[Math.floor(Math.random() * tm.length)];
              ensureStats(a.id);
              newPlayerStats[a.id].AST += 1;
              eventIndicator = { playerId: a.id, type: 'AST' };
              newEvents.push(makeEvent(newQuarter, newClock, `${a.name} with the assist`, true, 0));
              if (hasBaseSkill(a, "Connector Hub") && rollBaseSkill(userLineup, "Connector Hub", newStamina)) {
                const connectorScale = 0.85 + (getAssistRating(a) / 100) * 0.30;
                recoverSkillStamina(scorer, 35 * connectorScale);
                skillLog(`${a.name}'s Connector Hub restores ${scorer.name}'s stamina`, true);
              }
              if (rollBaseSkill(userLineup, "Share Rhythm", newStamina)) {
                userLineup.forEach(p => recoverSkillStamina(p, 8));
                skillLog(`${a.name}'s Share Rhythm steadies the lineup`, true);
              }
              if (rollSpecial(userLineup, "Chain Pass X", newStamina)) {
                const debtTarget = getLowestStaminaPlayer(aiLineup);
                newSkillMarks = addMark(newSkillMarks, newMarkImmunity, debtTarget.id, "Debt", "Chain Pass X", 3);
                skillLog(`Chain Pass X places Debt on ${debtTarget.name}`, true);
              }
            }
            // ═══ ROLL A: AND-1 CHECK (only if no prior FT this tick) ═══
            if (!nonShootingFoulToFT) {
              const finishingRating = scorer && !is3PT ? getFinishingRating(scorer) : 50;
              const finishingAnd1Mod = 0.85 + (finishingRating / 100) * 0.30;
              let and1Chance = (is3PT ? 0.01 : 0.03) * getFoulStamMod(avgStamina(aiLineup, newStamina)) * finishingAnd1Mod; // Reduced And-1 rate
              const MAX_AND1_CHANCE = 0.15;
              and1Chance = Math.min(MAX_AND1_CHANCE, and1Chance);
              if (Math.random() < and1Chance) {
                const and1Committer = pickFoulCommitter(aiLineup);
                ensureStats(and1Committer.id);
                newPlayerStats[and1Committer.id].FOL = (newPlayerStats[and1Committer.id].FOL ?? 0) + 1;
                newTeamFouls.ai[newQuarter - 1] += 1;
                updateBonusState();
                ensureForm(and1Committer.id); newFormRating[and1Committer.id] = clampForm(newFormRating[and1Committer.id] - 0.03);
                ensureForm(scorer.id); newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + 0.05);
                newEvents.push(makeEvent(newQuarter, newClock, `AND-1! ${scorer.name} scores through contact. One more from the line`, true));
                eventIndicator = { playerId: and1Committer.id, type: 'FOL' };
                runFTSequence(scorer.id, scorer.name, 1, true, and1Committer.name, newPlayerStats[and1Committer.id].FOL, true);
                nextLastPlayCategory = 'foul_reset';
              }
            }
          } else {
            trackShotStamina(scorer.id, shotType, is3PT, 'miss');
            trackDefensiveStamina(primaryDefender, shotType, is3PT, 'miss');
            const missEvtText = clutchSituation.active ? clutchMissText(scorer, clutchSituation) : missText(scorer, shotType, currentOff);
            newEvents.push(makeEvent(newQuarter, newClock, missEvtText, true, 0, scorer.id));
            // Shot tracking — miss
            newPlayerStats[scorer.id].FGA = (newPlayerStats[scorer.id].FGA ?? 0) + 1;
            if (is3PT) newPlayerStats[scorer.id].TPA = (newPlayerStats[scorer.id].TPA ?? 0) + 1;
            // Layer 7: clutch form delta on miss
            if (clutchSituation.active) {
              const formPenalty = clutchSituation.intensity === 'high' ? -0.04 : -0.02;
              newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + formPenalty);
            }
            // ═══ REBOUND RESOLUTION (user missed, AI defending) ═══
            const attReb = teamRebScore(userLineup);
            const defReb = teamRebScore(aiLineup);
            const glassTouch = rollBaseSkill(userLineup, "Glass Touch", newStamina);
            const paintBarrier = rollBaseSkill(aiLineup, "Paint Barrier", newStamina);
            let glassScale = 0;
            if (glassTouch) {
              const holders = userLineup.filter(p => hasBaseSkill(p, "Glass Touch"));
              const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getReboundRating(p))) : 50;
              glassScale = 0.85 + (maxRating / 100) * 0.30;
            }
            let barrierScale = 0;
            if (paintBarrier) {
              const holders = aiLineup.filter(p => hasBaseSkill(p, "Paint Barrier"));
              const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getReboundRating(p))) : 50;
              barrierScale = 0.85 + (maxRating / 100) * 0.30;
            }
            const orebChance = getOffensiveReboundChance(attReb, defReb, glassScale, barrierScale);
            if (paintBarrier) skillLog(`Paint Barrier fights off the second-chance lane`, false);
            if (Math.random() < orebChance) {
              const reb = pickRebounder(userLineup);
              awardReb(reb, 'OREB');
              eventIndicator = { playerId: reb.id, type: 'OREB' };
              newEvents.push(makeEvent(newQuarter, newClock, `${reb.name} gets the offensive rebound: second chance!`, true));
              if (glassTouch) skillLog(`${reb.name}'s Glass Touch creates second-chance pressure`, true);
              nextPossessionTeam = 'user';
              nextLastPlayCategory = 'miss_oreb';
              // NBA 2018+ rule: shot clock resets to 14s on OREB of a rim shot
              // (tracked via possessionClock in state, applied at end of tick)
              // ═══ OREB SECOND-CHANCE: Roll F before fc2 (Layer 5b) ═══
              const sc2 = userLineup[Math.floor(Math.random() * userLineup.length)];
              ensureStats(sc2.id); ensureForm(sc2.id);
              let orebFoulFired = false;
              if (!nonShootingFoulToFT) {
                const orebFoulChance = 0.086 * getFoulStamMod(avgStamina(aiLineup, newStamina));
                if (Math.random() < orebFoulChance) {
                  orebFoulFired = true;
                  const orebCommitter = pickFoulCommitter(aiLineup);
                  ensureStats(orebCommitter.id); ensureForm(orebCommitter.id);
                  newPlayerStats[orebCommitter.id].FOL = (newPlayerStats[orebCommitter.id].FOL ?? 0) + 1;
                  newFormRating[orebCommitter.id] = clampForm(newFormRating[orebCommitter.id] - 0.02);
                  newTeamFouls.ai[newQuarter - 1] += 1;
                  updateBonusState();
                  ensureForm(sc2.id); newFormRating[sc2.id] = clampForm(newFormRating[sc2.id] + 0.02);
                  newEvents.push(makeEvent(newQuarter, newClock, `Foul on the putback: ${orebCommitter.name} (${newPlayerStats[orebCommitter.id].FOL}/5). ${sc2.name} to the line for 2`, true));
                  eventIndicator = { playerId: orebCommitter.id, type: 'FOL' };
                  runFTSequence(sc2.id, sc2.name, 2, false, orebCommitter.name, newPlayerStats[orebCommitter.id].FOL, true);
                  // After OREB FTs, ball goes to AI (inbound)
                  nextPossessionTeam = 'ai';
                  nextLastPlayCategory = 'foul_reset';
                }
              }
              if (!orebFoulFired) {
                const stm2 = getPlayerStaminaMod(sc2, newStamina[sc2.id]);
                const goodSubRatio = state.subsMade > 0 ? state.goodSubsMade / state.subsMade : 0.5;
                const decisionWeightMod = 1.0 + ((goodSubRatio - 0.5) * 0.05); // ±2.5% modifier
                const fc2 = Math.max(0.20, Math.min(0.80, (eUO / ((eUO + eAD) || 1)) * getStaminaMod(userAvg) * momentumBonus * stm2 * newFormRating[sc2.id] * decisionWeightMod + (glassTouch ? 0.035 : 0)));
                if (Math.random() < fc2) {
                  const p2 = Math.random() < 0.24 ? 3 : 2;
                  trackShotStamina(sc2.id, p2 === 3 ? 'catchAndShoot' : 'putBack', p2 === 3, 'make', 'oreb');
                  pointsScored = p2;
                  newPlayerStats[sc2.id].PTS += p2;
                  // Shot tracking — OREB second chance
                  newPlayerStats[sc2.id].FGM = (newPlayerStats[sc2.id].FGM ?? 0) + 1;
                  newPlayerStats[sc2.id].FGA = (newPlayerStats[sc2.id].FGA ?? 0) + 1;
                  if (p2 === 3) { newPlayerStats[sc2.id].TPM = (newPlayerStats[sc2.id].TPM ?? 0) + 1; newPlayerStats[sc2.id].TPA = (newPlayerStats[sc2.id].TPA ?? 0) + 1; }
                  activePlayerId = sc2.id;
                  newEvents.push(makeEvent(newQuarter, newClock, `Second chance: ${sc2.name} converts! (+${p2})`, true, p2, sc2.id));
                  nextPossessionTeam = 'ai';
                  nextLastPlayCategory = 'made_shot';
                } else {
                  trackShotStamina(sc2.id, 'putBack', false, 'miss', 'oreb');
                  newPlayerStats[sc2.id].FGA = (newPlayerStats[sc2.id].FGA ?? 0) + 1;
                  const dreb = pickRebounder(aiLineup);
                  awardReb(dreb, 'DREB');
                  eventIndicator = { playerId: dreb.id, type: 'REB' };
                  newEvents.push(makeEvent(newQuarter, newClock, `${reb.name} with the board: My Team gets another look but can't convert`, true));
                  newEvents.push(makeEvent(newQuarter, newClock, `${dreb.name} pulls down the board`, false));
                  nextPossessionTeam = 'ai';
                  nextLastPlayCategory = 'miss_dreb';
                }
              }
            } else {
              const dreb = pickRebounder(aiLineup);
              awardReb(dreb, 'DREB');
              eventIndicator = { playerId: dreb.id, type: 'REB' };
              newEvents.push(makeEvent(newQuarter, newClock, `${dreb.name} pulls down the board`, false));
              nextPossessionTeam = 'ai';
              nextLastPlayCategory = 'miss_dreb';
            }
          }
        } // end if (!blockOccurred && !shootingFoulOccurred)
      }
      } // end if (!turnoverOccurred)
    }
    }
  } else {
    if (shotClockViolationFired) {
      // Guaranteed AI shot clock violation
      const ballHandler = aiLineup.find(p => p.position === 'PG') || aiLineup[0];
      ensureStats(ballHandler.id);
      newPlayerStats[ballHandler.id].TOV = (newPlayerStats[ballHandler.id].TOV ?? 0) + 1;
      newFormRating[ballHandler.id] = clampForm((newFormRating[ballHandler.id] ?? 1.0) - 0.02);
      turnoverOccurred = true;
      newEvents.push(makeEvent(newQuarter, newClock,
        `Shot clock violation: ${ballHandler.name} held the ball too long. My Team ball`, false
      ));
      nextPossessionTeam = 'user';
      nextLastPlayCategory = 'turnover';
    } else {
    // AI possession
    const aiAvg = avgStamina(aiLineup, newStamina);
    const baseChance = Math.max(0.30, Math.min(0.80, eAO / ((eAO + eUD) || 1)));
    const avgStamMod = getStaminaMod(aiAvg);
    const aiTeamFatigueContext = 0.88 + avgStamMod * 0.12;
    let finalChance = baseChance * aiTeamFatigueContext;
    if (hasHotAi) finalChance *= 1.04;

    let scorer = aiLineup[aiLineup.length - 1];
    if (state.aiOffStrategy === "Isolation (ISO)") {
      scorer = [...aiLineup].sort((a, b) => b.ovr - a.ovr)[0];
    } else if (state.aiOffStrategy === "Post Isolation") {
      // Auto-pick highest OVR big (C or PF)
      const bigs = aiLineup
        .filter(p => p.position === 'C' || p.position === 'PF')
        .sort((a, b) => b.ovr - a.ovr);
      scorer = bigs[0] || [...aiLineup].sort((a, b) => b.ovr - a.ovr)[0];
    } else {
      const ws = aiLineup.map(p => p.offense + p.shooting);
      const tw = ws.reduce((sum, w) => sum + w, 0);
      let r = Math.random() * tw;
      for (let i = 0; i < aiLineup.length; i++) {
        r -= ws[i];
        if (r <= 0) {
          scorer = aiLineup[i];
          break;
        }
      }
    }
    activePlayerId = scorer.id;
    ensureStats(scorer.id);
    const aiScorerStamMod = getPlayerStaminaMod(scorer, newStamina[scorer.id]);

    let is3PTBaseCheck = undefined as boolean | undefined;
    if (currentDef === "Drop Coverage") {
      is3PTBaseCheck = Math.random() < (userAvg < 45 ? 0.50 : 0.60);
    }
    if (state.aiOffStrategy === "Post Isolation") {
      is3PTBaseCheck = false;
    }
    const shotInfo = generateShot(scorer, newFormRating[scorer.id] || 1.0, staminaPct(scorer), is3PTBaseCheck, pace);
    const is3PT = shotInfo.is3PT;
    const shotType = shotInfo.type;

    // Identify primary defender (user player in same slot for matchup bonus)
    const SLOT_POS = ['PG','SG','SF','PF','C'] as const;
    const scorerSlotIdx = SLOT_POS.indexOf(scorer.position as typeof SLOT_POS[number]);
    const primaryDefender = scorerSlotIdx >= 0 ? userLineup[scorerSlotIdx] : undefined;
    const matchupBonus = getMatchupBonus(scorer, primaryDefender) + (hasBaseSkill(scorer, "Position Flex") ? 0.02 : 0);
    if (matchupBonus >= 0.12 && primaryDefender) {
      newEvents.push(makeEvent(newQuarter, newClock,
        `MISMATCH: ${scorer.name} has a clear advantage over ${primaryDefender.name}`, false
      ));
    }

    // Blitz/Trap handling (0% general TOV — 15% steal only, Step 3 fix, DO NOT CHANGE)
    let aiSkillShotBonus = 0;
    if (is3PT && rollBaseSkill(aiLineup, "Arc Pressure", newStamina)) {
      const jammed = tryDeadAir(userLineup, scorer, true, "Arc Pressure");
      const shadowed = !jammed && tryShadowGuard(userLineup, true);
      const focused = !jammed && !shadowed && rollBaseSkill(userLineup, "Focus Lock", newStamina);
      const arcScale = 0.80 + (getThreePtRating(scorer) / 100) * 0.40;
      
      let shadowRemaining = 0.015;
      if (shadowed) {
        const holders = userLineup.filter(p => hasBaseSkill(p, "Shadow Guard"));
        const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getOnBallDefenseRating(p))) : (primaryDefender ? getOnBallDefenseRating(primaryDefender) : 50);
        const shadowScale = 0.85 + (maxRating / 100) * 0.30;
        shadowRemaining = 0.015 / shadowScale;
      }
      
      let focusRemaining = 0.02;
      if (focused) {
        const holders = userLineup.filter(p => hasBaseSkill(p, "Focus Lock"));
        const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getOnBallDefenseRating(p))) : (primaryDefender ? getOnBallDefenseRating(primaryDefender) : 50);
        const focusScale = 0.85 + (maxRating / 100) * 0.30;
        focusRemaining = 0.02 / focusScale;
      }
      
      aiSkillShotBonus += jammed ? 0.005 : shadowed ? shadowRemaining : focused ? focusRemaining : 0.035 * arcScale;
      skillLog(`${scorer.name}'s Arc Pressure creates a cleaner three`, false);
      if (focused) skillLog(`Focus Lock contains the shooting rhythm`, true);
      if (!jammed && !shadowed && !focused && primaryDefender && rollSpecial(aiLineup, "Red Dot X", newStamina)) {
        newSkillMarks = addMark(newSkillMarks, newMarkImmunity, primaryDefender.id, "Exposed", "Red Dot X", 3);
        skillLog(`Red Dot X marks ${primaryDefender.name} as Exposed`, false);
      }
    }
    if (!is3PT && rollBaseSkill(aiLineup, "Paint Magnet", newStamina)) {
      const jammed = tryDeadAir(userLineup, scorer, true, "Paint Magnet");
      const paintScale = 0.85 + (getFinishingRating(scorer) / 100) * 0.30;
      aiSkillShotBonus += jammed ? 0.005 : 0.03 * paintScale;
      skillLog(`${scorer.name}'s Paint Magnet bends the defense`, false);
      if (!jammed && primaryDefender && staminaPct(primaryDefender) < 45) {
        newSkillMarks = addMark(newSkillMarks, newMarkImmunity, primaryDefender.id, "Tilted", "Paint Magnet", 3);
        skillLog(`${scorer.name}'s Paint Magnet tilts tired defender ${primaryDefender.name}`, false);
      }
    }
    if (!is3PT && primaryDefender && rollBaseSkill(aiLineup, "Power Driver", newStamina)) {
      aiSkillShotBonus += 0.02;
      const drain = drainStamina(newStamina, primaryDefender, userLineup, 32);
      skillLog(`${scorer.name}'s Power Driver drains ${drain} stamina at the rim`, false);
    }
    if (!is3PT && primaryDefender && staminaPct(primaryDefender) < 65 && rollSpecial(aiLineup, "Contact Tax X", newStamina)) {
      newSkillMarks = addMark(newSkillMarks, newMarkImmunity, primaryDefender.id, "Tilted", "Contact Tax X", 3);
      drainStamina(newStamina, primaryDefender, userLineup, 45);
      skillLog(`Contact Tax X tilts and taxes ${primaryDefender.name}`, false);
    }
    if (is3PT && primaryDefender && rollSpecial(userLineup, "Corner Trap X", newStamina)) {
      newSkillMarks = addMark(newSkillMarks, newMarkImmunity, scorer.id, "Pinned", "Corner Trap X", 2);
      aiSkillShotBonus -= 0.025;
      skillLog(`Corner Trap X pins ${scorer.name} on the perimeter`, true);
    }
    if (primaryDefender && hasAnyMark(newSkillMarks, primaryDefender.id) && rollBaseSkill(aiLineup, "Mismatch Caller", newStamina)) {
      const jammed = tryDeadAir(userLineup, scorer, true, "Mismatch Caller");
      aiSkillShotBonus += jammed ? 0.005 : 0.025;
      skillLog(`${scorer.name}'s Mismatch Caller attacks a marked defender`, false);
    }
    if (rollBaseSkill(aiLineup, "Tempo Surgeon", newStamina)) {
      const jammed = tryDeadAir(userLineup, scorer, true, "Tempo Surgeon");
      const holders = aiLineup.filter(p => p.baseSkills?.includes("Tempo Surgeon"));
      const maxTempo = holders.length > 0 ? Math.max(...holders.map(p => Math.round((getHandleRating(p) + getAssistRating(p)) / 2))) : 50;
      const tempoScale = 0.85 + (maxTempo / 100) * 0.30;
      aiSkillShotBonus += jammed ? (0.003 * tempoScale) : (0.018 * tempoScale);
      skillLog(`Tempo Surgeon creates a cleaner offensive read`, false);
    }
    if ((pace === "fastbreak" || pace === "early_offense") && rollBaseSkill(aiLineup, "Tempo Switch", newStamina)) {
      aiSkillShotBonus += 0.025;
      skillLog(`${scorer.name}'s Tempo Switch boosts the early attack`, false);
    }
    if (hasMark(newSkillMarks, scorer.id, "Static")) {
      aiSkillShotBonus -= 0.025;
    }

    if (currentDef === "Blitz/Trap") {
      const stealChance = userAvg >= 60 ? 0.15 : userAvg >= 50 ? 0.10 : 0.06;
      const easyBasketChance = userAvg < 50 ? 0.28 : 0.20;
      const roll = Math.random();

      if (roll < stealChance) {
        // Weighted random steal selection — Blitz/Trap path
        const bStlW = userLineup.map(p => getStealRating(p));
        const bStlTW = bStlW.reduce((s, w) => s + w, 0);
        let bStlR = Math.random() * bStlTW;
        let stealer = userLineup[userLineup.length - 1];
        for (let si = 0; si < userLineup.length; si++) { bStlR -= bStlW[si]; if (bStlR <= 0) { stealer = userLineup[si]; break; } }
        ensureStats(stealer.id);
        newPlayerStats[stealer.id].STL += 1;
        newEvents.push(makeEvent(newQuarter, newClock, `STEAL: ${stealer.name} strips the ball!`, true, 0, stealer.id));
        applyFiveManSqueeze(userLineup, aiLineup, true);
        stealPlayerId = stealer.id;
        eventIndicator = { playerId: stealer.id, type: 'STL' };
        pointsScored = 0;
        nextPossessionTeam = 'user';
        nextLastPlayCategory = 'steal';
      } else {
        // No general TOV — steal IS the turnover mechanic
        if (roll < stealChance + easyBasketChance) {
          pointsScored = 2;
          newPlayerStats[scorer.id].PTS += 2;
          // Shot tracking — Blitz easy basket
          newPlayerStats[scorer.id].FGM = (newPlayerStats[scorer.id].FGM ?? 0) + 1;
          newPlayerStats[scorer.id].FGA = (newPlayerStats[scorer.id].FGA ?? 0) + 1;
          newEvents.push(makeEvent(newQuarter, newClock, trapNarrative(scorer.name, true), false, 2, scorer.id));
          const tm = aiLineup.filter(p => p.id !== scorer.id);
            if (tm.length > 0) {
              const ws = tm.map(p => getAssistRating(p) || 50);
              const tw = ws.reduce((s, w) => s + w, 0);
              let r = Math.random() * tw;
              let a = tm[tm.length - 1];
              for (let i = 0; i < tm.length; i++) { r -= ws[i]; if (r <= 0) { a = tm[i]; break; } }
              const astChance = getAssistChance(a);
              if (Math.random() < astChance) {
                 ensureStats(a.id);
                 newPlayerStats[a.id].AST += 1;
              }
            }
          nextPossessionTeam = 'user';
          nextLastPlayCategory = 'made_shot';
        } else {
          finalChance -= 0.08;
          ensureForm(scorer.id);
          // Block before Roll F in Blitz/Trap contested path
      tryBlock(userLineup, scorer, true, shotType, is3PT);
      if (blockOccurred) {
        trackShotStamina(scorer.id, shotType, is3PT, 'block');
        trackDefensiveStamina(primaryDefender, shotType, is3PT, 'block');
        nextPossessionTeam = 'user';
        nextLastPlayCategory = 'block';
      }
          if (!blockOccurred) {
            const aiBlitzClutchFoulBoost = clutchSituation.active ? getClutchRating(scorer) * 0.5 : 0;
            const sfChance = (is3PT ? 0.044 : 0.086) * getFoulStamMod(avgStamina(userLineup, newStamina)) + aiBlitzClutchFoulBoost;
            if (Math.random() < sfChance) {
              shootingFoulOccurred = true;
              trackShotStamina(scorer.id, shotType, is3PT, 'foul');
              trackDefensiveStamina(primaryDefender, shotType, is3PT, 'foul');
              const committer = pickFoulCommitter(userLineup);
              ensureStats(committer.id); ensureForm(committer.id);
              newPlayerStats[committer.id].FOL = (newPlayerStats[committer.id].FOL ?? 0) + 1;
              newFormRating[committer.id] = clampForm(newFormRating[committer.id] - 0.02);
              newTeamFouls.user[newQuarter - 1] += 1;
              updateBonusState();
              ensureForm(scorer.id); newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + 0.02);
              const ftCount = is3PT ? 3 : 2;
              newEvents.push(makeEvent(newQuarter, newClock, `Shooting foul on ${committer.name} (${newPlayerStats[committer.id].FOL}/5): ${scorer.name} to the line for ${ftCount}`, false));
              eventIndicator = { playerId: committer.id, type: 'FOL' };
              runFTSequence(scorer.id, scorer.name, ftCount, false, committer.name, newPlayerStats[committer.id].FOL, false);
              // After FTs, ball goes to User (inbound)
              nextPossessionTeam = 'user';
              nextLastPlayCategory = 'foul_reset';
            }
          }
          if (!blockOccurred && !shootingFoulOccurred) {
            const aiBlitzClutchMod = getClutchMod(scorer, clutchSituation);
            const aiBlitzAdjustedChance = finalChance * aiScorerStamMod * newFormRating[scorer.id] * aiBlitzClutchMod;
            // Layer 3 (Step 8): AI home court adjustment (AI is home when !userIsHome)
            const aiBlitzHomeAdj = userIsHome
              ? -getAwayPenalty(scorer)   // AI is away
              : getHomeCourtBoost(scorer); // AI is home
            const aiBlitzShotValueDifficulty = is3PT ? -0.095 : 0;
            const aiRealEfficiencyAdj = getShotIdentityEfficiencyAdjustment(scorer, is3PT, shotType);
            
            const aiBlitzAdditiveBonusSum = aiBlitzHomeAdj + aiSkillShotBonus + aiRealEfficiencyAdj;
            const aiBlitzCappedAdditiveBonus = (is3PT && aiBlitzAdditiveBonusSum > 0)
              ? Math.min(aiBlitzAdditiveBonusSum, MAX_3PT_POSITIVE_ADDITIVE_BONUS)
              : aiBlitzAdditiveBonusSum;

            const individual3ptMod = is3PT ? getIndividualThreePointShotMod(scorer.shooting) : 1.0;
            const adjustedChanceWithIndividual3PT = aiBlitzAdjustedChance * individual3ptMod;

            const aiBlitzFinalChance = Math.max(0.15, Math.min(0.80, adjustedChanceWithIndividual3PT + aiBlitzCappedAdditiveBonus + aiBlitzShotValueDifficulty));
            const isSuccess = Math.random() < aiBlitzFinalChance;
            if (is3PT) {
              const baseHalfWidth = 2.0;
              const ratingBoost = Math.max(-1.5, ((scorer.shooting ?? 80) - 80) * 0.08);
              const rarityBoost = scorer.rarity === 'Mythic' ? 1.2 : (scorer.rarity === 'Legendary' ? 0.7 : (scorer.rarity === 'Epic' ? 0.3 : 0));
              const stratBoost = state.aiOffStrategy === 'Run & Gun' ? 0.8 : (state.aiOffStrategy === 'Pace & Space' ? 0.4 : 0);
              const opponentDef = currentDef as string;
              const defPenalty = (opponentDef === 'Half-Court Trap' || opponentDef === 'Full-Court Press') ? -0.5 : 0;
              
              const totalHalfWidth = baseHalfWidth + ratingBoost + rarityBoost + stratBoost + defPenalty;
              const greenWindowStart = Math.max(80, 94 - totalHalfWidth);
              const greenWindowEnd = Math.min(99, 94 + totalHalfWidth);

              const releaseProgress = isSuccess
                ? Math.floor(Math.random() * (greenWindowEnd - greenWindowStart + 1)) + greenWindowStart
                : (Math.random() < 0.5
                    ? Math.floor(Math.random() * 8) + 75
                    : Math.floor(Math.random() * 8) + Math.ceil(greenWindowEnd) + 1
                  );
              const feedback = isSuccess
                ? "Excellent Release!"
                : (releaseProgress < greenWindowStart ? "Slightly Early" : "Slightly Late");

              newActiveShotMeter = {
                playerId: scorer.id,
                shooterName: scorer.name,
                is3PT: true,
                isSuccess,
                shotType,
                releaseProgress,
                greenWindowStart,
                greenWindowEnd,
                feedback,
                isAiTeam: true,
              };
            }
            if (isSuccess) {
              pointsScored = is3PT ? 3 : 2;
              newPlayerStats[scorer.id].PTS += pointsScored;
              // Shot tracking — Blitz contested make
              newPlayerStats[scorer.id].FGM = (newPlayerStats[scorer.id].FGM ?? 0) + 1;
              newPlayerStats[scorer.id].FGA = (newPlayerStats[scorer.id].FGA ?? 0) + 1;
              if (is3PT) { newPlayerStats[scorer.id].TPM = (newPlayerStats[scorer.id].TPM ?? 0) + 1; newPlayerStats[scorer.id].TPA = (newPlayerStats[scorer.id].TPA ?? 0) + 1; }
              const aiBlitzEvt = clutchSituation.active ? clutchScoreText(scorer, shotType, clutchSituation) : scoreText(scorer, shotType, state.aiOffStrategy, false);
              newEvents.push(makeEvent(newQuarter, newClock, aiBlitzEvt, false, pointsScored, scorer.id));
              if (clutchSituation.active) { const fb = clutchSituation.intensity === 'high' ? 0.04 : 0.02; newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + fb); }
              const tm = aiLineup.filter(p => p.id !== scorer.id);
            if (tm.length > 0) {
              const ws = tm.map(p => getAssistRating(p) || 50);
              const tw = ws.reduce((s, w) => s + w, 0);
              let r = Math.random() * tw;
              let a = tm[tm.length - 1];
              for (let i = 0; i < tm.length; i++) { r -= ws[i]; if (r <= 0) { a = tm[i]; break; } }
              const astChance = getAssistChance(a);
              if (Math.random() < astChance) {
                 ensureStats(a.id);
                 newPlayerStats[a.id].AST += 1;
              }
            }
            nextPossessionTeam = 'user';
            nextLastPlayCategory = 'made_shot';
            } else {
              const aiBlitzMissEvt = clutchSituation.active ? clutchMissText(scorer, clutchSituation) : `Strong trap forces ${scorer.name} to miss!`;
              newEvents.push(makeEvent(newQuarter, newClock, aiBlitzMissEvt, false, 0, scorer.id));
              // Shot tracking — Blitz contested miss
              newPlayerStats[scorer.id].FGA = (newPlayerStats[scorer.id].FGA ?? 0) + 1;
              if (is3PT) newPlayerStats[scorer.id].TPA = (newPlayerStats[scorer.id].TPA ?? 0) + 1;
              if (clutchSituation.active) { const fp = clutchSituation.intensity === 'high' ? -0.04 : -0.02; newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + fp); }
              nextPossessionTeam = 'user';
              nextLastPlayCategory = 'miss_dreb';
            }
          }
        }
      }
    } else {
      // ═══ PILLAR 6: TURNOVER CHECK — AI possession (non-Blitz) ═══
      // Same data-driven calibration: ~12% base, scaled by AI playmaking quality
      const aiAvgPly = aiLineup.reduce((s, p) => s + getHandleRating(p), 0) / 5;
      const aiBaseTOVRate = 0.085 * (80 / Math.max(55, aiAvgPly));
      // Pillar 4 interaction: user defensive strategy increases AI turnover risk
      const userDefPressureMod = currentDef === 'Blitz/Trap' ? 1.35
        : currentDef === 'Full-Court Press' ? 1.25
        : currentDef === 'Switch Defense' ? 1.08
        : 1.0;
      // Pillar 5 interaction — fatigued AI turns it over more
      const aiTovMod = getTovStamMod(aiAvg);
      const aiLateClockMod = pace === 'late_clock' ? 1.30 : 1.0;
      let userHandsActivePressure = 1.0;
      if (rollBaseSkill(userLineup, "Hands Active", newStamina)) {
        const holders = userLineup.filter(p => p.baseSkills?.includes("Hands Active"));
        const maxStealRating = holders.length > 0 ? Math.max(...holders.map(p => getStealRating(p))) : 50;
        const handsActiveScale = 0.85 + (maxStealRating / 100) * 0.30;
        userHandsActivePressure = 1.18 * handsActiveScale;
      }
      let userScreenBreakerPressure = 1.0;
      if ((state.aiOffStrategy === "Pick & Roll" || state.aiOffStrategy === "Motion Offense") && rollBaseSkill(userLineup, "Screen Breaker", newStamina)) {
        const holders = userLineup.filter(p => hasBaseSkill(p, "Screen Breaker"));
        const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getOnBallDefenseRating(p))) : 50;
        const screenBreakerScale = 0.85 + (maxRating / 100) * 0.30;
        userScreenBreakerPressure = 1.12 * screenBreakerScale;
      }
      const userCageStepPressure = rollSpecial(userLineup, "Cage Step X", newStamina) ? 1.12 : 1.0;
      const aiFinalTOVChance = Math.min(0.25, aiBaseTOVRate * userDefPressureMod * aiTovMod * aiLateClockMod * userHandsActivePressure * userScreenBreakerPressure * userCageStepPressure);
      if (Math.random() < aiFinalTOVChance) {
        turnoverOccurred = true;
        const committer = pickCommitter(aiLineup);
        if (userCageStepPressure > 1) {
          newSkillMarks = addMark(newSkillMarks, newMarkImmunity, committer.id, "Hooked", "Cage Step X", 2);
          skillLog(`Cage Step X hooks ${committer.name}'s handle`, true);
        }
        activePlayerId = committer.id;
        ensureStats(committer.id);
        newPlayerStats[committer.id].TOV = (newPlayerStats[committer.id].TOV ?? 0) + 1;
        eventIndicator = { playerId: committer.id, type: 'TOV' };
        ensureForm(committer.id);
        newFormRating[committer.id] = clampForm(newFormRating[committer.id] - 0.035);
        const pfx = clutchSituation.active ? 'CRUCIAL TURNOVER — ' : '';
        if (Math.random() < 0.55) {
          // Weighted random steal selection — AI TOV path
          const stlW2 = userLineup.map(p => getStealRating(p));
          const stlTW2 = stlW2.reduce((s, w) => s + w, 0);
          let stlR2 = Math.random() * stlTW2;
          let stl = userLineup[userLineup.length - 1];
          for (let si = 0; si < userLineup.length; si++) { stlR2 -= stlW2[si]; if (stlR2 <= 0) { stl = userLineup[si]; break; } }
          ensureStats(stl.id); newPlayerStats[stl.id].STL += 1;
          stealPlayerId = stl.id;
          eventIndicator = { playerId: stl.id, type: 'STL' };
          ensureForm(stl.id); newFormRating[stl.id] = clampForm(newFormRating[stl.id] + 0.04);
          newEvents.push(makeEvent(newQuarter, newClock, `${pfx}STL: ${stl.name} picks off ${committer.name}!`, true));
          if (userHandsActivePressure > 1) skillLog(`${stl.name}'s Hands Active forced the steal window`, true);
          applyFiveManSqueeze(userLineup, aiLineup, true);
          nextPossessionTeam = 'user';
          nextLastPlayCategory = 'steal';
        } else {
          newEvents.push(makeEvent(newQuarter, newClock, `${pfx}${unforcedTovMsg(committer, aiTeamObj.name)}`, true));
          if (userScreenBreakerPressure > 1) skillLog(`Screen Breaker disrupts ${aiTeamObj.name}'s action`, true);
          nextPossessionTeam = 'user';
          nextLastPlayCategory = 'turnover';
        }
      } else {
        // No turnover — NSF + scoring with fouls

        // ═══ ROLL NSF: NON-SHOOTING FOUL CHECK (user defending AI) ═══
        const defAvg_nsf_ai = avgStamina(userLineup, newStamina);
        const nsfChance_ai = 0.045 * getFoulStamMod(defAvg_nsf_ai); // ~5-6 NSF/game per team
        if (Math.random() < nsfChance_ai) {
          const committer = pickFoulCommitter(userLineup);
          ensureStats(committer.id);
          newPlayerStats[committer.id].FOL = (newPlayerStats[committer.id].FOL ?? 0) + 1;
          newTeamFouls.user[newQuarter - 1] += 1;
          updateBonusState();
          ensureForm(committer.id); newFormRating[committer.id] = clampForm(newFormRating[committer.id] - 0.02);
          eventIndicator = { playerId: committer.id, type: 'FOL' };
          if (newIsInBonus.user) {
            nonShootingFoulToFT = true;
            const ballHandler = [...aiLineup].sort((a, b) => b.ovr - a.ovr)[0];
            newEvents.push(makeEvent(newQuarter, newClock, `Foul on ${committer.name} (${newPlayerStats[committer.id].FOL}/5) BONUS: ${ballHandler.name} to the line for 2`, false));
            ensureStats(ballHandler.id); ensureForm(ballHandler.id);
            newFormRating[ballHandler.id] = clampForm(newFormRating[ballHandler.id] + 0.02);
            runFTSequence(ballHandler.id, ballHandler.name, 2, false, committer.name, newPlayerStats[committer.id].FOL, false);
            // After FTs, ball goes to User (inbound)
            nextPossessionTeam = 'user';
            nextLastPlayCategory = 'foul_reset';
            if (newIsInBonus.user && newTeamFouls.user[newQuarter - 1] === 5) {
              newEvents.push(makeEvent(newQuarter, newClock, `My Team in the BONUS: every foul now sends to the line`, false));
            }
          } else {
            newEvents.push(makeEvent(newQuarter, newClock, `Loose ball foul on ${committer.name} (${newPlayerStats[committer.id].FOL}/5). ${aiTeamObj.name} retains possession`, false));
            nextPossessionTeam = 'ai';
            nextLastPlayCategory = 'foul_reset';
          }
        }

        if (!nonShootingFoulToFT) {
          ensureForm(scorer.id);
          // Block before Roll F and Roll 3
          tryBlock(userLineup, scorer, true, shotType, is3PT);
          if (blockOccurred) {
            nextPossessionTeam = 'user';
            nextLastPlayCategory = 'block';
          }

          if (!blockOccurred) {
            const defAvg_sf_ai = avgStamina(userLineup, newStamina);
            const aiClutchFoulBoost = clutchSituation.active ? getClutchRating(scorer) * 0.5 : 0;
            const foulDrawTendency = scorer ? getFoulDrawTendency(scorer) : 0.4;
            const foulDrawMod = 0.90 + foulDrawTendency * 0.25;
            let sfChance_ai = ((is3PT ? 0.044 : 0.086) * getFoulStamMod(defAvg_sf_ai) * foulDrawMod) + aiClutchFoulBoost; // NBA avg ~20-25 FTA/team/game
            if (primaryDefender && hasMark(newSkillMarks, primaryDefender.id, "Tilted")) sfChance_ai += 0.035;
            if (primaryDefender && staminaPct(primaryDefender) < 60 && rollBaseSkill(aiLineup, "Foul Magnet", newStamina)) {
              const foulMagnetScale = 0.90 + getFoulDrawTendency(scorer) * 0.25;
              sfChance_ai += 0.035 * foulMagnetScale;
              skillLog(`${scorer.name}'s Foul Magnet pressures a tired defender`, false);
            }
            if (primaryDefender && hasMark(newSkillMarks, primaryDefender.id, "Tilted") && rollSpecial(aiLineup, "Flop X", newStamina)) {
              const flopBonus = getFlopFoulPressureBonus(scorer);
              sfChance_ai += flopBonus;
              skillLog(`Flop X sells the contact into foul pressure${flopBonus > 0.04 ? " - SGA doubles it" : ""}`, false);
            }
            if (is3PT && primaryDefender && hasMark(newSkillMarks, primaryDefender.id, "Exposed") && rollSpecial(aiLineup, "Four-Point Bait X", newStamina)) {
              const composed = rollSpecial(userLineup, "Composure X", newStamina);
              const cleanContest = !composed && rollSpecial(userLineup, "Clean Contest X", newStamina);
              const disciplineWall = !cleanContest && rollBaseSkill(userLineup, "Discipline Wall", newStamina);
              if (composed) {
                skillLog(`Composure X cancels the forced foul pressure`, true);
                aiSkillShotBonus -= 0.02;
              } else if (cleanContest) {
                skillLog(`Clean Contest X shuts down Four-Point Bait X`, true);
                aiSkillShotBonus -= 0.03;
              } else if (disciplineWall) {
                skillLog(`Discipline Wall holds off Four-Point Bait X`, true);
                aiSkillShotBonus -= 0.03;
              } else {
                sfChance_ai += 0.09;
                skillLog(`Four-Point Bait X pressures the Exposed defender`, false);
              }
            }
            const MAX_SHOOTING_FOUL_CHANCE = 0.28;
            sfChance_ai = Math.min(MAX_SHOOTING_FOUL_CHANCE, sfChance_ai);
            if (Math.random() < sfChance_ai) {
              shootingFoulOccurred = true;
              const committer = pickFoulCommitter(userLineup);
              ensureStats(committer.id); ensureForm(committer.id);
              newPlayerStats[committer.id].FOL = (newPlayerStats[committer.id].FOL ?? 0) + 1;
              newFormRating[committer.id] = clampForm(newFormRating[committer.id] - 0.02);
              newTeamFouls.user[newQuarter - 1] += 1;
              updateBonusState();
              ensureForm(scorer.id); newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + 0.02);
              const ftCount = is3PT ? 3 : 2;
              newEvents.push(makeEvent(newQuarter, newClock, `Shooting foul on ${committer.name} (${newPlayerStats[committer.id].FOL}/5): ${scorer.name} to the line for ${ftCount}`, false));
              eventIndicator = { playerId: committer.id, type: 'FOL' };
              runFTSequence(scorer.id, scorer.name, ftCount, false, committer.name, newPlayerStats[committer.id].FOL, false);
              // After FTs, ball goes to User (inbound)
              nextPossessionTeam = 'user';
              nextLastPlayCategory = 'foul_reset';
            }
          }

          // ═══ PILLAR 2+3+4: INTERACTION MATRIX — AI possession ═══
          // Formula: Final_Shot_Prob = Base × Stamina × Defense × Usage [DESIGN PARAMETER]
          if (!blockOccurred && !shootingFoulOccurred) {
            const aiClutchMod = getClutchMod(scorer, clutchSituation);
            const zoneMod = getShotZoneModifier(shotType, currentDef);
          const pressMod = (currentDef === 'Full-Court Press') ? getShotZoneModifier(shotType, 'Full-Court Press') : 1.0;
          // Pillar 3: Hero ball usage tax for AI (same rolling window logic)
          const aiUsageMod = getUsageMod(scorer.id, 'ai');
          // Fast break bypass: ignore defensive mod on open-court break (Pillar 1 interaction)
          const effectiveAiZoneMod = pace === 'fastbreak' ? 1.0 : zoneMod;
          const effectiveAiPressMod = pace === 'fastbreak' ? 1.0 : pressMod;
          const aiAdjustedChance = finalChance * aiScorerStamMod * newFormRating[scorer.id] * aiClutchMod * effectiveAiZoneMod * effectiveAiPressMod * aiUsageMod;
          const matchupAdj = matchupBonus;
          // Layer 3 (Step 8): AI home court adjustment
          const aiHomeAdj = userIsHome
            ? -getAwayPenalty(scorer)    // AI is away
            : getHomeCourtBoost(scorer); // AI is home
          // Pillar 2: Hard probability guardrails — floor 15%, ceiling 85% [DESIGN PARAMETER]
          const aiShotValueDifficulty = is3PT ? -0.095 : 0;
          const aiRealEfficiencyAdj = getShotIdentityEfficiencyAdjustment(scorer, is3PT, shotType);
          
          const aiAdditiveBonusSum = aiHomeAdj + matchupAdj + aiSkillShotBonus + aiRealEfficiencyAdj;
          const aiCappedAdditiveBonus = (is3PT && aiAdditiveBonusSum > 0)
            ? Math.min(aiAdditiveBonusSum, MAX_3PT_POSITIVE_ADDITIVE_BONUS)
            : aiAdditiveBonusSum;

          const individual3ptMod = is3PT ? getIndividualThreePointShotMod(scorer.shooting) : 1.0;
          const adjustedChanceWithIndividual3PT = aiAdjustedChance * individual3ptMod;

          const aiFinalChance = Math.max(0.15, Math.min(0.85, adjustedChanceWithIndividual3PT + aiCappedAdditiveBonus + aiShotValueDifficulty));
          const isSuccess = Math.random() < aiFinalChance;
          if (is3PT) {
            const baseHalfWidth = 2.0;
            const ratingBoost = Math.max(-1.5, ((scorer.shooting ?? 80) - 80) * 0.08);
            const rarityBoost = scorer.rarity === 'Mythic' ? 1.2 : (scorer.rarity === 'Legendary' ? 0.7 : (scorer.rarity === 'Epic' ? 0.3 : 0));
            const stratBoost = state.aiOffStrategy === 'Run & Gun' ? 0.8 : (state.aiOffStrategy === 'Pace & Space' ? 0.4 : 0);
            const opponentDef = currentDef;
            const defPenalty = (opponentDef === 'Half-Court Trap' || opponentDef === 'Full-Court Press') ? -0.5 : 0;
            
            const totalHalfWidth = baseHalfWidth + ratingBoost + rarityBoost + stratBoost + defPenalty;
            const greenWindowStart = Math.max(80, 94 - totalHalfWidth);
            const greenWindowEnd = Math.min(99, 94 + totalHalfWidth);

            const releaseProgress = isSuccess
              ? Math.floor(Math.random() * (greenWindowEnd - greenWindowStart + 1)) + greenWindowStart
              : (Math.random() < 0.5
                  ? Math.floor(Math.random() * 8) + 75
                  : Math.floor(Math.random() * 8) + Math.ceil(greenWindowEnd) + 1
                );
            const feedback = isSuccess
              ? "Excellent Release!"
              : (releaseProgress < greenWindowStart ? "Slightly Early" : "Slightly Late");

            newActiveShotMeter = {
              playerId: scorer.id,
              shooterName: scorer.name,
              is3PT: true,
              isSuccess,
              shotType,
              releaseProgress,
              greenWindowStart,
              greenWindowEnd,
              feedback,
              isAiTeam: true,
            };
          }
          if (isSuccess) {
            trackShotStamina(scorer.id, shotType, is3PT, 'make');
            trackDefensiveStamina(primaryDefender, shotType, is3PT, 'make');
            // Record to possession history for rolling usage window
            newPossessionHistory.push({ team: 'ai', playerId: scorer.id, wasTOV: false });
              pointsScored = is3PT ? 3 : 2;
              newPlayerStats[scorer.id].PTS += pointsScored;
              // Shot tracking — AI normal make
              newPlayerStats[scorer.id].FGM = (newPlayerStats[scorer.id].FGM ?? 0) + 1;
              newPlayerStats[scorer.id].FGA = (newPlayerStats[scorer.id].FGA ?? 0) + 1;
              if (is3PT) { newPlayerStats[scorer.id].TPM = (newPlayerStats[scorer.id].TPM ?? 0) + 1; newPlayerStats[scorer.id].TPA = (newPlayerStats[scorer.id].TPA ?? 0) + 1; }
              const aiEvtText = clutchSituation.active ? clutchScoreText(scorer, shotType, clutchSituation) : scoreText(scorer, shotType, state.aiOffStrategy, false);
              newEvents.push(makeEvent(newQuarter, newClock, aiEvtText, false, pointsScored, scorer.id));
              if (primaryDefender && hasAnyMark(newSkillMarks, primaryDefender.id) && rollSpecial(aiLineup, "Lung Burner X", newStamina)) {
                const hadDebt = hasMark(newSkillMarks, primaryDefender.id, "Debt");
                const drain = drainStamina(newStamina, primaryDefender, userLineup, hadDebt ? 190 : 110);
                skillLog(`Lung Burner X drains ${drain} stamina from ${primaryDefender.name}`, false);
                applyDebtCollector(aiLineup, userLineup, primaryDefender, false);
              }
              if (clutchSituation.active) { const fb = clutchSituation.intensity === 'high' ? 0.04 : 0.02; newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + fb); }
              // After made shot, ball goes to User (inbound)
              nextPossessionTeam = 'user';
              nextLastPlayCategory = 'made_shot';
              const tm = aiLineup.filter(p => p.id !== scorer.id);
            if (tm.length > 0) {
              const ws = tm.map(p => getAssistRating(p) || 50);
              const tw = ws.reduce((s, w) => s + w, 0);
              let r = Math.random() * tw;
              let a = tm[tm.length - 1];
              for (let i = 0; i < tm.length; i++) { r -= ws[i]; if (r <= 0) { a = tm[i]; break; } }
              const astChance = getAssistChance(a);
              if (Math.random() < astChance) {
                 ensureStats(a.id);
                 newPlayerStats[a.id].AST += 1;
                 if (hasBaseSkill(a, "Connector Hub") && rollBaseSkill(aiLineup, "Connector Hub", newStamina)) {
                   const connectorScale = 0.85 + (getAssistRating(a) / 100) * 0.30;
                   recoverSkillStamina(scorer, 35 * connectorScale);
                   skillLog(`${a.name}'s Connector Hub restores ${scorer.name}'s stamina`, false);
                 }
                 if (rollBaseSkill(aiLineup, "Share Rhythm", newStamina)) {
                   aiLineup.forEach(p => recoverSkillStamina(p, 8));
                   skillLog(`${a.name}'s Share Rhythm steadies the lineup`, false);
                 }
                 if (rollSpecial(aiLineup, "Chain Pass X", newStamina)) {
                   const debtTarget = getLowestStaminaPlayer(userLineup);
                   newSkillMarks = addMark(newSkillMarks, newMarkImmunity, debtTarget.id, "Debt", "Chain Pass X", 3);
                   skillLog(`Chain Pass X places Debt on ${debtTarget.name}`, false);
                 }
              }
            }
              // And-1
              if (!nonShootingFoulToFT) {
                const finishingRating = scorer && !is3PT ? getFinishingRating(scorer) : 50;
                const finishingAnd1Mod = 0.85 + (finishingRating / 100) * 0.30;
                let and1Chance = (is3PT ? 0.01 : 0.03) * getFoulStamMod(avgStamina(userLineup, newStamina)) * finishingAnd1Mod; // Reduced And-1 rate
                const MAX_AND1_CHANCE = 0.15;
                and1Chance = Math.min(MAX_AND1_CHANCE, and1Chance);
                if (Math.random() < and1Chance) {
                  const and1C = pickFoulCommitter(userLineup);
                  ensureStats(and1C.id);
                  newPlayerStats[and1C.id].FOL = (newPlayerStats[and1C.id].FOL ?? 0) + 1;
                  newTeamFouls.user[newQuarter - 1] += 1;
                  updateBonusState();
                  ensureForm(and1C.id); newFormRating[and1C.id] = clampForm(newFormRating[and1C.id] - 0.03);
                  ensureForm(scorer.id); newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + 0.05);
                  newEvents.push(makeEvent(newQuarter, newClock, `AND-1: ${scorer.name} scores through contact. One more from the line`, false));
                  eventIndicator = { playerId: and1C.id, type: 'FOL' };
                  runFTSequence(scorer.id, scorer.name, 1, true, and1C.name, newPlayerStats[and1C.id].FOL, false);
                  nextLastPlayCategory = 'foul_reset';
                }
              }
            } else {
              trackShotStamina(scorer.id, shotType, is3PT, 'miss');
              trackDefensiveStamina(primaryDefender, shotType, is3PT, 'miss');
              const aiMissEvt = clutchSituation.active ? clutchMissText(scorer, clutchSituation) : `Strong defense forces ${scorer.name} to miss!`;
              newEvents.push(makeEvent(newQuarter, newClock, aiMissEvt, false, 0, scorer.id));
              // Shot tracking — AI normal miss
              newPlayerStats[scorer.id].FGA = (newPlayerStats[scorer.id].FGA ?? 0) + 1;
              if (is3PT) newPlayerStats[scorer.id].TPA = (newPlayerStats[scorer.id].TPA ?? 0) + 1;
              if (clutchSituation.active) { const fp = clutchSituation.intensity === 'high' ? -0.04 : -0.02; newFormRating[scorer.id] = clampForm(newFormRating[scorer.id] + fp); }
            }
          }
        }
      }
    }

    // Rebound on AI miss (skip if steal, turnover, block, or foul occurred)
    if (pointsScored === 0 && !stealPlayerId && !turnoverOccurred && !blockOccurred && !shootingFoulOccurred && !nonShootingFoulToFT) {
      const attReb = teamRebScore(aiLineup);
      const defReb = teamRebScore(userLineup);
      const glassTouch = rollBaseSkill(aiLineup, "Glass Touch", newStamina);
      const paintBarrier = rollBaseSkill(userLineup, "Paint Barrier", newStamina);
      let glassScale = 0;
      if (glassTouch) {
        const holders = aiLineup.filter(p => hasBaseSkill(p, "Glass Touch"));
        const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getReboundRating(p))) : 50;
        glassScale = 0.85 + (maxRating / 100) * 0.30;
      }
      let barrierScale = 0;
      if (paintBarrier) {
        const holders = userLineup.filter(p => hasBaseSkill(p, "Paint Barrier"));
        const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getReboundRating(p))) : 50;
        barrierScale = 0.85 + (maxRating / 100) * 0.30;
      }
      const orebChance = getOffensiveReboundChance(attReb, defReb, glassScale, barrierScale);
      if (paintBarrier) skillLog(`Paint Barrier fights off the second-chance lane`, true);
      if (Math.random() < orebChance) {
        const reb = pickRebounder(aiLineup);
        awardReb(reb, 'OREB');
        eventIndicator = { playerId: reb.id, type: 'OREB' };
        newEvents.push(makeEvent(newQuarter, newClock, `${reb.name} gets the offensive rebound: second chance!`, false));
        if (glassTouch) skillLog(`${reb.name}'s Glass Touch creates second-chance pressure`, false);
        nextPossessionTeam = 'ai';
        nextLastPlayCategory = 'miss_oreb';
        // OREB second-chance with Roll F (Layer 5b)
        const sc2 = aiLineup[Math.floor(Math.random() * aiLineup.length)];
        ensureStats(sc2.id); ensureForm(sc2.id);
        let orebFoulFired = false;
        if (!nonShootingFoulToFT) {
          const orebFoulChance = 0.086 * getFoulStamMod(avgStamina(userLineup, newStamina));
          if (Math.random() < orebFoulChance) {
            orebFoulFired = true;
            const orebC = pickFoulCommitter(userLineup);
            ensureStats(orebC.id); ensureForm(orebC.id);
            newPlayerStats[orebC.id].FOL = (newPlayerStats[orebC.id].FOL ?? 0) + 1;
            newFormRating[orebC.id] = clampForm(newFormRating[orebC.id] - 0.02);
            newTeamFouls.user[newQuarter - 1] += 1;
            updateBonusState();
            ensureForm(sc2.id); newFormRating[sc2.id] = clampForm(newFormRating[sc2.id] + 0.02);
            newEvents.push(makeEvent(newQuarter, newClock, `Foul on the putback: ${orebC.name} (${newPlayerStats[orebC.id].FOL}/5). ${sc2.name} to the line for 2`, false));
            eventIndicator = { playerId: orebC.id, type: 'FOL' };
            runFTSequence(sc2.id, sc2.name, 2, false, orebC.name, newPlayerStats[orebC.id].FOL, false);
            // After OREB FTs, ball goes to User (inbound)
            nextPossessionTeam = 'user';
            nextLastPlayCategory = 'foul_reset';
          }
        }
        if (!orebFoulFired) {
          const stm2 = getPlayerStaminaMod(sc2, newStamina[sc2.id]);
          const fc2 = Math.max(0.30, Math.min(0.80, eAO / ((eAO + eUD) || 1))) * getStaminaMod(avgStamina(aiLineup, newStamina)) * stm2 * newFormRating[sc2.id] + (glassTouch ? 0.035 : 0);
          if (Math.random() < fc2) {
            const p2 = Math.random() < 0.24 ? 3 : 2;
            trackShotStamina(sc2.id, p2 === 3 ? 'catchAndShoot' : 'putBack', p2 === 3, 'make', 'oreb');
            pointsScored = p2;
            newPlayerStats[sc2.id].PTS += p2;
            // Shot tracking — AI OREB 2nd chance
            newPlayerStats[sc2.id].FGM = (newPlayerStats[sc2.id].FGM ?? 0) + 1;
            newPlayerStats[sc2.id].FGA = (newPlayerStats[sc2.id].FGA ?? 0) + 1;
            if (p2 === 3) { newPlayerStats[sc2.id].TPM = (newPlayerStats[sc2.id].TPM ?? 0) + 1; newPlayerStats[sc2.id].TPA = (newPlayerStats[sc2.id].TPA ?? 0) + 1; }
            activePlayerId = sc2.id;
            scoringTeamIsUser = false;
            newEvents.push(makeEvent(newQuarter, newClock, `Second chance: ${sc2.name} converts! (+${p2})`, false, p2, sc2.id));
            // After made shot, ball goes to User (inbound)
            nextPossessionTeam = 'user';
            nextLastPlayCategory = 'made_shot';
          } else {
            trackShotStamina(sc2.id, 'putBack', false, 'miss', 'oreb');
            newPlayerStats[sc2.id].FGA = (newPlayerStats[sc2.id].FGA ?? 0) + 1;
            const dreb = pickRebounder(userLineup);
            awardReb(dreb, 'DREB');
            eventIndicator = { playerId: dreb.id, type: 'REB' };
            newEvents.push(makeEvent(newQuarter, newClock, `${reb.name} with the board: ${aiTeamObj.name} gets another look but can't convert`, false));
            newEvents.push(makeEvent(newQuarter, newClock, `${dreb.name} pulls down the board`, true));
            nextPossessionTeam = 'user';
            nextLastPlayCategory = 'miss_dreb';
          }
        }
      } else {
        const dreb = pickRebounder(userLineup);
        awardReb(dreb, 'DREB');
        eventIndicator = { playerId: dreb.id, type: 'REB' };
        newEvents.push(makeEvent(newQuarter, newClock, `${dreb.name} pulls down the board`, true));
        nextPossessionTeam = 'user';
        nextLastPlayCategory = 'miss_dreb';
      }
    }
    }
  }

  // ═══ STEP 8: UPDATE FORM RATINGS ═══
  // Skip if turnover or block occurred — form deltas already applied inline
  if (activePlayerId && !turnoverOccurred && !blockOccurred) {
    ensureForm(activePlayerId);
    if (pointsScored === 3) {
      newFormRating[activePlayerId] = clampForm(newFormRating[activePlayerId] + 0.04);
    } else if (pointsScored === 2) {
      newFormRating[activePlayerId] = clampForm(newFormRating[activePlayerId] + 0.03);
    } else if (!stealPlayerId) {
      // Miss penalty (not applied when a Blitz/Trap steal occurred)
      newFormRating[activePlayerId] = clampForm(newFormRating[activePlayerId] - 0.025);
    }
  }
  // Defender form: top DEF player on defending team gets penalized when scored on
  if (pointsScored > 0) {
    const defenders = isUserPoss ? aiLineup : userLineup;
    const topDef = [...defenders].sort((a, b) => b.defense - a.defense)[0];
    if (topDef) { ensureForm(topDef.id); newFormRating[topDef.id] = clampForm(newFormRating[topDef.id] - 0.02); }
  }
  // Steal form boost
  if (stealPlayerId) {
    ensureForm(stealPlayerId);
    newFormRating[stealPlayerId] = clampForm(newFormRating[stealPlayerId] + 0.04);
  }

  // ═══ STEP 9: ACTION STAMINA COST (PHYSICAL PLAYS, USAGE, DEFENSE CONTESTS) ═══
  // High-impact involvement drains energy dynamically matching real NBA activity rates!
  
  const allActivePlayers = [...userLineup, ...aiLineup];
  const applyActionStaminaCost = (playerId: string, cost: number) => {
    const activePlayer = allActivePlayers.find(p => p.id === playerId);
    newStamina[playerId] = Math.max(0, (newStamina[playerId] ?? 100) - Math.round(cost * STAMINA_CONFIG.modifiers.globalWorkloadScale * getStaminaCostScale(activePlayer)));
  };
  const isRimShot = (shotType: ShotType) => (
    shotType === 'euroStep' || shotType === 'floater' || shotType === 'fingerRoll' ||
    shotType === 'drivingLayup' || shotType === 'dunk' || shotType === 'powerLayup' ||
    shotType === 'hookShot' || shotType === 'putBack'
  );
  const isHeavyShot = (shotType: ShotType) => (
    shotType === 'stepBackMid' || shotType === 'stepBackThree' || shotType === 'fadeaway'
  );
  const isPullUpShot = (shotType: ShotType) => (
    shotType === 'pullUpMid' || shotType === 'pullUpThree'
  );
  const getShotBaseCost = (attempt: typeof shotStaminaAttempts[number]): number => {
    if (isRimShot(attempt.shotType)) {
      if (attempt.outcome === 'block') return attempt.shotType === 'dunk' ? STAMINA_CONFIG.rim.blockedDunk : STAMINA_CONFIG.rim.blockedLayup;
      if (attempt.shotType === 'dunk') return STAMINA_CONFIG.rim.dunk;
      if (attempt.shotType === 'putBack') return STAMINA_CONFIG.rebounding.putbackAttempt;
      if (attempt.shotType === 'powerLayup' || attempt.shotType === 'hookShot') return STAMINA_CONFIG.rim.contactFinish;
      return STAMINA_CONFIG.rim.layup;
    }
    if (attempt.outcome === 'block') return STAMINA_CONFIG.shooting.blockedJumper;
    if (attempt.shotType === 'catchAndShoot' || attempt.shotType === 'cornerThree') return STAMINA_CONFIG.shooting.openCatchShoot;
    if (isHeavyShot(attempt.shotType)) return STAMINA_CONFIG.shooting.stepBackOrFadeaway;
    if (isPullUpShot(attempt.shotType)) return STAMINA_CONFIG.shooting.pullUp;
    return STAMINA_CONFIG.shooting.normalJumper;
  };
  const getContextMultiplier = (player: Player | undefined, playerId: string, outcome: ShotStaminaOutcome, context?: 'normal' | 'oreb'): number => {
    let mult = 1;
    const pct = player ? getStaminaPercent(player, newStamina[playerId]) : 100;
    if (outcome === 'make') mult *= STAMINA_CONFIG.modifiers.make;
    if (outcome === 'miss') mult *= STAMINA_CONFIG.modifiers.miss;
    if (outcome === 'foul') mult *= STAMINA_CONFIG.modifiers.foul;
    if (outcome === 'block') mult *= STAMINA_CONFIG.modifiers.block;
    if (clutchSituation.active) mult *= STAMINA_CONFIG.modifiers.clutchTime;
    if (state.quarter >= 5) mult *= STAMINA_CONFIG.modifiers.overtime;
    if (pace === 'fastbreak' || pace === 'early_offense') mult *= STAMINA_CONFIG.modifiers.transition;
    if (pace === 'late_clock') mult *= STAMINA_CONFIG.modifiers.lateClock;
    if (context === 'oreb') mult *= STAMINA_CONFIG.modifiers.orebSecondChance;
    if (pct < 45) mult *= STAMINA_CONFIG.modifiers.alreadyTired;
    if (pct < 30) mult *= STAMINA_CONFIG.modifiers.exhausted;
    const isUserPlayer = userLineup.some(p => p.id === playerId);
    const team = isUserPlayer ? 'user' : 'ai';
    if (getUsageMod(playerId, team) < 0.95) mult *= STAMINA_CONFIG.modifiers.highUsage;
    const lastPoss = newPossessionHistory[newPossessionHistory.length - 1];
    if (lastPoss?.playerId === playerId && lastPoss.team === team) mult *= STAMINA_CONFIG.modifiers.backToBackPossession;
    const facedDefense = isUserPlayer ? state.aiDefStrategy : state.userDefStrategy;
    if (facedDefense === 'Full-Court Press' || facedDefense === 'Full-court press') mult *= STAMINA_CONFIG.modifiers.fullCourtPress;
    return Math.max(0.75, Math.min(1.95, mult));
  };
  const getDefensiveCost = (attempt: typeof defensiveStaminaAttempts[number]): number => {
    if (attempt.outcome === 'block') return STAMINA_CONFIG.defense.successfulBlock;
    if (attempt.outcome === 'foul') return STAMINA_CONFIG.defense.jumpContest + STAMINA_CONFIG.defense.foul;
    if (attempt.outcome === 'miss') return attempt.is3PT ? STAMINA_CONFIG.defense.hardCloseout : STAMINA_CONFIG.defense.jumpContest;
    return attempt.is3PT ? STAMINA_CONFIG.defense.hardCloseout : STAMINA_CONFIG.defense.lightContest;
  };
  const getDefensiveEffortCost = (attempt: typeof defensiveEffortAttempts[number]): number => {
    if (attempt.type === 'failedBlock') return STAMINA_CONFIG.defense.failedBlock;
    if (attempt.type === 'failedSteal') return STAMINA_CONFIG.defense.failedSteal;
    if (attempt.type === 'trapRotation') return STAMINA_CONFIG.defense.trapRotation;
    return STAMINA_CONFIG.defense.pressChase;
  };
  const defenseStrategyForWorkload = actionWorkload.defensiveStrategy;
  const defendingLineupForWorkload = actionWorkload.possessionTeam === 'user' ? aiLineup : userLineup;
  if (defenseStrategyForWorkload === 'Full-Court Press' || defenseStrategyForWorkload === 'Full-court press') {
    defendingLineupForWorkload.forEach(p => trackDefensiveEffort(p, 'pressChase'));
  } else if (defenseStrategyForWorkload === 'Blitz/Trap') {
    defendingLineupForWorkload.forEach(p => trackDefensiveEffort(p, 'trapRotation'));
  } else if (defenseStrategyForWorkload === 'Half-Court Press' || defenseStrategyForWorkload === 'Half-court press') {
    defendingLineupForWorkload.slice(0, 3).forEach(p => trackDefensiveEffort(p, 'pressChase'));
  }
  if (!stealPlayerId && !turnoverOccurred && (
    defenseStrategyForWorkload === 'Full-Court Press' ||
    defenseStrategyForWorkload === 'Full-court press' ||
    defenseStrategyForWorkload === 'Blitz/Trap'
  )) {
    const gambler = [...defendingLineupForWorkload].sort((a, b) => (b.steal ?? b.defense) - (a.steal ?? a.defense))[0];
    trackDefensiveEffort(gambler, 'failedSteal');
  }

  // 1. Offensive Ball-Handler/Shooter Tax (Usage Rate involvement)
  // Shot attempts are tracked at the exact result. That keeps a miss attached to
  // the original shooter even if an offensive rebound creates a second chance.
  shotStaminaAttempts.forEach(attempt => {
    const actor = allActivePlayers.find(p => p.id === attempt.playerId);
    let creationTax = 0;
    if (activeOffStrategy === 'Isolation (ISO)' || activeOffStrategy === 'Post Isolation') {
      creationTax += STAMINA_CONFIG.ballHandling.isolation;
    }
    if (pace === 'late_clock') {
      creationTax += STAMINA_CONFIG.ballHandling.lateClockCreation;
    }
    const baseCost = STAMINA_CONFIG.ballHandling.quickTouch + getShotBaseCost(attempt) + creationTax;
    applyActionStaminaCost(attempt.playerId, baseCost * getContextMultiplier(actor, attempt.playerId, attempt.outcome, attempt.context));
  });

  defensiveStaminaAttempts.forEach(attempt => {
    const actor = allActivePlayers.find(p => p.id === attempt.playerId);
    applyActionStaminaCost(attempt.playerId, getDefensiveCost(attempt) * getContextMultiplier(actor, attempt.playerId, attempt.outcome));
  });

  defensiveEffortAttempts.forEach(attempt => {
    applyActionStaminaCost(attempt.playerId, getDefensiveEffortCost(attempt));
  });

  if (activePlayerId && shotStaminaAttempts.length === 0) {
    applyActionStaminaCost(activePlayerId, turnoverOccurred ? STAMINA_CONFIG.ballHandling.turnover : STAMINA_CONFIG.ballHandling.quickTouch);
  }

  // 2. Playmaker Assist Tax
  if (eventIndicator?.type === 'AST' && eventIndicator.playerId) {
    const actor = [...userLineup, ...aiLineup].find(p => p.id === eventIndicator?.playerId);
    applyActionStaminaCost(eventIndicator.playerId, STAMINA_CONFIG.ballHandling.quickTouch + 0.45);
  }

  // 3. Physical Rebounding Tax (OREB is extra contested)
  if (eventIndicator?.type === 'OREB' && eventIndicator.playerId) {
    const actor = [...userLineup, ...aiLineup].find(p => p.id === eventIndicator?.playerId);
    applyActionStaminaCost(eventIndicator.playerId, STAMINA_CONFIG.rebounding.offensiveReboundBattle);
  } else if (eventIndicator?.type === 'REB' && eventIndicator.playerId) {
    const actor = [...userLineup, ...aiLineup].find(p => p.id === eventIndicator?.playerId);
    applyActionStaminaCost(eventIndicator.playerId, STAMINA_CONFIG.rebounding.normalRebound);
  }

  // 4. Defensive Explosive Blocks & Steals Tax
  const alreadyChargedContest = (playerId: string) => defensiveStaminaAttempts.some(a => a.playerId === playerId);
  if (eventIndicator?.type === 'BLK' && eventIndicator.playerId) {
    if (!alreadyChargedContest(eventIndicator.playerId)) {
      applyActionStaminaCost(eventIndicator.playerId, STAMINA_CONFIG.defense.successfulBlock);
    }
  } else if (eventIndicator?.type === 'STL' && eventIndicator.playerId) {
    const actor = [...userLineup, ...aiLineup].find(p => p.id === eventIndicator?.playerId);
    applyActionStaminaCost(eventIndicator.playerId, STAMINA_CONFIG.defense.successfulSteal);
  }

  // 5. Physical Foul Tax
  if (eventIndicator?.type === 'FOL' && eventIndicator.playerId) {
    if (!alreadyChargedContest(eventIndicator.playerId)) {
      applyActionStaminaCost(eventIndicator.playerId, STAMINA_CONFIG.defense.foul);
    }
  }

  // ═══ STEP 10: HOT PLAYER CHECK ═══
  const newTracker = { ...state.actionStaminaTracker };
  const newHotPlayers = { ...state.hotPlayers };
  const newConsecutive = { ...state.playerConsecutive };

  if (activePlayerId && pointsScored > 0) {
    newConsecutive[activePlayerId] = (newConsecutive[activePlayerId] || 0) + 1;
    const entry = newTracker[activePlayerId] || { lost: 0, windowStart: gameTimeSec };
    if (gameTimeSec - entry.windowStart > 60) { entry.lost = 0; entry.windowStart = gameTimeSec; }
    entry.lost += pointsScored === 3 ? 4 : 3;
    newTracker[activePlayerId] = entry;
    if (entry.lost >= 15) newHotPlayers[activePlayerId] = true;
  } else if (activePlayerId && pointsScored === 0) {
    newConsecutive[activePlayerId] = 0;
  }

  Object.keys(newTracker).forEach(pid => {
    if (gameTimeSec - newTracker[pid].windowStart > 60) {
      newTracker[pid].lost = 0;
      if (!newHotFromForm[pid]) newHotPlayers[pid] = false;
    }
  });

  // Form-based hot/cold triggers
  Object.keys(newFormRating).forEach(pid => {
    if (newFormRating[pid] >= 1.10) {
      newHotFromForm[pid] = true;
      newHotPlayers[pid] = true;
    } else if (newFormRating[pid] < 1.05 && newHotFromForm[pid]) {
      newHotFromForm[pid] = false;
      // Only remove hot if not hot from other paths
      const fromStamina = (newTracker[pid] && newTracker[pid].lost >= 15);
      if (!fromStamina) newHotPlayers[pid] = false;
    }
  });

  // ═══ STEP 11: MOMENTUM ═══
  let newUserMom = state.userMomentum, newAiMom = state.aiMomentum;
  let consUserRun = state.consecutiveUserRun, consAiRun = state.consecutiveAiRun;

  if (pointsScored > 0) {
    if (scoringTeamIsUser) {
      newUserMom = Math.min(100, newUserMom + pointsScored * 3);
      newAiMom = Math.max(0, newAiMom - pointsScored * 2);
      consUserRun += pointsScored; consAiRun = 0;
    } else {
      newAiMom = Math.min(100, newAiMom + pointsScored * 3);
      newUserMom = Math.max(0, newUserMom - pointsScored * 2);
      consAiRun += pointsScored; consUserRun = 0;
    }
  } else {
    if (newUserMom > 50) newUserMom -= 1;
    if (newAiMom > 50) newAiMom -= 1;
  }

  // ═══ STEP 12: NARRATIVE INJECTIONS (Layer 5) ═══
  // Run narrative
  const aiRunText = runNarrative(aiTeamObj.name, consAiRun);
  if (aiRunText) newEvents.push(makeEvent(newQuarter, newClock, aiRunText, false));
  const userRunText = runNarrative("My Team", consUserRun);
  if (userRunText) newEvents.push(makeEvent(newQuarter, newClock, userRunText, true));

  // Hot player narrative
  if (activePlayerId && pointsScored > 0) {
    const consec = newConsecutive[activePlayerId] || 0;
    const hotText = hotNarrative(isUserPoss ? userLineup.find(p => p.id === activePlayerId)! : aiLineup.find(p => p.id === activePlayerId)!, consec);
    if (hotText) newEvents.push(makeEvent(newQuarter, newClock, hotText, isUserPoss));
  }

  // Dominant player (check all)
  if (Math.random() < 0.15) {
    [...userLineup, ...aiLineup].forEach(p => {
      const pts = newPlayerStats[p.id]?.PTS || 0;
      const dt = dominantNarrative(p, pts);
      if (dt) newEvents.push(makeEvent(newQuarter, newClock, dt, userLineup.some(u => u.id === p.id)));
    });
  }

  // Fatigue narrative (occasional)
  if (Math.random() < 0.2) {
    const ft = fatigueNarrative("My Team", userAvg, newQuarter, userLineup, newStamina);
    if (ft) newEvents.push(makeEvent(newQuarter, newClock, ft, true));
  }

  // Strategy warnings as narrative
  warnings.forEach(w => newEvents.push(makeEvent(newQuarter, newClock, w, true)));

  // ═══ STEP 8 LAYER 7: HOME COURT NARRATIVE INJECTIONS ═══
  // Q1 Opener — fires exactly once when Q1 starts (clock near 720)
  if (newQuarter === 1 && newClock >= 700 && state.clock === 720) {
    const openerText = userIsHome
      ? `Welcome to the Arena: My Team has home court tonight!`
      : `On the road tonight: ${aiTeamObj.name} has home court advantage`;
    newEvents.push(makeEvent(newQuarter, newClock, openerText, userIsHome));
  }

  // Rally mode narrative — fires once when rally activates (prev tick no rally, this tick yes)
  const prevRallyMode = userIsHome
    ? state.userScore < state.aiScore && Math.abs(state.userScore - state.aiScore) <= 10
    : state.aiScore < state.userScore && Math.abs(state.userScore - state.aiScore) <= 10;
  if (homeCourt.rallyMode && !prevRallyMode) {
    const rallyText = userIsHome
      ? `Crowd rallying: fans refuse to let My Team lose at home!`
      : `Home crowd rallying for ${aiTeamObj.name}: My Team feeling the pressure on the road`;
    newEvents.push(makeEvent(newQuarter, newClock, rallyText, userIsHome));
  }

  // Layer 6 compound: Clutch + home crowd narrative (fires once per clutch window entry)
  if (clutchSituation.active && !state.events.some(e => e.text.includes('Arena is ELECTRIC') || e.text.includes('Hostile crowd'))) {
    const compoundText = userIsHome
      ? `Arena is ELECTRIC: home crowd lifting My Team!`
      : `Hostile crowd: My Team grinding on the road in crunch time`;
    newEvents.push(makeEvent(newQuarter, newClock, compoundText, userIsHome));
  }

  // ═══ FORM NARRATIVE INJECTIONS ═══
  [...userLineup, ...aiLineup].forEach(p => {
    ensureForm(p.id); ensureFormFired(p.id);
    const f = newFormRating[p.id];
    const fired = newFormFired[p.id];
    const isUser = userLineup.some(u => u.id === p.id);
    // Hot 1.08 crossing
    if (f >= 1.08 && !fired.hot108) {
      fired.hot108 = true;
      newEvents.push(makeEvent(newQuarter, newClock, `${p.name} is finding their rhythm`, isUser));
    } else if (f < 1.08) fired.hot108 = false;
    // Hot 1.12 crossing
    if (f >= 1.12 && !fired.hot112) {
      fired.hot112 = true;
      newEvents.push(makeEvent(newQuarter, newClock, `${p.name} is heating up: can't miss right now`, isUser));
    } else if (f < 1.12) fired.hot112 = false;
    // Cold 0.92 crossing
    if (f <= 0.92 && !fired.cold092) {
      fired.cold092 = true;
      newEvents.push(makeEvent(newQuarter, newClock, `${p.name} can't get it going tonight`, isUser));
    } else if (f > 0.92) fired.cold092 = false;
    // Cold 0.88 crossing
    if (f <= 0.88 && !fired.cold088) {
      fired.cold088 = true;
      newEvents.push(makeEvent(newQuarter, newClock, `${p.name} is cold: ${isUser ? 'My Team' : aiTeamObj.name} may need to look elsewhere`, isUser));
    } else if (f > 0.88) fired.cold088 = false;
    // Recovery crossing (was cold, now recovered)
    if (!fired.recovered && f > 0.97) {
      fired.recovered = true;
      newEvents.push(makeEvent(newQuarter, newClock, `${p.name} starting to find their touch`, isUser));
    }
    if (f < 0.92) fired.recovered = false;
  });

  // ═══ STEP 13: DERIVE SCORES ═══
  const newUserPlayerIds = new Set(state.userPlayerIds);
  userLineup.forEach(p => newUserPlayerIds.add(p.id));
  const newAiPlayerIds = new Set(state.aiPlayerIds);
  aiLineup.forEach(p => newAiPlayerIds.add(p.id));
  const uIds = Array.from(newUserPlayerIds), aIds = Array.from(newAiPlayerIds);

  const derivedUserScore = computeTeamScore(newPlayerStats, uIds);
  const derivedAiScore = computeTeamScore(newPlayerStats, aIds);

  const userTickPoints = derivedUserScore - state.userScore;
  const aiTickPoints = derivedAiScore - state.aiScore;

  if (state.isOT && (state.otPeriod ?? 0) > 0) {
    const otIdx = (state.otPeriod ?? 1) - 1;
    if (userTickPoints > 0) newOTScores.user[otIdx] += userTickPoints;
    if (aiTickPoints > 0) newOTScores.ai[otIdx] += aiTickPoints;
  }

  // BUZZER BEATER CHECK (scoring in last 5 secs of ANY period)
  if ((userTickPoints > 0 || aiTickPoints > 0) && newClock <= 5) {
    const tied = derivedUserScore === derivedAiScore;
    const userScored = userTickPoints > 0;
    const scorerName = userScored ? userLineup.find(p=>p.id===activePlayerId)?.name || 'My Team' : aiLineup.find(p=>p.id===activePlayerId)?.name || aiTeamObj.name;
    const teamName = userScored ? "My Team" : aiTeamObj.name;
    
    // Form delta
    if (activePlayerId) newFormRating[activePlayerId] = clampForm(newFormRating[activePlayerId] + 0.08);
    (userScored ? aiLineup : userLineup).forEach(p => {
      newFormRating[p.id] = clampForm((newFormRating[p.id] ?? 1.0) - 0.05);
    });

    if (state.isOT) {
      if (tied) newEvents.push(makeEvent(newQuarter, newClock, `BUZZER BEATER: ${scorerName} sends it to another OT! This game continues!`, userScored, 0));
      else newEvents.push(makeEvent(newQuarter, newClock, `BUZZER BEATER: ${scorerName} ends it in OT! ${derivedUserScore}-${derivedAiScore} final!`, userScored, 0));
    } else {
      if (tied) newEvents.push(makeEvent(newQuarter, newClock, `BUZZER BEATER: ${scorerName} ties it at ${derivedUserScore}! Going to overtime!`, userScored, 0));
      else newEvents.push(makeEvent(newQuarter, newClock, `BUZZER BEATER: ${scorerName} wins it at the buzzer! ${teamName} wins ${derivedUserScore}-${derivedAiScore}!`, userScored, 0));
    }
  }

  let shootoutSequenceResult: MatchState['shootoutSequence'] = null;
  // SUDDEN DEATH SHOOTOUT LOGIC
  if (finished && state.isOT && (state.otPeriod ?? 0) >= 3 && derivedUserScore === derivedAiScore) {
    // Both teams pick highest OVR players descending
    const sortedUser = [...userLineup].filter(p => !newFouledOut.includes(p.id)).sort((a,b) => b.ovr - a.ovr);
    const sortedAi = [...aiLineup].filter(p => !newFouledOut.includes(p.id)).sort((a,b) => b.ovr - a.ovr);
    const results = [];
    let winner: 'user' | 'ai' | 'coin_flip' | null = null;

    for (let round = 0; round < Math.min(5, sortedUser.length, sortedAi.length); round++) {
      const uPlayer = sortedUser[round];
      const aPlayer = sortedAi[round];
      const uChance = Math.min(0.95, Math.max(0.50, 0.60 + (uPlayer.offense - 60) * 0.003));
      const aChance = Math.min(0.95, Math.max(0.50, 0.60 + (aPlayer.offense - 60) * 0.003));
      
      const uMade = Math.random() < uChance;
      const aMade = Math.random() < aChance;
      
      results.push({
        userPlayerId: uPlayer.id, userPlayerName: uPlayer.name,
        aiPlayerId: aPlayer.id, aiPlayerName: aPlayer.name,
        userMade: uMade, aiMade: aMade
      });

      if (uMade && !aMade) { winner = 'user'; break; }
      if (!uMade && aMade) { winner = 'ai'; break; }
    }
    
    if (!winner) winner = Math.random() < 0.5 ? 'user' : 'ai'; // coin flip fallback
    
    shootoutSequenceResult = { results, winner };
    nextLastPlayCategory = 'foul_reset';
    // We adjust final scores here because shootout resolves synchronously
    if (winner === 'user') {
        const uIdx = sortedUser[results.length - 1]?.id;
        if (uIdx) newPlayerStats[uIdx].PTS += 1;
        newOTScores.user[newOTScores.user.length - 1] += 1;
    } else {
        const aIdx = sortedAi[results.length - 1]?.id;
        if (aIdx) newPlayerStats[aIdx].PTS += 1;
        newOTScores.ai[newOTScores.ai.length - 1] += 1;
    }
  }

  const finalUserScore = computeTeamScore(newPlayerStats, uIds);
  const finalAiScore = computeTeamScore(newPlayerStats, aIds);

  // ═══ DYNAMIC PLUS-MINUS CALCULATION ═══
  const userPtsThisTick = finalUserScore - state.userScore;
  const aiPtsThisTick = finalAiScore - state.aiScore;

  if (userPtsThisTick > 0) {
    userLineup.forEach(p => {
      ensureStats(p.id);
      newPlayerStats[p.id].plusMinus = (newPlayerStats[p.id].plusMinus ?? 0) + userPtsThisTick;
    });
    aiLineup.forEach(p => {
      ensureStats(p.id);
      newPlayerStats[p.id].plusMinus = (newPlayerStats[p.id].plusMinus ?? 0) - userPtsThisTick;
    });
  }
  if (aiPtsThisTick > 0) {
    aiLineup.forEach(p => {
      ensureStats(p.id);
      newPlayerStats[p.id].plusMinus = (newPlayerStats[p.id].plusMinus ?? 0) + aiPtsThisTick;
    });
    userLineup.forEach(p => {
      ensureStats(p.id);
      newPlayerStats[p.id].plusMinus = (newPlayerStats[p.id].plusMinus ?? 0) - aiPtsThisTick;
    });
  }

  // Track quarter scores
  const qScores = { user: [...state.quarterScores.user], ai: [...state.quarterScores.ai] };
  let qStartUser = state.quarterStartUserScore;
  let qStartAi = state.quarterStartAiScore;
  if (quarterEnded) {
    const prevQ = newQuarter - 2; // quarter that just ended (0-indexed)
    if (prevQ >= 0 && prevQ < 4) {
      qScores.user[prevQ] = finalUserScore - qStartUser;
      qScores.ai[prevQ] = finalAiScore - qStartAi;
    }
    qStartUser = finalUserScore;
    qStartAi = finalAiScore;
  }
  if (finished) {
    const lastQ = newQuarter - 1;
    if (lastQ >= 0 && lastQ < 4) {
      qScores.user[lastQ] = finalUserScore - qStartUser;
      qScores.ai[lastQ] = finalAiScore - qStartAi;
    }
  }

  // Track longest runs
  const longestUser = Math.max(state.longestUserRun, consUserRun);
  const longestAi = Math.max(state.longestAiRun, consAiRun);

  // Track hot player last scored time
  const hotLastScored = { ...state.hotPlayerLastScored };
  if (activePlayerId && pointsScored > 0) hotLastScored[activePlayerId] = gameTimeSec;

  // Halftime
  let halftimeShown = state.halftimeShown;
  if (quarterEnded && state.quarter === 2 && !state.halftimeShown) halftimeShown = true;

  const allEvents = [...newEvents, ...state.events].slice(0, 50);

  // ═══ FOUL OUT CHECK ═══
  // Note: if two players foul out same tick, only last auto-sub is returned (astronomically unlikely)
  const checkFoulOuts = (lineup: Player[], isUser: boolean) => {
    lineup.forEach(p => {
      ensureStats(p.id);
      if ((newPlayerStats[p.id].FOL ?? 0) >= 5 && !newFouledOut.includes(p.id)) {
        newFouledOut.push(p.id);
        ensureForm(p.id); newFormRating[p.id] = 0.85; // emotional collapse
        if (isUser) {
          const bench = allUserRoster.filter(bp =>
            !lineup.find(lp => lp.id === bp.id) && !newFouledOut.includes(bp.id));
          if (bench.length > 0) {
            const sub = [...bench].sort((a, b) => b.ovr - a.ovr)[0];
            pendingAutoSubResult = { outId: p.id, inId: sub.id };
            allEvents.unshift(makeEvent(newQuarter, newClock, `DQ: ${p.name} fouled out. ${sub.name} checks in`, true));
          } else {
            allEvents.unshift(makeEvent(newQuarter, newClock, `DQ: ${p.name} has 5 fouls: no bench available, stays on court`, true));
          }
        } else {
          const bench = aiTeamObj.roster.filter(bp =>
            !lineup.find(lp => lp.id === bp.id) && !newFouledOut.includes(bp.id));
          if (bench.length > 0) {
            let sub = bench.find(bp => bp.position === p.position);
            if (!sub) sub = [...bench].sort((a, b) => b.ovr - a.ovr)[0];
            const idx = nextAiLineupIds.indexOf(p.id);
            if (idx !== -1) {
              nextAiLineupIds[idx] = sub.id;
            }
            allEvents.unshift(makeEvent(newQuarter, newClock, `DQ: ${p.name} fouled out. ${sub.name} checks in`, false));
          } else {
            allEvents.unshift(makeEvent(newQuarter, newClock, `DQ: ${p.name} has 5 fouls: stays on court`, false));
          }
        }
      }
    });
  };
  checkFoulOuts(userLineup, true);
  checkFoulOuts(aiLineup, false);

  // ─── FAST BREAK & SHOT CLOCK ENFORCEMENT ───
  let nextPossClock = 24;
  const nextPossTeam = nextPossessionTeam;
  let nextFastBreakActive = false;
  let nextFastBreakTeam: 'user' | 'ai' | null = null;

  // 1. Trigger fast breaks on defense steals/blocks with high probabilistic transition (55% base rate)
  if (stealPlayerId || blockOccurred) {
    const wasUserAttacking = currentPossession === 'user';
    const defensiveTeam = wasUserAttacking ? 'ai' : 'user';
    if (Math.random() < 0.55) {
      nextFastBreakActive = true;
      nextFastBreakTeam = defensiveTeam;
      allEvents.unshift(makeEvent(newQuarter, newClock,
        `TRANSITION: ${defensiveTeam === 'user' ? 'My Team' : aiTeamObj.name} pushes the pace!`,
        defensiveTeam === 'user'
      ));
    }
  }

  // 2. Shot clock tracking and reset logic
  if (pointsScored > 0 || turnoverOccurred) {
    // Made shot or turnover resets clock to 24s for next team
    nextPossClock = 24;
  } else {
    const isOreb = eventIndicator?.type === 'OREB';
    if (isOreb) {
      // NBA 2018+ rule: shot clock resets to 14s on offensive rebound of rim shot
      nextPossClock = 14;
    } else {
      // Possession team stayed the same (e.g. non-shooting foul retain or simple drift)
      if (state.possessionTeam === nextPossTeam) {
        nextPossClock = Math.max(0, (state.possessionClock ?? 24) - timeElapsed);
      } else {
        // Possession changed naturally
        nextPossClock = 24;
      }
    }
  }

  const applyEjection = (
    playerId: string,
    isUserTeam: boolean,
    playerName: string,
    q: number,
    clock: number
  ): void => {
    // Add to ejectedPlayers if not already there
    if (!newFouledOut.includes(playerId)) {
      newFouledOut.push(playerId);
    }
    // Mark form as collapsed (same as foul-out)
    ensureForm(playerId);
    newFormRating[playerId] = 0.85;
    // Fire ejection event
    newEvents.push(makeEvent(q, clock,
      `EJECTED: ${playerName} is out of the game!`,
      isUserTeam
    ));
    // If AI player: remove from nextAiLineupIds and replace with best available bench
    if (!isUserTeam) {
      const idx = nextAiLineupIds.indexOf(playerId);
      if (idx !== -1) {
        const bench = aiTeamObj.roster.filter(p =>
          !nextAiLineupIds.includes(p.id) &&
          !newFouledOut.includes(p.id)
        );
        if (bench.length > 0) {
          const sub = bench.sort((a, b) => b.ovr - a.ovr)[0];
          nextAiLineupIds[idx] = sub.id;
          newEvents.push(makeEvent(q, clock,
            `Substitution: ${aiTeamObj.name}: ${sub.name} checks in`,
            false
          ));
        }
      }
    }
    // If user player: set pendingAutoSubResult so the UI handles it
    if (isUserTeam) {
      const bench = allUserRoster.filter(p =>
        !userLineup.find(lp => lp.id === p.id) &&
        !newFouledOut.includes(p.id)
      );
      if (bench.length > 0) {
        const sub = bench.sort((a, b) => b.ovr - a.ovr)[0];
        pendingAutoSubResult = { outId: playerId, inId: sub.id };
      }
    }
  };

  return {
    ...state,
    quarter: newQuarter, clock: newClock,
    userScore: finalUserScore, aiScore: finalAiScore,
    events: allEvents, isFinished: finished,
    lastScorerId: pointsScored > 0 ? activePlayerId : undefined,
    lastPointsScored: pointsScored > 0 ? pointsScored : undefined,
    userMomentum: newUserMom, aiMomentum: newAiMom,
    playerStamina: newStamina, playerStats: newPlayerStats,
    userOffStrategy: currentOff, userDefStrategy: currentDef,
    lastStrategyChange: state.lastStrategyChange,
    aiOffStrategy: aiOffStrat, aiDefStrategy: aiDefStrat,
    lastAiStrategyChange: lastAiChange,
    timeoutsLeft: state.timeoutsLeft,
    momentumUsesLeft: state.momentumUsesLeft,
    momentumActive, momentumEndTime,
    actionStaminaTracker: newTracker, hotPlayers: newHotPlayers,
    halftimeShown,
    userPlayerIds: uIds, aiPlayerIds: aIds,
    aiLineupIds: nextAiLineupIds,
    effectiveUserOff: userEff.off, effectiveUserDef: userEff.def,
    effectiveAiOff: aiEff.off, effectiveAiDef: aiEff.def,
    prevUserOff: state.effectiveUserOff, prevUserDef: state.effectiveUserDef,
    prevAiOff: state.effectiveAiOff, prevAiDef: state.effectiveAiDef,
    strategyWarnings: warnings,
    consecutiveUserRun: consUserRun, consecutiveAiRun: consAiRun,
    playerConsecutive: newConsecutive,
    aiTimeoutsLeft,
    aiLastSubCheck: lastAiSubCheck,
    hotPlayerFocusTarget: hotFocusTarget,
    hotPlayerLastScored: hotLastScored,
    difficulty: state.difficulty,
    quarterScores: qScores,
    longestUserRun: longestUser, longestAiRun: longestAi,
    quarterStartUserScore: qStartUser, quarterStartAiScore: qStartAi,
    formRating: newFormRating, formNarrativeFired: newFormFired, hotFromForm: newHotFromForm,
    lastEventIndicator: eventIndicator,
    // Foul system
    teamFouls: newTeamFouls,
    isInBonus: newIsInBonus,
    fouledOut: newFouledOut,
    ftSequence: ftSequenceResult,
    pendingAutoSub: pendingAutoSubResult,
    // Energy drink + decision tracking
    energyDrinksLeft: state.energyDrinksLeft,
    energyDrinkLocked: newEnergyDrinkLocked,
    energyDrinkGoodUses: state.energyDrinkGoodUses,
    energyDrinkPendingForm: null,
    subsMade: state.subsMade,
    goodSubsMade: state.goodSubsMade,
    isHomeGame: state.isHomeGame,
    // Overtime
    isOT: state.isOT || (newQuarter >= 5 && quarterEnded),
    otPeriod: state.otPeriod,
    otScores: newOTScores,
    shootoutSequence: shootoutSequenceResult,
    // Fast break & shot clock
    fastBreakActive: nextFastBreakActive,
    fastBreakTeam: nextFastBreakTeam,
    possessionClock: nextPossClock,
    possessionTeam: nextPossTeam,
    lastPlayCategory: nextLastPlayCategory,
    injuries: state.injuries ?? {},
    // Pillar 3: Persist rolling usage window — trim to last USAGE_WINDOW entries
    possessionHistory: newPossessionHistory.slice(-USAGE_WINDOW),
    lastTimeElapsed: timeElapsed,
    lastPossessionClockStart: state.possessionClock ?? 24,
    activeShotMeter: newActiveShotMeter,
    teamSkillBuffs: newTeamSkillBuffs,
    activeSkillBuffs: newActiveSkillBuffs,
    disabledSkills: state.disabledSkills ?? {},
    blockedSkills: state.blockedSkills ?? {},
    skillMarks: newSkillMarks,
    markImmunity: newMarkImmunity,
    skillUsedThisGame: newSkillUsedThisGame,
    flagrantFouls: state.flagrantFouls ?? {},
    ejectedPlayers: state.ejectedPlayers ?? [],
    prevAiLineupIds: [...nextAiLineupIds],
  };
}

/** Generates real-time NBA-themed pre-match injury reports for user and AI teams */
export function generatePreMatchInjuries(
  userRoster: Player[],
  aiRoster: Player[]
): Record<string, { status: 'HEALTHY' | 'GTD' | 'OUT' | 'DNP'; reason?: string }> {
  const injuries: Record<string, { status: 'HEALTHY' | 'GTD' | 'OUT' | 'DNP'; reason?: string }> = {};

  const makeHealthy = (p: Player) => {
    injuries[p.id] = { status: 'HEALTHY' };
  };

  userRoster.forEach(makeHealthy);
  aiRoster.forEach(makeHealthy);

  return injuries;
}

/** Replaces any starter who is OUT or DNP with the best healthy bench player */
export function calibrateLineupForInjuries(
  lineup: Player[],
  roster: Player[],
  injuries: Record<string, { status: 'HEALTHY' | 'GTD' | 'OUT' | 'DNP'; reason?: string }>
): Player[] {
  const currentLineup = [...lineup];
  for (let i = 0; i < currentLineup.length; i++) {
    const starter = currentLineup[i];
    const statusObj = injuries[starter.id];
    if (statusObj && (statusObj.status === 'OUT' || statusObj.status === 'DNP')) {
      const benchPlayers = roster.filter(p => !currentLineup.some(s => s.id === p.id));
      const healthyBench = benchPlayers.filter(p => {
        const pStatus = injuries[p.id]?.status ?? 'HEALTHY';
        return pStatus === 'HEALTHY' || pStatus === 'GTD';
      });
      // Try position match first
      let replacement = healthyBench.filter(p => p.position === starter.position).sort((a, b) => b.ovr - a.ovr)[0];
      if (!replacement) {
        // Fallback to highest OVR healthy bench player
        replacement = healthyBench.sort((a, b) => b.ovr - a.ovr)[0];
      }
      if (replacement) {
        currentLineup[i] = replacement;
      }
    }
  }
  return currentLineup;
}
