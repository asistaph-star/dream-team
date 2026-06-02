export type CardEra = "CURRENT" | "PRIME" | "LEGEND";
export type SkillTier = "STANDARD" | "PRIME" | "LEGACY" | "SIGNATURE";
export type DataSource = "CURRENT_SEASON" | "HISTORICAL_SEASON" | "MANUAL_LEGEND";

export interface CardEraMetadata {
  cardEra?: CardEra;
  skillTier?: SkillTier;
  dataSource?: DataSource;
  seasonTag?: string;
  eraLabel?: string;
}
