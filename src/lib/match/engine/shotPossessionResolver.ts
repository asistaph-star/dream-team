import { Player } from '../../types/player';
import { PossessionContext } from './possessionContext';
import { ShotType } from '../../utils/shotEngine';
import { ensurePlayerStatsExists } from './playerStatMutations';
import { ensureFormExists } from './momentumFormResolver';
import {
  clampForm,
  avgStamina,
  getPlayerStaminaMod,
  getShotZoneModifier
} from '../../utils/matchTypes';
import {
  getHomeCourtBoost,
  getAwayPenalty,
  calculateFinalScoringChance,
  calculateAndOneChance
} from '../shotResolution';
import {
  getShotIdentityEfficiencyAdjustment,
  getOnBallDefenseRating,
  getBasketballIQRating,
  getHustleRating,
  getAssistRating,
  getFinishingRating
} from '../../utils/playerIdentity';
import { getIndividualThreePointShotMod } from '../matchHelpers';
import {
  calculateBasketballIQShotQualityModifier,
  calculateHustleContestModifier
} from '../attributeGameplayEffects';
import {
  rollBaseSkill,
  rollSpecialMechanic,
  hasBaseSkill,
  addMark
} from '../../skills/skillResolver';
import { recoverSkillStamina } from './skillHooks';
import {
  makeEvent,
  clutchScoreText,
  scoreText,
  clutchMissText,
  missText
} from '../../utils/matchNarrative';
import { pickFoulCommitter, runFTSequence, getAssistChance, getClutchMod, staminaPct, getUsageMod } from './possessionHelpers';

const ensureStats = (ctx: PossessionContext, id: string) => ensurePlayerStatsExists(ctx.draft, id);
const ensureForm = (ctx: PossessionContext, id: string) => ensureFormExists(ctx.draft, id);

const MAX_3PT_POSITIVE_ADDITIVE_BONUS = 0.08;

export function resolveUserShotAttempt(
  ctx: PossessionContext,
  scorer: Player,
  primaryDefender: Player | undefined,
  shotType: ShotType,
  is3PT: boolean,
  sfChance: number,
  finalChance: number,
  shooterStamMod: number,
  skillShotBonus: number,
  matchupBonus: number,
  brokenPlayRescued: boolean
) {
  const { draft, newQuarter, newClock, userLineup, aiLineup, userIsHome, homeCourt, clutchSituation, pace, goodSubRatio, currentOff } = ctx;

  // ROLL 2: SHOOTING FOUL
  const MAX_SHOOTING_FOUL_CHANCE = 0.28;
  const cappedSfChance = Math.min(MAX_SHOOTING_FOUL_CHANCE, sfChance);
  if (Math.random() < cappedSfChance) {
    ctx.shootingFoulOccurred = true;
    ctx.shotStaminaAttempts.push({ playerId: scorer.id, shotType, is3PT, outcome: 'foul' });
    if (primaryDefender) ctx.defensiveStaminaAttempts.push({ playerId: primaryDefender.id, shotType, is3PT, outcome: 'foul' });
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

  // ROLL 3: MAKE/MISS
  if (!ctx.blockOccurred && !ctx.shootingFoulOccurred) {
    const clutchMod = getClutchMod(ctx, scorer);
    const zoneMod = getShotZoneModifier(shotType, stateDefStrategy(ctx, false));
    const pressMod = (stateDefStrategy(ctx, false) === 'Full-Court Press') ? getShotZoneModifier(shotType, 'Full-Court Press') : 1.0;
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
      isBrokenPlayRescue: brokenPlayRescued
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
      const opponentDef = stateDefStrategy(ctx, false);
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
      ctx.shotStaminaAttempts.push({ playerId: scorer.id, shotType, is3PT, outcome: 'make' });
      if (primaryDefender) ctx.defensiveStaminaAttempts.push({ playerId: primaryDefender.id, shotType, is3PT, outcome: 'make' });
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
        : scoreText(scorer, shotType, currentOff, ctx.momentumBonus > 1.0);
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
          ctx.draft.events.push(makeEvent(newQuarter, newClock, `${a.name}'s Connector Hub restores ${scorer.name}'s stamina`, true));
        }
        if (rollBaseSkill(userLineup, "Share Rhythm", draft.playerStamina)) {
          const shareRhythmHolders = userLineup.filter(p => hasBaseSkill(p, "Share Rhythm"));
          const maxAssistRating = Math.max(...shareRhythmHolders.map(p => getAssistRating(p)), 50);
          const shareRhythmScale = 0.85 + (maxAssistRating / 100) * 0.30;
          userLineup.forEach(p => recoverSkillStamina(draft, p, 8 * shareRhythmScale));
          ctx.draft.events.push(makeEvent(newQuarter, newClock, `${a.name}'s Share Rhythm steadies the lineup`, true));
        }
        if (rollSpecialMechanic(userLineup, "COURT_VISION_RHYTHM_BOOST", draft.playerStamina, (h) => {
          const chainPassIdentity = getAssistRating(h);
          return 0.90 + (chainPassIdentity / 100) * 0.20;
        })) {
          const debtTarget = [...aiLineup].sort((a_p, b_p) => (draft.playerStamina[a_p.id] ?? 100) - (draft.playerStamina[b_p.id] ?? 100))[0];
          draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, debtTarget.id, "Hooked", "Court Vision Engine", 3);
          ctx.draft.events.push(makeEvent(newQuarter, newClock, `Court Vision Engine places Debt on ${debtTarget.name}`, true));
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
      ctx.shotStaminaAttempts.push({ playerId: scorer.id, shotType, is3PT, outcome: 'miss' });
      if (primaryDefender) ctx.defensiveStaminaAttempts.push({ playerId: primaryDefender.id, shotType, is3PT, outcome: 'miss' });
      const missEvtText = clutchSituation.active ? clutchMissText(scorer, clutchSituation) : missText(scorer, shotType, currentOff);
      draft.events.push(makeEvent(newQuarter, newClock, missEvtText, true, 0, scorer.id));
      draft.playerStats[scorer.id].FGA = (draft.playerStats[scorer.id].FGA ?? 0) + 1;
      if (is3PT) draft.playerStats[scorer.id].TPA = (draft.playerStats[scorer.id].TPA ?? 0) + 1;
      if (clutchSituation.active) {
        const formPenalty = clutchSituation.intensity === 'high' ? -0.04 : -0.02;
        draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + formPenalty);
      }
    }
  }
}

