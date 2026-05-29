import { Player } from "@/lib/types/player";
import { deriveAttributesFromNbaStats } from "@/lib/utils/nbaAttributeMapper";

export type DetailedAttributes = Required<Pick<
  Player,
  "threePt" | "twoPt" | "freeThrow" | "handle" | "assist" | "steal" | "block" | "rebound" | "onBall" | "calm"
>>;

type StarTier = "None" | "Silver" | "Blue" | "Violet" | "Orange" | "Red";

const capDetailed = (value: number) => Math.max(25, Math.round(value));
const capCore = (value: number) => Math.max(1, Math.round(value));
const capSub = (value: number) => Math.max(1, Math.round(value));

const scaled = (value: number, fallback = 75): number => {
  const safe = Number.isFinite(value) ? value : fallback;
  return safe >= 120 ? safe : safe * 1.35;
};

export const getDetailedAttributes = (player: Player): DetailedAttributes => {
  const nbaBaseline = deriveAttributesFromNbaStats(player);
  const shooting = player.shooting ?? 75;
  const offense = player.offense ?? 75;
  const defense = player.defense ?? 75;
  const speed = player.speed ?? 75;
  const strength = player.strength ?? 75;
  const playmaking = player.playmaking ?? 75;

  return {
    threePt: capDetailed(player.threePt ?? nbaBaseline.threePt ?? scaled(shooting)),
    twoPt: capDetailed(player.twoPt ?? nbaBaseline.twoPt ?? ((scaled(offense) * 0.55) + (scaled(shooting) * 0.25) + (scaled(strength) * 0.20))),
    freeThrow: capDetailed(player.freeThrow ?? nbaBaseline.freeThrow ?? ((scaled(shooting) * 0.72) + (scaled(playmaking) * 0.18) + (scaled(player.ovr) * 0.10))),
    handle: capDetailed(player.handle ?? nbaBaseline.handle ?? ((scaled(playmaking) * 0.58) + (scaled(speed) * 0.32) + (scaled(shooting) * 0.10))),
    assist: capDetailed(player.assist ?? nbaBaseline.assist ?? scaled(playmaking)),
    steal: capDetailed(player.steal ?? nbaBaseline.steal ?? ((scaled(defense) * 0.58) + (scaled(speed) * 0.42))),
    block: capDetailed(player.block ?? nbaBaseline.block ?? ((scaled(defense) * 0.55) + (scaled(strength) * 0.45))),
    rebound: capDetailed(player.rebound ?? nbaBaseline.rebound ?? ((scaled(strength) * 0.58) + (scaled(defense) * 0.42))),
    onBall: capDetailed(player.onBall ?? nbaBaseline.onBall ?? ((scaled(defense) * 0.70) + (scaled(speed) * 0.30))),
    calm: capDetailed(player.calm ?? nbaBaseline.calm ?? ((scaled(playmaking) * 0.45) + (scaled(player.ovr) * 0.35) + (scaled(shooting) * 0.20))),
  };
};

const tierMultiplier = (tier: StarTier): number => {
  if (tier === "Blue") return 1.18;
  if (tier === "Violet") return 1.38;
  if (tier === "Orange") return 1.62;
  if (tier === "Red") return 1.90;
  return 1.0;
};

const getStarTier = (starLevel: number): StarTier => {
  if (!starLevel || starLevel <= 0) return "None";
  const index = starLevel - 1;
  const tierIndex = Math.min(4, Math.floor(index / 5));
  return (["Silver", "Blue", "Violet", "Orange", "Red"] as StarTier[])[tierIndex] ?? "Red";
};

const getStarLevelInTier = (starLevel: number): number => ((Math.max(1, starLevel) - 1) % 5) + 1;

const getGrowthWeights = (player: Player): DetailedAttributes => {
  if (player.position === "PG") {
    return { threePt: 2, twoPt: 1, freeThrow: 1, handle: 4, assist: 4, steal: 2, block: 0, rebound: 0, onBall: 2, calm: 3 };
  }
  if (player.position === "SG") {
    return { threePt: 4, twoPt: 2, freeThrow: 2, handle: 3, assist: 2, steal: 2, block: 0, rebound: 1, onBall: 2, calm: 2 };
  }
  if (player.position === "SF") {
    return { threePt: 3, twoPt: 3, freeThrow: 1, handle: 2, assist: 2, steal: 2, block: 1, rebound: 2, onBall: 3, calm: 2 };
  }
  if (player.position === "PF") {
    return { threePt: 1, twoPt: 4, freeThrow: 1, handle: 1, assist: 2, steal: 1, block: 3, rebound: 4, onBall: 2, calm: 2 };
  }
  return { threePt: 0, twoPt: 4, freeThrow: 1, handle: 0, assist: 1, steal: 0, block: 4, rebound: 4, onBall: 2, calm: 2 };
};

export const applyStarGrowth = (player: Player, targetStarLevel: number): Player => {
  const tier = getStarTier(targetStarLevel);
  const levelInTier = getStarLevelInTier(targetStarLevel);
  const multiplier = tierMultiplier(tier);
  const milestoneBoost = levelInTier === 5 ? 1.35 : levelInTier === 3 ? 1.15 : 1.0;
  const weights = getGrowthWeights(player);
  const current = getDetailedAttributes(player);

  const gains = Object.fromEntries(
    Object.entries(weights).map(([key, weight]) => [
      key,
      Math.max(1, Math.round((1 + weight * 0.55) * multiplier * milestoneBoost)),
    ])
  ) as DetailedAttributes;

  const next: DetailedAttributes = {
    threePt: capDetailed(current.threePt + gains.threePt),
    twoPt: capDetailed(current.twoPt + gains.twoPt),
    freeThrow: capDetailed(current.freeThrow + gains.freeThrow),
    handle: capDetailed(current.handle + gains.handle),
    assist: capDetailed(current.assist + gains.assist),
    steal: capDetailed(current.steal + gains.steal),
    block: capDetailed(current.block + gains.block),
    rebound: capDetailed(current.rebound + gains.rebound),
    onBall: capDetailed(current.onBall + gains.onBall),
    calm: capDetailed(current.calm + gains.calm),
  };

  const offenseGain = Math.ceil((gains.threePt + gains.twoPt + gains.handle + gains.assist) / 4);
  const defenseGain = Math.ceil((gains.steal + gains.block + gains.rebound + gains.onBall) / 4);
  const shootingGain = Math.ceil((gains.threePt + gains.twoPt + gains.freeThrow) / 8);
  const playmakingGain = Math.ceil((gains.handle + gains.assist + gains.calm) / 8);
  const speedGain = player.position === "PG" || player.position === "SG" || player.position === "SF" ? Math.ceil((gains.handle + gains.steal) / 14) : 0;
  const strengthGain = player.position === "PF" || player.position === "C" ? Math.ceil((gains.twoPt + gains.block + gains.rebound) / 14) : 0;

  return {
    ...player,
    starLevel: targetStarLevel,
    ...next,
    offense: capCore(player.offense + offenseGain),
    defense: capCore(player.defense + defenseGain),
    shooting: capSub(player.shooting + shootingGain),
    playmaking: capSub(player.playmaking + playmakingGain),
    speed: capSub(player.speed + speedGain),
    strength: capSub(player.strength + strengthGain),
    ovr: player.ovr,
  };
};
