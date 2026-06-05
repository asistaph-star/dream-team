import { Player } from "../types/player";
import { hasSpecialSkillMechanic } from "../skills/skillResolver";
import { getPlayerMaxStamina } from "../utils/matchTypes";

export function getIndividualThreePointShotMod(shooting: number | undefined): number {
  return Math.max(0.72, Math.min(1.0, 0.72 + ((shooting ?? 50) / 100) * 0.35));
}

export const isShaiGilgeousAlexander = (player: Player): boolean => {
  return player.name.toLowerCase().includes("shai gilgeous-alexander");
};

export const getFlopFoulPressureBonus = (scorer: Player): number => {
  const baseBonus = 0.04;
  return isShaiGilgeousAlexander(scorer) && hasSpecialSkillMechanic(scorer, "FLOP_FOUL_PRESSURE") ? baseBonus * 2 : baseBonus;
};

export const getGlassStrikeOrebBoost = (level: number): number => {
  if (level === 1) return 0.015;
  if (level === 2) return 0.025;
  if (level === 3) return 0.035;
  return 0;
};

export const getGlassStrikePutbackBoost = (level: number): number => {
  if (level === 1) return 0;
  if (level === 2) return 0.010;
  if (level === 3) return 0.015;
  return 0;
};

export const getStaminaCostScale = (player: Player | undefined): number => {
  const maxStamina = getPlayerMaxStamina(player);
  return Math.min(1.15, Math.max(1, Math.sqrt(maxStamina / 100)));
};

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
