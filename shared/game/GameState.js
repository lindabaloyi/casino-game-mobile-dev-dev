/**
 * GameState (Shared)
 * Pure functions for game state manipulation.
 * 
 * These are used by all action handlers to ensure consistent state cloning.
 */

const { cloneDeep } = require('../utils/cloneDeep');

// ── Deck utilities ─────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

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
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Create a fresh game state.
 */
function initializeGame() {
  const deck = createDeck();
  const playerHands = [deck.splice(0, 10), deck.splice(0, 10)];
  return {
    deck,
    playerHands,
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1,
    scores: [0, 0],
    turnCounter: 1,
    turnEnded: false,
    moveCount: 0,
    gameOver: false,
    stackCounters: { tempP1: 0, tempP2: 0, buildP1: 0, buildP2: 0 },
  };
}

/**
 * Create a test game state with specific cards.
 */
function initializeTestGame() {
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
  while (player0Cards.length < 10) {
    player0Cards.push(remainingDeck.pop());
  }
  const player1Cards = remainingDeck.splice(0, 10);
  const tableCards = remainingDeck.splice(0, 4);
  return {
    deck: remainingDeck,
    playerHands: [player0Cards, player1Cards],
    tableCards: tableCards,
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1,
    scores: [0, 0],
    turnCounter: 1,
    turnEnded: false,
    moveCount: 0,
    gameOver: false,
    stackCounters: { tempP1: 0, tempP2: 0, buildP1: 0, buildP2: 0 },
  };
}

/**
 * Generate a sequential stack ID.
 */
function generateStackId(state, type, playerIndex) {
  const playerLabel = `P${playerIndex + 1}`;
  const counterKey = `${type}${playerLabel}`;
  if (!state.stackCounters) {
    state.stackCounters = { tempP1: 0, tempP2: 0, buildP1: 0, buildP2: 0 };
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
  const totalPlayers = state.playerHands.length;
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
};
