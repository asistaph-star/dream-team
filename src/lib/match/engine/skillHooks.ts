import { Player } from '../../types/player';
import { MatchStateDraft } from './matchStateDraft';
import {
  rollSpecialMechanic,
  hasSpecialSkillMechanic,
  rollBaseSkill,
  hasBaseSkill,
  addMark,
  removeOldestMark,
  hasMark
} from '../../skills/skillResolver';
import {
  getCalmRating,
  getStaminaRating,
  getOnBallDefenseRating,
  getStealRating
} from '../../utils/playerIdentity';
import {
  avgStamina,
  clampForm,
  translateDefIQBoost
} from '../../utils/matchTypes';
import {
  calculateBenchCaptainRecovery,
  calculateEnforcerScale,
  getBenchCaptainIdentity,
  getDefensiveAnchorIdentity,
  getEnforcerIdentity
} from '../archetypeEffects';
import {
  calculateMomentumSwingRecovery,
  shouldMomentumSwingTrigger,
  getMomentumSwingIdentity
} from '../momentumSwing';
import { resolveLineupArchetypes } from '../../lineup/lineupArchetypeResolver';
import { logSkillTrigger } from './eventLogBuilder';
import { recoverPlayerStamina } from './staminaMutations';
import { ensureFormExists } from './momentumFormResolver';

export function recoverSkillStamina(draft: MatchStateDraft, player: Player, amount: number): boolean {
  if (hasMark(draft.skillMarks, player.id, "Pinned")) {
    return false;
  }
  recoverPlayerStamina(draft, player, amount);
  return true;
}

export function tryColdTimeout(draft: MatchStateDraft, team: Player[], isUserTeam: boolean) {
  const markedPlayers = team.filter(p => (draft.skillMarks[p.id] ?? []).length > 0);
  const teamAvgStamina = avgStamina(team, draft.playerStamina);
  if (teamAvgStamina >= 65 && markedPlayers.length === 0) {
    return;
  }

  const useKey = `Timeout Reset Q${draft.quarter}`;
  const key = isUserTeam ? "user" : "ai";
  if ((draft.skillUsedThisGame[key] ?? []).includes(useKey)) {
    return;
  }

  if (!rollSpecialMechanic(team, "TIMEOUT_RESET_CLEANSE", draft.playerStamina, (h) => {
    const coldTimeoutIdentity = (getCalmRating(h) + getStaminaRating(h)) / 2;
    return 0.90 + (coldTimeoutIdentity / 100) * 0.20;
  })) {
    return;
  }

  // Mark team skill used
  draft.skillUsedThisGame[key] = [...(draft.skillUsedThisGame[key] ?? []), useKey];

  let cleansed = 0;
  markedPlayers.forEach(p => {
    const before = draft.skillMarks[p.id]?.length ?? 0;
    if (before > 0) {
      const { nextMarks, cleansedMark } = removeOldestMark(draft.skillMarks, p.id);
      draft.skillMarks = nextMarks;
      if (cleansedMark) {
        const currentImmunities = draft.markImmunity[p.id] ?? [];
        if (!currentImmunities.some(m => m.mark === cleansedMark)) {
          currentImmunities.push({ mark: cleansedMark, possessionsLeft: 1 });
        }
        draft.markImmunity[p.id] = currentImmunities;
      }
      cleansed++;
    }
  });

  const recoveryTargets = [...team]
    .sort((a, b) => (draft.playerStamina[a.id] ?? 100) - (draft.playerStamina[b.id] ?? 100))
    .slice(0, teamAvgStamina < 65 ? 2 : 1);
  
  recoveryTargets.forEach(p => recoverSkillStamina(draft, p, 12));

  const recoveryText = recoveryTargets.length > 0 ? `steadies ${recoveryTargets.length} tired player${recoveryTargets.length > 1 ? "s" : ""}` : "";
  const cleanseText = cleansed > 0 ? `cleanses ${cleansed} pressure mark${cleansed !== 1 ? "s" : ""}` : "";
  const joiner = cleanseText && recoveryText ? " and " : "";
  logSkillTrigger(draft, `Timeout Reset ${cleanseText}${joiner}${recoveryText}`, isUserTeam);
}

