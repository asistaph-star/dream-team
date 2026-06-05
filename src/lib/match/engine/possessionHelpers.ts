import { Player } from '../../types/player';
import { ShotType } from '../../utils/shotEngine';
import { PossessionContext } from './possessionContext';
import {
  getStealRating,
  getFreeThrowRating,
  getReboundRating,
  getBlockRating,
  getHandleRating,
  getAssistRating,
  getStaminaRating
} from '../../utils/playerIdentity';
import { REB_W } from '../reboundSystem';
import {
  FOUL_W,
  getFoulStaminaModifier,
  getClutchRatingByRarity,
  calculateFreeThrowChance
} from '../foulSystem';
import {
  getAssistChance as extGetAssistChance,
  getClutchMod as extGetClutchMod
} from '../shotResolution';
import {
  calculateBlockChance,
  getSkyWallIdentity,
  calculateSkyWallScale
} from '../blockSystem';
import {
  getSkyWallDrain,
  applyAntiSnowballScaling
} from '../staminaSkillEffects';
import {
  drainStamina,
  hasSpecialSkillMechanic,
  rollBaseSkill,
  rollSpecialMechanic
} from '../../skills/skillResolver';
import {
  getPlayerStaminaMod,
  getStaminaMod,
  getStaminaPercent,
  getPlayerMaxStamina,
  clampForm
} from '../../utils/matchTypes';
import { ShotStaminaOutcome, DefensiveEffortType } from '../actionStaminaCosts';
import { makeEvent } from '../../utils/matchNarrative';
import { ensurePlayerStatsExists } from './playerStatMutations';
import { ensureFormExists } from './momentumFormResolver';
import { logSkillTrigger } from './eventLogBuilder';
import { getTovStamMod as extGetTovStamMod, getUsageMod as extGetUsageMod } from '../playerMatchModifiers';

export const USAGE_WINDOW = 20;

export const ensureStats = (ctx: PossessionContext, id: string) => ensurePlayerStatsExists(ctx.draft, id);
export const ensureForm = (ctx: PossessionContext, id: string) => ensureFormExists(ctx.draft, id);
export const skillLog = (ctx: PossessionContext, text: string, isUserTeam: boolean) => logSkillTrigger(ctx.draft, text, isUserTeam);

export const staminaPct = (ctx: PossessionContext, player: Player): number => {
  return getStaminaPercent(player, ctx.draft.playerStamina[player.id]);
};

export const getFoulStamMod = (avg: number) => getFoulStaminaModifier(avg);

export const getTovStamMod = (avg: number) => extGetTovStamMod(avg);

export const getUsageMod = (ctx: PossessionContext, playerId: string, team: 'user' | 'ai'): number => {
  return extGetUsageMod(playerId, team, ctx.newPossessionHistory);
};

export { pickRebounder, awardReb } from './reboundResolver';

export { pickFoulCommitter, getFTChance, runFTSequence } from './foulResolver';

export const getAssistChance = (passer: Player): number => {
  return extGetAssistChance(getAssistRating(passer) ?? 70);
};

export const getClutchRating = (player: Player): number => {
  return getClutchRatingByRarity(player.rarity);
};

export const getClutchMod = (ctx: PossessionContext, player: Player): number => {
  const clutchRating = getClutchRating(player);
  const currentForm = ctx.draft.formRating[player.id] ?? 1.0;
  return extGetClutchMod(clutchRating, ctx.clutchSituation.active, ctx.clutchSituation.intensity, currentForm);
};



export const trackShotStamina = (
  ctx: PossessionContext,
  playerId: string,
  shotType: ShotType,
  is3PT: boolean,
  outcome: ShotStaminaOutcome,
  context: 'normal' | 'oreb' = 'normal'
) => {
  ctx.shotStaminaAttempts.push({ playerId, shotType, is3PT, outcome, context });
};

export const trackDefensiveStamina = (
  ctx: PossessionContext,
  player: Player | undefined,
  shotType: ShotType,
  is3PT: boolean,
  outcome: ShotStaminaOutcome
) => {
  if (player) ctx.defensiveStaminaAttempts.push({ playerId: player.id, shotType, is3PT, outcome });
};

export const trackDefensiveEffort = (
  ctx: PossessionContext,
  player: Player | undefined,
  type: DefensiveEffortType
) => {
  if (player) ctx.defensiveEffortAttempts.push({ playerId: player.id, type });
};

export const TOV_W: Record<string, number> = { PG: 1.4, SG: 1.2, SF: 1.0, PF: 0.7, C: 0.5 };

export const pickCommitter = (lineup: Player[]): Player => {
  const ws = lineup.map(p => {
    const base = TOV_W[p.position] || 1.0;
    const plyMod = 1.0 - ((getHandleRating(p) - 50) / 100);
    return Math.max(0.1, base * plyMod);
  });
  const tw = ws.reduce((s, w) => s + w, 0);
  let r = Math.random() * tw;
  for (let i = 0; i < lineup.length; i++) {
    r -= ws[i];
    if (r <= 0) return lineup[i];
  }
  return lineup[lineup.length - 1];
};