export function resolveAiShotAttempt(
  ctx: PossessionContext,
  scorer: Player,
  primaryDefender: Player | undefined,
  shotType: ShotType,
  is3PT: boolean,
  sfChance: number,
  finalChance: number,
  aiScorerStamMod: number,
  aiSkillShotBonus: number
) {
  const { draft, newQuarter, newClock, userLineup, aiLineup, userIsHome, homeCourt, clutchSituation, pace, state } = ctx;

  const MAX_SHOOTING_FOUL_CHANCE = 0.28;
  const cappedSfChance = Math.min(MAX_SHOOTING_FOUL_CHANCE, sfChance);
  if (Math.random() < cappedSfChance) {
    ctx.shootingFoulOccurred = true;
    ctx.shotStaminaAttempts.push({ playerId: scorer.id, shotType, is3PT, outcome: 'foul' });
    if (primaryDefender) ctx.defensiveStaminaAttempts.push({ playerId: primaryDefender.id, shotType, is3PT, outcome: 'foul' });
    const committer = pickFoulCommitter(ctx, userLineup);
    ensureStats(ctx, committer.id); ensureForm(ctx, committer.id);
    draft.playerStats[committer.id].FOL = (draft.playerStats[committer.id].FOL ?? 0) + 1;
    draft.formRating[committer.id] = clampForm(draft.formRating[committer.id] - 0.02);
    draft.teamFouls.user[newQuarter - 1] += 1;

    draft.isInBonus.user = draft.teamFouls.user[newQuarter - 1] >= 5;
    draft.isInBonus.ai = draft.teamFouls.ai[newQuarter - 1] >= 5;

    ensureForm(ctx, scorer.id); draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + 0.02);
    const ftCount = is3PT ? 3 : 2;
    draft.events.push(makeEvent(newQuarter, newClock, `Shooting foul on ${committer.name} (${draft.playerStats[committer.id].FOL}/5): ${scorer.name} to the line for ${ftCount}`, false));
    ctx.eventIndicator = { playerId: committer.id, type: 'FOL' };
    runFTSequence(ctx, scorer.id, scorer.name, ftCount, false, committer.name, draft.playerStats[committer.id].FOL, false);
    ctx.nextPossessionTeam = 'user';
    ctx.nextLastPlayCategory = 'foul_reset';
  }

  if (!ctx.blockOccurred && !ctx.shootingFoulOccurred) {
    const aiClutchMod = getClutchMod(ctx, scorer);
    const aiHomeAdj = userIsHome ? -getAwayPenalty(scorer.rarity, homeCourt.crowdEnergy, homeCourt.rallyMode) : getHomeCourtBoost(scorer.rarity, homeCourt.crowdEnergy, homeCourt.rallyMode);
    const aiShotValueDifficulty = is3PT ? -0.095 : 0;
    const aiRealEfficiencyAdj = getShotIdentityEfficiencyAdjustment(scorer, is3PT, shotType);

    const aiAdditiveBonusSum = aiHomeAdj + aiSkillShotBonus + aiRealEfficiencyAdj;
    const aiCappedAdditiveBonus = (is3PT && aiAdditiveBonusSum > 0)
      ? Math.min(aiAdditiveBonusSum, MAX_3PT_POSITIVE_ADDITIVE_BONUS)
      : aiAdditiveBonusSum;

    const individual3ptMod = is3PT ? getIndividualThreePointShotMod(scorer.shooting) : 1.0;

    const iqContext = {
      isLateClock: pace === 'late_clock',
      isLowStamina: staminaPct(ctx, scorer) <= 0.65,
      isHeavyContest: primaryDefender !== undefined && getOnBallDefenseRating(primaryDefender) >= 80,
      isBrokenPlayRescue: false
    };
    const basketballIQPressureMod = calculateBasketballIQShotQualityModifier(getBasketballIQRating(scorer), iqContext);
    const hustleContestMod = primaryDefender ? calculateHustleContestModifier(getHustleRating(primaryDefender)) : 1.0;

    const aiFinalChance = calculateFinalScoringChance({
      finalChance,
      staminaMod: aiScorerStamMod,
      formRating: draft.formRating[scorer.id],
      clutchMod: aiClutchMod,
      effectiveZoneMod: 1.0,
      effectivePressMod: 1.0,
      usageMod: 1.0,
      individual3ptMod,
      additiveBonus: aiCappedAdditiveBonus,
      difficultyMod: aiShotValueDifficulty,
      decisionWeightMod: 1.0,
      maxCeilingLimit: 0.85,
      basketballIQPressureMod,
      hustleContestMod
    });
    const isSuccess = Math.random() < aiFinalChance;
    if (is3PT) {
      const baseHalfWidth = 2.0;
      const ratingBoost = Math.max(-1.5, ((scorer.shooting ?? 80) - 80) * 0.08);
      const rarityBoost = scorer.rarity === 'Mythic' ? 1.2 : (scorer.rarity === 'Legendary' ? 0.7 : (scorer.rarity === 'Epic' ? 0.3 : 0));
      const stratBoost = state.aiOffStrategy === 'Run & Gun' ? 0.8 : (state.aiOffStrategy === 'Pace & Space' ? 0.4 : 0);
      const opponentDef = ctx.currentDef;
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

      draft.activeShotMeter = {
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
      ctx.pointsScored = is3PT ? 3 : 2;
      draft.playerStats[scorer.id].PTS += ctx.pointsScored;
      draft.playerStats[scorer.id].FGM = (draft.playerStats[scorer.id].FGM ?? 0) + 1;
      draft.playerStats[scorer.id].FGA = (draft.playerStats[scorer.id].FGA ?? 0) + 1;
      if (is3PT) { draft.playerStats[scorer.id].TPM = (draft.playerStats[scorer.id].TPM ?? 0) + 1; draft.playerStats[scorer.id].TPA = (draft.playerStats[scorer.id].TPA ?? 0) + 1; }
      const aiEvtText = clutchSituation.active ? clutchScoreText(scorer, shotType, clutchSituation) : scoreText(scorer, shotType, state.aiOffStrategy, false);
      draft.events.push(makeEvent(newQuarter, newClock, aiEvtText, false, ctx.pointsScored, scorer.id));
      if (clutchSituation.active) { const fb = clutchSituation.intensity === 'high' ? 0.04 : 0.02; draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + fb); }
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
          if (hasBaseSkill(a, "Connector Hub") && rollBaseSkill(aiLineup, "Connector Hub", draft.playerStamina)) {
            const connectorScale = 0.85 + (getAssistRating(a) / 100) * 0.30;
            recoverSkillStamina(draft, scorer, 35 * connectorScale);
            ctx.draft.events.push(makeEvent(newQuarter, newClock, `${a.name}'s Connector Hub restores ${scorer.name}'s stamina`, false));
          }
          if (rollBaseSkill(aiLineup, "Share Rhythm", draft.playerStamina)) {
            const shareRhythmHolders = aiLineup.filter(p => hasBaseSkill(p, "Share Rhythm"));
            const maxAssistRating = Math.max(...shareRhythmHolders.map(p => getAssistRating(p)), 50);
            const shareRhythmScale = 0.85 + (maxAssistRating / 100) * 0.30;
            aiLineup.forEach(p => recoverSkillStamina(draft, p, 8 * shareRhythmScale));
            ctx.draft.events.push(makeEvent(newQuarter, newClock, `${a.name}'s Share Rhythm steadies the lineup`, false));
          }
          if (rollSpecialMechanic(aiLineup, "COURT_VISION_RHYTHM_BOOST", draft.playerStamina, (h) => {
            const chainPassIdentity = getAssistRating(h);
            return 0.90 + (chainPassIdentity / 100) * 0.20;
          })) {
            const debtTarget = [...userLineup].sort((a_p, b_p) => (draft.playerStamina[a_p.id] ?? 100) - (draft.playerStamina[b_p.id] ?? 100))[0];
            draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, debtTarget.id, "Hooked", "Court Vision Engine", 3);
            ctx.draft.events.push(makeEvent(newQuarter, newClock, `Court Vision Engine places Debt on ${debtTarget.name}`, false));
          }
        }
      }
      ctx.nextPossessionTeam = 'user';
      ctx.nextLastPlayCategory = 'made_shot';
      if (!ctx.nonShootingFoulToFT) {
        const finishingRating = scorer && !is3PT ? getFinishingRating(scorer) : 50;
        const and1Chance = calculateAndOneChance(
          is3PT,
          avgStamina(userLineup, draft.playerStamina),
          finishingRating
        );
        if (Math.random() < and1Chance) {
          const and1C = pickFoulCommitter(ctx, userLineup);
          ensureStats(ctx, and1C.id);
          draft.playerStats[and1C.id].FOL = (draft.playerStats[and1C.id].FOL ?? 0) + 1;
          draft.teamFouls.user[newQuarter - 1] += 1;

          draft.isInBonus.user = draft.teamFouls.user[newQuarter - 1] >= 5;
          draft.isInBonus.ai = draft.teamFouls.ai[newQuarter - 1] >= 5;

          ensureForm(ctx, and1C.id); draft.formRating[and1C.id] = clampForm(draft.formRating[and1C.id] - 0.03);
          ensureForm(ctx, scorer.id); draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + 0.05);
          draft.events.push(makeEvent(newQuarter, newClock, `AND-1: ${scorer.name} scores through contact. One more from the line`, false));
          ctx.eventIndicator = { playerId: and1C.id, type: 'FOL' };
          runFTSequence(ctx, scorer.id, scorer.name, 1, true, and1C.name, draft.playerStats[and1C.id].FOL, false);
          ctx.nextLastPlayCategory = 'foul_reset';
        }
      }
    } else {
      ctx.shotStaminaAttempts.push({ playerId: scorer.id, shotType, is3PT, outcome: 'miss' });
      if (primaryDefender) ctx.defensiveStaminaAttempts.push({ playerId: primaryDefender.id, shotType, is3PT, outcome: 'miss' });
      const aiMissEvt = clutchSituation.active ? clutchMissText(scorer, clutchSituation) : `Strong defense forces ${scorer.name} to miss!`;
      draft.events.push(makeEvent(newQuarter, newClock, aiMissEvt, false, 0, scorer.id));
      draft.playerStats[scorer.id].FGA = (draft.playerStats[scorer.id].FGA ?? 0) + 1;
      if (is3PT) draft.playerStats[scorer.id].TPA = (draft.playerStats[scorer.id].TPA ?? 0) + 1;
      if (clutchSituation.active) { const fp = clutchSituation.intensity === 'high' ? -0.04 : -0.02; draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + fp); }
      ctx.nextPossessionTeam = 'user';
      ctx.nextLastPlayCategory = 'miss_dreb';
    }
  }
}

