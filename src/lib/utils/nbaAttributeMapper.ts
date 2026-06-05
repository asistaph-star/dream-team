import { NbaSeasonStats, Player } from "@/lib/types/player";

export const NBA_STATS_SOURCES = {
  players: "https://www.nba.com/stats/players",
  traditional: "https://www.nba.com/stats/players/traditional",
  shooting: "https://www.nba.com/stats/players/shooting",
  shotDashboard: "https://www.nba.com/stats/players/shots-general",
  defenseDashboard: "https://www.nba.com/stats/players/defense-dash-overall",
  tracking: "https://www.nba.com/stats/players/passing",
  hustle: "https://www.nba.com/stats/players/hustle",
  boxOuts: "https://www.nba.com/stats/players/box-outs",
} as const;

export type NbaAttributeSource = {
  season: string;
  seasonType: string;
  source: "NBA.com Stats";
  urls: string[];
  fieldsUsed: string[];
};

export type NbaDerivedAttributes = {
  threePt: number;
  twoPt: number;
  freeThrow: number;
  finishing: number;
  handle: number;
  assist: number;
  steal: number;
  block: number;
  rebound: number;
  onBall: number;
  calm: number;
  basketballIQ: number;
  hustle: number;
  source: NbaAttributeSource;
};

const clamp = (value: number, min = 25) => Math.max(min, Math.round(value));
const pct = (value?: number): number | undefined => {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return value <= 1 ? value * 100 : value;
};
const perGame = (value?: number, fallback = 0): number => value ?? fallback;
const rating = (value: number, elite: number, floor = 45, ceiling = 185): number => {
  const normalized = floor + (value / Math.max(0.1, elite)) * (ceiling - floor);
  return clamp(normalized);
};
const blend = (...parts: [number, number][]): number => parts.reduce((sum, [value, weight]) => sum + value * weight, 0);

export const getPlayerNbaSeasonStats = (player: Player): NbaSeasonStats => ({
  season: player.currentSeasonStats?.season ?? "2025-26",
  seasonType: player.currentSeasonStats?.seasonType ?? "Regular Season",
  source: "NBA.com Stats",
  sourceUrl: player.currentSeasonStats?.sourceUrl ?? NBA_STATS_SOURCES.players,
  gamesPlayed: player.currentSeasonStats?.gamesPlayed,
  minutesPerGame: player.currentSeasonStats?.minutesPerGame,
  pointsPerGame: player.currentSeasonStats?.pointsPerGame ?? player.ppg,
  reboundsPerGame: player.currentSeasonStats?.reboundsPerGame ?? player.rpg,
  assistsPerGame: player.currentSeasonStats?.assistsPerGame ?? player.apg,
  stealsPerGame: player.currentSeasonStats?.stealsPerGame ?? player.spg,
  blocksPerGame: player.currentSeasonStats?.blocksPerGame ?? player.bpg,
  turnoversPerGame: player.currentSeasonStats?.turnoversPerGame ?? player.topg,
  foulsPerGame: player.currentSeasonStats?.foulsPerGame ?? player.pfpg,
  fgPct: player.currentSeasonStats?.fgPct,
  fieldGoalsMadePerGame: player.currentSeasonStats?.fieldGoalsMadePerGame,
  fieldGoalsAttemptedPerGame: player.currentSeasonStats?.fieldGoalsAttemptedPerGame,
  twoPct: player.currentSeasonStats?.twoPct,
  twoMadePerGame: player.currentSeasonStats?.twoMadePerGame,
  twoAttemptedPerGame: player.currentSeasonStats?.twoAttemptedPerGame,
  threePct: player.currentSeasonStats?.threePct,
  threeMadePerGame: player.currentSeasonStats?.threeMadePerGame,
  threeAttemptedPerGame: player.currentSeasonStats?.threeAttemptedPerGame,
  ftPct: player.currentSeasonStats?.ftPct,
  usagePct: player.currentSeasonStats?.usagePct,
  trueShootingPct: player.currentSeasonStats?.trueShootingPct,
  offensiveReboundPct: player.currentSeasonStats?.offensiveReboundPct,
  defensiveReboundPct: player.currentSeasonStats?.defensiveReboundPct,
  paintPointsPerGame: player.currentSeasonStats?.paintPointsPerGame,
  secondChancePointsPerGame: player.currentSeasonStats?.secondChancePointsPerGame,
  fastBreakPointsPerGame: player.currentSeasonStats?.fastBreakPointsPerGame,
  deflectionsPerGame: player.currentSeasonStats?.deflectionsPerGame,
  contestedShotsPerGame: player.currentSeasonStats?.contestedShotsPerGame,
  looseBallsRecoveredPerGame: player.currentSeasonStats?.looseBallsRecoveredPerGame,
  chargesDrawn: player.currentSeasonStats?.chargesDrawn,
});

