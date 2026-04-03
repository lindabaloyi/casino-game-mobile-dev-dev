/**
 * Centralized game modes configuration (JavaScript version for server-side use)
 * Single source of truth for all game mode definitions
 */

// Game modes configuration
const GAME_MODES = [
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
    id: 'freeforall',
    key: 'freeforall',
    title: 'Free For All',
    subtitle: 'Free For All',
    description: 'Free for all mode',
    expectedPlayers: 4,
    icon: 'trophy',
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
const getModeById = (id) => {
  return GAME_MODES.find(mode => mode.id === id);
};

const getModeByKey = (key) => {
  return GAME_MODES.find(mode => mode.key === key);
};

const getKeyFromId = (id) => {
  const mode = getModeById(id);
  return mode?.key;
};

const getIdFromKey = (key) => {
  const mode = getModeByKey(key);
  return mode?.id;
};

// Arrays of valid mode IDs and keys for validation
const GAME_MODE_IDS = GAME_MODES.map(mode => mode.id);
const GAME_MODE_KEYS = GAME_MODES.map(mode => mode.key);

// Mode mapping objects for easy lookup
const MODE_ID_TO_KEY = GAME_MODES.reduce(
  (acc, mode) => ({ ...acc, [mode.id]: mode.key }),
  {}
);

const MODE_KEY_TO_ID = GAME_MODES.reduce(
  (acc, mode) => ({ ...acc, [mode.key]: mode.id }),
  {}
);

module.exports = {
  GAME_MODES,
  getModeById,
  getModeByKey,
  getKeyFromId,
  getIdFromKey,
  GAME_MODE_IDS,
  GAME_MODE_KEYS,
  MODE_ID_TO_KEY,
  MODE_KEY_TO_ID,
};