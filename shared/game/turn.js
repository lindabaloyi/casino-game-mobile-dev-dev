/**
 * Turn Tracking
 * Turn management functions for round-based gameplay
 * 
 * NOTE: These functions mutate the passed state. Always call cloneState
 * before using if you need immutability.
 */

/**
 * Create round player states for turn tracking.
 * @param {number} playerCount - Number of players
 * @returns {object} Map of player index to RoundPlayerState
 */
function createRoundPlayers(playerCount) {
  const roundPlayers = {};
  for (let i = 0; i < playerCount; i++) {
    roundPlayers[i] = {
      playerId: i,
      turnStarted: false,
      turnEnded: false,
      actionTriggered: false,
      actionCompleted: false,
    };
  }
  return roundPlayers;
}

/**
 * Mark a player's turn as started.
 * @param {object} state - Game state
 * @param {number} playerIndex - Player index
 * @returns {object} Updated state
 */
function startPlayerTurn(state, playerIndex) {
  if (!state.roundPlayers) {
    state.roundPlayers = createRoundPlayers(state.playerCount || state.players.length);
  }
  if (!state.roundPlayers[playerIndex]) {
    state.roundPlayers[playerIndex] = {
      playerId: playerIndex,
      turnStarted: false,
      turnEnded: false,
      actionTriggered: false,
      actionCompleted: false,
    };
  }
  state.roundPlayers[playerIndex].turnStarted = true;
  return state;
}

/**
 * Mark a player's turn as ended.
 * @param {object} state - Game state
 * @param {number} playerIndex - Player index
 * @returns {object} Updated state
 */
function endPlayerTurn(state, playerIndex) {
  if (!state.roundPlayers) {
    state.roundPlayers = createRoundPlayers(state.playerCount || state.players.length);
  }
  if (!state.roundPlayers[playerIndex]) {
    state.roundPlayers[playerIndex] = {
      playerId: playerIndex,
      turnStarted: false,
      turnEnded: false,
      actionTriggered: false,
      actionCompleted: false,
    };
  }
  state.roundPlayers[playerIndex].turnEnded = true;
  return state;
}

/**
 * Mark an action as triggered for the current player.
 * @param {object} state - Game state
 * @param {number} playerIndex - Player index
 * @returns {object} Updated state
 */
function triggerAction(state, playerIndex) {
  if (!state.roundPlayers) {
    state.roundPlayers = createRoundPlayers(state.playerCount || state.players.length);
  }
  if (!state.roundPlayers[playerIndex]) {
    state.roundPlayers[playerIndex] = {
      playerId: playerIndex,
      turnStarted: false,
      turnEnded: false,
      actionTriggered: false,
      actionCompleted: false,
    };
  }
  state.roundPlayers[playerIndex].actionTriggered = true;
  state.roundPlayers[playerIndex].actionCompleted = true;
  return state;
}

/**
 * Check if all players have ended their turn.
  * @param {object} state - Game state
  * @returns {boolean} True if all players have turnEnded = true
  */
function allPlayersTurnEnded(state) {
  if (!state.roundPlayers) {
    return false;
  }
  const playerIds = Object.keys(state.roundPlayers);
  if (playerIds.length === 0) {
    return false;
  }

  // FIXED: Skip eliminated players when checking if all turns ended
  const allEnded = playerIds.every(id => {
    const idx = parseInt(id);
    const playerId = `player_${idx}`;
    // Skip eliminated players
    if (state.playerStatuses?.[playerId] === 'ELIMINATED') {
      return true;
    }
    return state.roundPlayers[id].turnEnded === true;
  });
  return allEnded;
}

/**
 * Get the next active player, skipping eliminated players.
 * @param {object} state - Game state
 * @param {number} currentPlayer - Current player index
 * @returns {number} Next active player index
 */
function getNextActivePlayer(state, currentPlayer) {
  const totalPlayers = state.playerCount || state.players?.length || 2;
  let next = (currentPlayer + 1) % totalPlayers;
  const start = next;
  
  // Keep looking until we find an active player
  do {
    const playerId = `player_${next}`;
    if (state.playerStatuses?.[playerId] !== 'ELIMINATED') {
      return next;
    }
    next = (next + 1) % totalPlayers;
  } while (next !== start);
  
  // No other active players, return current
  return currentPlayer;
}

/**
 * Force end turn for a player (used for Round 1 validation or disconnection).
 * @param {object} state - Game state
 * @param {number} playerIndex - Player index
 * @returns {object} Updated state
 */
function forceEndTurn(state, playerIndex) {
  if (!state.roundPlayers) {
    state.roundPlayers = createRoundPlayers(state.playerCount || state.players.length);
  }
  if (!state.roundPlayers[playerIndex]) {
    state.roundPlayers[playerIndex] = {
      playerId: playerIndex,
      turnStarted: false,
      turnEnded: false,
      actionTriggered: false,
      actionCompleted: false,
    };
  }
  state.roundPlayers[playerIndex].turnStarted = true;
  state.roundPlayers[playerIndex].actionTriggered = true;
  state.roundPlayers[playerIndex].actionCompleted = true;
  state.roundPlayers[playerIndex].turnEnded = true;
  return state;
}

/**
 * Reset round players for a new round.
 * @param {object} state - Game state
 * @returns {object} Updated state with fresh roundPlayers
 */
function resetRoundPlayers(state) {
  state.roundPlayers = createRoundPlayers(state.playerCount || state.players.length);
  return state;
}

