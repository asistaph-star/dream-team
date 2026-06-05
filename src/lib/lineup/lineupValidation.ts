import { Player } from "../types/player";

export interface LineupValidationResult {
  isValid: boolean;
  blockedPlayers: { player: Player; reason: string }[];
  warnings: string[];
}

export function validateLineupForMode(
  lineup: Player[],
  mode: "ranked" | "season" | "casual" | "practice"
): LineupValidationResult {
  const result: LineupValidationResult = {
    isValid: true,
    blockedPlayers: [],
    warnings: [],
  };

  const isRankedOrSeason = mode === "ranked" || mode === "season";

  for (const player of lineup) {
    const status = player.injuryStatus?.status ?? "AVAILABLE";
    const reason = player.injuryStatus?.reason ?? player.injuryName ?? "Injured";

    if (status === "OUT" || status === "DOUBTFUL") {
      if (isRankedOrSeason) {
        result.isValid = false;
        result.blockedPlayers.push({
          player,
          reason: `${player.name} is ${status} (${reason}) and cannot play in Ranked/Season mode.`,
        });
      } else {
        result.warnings.push(
          `${player.name} is ${status} (${reason}) but is allowed to play in ${mode} mode.`
        );
      }
    } else if (status === "REST") {
      if (isRankedOrSeason) {
        result.isValid = false;
        result.blockedPlayers.push({
          player,
          reason: `${player.name} is resting (${reason}) and is blocked from Ranked/Season mode.`,
        });
      } else {
        result.warnings.push(
          `${player.name} is resting (${reason}) but is allowed to play in ${mode} mode.`
        );
      }
    } else if (status === "PROBABLE") {
      result.warnings.push(
        `${player.name} is PROBABLE (${reason}) to play.`
      );
    } else if (status === "QUESTIONABLE") {
      result.warnings.push(
        `${player.name} is QUESTIONABLE (${reason}) to play.`
      );
    } else if (status === "GTD") {
      result.warnings.push(
        `${player.name} is GTD (${reason}) - Game Time Decision.`
      );
    }
  }

  return result;
}
