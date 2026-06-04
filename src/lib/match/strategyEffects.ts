import { Player } from "../types/player";
import { getStaminaPercent } from "../utils/matchTypes";
import { avgStamina } from "../utils/matchTypes";

export interface StrategyDegradationResult {
  newOffStrategy: string;
  newDefStrategy: string;
  warnings: string[];
  reverts: { type: 'off' | 'def'; from: string; to: string; playerName?: string }[];
}

/**
 * Calculates offensive multiplier based on strategy and player/team stamina.
 */
export function calculateOffensiveStrategyMultiplier(
  strategy: string,
  lineup: Player[],
  stamina: Record<string, number>
): number {
  let offMult = 1.0;
  const teamAvg = avgStamina(lineup, stamina);
  const staminaPct = (p: Player) => getStaminaPercent(p, stamina[p.id]);

  if (strategy === "Isolation (ISO)") {
    const star = [...lineup].sort((a, b) => b.ovr - a.ovr)[0];
    if (star) {
      const ss = stamina[star.id] ?? 100;
      offMult = ss >= 70 ? 1.05 : ss >= 50 ? 1.0 : ss >= 30 ? 0.92 : 0.85;
    }
  } else if (strategy === "Pick & Roll") {
    const pg = lineup.find(p => p.position === 'PG');
    const big = lineup.find(p => p.position === 'C' || p.position === 'PF');
    if (pg && big && (staminaPct(pg) < 45 || staminaPct(big) < 45)) {
      offMult = 0.98 / 1.02;
    }
  } else if (strategy === "Run & Gun") {
    offMult = teamAvg >= 75 ? 1.06 : teamAvg >= 60 ? 1.02 : 0.94;
  } else if (strategy === "Pace & Space") {
    const sg = lineup.find(p => p.position === 'SG');
    const sf = lineup.find(p => p.position === 'SF');
    const avgShooterStamina = ((stamina[sg?.id ?? ''] ?? 100) + (stamina[sf?.id ?? ''] ?? 100)) / 2;
    offMult = avgShooterStamina >= 70 ? 1.04 : avgShooterStamina >= 50 ? 1.00 : 0.92;
  } else if (strategy === "Outside Shoot") {
    const pg = lineup.find(p => p.position === 'PG');
    const sg = lineup.find(p => p.position === 'SG');
    const avgPerimeterStam = ((stamina[pg?.id ?? ''] ?? 100) + (stamina[sg?.id ?? ''] ?? 100)) / 2;
    offMult = avgPerimeterStam >= 70 ? 1.04 : avgPerimeterStam >= 50 ? 1.00 : 0.92;
  } else if (strategy === "Corner 3s") {
    const sg = lineup.find(p => p.position === 'SG');
    const sf = lineup.find(p => p.position === 'SF');
    const avgShooterStam = ((stamina[sg?.id ?? ''] ?? 100) + (stamina[sf?.id ?? ''] ?? 100)) / 2;
    offMult = avgShooterStam >= 70 ? 1.05 : avgShooterStam >= 50 ? 1.01 : 0.91;
  } else if (strategy === "Inside Score") {
    const pf = lineup.find(p => p.position === 'PF');
    const c = lineup.find(p => p.position === 'C');
    const avgBigStam = ((stamina[pf?.id ?? ''] ?? 100) + (stamina[c?.id ?? ''] ?? 100)) / 2;
    offMult = avgBigStam >= 70 ? 1.05 : avgBigStam >= 50 ? 1.01 : 0.90;
  } else if (strategy === "Hawk Entry") {
    const sf = lineup.find(p => p.position === 'SF');
    const pf = lineup.find(p => p.position === 'PF');
    const avgPostStam = ((stamina[sf?.id ?? ''] ?? 100) + (stamina[pf?.id ?? ''] ?? 100)) / 2;
    offMult = avgPostStam >= 68 ? 1.03 : avgPostStam >= 48 ? 1.00 : 0.93;
  } else if (strategy === "Outside Cut Entry") {
    const sf = lineup.find(p => p.position === 'SF');
    const sg = lineup.find(p => p.position === 'SG');
    const avgCutStam = ((stamina[sf?.id ?? ''] ?? 100) + (stamina[sg?.id ?? ''] ?? 100)) / 2;
    offMult = avgCutStam >= 70 ? 1.04 : avgCutStam >= 50 ? 1.00 : 0.92;
  } else if (strategy === "Princeton Offense") {
    offMult = teamAvg >= 75 ? 1.05 : teamAvg >= 60 ? 1.02 : 0.94;
  }

  return offMult;
}