/**
 * Reset turn flags for all players after a trick is completed.
 * @param {object} state - Game state
 * @returns {object} Updated state with reset turn flags
 */
function resetTurnFlags(state) {
  if (!state.roundPlayers) {
    state.roundPlayers = createRoundPlayers(state.playerCount || state.players.length);
    return state;
  }

  const playerCount = state.playerCount || state.players.length;
  for (let i = 0; i < playerCount; i++) {
    if (state.roundPlayers[i]) {
      state.roundPlayers[i].turnStarted = false;
      state.roundPlayers[i].turnEnded = false;
    }
  }
  return state;
}

/**
 * Party Turn Sequence for 4-player games
 * Order: Team A P1 (0) → Team B P1 (2) → Team A P2 (1) → Team B P2 (3)
 */
const PARTY_TURN_SEQUENCE = [0, 2, 1, 3];

/**
 * Get the party turn sequence for 4-player games.
 * @returns {number[]} Array of player indices in turn order
 */
function getPartyTurnSequence() {
  return PARTY_TURN_SEQUENCE;
}

/**
 * Get the next player in party game turn sequence.
 * Order: Team A P1 (0) → Team B P1 (2) → Team A P2 (1) → Team B P2 (3) → repeat
 * @param {number} currentPlayer - Current player index (0-3)
 * @returns {number} Next player index
 */
function getNextPartyPlayer(currentPlayer) {
  const currentIndex = PARTY_TURN_SEQUENCE.indexOf(currentPlayer);
  
  if (currentIndex === -1) {
    // Not in sequence (shouldn't happen), default to first
    console.warn(`[turn] getNextPartyPlayer: player ${currentPlayer} not in sequence, defaulting to 0`);
    return PARTY_TURN_SEQUENCE[0];
  }
  
  const nextIndex = (currentIndex + 1) % PARTY_TURN_SEQUENCE.length;
  return PARTY_TURN_SEQUENCE[nextIndex];
}

/**
 * Check if game should use party turn order
 * @param {object} state - Game state (optional, for checking gameMode)
 * @returns {boolean} True if party turn order should be used
 */
function isPartyGame(state) {
  // Check if gameMode is 'party' - this applies to all party mode games
  if (state && state.gameMode === 'party') {
    return true;
  }
  // Also check for explicit isPartyMode flag in state
  if (state && state.isPartyMode === true) {
    return true;
  }
  return false;
}

/**
 * Skip a player's turn due to disconnection.
 * Move to next player in sequence.
 * @param {object} state - Game state
 * @param {number} disconnectedPlayerIndex - Index of disconnected player
 * @returns {object} Updated state
 */
function skipDisconnectedPlayer(state, disconnectedPlayerIndex) {
  const totalPlayers = state.players.length;
  let nextPlayer;
  
  if (isPartyGame(state)) {
    nextPlayer = getNextPartyPlayer(disconnectedPlayerIndex);
  } else {
    nextPlayer = (disconnectedPlayerIndex + 1) % totalPlayers;
  }
  
  if (state.roundPlayers && state.roundPlayers[disconnectedPlayerIndex]) {
    state.roundPlayers[disconnectedPlayerIndex].turnSkipped = true;
    state.roundPlayers[disconnectedPlayerIndex].turnEnded = true;
  }
  
  state.currentPlayer = nextPlayer;
  
  return state;
}

/**
 * Advance turn to the next player
 * Also increments turnCounter to track total turns played
 * For party mode (gameMode === 'party'), uses team-based turn order: Team A P1 → Team B P1 → Team A P2 → Team B P2
 * For all other modes (freeforall, three-hands, tournament), uses simple sequential order: 0 → 1 → 2 → 3 (or 0 → 1 → 2 for 3 players)
 * FIXED: Now skips eliminated players in tournament mode
 * @param {object} state - Game state
 * @returns {object} Updated state
 */
function nextTurn(state) {
  const totalPlayers = state.players.length;
  const oldPlayer = state.currentPlayer;
  
  let newPlayer;
  
  // Use party turn order only for party mode (gameMode === 'party')
  // For freeforall, three-hands, tournament - use simple sequential order
  if (isPartyGame(state)) {
    newPlayer = getNextPartyPlayer(oldPlayer);
  } else {
    // FIXED: Use getNextActivePlayer to skip eliminated players in tournament mode
    newPlayer = getNextActivePlayer(state, oldPlayer);
  }

  state.currentPlayer = newPlayer;

  // Increment turnCounter to track round progression
  if (typeof state.turnCounter === 'number') {
    state.turnCounter += 1;
  } else {
    state.turnCounter = 1;
  }

  return state;
}

/**
 * Get the current player index
 * @param {object} state - Game state
 * @returns {number} Current player index
 */
function getCurrentPlayer(state) {
  return state.currentPlayer;
}

/**
 * Check if it's a specific player's turn
 * @param {object} state - Game state
 * @param {number} playerIndex - Player index to check
 * @returns {boolean} True if it's that player's turn
 */
function isPlayerTurn(state, playerIndex) {
  return state.currentPlayer === playerIndex;
}

module.exports = {
  createRoundPlayers,
  startPlayerTurn,
  endPlayerTurn,
  triggerAction,
  allPlayersTurnEnded,
  forceEndTurn,
  resetRoundPlayers,
  resetTurnFlags,
  nextTurn,
  getCurrentPlayer,
  isPlayerTurn,
  // Party turn order exports
  PARTY_TURN_SEQUENCE,
  getPartyTurnSequence,
  getNextPartyPlayer,
  isPartyGame,
  skipDisconnectedPlayer,
};