export const deriveAttributesFromNbaStats = (player: Player): NbaDerivedAttributes => {
  const stats = getPlayerNbaSeasonStats(player);
  const ppg = perGame(stats.pointsPerGame);
  const rpg = perGame(stats.reboundsPerGame);
  const apg = perGame(stats.assistsPerGame);
  const spg = perGame(stats.stealsPerGame);
  const bpg = perGame(stats.blocksPerGame);
  const topg = perGame(stats.turnoversPerGame, 2);
  const pfpg = perGame(stats.foulsPerGame, 2.2);
  const mpg = perGame(stats.minutesPerGame, 28);
  const fgPct = pct(stats.fgPct) ?? Math.max(40, Math.min(65, 42 + ppg * 0.45));
  const twoPct = pct(stats.twoPct) ?? fgPct;
  const threePct = pct(stats.threePct) ?? Math.max(25, Math.min(45, 29 + (player.shooting ?? 75) * 0.12));
  const threeMakes = perGame(stats.threeMadePerGame, Math.max(0, ((player.shooting ?? 75) - 65) / 12));
  const threeAttempts = perGame(stats.threeAttemptedPerGame, threeMakes * 2.7);
  const ftPct = pct(stats.ftPct) ?? Math.max(55, Math.min(92, 58 + (player.shooting ?? 75) * 0.34));
  const tsPct = pct(stats.trueShootingPct) ?? Math.min(70, fgPct * 0.78 + threePct * 0.20 + ftPct * 0.10);
  const usagePct = pct(stats.usagePct) ?? Math.min(34, 15 + ppg * 0.45);
  const paint = perGame(stats.paintPointsPerGame, Math.max(0, ppg * (player.position === "C" || player.position === "PF" ? 0.45 : 0.28)));
  const secondChance = perGame(stats.secondChancePointsPerGame, rpg * 0.22);
  const fastBreak = perGame(stats.fastBreakPointsPerGame, Math.max(0, (player.speed ?? 75) / 35));
  const deflections = perGame(stats.deflectionsPerGame, spg * 1.7);
  const contests = perGame(stats.contestedShotsPerGame, bpg * 4 + rpg * 0.25);
  const looseBalls = perGame(stats.looseBallsRecoveredPerGame, spg * 0.7);
  const orbPct = pct(stats.offensiveReboundPct) ?? Math.max(1, secondChance * 2.2);
  const drbPct = pct(stats.defensiveReboundPct) ?? Math.max(5, rpg * 1.6);

  const threeVolume = rating(threeMakes + threeAttempts * 0.18, 5.2, 40, 175);
  const threeEfficiency = rating(threePct, 45, 35, 180);
  const twoVolume = rating(ppg - threeMakes * 3, 24, 45, 180);
  const rimPressure = rating(paint + secondChance * 0.7, 16, 40, 185);
  const playSecurity = rating(apg / Math.max(0.8, topg), 3.6, 45, 175);
  const activityDefense = rating(spg + deflections * 0.35 + looseBalls * 0.55, 4.6, 45, 185);
  const rimDefense = rating(bpg + contests * 0.18, 4.4, 45, 190);
  const rebounding = rating(rpg + orbPct * 0.18 + drbPct * 0.11, 16, 45, 190);
  const foulControl = rating(4.0 - Math.min(4, pfpg), 3.2, 50, 180);

  return {
    threePt: clamp(blend([threeVolume, 0.45], [threeEfficiency, 0.45], [rating(tsPct, 67, 40, 170), 0.10])),
    twoPt: clamp(blend([twoVolume, 0.38], [rimPressure, 0.32], [rating(twoPct, 68, 40, 185), 0.22], [rating(fgPct, 62, 40, 170), 0.08])),
    freeThrow: clamp(blend([rating(ftPct, 92, 45, 185), 0.80], [rating(usagePct, 34, 40, 170), 0.20])),
    finishing: clamp(blend([rimPressure, 0.65], [rating(twoPct, 68, 40, 185), 0.20], [rating(fastBreak, 6, 40, 170), 0.15])),
    handle: clamp(blend([rating(apg, 10, 45, 180), 0.30], [playSecurity, 0.45], [rating(fastBreak, 6, 40, 170), 0.25])),
    assist: clamp(blend([rating(apg, 10, 45, 190), 0.72], [playSecurity, 0.28])),
    steal: activityDefense,
    block: rimDefense,
    rebound: rebounding,
    onBall: clamp(blend([activityDefense, 0.45], [foulControl, 0.25], [rating(mpg, 36, 45, 170), 0.30])),
    calm: clamp(blend([playSecurity, 0.40], [rating(ftPct, 92, 45, 180), 0.25], [rating(tsPct, 67, 45, 180), 0.20], [foulControl, 0.15])),
    basketballIQ: clamp(blend(
      [playSecurity, 0.35],
      [rating(tsPct, 67, 45, 180), 0.25],
      [foulControl, 0.20],
      [rating(contests * 0.3 + deflections * 0.25, 4.0, 45, 170), 0.20]
    )),
    hustle: clamp(blend(
      [rating(looseBalls, 2.0, 40, 180), 0.25],
      [rating(contests, 8.0, 40, 180), 0.25],
      [rating(deflections, 4.0, 40, 180), 0.25],
      [rating((stats.chargesDrawn ?? 0) / Math.max(1, stats.gamesPlayed ?? 60), 0.15, 40, 170), 0.10],
      [rating(fastBreak, 6, 40, 170), 0.15]
    )),
    source: {
      season: stats.season,
      seasonType: stats.seasonType ?? "Regular Season",
      source: "NBA.com Stats",
      urls: [
        NBA_STATS_SOURCES.traditional,
        NBA_STATS_SOURCES.shooting,
        NBA_STATS_SOURCES.shotDashboard,
        NBA_STATS_SOURCES.defenseDashboard,
        NBA_STATS_SOURCES.hustle,
      ],
      fieldsUsed: [
        "PTS", "REB", "AST", "STL", "BLK", "TOV", "PF", "FGM", "FGA", "FG%", "2P%", "3P%", "3PM", "3PA", "FT%",
        "USG%", "TS%", "OREB%", "DREB%", "Paint PTS", "2nd Chance PTS", "Fast Break PTS",
        "Deflections", "Contested Shots", "Loose Balls Recovered", "Charges Drawn",
      ],
    },
  };
};
