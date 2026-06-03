import { BaseSkillName } from "../skills/assignBaseSkills";
import { SpecialSkillFamilyId } from "../skills/skillFamilies";

export type ArchetypeId =
  | "stamina-drain"
  | "foul-draw"
  | "playmaking"
  | "shooting"
  | "rebound"
  | "paint-bully"
  | "gameplan";

export type ArchetypeLevel = 0 | 1 | 2 | 3;
export type ArchetypeLevelLabel = "None" | "Bronze" | "Silver" | "Gold";

export interface ArchetypeDefinition {
  id: ArchetypeId;
  displayName: string;
  candidateSkills: BaseSkillName[];
  enhancers: SpecialSkillFamilyId[];
}

export interface PlayerContribution {
  playerId: string;
  playerName: string;
  contributedSkills: BaseSkillName[];
  lockedGreenSkill: BaseSkillName | null;
}

export interface ArchetypeResult {
  id: ArchetypeId;
  displayName: string;
  level: ArchetypeLevel;
  levelLabel: ArchetypeLevelLabel;
  signalCount: number;
  requiredSignalsForNextLevel: number;
  contributingPlayers: string[]; // List of player names
  playerContributions: PlayerContribution[]; // Detailed per-player contribution
  missingSignalOptions: BaseSkillName[]; // Candidate skills not currently active in the lineup
  matchingEnhancers: SpecialSkillFamilyId[]; // Enhancers currently active in the lineup (matched via family mapping)
}

export interface LineupArchetypeSummary {
  primary: ArchetypeResult | null;
  secondary: ArchetypeResult | null;
  allResults: ArchetypeResult[];
}