export const unforcedTovMsg = (c: Player, team: string): string => {
  const msgs = [
    `${c.name} turns it over: bad pass`,
    `${c.name} called for the travel`,
    `Shot clock violation: ${team}`,
    `${c.name} loses the handle`,
  ];
  return msgs[Math.floor(Math.random() * msgs.length)];
};

export const BLK_W: Record<string, number> = { C: 1.8, PF: 1.3, SF: 0.9, SG: 0.5, PG: 0.3 };

export const pickBlocker = (lineup: Player[]): Player => {
  const ws = lineup.map(p => BLK_W[p.position] || 0.9);
  const tw = ws.reduce((s, w) => s + w, 0);
  let r = Math.random() * tw;
  for (let i = 0; i < lineup.length; i++) {
    r -= ws[i];
    if (r <= 0) return lineup[i];
  }
  return lineup[lineup.length - 1];
};

export const tryBlock = (
  ctx: PossessionContext,
  defLineup: Player[],
  shooter: Player,
  isDefUser: boolean,
  shotType: ShotType = 'pullUpMid',
  is3PT = false
): boolean => {
  const candidate = pickBlocker(defLineup);
  const rimWardenTriggered = rollBaseSkill(defLineup, "Rim Warden", ctx.draft.playerStamina);
  const stamMod = getPlayerStaminaMod(candidate, ctx.draft.playerStamina[candidate.id]);
  const blockChance = calculateBlockChance(getBlockRating(candidate), rimWardenTriggered, stamMod);
  const blockRoll = Math.random();

  if (blockRoll < blockChance) {
    ctx.blockOccurred = true;
    ensureStats(ctx, candidate.id);
    ctx.draft.playerStats[candidate.id].BLK = (ctx.draft.playerStats[candidate.id].BLK ?? 0) + 1;
    ensureForm(ctx, candidate.id);
    ctx.draft.formRating[candidate.id] = clampForm(ctx.draft.formRating[candidate.id] + 0.04);
    ensureForm(ctx, shooter.id);
    ctx.draft.formRating[shooter.id] = clampForm(ctx.draft.formRating[shooter.id] - 0.03);

    const clutch = ctx.newQuarter === 4 && Math.abs(ctx.userScore - ctx.aiScore) <= 5;
    const isBigOnSmall = (candidate.position === 'C' || candidate.position === 'PF') && (shooter.position === 'PG' || shooter.position === 'SG');
    const isISO = isDefUser ? ctx.currentDef === 'Isolation (ISO)' : ctx.currentOff === 'Isolation (ISO)';
    let msg: string;

    if (clutch) {
      const teamName = isDefUser ? 'My Team' : ctx.aiTeamObj.name;
      msg = `BLOCK: ${candidate.name} keeps ${teamName} alive!`;
    } else if (isISO) {
      msg = `BLK: ${candidate.name} rejects ${shooter.name}. ISO shut down`;
    } else if (isBigOnSmall) {
      msg = `BLK: ${candidate.name} sends it to the stands!`;
    } else {
      msg = `BLK: ${candidate.name} swats it away!`;
    }

    ctx.draft.events.push(makeEvent(ctx.newQuarter, ctx.newClock, msg, isDefUser));

    if (rimWardenTriggered) {
      skillLog(ctx, `${candidate.name}'s Rim Warden powers the block`, isDefUser);
    }

    if (rollSpecialMechanic(defLineup, "SKY_WALL_STAMINA_DRAIN", ctx.draft.playerStamina, (h) => calculateSkyWallScale(getSkyWallIdentity(h)).scale)) {
      const holders = defLineup.filter(p => hasSpecialSkillMechanic(p, "SKY_WALL_STAMINA_DRAIN"));
      if (holders.length > 0) {
        const leader = [...holders].sort((a, b) => {
          const rA = a.skillRarities?.["SKY_WALL"] || 'Common';
          const rB = b.skillRarities?.["SKY_WALL"] || 'Common';
          const val = { Common: 1, Rare: 2, Elite: 3, Epic: 4, Legendary: 5 };
          return (val[rB] ?? 1) - (val[rA] ?? 1);
        })[0];
        const rarity = leader.skillRarities?.["SKY_WALL"] || 'Common';
        const baseDrain = getSkyWallDrain(rarity);
        const atkLineup = isDefUser ? ctx.aiLineup : ctx.userLineup;
        let drainedCount = 0;
        atkLineup.forEach(p => {
          const finalDrain = applyAntiSnowballScaling(baseDrain, staminaPct(ctx, p));
          const drain = drainStamina(ctx.draft.playerStamina, p, defLineup, finalDrain);
          if (drain > 0) drainedCount++;
        });
        if (drainedCount > 0) {
          skillLog(ctx, `SKY_WALL: The emphatic block drains stamina from ${drainedCount} opponent${drainedCount > 1 ? 's' : ''}`, isDefUser);
        }
      }
    }

    ctx.eventIndicator = { playerId: candidate.id, type: 'BLK' };
    return true;
  }

  const failedJumpWindow = is3PT ? 0.10 : 0.18;
  if (blockRoll < blockChance + failedJumpWindow) {
    trackDefensiveEffort(ctx, candidate, 'failedBlock');
  }
  return false;
};
