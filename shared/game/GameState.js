/**
 * GameState (Shared)
 * Pure functions for game state manipulation.
 * 
 * These are used by all action handlers to ensure consistent state cloning.
 */

const { cloneDeep } = require('../utils/cloneDeep');

// ── Constants ─────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const STARTING_CARDS_PER_PLAYER = 10;

// ── Team helpers ─────────────────────────────────────────────────────────────

/**
 * Get team from player index: 0,1 -> 'A', 2,3 -> 'B'
 */
function getTeamFromIndex(playerIndex) {
  return playerIndex < 2 ? 'A' : 'B';
}

/**
 * Get teammate index for 2v2 mode
 */
function getTeammateIndex(playerIndex) {
  if (playerIndex < 0 || playerIndex > 3) return null;
  // Team A: 0↔1, Team B: 2↔3
  return playerIndex < 2 
    ? (playerIndex === 0 ? 1 : 0)
    : (playerIndex === 2 ? 3 : 2);
}

function rankValue(rank) {
  if (rank === 'A') return 1;
  return parseInt(rank, 10);
}

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

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: rankValue(rank) });
    }
  }
  
  // Validate deck has exactly 40 unique cards
  const cardIds = deck.map(c => `${c.rank}${c.suit}`);
  const uniqueIds = new Set(cardIds);
  if (uniqueIds.size !== 40) {
    console.error(`[GameState] ❌ Deck validation failed: expected 40 unique cards, got ${uniqueIds.size}`);
  } else {
    console.log(`[GameState] ✅ Deck created with 40 unique cards`);
  }
  
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
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
    console.log(`[GameState] Created roundPlayers for ${state.playerCount || state.players.length} players`);
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
  console.log(`[GameState] startPlayerTurn: player ${playerIndex}, turnStarted: ${wasStarted} -> true, turnCounter: ${state.turnCounter}, currentPlayer: ${state.currentPlayer}`);
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
    console.log(`[GameState] endPlayerTurn: player ${playerIndex}, turnEnded: ${wasEnded} -> true, turnCounter: ${state.turnCounter}`);
  } else {
    console.log(`[GameState] endPlayerTurn: WARNING - no roundPlayers[${playerIndex}], creating...`);
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
    console.log(`[GameState] triggerAction: Created roundPlayers for ${state.playerCount || state.players.length} players`);
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
  console.log(`[GameState] triggerAction: player ${playerIndex}, actionTriggered: ${wasTriggered} -> true, actionCompleted: ${wasCompleted} -> true, turnCounter: ${state.turnCounter}`);
  return state;
}

/**
 * Check if all players have ended their turn.
 * @param {object} state - Game state
 * @returns {boolean} True if all players have turnEnded = true
 */
