import { Player } from "@/lib/types/player";
import { deriveAttributesFromNbaStats } from "@/lib/utils/nbaAttributeMapper";

export type DetailedAttributes = Required<Pick<
  Player,
  "threePt" | "twoPt" | "freeThrow" | "finishing" | "handle" | "assist" | "steal" | "block" | "rebound" | "onBall" | "calm"
>>;

type StarTier = "None" | "Silver" | "Blue" | "Violet" | "Orange" | "Red";

const capDetailed = (value: number) => Math.max(25, Math.round(value));
const capCore = (value: number) => Math.max(1, Math.round(value));
const capSub = (value: number) => Math.max(1, Math.round(value));
const capStamina = (value: number) => Math.max(1, Math.round(value));

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
    finishing: capDetailed(player.finishing ?? nbaBaseline.finishing ?? ((scaled(offense) + scaled(strength) + scaled(speed)) / 3)),
    handle: capDetailed(player.handle ?? nbaBaseline.handle ?? ((scaled(playmaking) * 0.58) + (scaled(speed) * 0.32) + (scaled(shooting) * 0.10))),
    assist: capDetailed(player.assist ?? nbaBaseline.assist ?? scaled(playmaking)),
    steal: capDetailed(player.steal ?? nbaBaseline.steal ?? ((scaled(defense) * 0.58) + (scaled(speed) * 0.42))),
    block: capDetailed(player.block ?? nbaBaseline.block ?? ((scaled(defense) * 0.55) + (scaled(strength) * 0.45))),
    rebound: capDetailed(player.rebound ?? nbaBaseline.rebound ?? ((scaled(strength) * 0.58) + (scaled(defense) * 0.42))),
    onBall: capDetailed(player.onBall ?? nbaBaseline.onBall ?? ((scaled(defense) * 0.70) + (scaled(speed) * 0.30))),
    calm: capDetailed(player.calm ?? nbaBaseline.calm ?? ((scaled(playmaking) * 0.45) + (scaled(player.ovr) * 0.35) + (scaled(shooting) * 0.20))),
  };
};

const getStarTier = (starLevel: number): StarTier => {
  if (!starLevel || starLevel <= 0) return "None";
  const index = starLevel - 1;
  const tierIndex = Math.min(4, Math.floor(index / 5));
  return (["Silver", "Blue", "Violet", "Orange", "Red"] as StarTier[])[tierIndex] ?? "Red";
};

const getStarLevelInTier = (starLevel: number): number => ((Math.max(1, starLevel) - 1) % 5) + 1;

const STAR_ATTRIBUTE_GAIN: Record<StarTier, number> = {
  None: 0,
  Silver: 1,
  Blue: 1,
  Violet: 2,
  Orange: 3,
  Red: 4,
};

export const getStarGrowthGain = (targetStarLevel: number): {
  tier: StarTier;
  levelInTier: number;
  attributeGain: number;
  staminaGain: number;
} => {
  const tier = getStarTier(targetStarLevel);
  return {
    tier,
    levelInTier: tier === "None" ? 0 : getStarLevelInTier(targetStarLevel),
    attributeGain: STAR_ATTRIBUTE_GAIN[tier],
    staminaGain: tier === "None" ? 0 : 2,
  };
};

export const getCumulativeStarGrowthGain = (starLevel: number): {
  attributeGain: number;
  staminaGain: number;
} => {
  let attributeGain = 0;
  let staminaGain = 0;
  for (let star = 1; star <= Math.max(0, starLevel); star++) {
    const gain = getStarGrowthGain(star);
    attributeGain += gain.attributeGain;
    staminaGain += gain.staminaGain;
  }
  return { attributeGain, staminaGain };
};

export const deriveOffenseDefenseFromAttributes = (attributes: DetailedAttributes): { offense: number; defense: number } => {
  const offense = (
    attributes.threePt * 0.20 +
    attributes.twoPt * 0.24 +
    attributes.freeThrow * 0.06 +
    attributes.handle * 0.18 +
    attributes.assist * 0.20 +
    attributes.calm * 0.12
  );

  const defense = (
    attributes.steal * 0.20 +
    attributes.block * 0.20 +
    attributes.rebound * 0.16 +
    attributes.onBall * 0.30 +
    attributes.calm * 0.14
  );

  return {
    offense: capCore(offense),
    defense: capCore(defense),
  };
};

