/**
 * GameState
 * Defines the game state shape and provides initializeGame().
 * Pure data — no networking, no side effects.
 */

// ── Deck ─────────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

/** Map rank string → numeric value (A=1, 2-10=face value) */
function rankValue(rank) {
  if (rank === 'A') return 1;
  return parseInt(rank, 10);
}

/** Create a shuffled 40-card deck (A–10, four suits) */
function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, value: rankValue(rank) });
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a fresh game state.
 * Deals 10 cards to each of the 2 players; 4 cards face-up on the table.
 *
 * State shape:
 * {
 *   deck:            Card[]        remaining draw pile
 *   playerHands:     Card[][]      one array per player
 *   tableCards:      Card[]        cards visible on the table
 *   playerCaptures:  Card[][]      cards each player has captured
 *   currentPlayer:   number        0 or 1 — whose turn it is
 *   round:           number        1 or 2
 *   scores:          number[]      one score per player
 *   turnCounter:     number        increments on every turn end
 *   gameOver:        boolean
 * }
 */
function initializeGame() {
  const deck = createDeck();

  // Deal 10 cards per player
  const playerHands = [
    deck.splice(0, 10),
    deck.splice(0, 10),
  ];

  return {
    deck,
    playerHands,
    tableCards: [],   // table starts empty; cards arrive via player actions
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1,
    scores: [0, 0],
    turnCounter: 1,
    gameOver: false,
  };
}

/**
 * Create a test game state with specific cards for testing.
 * Player 0 gets: three 5's (5♠, 5♥, 5♦) and a 10♣
 * Player 1 gets: random cards
 * Table gets: some loose cards
 */
function initializeTestGame() {
  const fullDeck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      fullDeck.push({ suit, rank, value: rankValue(rank) });
    }
  }

  // Create specific cards for player 0
  const player0Cards = [
    { suit: '♠', rank: '5', value: 5 },
    { suit: '♥', rank: '5', value: 5 },
    { suit: '♦', rank: '5', value: 5 },
    { suit: '♣', rank: '10', value: 10 },
  ];

  // Remove these cards from the full deck
  const remainingDeck = fullDeck.filter(
    c => !(c.rank === '5' && (c.suit === '♠' || c.suit === '♥' || c.suit === '♦')) &&
         !(c.rank === '10' && c.suit === '♣')
  );

  // Shuffle remaining deck
  for (let i = remainingDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remainingDeck[i], remainingDeck[j]] = [remainingDeck[j], remainingDeck[i]];
  }

  // Fill player 0's hand to 10 cards
  while (player0Cards.length < 10) {
    player0Cards.push(remainingDeck.pop());
  }

  // Player 1 gets 10 random cards
  const player1Cards = remainingDeck.splice(0, 10);

  // Table gets 4 loose cards
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
    gameOver: false,
  };
}

/**
 * Return a deep clone of the state (safe to mutate in rule functions).
 */
function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Advance the turn to the next player and increment the counter.
 */
function nextTurn(state) {
  state.currentPlayer = (state.currentPlayer + 1) % 2;
  state.turnCounter += 1;
  return state;
}

module.exports = {
  initializeGame,
  initializeTestGame,
  cloneState,
  nextTurn,
  rankValue,
};
