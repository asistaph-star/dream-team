export const MATCH_STAMINA_UI_CONFIG = {
  energyDrinkRecovery: 20,
  energyDrinkLockSeconds: 5,
  timeoutRecovery: 5,
} as const;

export const SLOT_POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const;

export const DEFAULT_PLAYER_IMAGES: Record<string, string> = {
  'PG': 'https://www.dreamteamph.com/players/newplayers/hornets/treymann.webp',
  'SG': 'https://www.dreamteamph.com/players/newplayers/timberwolves/anthonyedwards.webp',
  'SF': 'https://www.dreamteamph.com/players/newplayers/knicks/juliusrandle.webp',
  'PF': 'https://www.dreamteamph.com/players/newx/stoudemire.webp',
  'C': 'https://www.dreamteamph.com/players/newplayers/raptors/jakobpoeltl.webp',
};

export const MATCH_PLAYBACK_SPEED = 1.25;
