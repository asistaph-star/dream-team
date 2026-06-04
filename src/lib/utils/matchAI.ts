import { Player } from "../types/player";
import { MatchState, MatchEvent, Difficulty, avgStamina } from "./matchTypes";
import { makeEvent } from "./matchNarrative";

interface AICoachResult {
  aiOff: string;
  aiDef: string;
  events: MatchEvent[];
  lastAiStrategyChange: number;
  aiTimeoutsLeft: number;
  hotPlayerFocusTarget: string | null;
  aiSub: { outId: string; inId: string } | null;
  lastAiSubCheck: number;
  aiStaminaBoosts?: Record<string, number>;
}

// ─── DIFFICULTY CONFIG ───
const DIFF_CONFIG: Record<Difficulty, {
  evalInterval: number; ignoreChance: number; counterMomentum: boolean;
  subDelay: number; maxTimeouts: number; runThreshold: number; preSubStamina: number;
  subCooldown: number; subSkipChance: number; swapDeltaThreshold: number;
}> = {
  EASY:        { evalInterval: 180, ignoreChance: 0.35, counterMomentum: false, subDelay: 60, maxTimeouts: 2, runThreshold: 10, preSubStamina: 25, subCooldown: 100, subSkipChance: 0.35, swapDeltaThreshold: 18 },
  NORMAL:      { evalInterval: 120, ignoreChance: 0.15, counterMomentum: true,  subDelay: 0,  maxTimeouts: 3, runThreshold: 8,  preSubStamina: 30, subCooldown: 65,  subSkipChance: 0.15, swapDeltaThreshold: 12 },
  HARD:        { evalInterval: 90,  ignoreChance: 0.00, counterMomentum: true,  subDelay: 0,  maxTimeouts: 3, runThreshold: 4,  preSubStamina: 35, subCooldown: 50,  subSkipChance: 0.00, swapDeltaThreshold: 8  },
  EXPERT:      { evalInterval: 80,  ignoreChance: 0.00, counterMomentum: true,  subDelay: 0,  maxTimeouts: 4, runThreshold: 3,  preSubStamina: 38, subCooldown: 40,  subSkipChance: 0.00, swapDeltaThreshold: 6  },
  HELL_EXPERT: { evalInterval: 60,  ignoreChance: 0.00, counterMomentum: true,  subDelay: 0,  maxTimeouts: 4, runThreshold: 2,  preSubStamina: 42, subCooldown: 30,  subSkipChance: 0.00, swapDeltaThreshold: 4  },
  DREAM_TEAM:  { evalInterval: 60,  ignoreChance: 0.00, counterMomentum: true,  subDelay: 0,  maxTimeouts: 4, runThreshold: 2,  preSubStamina: 42, subCooldown: 30,  subSkipChance: 0.00, swapDeltaThreshold: 4  },
};

// ─── STAMINA MOD (mirrors matchTypes) ───
const staminaMod = (s: number): number =>
  s >= 70 ? 1.00 : s >= 50 ? 0.85 : s >= 30 ? 0.70 : s >= 15 ? 0.50 : 0.30;

// ─── SITUATION CONTEXT ───
interface GameContext {
  scoreDiff: number;       // aiScore - userScore (positive = AI winning)
  isLosing: boolean;       // AI is behind
  isWinning: boolean;      // AI is ahead
  isBigDeficit: boolean;   // down 15+
  isClose: boolean;        // within 6
  isClutch: boolean;       // Q4/OT final 5 min, within 10
  recentRun: number;       // user consecutive run against AI
  quarter: number;
  clock: number;
}

function buildContext(state: MatchState, q: number, clock: number): GameContext {
  const scoreDiff = state.aiScore - state.userScore;
  return {
    scoreDiff,
    isLosing:      scoreDiff < 0,
    isWinning:     scoreDiff > 0,
    isBigDeficit:  scoreDiff <= -15,
    isClose:       Math.abs(scoreDiff) <= 6,
    isClutch:      ((q === 4 && clock <= 300) || q >= 5) && Math.abs(scoreDiff) <= 10,
    recentRun:     state.consecutiveUserRun,
    quarter: q,
    clock,
  };
}