export function applyBenchCaptain(draft: MatchStateDraft, team: Player[], isUserTeam: boolean) {
  const teamAvg = avgStamina(team, draft.playerStamina);
  
  // Get lowest stamina player
  const lowestStamPlayer = [...team].sort((a, b) => (draft.playerStamina[a.id] ?? 100) - (draft.playerStamina[b.id] ?? 100))[0];
  const lowestStam = lowestStamPlayer ? (draft.playerStamina[lowestStamPlayer.id] ?? 100) : 100;
  
  if (teamAvg >= 65 && lowestStam >= 45) {
    return;
  }

  const teamName = isUserTeam ? "User" : "AI";
  const useKey = `${teamName} Bench Captain Q${draft.quarter}`;
  const key = isUserTeam ? "user" : "ai";
  if ((draft.skillUsedThisGame[key] ?? []).includes(useKey)) {
    return;
  }

  const pbSummary = resolveLineupArchetypes(team);
  const pbLevel = pbSummary.allResults.find(r => r.id === "playmaking")?.level ?? 0;
  const scaleMultiplier = pbLevel === 0 ? 0.85 : pbLevel === 1 ? 1.00 : pbLevel === 2 ? 1.05 : 1.10;

  if (!rollSpecialMechanic(team, "BENCH_CAPTAIN_STABILIZE", draft.playerStamina, (h) => {
    const identity = getBenchCaptainIdentity(h);
    const scale = 0.85 + (identity / 100) * 0.30;
    return scale * scaleMultiplier;
  })) {
    return;
  }

  const holders = team.filter(p => hasSpecialSkillMechanic(p, "BENCH_CAPTAIN_STABILIZE"));
  const leader = [...holders].sort((a_p, b_p) => (getCalmRating(b_p) - getCalmRating(a_p)))[0];
  if (!leader) {
    return;
  }

  draft.skillUsedThisGame[key] = [...(draft.skillUsedThisGame[key] ?? []), useKey];

  const leaderIdentity = getBenchCaptainIdentity(leader);
  const recovery = calculateBenchCaptainRecovery(leaderIdentity, getCalmRating(leader));
  const staminaRecover = recovery.staminaRecover;

  recoverSkillStamina(draft, lowestStamPlayer, staminaRecover);

  ensureFormExists(draft, lowestStamPlayer.id);
  let formText = "";
  if (draft.formRating[lowestStamPlayer.id] < 1.0) {
    const formStabilize = recovery.formStabilize;
    draft.formRating[lowestStamPlayer.id] = clampForm(draft.formRating[lowestStamPlayer.id] + formStabilize);
    formText = ` and focus (+${(formStabilize * 100).toFixed(2)}%)`;
  }

  logSkillTrigger(draft, `${leader.name}'s Bench Captain stabilizes ${lowestStamPlayer.name}'s stamina (+${staminaRecover})${formText}`, isUserTeam);
}

export function applyMomentumSwing(
  draft: MatchStateDraft,
  team: Player[],
  isUserTeam: boolean,
  lastPlayCategory: string
): 'user' | 'ai' | null {
  if (!shouldMomentumSwingTrigger(lastPlayCategory)) {
    return null;
  }

  const teamName = isUserTeam ? "User" : "AI";
  const useKey = `${teamName} Momentum Swing Q${draft.quarter}`;
  const key = isUserTeam ? "user" : "ai";
  if ((draft.skillUsedThisGame[key] ?? []).includes(useKey)) {
    return null;
  }

  if (!rollSpecialMechanic(team, "MOMENTUM_SWING_RECOVERY", draft.playerStamina, (h) => {
    const identity = getMomentumSwingIdentity(h);
    return 0.85 + (identity / 100) * 0.30;
  })) {
    return null;
  }

  const holders = team.filter(p => hasSpecialSkillMechanic(p, "MOMENTUM_SWING_RECOVERY"));
  const leader = [...holders].sort((a_p, b_p) => (getCalmRating(b_p) - getCalmRating(a_p)))[0];
  if (!leader) {
    return null;
  }

  draft.skillUsedThisGame[key] = [...(draft.skillUsedThisGame[key] ?? []), useKey];

  const leaderIdentity = getMomentumSwingIdentity(leader);
  const recovery = calculateMomentumSwingRecovery(leaderIdentity, getCalmRating(leader));

  const lowestStamPlayer = [...team].sort((a, b) => (draft.playerStamina[a.id] ?? 100) - (draft.playerStamina[b.id] ?? 100))[0];
  let staminaText = "";
  if (lowestStamPlayer) {
    recoverSkillStamina(draft, lowestStamPlayer, recovery.staminaRecover);
    staminaText = ` steadies ${lowestStamPlayer.name}'s stamina (+${recovery.staminaRecover})`;
  }

  let formText = "";
  ensureFormExists(draft, leader.id);
  if (draft.formRating[leader.id] < 1.0) {
    draft.formRating[leader.id] = clampForm(draft.formRating[leader.id] + recovery.formRecover);
    formText = ` and focus (+${(recovery.formRecover * 100).toFixed(2)}%)`;
  }

  logSkillTrigger(draft, `${leader.name}'s Momentum Swing stabilizes after the play${staminaText}${formText}`, isUserTeam);
  return isUserTeam ? 'user' : 'ai';
}

