import { Player } from '../../types/player';
import { PossessionContext } from './possessionContext';
import { REB_W } from '../reboundSystem';
import { ensurePlayerStatsExists } from './playerStatMutations';
import { ensureFormExists } from './momentumFormResolver';
import {
  clampForm,
  avgStamina,
  getPlayerStaminaMod
} from '../../utils/matchTypes';
import {
  rollBaseSkill,
  rollSpecialMechanic,
  hasBaseSkill
} from '../../skills/skillResolver';
import {
  calculateGlassScale,
  calculateBarrierScale,
  calculateOffensiveReboundChance,
  calculateTeamReboundScore
} from '../reboundSystem';
import { resolveLineupArchetypes } from '../../lineup/lineupArchetypeResolver';
import { getGlassStrikeOrebBoost, getGlassStrikePutbackBoost } from '../matchHelpers';
import { makeEvent } from '../../utils/matchNarrative';
import { getFoulStaminaModifier } from '../foulSystem';
import { calculateUserPutbackChance, calculateAiPutbackChance } from '../shotResolution';
import { logSkillTrigger } from './eventLogBuilder';
import { pickFoulCommitter, runFTSequence } from './foulResolver';
import { getReboundRating } from '../../utils/playerIdentity';

const ensureStats = (ctx: PossessionContext, id: string) => ensurePlayerStatsExists(ctx.draft, id);
const ensureForm = (ctx: PossessionContext, id: string) => ensureFormExists(ctx.draft, id);
const skillLog = (ctx: PossessionContext, text: string, isUserTeam: boolean) => logSkillTrigger(ctx.draft, text, isUserTeam);
const getFoulStamMod = (avg: number) => getFoulStaminaModifier(avg);

export const pickRebounder = (ctx: PossessionContext, lineup: Player[]): Player => {
  const ws = lineup.map(p => (REB_W[p.position] || 1.0) * getReboundRating(p));
  const tw = ws.reduce((s, w) => s + w, 0);
  let r = Math.random() * tw;
  for (let i = 0; i < lineup.length; i++) {
    r -= ws[i];
    if (r <= 0) return lineup[i];
  }
  return lineup[lineup.length - 1];
};

export const awardReb = (ctx: PossessionContext, p: Player, type: 'OREB' | 'DREB') => {
  ensureStats(ctx, p.id);
  if (type === 'OREB') {
    ctx.draft.playerStats[p.id].OREB = (ctx.draft.playerStats[p.id].OREB ?? 0) + 1;
    ensureForm(ctx, p.id);
    ctx.draft.formRating[p.id] = clampForm(ctx.draft.formRating[p.id] + 0.015);
  } else {
    ctx.draft.playerStats[p.id].DREB = (ctx.draft.playerStats[p.id].DREB ?? 0) + 1;
    ensureForm(ctx, p.id);
    ctx.draft.formRating[p.id] = clampForm(ctx.draft.formRating[p.id] + 0.01);
  }
  ctx.draft.playerStats[p.id].REB = (ctx.draft.playerStats[p.id].OREB ?? 0) + (ctx.draft.playerStats[p.id].DREB ?? 0);
  ctx.actionWorkloadRebounderId = p.id;
};