export const getDerivedOffenseDefense = (player: Player): { offense: number; defense: number } => {
  return deriveOffenseDefenseFromAttributes(getDetailedAttributes(player));
};

export const applyStarGrowth = (player: Player, targetStarLevel: number): Player => {
  const currentAppliedLevel = Math.max(0, Math.min(player.starGrowthAppliedLevel ?? (player.starLevel ?? 0), targetStarLevel));
  const currentTotalGrowth = getCumulativeStarGrowthGain(currentAppliedLevel);
  const targetTotalGrowth = getCumulativeStarGrowthGain(targetStarLevel);
  const attributeGain = targetTotalGrowth.attributeGain - currentTotalGrowth.attributeGain;
  const staminaGain = targetTotalGrowth.staminaGain - currentTotalGrowth.staminaGain;
  const current = getDetailedAttributes(player);

  const next: DetailedAttributes = {
    threePt: capDetailed(current.threePt + attributeGain),
    twoPt: capDetailed(current.twoPt + attributeGain),
    freeThrow: capDetailed(current.freeThrow + attributeGain),
    finishing: capDetailed(current.finishing + attributeGain),
    handle: capDetailed(current.handle + attributeGain),
    assist: capDetailed(current.assist + attributeGain),
    steal: capDetailed(current.steal + attributeGain),
    block: capDetailed(current.block + attributeGain),
    rebound: capDetailed(current.rebound + attributeGain),
    onBall: capDetailed(current.onBall + attributeGain),
    calm: capDetailed(current.calm + attributeGain),
  };
  const derived = deriveOffenseDefenseFromAttributes(next);

  return {
    ...player,
    starLevel: targetStarLevel,
    ...next,
    offense: derived.offense,
    defense: derived.defense,
    shooting: capSub((player.shooting ?? 1) + attributeGain),
    playmaking: capSub((player.playmaking ?? 1) + attributeGain),
    speed: capSub((player.speed ?? 1) + attributeGain),
    strength: capSub((player.strength ?? 1) + attributeGain),
    stamina: capStamina((player.stamina ?? 100) + staminaGain),
    starGrowthAppliedLevel: targetStarLevel,
    ovr: player.ovr,
  };
};

export const repairStarGrowth = (player: Player, baseline?: Player): Player => {
  const targetStarLevel = player.starLevel ?? 0;
  if (targetStarLevel <= 0) {
    const derived = getDerivedOffenseDefense(baseline ?? player);
    return { ...player, ...derived, starGrowthAppliedLevel: 0 };
  }

  const targetGrowth = getCumulativeStarGrowthGain(targetStarLevel);
  const expectedStamina = (baseline?.stamina ?? 100) + targetGrowth.staminaGain;
  if (!baseline && player.starGrowthAppliedLevel !== undefined && player.stamina === expectedStamina) return player;
  const repairBase = baseline
    ? {
        ...player,
        offense: baseline.offense,
        defense: baseline.defense,
        shooting: baseline.shooting,
        speed: baseline.speed,
        strength: baseline.strength,
        playmaking: baseline.playmaking,
        threePt: baseline.threePt,
        twoPt: baseline.twoPt,
        freeThrow: baseline.freeThrow,
        finishing: baseline.finishing,
        handle: baseline.handle,
        assist: baseline.assist,
        steal: baseline.steal,
        block: baseline.block,
        rebound: baseline.rebound,
        onBall: baseline.onBall,
        calm: baseline.calm,
        stamina: baseline.stamina ?? 100,
        starGrowthAppliedLevel: 0,
      }
    : {
        ...player,
        stamina: Math.min(player.stamina ?? 100, 100),
        starGrowthAppliedLevel: 0,
      };

  const repaired = applyStarGrowth(repairBase, targetStarLevel);

  return {
    ...player,
    ...repaired,
    stamina: expectedStamina,
    starGrowthAppliedLevel: targetStarLevel,
  };
};