/**
 * Calculates level multiplier based on strategy level.
 */
export function calculateStrategyLevelMultiplier(level: number): number {
  return 1.0 + (level - 1) * 0.02;
}

/**
 * Evaluates strategy degradation conditions and warnings based on team stamina.
 */
export function checkStrategyDegradation(
  currentOff: string,
  currentDef: string,
  lineup: Player[],
  stamina: Record<string, number>
): StrategyDegradationResult {
  let newOffStrategy = currentOff;
  let newDefStrategy = currentDef;
  const warnings: string[] = [];
  const reverts: StrategyDegradationResult['reverts'] = [];
  const teamAvg = avgStamina(lineup, stamina);
  const staminaPct = (p: Player) => getStaminaPercent(p, stamina[p.id]);

  // Isolation (ISO) check
  if (currentOff === "Isolation (ISO)") {
    const star = [...lineup].sort((a, b) => b.ovr - a.ovr)[0];
    if (star && staminaPct(star) < 40) {
      newOffStrategy = "Motion Offense";
      reverts.push({ type: 'off', from: "Isolation (ISO)", to: "Motion Offense", playerName: star.name });
    }
  }

  // Pick & Roll check
  if (currentOff === "Pick & Roll") {
    const pg = lineup.find(p => p.position === 'PG');
    const big = lineup.find(p => p.position === 'C' || p.position === 'PF');
    if (pg && big && (staminaPct(pg) < 45 || staminaPct(big) < 45)) {
      const tired = staminaPct(pg) < 45 ? pg : big;
      warnings.push(`Pick & Roll DEGRADED — ${tired.name} fatigued`);
    }
  }

  // 5-Out Spacing check
  if (currentOff === "5-Out Spacing" && teamAvg < 55) {
    warnings.push("5-Out Spacing DEGRADED — team too fatigued for spacing");
  }

  // Run & Gun check
  if (currentOff === "Run & Gun") {
    if (teamAvg < 50) {
      newOffStrategy = "Motion Offense";
      reverts.push({ type: 'off', from: "Run & Gun", to: "Motion Offense", playerName: "Team" });
    } else if (teamAvg < 65) {
      warnings.push("Run & Gun DEGRADED — team losing transition speed");
    }
  }

  // Pace & Space check
  if (currentOff === "Pace & Space") {
    const sg = lineup.find(p => p.position === 'SG');
    const sf = lineup.find(p => p.position === 'SF');
    if (sg && sf && (staminaPct(sg) < 45 || staminaPct(sf) < 45)) {
      const tired = staminaPct(sg) < 45 ? sg : sf;
      warnings.push(`Pace & Space DEGRADED — shooter ${tired.name} fatigued`);
    }
  }

  // Outside Shoot check
  if (currentOff === "Outside Shoot") {
    const pg = lineup.find(p => p.position === 'PG');
    const sg = lineup.find(p => p.position === 'SG');
    if (pg && sg && (staminaPct(pg) < 40 || staminaPct(sg) < 40)) {
      const tired = staminaPct(pg) < 40 ? pg : sg;
      warnings.push(`Outside Shoot DEGRADED — perimeter threat ${tired.name} fatigued`);
    }
  }

  // Corner 3s check
  if (currentOff === "Corner 3s") {
    const sg = lineup.find(p => p.position === 'SG');
    const sf = lineup.find(p => p.position === 'SF');
    if (sg && sf && (staminaPct(sg) < 40 || staminaPct(sf) < 40)) {
      const tired = staminaPct(sg) < 40 ? sg : sf;
      warnings.push(`Corner 3s DEGRADED — corner shooter ${tired.name} fatigued`);
    }
  }

  // Inside Score check
  if (currentOff === "Inside Score") {
    const pf = lineup.find(p => p.position === 'PF');
    const c = lineup.find(p => p.position === 'C');
    if (pf && c && (staminaPct(pf) < 40 || staminaPct(c) < 40)) {
      const tired = staminaPct(pf) < 40 ? pf : c;
      warnings.push(`Inside Score DEGRADED — paint physical presence ${tired.name} fatigued`);
    }
  }

  // Hawk Entry check
  if (currentOff === "Hawk Entry") {
    const sf = lineup.find(p => p.position === 'SF');
    const pf = lineup.find(p => p.position === 'PF');
    if (sf && pf && (staminaPct(sf) < 40 || staminaPct(pf) < 40)) {
      const tired = staminaPct(sf) < 40 ? sf : pf;
      warnings.push(`Hawk Entry DEGRADED — cutter/screener ${tired.name} fatigued`);
    }
  }

  // Outside Cut Entry check
  if (currentOff === "Outside Cut Entry") {
    const sf = lineup.find(p => p.position === 'SF');
    const sg = lineup.find(p => p.position === 'SG');
    if (sf && sg && (staminaPct(sf) < 40 || staminaPct(sg) < 40)) {
      const tired = staminaPct(sf) < 40 ? sf : sg;
      warnings.push(`Outside Cut Entry DEGRADED — wing playmaker/cutter ${tired.name} fatigued`);
    }
  }

  // Princeton Offense check
  if (currentOff === "Princeton Offense" && teamAvg < 50) {
    newOffStrategy = "Outside Shoot";
    reverts.push({ type: 'off', from: "Princeton Offense", to: "Outside Shoot", playerName: "Team" });
  }

  // Switch Defense check
  if (currentDef === "Switch Defense") {
    const weak = lineup.find(p => staminaPct(p) < 40);
    if (weak) {
      newDefStrategy = "Man-to-Man";
      reverts.push({ type: 'def', from: "Switch Defense", to: "Man-to-Man", playerName: weak.name });
    }
  }

  // Full-court press check
  if (currentDef === "Full-court press" || currentDef === "Full-Court Press") {
    if (teamAvg < 40) {
      newDefStrategy = "Man-to-Man";
      reverts.push({ type: 'def', from: currentDef, to: "Man-to-Man", playerName: "Team" });
    } else if (teamAvg < 55) {
      warnings.push("Full-court press DEGRADED — low team stamina for press");
    }
  }

  // Half-court press check
  if (currentDef === "Half-court press" || currentDef === "Half-Court Press") {
    if (teamAvg < 45) {
      newDefStrategy = "Man-to-Man";
      reverts.push({ type: 'def', from: currentDef, to: "Man-to-Man", playerName: "Team" });
    } else if (teamAvg < 60) {
      warnings.push("Half-court press DEGRADED — team too fatigued to trap sideline");
    }
  }

  // Protect the Lane check
  if (currentDef === "Protect the Lane") {
    const pf = lineup.find(p => p.position === 'PF');
    const c = lineup.find(p => p.position === 'C');
    if (pf && c && (staminaPct(pf) < 40 || staminaPct(c) < 40)) {
      const tired = staminaPct(pf) < 40 ? pf : c;
      warnings.push(`Protect the Lane DEGRADED — rim protectors fatigued (${tired.name})`);
    }
  }

  // 3-2 Zone check
  if (currentDef === "3-2 Zone" && teamAvg < 50) {
    warnings.push("3-2 Zone DEGRADED — team too slow to cover the wings");
  }

  // 1-3-1 Zone check
  if (currentDef === "1-3-1 Zone" && teamAvg < 50) {
    newDefStrategy = "Man-to-Man";
    reverts.push({ type: 'def', from: "1-3-1 Zone", to: "Man-to-Man", playerName: "Team" });
  }

  // Blitz/Trap check
  if (currentDef === "Blitz/Trap" && teamAvg < 50) {
    warnings.push("Blitz/Trap DEGRADED — team too fatigued to trap");
  }

  return {
    newOffStrategy,
    newDefStrategy,
    warnings,
    reverts
  };
}
