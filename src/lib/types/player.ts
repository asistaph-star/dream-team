import { Equipment, EquipmentSlot } from './item';
import { BaseSkillName } from "../skills/assignBaseSkills";
import { CardEra, SkillTier, DataSource } from "../players/playerCardTypes";

export type PlayerPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
export type PlayerRarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';

export interface NbaSeasonStats {
  season: string;
  seasonType?: 'Regular Season' | 'Playoffs' | 'Preseason';
  source?: 'NBA.com Stats';
  sourceUrl?: string;
  gamesPlayed?: number;
  minutesPerGame?: number;
  pointsPerGame?: number;
  reboundsPerGame?: number;
  assistsPerGame?: number;
  stealsPerGame?: number;
  blocksPerGame?: number;
  turnoversPerGame?: number;
  foulsPerGame?: number;
  fgPct?: number;
  fieldGoalsMadePerGame?: number;
  fieldGoalsAttemptedPerGame?: number;
  twoPct?: number;
  twoMadePerGame?: number;
  twoAttemptedPerGame?: number;
  threePct?: number;
  threeMadePerGame?: number;
  threeAttemptedPerGame?: number;
  ftPct?: number;
  freeThrowsMadePerGame?: number;
  freeThrowsAttemptedPerGame?: number;
  usagePct?: number;
  trueShootingPct?: number;
  offensiveReboundPct?: number;
  defensiveReboundPct?: number;
  paintPointsPerGame?: number;
  secondChancePointsPerGame?: number;
  fastBreakPointsPerGame?: number;
  deflectionsPerGame?: number;
  contestedShotsPerGame?: number;
  looseBallsRecoveredPerGame?: number;
  chargesDrawn?: number;
}

export interface Player {
  id: string;
  name: string;
  position: PlayerPosition;
  rarity: PlayerRarity;
  level: number;
  maxLevel: number;
  exp: number;
  ovr: number; // Overall Rating
  offense: number; // Individual Offense stat
  defense: number; // Individual Defense stat
  shooting: number;
  speed: number;
  strength: number;
  playmaking: number;
  threePt?: number;
  twoPt?: number;
  freeThrow?: number;
  finishing?: number;
  handle?: number;
  assist?: number;
  steal?: number;
  block?: number;
  rebound?: number;
  onBall?: number;
  calm?: number;
  // Tendencies (Phase Scoring-3B)
  threePtTendency?: number;
  driveTendency?: number;
  pullUpTendency?: number;
  foulDrawTendency?: number;
  equipped?: Partial<Record<EquipmentSlot, Equipment>>; // Equipped gear
  imageUrl?: string;
  // Stats & Economy details (from screenshot)
  team?: string;
  stamina?: number;
  baseSalary?: number;
  salary?: number;
  price?: number;
  priceTrend?: 'up' | 'down' | 'stable';
  ppg?: number;
  rpg?: number;
  apg?: number;
  spg?: number;
  bpg?: number;
  topg?: number;
  pfpg?: number;
  currentSeasonStats?: NbaSeasonStats;
  isInjured?: boolean;
  injuryName?: string;
  quantity?: number;    // default 1 — copies owned
  starLevel?: number;   // default 0 — ascension rank (0 to 5)
  starGrowthAppliedLevel?: number; // migration guard for applied star-up stat bonuses
  
  // Skill system (Phase 0a)
  baseSkills?: [string, string, string];
  specialSkillSlots?: (string | null)[];
  skillRarities?: Record<string, 'Common' | 'Rare' | 'Elite' | 'Epic' | 'Legendary'>;
  skillTiers?: Record<string, 'Base' | 'X' | 'XR' | 'XR-ULT'>;

  // Era & Metadata (Phase 2A)
  cardEra?: CardEra;
  skillTier?: SkillTier;
  dataSource?: DataSource;
  seasonTag?: string;
  eraLabel?: string;
}
