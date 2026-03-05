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
  
  const state = {
    deck,
    players,
    tableCards: [],
    currentPlayer: 0,
    round: 1,
    scores: new Array(playerCount).fill(0),
    teamScores: [0, 0], // [Team A, Team B]
    turnCounter: 1,
    turnEnded: false,
    moveCount: 0,
    gameOver: false,
    playerCount,
    stackCounters: { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 },
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
  
  return {
    deck: remainingDeck,
    players,
    tableCards: tableCards,
    currentPlayer: 0,
    round: 1,
    scores: new Array(playerCount).fill(0),
    teamScores: [0, 0],
    turnCounter: 1,
    turnEnded: false,
    moveCount: 0,
    gameOver: false,
    playerCount,
    stackCounters: { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 },
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
 */
function nextTurn(state) {
  const totalPlayers = state.players.length;
  state.currentPlayer = (state.currentPlayer + 1) % totalPlayers;
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
};