// ─── PLAYER SCORE FUNCTION ───
// Rates a player 0–200 for how valuable they are RIGHT NOW given the game context.
// This is what the coach uses to decide who should be on the floor.
function ratePlayer(
  p: Player,
  stamina: number,
  fouls: number,
  formRating: number,
  isHot: boolean,
  ctx: GameContext
): number {
  // Hard block: can't use a fouled-out player
  if (fouls >= 5) return -999;

  // Base: weighted average of offense + defense from OVR
  let score = p.ovr;

  // Stamina — a 100% fresh player at 75 OVR beats a 20% drained player at 90 OVR
  score *= staminaMod(stamina);

  // Form momentum (hot/cold hand)
  score *= formRating;

  // Hot player bonus — keep hot hands on the floor
  if (isHot) score += 12;

  // Foul danger penalty — foul-prone players get risky late
  if (fouls === 4) {
    // Stars are worth the risk if clutch, non-stars should sit
    const isStar = p.ovr >= 85;
    if (ctx.isClutch && isStar) score -= 5;
    else score -= 20;
  } else if (fouls === 3 && ctx.isClutch) {
    score -= 8; // cautious in crunch time
  }

  // ── SITUATIONAL WEIGHTS ──
  // Losing big → prioritize offensive ratings
  if (ctx.isBigDeficit) {
    score += (p.offense - p.defense) * 0.4; // lean offensive
  }
  // Protecting a big lead → prioritize defensive ratings
  if (ctx.isWinning && ctx.scoreDiff >= 15) {
    score += (p.defense - p.offense) * 0.3; // lean defensive
  }
  // Clutch → big OVR advantage matters more
  if (ctx.isClutch) {
    score += p.ovr * 0.10; // stars shine brighter in the clutch
  }
  // Being outscored on a run → defensive urgency
  if (ctx.recentRun >= 6) {
    score += p.defense * 0.15;
  }

  return score;
}