export function resolveAiBlitzShotAttempt(
  ctx: PossessionContext,
  scorer: Player,
  primaryDefender: Player | undefined,
  shotType: ShotType,
  is3PT: boolean,
  sfChance: number,
  finalChance: number,
  aiScorerStamMod: number
) {
  const { draft, newQuarter, newClock, userLineup, aiLineup, userIsHome, homeCourt, clutchSituation, pace, state } = ctx;

  const MAX_SHOOTING_FOUL_CHANCE = 0.28;
  const cappedSfChance = Math.min(MAX_SHOOTING_FOUL_CHANCE, sfChance);
  if (Math.random() < cappedSfChance) {
    ctx.shootingFoulOccurred = true;
    ctx.shotStaminaAttempts.push({ playerId: scorer.id, shotType, is3PT, outcome: 'foul' });
    if (primaryDefender) ctx.defensiveStaminaAttempts.push({ playerId: primaryDefender.id, shotType, is3PT, outcome: 'foul' });
    const committer = pickFoulCommitter(ctx, userLineup);
    ensureStats(ctx, committer.id); ensureForm(ctx, committer.id);
    draft.playerStats[committer.id].FOL = (draft.playerStats[committer.id].FOL ?? 0) + 1;
    draft.formRating[committer.id] = clampForm(draft.formRating[committer.id] - 0.02);
    draft.teamFouls.user[newQuarter - 1] += 1;

    draft.isInBonus.user = draft.teamFouls.user[newQuarter - 1] >= 5;
    draft.isInBonus.ai = draft.teamFouls.ai[newQuarter - 1] >= 5;

    ensureForm(ctx, scorer.id); draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + 0.02);
    const ftCount = is3PT ? 3 : 2;
    draft.events.push(makeEvent(newQuarter, newClock, `Shooting foul on ${committer.name} (${draft.playerStats[committer.id].FOL}/5): ${scorer.name} to the line for ${ftCount}`, false));
    ctx.eventIndicator = { playerId: committer.id, type: 'FOL' };
    runFTSequence(ctx, scorer.id, scorer.name, ftCount, false, committer.name, draft.playerStats[committer.id].FOL, false);
    ctx.nextPossessionTeam = 'user';
    ctx.nextLastPlayCategory = 'foul_reset';
  }

  if (!ctx.blockOccurred && !ctx.shootingFoulOccurred) {
    const aiBlitzClutchMod = getClutchMod(ctx, scorer);
    const aiBlitzHomeAdj = userIsHome
      ? -getAwayPenalty(scorer.rarity, homeCourt.crowdEnergy, homeCourt.rallyMode)
      : getHomeCourtBoost(scorer.rarity, homeCourt.crowdEnergy, homeCourt.rallyMode);
    const aiBlitzShotValueDifficulty = is3PT ? -0.095 : 0;
    const aiRealEfficiencyAdj = getShotIdentityEfficiencyAdjustment(scorer, is3PT, shotType);

    const aiSkillShotBonus = 0;
    const aiBlitzAdditiveBonusSum = aiBlitzHomeAdj + aiSkillShotBonus + aiRealEfficiencyAdj;
    const aiBlitzCappedAdditiveBonus = (is3PT && aiBlitzAdditiveBonusSum > 0)
      ? Math.min(aiBlitzAdditiveBonusSum, MAX_3PT_POSITIVE_ADDITIVE_BONUS)
      : aiBlitzAdditiveBonusSum;

    const individual3ptMod = is3PT ? getIndividualThreePointShotMod(scorer.shooting) : 1.0;

    const iqContext = {
      isLateClock: pace === 'late_clock',
      isLowStamina: staminaPct(ctx, scorer) <= 0.65,
      isHeavyContest: primaryDefender !== undefined && getOnBallDefenseRating(primaryDefender) >= 80,
      isBrokenPlayRescue: false
    };
    const basketballIQPressureMod = calculateBasketballIQShotQualityModifier(getBasketballIQRating(scorer), iqContext);
    const hustleContestMod = primaryDefender ? calculateHustleContestModifier(getHustleRating(primaryDefender)) : 1.0;

    const aiBlitzFinalChance = calculateFinalScoringChance({
      finalChance,
      staminaMod: aiScorerStamMod,
      formRating: draft.formRating[scorer.id],
      clutchMod: aiBlitzClutchMod,
      effectiveZoneMod: 1.0,
      effectivePressMod: 1.0,
      usageMod: 1.0,
      individual3ptMod,
      additiveBonus: aiBlitzCappedAdditiveBonus,
      difficultyMod: aiBlitzShotValueDifficulty,
      decisionWeightMod: 1.0,
      maxCeilingLimit: 0.80,
      basketballIQPressureMod,
      hustleContestMod
    });
    const isSuccess = Math.random() < aiBlitzFinalChance;
    if (is3PT) {
      const baseHalfWidth = 2.0;
      const ratingBoost = Math.max(-1.5, ((scorer.shooting ?? 80) - 80) * 0.08);
      const rarityBoost = scorer.rarity === 'Mythic' ? 1.2 : (scorer.rarity === 'Legendary' ? 0.7 : (scorer.rarity === 'Epic' ? 0.3 : 0));
      const stratBoost = state.aiOffStrategy === 'Run & Gun' ? 0.8 : (state.aiOffStrategy === 'Pace & Space' ? 0.4 : 0);
      const opponentDef = ctx.currentDef;
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

      draft.activeShotMeter = {
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
      ctx.shotStaminaAttempts.push({ playerId: scorer.id, shotType, is3PT, outcome: 'make' });
      if (primaryDefender) ctx.defensiveStaminaAttempts.push({ playerId: primaryDefender.id, shotType, is3PT, outcome: 'make' });
      ctx.pointsScored = is3PT ? 3 : 2;
      draft.playerStats[scorer.id].PTS += ctx.pointsScored;
      draft.playerStats[scorer.id].FGM = (draft.playerStats[scorer.id].FGM ?? 0) + 1;
      draft.playerStats[scorer.id].FGA = (draft.playerStats[scorer.id].FGA ?? 0) + 1;
      if (is3PT) { draft.playerStats[scorer.id].TPM = (draft.playerStats[scorer.id].TPM ?? 0) + 1; draft.playerStats[scorer.id].TPA = (draft.playerStats[scorer.id].TPA ?? 0) + 1; }
      const aiBlitzEvt = clutchSituation.active ? clutchScoreText(scorer, shotType, clutchSituation) : scoreText(scorer, shotType, state.aiOffStrategy, false);
      draft.events.push(makeEvent(newQuarter, newClock, aiBlitzEvt, false, ctx.pointsScored, scorer.id));
      if (clutchSituation.active) { const fb = clutchSituation.intensity === 'high' ? 0.04 : 0.02; draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + fb); }
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
      ctx.shotStaminaAttempts.push({ playerId: scorer.id, shotType, is3PT, outcome: 'miss' });
      if (primaryDefender) ctx.defensiveStaminaAttempts.push({ playerId: primaryDefender.id, shotType, is3PT, outcome: 'miss' });
      const aiBlitzMissEvt = clutchSituation.active ? clutchMissText(scorer, clutchSituation) : `Strong trap forces ${scorer.name} to miss!`;
      draft.events.push(makeEvent(newQuarter, newClock, aiBlitzMissEvt, false, 0, scorer.id));
      draft.playerStats[scorer.id].FGA = (draft.playerStats[scorer.id].FGA ?? 0) + 1;
      if (is3PT) draft.playerStats[scorer.id].TPA = (draft.playerStats[scorer.id].TPA ?? 0) + 1;
      if (clutchSituation.active) { const fp = clutchSituation.intensity === 'high' ? -0.04 : -0.02; draft.formRating[scorer.id] = clampForm(draft.formRating[scorer.id] + fp); }
      ctx.nextPossessionTeam = 'user';
      ctx.nextLastPlayCategory = 'miss_dreb';
    }
  }
}

function stateDefStrategy(ctx: PossessionContext, isAiOffense: boolean): string {
  return isAiOffense ? ctx.userDefStrategy : ctx.aiDefStrategy;
}