function allPlayersTurnEnded(state) {
  if (!state.roundPlayers) {
    console.log(`[GameState] allPlayersTurnEnded: roundPlayers is undefined, returning false`);
    return false;
  }
  const playerIds = Object.keys(state.roundPlayers);
  if (playerIds.length === 0) {
    console.log(`[GameState] allPlayersTurnEnded: no players in roundPlayers, returning false`);
    return false;
  }
  
  // Log each player's status
  const statusSummary = playerIds.map(id => {
    const p = state.roundPlayers[id];
    return `${id}:started=${p.turnStarted},ended=${p.turnEnded},triggered=${p.actionTriggered},completed=${p.actionCompleted}`;
  }).join('; ');
  console.log(`[GameState] allPlayersTurnEnded: player status: [${statusSummary}]`);
  
  const allEnded = playerIds.every(id => state.roundPlayers[id].turnEnded === true);
  console.log(`[GameState] allPlayersTurnEnded: result = ${allEnded}, turnCounter: ${state.turnCounter}, round: ${state.round}`);
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
  console.log(`[GameState] Force ended turn for player ${playerIndex}`);
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
 * This is called when all players have ended their turn (trick complete).
 * @param {object} state - Game state
 * @returns {object} Updated state with reset turn flags
 */
function resetTurnFlags(state) {
  if (!state.roundPlayers) {
    console.log(`[GameState] resetTurnFlags: no roundPlayers, creating...`);
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
  console.log(`[GameState] resetTurnFlags: reset turn flags for ${playerCount} players`);
  return state;
}

/**
 * Start the next round by dealing cards from the remaining deck.
 * For 2-player mode: allows up to 2 rounds total
 * For 4-player mode: returns null (no Round 2 allowed - game ends after Round 1)
 * 
 * @param {object} state - Current game state
 * @param {number} playerCount - Number of players (2 or 4)
 * @returns {object|null} Updated state for next round, or null if no more rounds allowed
 */
function startNextRound(state, playerCount) {
  console.log(`[GameState] startNextRound: current round=${state.round}, playerCount=${playerCount}`);
  
  // For 4-player: only 1 round allowed (no Round 2)
  if (playerCount >= 4) {
    console.log('[GameState] startNextRound: 4-player mode, no Round 2 allowed, returning null');
    return null;
  }
  
  // For 2-player: allow up to 2 rounds
  if (state.round >= 2) {
    console.log('[GameState] startNextRound: Round 2 already completed, returning null');
    return null;
  }
  
  // Check if we have enough cards in the deck
  const cardsNeeded = playerCount * STARTING_CARDS_PER_PLAYER; // 20 for 2-player
  if (state.deck.length < cardsNeeded) {
    console.log(`[GameState] startNextRound: Not enough cards in deck (have ${state.deck.length}, need ${cardsNeeded}), returning null`);
    return null;
  }
  
  console.log(`[GameState] startNextRound: Dealing 10 new cards to each player from remaining deck (${state.deck.length} cards left)`);
  
  // Deal 10 new cards to each player from remaining deck
  const newPlayers = state.players.map(player => {
    const newHand = state.deck.splice(0, STARTING_CARDS_PER_PLAYER);
    return {
      ...player,
      hand: newHand,
      // Keep captures from previous round
    };
  });
  
  console.log(`[GameState] startNextRound: New hands dealt, deck now has ${state.deck.length} cards`);
  
  // Return updated state for next round
  const newState = {
    ...state,
    deck: state.deck,
    players: newPlayers,
    tableCards: [],
    currentPlayer: 0,
    round: state.round + 1,
    turnCounter: 1,
    moveCount: 0,
    // Reset round players for turn tracking
    roundPlayers: createRoundPlayers(playerCount),
  };
  
  console.log(`[GameState] startNextRound: Round ${newState.round} initialized with fresh hands`);
  
  return newState;
}

/**
 * Validate card distribution - ensure no duplicates across players
 * @param {object} state - Game state to validate
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateCardDistribution(state) {
  const errors = [];
  const allCards = [];
  
  // Collect all cards from all players
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    for (const card of player.hand) {
      const cardId = `${card.rank}${card.suit}`;
      if (allCards.includes(cardId)) {
        errors.push(`DUPLICATE: ${cardId} found in player ${i}'s hand (was already in another player's hand)`);
      }
      allCards.push(cardId);
    }
    for (const card of player.captures) {
      const cardId = `${card.rank}${card.suit}`;
      if (allCards.includes(cardId)) {
        errors.push(`DUPLICATE: ${cardId} found in player ${i}'s captures`);
      }
      allCards.push(cardId);
    }
  }
  
  // Check table cards
  for (const card of state.tableCards) {
    const cardId = `${card.rank}${card.suit}`;
    if (allCards.includes(cardId)) {
      errors.push(`DUPLICATE: ${cardId} found on table`);
    }
    allCards.push(cardId);
  }
  
  // Check deck cards
  for (const card of state.deck) {
    const cardId = `${card.rank}${card.suit}`;
    if (allCards.includes(cardId)) {
      errors.push(`DUPLICATE: ${cardId} found in deck`);
    }
    allCards.push(cardId);
  }
  
  // Total should be exactly 40 (no more, no less)
  if (allCards.length !== 40) {
    errors.push(`CARD COUNT: Expected 40 unique cards, got ${allCards.length}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a fresh game state.
 * @param {number} playerCount - Number of players (2 or 4)
 */
function initializeGame(playerCount = 2) {
  const deck = createDeck();
  const players = [];
  
  // Deal cards to each player
  for (let i = 0; i < playerCount; i++) {
    const hand = deck.splice(0, STARTING_CARDS_PER_PLAYER);
    players.push({
      id: i,
      name: `Player ${i + 1}`,
      hand,
      captures: [],
      score: 0,
      team: getTeamFromIndex(i)
    });
  }
  
  // Create round players for turn tracking
  const roundPlayers = createRoundPlayers(playerCount);
  
  const state = {
    deck,
    players,
    tableCards: [],
    currentPlayer: 0,
    round: 1,
    scores: new Array(playerCount).fill(0),
    teamScores: [0, 0], // [Team A, Team B]
    turnCounter: 1,
    moveCount: 0,
    gameOver: false,
    playerCount,
    stackCounters: { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 },
    // NEW: Turn tracking per round
    roundPlayers,
  };
  
  // Validate card distribution
  const validation = validateCardDistribution(state);
  if (!validation.valid) {
    console.error('[GameState] ❌ Card distribution validation FAILED:', validation.errors);
  } else {
    console.log('[GameState] ✅ Card distribution validated - 40 unique cards');
  }
  
  return state;
}

/**
 * Create a test game state with specific cards.
 * @param {number} playerCount - Number of players (2 or 4)
 */
function initializeTestGame(playerCount = 2) {
  const fullDeck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      fullDeck.push({ suit, rank, value: rankValue(rank) });
    }
  }
  const player0Cards = [
    { suit: '♠', rank: '5', value: 5 },
    { suit: '♥', rank: '5', value: 5 },
    { suit: '♦', rank: '5', value: 5 },
    { suit: '♣', rank: '10', value: 10 },
  ];
  const remainingDeck = fullDeck.filter(
    c => !(c.rank === '5' && (c.suit === '♠' || c.suit === '♥' || c.suit === '♦')) &&
         !(c.rank === '10' && c.suit === '♣')
  );
  for (let i = remainingDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingDeck[i], remainingDeck[j]] = [remainingDeck[j], remainingDeck[i]];
  }
  while (player0Cards.length < STARTING_CARDS_PER_PLAYER) {
    player0Cards.push(remainingDeck.pop());
  }
  
  // Create players array with dealt cards
  const players = [];
  
  // Player 0 gets the special hand
  players.push({
    id: 0,
    name: 'Player 1',
    hand: player0Cards,
    captures: [],
    score: 0,
    team: 'A'
  });
  
  // Other players get dealt hands
  for (let i = 1; i < playerCount; i++) {
    const hand = remainingDeck.splice(0, STARTING_CARDS_PER_PLAYER);
    players.push({
      id: i,
      name: `Player ${i + 1}`,
      hand,
      captures: [],
      score: 0,
      team: getTeamFromIndex(i)
    });
  }
  
  const tableCards = remainingDeck.splice(0, 4);
  
  // Create round players for turn tracking
  const roundPlayers = createRoundPlayers(playerCount);
  
  return {
    deck: remainingDeck,
    players,
    tableCards: tableCards,
    currentPlayer: 0,
    round: 1,
    scores: new Array(playerCount).fill(0),
    teamScores: [0, 0],
    turnCounter: 1,
    moveCount: 0,
    gameOver: false,
    playerCount,
    stackCounters: { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 },
    // NEW: Turn tracking per round
    roundPlayers,
  };
}

