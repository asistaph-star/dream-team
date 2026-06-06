import { Player } from '../../types/player';
import { ShotType } from '../../utils/shotEngine';
import { PossessionContext } from './possessionContext';
import {
  ensureStats,
  ensureForm,
  skillLog,
  staminaPct,
  getFoulStamMod,
  getTovStamMod,
  getUsageMod,
  pickRebounder,
  awardReb,
  pickFoulCommitter,
  runFTSequence,
  getAssistChance,
  getClutchMod,
  getClutchRating,
  trackShotStamina,
  trackDefensiveStamina,
  trackDefensiveEffort,
  pickCommitter,
  unforcedTovMsg,
  tryBlock,
  USAGE_WINDOW
} from './possessionHelpers';
import {
  getStealRating,
  getThreePtRating,
  getFinishingRating,
  getStrengthRating,
  getOnBallDefenseRating,
  getCalmRating,
  getBasketballIQRating,
  getHustleRating,
  getAssistRating,
  getOffenseRating,
  getHandleRating,
  getStaminaRating,
  getBlockRating,
  getFoulDrawTendency,
  getShotIdentityEfficiencyAdjustment
} from '../../utils/playerIdentity';
import { resolveLineupArchetypes } from '../../lineup/lineupArchetypeResolver';
import { getHomeCourtBoost, getAwayPenalty, calculateAiPutbackChance, calculateFinalScoringChance, calculateAndOneChance } from '../shotResolution';
import { getGlassStrikeOrebBoost, getGlassStrikePutbackBoost, getIndividualThreePointShotMod, getFlopFoulPressureBonus } from '../matchHelpers';
import { getShotZoneModifier, getMatchupBonus, avgStamina, clampForm, getPlayerStaminaMod, getStaminaMod } from '../../utils/matchTypes';
import {
  calculateBaseShootingFoulChance,
  calculateFoulDrawModifier,
  calculateFlopIdentityScale,
  calculateFourPointBaitIdentityScale,
  calculateComposureIdentityScale,
  calculateCleanContestIdentityScale,
  calculateFourPointBaitBoost
} from '../foulSystem';
import {
  calculateBrokenPlayRescueChanceScale,
  calculateBrokenPlayRescueStaminaCost,
  calculateBrokenPlayRescueShotPenalty,
  getBrokenPlayRescueIdentity
} from '../brokenPlayRescue';
import {
  calculateBasketballIQTurnoverModifier,
  calculateBasketballIQShotQualityModifier,
  calculateHustleContestModifier,
  calculateBasketballIQDisciplineScale
} from '../attributeGameplayEffects';
import {
  calculateTeamReboundScore,
  calculateOffensiveReboundChance,
  calculateGlassScale,
  calculateBarrierScale
} from '../reboundSystem';
import { calculateSkyWallScale, getSkyWallIdentity } from '../blockSystem';
import { getSkyWallDrain, getLockChainDrain, applyAntiSnowballScaling } from '../staminaSkillEffects';
import {
  drainStamina,
  addMark,
  hasSpecialSkillMechanic,
  rollBaseSkill,
  rollSpecialMechanic,
  hasBaseSkill,
  hasAnyMark,
  hasMark
} from '../../skills/skillResolver';
import { generateShot } from '../../utils/shotEngine';
import { makeEvent, clutchScoreText, scoreText, clutchMissText, trapNarrative } from '../../utils/matchNarrative';
import { getShotClockViolationChance } from '../../utils/matchTypes';
import { tryGameplanJammer, tryShadowGuard, recoverSkillStamina } from './skillHooks';
import { resolveAiRebound } from './reboundResolver';
import { resolveAiShotAttempt, resolveAiBlitzShotAttempt } from './shotPossessionResolver';


const MAX_3PT_POSITIVE_ADDITIVE_BONUS = 0.08;

