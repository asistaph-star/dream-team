import { MatchStateDraft } from './matchStateDraft';
import { Player } from '../../types/player';
import { ShotType } from '../../utils/shotEngine';
import { MatchState, Difficulty } from '../../utils/matchTypes';
import { ShotStaminaOutcome, DefensiveEffortType } from '../actionStaminaCosts';
import { mockAiTeams } from '../mockTeams';

export interface PossessionContext {
  draft: MatchStateDraft;
  state: MatchState;

  // Read-only parameters
  newQuarter: number;
  newClock: number;
  userLineup: Player[];
  aiLineup: Player[];
  allUserRoster: Player[];
  aiTeamObj: typeof mockAiTeams[Difficulty];
  userIsHome: boolean;

  clutchSituation: {
    active: boolean;
    intensity: 'high' | 'medium' | 'none';
    scoreDiff: number;
    isUserLeading: boolean;
  };
  homeCourt: {
    userIsHome: boolean;
    homeTeam: 'user' | 'ai';
    crowdEnergy: number;
    rallyMode: boolean;
  };
  momentumBonus: number;
  hasHotUser: boolean;
  hasHotAi: boolean;
  activeOffStrategy: string;
  activeDefStrategy: string;
  userOffStrategy: string;
  userDefStrategy: string;
  aiOffStrategy: string;
  aiDefStrategy: string;
  userScore: number;
  aiScore: number;
  gameTimeSec: number;
  pace: 'fastbreak' | 'early_offense' | 'oreb' | 'late_clock' | 'normal';
  shotClockViolationFired: boolean;
  currentOff: string;
  currentDef: string;
  eUO: number;
  eAD: number;
  eAO: number;
  eUD: number;
  goodSubRatio: number;

  // Usage tracking
  newPossessionHistory: { team: 'user' | 'ai'; playerId: string; wasTOV?: boolean }[];

  // Stamina attempts tracking lists (appended to during play resolution)
  shotStaminaAttempts: Array<{ playerId: string; shotType: ShotType; is3PT: boolean; outcome: ShotStaminaOutcome; context?: 'normal' | 'oreb' }>;
  defensiveStaminaAttempts: Array<{ playerId: string; shotType: ShotType; outcome: ShotStaminaOutcome; is3PT: boolean }>;
  defensiveEffortAttempts: Array<{ playerId: string; type: DefensiveEffortType }>;
  actionWorkloadRebounderId?: string;

  // Mutable output flags/variables
  timeElapsed: number;
  stealPlayerId: string;
  eventIndicator: { playerId: string; type: 'BLK' | 'STL' | 'TOV' | 'REB' | 'OREB' | 'AST' | 'FOL' } | undefined;
  pointsScored: number;
  activePlayerId: string;
  scoringTeamIsUser: boolean;
  nextPossessionTeam: 'user' | 'ai' | null;
  nextLastPlayCategory: MatchState['lastPlayCategory'];
  nonShootingFoulToFT: boolean;
  shootingFoulOccurred: boolean;
  ftSequenceResult: MatchState['ftSequence'];
  pendingAutoSubResult: MatchState['pendingAutoSub'];
  turnoverOccurred: boolean;
  blockOccurred: boolean;
}
