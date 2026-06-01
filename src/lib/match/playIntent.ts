import { ShotType } from "../utils/shotEngine";

export type PlayIntent = 
  | 'transition'
  | 'early_offense'
  | 'pick_and_roll_handler'
  | 'pick_and_roll_roll_man'
  | 'isolation'
  | 'post_up'
  | 'spot_up'
  | 'handoff'
  | 'cut'
  | 'off_screen'
  | 'putback'
  | 'drive'
  | 'catch_and_shoot'
  | 'pull_up'
  | 'late_clock';

export interface PlayIntentMetadata {
  label: string;
  timingSpeedCategory: 'very_fast' | 'fast' | 'medium' | 'slow' | 'very_slow';
  nbaDataCategory: 'play_type' | 'tracking' | 'shooting_dashboard';
  shouldDriveTiming: boolean;
}

export const PLAY_INTENT_CONFIG: Record<PlayIntent, PlayIntentMetadata> = {
  transition: { label: 'Transition', timingSpeedCategory: 'fast', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  early_offense: { label: 'Early Offense', timingSpeedCategory: 'fast', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  putback: { label: 'Putback', timingSpeedCategory: 'very_fast', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  cut: { label: 'Cut', timingSpeedCategory: 'fast', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  spot_up: { label: 'Spot Up', timingSpeedCategory: 'fast', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  handoff: { label: 'Handoff', timingSpeedCategory: 'medium', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  off_screen: { label: 'Off Screen', timingSpeedCategory: 'medium', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  pick_and_roll_handler: { label: 'PnR Handler', timingSpeedCategory: 'medium', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  pick_and_roll_roll_man: { label: 'PnR Roll Man', timingSpeedCategory: 'medium', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  drive: { label: 'Drive', timingSpeedCategory: 'medium', nbaDataCategory: 'tracking', shouldDriveTiming: false },
  catch_and_shoot: { label: 'Catch & Shoot', timingSpeedCategory: 'medium', nbaDataCategory: 'tracking', shouldDriveTiming: false },
  pull_up: { label: 'Pull Up', timingSpeedCategory: 'medium', nbaDataCategory: 'tracking', shouldDriveTiming: false },
  isolation: { label: 'Isolation', timingSpeedCategory: 'slow', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  post_up: { label: 'Post-Up', timingSpeedCategory: 'slow', nbaDataCategory: 'play_type', shouldDriveTiming: true },
  late_clock: { label: 'Late Clock', timingSpeedCategory: 'very_slow', nbaDataCategory: 'shooting_dashboard', shouldDriveTiming: true },
};

/**
 * Maps sub-moves (ShotTypes) to their primary or logical tracking intents.
 * This is metadata only and currently does not affect gameplay logic.
 */
export const SHOT_TYPE_TO_INTENT_MAP: Record<ShotType, PlayIntent> = {
  euroStep: 'drive',
  floater: 'drive',
  pullUpMid: 'pull_up',
  stepBackMid: 'isolation',
  fingerRoll: 'drive',
  drivingLayup: 'drive',
  dunk: 'cut', // Context-dependent, defaulting to cut/finishing action
  fadeaway: 'post_up',
  hookShot: 'post_up',
  powerLayup: 'post_up',
  bankShot: 'post_up',
  putBack: 'putback',
  catchAndShoot: 'catch_and_shoot',
  stepBackThree: 'isolation',
  pullUpThree: 'pull_up',
  cornerThree: 'spot_up',
};