export function resolveAiPossession(ctx: PossessionContext) {
  const {
    draft,
    state,
    newQuarter,
    newClock,
    userLineup,
    aiLineup,
    aiTeamObj,
    userIsHome,
    clutchSituation,
    homeCourt,
    momentumBonus,
    hasHotAi,
    activeOffStrategy,
    pace,
    shotClockViolationFired,
    currentOff,
    currentDef,
    eAO,
    eUD,
    goodSubRatio
  } = ctx;

  const aiAvg = avgStamina(aiLineup, draft.playerStamina);
  const userAvg = avgStamina(userLineup, draft.playerStamina);

  const SLOT_POS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
  let is3PT = false;
  let shotType: ShotType = 'pullUpMid';
  let primaryDefender: Player | undefined = undefined;
  let matchupBonus = 0;
  let aiSkillShotBonus = 0;
  let aiScorerStamMod = 1.0;

  if (shotClockViolationFired) {
    const ballHandler = aiLineup.find(p => p.position === 'PG') || aiLineup[0];
    ensureStats(ctx, ballHandler.id);
    draft.playerStats[ballHandler.id].TOV = (draft.playerStats[ballHandler.id].TOV ?? 0) + 1;
    draft.formRating[ballHandler.id] = clampForm((draft.formRating[ballHandler.id] ?? 1.0) - 0.02);
    ctx.turnoverOccurred = true;
    draft.events.push(makeEvent(newQuarter, newClock,
      `Shot clock violation: ${ballHandler.name} held the ball too long. My Team ball`, false
    ));
    ctx.nextPossessionTeam = 'user';
    ctx.nextLastPlayCategory = 'turnover';
  } else {
    // AI possession
    const baseChance = Math.max(0.30, Math.min(0.80, eAO / ((eAO + eUD) || 1)));
    const avgStamMod = getStaminaMod(aiAvg);
    const aiTeamFatigueContext = 0.88 + avgStamMod * 0.12;
    let finalChance = baseChance * aiTeamFatigueContext;
    if (hasHotAi) finalChance *= 1.04;

    let scorer = aiLineup[aiLineup.length - 1];
    if (state.aiOffStrategy === "Isolation (ISO)") {
      scorer = [...aiLineup].sort((a, b) => b.ovr - a.ovr)[0];
    } else if (state.aiOffStrategy === "Post Isolation") {
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
    ctx.activePlayerId = scorer.id;
    ensureStats(ctx, scorer.id);
    aiScorerStamMod = getPlayerStaminaMod(scorer, draft.playerStamina[scorer.id]);

    let is3PTBaseCheck = undefined as boolean | undefined;
    if (currentDef === "Drop Coverage") {
      is3PTBaseCheck = Math.random() < (userAvg < 45 ? 0.50 : 0.60);
    }
    if (state.aiOffStrategy === "Post Isolation") {
      is3PTBaseCheck = false;
    }
    const shotInfo = generateShot(scorer, draft.formRating[scorer.id] || 1.0, staminaPct(ctx, scorer), is3PTBaseCheck, pace);
    is3PT = shotInfo.is3PT;
    shotType = shotInfo.type;

    const scorerSlotIdx = SLOT_POS.indexOf(scorer.position as typeof SLOT_POS[number]);
    primaryDefender = scorerSlotIdx >= 0 ? userLineup[scorerSlotIdx] : undefined;
    matchupBonus = getMatchupBonus(scorer, primaryDefender) + (hasBaseSkill(scorer, "Position Flex") ? 0.02 : 0);
    if (matchupBonus >= 0.12 && primaryDefender) {
      draft.events.push(makeEvent(newQuarter, newClock,
        `MISMATCH: ${scorer.name} has a clear advantage over ${primaryDefender.name}`, false
      ));
    }

    if (state.aiOffStrategy !== "Isolation (ISO)" && state.aiOffStrategy !== "Post Isolation") {
      const pbSummary = resolveLineupArchetypes(aiLineup);
      const pbLevel = pbSummary.allResults.find(r => r.id === "playmaking")?.level ?? 0;
      const scaleMultiplier = pbLevel === 0 ? 0.85 : pbLevel === 1 ? 1.00 : pbLevel === 2 ? 1.05 : 1.10;
      const capLimit = pbLevel === 0 ? 0.015 : 0.020;

      if (rollSpecialMechanic(aiLineup, "COURT_VISION_RHYTHM_BOOST", draft.playerStamina, (h) => {
        const courtVisionIdentity = (getAssistRating(h) + getHandleRating(h) + getOffenseRating(h)) / 3;
        return (0.90 + (courtVisionIdentity / 100) * 0.20) * scaleMultiplier;
      })) {
        const holders = aiLineup.filter(p => hasSpecialSkillMechanic(p, "COURT_VISION_RHYTHM_BOOST"));
        const leader = holders.sort((a_p, b_p) => (getAssistRating(b_p) - getAssistRating(a_p)))[0];
        if (leader) {
          const scale = getAssistRating(leader) / 100;
          const bonus = Math.min(capLimit, 0.012 + scale * 0.006);
          aiSkillShotBonus += bonus;
          skillLog(ctx, `${leader.name}'s Court Vision Engine creates a rhythm bonus of +${(bonus * 100).toFixed(1)}% for ${scorer.name}`, false);
        }
      }
    }
    if (is3PT && rollBaseSkill(aiLineup, "Arc Pressure", draft.playerStamina)) {
      const jammed = tryGameplanJammer(draft, userLineup, scorer, "Arc Pressure", true);
      const shadowed = !jammed && tryShadowGuard(draft, userLineup, true);
      const focused = !jammed && !shadowed && rollBaseSkill(userLineup, "Focus Lock", draft.playerStamina);
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
      skillLog(ctx, `${scorer.name}'s Arc Pressure creates a cleaner three`, false);
      if (focused) skillLog(ctx, `Focus Lock contains the shooting rhythm`, true);
      const dsSummary = resolveLineupArchetypes(aiLineup);
      const dsLevel = dsSummary.allResults.find(r => r.id === "shooting")?.level ?? 0;
      const scaleMultiplier = dsLevel === 0 ? 0.85 : dsLevel === 1 ? 1.00 : dsLevel === 2 ? 1.05 : 1.10;
      if (!jammed && !shadowed && !focused && primaryDefender && rollSpecialMechanic(aiLineup, "DEEP_STRIKE_EXPOSE", draft.playerStamina, (h) => {
        const redDotIdentity = getThreePtRating(h);
        return (0.90 + (redDotIdentity / 100) * 0.20) * scaleMultiplier;
      })) {
        draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, primaryDefender.id, "Exposed", "Deep Strike", 3);
        skillLog(ctx, "Deep Strike marks " + primaryDefender.name + " as Exposed", false);
      }
    }
    if (!is3PT && rollBaseSkill(aiLineup, "Paint Magnet", draft.playerStamina)) {
      const jammed = tryGameplanJammer(draft, userLineup, scorer, "Paint Magnet", true);
      const paintScale = 0.85 + (getFinishingRating(scorer) / 100) * 0.30;
      aiSkillShotBonus += jammed ? 0.005 : 0.03 * paintScale;
      skillLog(ctx, `${scorer.name}'s Paint Magnet bends the defense`, false);
      if (!jammed && primaryDefender && staminaPct(ctx, primaryDefender) < 45) {
        draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, primaryDefender.id, "Tilted", "Paint Magnet", 3);
        skillLog(ctx, `${scorer.name}'s Paint Magnet tilts tired defender ${primaryDefender.name}`, false);
      }
    }
    if (!is3PT && primaryDefender && rollBaseSkill(aiLineup, "Power Driver", draft.playerStamina)) {
      const powerDriverIdentity = (getFinishingRating(scorer) + getStrengthRating(scorer)) / 2;
      const powerDriverShotScale = 0.85 + (powerDriverIdentity / 100) * 0.30;
      aiSkillShotBonus += 0.02 * powerDriverShotScale;
      skillLog(ctx, `${scorer.name}'s Power Driver pressures the rim`, false);
    }
    if (!is3PT && primaryDefender && staminaPct(ctx, primaryDefender) < 65 && rollSpecialMechanic(aiLineup, "POSTER_SPARK_TILT", draft.playerStamina, (h) => {
      const contactTaxIdentity = (getFinishingRating(h) + getStrengthRating(h)) / 2;
      return 0.90 + (contactTaxIdentity / 100) * 0.20;
    })) {
      draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, primaryDefender.id, "Tilted", "Poster Spark", 3);
      skillLog(ctx, `Poster Spark tilts ${primaryDefender.name}`, false);
    }
    if (primaryDefender && hasAnyMark(draft.skillMarks, primaryDefender.id) && rollBaseSkill(aiLineup, "Mismatch Caller", draft.playerStamina)) {
      const jammed = tryGameplanJammer(draft, userLineup, scorer, "Mismatch Caller", true);
      aiSkillShotBonus += jammed ? 0.005 : 0.025;
      skillLog(ctx, `${scorer.name}'s Mismatch Caller attacks a marked defender`, false);
    }
    if (rollBaseSkill(aiLineup, "Tempo Surgeon", draft.playerStamina)) {
      const jammed = tryGameplanJammer(draft, userLineup, scorer, "Tempo Surgeon", true);
      const holders = aiLineup.filter(p => p.baseSkills?.includes("Tempo Surgeon"));
      const maxTempo = holders.length > 0 ? Math.max(...holders.map(p => Math.round((getHandleRating(p) + getAssistRating(p)) / 2))) : 50;
      const tempoScale = 0.85 + (maxTempo / 100) * 0.30;
      aiSkillShotBonus += jammed ? (0.003 * tempoScale) : (0.018 * tempoScale);
      skillLog(ctx, `Tempo Surgeon creates a cleaner offensive read`, false);
    }
    if ((pace === "fastbreak" || pace === "early_offense") && rollBaseSkill(aiLineup, "Tempo Switch", draft.playerStamina)) {
      aiSkillShotBonus += 0.025;
      skillLog(ctx, `${scorer.name}'s Tempo Switch boosts the early attack`, false);
    }
    if (primaryDefender && rollSpecialMechanic([primaryDefender], "LOCK_CHAIN_ON_BALL_PRESSURE", draft.playerStamina, (h) => {
      const identity = (getOnBallDefenseRating(h) + getStealRating(h) + getStaminaRating(h)) / 3;
      return 0.90 + (identity / 100) * 0.20;
    })) {
      const rarity = primaryDefender.skillRarities?.["LOCK_CHAIN"] || 'Common';
      const baseDrain = getLockChainDrain(rarity);
      const finalDrain = applyAntiSnowballScaling(baseDrain, staminaPct(ctx, scorer));
      const drain = drainStamina(draft.playerStamina, scorer, aiLineup, finalDrain);
      skillLog(ctx, `Lock Chain: ${primaryDefender.name}'s on-ball pressure drains ${drain} stamina from shooter ${scorer.name}`, true);
    }

    // SKY_WALL rim protection
    const CLOSE_RANGE_SHOTS = [
      'drivingLayup', 'dunk', 'euroStep', 'fingerRoll', 'powerLayup', 'putBack', 'bankShot', 'hookShot', 'floater'
    ];
    if (!is3PT && CLOSE_RANGE_SHOTS.includes(shotType)) {
      if (rollSpecialMechanic(userLineup, "SKY_WALL_BLOCK_BOOST", draft.playerStamina, (h) => {
        return calculateSkyWallScale(getSkyWallIdentity(h)).scale;
      })) {
        const holders = userLineup.filter(p => hasSpecialSkillMechanic(p, "SKY_WALL_BLOCK_BOOST"));
        if (holders.length > 0) {
          const leader = [...holders].sort((a, b) => {
            const rA = a.skillRarities?.["SKY_WALL"] || 'Common';
            const rB = b.skillRarities?.["SKY_WALL"] || 'Common';
            const val = { Common: 1, Rare: 2, Elite: 3, Epic: 4, Legendary: 5 };
            return (val[rB] ?? 1) - (val[rA] ?? 1);
          })[0];
          const rarity = leader.skillRarities?.["SKY_WALL"] || 'Common';
          const bestIdentity = getSkyWallIdentity(leader);
          const { scale, penalty } = calculateSkyWallScale(bestIdentity);
          aiSkillShotBonus -= penalty;
          const baseDrain = getSkyWallDrain(rarity);
          const finalDrain = applyAntiSnowballScaling(baseDrain, staminaPct(ctx, scorer));
          const drain = drainStamina(draft.playerStamina, scorer, aiLineup, finalDrain);
          skillLog(ctx, `Sky Wall: Rim protection reduces shot quality by ${(penalty * 100).toFixed(3)}% and drains ${drain} stamina from ${scorer.name}`, true);
        }
      }
    }

    if (hasMark(draft.skillMarks, scorer.id, "Static")) {
      aiSkillShotBonus -= 0.025;
    }

    if (currentDef === "Blitz/Trap") {
      const stealChance = userAvg >= 60 ? 0.15 : userAvg >= 50 ? 0.10 : 0.06;
      const easyBasketChance = userAvg < 50 ? 0.28 : 0.20;
      const roll = Math.random();

      if (roll < stealChance) {
        const bStlW = userLineup.map(p => getStealRating(p));
        const bStlTW = bStlW.reduce((s, w) => s + w, 0);
        let bStlR = Math.random() * bStlTW;
        let stealer = userLineup[userLineup.length - 1];
        for (let si = 0; si < userLineup.length; si++) { bStlR -= bStlW[si]; if (bStlR <= 0) { stealer = userLineup[si]; break; } }
        ensureStats(ctx, stealer.id);
        draft.playerStats[stealer.id].STL += 1;
        draft.events.push(makeEvent(newQuarter, newClock, `STEAL: ${stealer.name} strips the ball!`, true, 0, stealer.id));
        if (rollSpecialMechanic(userLineup, "LOCK_CHAIN_STAMINA_DRAIN", draft.playerStamina, (h) => {
          const identity = (getOnBallDefenseRating(h) + getStealRating(h) + getStaminaRating(h)) / 3;
          return 0.90 + (identity / 100) * 0.20;
        })) {
          const holders = userLineup.filter(p => hasSpecialSkillMechanic(p, "LOCK_CHAIN_STAMINA_DRAIN"));
          if (holders.length > 0) {
            const leader = [...holders].sort((a, b) => {
              const rA = a.skillRarities?.["LOCK_CHAIN"] || 'Common';
              const rB = b.skillRarities?.["LOCK_CHAIN"] || 'Common';
              const val = { Common: 1, Rare: 2, Elite: 3, Epic: 4, Legendary: 5 };
              return (val[rB] ?? 1) - (val[rA] ?? 1);
            })[0];
            const rarity = leader.skillRarities?.["LOCK_CHAIN"] || 'Common';
            const baseDrain = getLockChainDrain(rarity);
            let drainedCount = 0;
            aiLineup.forEach(p => {
              const finalDrain = applyAntiSnowballScaling(baseDrain, staminaPct(ctx, p));
              const drain = drainStamina(draft.playerStamina, p, userLineup, finalDrain);
              if (drain > 0) drainedCount++;
            });
            if (drainedCount > 0) {
              skillLog(ctx, `Lock Chain: The aggressive steal drains stamina from sum{drainedCount} opponent${drainedCount > 1 ? 's' : ''}`, true);
            }
          }
        }
        ctx.stealPlayerId = stealer.id;
        ctx.eventIndicator = { playerId: stealer.id, type: 'STL' };
        ctx.pointsScored = 0;
        ctx.nextPossessionTeam = 'user';
        ctx.nextLastPlayCategory = 'steal';
      } else {
        if (roll < stealChance + easyBasketChance) {
          ctx.pointsScored = 2;
          draft.playerStats[scorer.id].PTS += 2;
          draft.playerStats[scorer.id].FGM = (draft.playerStats[scorer.id].FGM ?? 0) + 1;
          draft.playerStats[scorer.id].FGA = (draft.playerStats[scorer.id].FGA ?? 0) + 1;
          draft.events.push(makeEvent(newQuarter, newClock, trapNarrative(scorer.name, true), false, 2, scorer.id));
          const tm = aiLineup.filter(p => p.id !== scorer.id);
          if (tm.length > 0) {
            const ws = tm.map(p => getAssistRating(p) || 50);
            const tw = ws.reduce((s, w) => s + w, 0);
            let r = Math.random() * tw;
            let a = tm[tm.length - 1];
            for (let i = 0; i < tm.length; i++) { r -= ws[i]; if (r <= 0) { a = tm[i]; break; } }
            const astChance = getAssistChance(a);
            if (Math.random() < astChance) {
              ensureStats(ctx, a.id);
              draft.playerStats[a.id].AST += 1;
            }
          }
          ctx.nextPossessionTeam = 'user';
          ctx.nextLastPlayCategory = 'made_shot';
        } else {
          finalChance -= 0.08;
          ensureForm(ctx, scorer.id);
          tryBlock(ctx, userLineup, scorer, true, shotType, is3PT);
          if (ctx.blockOccurred) {
            ctx.nextPossessionTeam = 'user';
            ctx.nextLastPlayCategory = 'block';
          }
          if (!ctx.blockOccurred) {
            const aiBlitzClutchFoulBoost = clutchSituation.active ? getClutchRating(scorer) * 0.5 : 0;
            const sfChance = (is3PT ? 0.044 : 0.086) * getFoulStamMod(avgStamina(userLineup, draft.playerStamina)) + aiBlitzClutchFoulBoost;
            resolveAiBlitzShotAttempt(ctx, scorer, primaryDefender, shotType, is3PT, sfChance, finalChance, aiScorerStamMod);
          }
        }
      }
    } else {
      // AI possession (non-Blitz)
      const aiAvgPly = aiLineup.reduce((s, p) => s + getHandleRating(p), 0) / 5;
      const aiBaseTOVRate = 0.085 * (80 / Math.max(55, aiAvgPly));
      const userDefPressureMod = currentDef === 'Blitz/Trap' ? 1.35
        : currentDef === 'Full-Court Press' ? 1.25
        : currentDef === 'Switch Defense' ? 1.08
        : 1.0;
      const aiTovMod = getTovStamMod(aiAvg);
      const aiLateClockMod = pace === 'late_clock' ? 1.30 : 1.0;
      let userHandsActivePressure = 1.0;
      if (rollBaseSkill(userLineup, "Hands Active", draft.playerStamina)) {
        const holders = userLineup.filter(p => p.baseSkills?.includes("Hands Active"));
        const maxStealRating = holders.length > 0 ? Math.max(...holders.map(p => getStealRating(p))) : 50;
        const handsActiveScale = 0.85 + (maxStealRating / 100) * 0.30;
        userHandsActivePressure = 1.18 * handsActiveScale;
      }
      let userScreenBreakerPressure = 1.0;
      if ((state.aiOffStrategy === "Pick & Roll" || state.aiOffStrategy === "Motion Offense") && rollBaseSkill(userLineup, "Screen Breaker", draft.playerStamina)) {
        const holders = userLineup.filter(p => hasBaseSkill(p, "Screen Breaker"));
        const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getOnBallDefenseRating(p))) : 50;
        const screenBreakerScale = 0.85 + (maxRating / 100) * 0.30;
        userScreenBreakerPressure = 1.12 * screenBreakerScale;
      }
      let userLockChainActive = false;
      let userLockChainTOVMod = 1.0;
      if (rollSpecialMechanic(userLineup, "LOCK_CHAIN_ON_BALL_PRESSURE", draft.playerStamina, (h) => {
        const identity = (getOnBallDefenseRating(h) + getStealRating(h) + getStaminaRating(h)) / 3;
        return 0.90 + (identity / 100) * 0.20;
      })) {
        userLockChainActive = true;
        const holders = userLineup.filter(p => hasSpecialSkillMechanic(p, "LOCK_CHAIN_ON_BALL_PRESSURE"));
        if (holders.length > 0) {
          const identities = holders.map(h => (getOnBallDefenseRating(h) + getStealRating(h) + getStaminaRating(h)) / 3);
          const bestIdentity = Math.max(...identities);
          userLockChainTOVMod = Math.min(1.06, 1.03 + (bestIdentity / 100) * 0.03);
        }
      }
      const userCageStepPressure = rollSpecialMechanic(userLineup, "LOCK_CHAIN_HOOKED", draft.playerStamina, (h) => {
        const cageStepIdentity = (getOnBallDefenseRating(h) + getStrengthRating(h)) / 2;
        return 0.90 + (cageStepIdentity / 100) * 0.20;
      }) ? 1.12 : 1.0;

      const aiCommitterForRescueCandidate = pickCommitter(aiLineup);
      const aiCandidateIQ = getBasketballIQRating(aiCommitterForRescueCandidate);
      const aiPrimaryBallhandler = aiLineup.find(p => p.position === 'PG') || aiLineup[0];
      const aiPbIQ = getBasketballIQRating(aiPrimaryBallhandler);
      const aiTeamAvgIQ = aiLineup.reduce((sum, p) => sum + getBasketballIQRating(p), 0) / aiLineup.length;
      const aiChosenIQ = aiCandidateIQ ?? aiPbIQ ?? aiTeamAvgIQ;
      const aiIqTovMod = calculateBasketballIQTurnoverModifier(aiChosenIQ);

      const aiFinalTOVChance = Math.min(0.25, aiBaseTOVRate * userDefPressureMod * aiTovMod * aiLateClockMod * userHandsActivePressure * userScreenBreakerPressure * userCageStepPressure * userLockChainTOVMod * aiIqTovMod);
      if ((globalThis as any).__DEBUG_TOV) {
        console.log(`AI finalTOVChance: ${aiFinalTOVChance.toFixed(4)} | base: ${aiBaseTOVRate.toFixed(4)} | iqMod: ${aiIqTovMod.toFixed(4)} | defPress: ${userDefPressureMod.toFixed(2)} | stamMod: ${aiTovMod.toFixed(2)} | late: ${aiLateClockMod.toFixed(2)} | hands: ${userHandsActivePressure.toFixed(2)} | screen: ${userScreenBreakerPressure.toFixed(2)} | cage: ${userCageStepPressure.toFixed(2)} | lock: ${userLockChainTOVMod.toFixed(2)}`);
      }
      let aiBrokenPlayRescued = false;
      let aiBrokenPlayRescuedScorer: Player | null = null;
      let isAiTovRolled = Math.random() < aiFinalTOVChance;
      let aiCommitterForRescue: Player | null = aiCommitterForRescueCandidate;
      if (isAiTovRolled) {
        aiCommitterForRescue = pickCommitter(aiLineup);
        const rescueUsesKey = `AI Broken Play Rescue Q${newQuarter}`;
        const isRescueUsed = (draft.skillUsedThisGame['ai'] ?? []).includes(rescueUsesKey);
        if (!isRescueUsed && rollSpecialMechanic([aiCommitterForRescue], "BROKEN_PLAY_RESCUE_SAVE", draft.playerStamina, (h) => {
          return calculateBrokenPlayRescueChanceScale(getBrokenPlayRescueIdentity(h), staminaPct(ctx, h));
        })) {
          const identity = getBrokenPlayRescueIdentity(aiCommitterForRescue);
          const cost = calculateBrokenPlayRescueStaminaCost(identity, staminaPct(ctx, aiCommitterForRescue));
          drainStamina(draft.playerStamina, aiCommitterForRescue, aiLineup, cost);
          skillLog(ctx, `${aiCommitterForRescue.name} rescues a broken play!`, false);
          draft.skillUsedThisGame['ai'] = [...(draft.skillUsedThisGame['ai'] ?? []), rescueUsesKey];
          aiBrokenPlayRescued = true;
          aiBrokenPlayRescuedScorer = aiCommitterForRescue;
          isAiTovRolled = false;
        }
      }

      if (isAiTovRolled) {
        ctx.turnoverOccurred = true;
        const committer = aiCommitterForRescue!;
        if (userLockChainActive) {
          draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, committer.id, "Hooked", "LOCK_CHAIN_HOOKED", 2);
          skillLog(ctx, `Lock Chain hooks ${committer.name}'s handle`, true);
        }
        if (userLockChainActive) {
          const holders = userLineup.filter(p => hasSpecialSkillMechanic(p, "LOCK_CHAIN_ON_BALL_PRESSURE"));
          if (holders.length > 0) {
            const leader = [...holders].sort((a, b) => {
              const rA = a.skillRarities?.["LOCK_CHAIN"] || 'Common';
              const rB = b.skillRarities?.["LOCK_CHAIN"] || 'Common';
              const val = { Common: 1, Rare: 2, Elite: 3, Epic: 4, Legendary: 5 };
              return (val[rB] ?? 1) - (val[rA] ?? 1);
            })[0];
            const rarity = leader.skillRarities?.["LOCK_CHAIN"] || 'Common';
            const baseDrain = getLockChainDrain(rarity);
            const finalDrain = applyAntiSnowballScaling(baseDrain, staminaPct(ctx, committer));
            const drain = drainStamina(draft.playerStamina, committer, aiLineup, finalDrain);
            skillLog(ctx, `Lock Chain: On-ball pressure drains ${drain} stamina from ${committer.name} on the turnover`, true);
          }
        }
        ctx.activePlayerId = committer.id;
        ensureStats(ctx, committer.id);
        draft.playerStats[committer.id].TOV = (draft.playerStats[committer.id].TOV ?? 0) + 1;
        ctx.eventIndicator = { playerId: committer.id, type: 'TOV' };
        ensureForm(ctx, committer.id);
        draft.formRating[committer.id] = clampForm(draft.formRating[committer.id] - 0.035);
        const pfx = clutchSituation.active ? 'CRUCIAL TURNOVER — ' : '';
        if (Math.random() < 0.55) {
          const stlW2 = userLineup.map(p => getStealRating(p));
          const stlTW2 = stlW2.reduce((s, w) => s + w, 0);
          let stlR2 = Math.random() * stlTW2;
          let stl = userLineup[userLineup.length - 1];
          for (let si = 0; si < userLineup.length; si++) { stlR2 -= stlW2[si]; if (stlR2 <= 0) { stl = userLineup[si]; break; } }
          ensureStats(ctx, stl.id); draft.playerStats[stl.id].STL += 1;
          ctx.stealPlayerId = stl.id;
          ctx.eventIndicator = { playerId: stl.id, type: 'STL' };
          ensureForm(ctx, stl.id); draft.formRating[stl.id] = clampForm(draft.formRating[stl.id] + 0.04);
          draft.events.push(makeEvent(newQuarter, newClock, `${pfx}STL: ${stl.name} picks off ${committer.name}!`, true));
          if (userHandsActivePressure > 1) skillLog(ctx, `${stl.name}'s Hands Active forced the steal window`, true);
          if (rollSpecialMechanic(userLineup, "LOCK_CHAIN_STAMINA_DRAIN", draft.playerStamina, (h) => {
            const identity = (getOnBallDefenseRating(h) + getStealRating(h) + getStaminaRating(h)) / 3;
            return 0.90 + (identity / 100) * 0.20;
          })) {
            const holders = userLineup.filter(p => hasSpecialSkillMechanic(p, "LOCK_CHAIN_STAMINA_DRAIN"));
            if (holders.length > 0) {
              const leader = [...holders].sort((a, b) => {
                const rA = a.skillRarities?.["LOCK_CHAIN"] || 'Common';
                const rB = b.skillRarities?.["LOCK_CHAIN"] || 'Common';
                const val = { Common: 1, Rare: 2, Elite: 3, Epic: 4, Legendary: 5 };
                return (val[rB] ?? 1) - (val[rA] ?? 1);
              })[0];
              const rarity = leader.skillRarities?.["LOCK_CHAIN"] || 'Common';
              const baseDrain = getLockChainDrain(rarity);
              let drainedCount = 0;
              aiLineup.forEach(p => {
                const finalDrain = applyAntiSnowballScaling(baseDrain, staminaPct(ctx, p));
                const drain = drainStamina(draft.playerStamina, p, userLineup, finalDrain);
                if (drain > 0) drainedCount++;
              });
              if (drainedCount > 0) {
                skillLog(ctx, `Lock Chain: The aggressive steal drains stamina from ${drainedCount} opponent${drainedCount > 1 ? 's' : ''}`, true);
              }
            }
          }
          ctx.nextPossessionTeam = 'user';
          ctx.nextLastPlayCategory = 'steal';
        } else {
          draft.events.push(makeEvent(newQuarter, newClock, `${pfx}${unforcedTovMsg(committer, aiTeamObj.name)}`, true));
          if (userScreenBreakerPressure > 1) skillLog(ctx, `Screen Breaker disrupts ${aiTeamObj.name}'s action`, true);
          ctx.nextPossessionTeam = 'user';
          ctx.nextLastPlayCategory = 'turnover';
        }
      } else {
        const sclViolationChance = aiBrokenPlayRescued ? 0 : getShotClockViolationChance(
          state.aiOffStrategy, aiAvg, state.userDefStrategy
        );
        if (Math.random() < sclViolationChance) {
          const ballHandler = aiLineup.find(p => p.position === 'PG') || aiLineup[0];
          ensureStats(ctx, ballHandler.id);
          draft.playerStats[ballHandler.id].TOV = (draft.playerStats[ballHandler.id].TOV ?? 0) + 1;
          draft.formRating[ballHandler.id] = clampForm((draft.formRating[ballHandler.id] ?? 1.0) - 0.02);
          ctx.turnoverOccurred = true;
          draft.events.push(makeEvent(newQuarter, newClock,
            `Shot clock violation: ${ballHandler.name} held the ball too long. My Team ball`, false
          ));
          ctx.nextPossessionTeam = 'user';
          ctx.nextLastPlayCategory = 'turnover';
        }

        if (!ctx.turnoverOccurred) {
          const defAvg_nsf_ai = avgStamina(userLineup, draft.playerStamina);
          const nsfChance_ai = aiBrokenPlayRescued ? 0 : 0.045 * getFoulStamMod(defAvg_nsf_ai);
          if (Math.random() < nsfChance_ai) {
            const committer = pickFoulCommitter(ctx, userLineup);
            ensureStats(ctx, committer.id);
            draft.playerStats[committer.id].FOL = (draft.playerStats[committer.id].FOL ?? 0) + 1;
            draft.teamFouls.user[newQuarter - 1] += 1;

            draft.isInBonus.user = draft.teamFouls.user[newQuarter - 1] >= 5;
            draft.isInBonus.ai = draft.teamFouls.ai[newQuarter - 1] >= 5;

            ensureForm(ctx, committer.id);
            draft.formRating[committer.id] = clampForm(draft.formRating[committer.id] - 0.02);
            ctx.eventIndicator = { playerId: committer.id, type: 'FOL' };
            if (draft.isInBonus.user) {
              ctx.nonShootingFoulToFT = true;
              const ballHandler = [...aiLineup].sort((a, b) => b.ovr - a.ovr)[0];
              draft.events.push(makeEvent(newQuarter, newClock, `Foul on ${committer.name} (${draft.playerStats[committer.id].FOL}/5) BONUS: ${ballHandler.name} to the line for 2`, false));
              ensureStats(ctx, ballHandler.id); ensureForm(ctx, ballHandler.id);
              draft.formRating[ballHandler.id] = clampForm(draft.formRating[ballHandler.id] + 0.02);
              runFTSequence(ctx, ballHandler.id, ballHandler.name, 2, false, committer.name, draft.playerStats[committer.id].FOL, false);
              ctx.nextPossessionTeam = 'user';
              ctx.nextLastPlayCategory = 'foul_reset';
              if (draft.isInBonus.user && draft.teamFouls.user[newQuarter - 1] === 5) {
                draft.events.push(makeEvent(newQuarter, newClock, `My Team in the BONUS: every foul now sends to the line`, false));
              }
            } else {
              draft.events.push(makeEvent(newQuarter, newClock, `Loose ball foul on ${committer.name} (${draft.playerStats[committer.id].FOL}/5). ${aiTeamObj.name} retains possession`, false));
              ctx.nextPossessionTeam = 'ai';
              ctx.nextLastPlayCategory = 'foul_reset';
            }
          }

          if (!ctx.nonShootingFoulToFT) {
            if (aiBrokenPlayRescued && aiBrokenPlayRescuedScorer) {
              scorer = aiBrokenPlayRescuedScorer;
              ctx.activePlayerId = scorer.id;
              ensureStats(ctx, scorer.id);
              is3PT = false;
              shotType = 'hookShot';
              const scorerSlotIdx = SLOT_POS.indexOf(scorer.position as typeof SLOT_POS[number]);
              primaryDefender = scorerSlotIdx >= 0 ? userLineup[scorerSlotIdx] : undefined;
              matchupBonus = getMatchupBonus(scorer, primaryDefender) + (hasBaseSkill(scorer, "Position Flex") ? 0.02 : 0);
              const identity = getBrokenPlayRescueIdentity(scorer);
              const penalty = calculateBrokenPlayRescueShotPenalty(identity, staminaPct(ctx, scorer));
              aiSkillShotBonus = -penalty;
            }

            ensureForm(ctx, scorer.id);
            tryBlock(ctx, userLineup, scorer, true, shotType, is3PT);
            if (ctx.blockOccurred) {
              ctx.nextPossessionTeam = 'user';
              ctx.nextLastPlayCategory = 'block';
            }

            if (!ctx.blockOccurred) {
              const defAvg_sf_ai = avgStamina(userLineup, draft.playerStamina);
              const foulDrawTendency = scorer ? getFoulDrawTendency(scorer) : 0.4;
              let sfChance_ai = calculateBaseShootingFoulChance(is3PT, defAvg_sf_ai, foulDrawTendency, clutchSituation.active, scorer.rarity);
              if (primaryDefender && hasMark(draft.skillMarks, primaryDefender.id, "Tilted")) sfChance_ai += 0.035;
              if (primaryDefender && staminaPct(ctx, primaryDefender) < 60 && rollBaseSkill(aiLineup, "Foul Magnet", draft.playerStamina)) {
                const foulMagnetScale = calculateFoulDrawModifier(getFoulDrawTendency(scorer));
                sfChance_ai += 0.035 * foulMagnetScale;
                skillLog(ctx, `${scorer.name}'s Foul Magnet pressures a tired defender`, false);
              }
              if (primaryDefender && hasMark(draft.skillMarks, primaryDefender.id, "Tilted") && rollSpecialMechanic(aiLineup, "FLOP_FOUL_PRESSURE", draft.playerStamina, (h) => {
                return calculateFlopIdentityScale(getFoulDrawTendency(h));
              })) {
                const flopBonus = getFlopFoulPressureBonus(scorer);
                const composed = rollSpecialMechanic(userLineup, "COMPOSURE_SHIELD_CANCEL", draft.playerStamina, (h) => {
                  return calculateComposureIdentityScale(getCalmRating(h));
                });
                const cleanContest = !composed && rollSpecialMechanic(userLineup, "CLEAN_CHALLENGE_CONTEST", draft.playerStamina, (h) => {
                  return calculateCleanContestIdentityScale(getOnBallDefenseRating(h), getBlockRating(h));
                });

                if (composed) {
                  skillLog(ctx, `Composure Shield cancels the Flop sell-contact attempt`, true);
                } else if (cleanContest) {
                  sfChance_ai += flopBonus * 0.5;
                  skillLog(ctx, `Clean Challenge reduces the Flop contact pressure`, true);
                } else {
                  sfChance_ai += flopBonus;
                  skillLog(ctx, `Flop sells the contact into foul pressure${flopBonus > 0.04 ? " - SGA doubles it" : ""}`, false);
                }
              }
              if (is3PT && primaryDefender && hasMark(draft.skillMarks, primaryDefender.id, "Exposed") && rollSpecialMechanic(aiLineup, "DEEP_STRIKE_FOUL_PRESSURE", draft.playerStamina, (h) => {
                return calculateFourPointBaitIdentityScale(getThreePtRating(h), getFoulDrawTendency(h));
              })) {
                const composed = rollSpecialMechanic(userLineup, "COMPOSURE_SHIELD_CANCEL", draft.playerStamina, (h) => {
                  return calculateComposureIdentityScale(getCalmRating(h));
                });
                const cleanContest = !composed && rollSpecialMechanic(userLineup, "CLEAN_CHALLENGE_CONTEST", draft.playerStamina, (h) => {
                  return calculateCleanContestIdentityScale(getOnBallDefenseRating(h), getBlockRating(h));
                });
                const disciplineWall = !cleanContest && rollBaseSkill(userLineup, "Discipline Wall", draft.playerStamina);
                if (composed) {
                  skillLog(ctx, `Composure Shield cancels the forced foul pressure`, true);
                  aiSkillShotBonus -= 0.02;
                } else if (cleanContest) {
                  skillLog(ctx, `Clean Challenge shuts down Deep Strike`, true);
                  aiSkillShotBonus -= 0.03;
                } else if (disciplineWall) {
                  skillLog(ctx, `Discipline Wall holds off Deep Strike`, true);
                  const dwHolders = userLineup.filter(p => hasBaseSkill(p, "Discipline Wall"));
                  const dwMaxRating = dwHolders.length > 0 ? Math.max(...dwHolders.map(p => getBasketballIQRating(p))) : (primaryDefender ? getBasketballIQRating(primaryDefender) : 50);
                  const disciplineScale = calculateBasketballIQDisciplineScale(dwMaxRating);
                  aiSkillShotBonus -= 0.03 * disciplineScale;
                } else {
                  const baitSummary = resolveLineupArchetypes(aiLineup);
                  const baitDsLevel = baitSummary.allResults.find(r => r.id === "shooting")?.level ?? 0;
                  const baitFdLevel = baitSummary.allResults.find(r => r.id === "foul-draw")?.level ?? 0;
                  const baitBoost = calculateFourPointBaitBoost(baitDsLevel, baitFdLevel);
                  sfChance_ai += baitBoost;
                  skillLog(ctx, `Deep Strike pressures the Exposed defender`, false);
                }
              }
              resolveAiShotAttempt(ctx, scorer, primaryDefender, shotType, is3PT, sfChance_ai, finalChance, aiScorerStamMod, aiSkillShotBonus);
            }
          }
        }
      }

      if (ctx.pointsScored === 0 && !ctx.stealPlayerId && !ctx.turnoverOccurred && !ctx.blockOccurred && !ctx.shootingFoulOccurred && !ctx.nonShootingFoulToFT) {
        resolveAiRebound(ctx);
      }

    }
  }
}