/**
 * Generate a sequential stack ID.
 */
function generateStackId(state, type, playerIndex) {
  const playerLabel = `P${playerIndex + 1}`;
  const counterKey = `${type}${playerLabel}`;
  if (!state.stackCounters) {
    state.stackCounters = { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 };
  }
  state.stackCounters[counterKey] = (state.stackCounters[counterKey] || 0) + 1;
  const num = state.stackCounters[counterKey];
  const numStr = num.toString().padStart(2, '0');
  return `${type}${playerLabel}_${numStr}`;
}

/**
 * Deep clone game state for pure function updates
 */
function cloneState(state) {
  return cloneDeep(state);
}

/**
 * Advance turn to the next player
 * Also increments turnCounter to track total turns played
 */
function nextTurn(state) {
  const totalPlayers = state.players.length;
  const oldPlayer = state.currentPlayer;
  const newPlayer = (state.currentPlayer + 1) % totalPlayers;
  
  // Log current state before advancing
  const oldStatus = state.roundPlayers ? Object.entries(state.roundPlayers).map(([id, p]) => `${id}:ended=${p.turnEnded}`).join('; ') : 'no roundPlayers';
  console.log(`[GameState] nextTurn: BEFORE - currentPlayer=${oldPlayer} -> ${newPlayer}, turnCounter=${state.turnCounter}, players status: [${oldStatus}]`);
  
  state.currentPlayer = newPlayer;
  
  // Increment turnCounter to track round progression
  // This is used by RoundValidator to detect when all players have played
  if (typeof state.turnCounter === 'number') {
    state.turnCounter += 1;
  } else {
    state.turnCounter = 1;
  }
  
  // Log new state after advancing
  const newStatus = state.roundPlayers ? Object.entries(state.roundPlayers).map(([id, p]) => `${id}:ended=${p.turnEnded}`).join('; ') : 'no roundPlayers';
  console.log(`[GameState] nextTurn: AFTER - newPlayer=${newPlayer}, newTurnCounter=${state.turnCounter}, players status: [${newStatus}]`);
  
  return state;
}

/**
 * Get the current player index
 */
function getCurrentPlayer(state) {
  return state.currentPlayer;
}

/**
 * Check if it's a specific player's turn
 */
function isPlayerTurn(state, playerIndex) {
  return state.currentPlayer === playerIndex;
}

module.exports = {
  initializeGame,
  initializeTestGame,
  cloneState,
  nextTurn,
  getCurrentPlayer,
  isPlayerTurn,
  generateStackId,
  getTeamFromIndex,
  getTeammateIndex,
  validateCardDistribution,
  // NEW: Turn tracking functions
  createRoundPlayers,
  startPlayerTurn,
  endPlayerTurn,
  triggerAction,
  allPlayersTurnEnded,
  forceEndTurn,
  resetRoundPlayers,
  resetTurnFlags,
  // NEW: Round transition function
  startNextRound,
};