export function applyDefensiveAnchor(
  draft: MatchStateDraft,
  defendingTeam: Player[],
  isDefendingUserTeam: boolean,
  userEffRawDef: number,
  aiEffRawDef: number,
  isFastBreak: boolean
) {
  if (isFastBreak) {
    return;
  }

  const holders = defendingTeam.filter(p => hasSpecialSkillMechanic(p, "DEFENSIVE_ANCHOR_TEAM_BOOST"));
  if (holders.length === 0) {
    return;
  }

  const leader = [...holders].sort((a_p, b_p) => {
    return getDefensiveAnchorIdentity(b_p) - getDefensiveAnchorIdentity(a_p);
  })[0];
  if (!leader) {
    return;
  }

  const defSide = isDefendingUserTeam ? 'user' : 'ai';
  const leaderIdentity = getDefensiveAnchorIdentity(leader);
  const baseEffectiveDef = isDefendingUserTeam ? userEffRawDef : aiEffRawDef;
  const leaderStamina = draft.playerStamina[leader.id] ?? 100;

  const iqPoints = leaderIdentity * 10;
  const defBoost = translateDefIQBoost(iqPoints, baseEffectiveDef, leaderStamina);

  draft.teamSkillBuffs[defSide].defIQ += defBoost;
  draft.activeSkillBuffs[leader.id] = {
    offIQBoost: 0,
    defIQBoost: defBoost,
    staminaDecayMult: 1.0,
    benchRecoveryBonus: 0
  };
}

export function tryGameplanJammer(
  draft: MatchStateDraft,
  defendingTeam: Player[],
  target: Player,
  sourceText: string,
  isDisruptingUser: boolean
): boolean {
  if (!rollSpecialMechanic(defendingTeam, "GAMEPLAN_JAMMER_STATIC", draft.playerStamina, (h) => {
    const identity = (getOnBallDefenseRating(h) + getStealRating(h)) / 2;
    return 0.90 + (identity / 100) * 0.20;
  })) {
    return false;
  }
  draft.skillMarks = addMark(draft.skillMarks, draft.markImmunity, target.id, "Static", "GAMEPLAN_JAMMER_STATIC", 2);
  logSkillTrigger(draft, `Gameplan Jammer blocks ${target.name}'s ${sourceText} and applies Static`, isDisruptingUser);
  return true;
}

export function tryShadowGuard(
  draft: MatchStateDraft,
  defendingTeam: Player[],
  isDefendingUser: boolean
): boolean {
  if (!rollBaseSkill(defendingTeam, "Shadow Guard", draft.playerStamina)) {
    return false;
  }
  logSkillTrigger(draft, `Shadow Guard cuts off the perimeter trigger`, isDefendingUser);
  return true;
}

export function applyGreenSupport(
  draft: MatchStateDraft,
  team: Player[],
  isUserTeam: boolean,
  newTeamFoulsUser: number,
  newTeamFoulsAi: number
) {
  team.forEach(p => {
    if (hasBaseSkill(p, "Future Core")) {
      ensureFormExists(draft, p.id);
      if (draft.formRating[p.id] < 1.0) {
        draft.formRating[p.id] = clampForm(draft.formRating[p.id] + 0.006);
      }
    }
  });

  const foulsThisQuarter = isUserTeam ? newTeamFoulsUser : newTeamFoulsAi;
  if (foulsThisQuarter > 0 && rollBaseSkill(team, "Enforcer Lift", draft.playerStamina)) {
    const enforcerHolders = team.filter(p => hasBaseSkill(p, "Enforcer Lift"));
    const bestEnforcer = enforcerHolders.reduce((best, p) => {
      const id = getEnforcerIdentity(p);
      return id > best ? id : best;
    }, 50);
    const enforcerLiftScale = calculateEnforcerScale(bestEnforcer);
    team.forEach(p => recoverSkillStamina(draft, p, 6 * enforcerLiftScale));
    logSkillTrigger(draft, `Enforcer Lift turns physical play into team energy`, isUserTeam);
  }
}
