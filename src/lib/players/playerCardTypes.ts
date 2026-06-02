export type CardEra = "ACTIVE" | "PEAK" | "LEGEND";
export type SkillTier = "ACTIVE" | "X" | "XR" | "XR_ULT";
export type DataSource = "CURRENT_SEASON" | "HISTORICAL_SEASON" | "MANUAL_LEGEND";

export interface CardEraMetadata {
  cardEra?: CardEra;
  skillTier?: SkillTier;
  dataSource?: DataSource;
  seasonTag?: string;
  eraLabel?: string;
}
