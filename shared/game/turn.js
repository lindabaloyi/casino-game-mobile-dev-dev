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
    console.log(`[turn] Created roundPlayers for ${state.playerCount || state.players.length} players`);
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
  const wasStarted = state.roundPlayers[playerIndex].turnStarted;
  state.roundPlayers[playerIndex].turnStarted = true;
  console.log(`[turn] startPlayerTurn: player ${playerIndex}, turnStarted: ${wasStarted} -> true, turnCounter: ${state.turnCounter}, currentPlayer: ${state.currentPlayer}`);
  return state;
}

/**
 * Mark a player's turn as ended.
 * @param {object} state - Game state
 * @param {number} playerIndex - Player index
 * @returns {object} Updated state
 */
function endPlayerTurn(state, playerIndex) {
  if (state.roundPlayers && state.roundPlayers[playerIndex]) {
    const wasEnded = state.roundPlayers[playerIndex].turnEnded;
    state.roundPlayers[playerIndex].turnEnded = true;
    console.log(`[turn] endPlayerTurn: player ${playerIndex}, turnEnded: ${wasEnded} -> true, turnCounter: ${state.turnCounter}`);
  } else {
    console.log(`[turn] endPlayerTurn: WARNING - no roundPlayers[${playerIndex}], creating...`);
    if (!state.roundPlayers) {
      state.roundPlayers = createRoundPlayers(state.playerCount || state.players.length);
    }
    state.roundPlayers[playerIndex] = {
      playerId: playerIndex,
      turnStarted: false,
      turnEnded: true,
      actionTriggered: false,
      actionCompleted: false,
    };
  }
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
    console.log(`[turn] triggerAction: Created roundPlayers for ${state.playerCount || state.players.length} players`);
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
  const wasTriggered = state.roundPlayers[playerIndex].actionTriggered;
  const wasCompleted = state.roundPlayers[playerIndex].actionCompleted;
  state.roundPlayers[playerIndex].actionTriggered = true;
  state.roundPlayers[playerIndex].actionCompleted = true;
  console.log(`[turn] triggerAction: player ${playerIndex}, actionTriggered: ${wasTriggered} -> true, actionCompleted: ${wasCompleted} -> true, turnCounter: ${state.turnCounter}`);
  return state;
}

/**
 * Check if all players have ended their turn.
 * @param {object} state - Game state
 * @returns {boolean} True if all players have turnEnded = true
 */
function allPlayersTurnEnded(state) {
  if (!state.roundPlayers) {
    console.log(`[turn] allPlayersTurnEnded: roundPlayers is undefined, returning false`);
    return false;
  }
  const playerIds = Object.keys(state.roundPlayers);
  if (playerIds.length === 0) {
    console.log(`[turn] allPlayersTurnEnded: no players in roundPlayers, returning false`);
    return false;
  }

  // Log each player's status
  const statusSummary = playerIds.map(id => {
    const p = state.roundPlayers[id];
    return `${id}:started=${p.turnStarted},ended=${p.turnEnded},triggered=${p.actionTriggered},completed=${p.actionCompleted}`;
  }).join('; ');
  console.log(`[turn] allPlayersTurnEnded: player status: [${statusSummary}]`);

  const allEnded = playerIds.every(id => state.roundPlayers[id].turnEnded === true);
  console.log(`[turn] allPlayersTurnEnded: result = ${allEnded}, turnCounter: ${state.turnCounter}, round: ${state.round}`);
  return allEnded;
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
  // Mark as started if not already
  state.roundPlayers[playerIndex].turnStarted = true;
  // Mark as having taken an action (default/fold)
  state.roundPlayers[playerIndex].actionTriggered = true;
  state.roundPlayers[playerIndex].actionCompleted = true;
  // Mark turn as ended
  state.roundPlayers[playerIndex].turnEnded = true;
  console.log(`[turn] Force ended turn for player ${playerIndex}`);
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
    console.log(`[turn] resetTurnFlags: no roundPlayers, creating...`);
    state.roundPlayers = createRoundPlayers(state.playerCount || state.players.length);
    return state;
  }

  const playerCount = state.playerCount || state.players.length;
  for (let i = 0; i < playerCount; i++) {
    if (state.roundPlayers[i]) {
      state.roundPlayers[i].turnStarted = false;
      state.roundPlayers[i].turnEnded = false;
      // actionTriggered and actionCompleted stay as they were (for scoring)
    }
  }
  console.log(`[turn] resetTurnFlags: reset turn flags for ${playerCount} players`);
  return state;
}

/**
 * Advance turn to the next player
 * Also increments turnCounter to track total turns played
 * @param {object} state - Game state
 * @returns {object} Updated state
 */
function nextTurn(state) {
  const totalPlayers = state.players.length;
  const oldPlayer = state.currentPlayer;
  const newPlayer = (state.currentPlayer + 1) % totalPlayers;

  // Log current state before advancing
  const oldStatus = state.roundPlayers ? Object.entries(state.roundPlayers).map(([id, p]) => `${id}:ended=${p.turnEnded}`).join('; ') : 'no roundPlayers';
  console.log(`[turn] nextTurn: BEFORE - currentPlayer=${oldPlayer} -> ${newPlayer}, turnCounter=${state.turnCounter}, players status: [${oldStatus}]`);

  state.currentPlayer = newPlayer;

  // Increment turnCounter to track round progression
  if (typeof state.turnCounter === 'number') {
    state.turnCounter += 1;
  } else {
    state.turnCounter = 1;
  }

  // Log new state after advancing
  const newStatus = state.roundPlayers ? Object.entries(state.roundPlayers).map(([id, p]) => `${id}:ended=${p.turnEnded}`).join('; ') : 'no roundPlayers';
  console.log(`[turn] nextTurn: AFTER - newPlayer=${newPlayer}, newTurnCounter=${state.turnCounter}, players status: [${newStatus}]`);

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
};
