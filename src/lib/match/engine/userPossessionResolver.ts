import { Player } from '../../types/player';
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
import { getHomeCourtBoost, getAwayPenalty, calculateUserPutbackChance, calculateFinalScoringChance, calculateAndOneChance } from '../shotResolution';
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
import { makeEvent, clutchScoreText, scoreText, clutchMissText, missText } from '../../utils/matchNarrative';
import { getShotClockViolationChance } from '../../utils/matchTypes';
import { tryGameplanJammer, tryShadowGuard, recoverSkillStamina } from './skillHooks';

const MAX_3PT_POSITIVE_ADDITIVE_BONUS = 0.08;

export function resolveUserPossession(ctx: PossessionContext) {
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
    hasHotUser,
    activeOffStrategy,
    pace,
    shotClockViolationFired,
    currentOff,
    eUO,
    eAD,
    goodSubRatio
  } = ctx;

  const userAvg = avgStamina(userLineup, draft.playerStamina);

  if (shotClockViolationFired) {
    const ballHandler = userLineup.find(p => p.position === 'PG') || userLineup[0];
    ensureStats(ctx, ballHandler.id);
    draft.playerStats[ballHandler.id].TOV = (draft.playerStats[ballHandler.id].TOV ?? 0) + 1;
    draft.formRating[ballHandler.id] = clampForm((draft.formRating[ballHandler.id] ?? 1.0) - 0.02);
    ctx.turnoverOccurred = true;
    draft.events.push(makeEvent(newQuarter, newClock,
      `Shot clock violation: ${ballHandler.name} held the ball too long. AI ball`, true
    ));
    ctx.nextPossessionTeam = 'ai';
    ctx.nextLastPlayCategory = 'turnover';
  } else {
    // Pillar 6: TURNOVER CHECK
    const userAvgPly = userLineup.reduce((s, p) => s + getHandleRating(p), 0) / 5;
    const baseTOVRate = 0.085 * (80 / Math.max(55, userAvgPly));
    const defPressureMod = state.aiDefStrategy === 'Blitz/Trap' ? 1.35
      : state.aiDefStrategy === 'Full-Court Press' ? 1.25
      : state.aiDefStrategy === 'Switch Defense' ? 1.08
      : 1.0;
    const tovStamMod = getTovStamMod(userAvg);
    const lateClockMod = pace === 'late_clock' ? 1.30 : 1.0;
    let handsActivePressure = 1.0;
    if (rollBaseSkill(aiLineup, "Hands Active", draft.playerStamina)) {
      const holders = aiLineup.filter(p => p.baseSkills?.includes("Hands Active"));
      const maxStealRating = holders.length > 0 ? Math.max(...holders.map(p => getStealRating(p))) : 50;
      const handsActiveScale = 0.85 + (maxStealRating / 100) * 0.30;
      handsActivePressure = 1.18 * handsActiveScale;
    }
    let screenBreakerPressure = 1.0;
    if ((currentOff === "Pick & Roll" || currentOff === "Motion Offense") && rollBaseSkill(aiLineup, "Screen Breaker", draft.playerStamina)) {
      const holders = aiLineup.filter(p => hasBaseSkill(p, "Screen Breaker"));
      const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getOnBallDefenseRating(p))) : 50;
      const screenBreakerScale = 0.85 + (maxRating / 100) * 0.30;
      screenBreakerPressure = 1.12 * screenBreakerScale;
    }
    let lockChainActive = false;
    let lockChainTOVMod = 1.0;
    if (rollSpecialMechanic(aiLineup, "LOCK_CHAIN_ON_BALL_PRESSURE", draft.playerStamina, (h) => {
      const identity = (getOnBallDefenseRating(h) + getStealRating(h) + getStaminaRating(h)) / 3;
      return 0.90 + (identity / 100) * 0.20;
    })) {
      lockChainActive = true;
      const holders = aiLineup.filter(p => hasSpecialSkillMechanic(p, "LOCK_CHAIN_ON_BALL_PRESSURE"));
      if (holders.length > 0) {
        const identities = holders.map(h => (getOnBallDefenseRating(h) + getStealRating(h) + getStaminaRating(h)) / 3);
        const bestIdentity = Math.max(...identities);
        lockChainTOVMod = Math.min(1.06, 1.03 + (bestIdentity / 100) * 0.03);
      }
    }
    const cageStepPressure = rollSpecialMechanic(aiLineup, "LOCK_CHAIN_HOOKED", draft.playerStamina, (h) => {
      const cageStepIdentity = (getOnBallDefenseRating(h) + getStrengthRating(h)) / 2;
      return 0.90 + (cageStepIdentity / 100) * 0.20;
    }) ? 1.12 : 1.0;
    const committerForRescue = pickCommitter(userLineup);
    const candidateIQ = getBasketballIQRating(committerForRescue);
    const primaryBallhandler = userLineup.find(p => p.position === 'PG') || userLineup[0];
    const pbIQ = getBasketballIQRating(primaryBallhandler);
    const teamAvgIQ = userLineup.reduce((sum, p) => sum + getBasketballIQRating(p), 0) / userLineup.length;
    const chosenIQ = candidateIQ ?? pbIQ ?? teamAvgIQ;
    const iqTovMod = calculateBasketballIQTurnoverModifier(chosenIQ);

    const finalTOVChance = Math.min(0.25, baseTOVRate * defPressureMod * tovStamMod * lateClockMod * handsActivePressure * screenBreakerPressure * cageStepPressure * lockChainTOVMod * iqTovMod);
    if ((globalThis as any).__DEBUG_TOV) {
      console.log(`USER finalTOVChance: ${finalTOVChance.toFixed(4)} | base: ${baseTOVRate.toFixed(4)} | iqMod: ${iqTovMod.toFixed(4)} | defPress: ${defPressureMod.toFixed(2)} | stamMod: ${tovStamMod.toFixed(2)} | late: ${lateClockMod.toFixed(2)} | hands: ${handsActivePressure.toFixed(2)} | screen: ${screenBreakerPressure.toFixed(2)} | cage: ${cageStepPressure.toFixed(2)} | lock: ${lockChainTOVMod.toFixed(2)}`);
    }
    let userBrokenPlayRescued = false;
    let userBrokenPlayRescuedScorer: Player | null = null;
    let isTovRolled = Math.random() < finalTOVChance;
    if (isTovRolled) {
      const rescueUsesKey = `User Broken Play Rescue Q${newQuarter}`;
      const isRescueUsed = (draft.skillUsedThisGame['user'] ?? []).includes(rescueUsesKey);
      if (!isRescueUsed && rollSpecialMechanic([committerForRescue], "BROKEN_PLAY_RESCUE_SAVE", draft.playerStamina, (h) => {
        return calculateBrokenPlayRescueChanceScale(getBrokenPlayRescueIdentity(h), staminaPct(ctx, h));
      })) {
        const identity = getBrokenPlayRescueIdentity(committerForRescue);
        const cost = calculateBrokenPlayRescueStaminaCost(identity, staminaPct(ctx, committerForRescue));
        drainStamina(draft.playerStamina, committerForRescue, userLineup, cost);
        skillLog(ctx, `${committerForRescue.name} rescues a broken play!`, true);
        draft.skillUsedThisGame['user'] = [...(draft.skillUsedThisGame['user'] ?? []), rescueUsesKey];
        userBrokenPlayRescued = true;
        userBrokenPlayRescuedScorer = committerForRescue;
        isTovRolled = false;
      }
    }

    if (isTovRolled) {
      ctx.turnoverOccurred = true;
      const committer = committerForRescue!;
      if (lockChainActive) {
        draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, committer.id, "Hooked", "LOCK_CHAIN_HOOKED", 2);
        skillLog(ctx, `Lock Chain hooks ${committer.name}'s handle`, false);
      }
      if (lockChainActive) {
        const holders = aiLineup.filter(p => hasSpecialSkillMechanic(p, "LOCK_CHAIN_ON_BALL_PRESSURE"));
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
          const drain = drainStamina(draft.playerStamina, committer, userLineup, finalDrain);
          skillLog(ctx, `LOCK_CHAIN: On-ball pressure drains ${drain} stamina from ${committer.name} on the turnover`, false);
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
        const stlWeights = aiLineup.map(p => getStealRating(p));
        const stlTotalW = stlWeights.reduce((s, w) => s + w, 0);
        let stlR = Math.random() * stlTotalW;
        let stl = aiLineup[aiLineup.length - 1];
        for (let si = 0; si < aiLineup.length; si++) { stlR -= stlWeights[si]; if (stlR <= 0) { stl = aiLineup[si]; break; } }
        ensureStats(ctx, stl.id);
        draft.playerStats[stl.id].STL += 1;
        ctx.stealPlayerId = stl.id;
        ctx.eventIndicator = { playerId: stl.id, type: 'STL' };
        ensureForm(ctx, stl.id);
        draft.formRating[stl.id] = clampForm(draft.formRating[stl.id] + 0.04);
        const iso = currentOff === "Isolation (ISO)";
        draft.events.push(makeEvent(newQuarter, newClock, `${pfx}STL: ${stl.name} ${iso ? 'strips ' + committer.name + '. ISO broken down' : 'picks off ' + committer.name}`, false));
        if (handsActivePressure > 1) skillLog(ctx, `${stl.name}'s Hands Active forced the steal window`, false);
        if (rollSpecialMechanic(aiLineup, "LOCK_CHAIN_STAMINA_DRAIN", draft.playerStamina, (h) => {
          const identity = (getOnBallDefenseRating(h) + getStealRating(h) + getStaminaRating(h)) / 3;
          return 0.90 + (identity / 100) * 0.20;
        })) {
          const holders = aiLineup.filter(p => hasSpecialSkillMechanic(p, "LOCK_CHAIN_STAMINA_DRAIN"));
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
            userLineup.forEach(p => {
              const finalDrain = applyAntiSnowballScaling(baseDrain, staminaPct(ctx, p));
              const drain = drainStamina(draft.playerStamina, p, aiLineup, finalDrain);
              if (drain > 0) drainedCount++;
            });
            if (drainedCount > 0) {
              skillLog(ctx, `LOCK_CHAIN: The aggressive steal drains stamina from ${drainedCount} opponent${drainedCount > 1 ? 's' : ''}`, false);
            }
          }
        }
        ctx.nextPossessionTeam = 'ai';
        ctx.nextLastPlayCategory = 'steal';
      } else {
        draft.events.push(makeEvent(newQuarter, newClock, `${pfx}${unforcedTovMsg(committer, 'My Team')}`, false));
        if (screenBreakerPressure > 1) skillLog(ctx, `Screen Breaker disrupts My Team's action`, false);
        ctx.nextPossessionTeam = 'ai';
        ctx.nextLastPlayCategory = 'turnover';
      }
    } else {
      // No turnover — check fouls then scoring
      const sclViolationChance = userBrokenPlayRescued ? 0 : getShotClockViolationChance(
        currentOff, userAvg, state.aiDefStrategy
      );
      if (Math.random() < sclViolationChance) {
        const ballHandler = userLineup.find(p => p.position === 'PG') || userLineup[0];
        ensureStats(ctx, ballHandler.id);
        draft.playerStats[ballHandler.id].TOV = (draft.playerStats[ballHandler.id].TOV ?? 0) + 1;
        draft.formRating[ballHandler.id] = clampForm((draft.formRating[ballHandler.id] ?? 1.0) - 0.02);
        ctx.turnoverOccurred = true;
        draft.events.push(makeEvent(newQuarter, newClock,
          `Shot clock violation: ${ballHandler.name} held the ball too long. AI ball`, true
        ));
        ctx.nextPossessionTeam = 'ai';
        ctx.nextLastPlayCategory = 'turnover';
      }

      if (!ctx.turnoverOccurred) {
        const defAvg_nsf = avgStamina(aiLineup, draft.playerStamina);
        const nsfChance = userBrokenPlayRescued ? 0 : 0.045 * getFoulStamMod(defAvg_nsf);
        if (Math.random() < nsfChance) {
          const committer = pickFoulCommitter(ctx, aiLineup);
          ensureStats(ctx, committer.id);
          draft.playerStats[committer.id].FOL = (draft.playerStats[committer.id].FOL ?? 0) + 1;
          draft.teamFouls.ai[newQuarter - 1] += 1;

          draft.isInBonus.user = draft.teamFouls.user[newQuarter - 1] >= 5;
          draft.isInBonus.ai = draft.teamFouls.ai[newQuarter - 1] >= 5;

          ensureForm(ctx, committer.id);
          draft.formRating[committer.id] = clampForm(draft.formRating[committer.id] - 0.02);
          ctx.eventIndicator = { playerId: committer.id, type: 'FOL' };
          if (draft.isInBonus.ai) {
            ctx.nonShootingFoulToFT = true;
            const ballHandler = [...userLineup].sort((a, b) => b.ovr - a.ovr)[0];
            draft.events.push(makeEvent(newQuarter, newClock, `Foul on ${committer.name} (${draft.playerStats[committer.id].FOL}/5) BONUS: ${ballHandler.name} to the line for 2`, true));
            ensureStats(ctx, ballHandler.id);
            ensureForm(ctx, ballHandler.id);
            draft.formRating[ballHandler.id] = clampForm(draft.formRating[ballHandler.id] + 0.02);
            runFTSequence(ctx, ballHandler.id, ballHandler.name, 2, false, committer.name, draft.playerStats[committer.id].FOL, true);
            ctx.nextPossessionTeam = 'ai';
            ctx.nextLastPlayCategory = 'foul_reset';
            if (draft.isInBonus.ai && draft.teamFouls.ai[newQuarter - 1] === 5) {
              draft.events.push(makeEvent(newQuarter, newClock, `${aiTeamObj.name} in the BONUS: every foul now sends to the line`, true));
            }
          } else {
            draft.events.push(makeEvent(newQuarter, newClock, `Loose ball foul on ${committer.name} (${draft.playerStats[committer.id].FOL}/5). My Team retains possession`, true));
            ctx.nextPossessionTeam = 'user';
            ctx.nextLastPlayCategory = 'foul_reset';
          }
        }

        if (!ctx.nonShootingFoulToFT) {
          const baseChance = Math.max(0.30, Math.min(0.80, eUO / ((eUO + eAD) || 1)));
          const avgStamMod = getStaminaMod(userAvg);
          const teamFatigueContext = 0.88 + avgStamMod * 0.12;
          let finalChance = baseChance * teamFatigueContext * momentumBonus;
          if (hasHotUser) finalChance *= 1.04;

          let scorer = userLineup[userLineup.length - 1];
          if (userBrokenPlayRescued && userBrokenPlayRescuedScorer) {
            scorer = userBrokenPlayRescuedScorer;
          } else if (currentOff === "Isolation (ISO)") {
            scorer = [...userLineup].sort((a, b) => b.ovr - a.ovr)[0];
          } else if (currentOff === "Post Isolation") {
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
          ctx.activePlayerId = scorer.id;
          ensureStats(ctx, scorer.id);

          const shooterStam = draft.playerStamina[scorer.id] ?? 100;
          const shooterStamMod = getPlayerStaminaMod(scorer, shooterStam);
          let is3PTBaseCheck = undefined as boolean | undefined;
          if (currentOff === "5-Out Spacing" && staminaPct(ctx, scorer) >= 50) is3PTBaseCheck = true;
          if (currentOff === "Post Isolation") is3PTBaseCheck = false;
          let shotInfo = generateShot(scorer, draft.formRating[scorer.id] || 1.0, staminaPct(ctx, scorer), is3PTBaseCheck, pace);
          if (userBrokenPlayRescued) {
            shotInfo = { is3PT: false, type: 'hookShot' };
          }
          const is3PT = shotInfo.is3PT;
          const shotType = shotInfo.type;
          ensureForm(ctx, scorer.id);

          const SLOT_POS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;
          const scorerSlotIdx = SLOT_POS.indexOf(scorer.position as typeof SLOT_POS[number]);
          const primaryDefender = scorerSlotIdx >= 0 ? aiLineup[scorerSlotIdx] : undefined;
          const matchupBonus = getMatchupBonus(scorer, primaryDefender) + (hasBaseSkill(scorer, "Position Flex") ? 0.02 : 0);
          if (matchupBonus >= 0.12 && primaryDefender) {
            draft.events.push(makeEvent(newQuarter, newClock,
              `MISMATCH: ${scorer.name} has a clear advantage over ${primaryDefender.name}`, true
            ));
          }

          let skillShotBonus = 0;
          if (userBrokenPlayRescued) {
            const identity = getBrokenPlayRescueIdentity(scorer);
            const penalty = calculateBrokenPlayRescueShotPenalty(identity, staminaPct(ctx, scorer));
            skillShotBonus -= penalty;
          }
          if (currentOff !== "Isolation (ISO)" && currentOff !== "Post Isolation") {
            const pbSummary = resolveLineupArchetypes(userLineup);
            const pbLevel = pbSummary.allResults.find(r => r.id === "playmaking")?.level ?? 0;
            const scaleMultiplier = pbLevel === 0 ? 0.85 : pbLevel === 1 ? 1.00 : pbLevel === 2 ? 1.05 : 1.10;
            const capLimit = pbLevel === 0 ? 0.015 : 0.020;

            if (rollSpecialMechanic(userLineup, "COURT_VISION_RHYTHM_BOOST", draft.playerStamina, (h) => {
              const courtVisionIdentity = (getAssistRating(h) + getHandleRating(h) + getOffenseRating(h)) / 3;
              return (0.90 + (courtVisionIdentity / 100) * 0.20) * scaleMultiplier;
            })) {
              const holders = userLineup.filter(p => hasSpecialSkillMechanic(p, "COURT_VISION_RHYTHM_BOOST"));
              const leader = holders.sort((a_p, b_p) => (getAssistRating(b_p) - getAssistRating(a_p)))[0];
              if (leader) {
                const scale = getAssistRating(leader) / 100;
                const bonus = Math.min(capLimit, 0.012 + scale * 0.006);
                skillShotBonus += bonus;
                skillLog(ctx, `${leader.name}'s Court Vision Engine creates a rhythm bonus of +${(bonus * 100).toFixed(1)}% for ${scorer.name}`, true);
              }
            }
          }
          if (is3PT && rollBaseSkill(userLineup, "Arc Pressure", draft.playerStamina)) {
            const jammed = tryGameplanJammer(draft, aiLineup, scorer, "Arc Pressure", false);
            const shadowed = !jammed && tryShadowGuard(draft, aiLineup, false);
            const focused = !jammed && !shadowed && rollBaseSkill(aiLineup, "Focus Lock", draft.playerStamina);
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
            skillLog(ctx, `${scorer.name}'s Arc Pressure creates a cleaner three`, true);
            if (focused) skillLog(ctx, `Focus Lock contains the shooting rhythm`, false);
            const dsSummary = resolveLineupArchetypes(userLineup);
            const dsLevel = dsSummary.allResults.find(r => r.id === "shooting")?.level ?? 0;
            const scaleMultiplier = dsLevel === 0 ? 0.85 : dsLevel === 1 ? 1.00 : dsLevel === 2 ? 1.05 : 1.10;
            if (!jammed && !shadowed && !focused && primaryDefender && rollSpecialMechanic(userLineup, "DEEP_STRIKE_EXPOSE", draft.playerStamina, (h) => {
              const redDotIdentity = getThreePtRating(h);
              return (0.90 + (redDotIdentity / 100) * 0.20) * scaleMultiplier;
            })) {
              draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, primaryDefender.id, "Exposed", "Red Dot X", 3);
              skillLog(ctx, "Red Dot X marks " + primaryDefender.name + " as Exposed", true);
            }
          }
          if (!is3PT && rollBaseSkill(userLineup, "Paint Magnet", draft.playerStamina)) {
            const jammed = tryGameplanJammer(draft, aiLineup, scorer, "Paint Magnet", false);
            const paintScale = 0.85 + (getFinishingRating(scorer) / 100) * 0.30;
            skillShotBonus += jammed ? 0.005 : 0.03 * paintScale;
            skillLog(ctx, `${scorer.name}'s Paint Magnet bends the defense`, true);
            if (!jammed && primaryDefender && staminaPct(ctx, primaryDefender) < 45) {
              draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, primaryDefender.id, "Tilted", "Paint Magnet", 3);
              skillLog(ctx, `${scorer.name}'s Paint Magnet tilts tired defender ${primaryDefender.name}`, true);
            }
          }
          if (!is3PT && primaryDefender && rollBaseSkill(userLineup, "Power Driver", draft.playerStamina)) {
            const powerDriverIdentity = (getFinishingRating(scorer) + getStrengthRating(scorer)) / 2;
            const powerDriverShotScale = 0.85 + (powerDriverIdentity / 100) * 0.30;
            skillShotBonus += 0.02 * powerDriverShotScale;
            skillLog(ctx, `${scorer.name}'s Power Driver pressures the rim`, true);
          }
          if (!is3PT && primaryDefender && staminaPct(ctx, primaryDefender) < 65 && rollSpecialMechanic(userLineup, "POSTER_SPARK_TILT", draft.playerStamina, (h) => {
            const contactTaxIdentity = (getFinishingRating(h) + getStrengthRating(h)) / 2;
            return 0.90 + (contactTaxIdentity / 100) * 0.20;
          })) {
            draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, primaryDefender.id, "Tilted", "Poster Spark", 3);
            skillLog(ctx, `Poster Spark tilts ${primaryDefender.name}`, true);
          }
          if (primaryDefender && hasAnyMark(draft.skillMarks, primaryDefender.id) && rollBaseSkill(userLineup, "Mismatch Caller", draft.playerStamina)) {
            const jammed = tryGameplanJammer(draft, aiLineup, scorer, "Mismatch Caller", false);
            skillShotBonus += jammed ? 0.005 : 0.025;
            skillLog(ctx, `${scorer.name}'s Mismatch Caller attacks a marked defender`, true);
          }
          if (rollBaseSkill(userLineup, "Tempo Surgeon", draft.playerStamina)) {
            const jammed = tryGameplanJammer(draft, aiLineup, scorer, "Tempo Surgeon", false);
            const holders = userLineup.filter(p => p.baseSkills?.includes("Tempo Surgeon"));
            const maxTempo = holders.length > 0 ? Math.max(...holders.map(p => Math.round((getHandleRating(p) + getAssistRating(p)) / 2))) : 50;
            const tempoScale = 0.85 + (maxTempo / 100) * 0.30;
            skillShotBonus += jammed ? (0.003 * tempoScale) : (0.018 * tempoScale);
            skillLog(ctx, `Tempo Surgeon creates a cleaner offensive read`, true);
          }
          if ((pace === "fastbreak" || pace === "early_offense") && rollBaseSkill(userLineup, "Tempo Switch", draft.playerStamina)) {
            skillShotBonus += 0.025;
            skillLog(ctx, `${scorer.name}'s Tempo Switch boosts the early attack`, true);
          }
          if (primaryDefender && rollSpecialMechanic([primaryDefender], "LOCK_CHAIN_ON_BALL_PRESSURE", draft.playerStamina, (h) => {
            const identity = (getOnBallDefenseRating(h) + getStealRating(h) + getStaminaRating(h)) / 3;
            return 0.90 + (identity / 100) * 0.20;
          })) {
            const rarity = primaryDefender.skillRarities?.["LOCK_CHAIN"] || 'Common';
            const baseDrain = getLockChainDrain(rarity);
            const finalDrain = applyAntiSnowballScaling(baseDrain, staminaPct(ctx, scorer));
            const drain = drainStamina(draft.playerStamina, scorer, userLineup, finalDrain);
            skillLog(ctx, `LOCK_CHAIN: ${primaryDefender.name}'s on-ball pressure drains ${drain} stamina from shooter ${scorer.name}`, false);
          }

          // SKY_WALL rim protection
          const CLOSE_RANGE_SHOTS = [
            'drivingLayup', 'dunk', 'euroStep', 'fingerRoll', 'powerLayup', 'putBack', 'bankShot', 'hookShot', 'floater'
          ];
          if (!is3PT && CLOSE_RANGE_SHOTS.includes(shotType)) {
            if (rollSpecialMechanic(aiLineup, "SKY_WALL_BLOCK_BOOST", draft.playerStamina, (h) => {
              return calculateSkyWallScale(getSkyWallIdentity(h)).scale;
            })) {
              const holders = aiLineup.filter(p => hasSpecialSkillMechanic(p, "SKY_WALL_BLOCK_BOOST"));
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
                skillShotBonus -= penalty;
                const baseDrain = getSkyWallDrain(rarity);
                const finalDrain = applyAntiSnowballScaling(baseDrain, staminaPct(ctx, scorer));
                const drain = drainStamina(draft.playerStamina, scorer, userLineup, finalDrain);
                skillLog(ctx, `SKY_WALL: Rim protection reduces shot quality by ${(penalty * 100).toFixed(3)}% and drains ${drain} stamina from ${scorer.name}`, false);
              }
            }
          }

          if (hasMark(draft.skillMarks, scorer.id, "Static")) {
            skillShotBonus -= 0.025;
          }

          tryBlock(ctx, aiLineup, scorer, false, shotType, is3PT);
          if (ctx.blockOccurred) {
            trackShotStamina(ctx, scorer.id, shotType, is3PT, 'block');
            trackDefensiveStamina(ctx, primaryDefender, shotType, is3PT, 'block');
            ctx.nextPossessionTeam = 'ai';
            ctx.nextLastPlayCategory = 'block';
          }

          if (!ctx.blockOccurred) {
            // ROLL F: SHOOTING FOUL CHECK
            const defAvg_sf = avgStamina(aiLineup, draft.playerStamina);
            const foulDrawTendency = scorer ? getFoulDrawTendency(scorer) : 0.4;
            let sfChance = calculateBaseShootingFoulChance(is3PT, defAvg_sf, foulDrawTendency, clutchSituation.active, scorer.rarity);
            if (primaryDefender && hasMark(draft.skillMarks, primaryDefender.id, "Tilted")) sfChance += 0.035;
            if (primaryDefender && staminaPct(ctx, primaryDefender) < 60 && rollBaseSkill(userLineup, "Foul Magnet", draft.playerStamina)) {
              const foulMagnetScale = calculateFoulDrawModifier(getFoulDrawTendency(scorer));
              sfChance += 0.035 * foulMagnetScale;
              skillLog(ctx, `${scorer.name}'s Foul Magnet pressures a tired defender`, true);
            }
            if (primaryDefender && hasMark(draft.skillMarks, primaryDefender.id, "Tilted") && rollSpecialMechanic(userLineup, "FLOP_FOUL_PRESSURE", draft.playerStamina, (h) => {
              return calculateFlopIdentityScale(getFoulDrawTendency(h));
            })) {
              const flopBonus = getFlopFoulPressureBonus(scorer);
              const composed = rollSpecialMechanic(aiLineup, "COMPOSURE_SHIELD_CANCEL", draft.playerStamina, (h) => {
                return calculateComposureIdentityScale(getCalmRating(h));
              });
              const cleanContest = !composed && rollSpecialMechanic(aiLineup, "CLEAN_CHALLENGE_CONTEST", draft.playerStamina, (h) => {
                return calculateCleanContestIdentityScale(getOnBallDefenseRating(h), getBlockRating(h));
              });

              if (composed) {
                skillLog(ctx, `Composure Shield cancels the Flop sell-contact attempt`, false);
              } else if (cleanContest) {
                sfChance += flopBonus * 0.5;
                skillLog(ctx, `Clean Challenge reduces the Flop contact pressure`, false);
              } else {
                sfChance += flopBonus;
                skillLog(ctx, `Flop sells the contact into foul pressure${flopBonus > 0.04 ? " - SGA doubles it" : ""}`, true);
              }
            }
            if (is3PT && primaryDefender && hasMark(draft.skillMarks, primaryDefender.id, "Exposed") && rollSpecialMechanic(userLineup, "DEEP_STRIKE_FOUL_PRESSURE", draft.playerStamina, (h) => {
              return calculateFourPointBaitIdentityScale(getThreePtRating(h), getFoulDrawTendency(h));
            })) {
              const composed = rollSpecialMechanic(aiLineup, "COMPOSURE_SHIELD_CANCEL", draft.playerStamina, (h) => {
                return calculateComposureIdentityScale(getCalmRating(h));
              });
              const cleanContest = !composed && rollSpecialMechanic(aiLineup, "CLEAN_CHALLENGE_CONTEST", draft.playerStamina, (h) => {
                return calculateCleanContestIdentityScale(getOnBallDefenseRating(h), getBlockRating(h));
              });
              const disciplineWall = !cleanContest && rollBaseSkill(aiLineup, "Discipline Wall", draft.playerStamina);
              if (composed) {
                skillLog(ctx, `Composure Shield cancels the forced foul pressure`, false);
                skillShotBonus -= 0.02;
              } else if (cleanContest) {
                skillLog(ctx, `Clean Challenge shuts down Deep Strike`, false);
                skillShotBonus -= 0.03;
              } else if (disciplineWall) {
                skillLog(ctx, `Discipline Wall holds off Deep Strike`, false);
                const holders = aiLineup.filter(p => hasBaseSkill(p, "Discipline Wall"));
                const maxRating = holders.length > 0 ? Math.max(...holders.map(p => getBasketballIQRating(p))) : (primaryDefender ? getBasketballIQRating(primaryDefender) : 50);
                const disciplineScale = calculateBasketballIQDisciplineScale(maxRating);
                skillShotBonus -= 0.03 * disciplineScale;
              } else {
                const baitSummary = resolveLineupArchetypes(userLineup);
                const baitDsLevel = baitSummary.allResults.find(r => r.id === "shooting")?.level ?? 0;
                const baitFdLevel = baitSummary.allResults.find(r => r.id === "foul-draw")?.level ?? 0;
                const baitBoost = calculateFourPointBaitBoost(baitDsLevel, baitFdLevel);
                sfChance += baitBoost;
                skillLog(ctx, `Deep Strike pressures the Exposed defender`, true);
              }
            }
            const MAX_SHOOTING_FOUL_CHANCE = 0.28;
            sfChance = Math.min(MAX_SHOOTING_FOUL_CHANCE, sfChance);
            if (Math.random() < sfChance) {
              ctx.shootingFoulOccurred = true;
              trackShotStamina(ctx, scorer.id, shotType, is3PT, 'foul');
              trackDefensiveStamina(ctx, primaryDefender, shotType, is3PT, 'foul');
              const committer = pickFoulCommitter(ctx, aiLineup);
              ensureStats(ctx, committer.id);
              ensureForm(ctx, committer.id);
              draft.playerStats[committer.id].FOL = (draft.playerStats[committer.id].FOL ?? 0) + 1;
              draft.formRating[committer.id] = clampForm(draft.formRating[committer.id] - 0.02);
              draft.teamFouls.ai[newQuarter - 1] += 1;

              draft.isInBonus.user = draft.teamFouls.user[newQuarter - 1] >= 5;
              draft.isInBonus.ai = draft.teamFouls.ai[newQuarter - 1] >= 5;

              ensureForm(ctx, scorer.id);
              draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + 0.02);
              const ftCount = is3PT ? 3 : 2;
              draft.events.push(makeEvent(newQuarter, newClock, `Shooting foul on ${committer.name} (${draft.playerStats[committer.id].FOL}/5): ${scorer.name} to the line for ${ftCount}`, true));
              ctx.eventIndicator = { playerId: committer.id, type: 'FOL' };
              runFTSequence(ctx, scorer.id, scorer.name, ftCount, false, committer.name, draft.playerStats[committer.id].FOL, true);
              ctx.nextPossessionTeam = 'ai';
              ctx.nextLastPlayCategory = 'foul_reset';
            }
          }

          // ROLL 3: MAKE/MISS
          if (!ctx.blockOccurred && !ctx.shootingFoulOccurred) {
            const clutchMod = getClutchMod(ctx, scorer);
            const zoneMod = getShotZoneModifier(shotType, state.aiDefStrategy);
            const pressMod = (state.aiDefStrategy === 'Full-Court Press') ? getShotZoneModifier(shotType, 'Full-Court Press') : 1.0;
            const usageMod = getUsageMod(ctx, scorer.id, 'user');
            const effectiveZoneMod = pace === 'fastbreak' ? 1.0 : zoneMod;
            const effectivePressMod = pace === 'fastbreak' ? 1.0 : pressMod;
            const matchupAdj = matchupBonus;
            const userHomeAdj = userIsHome ? getHomeCourtBoost(scorer.rarity, homeCourt.crowdEnergy, homeCourt.rallyMode) : -getAwayPenalty(scorer.rarity, homeCourt.crowdEnergy, homeCourt.rallyMode);
            const decisionWeightMod = 1.0 + ((goodSubRatio - 0.5) * 0.05);
            const shotValueDifficulty = is3PT ? -0.095 : 0;
            const realEfficiencyAdj = getShotIdentityEfficiencyAdjustment(scorer, is3PT, shotType);

            const additiveBonusSum = userHomeAdj + matchupAdj + skillShotBonus + realEfficiencyAdj;
            const cappedAdditiveBonus = (is3PT && additiveBonusSum > 0)
              ? Math.min(additiveBonusSum, MAX_3PT_POSITIVE_ADDITIVE_BONUS)
              : additiveBonusSum;

            const individual3ptMod = is3PT ? getIndividualThreePointShotMod(scorer.shooting) : 1.0;

            const iqContext = {
              isLateClock: pace === 'late_clock',
              isLowStamina: staminaPct(ctx, scorer) <= 0.65,
              isHeavyContest: primaryDefender !== undefined && getOnBallDefenseRating(primaryDefender) >= 80,
              isBrokenPlayRescue: userBrokenPlayRescued
            };
            const basketballIQPressureMod = calculateBasketballIQShotQualityModifier(getBasketballIQRating(scorer), iqContext);
            const hustleContestMod = primaryDefender ? calculateHustleContestModifier(getHustleRating(primaryDefender)) : 1.0;

            const finalScoringChance = calculateFinalScoringChance({
              finalChance,
              staminaMod: shooterStamMod,
              formRating: draft.formRating[scorer.id],
              clutchMod,
              effectiveZoneMod,
              effectivePressMod,
              usageMod,
              individual3ptMod,
              additiveBonus: cappedAdditiveBonus,
              difficultyMod: shotValueDifficulty,
              decisionWeightMod,
              maxCeilingLimit: 0.85,
              basketballIQPressureMod,
              hustleContestMod
            });
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

              ctx.draft.activeShotMeter = {
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
              trackShotStamina(ctx, scorer.id, shotType, is3PT, 'make');
              trackDefensiveStamina(ctx, primaryDefender, shotType, is3PT, 'make');
              ctx.newPossessionHistory.push({ team: 'user', playerId: scorer.id, wasTOV: false });
              ctx.pointsScored = is3PT ? 3 : 2;
              draft.playerStats[scorer.id].PTS += ctx.pointsScored;
              draft.playerStats[scorer.id].FGM = (draft.playerStats[scorer.id].FGM ?? 0) + 1;
              draft.playerStats[scorer.id].FGA = (draft.playerStats[scorer.id].FGA ?? 0) + 1;
              if (is3PT) {
                draft.playerStats[scorer.id].TPM = (draft.playerStats[scorer.id].TPM ?? 0) + 1;
                draft.playerStats[scorer.id].TPA = (draft.playerStats[scorer.id].TPA ?? 0) + 1;
              }
              const evtText = clutchSituation.active
                ? clutchScoreText(scorer, shotType, clutchSituation)
                : scoreText(scorer, shotType, currentOff, ctx.momentumBonus > 1.0); // momentumActive check
              draft.events.push(makeEvent(newQuarter, newClock, evtText, true, ctx.pointsScored, scorer.id));
              if (clutchSituation.active) {
                const formBoost = clutchSituation.intensity === 'high' ? 0.04 : 0.02;
                draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + formBoost);
                if (scorer.rarity === 'Mythic' && is3PT && draft.formRating[scorer.id] >= 1.10) draft.hotFromForm[scorer.id] = true;
              }
              ctx.nextPossessionTeam = 'ai';
              ctx.nextLastPlayCategory = 'made_shot';
              const tm = userLineup.filter(p => p.id !== scorer.id);
              if (tm.length > 0 && Math.random() < 0.60) {
                const a = tm[Math.floor(Math.random() * tm.length)];
                ensureStats(ctx, a.id);
                draft.playerStats[a.id].AST += 1;
                ctx.eventIndicator = { playerId: a.id, type: 'AST' };
                draft.events.push(makeEvent(newQuarter, newClock, `${a.name} with the assist`, true, 0));
                if (hasBaseSkill(a, "Connector Hub") && rollBaseSkill(userLineup, "Connector Hub", draft.playerStamina)) {
                  const connectorScale = 0.85 + (getAssistRating(a) / 100) * 0.30;
                  recoverSkillStamina(draft, scorer, 35 * connectorScale);
                  skillLog(ctx, `${a.name}'s Connector Hub restores ${scorer.name}'s stamina`, true);
                }
                if (rollBaseSkill(userLineup, "Share Rhythm", draft.playerStamina)) {
                  const shareRhythmHolders = userLineup.filter(p => hasBaseSkill(p, "Share Rhythm"));
                  const maxAssistRating = Math.max(...shareRhythmHolders.map(p => getAssistRating(p)), 50);
                  const shareRhythmScale = 0.85 + (maxAssistRating / 100) * 0.30;
                  userLineup.forEach(p => recoverSkillStamina(draft, p, 8 * shareRhythmScale));
                  skillLog(ctx, `${a.name}'s Share Rhythm steadies the lineup`, true);
                }
                if (rollSpecialMechanic(userLineup, "COURT_VISION_RHYTHM_BOOST", draft.playerStamina, (h) => {
                  const chainPassIdentity = getAssistRating(h);
                  return 0.90 + (chainPassIdentity / 100) * 0.20;
                })) {
                  const debtTarget = [...aiLineup].sort((a_p, b_p) => (draft.playerStamina[a_p.id] ?? 100) - (draft.playerStamina[b_p.id] ?? 100))[0];
                  draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, debtTarget.id, "Hooked", "Court Vision Engine", 3);
                  skillLog(ctx, `Court Vision Engine places Debt on ${debtTarget.name}`, true);
                }
              }
              // ROLL A: AND-1 CHECK
              if (!ctx.nonShootingFoulToFT) {
                const finishingRating = scorer && !is3PT ? getFinishingRating(scorer) : 50;
                const and1Chance = calculateAndOneChance(
                  is3PT,
                  avgStamina(aiLineup, draft.playerStamina),
                  finishingRating
                );
                if (Math.random() < and1Chance) {
                  const and1Committer = pickFoulCommitter(ctx, aiLineup);
                  ensureStats(ctx, and1Committer.id);
                  draft.playerStats[and1Committer.id].FOL = (draft.playerStats[and1Committer.id].FOL ?? 0) + 1;
                  draft.teamFouls.ai[newQuarter - 1] += 1;

                  draft.isInBonus.user = draft.teamFouls.user[newQuarter - 1] >= 5;
                  draft.isInBonus.ai = draft.teamFouls.ai[newQuarter - 1] >= 5;

                  ensureForm(ctx, and1Committer.id);
                  draft.formRating[and1Committer.id] = clampForm(draft.formRating[and1Committer.id] - 0.03);
                  ensureForm(ctx, scorer.id);
                  draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + 0.05);
                  draft.events.push(makeEvent(newQuarter, newClock, `AND-1! ${scorer.name} scores through contact. One more from the line`, true));
                  ctx.eventIndicator = { playerId: and1Committer.id, type: 'FOL' };
                  runFTSequence(ctx, scorer.id, scorer.name, 1, true, and1Committer.name, draft.playerStats[and1Committer.id].FOL, true);
                  ctx.nextLastPlayCategory = 'foul_reset';
                }
              }
            } else {
              trackShotStamina(ctx, scorer.id, shotType, is3PT, 'miss');
              trackDefensiveStamina(ctx, primaryDefender, shotType, is3PT, 'miss');
              const missEvtText = clutchSituation.active ? clutchMissText(scorer, clutchSituation) : missText(scorer, shotType, currentOff);
              draft.events.push(makeEvent(newQuarter, newClock, missEvtText, true, 0, scorer.id));
              draft.playerStats[scorer.id].FGA = (draft.playerStats[scorer.id].FGA ?? 0) + 1;
              if (is3PT) draft.playerStats[scorer.id].TPA = (draft.playerStats[scorer.id].TPA ?? 0) + 1;
              if (clutchSituation.active) {
                const formPenalty = clutchSituation.intensity === 'high' ? -0.04 : -0.02;
                draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + formPenalty);
              }
              // REBOUND RESOLUTION
              const attReb = calculateTeamReboundScore(userLineup, draft.playerStamina);
              const defReb = calculateTeamReboundScore(aiLineup, draft.playerStamina);
              const glassTouch = rollBaseSkill(userLineup, "Glass Touch", draft.playerStamina);
              const paintBarrier = rollBaseSkill(aiLineup, "Paint Barrier", draft.playerStamina);
              const glassScale = glassTouch
                ? calculateGlassScale(userLineup.filter(p => hasBaseSkill(p, "Glass Touch")))
                : 0;
              const barrierScale = paintBarrier
                ? calculateBarrierScale(aiLineup.filter(p => hasBaseSkill(p, "Paint Barrier")))
                : 0;

              const attackerArchetypeSummary = resolveLineupArchetypes(userLineup);
              const userReboundResult = attackerArchetypeSummary.allResults.find(r => r.id === "rebound");
              const userReboundLevel = userReboundResult ? userReboundResult.level : 0;

              let glassStrikeTriggered = false;
              let glassStrikeBoost = 0;
              if (userReboundLevel > 0) {
                glassStrikeTriggered = rollSpecialMechanic(userLineup, "GLASS_STRIKE_REBOUND", draft.playerStamina);
                if (glassStrikeTriggered) {
                  glassStrikeBoost = getGlassStrikeOrebBoost(userReboundLevel);
                }
              }

              const orebChance = calculateOffensiveReboundChance(attReb, defReb, glassScale, barrierScale, glassStrikeBoost);
              if (paintBarrier) skillLog(ctx, `Paint Barrier fights off the second-chance lane`, false);
              if (Math.random() < orebChance) {
                const reb = pickRebounder(ctx, userLineup);
                awardReb(ctx, reb, 'OREB');
                ctx.eventIndicator = { playerId: reb.id, type: 'OREB' };
                draft.events.push(makeEvent(newQuarter, newClock, `${reb.name} gets the offensive rebound: second chance!`, true));
                if (glassTouch) skillLog(ctx, `${reb.name}'s Glass Touch creates second-chance pressure`, true);
                if (glassStrikeTriggered) {
                  skillLog(ctx, `${reb.name}'s Glass Strike crashes the glass with disciplined timing`, true);
                }
                ctx.nextPossessionTeam = 'user';
                ctx.nextLastPlayCategory = 'miss_oreb';
                // OREB SECOND-CHANCE
                const sc2 = userLineup[Math.floor(Math.random() * userLineup.length)];
                ensureStats(ctx, sc2.id); ensureForm(ctx, sc2.id);
                let orebFoulFired = false;
                if (!ctx.nonShootingFoulToFT) {
                  const orebFoulChance = 0.086 * getFoulStamMod(avgStamina(aiLineup, draft.playerStamina));
                  if (Math.random() < orebFoulChance) {
                    orebFoulFired = true;
                    const orebCommitter = pickFoulCommitter(ctx, aiLineup);
                    ensureStats(ctx, orebCommitter.id); ensureForm(ctx, orebCommitter.id);
                    draft.playerStats[orebCommitter.id].FOL = (draft.playerStats[orebCommitter.id].FOL ?? 0) + 1;
                    draft.formRating[orebCommitter.id] = clampForm(draft.formRating[orebCommitter.id] - 0.02);
                    draft.teamFouls.ai[newQuarter - 1] += 1;

                    draft.isInBonus.user = draft.teamFouls.user[newQuarter - 1] >= 5;
                    draft.isInBonus.ai = draft.teamFouls.ai[newQuarter - 1] >= 5;

                    ensureForm(ctx, sc2.id); draft.formRating[sc2.id] = clampForm(draft.formRating[sc2.id] + 0.02);
                    draft.events.push(makeEvent(newQuarter, newClock, `Foul on the putback: ${orebCommitter.name} (${draft.playerStats[orebCommitter.id].FOL}/5). ${sc2.name} to the line for 2`, true));
                    ctx.eventIndicator = { playerId: orebCommitter.id, type: 'FOL' };
                    runFTSequence(ctx, sc2.id, sc2.name, 2, false, orebCommitter.name, draft.playerStats[orebCommitter.id].FOL, true);
                    ctx.nextPossessionTeam = 'ai';
                    ctx.nextLastPlayCategory = 'foul_reset';
                  }
                }
                if (!orebFoulFired) {
                  const stm2 = getPlayerStaminaMod(sc2, draft.playerStamina[sc2.id]);
                  const decisionWeightMod = 1.0 + ((goodSubRatio - 0.5) * 0.05);
                  const fc2 = calculateUserPutbackChance({
                    offEff: eUO,
                    defEff: eAD,
                    teamAvgStamina: userAvg,
                    momentumBonus,
                    playerStaminaMod: stm2,
                    formRating: draft.formRating[sc2.id],
                    decisionWeightMod,
                    glassTouchActive: !!glassTouch,
                    glassStrikeBoost: glassStrikeTriggered ? getGlassStrikePutbackBoost(userReboundLevel) : 0
                  });
                  if (Math.random() < fc2) {
                    const p2 = Math.random() < 0.24 ? 3 : 2;
                    trackShotStamina(ctx, sc2.id, p2 === 3 ? 'catchAndShoot' : 'putBack', p2 === 3, 'make', 'oreb');
                    ctx.pointsScored = p2;
                    draft.playerStats[sc2.id].PTS += p2;
                    draft.playerStats[sc2.id].FGM = (draft.playerStats[sc2.id].FGM ?? 0) + 1;
                    draft.playerStats[sc2.id].FGA = (draft.playerStats[sc2.id].FGA ?? 0) + 1;
                    if (p2 === 3) { draft.playerStats[sc2.id].TPM = (draft.playerStats[sc2.id].TPM ?? 0) + 1; draft.playerStats[sc2.id].TPA = (draft.playerStats[sc2.id].TPA ?? 0) + 1; }
                    ctx.activePlayerId = sc2.id;
                    draft.events.push(makeEvent(newQuarter, newClock, `Second chance: ${sc2.name} converts! (+${p2})`, true, p2, sc2.id));
                    ctx.nextPossessionTeam = 'ai';
                    ctx.nextLastPlayCategory = 'made_shot';
                  } else {
                    trackShotStamina(ctx, sc2.id, 'putBack', false, 'miss', 'oreb');
                    draft.playerStats[sc2.id].FGA = (draft.playerStats[sc2.id].FGA ?? 0) + 1;
                    const dreb = pickRebounder(ctx, aiLineup);
                    awardReb(ctx, dreb, 'DREB');
                    ctx.eventIndicator = { playerId: dreb.id, type: 'REB' };
                    draft.events.push(makeEvent(newQuarter, newClock, `${reb.name} with the board: My Team gets another look but can't convert`, true));
                    draft.events.push(makeEvent(newQuarter, newClock, `${dreb.name} pulls down the board`, false));
                    ctx.nextPossessionTeam = 'ai';
                    ctx.nextLastPlayCategory = 'miss_dreb';
                  }
                }
              } else {
                const dreb = pickRebounder(ctx, aiLineup);
                awardReb(ctx, dreb, 'DREB');
                ctx.eventIndicator = { playerId: dreb.id, type: 'REB' };
                draft.events.push(makeEvent(newQuarter, newClock, `${dreb.name} pulls down the board`, false));
                ctx.nextPossessionTeam = 'ai';
                ctx.nextLastPlayCategory = 'miss_dreb';
              }
            }
          }
        }
      }
    }
  }
}