export function evaluateAICoach(
  state: MatchState,
  aiLineup: Player[],
  userLineup: Player[],
  allAiRoster: Player[],
  aiTeamName: string,
  q: number, clock: number, gameTimeSec: number,
  difficulty: Difficulty
): AICoachResult {
  const cfg = DIFF_CONFIG[difficulty];
  const events: MatchEvent[] = [];
  let aiOff = state.aiOffStrategy;
  let aiDef = state.aiDefStrategy;
  let lastChange = state.lastAiStrategyChange;
  let aiTimeouts = state.aiTimeoutsLeft;
  let hotFocus = state.hotPlayerFocusTarget;

  const aiAvg = avgStamina(aiLineup, state.playerStamina);
  const scoreDiff = state.aiScore - state.userScore;
  const ctx = buildContext(state, q, clock);

  // ═══ HOT PLAYER FOCUS ═══
  const hotUserPlayers = userLineup.filter(p => state.hotPlayers[p.id]);
  if (hotUserPlayers.length > 0) {
    const target = hotUserPlayers.sort((a, b) =>
      (state.playerStats[b.id]?.PTS || 0) - (state.playerStats[a.id]?.PTS || 0))[0];
    if (hotFocus !== target.id) {
      hotFocus = target.id;
      if (state.userOffStrategy === "Isolation (ISO)")
        events.push(makeEvent(q, clock, `🔒 ${aiTeamName} sending two at ${target.name} every time`, false));
    }
  }
  if (hotFocus) {
    const lastScored = state.hotPlayerLastScored[hotFocus] || 0;
    if (gameTimeSec - lastScored > 90 && !state.hotPlayers[hotFocus]) {
      const fp = userLineup.find(p => p.id === hotFocus);
      if (fp) events.push(makeEvent(q, clock, `${aiTeamName} backs off — ${fp.name} has gone cold`, false));
      hotFocus = null;
    }
  }

  // ═══ TIMEOUT LOGIC ═══
  const canTimeout = aiTimeouts > 0 && aiTimeouts <= cfg.maxTimeouts;
  if (canTimeout && state.consecutiveUserRun >= cfg.runThreshold) {
    aiTimeouts--;
    events.push(makeEvent(q, clock, `TIMEOUT: ${aiTeamName} stopping the run`, false));
  } else if (canTimeout && aiAvg < 32 && q >= 3) {
    aiTimeouts--;
    events.push(makeEvent(q, clock, `TIMEOUT: ${aiTeamName} catching their breath`, false));
  } else if (canTimeout && q === 4 && clock <= 120 && scoreDiff <= -5 && scoreDiff >= -10) {
    aiTimeouts--;
    events.push(makeEvent(q, clock, `TIMEOUT: ${aiTeamName} making a final push`, false));
  }

  // ═══ MOMENTUM COUNTER ═══
  if (state.momentumActive && cfg.counterMomentum) {
    if (canTimeout && aiAvg >= 65 && Math.random() < 0.4) {
      aiTimeouts--;
      events.push(makeEvent(q, clock, `TIMEOUT: ${aiTeamName} calls timeout to slow down the run`, false));
    } else {
      let newDef = aiDef;
      if (aiAvg >= 60) newDef = "Blitz/Trap";
      else if (aiAvg >= 45) newDef = "Switch Defense";
      else newDef = "Man-to-Man";
      if (newDef !== aiDef) {
        aiDef = newDef;
        events.push(makeEvent(q, clock, `🔒 ${aiTeamName} cranking up the defensive intensity`, false));
        lastChange = gameTimeSec;
      }
    }
  }

  // ═══ STRATEGY EVALUATION ═══
  const timeSinceLast = gameTimeSec - lastChange;
  if (timeSinceLast >= cfg.evalInterval && Math.random() >= cfg.ignoreChance) {
    let newOff = aiOff;
    let newDef = aiDef;
    let offText = "";
    let defText = "";

    if (scoreDiff <= -15) {
      if (aiAvg >= 65) {
        newOff = "Run & Gun";
        offText = `${aiTeamName} switching to an aggressive Run & Gun transition play to push the pace!`;
      } else if (aiAvg >= 50) {
        newOff = "Princeton Offense";
        offText = `${aiTeamName} running Princeton backdoors to split the defense`;
      } else {
        newOff = "Outside Shoot";
        offText = `${aiTeamName} settling for high-volume Outside Shooting to catch up`;
      }
      // AI losing big: run Full-court press if late in Q4 and stamina is good!
      if (q === 4 && clock <= 240 && aiAvg >= 45) {
        newDef = "Full-court press";
        defText = `${aiTeamName} triggers the Full-court press to force turnovers!`;
      } else if (aiAvg >= 50) {
        newDef = "1-3-1 Zone";
        defText = `${aiTeamName} shifts to a high-pressure 1-3-1 Zone to intercept passes!`;
      }
    } else if (scoreDiff >= -14 && scoreDiff <= -6) {
      // Losing moderately: try Inside Score if we have a dominant big!
      const dominantBig = aiLineup.find(p => (p.position === 'C' || p.position === 'PF') && p.ovr >= 82);
      if (dominantBig && aiAvg >= 50) {
        newOff = "Inside Score";
        offText = `${aiTeamName} feeding ${dominantBig.name} deep inside — Inside Score!`;
      } else if (aiAvg >= 55) {
        newOff = "Corner 3s";
        offText = `${aiTeamName} shifting rotations to search for open Corner 3s`;
      } else {
        newOff = "Outside Shoot";
        offText = `${aiTeamName} running outside screens for perimeter looks`;
      }
    } else if (scoreDiff >= -5 && scoreDiff <= 5) {
      if ((state.userOffStrategy === "Corner 3s" || state.userOffStrategy === "Outside Shoot" || state.userOffStrategy === "5-Out Spacing") && aiAvg >= 55) {
        newDef = "3-2 Zone";
        defText = `${aiTeamName} deploys a high 3-2 Zone to deny perimeter wing and corner threes!`;
      } else if (state.userOffStrategy === "Inside Score" || state.userOffStrategy === "Post Isolation") {
        newDef = "Protect the Lane";
        defText = `${aiTeamName} drops deep into Protect the Lane to wall off inside drives!`;
      } else if (state.userOffStrategy === "Pick & Roll" && aiAvg >= 55) {
        newDef = "Combination Defense";
        defText = `${aiTeamName} triggers a Combination Defense to lock down the screen action!`;
      } else if (aiAvg >= 60) {
        newDef = "Half-court press";
        defText = `${aiTeamName} locks into a Half-court press trapping sideline ball handlers`;
      }
    } else if (scoreDiff >= 15) {
      newOff = "Outside Shoot";
      newDef = "Man-to-Man";
      offText = `${aiTeamName} playing controlled perimeter possessions`;
    } else if (scoreDiff >= 6) {
      if (aiAvg >= 60) {
        newDef = "3-2 Zone";
        defText = `${aiTeamName} shifting to a 3-2 Zone to lock down the outer arc`;
      }
    }

    if (aiAvg < 40) {
      if (newDef === "Full-Court Press" || newDef === "2-3 Zone" || newDef === "Blitz/Trap" || newDef === "Switch Defense") newDef = "Man-to-Man";
      if (newOff === "Post Isolation" || newOff === "5-Out Spacing" || newOff === "Isolation (ISO)") newOff = "Motion Offense";
    }
    if (newOff !== aiOff || newDef !== aiDef) {
      aiOff = newOff; aiDef = newDef; lastChange = gameTimeSec;
      const genericAdjustments = [
        `Broadcast Booth: "The opposing coach is calling out fresh instructions from the sideline, looking to adjust their floor execution."`,
        `Broadcast Booth: "Coaching staff is gesturing actively, directing players into fresh tactical setups."`,
        `Broadcast Booth: "A noticeable shift in body language as the opposing bench communicates key half-court adjustments."`,
        `Broadcast Booth: "The opposing bench signals for a change in rhythm, tweaking their team rotations and positioning."`
      ];
      const adjustMsg = genericAdjustments[Math.floor(Math.random() * genericAdjustments.length)];
      events.push(makeEvent(q, clock, adjustMsg, false));
    }
  }

  // ═══ SMART SUBSTITUTION ENGINE ═══
  //
  // How it works:
  // 1. For each of the 5 court slots, find every player in the full roster who can play that position
  // 2. Score each candidate using ratePlayer() — factors in stamina, form, fouls, + game context
  // 3. Find the slot where the bench candidate scores highest vs the current player (the "delta")
  // 4. If that delta exceeds a difficulty-tuned threshold → make the swap
  //
  // This means the AI will naturally:
  //   • Bring back a rested star when they outscore a tired bench player
  //   • Keep a hot player in even if they're a bench player
  //   • Pull a cold/tired/foul-prone player out
  //   • Go more offensive when losing, more defensive when leading
  //   • Make the right call in Q1 just as well as Q4
  //   • React to emergencies immediately (no cooldown)

  let aiSub: AICoachResult['aiSub'] = null;
  let lastAiSubCheck = state.aiLastSubCheck;

  const activeIds   = new Set(aiLineup.map(p => p.id));
  const fouledOut   = new Set(state.fouledOut ?? []);
  const allAvailable = allAiRoster.filter(p => !fouledOut.has(p.id));

  const playerScore = (p: Player): number =>
    ratePlayer(
      p,
      state.playerStamina[p.id] ?? 100,
      state.playerStats[p.id]?.FOL ?? 0,
      state.formRating[p.id] ?? 1.0,
      !!state.hotPlayers[p.id],
      ctx
    );

  // ── EMERGENCY CHECK (bypasses cooldown) ──
  // Player is in crisis (nearly dead stamina OR about to foul out in non-crunch)
  if (!aiSub) {
    for (const player of aiLineup) {
      const stam  = state.playerStamina[player.id] ?? 100;
      const fouls = state.playerStats[player.id]?.FOL ?? 0;
      const isStar = player.ovr >= 85;
      const isEmergency = stam < 10 || (fouls >= 4 && !(ctx.isClutch && isStar));

      if (isEmergency) {
        // Best available replacement at this position NOT on court
        const replacement = allAvailable
          .filter(p => !activeIds.has(p.id) && p.position === player.position)
          .sort((a, b) => playerScore(b) - playerScore(a))[0];

        if (replacement && playerScore(replacement) > 0) {
          aiSub = { outId: player.id, inId: replacement.id };
          const msg = fouls >= 4
            ? `Substitution: ${aiTeamName}: ${replacement.name} in for ${player.name} (foul trouble)`
            : `Substitution: ${aiTeamName}: ${replacement.name} in (${player.name} is tired)`;
          events.push(makeEvent(q, clock, msg, false));
          break;
        }
      }
    }
  }

  // ── SMART ROTATION (with cooldown) ──
  // Find the lineup slot where swapping in a bench player gives the biggest improvement
  if (!aiSub) {
    const timeSinceSub = gameTimeSec - lastAiSubCheck;
    const cooldownPassed = timeSinceSub >= cfg.subCooldown;
    const notSkipped = Math.random() >= cfg.subSkipChance;

    if (cooldownPassed && notSkipped) {
      // For each position slot currently on court, find the best bench option
      // Track which swap gives the biggest score delta
      let bestDelta = cfg.swapDeltaThreshold; // minimum improvement required to bother
      let bestOut: string | null = null;
      let bestIn: string | null = null;
      let bestMsg = "";

      for (const currentPlayer of aiLineup) {
        const currentScore = playerScore(currentPlayer);

        // Find all bench options at this position
        const candidates = allAvailable
          .filter(p => !activeIds.has(p.id) && p.position === currentPlayer.position)
          .sort((a, b) => playerScore(b) - playerScore(a));

        if (candidates.length === 0) continue;
        const best = candidates[0];
        const bestScore = playerScore(best);
        const delta = bestScore - currentScore;

        if (delta > bestDelta) {
          bestDelta = delta;
          bestOut = currentPlayer.id;
          bestIn  = best.id;

          // Craft a context-aware substitution message
          const isReturning = allAiRoster.indexOf(best) < 5; // starter coming back
          const currentStam = state.playerStamina[currentPlayer.id] ?? 100;
          const bestStam    = state.playerStamina[best.id] ?? 100;

          let reason = 'default';
          if (ctx.isBigDeficit) reason = 'big_deficit';
          else if (ctx.isClutch) reason = 'clutch_def';
          else if (isReturning && bestStam >= 72) reason = 'stamina_fresh';
          else if (currentStam < 35) reason = 'stamina_tired';
          else if (state.hotPlayers[best.id]) reason = 'hot_hand';

          switch (reason) {
            case 'big_deficit':
              bestMsg = `Substitution: ${aiTeamName}: ${best.name} in (need more scoring)`;
              break;
            case 'clutch_def':
              bestMsg = `Substitution: ${aiTeamName}: ${best.name} in for the stretch run`;
              break;
            case 'stamina_fresh':
              bestMsg = `Substitution: ${aiTeamName}: ${best.name} is rested (back in the game)`;
              break;
            case 'stamina_tired':
              bestMsg = `Substitution: ${aiTeamName}: ${best.name} in for ${currentPlayer.name} (needs a breather)`;
              break;
            case 'hot_hand':
              bestMsg = `Substitution: ${aiTeamName}: ${best.name} in (red hot off the bench!)`;
              break;
            default:
              bestMsg = `Substitution: ${aiTeamName}: ${best.name} checks in for ${currentPlayer.name}`;
          }
        }
      }

      if (bestOut && bestIn) {
        aiSub = { outId: bestOut, inId: bestIn };
        events.push(makeEvent(q, clock, bestMsg, false));
      }
    }
  }

  if (aiSub) lastAiSubCheck = gameTimeSec;

  // ═══ NPC ITEM USE (NpcItemUse) ═══
  const aiStaminaBoosts: Record<string, number> = {};
  const isTightClutch = (q >= 4) && Math.abs(scoreDiff) <= 6;
  if (isTightClutch) {
    // Find active AI star players on court who are exhausted (stamina < 50)
    const tiredStars = aiLineup.filter(p => p.ovr >= 82 && (state.playerStamina[p.id] ?? 100) < 50);
    
    if (tiredStars.length > 0) {
      let itemChance = 0.05;
      if (difficulty === "HELL_EXPERT" || difficulty === "DREAM_TEAM") itemChance = 0.65;
      else if (difficulty === "EXPERT") itemChance = 0.50;
      else if (difficulty === "HARD") itemChance = 0.35;
      else if (difficulty === "NORMAL") itemChance = 0.20;
      
      if (Math.random() < itemChance) {
        // Boost the most exhausted superstar player
        const targetStar = [...tiredStars].sort((a, b) => (state.playerStamina[a.id] ?? 100) - (state.playerStamina[b.id] ?? 100))[0];
        aiStaminaBoosts[targetStar.id] = 25;
        events.push(makeEvent(q, clock, `⚡ Coach Decision: ${aiTeamName} feeds tired superstar ${targetStar.name} an Energy Drink! Stamina boosted!`, false));
      }
    }
  }

  return {
    aiOff, aiDef, events,
    lastAiStrategyChange: lastChange,
    aiTimeoutsLeft: aiTimeouts,
    hotPlayerFocusTarget: hotFocus,
    aiSub, lastAiSubCheck,
    aiStaminaBoosts
  };
}
