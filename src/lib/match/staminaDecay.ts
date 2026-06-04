import { Player } from "../types/player";
import { STAMINA_CONFIG } from "./staminaConfig";
import { getPlayerMaxStamina, clampForm } from "../utils/matchTypes";

/** Calculates stamina recovery for a bench player capped at their maximum stamina */
export function calculateBenchRecoveryAmount(
  player: Player,
  baseRecovery: number,
  currentStamina: number | undefined
): number {
  const maxStamina = getPlayerMaxStamina(player);
  const current = currentStamina ?? maxStamina;
  return Math.min(maxStamina, current + baseRecovery);
}

/** Drifts a form rating toward 1.0 by a specified delta, ensuring it does not overshoot */
export function driftFormTowardNeutral(currentForm: number, driftDelta: number): number {
  if (currentForm > 1.0) {
    return clampForm(Math.max(1.0, currentForm - driftDelta));
  } else if (currentForm < 1.0) {
    return clampForm(Math.min(1.0, currentForm + driftDelta));
  }
  return currentForm;
}

/** Computes the base elapsed-time stamina decay for an active player, applying pace and overtime fatigue */
export function calculateBaseStaminaDecay(
  currentStamina: number,
  timeElapsed: number,
  pace: string,
  isOvertime: boolean,
  rngJitter: number,
  maxStamina: number
): number {
  let baseLoss = timeElapsed * (STAMINA_CONFIG.movement.normalPerSecond + rngJitter * STAMINA_CONFIG.movement.randomPerSecond);

  if (pace === 'fastbreak') {
    baseLoss *= STAMINA_CONFIG.movement.fastbreak;
  } else if (pace === 'early_offense') {
    baseLoss *= STAMINA_CONFIG.movement.earlyOffense;
  }

  if (isOvertime) {
    baseLoss *= STAMINA_CONFIG.movement.overtime;
  }

  if (currentStamina < 68) {
    baseLoss *= 1.15;
  }
  if (currentStamina < 45) {
    baseLoss *= 1.30;
  }

  return Math.max(0, Math.min(maxStamina, currentStamina - baseLoss));
}