export const resolveUserRebound = (ctx: PossessionContext) => {
  const { userLineup, aiLineup, draft, newQuarter, newClock } = ctx;
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
      const userAvg = avgStamina(userLineup, draft.playerStamina);
      const decisionWeightMod = 1.0 + ((ctx.goodSubRatio - 0.5) * 0.05);
      const fc2 = calculateUserPutbackChance({
        offEff: ctx.eUO,
        defEff: ctx.eAD,
        teamAvgStamina: userAvg,
        momentumBonus: ctx.momentumBonus,
        playerStaminaMod: stm2,
        formRating: draft.formRating[sc2.id],
        decisionWeightMod,
        glassTouchActive: !!glassTouch,
        glassStrikeBoost: glassStrikeTriggered ? getGlassStrikePutbackBoost(userReboundLevel) : 0
      });
      if (Math.random() < fc2) {
        const p2 = Math.random() < 0.24 ? 3 : 2;
        ctx.shotStaminaAttempts.push({ playerId: sc2.id, shotType: p2 === 3 ? 'catchAndShoot' : 'putBack', is3PT: p2 === 3, outcome: 'make', context: 'oreb' });
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
        ctx.shotStaminaAttempts.push({ playerId: sc2.id, shotType: 'putBack', is3PT: false, outcome: 'miss', context: 'oreb' });
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
};

export const resolveAiRebound = (ctx: PossessionContext) => {
  const { userLineup, aiLineup, draft, newQuarter, newClock, aiTeamObj } = ctx;
  const attReb = calculateTeamReboundScore(aiLineup, draft.playerStamina);
  const defReb = calculateTeamReboundScore(userLineup, draft.playerStamina);
  const glassTouch = rollBaseSkill(aiLineup, "Glass Touch", draft.playerStamina);
  const paintBarrier = rollBaseSkill(userLineup, "Paint Barrier", draft.playerStamina);
  const glassScale = glassTouch
    ? calculateGlassScale(aiLineup.filter(p => hasBaseSkill(p, "Glass Touch")))
    : 0;
  const barrierScale = paintBarrier
    ? calculateBarrierScale(userLineup.filter(p => hasBaseSkill(p, "Paint Barrier")))
    : 0;

  const attackerArchetypeSummary = resolveLineupArchetypes(aiLineup);
  const aiReboundResult = attackerArchetypeSummary.allResults.find(r => r.id === "rebound");
  const aiReboundLevel = aiReboundResult ? aiReboundResult.level : 0;

  let glassStrikeTriggered = false;
  let glassStrikeBoost = 0;
  if (aiReboundLevel > 0) {
    glassStrikeTriggered = rollSpecialMechanic(aiLineup, "GLASS_STRIKE_REBOUND", draft.playerStamina);
    if (glassStrikeTriggered) {
      glassStrikeBoost = getGlassStrikeOrebBoost(aiReboundLevel);
    }
  }

  const orebChance = calculateOffensiveReboundChance(attReb, defReb, glassScale, barrierScale, glassStrikeBoost);
  if (paintBarrier) skillLog(ctx, `Paint Barrier fights off the second-chance lane`, true);
  if (Math.random() < orebChance) {
    const reb = pickRebounder(ctx, aiLineup);
    awardReb(ctx, reb, 'OREB');
    ctx.eventIndicator = { playerId: reb.id, type: 'OREB' };
    draft.events.push(makeEvent(newQuarter, newClock, `${reb.name} gets the offensive rebound: second chance!`, false));
    if (glassTouch) skillLog(ctx, `${reb.name}'s Glass Touch creates second-chance pressure`, false);
    if (glassStrikeTriggered) {
      skillLog(ctx, `${reb.name}'s Glass Strike crashes the glass with disciplined timing`, false);
    }
    ctx.nextPossessionTeam = 'ai';
    ctx.nextLastPlayCategory = 'miss_oreb';
    const sc2 = aiLineup[Math.floor(Math.random() * aiLineup.length)];
    ensureStats(ctx, sc2.id); ensureForm(ctx, sc2.id);
    let orebFoulFired = false;
    if (!ctx.nonShootingFoulToFT) {
      const orebFoulChance = 0.086 * getFoulStamMod(avgStamina(userLineup, draft.playerStamina));
      if (Math.random() < orebFoulChance) {
        orebFoulFired = true;
        const orebC = pickFoulCommitter(ctx, userLineup);
        ensureStats(ctx, orebC.id); ensureForm(ctx, orebC.id);
        draft.playerStats[orebC.id].FOL = (draft.playerStats[orebC.id].FOL ?? 0) + 1;
        draft.formRating[orebC.id] = clampForm(draft.formRating[orebC.id] - 0.02);
        draft.teamFouls.user[newQuarter - 1] += 1;

        draft.isInBonus.user = draft.teamFouls.user[newQuarter - 1] >= 5;
        draft.isInBonus.ai = draft.teamFouls.ai[newQuarter - 1] >= 5;

        ensureForm(ctx, sc2.id); draft.formRating[sc2.id] = clampForm(draft.formRating[sc2.id] + 0.02);
        draft.events.push(makeEvent(newQuarter, newClock, `Foul on the putback: ${orebC.name} (${draft.playerStats[orebC.id].FOL}/5). ${sc2.name} to the line for 2`, false));
        ctx.eventIndicator = { playerId: orebC.id, type: 'FOL' };
        runFTSequence(ctx, sc2.id, sc2.name, 2, false, orebC.name, draft.playerStats[orebC.id].FOL, false);
        ctx.nextPossessionTeam = 'user';
        ctx.nextLastPlayCategory = 'foul_reset';
      }
    }
    if (!orebFoulFired) {
      const stm2 = getPlayerStaminaMod(sc2, draft.playerStamina[sc2.id]);
      const fc2 = calculateAiPutbackChance({
        offEff: ctx.eAO,
        defEff: ctx.eUD,
        teamAvgStamina: avgStamina(aiLineup, draft.playerStamina),
        playerStaminaMod: stm2,
        formRating: draft.formRating[sc2.id],
        glassTouchActive: !!glassTouch,
        glassStrikeBoost: glassStrikeTriggered ? getGlassStrikePutbackBoost(aiReboundLevel) : 0
      });
      if (Math.random() < fc2) {
        const p2 = Math.random() < 0.24 ? 3 : 2;
        ctx.shotStaminaAttempts.push({ playerId: sc2.id, shotType: p2 === 3 ? 'catchAndShoot' : 'putBack', is3PT: p2 === 3, outcome: 'make', context: 'oreb' });
        ctx.pointsScored = p2;
        draft.playerStats[sc2.id].PTS += p2;
        draft.playerStats[sc2.id].FGM = (draft.playerStats[sc2.id].FGM ?? 0) + 1;
        draft.playerStats[sc2.id].FGA = (draft.playerStats[sc2.id].FGA ?? 0) + 1;
        if (p2 === 3) { draft.playerStats[sc2.id].TPM = (draft.playerStats[sc2.id].TPM ?? 0) + 1; draft.playerStats[sc2.id].TPA = (draft.playerStats[sc2.id].TPA ?? 0) + 1; }
        ctx.activePlayerId = sc2.id;
        ctx.scoringTeamIsUser = false;
        draft.events.push(makeEvent(newQuarter, newClock, `Second chance: ${sc2.name} converts! (+${p2})`, false, p2, sc2.id));
        ctx.nextPossessionTeam = 'user';
        ctx.nextLastPlayCategory = 'made_shot';
      } else {
        ctx.shotStaminaAttempts.push({ playerId: sc2.id, shotType: 'putBack', is3PT: false, outcome: 'miss', context: 'oreb' });
        draft.playerStats[sc2.id].FGA = (draft.playerStats[sc2.id].FGA ?? 0) + 1;
        const dreb = pickRebounder(ctx, userLineup);
        awardReb(ctx, dreb, 'DREB');
        ctx.eventIndicator = { playerId: dreb.id, type: 'REB' };
        draft.events.push(makeEvent(newQuarter, newClock, `${reb.name} with the board: ${aiTeamObj.name} gets another look but can't convert`, false));
        draft.events.push(makeEvent(newQuarter, newClock, `${dreb.name} pulls down the board`, true));
        ctx.nextPossessionTeam = 'user';
        ctx.nextLastPlayCategory = 'miss_dreb';
      }
    }
  } else {
    const dreb = pickRebounder(ctx, userLineup);
    awardReb(ctx, dreb, 'DREB');
    ctx.eventIndicator = { playerId: dreb.id, type: 'REB' };
    draft.events.push(makeEvent(newQuarter, newClock, `${dreb.name} pulls down the board`, true));
    ctx.nextPossessionTeam = 'user';
    ctx.nextLastPlayCategory = 'miss_dreb';
  }
};
