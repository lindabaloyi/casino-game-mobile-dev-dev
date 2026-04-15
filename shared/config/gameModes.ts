/**
 * Centralized game modes configuration
 * Single source of truth for all game mode definitions
 */

// Base game mode interface
export interface GameMode {
  /** kebab-case ID used in game creation and UI */
  id: string;
  /** camelCase key used for stats */
  key: string;
  /** Display title */
  title: string;
  /** Subtitle for UI */
  subtitle: string;
  /** Description */
  description: string;
  /** Expected number of players */
  expectedPlayers: number;
  /** Icon name */
  icon: string;
  /** Players string for display */
  players: string;
}

// Game modes configuration
export const GAME_MODES: GameMode[] = [
  {
    id: 'two-hands',
    key: 'twoHands',
    title: '2 Hands',
    subtitle: '1v1 Battle',
    description: 'Classic duel against one opponent',
    expectedPlayers: 2,
    icon: 'people',
    players: '2 Players',
  },
  {
    id: 'three-hands',
    key: 'threeHands',
    title: '3 Hands',
    subtitle: '3 Player Battle',
    description: 'Face off against two opponents',
    expectedPlayers: 3,
    icon: 'people',
    players: '3 Players',
  },
  {
    id: 'four-hands',
    key: 'fourHands',
    title: '4 Hands',
    subtitle: '4 Player Battle',
    description: 'Every player for themselves!',
    expectedPlayers: 4,
    icon: 'trophy',
    players: '4 Players',
  },
  {
    id: 'party',
    key: 'party',
    title: '4 Hands Party',
    subtitle: '2v2 Team Battle',
    description: 'Team up with a friend for 2v2',
    expectedPlayers: 4,
    icon: 'people',
    players: '4 Players',
  },
  
    {
    id: 'tournament',
    key: 'tournament',
    title: 'Tournament',
    subtitle: 'Tournament Mode',
    description: 'Competitive tournament play',
    expectedPlayers: 4,
    icon: 'trophy',
    players: '4 Players',
  },
];

// Helper functions for mode conversions
export const getModeById = (id: string): GameMode | undefined => {
  return GAME_MODES.find(mode => mode.id === id);
};

export const getModeByKey = (key: string): GameMode | undefined => {
  return GAME_MODES.find(mode => mode.key === key);
};

export const getKeyFromId = (id: string): string | undefined => {
  const mode = getModeById(id);
  return mode?.key;
};

export const getIdFromKey = (key: string): string | undefined => {
  const mode = getModeByKey(key);
  return mode?.id;
};

// Type definitions for mode IDs and keys
export type GameModeId = typeof GAME_MODES[number]['id'];
export type GameModeKey = typeof GAME_MODES[number]['key'];

// Arrays of valid mode IDs and keys for validation
export const GAME_MODE_IDS: GameModeId[] = GAME_MODES.map(mode => mode.id);
export const GAME_MODE_KEYS: GameModeKey[] = GAME_MODES.map(mode => mode.key);

// Mode mapping objects for easy lookup
export const MODE_ID_TO_KEY: Record<GameModeId, GameModeKey> = GAME_MODES.reduce(
  (acc, mode) => ({ ...acc, [mode.id]: mode.key }),
  {} as Record<GameModeId, GameModeKey>
);

export const MODE_KEY_TO_ID: Record<GameModeKey, GameModeId> = GAME_MODES.reduce(
  (acc, mode) => ({ ...acc, [mode.key]: mode.id }),
  {} as Record<GameModeKey, GameModeId>
);