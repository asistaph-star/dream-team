import { Player } from '../../types/player';
import { PossessionContext } from './possessionContext';
import {
  FOUL_W,
  getFoulStaminaModifier,
  calculateFreeThrowChance
} from '../foulSystem';
import { getFreeThrowRating } from '../../utils/playerIdentity';
import {
  getPlayerStaminaMod,
  getStaminaMod,
  clampForm
} from '../../utils/matchTypes';
import { makeEvent } from '../../utils/matchNarrative';
import { ensurePlayerStatsExists } from './playerStatMutations';
import { ensureFormExists } from './momentumFormResolver';
import { pickRebounder, awardReb } from './possessionHelpers';

const ensureStats = (ctx: PossessionContext, id: string) => ensurePlayerStatsExists(ctx.draft, id);
const ensureForm = (ctx: PossessionContext, id: string) => ensureFormExists(ctx.draft, id);

export const pickFoulCommitter = (ctx: PossessionContext, lineup: Player[]): Player => {
  const eligible = lineup.filter(p => (ctx.draft.playerStats[p.id]?.FOL ?? 0) < 4);
  const pool = eligible.length > 0 ? eligible : lineup;
  const ws = pool.map(p => (FOUL_W[p.position] || 1.0) * (1.0 / (p.defense / 100)));
  const tw = ws.reduce((s, w) => s + w, 0);
  let r = Math.random() * tw;
  for (let i = 0; i < pool.length; i++) {
    r -= ws[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
};

export const getFTChance = (ctx: PossessionContext, shooterId: string): number => {
  const shooter = ctx.userLineup.find(p => p.id === shooterId) || ctx.aiLineup.find(p => p.id === shooterId);
  const ftRating = shooter ? getFreeThrowRating(shooter) : 75;
  const stm = shooter
    ? getPlayerStaminaMod(shooter, ctx.draft.playerStamina[shooterId])
    : getStaminaMod(ctx.draft.playerStamina[shooterId] ?? 100);
  const formRating = ctx.draft.formRating[shooterId] ?? 1.0;
  const shooterIsAway = ctx.userIsHome
    ? ctx.aiLineup.some(p => p.id === shooterId)   // user is home → AI is away
    : ctx.userLineup.some(p => p.id === shooterId); // AI is home → user is away

  return calculateFreeThrowChance(
    ftRating,
    stm,
    formRating,
    ctx.clutchSituation.active,
    ctx.clutchSituation.intensity,
    shooterIsAway,
    ctx.homeCourt.crowdEnergy,
    shooter?.rarity
  );
};

export const runFTSequence = (
  ctx: PossessionContext,
  shooterId: string,
  shooterName: string,
  totalShots: number,
  isAnd1: boolean,
  committerName: string,
  committerFouls: number,
  isUserTeam: boolean
) => {
  const results: ('make' | 'miss')[] = [];
  const ftChance = getFTChance(ctx, shooterId);
  ensureStats(ctx, shooterId);
  ensureForm(ctx, shooterId);

  for (let i = 0; i < totalShots; i++) {
    if (Math.random() < ftChance) {
      results.push('make');
      ctx.draft.playerStats[shooterId].FTM += 1;
      ctx.draft.playerStats[shooterId].PTS += 1;
      ctx.draft.formRating[shooterId] = clampForm(ctx.draft.formRating[shooterId] + 0.02);
    } else {
      results.push('miss');
      ctx.draft.formRating[shooterId] = clampForm(ctx.draft.formRating[shooterId] - 0.025);
      // Clutch FT miss extra sting (Layer 5)
      if (ctx.clutchSituation.active && i === totalShots - 1) {
        ctx.draft.formRating[shooterId] = clampForm(ctx.draft.formRating[shooterId] - 0.04);
      }
    }
    ctx.draft.playerStats[shooterId].FTA += 1;
  }

  const ftm = results.filter(r => r === 'make').length;
  let summaryEvent;
  if (ftm === totalShots) {
    summaryEvent = makeEvent(ctx.newQuarter, ctx.newClock, `${shooterName} perfect from the line (${ftm}/${totalShots})`, isUserTeam);
  } else if (ftm === 0 && totalShots >= 2) {
    summaryEvent = makeEvent(ctx.newQuarter, ctx.newClock, `${shooterName} missed from the stripe (0/${totalShots})`, isUserTeam);
  } else {
    summaryEvent = makeEvent(ctx.newQuarter, ctx.newClock, `${shooterName} ${ftm}/${totalShots} from the line`, isUserTeam);
  }
  summaryEvent.isHiddenDuringFT = true;
  ctx.draft.events.push(summaryEvent);

  // Last FT missed & not And-1 → DREB
  if (results[results.length - 1] === 'miss' && !isAnd1) {
    const defLineup = isUserTeam ? ctx.aiLineup : ctx.userLineup;
    const dreb = pickRebounder(ctx, defLineup);
    awardReb(ctx, dreb, 'DREB');
    ctx.eventIndicator = { playerId: dreb.id, type: 'REB' };
    const rebEvent = makeEvent(ctx.newQuarter, ctx.newClock, `${dreb.name} grabs the board off the miss`, !isUserTeam);
    rebEvent.isHiddenDuringFT = true;
    ctx.draft.events.push(rebEvent);
  }

  ctx.ftSequenceResult = {
    shooterId,
    shooterName,
    totalShots,
    isAnd1,
    results,
    foulCommitterName: committerName,
    foulCommitterFouls: committerFouls,
    isUserTeam,
  };

  if (ftm > 0) {
    ctx.pointsScored += ftm;
    ctx.activePlayerId = shooterId;
  }
};
