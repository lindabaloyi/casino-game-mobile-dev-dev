/**
 * Game Initialization
 * Creates fresh game states for new games
 */

const { STARTING_CARDS_PER_PLAYER, STARTING_CARDS_THREE_HANDS } = require('./constants');
const { createDeck, rankValue } = require('./deck');
const { getTeamFromIndex } = require('./team');
const { createRoundPlayers } = require('./turn');
const { validateCardDistribution } = require('./validation');

/**
 * Determine starting cards based on player count
 * @param {number} playerCount - Number of players
 * @returns {number} Number of cards to deal per player
 */
function getStartingCards(playerCount) {
  return playerCount === 3 ? STARTING_CARDS_THREE_HANDS : STARTING_CARDS_PER_PLAYER;
}

/**
 * Create a fresh game state.
 * @param {number} playerCount - Number of players (2, 3, or 4)
 * @param {boolean} isPartyMode - Whether this is party mode (with teams)
 * @returns {object} Fresh game state
 */
function initializeGame(playerCount = 2, isPartyMode = false) {
  const deck = createDeck();
  const players = [];
  const startingCards = getStartingCards(playerCount);

  // Deal cards to each player
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `player_${i}`,  // PERSISTENT ID - never changes throughout tournament
      index: i,  // Current array index (changes after tournament transitions)
      name: `Player ${i + 1}`,
      hand: deck.splice(0, startingCards),
      captures: [],
      score: 0,
      // Only assign teams in party mode (4-player with 2v2)
      team: isPartyMode ? getTeamFromIndex(i) : null
    });
  }

  // For three-hands mode: place one random card on table as initial trail
  let tableCards = [];
  if (playerCount === 3) {
    const trailCard = deck.splice(0, 1)[0];
    tableCards = [trailCard];
    console.log(`[initialization] Three-hands mode: Initial trail card is ${trailCard.rank}${trailCard.suit}`);
  }

  // Create round players for turn tracking
  const roundPlayers = createRoundPlayers(playerCount);

  const state = {
    deck,
    players,
    tableCards,
    currentPlayer: 0,
    round: 1,
    scores: new Array(playerCount).fill(0),
    teamScores: [0, 0], // [Team A, Team B]
    turnCounter: 1,
    moveCount: 0,
    gameOver: false,
    playerCount,
    // Game mode to help client rendering (party mode has teams, four-hands does not)
    gameMode: isPartyMode ? 'party' : (playerCount === 4 ? 'four-hands' : (playerCount === 3 ? 'three-hands' : 'two-hands')),
    stackCounters: { tempP1: 0, tempP2: 0, tempP3: 0, tempP4: 0, buildP1: 0, buildP2: 0, buildP3: 0, buildP4: 0 },
    // Turn tracking per round
    roundPlayers,
    // Track last capture for end-of-game cleanup
    lastCapturePlayer: null,
    // Track captured teammate builds for cooperative rebuild in party mode
    // Key = player index who can rebuild (the OTHER teammate, not the original builder)
    // Value = array of captured builds
    teamCapturedBuilds: {},
    // Shiya recalls - ephemeral recall offers for each player
    shiyaRecalls: {},
    // Pending shiya button - shows on action strip when teammate captures with matching card
    // { playerIndex: number, recallId: string, expiresAt: number }
    pendingShiya: null,
    // === TOURNAMENT STATE ===
    tournamentMode: null, // 'knockout' or null
    tournamentPhase: null, // 'QUALIFYING' | 'QUALIFICATION_REVIEW' | 'SEMI_FINAL' | 'FINAL_SHOWDOWN' | 'COMPLETED'
    tournamentRound: 0,
    // TOURNAMENT STATE NOW USES PLAYER IDs (e.g., 'player_0', 'player_1') - NOT indices!
    // This persists across all tournament transitions - no more index mapping issues!
    playerStatuses: {}, // { [playerId]: 'ACTIVE' | 'ELIMINATED' | 'SPECTATOR' | 'WINNER' }
    tournamentScores: {}, // { [playerId]: cumulativeScore }
    eliminationOrder: [], // [playerId, playerId, ...]
    finalShowdownHandsPlayed: 0,
    tournamentWinner: null, // playerId of winner
    // Qualification Review Phase
    qualificationCountdown: 0, // seconds remaining in qualification review
    qualifiedPlayers: [], // [playerId1, playerId2] - players advancing to next phase
    qualificationScores: {}, // { [playerId]: { totalPoints, cardPoints, tenDiamondPoints, twoSpadePoints, acePoints, spadeBonus, cardCountBonus } }
  };

  // Validate card distribution
  const validation = validateCardDistribution(state);
  if (!validation.valid) {
    console.error('[initialization] ❌ Card distribution validation FAILED:', validation.errors);
  } else {
    console.log('[initialization] ✅ Card distribution validated - 40 unique cards');
  }

  return state;
}

/**
 * Create a test game state with specific cards.
 * @param {number} playerCount - Number of players (2, 3, or 4)
 * @returns {object} Test game state
 */
function initializeTestGame(playerCount = 2) {
  const { RANKS, SUITS } = require('./constants');
  
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

  const startingCards = getStartingCards(playerCount);
  while (player0Cards.length < startingCards) {
    player0Cards.push(remainingDeck.pop());
  }

  // Create players array with dealt cards
  const players = [];

  // Player 0 gets the special hand
  players.push({
    id: 'player_0',  // PERSISTENT ID
    index: 0,
    name: 'Player 1',
    hand: player0Cards,
    captures: [],
    score: 0,
    team: 'A'
  });

  // Other players get dealt hands
  for (let i = 1; i < playerCount; i++) {
    const hand = remainingDeck.splice(0, startingCards);
    players.push({
      id: `player_${i}`,  // PERSISTENT ID
      index: i,
      name: `Player ${i + 1}`,
      hand,
      captures: [],
      score: 0,
      team: getTeamFromIndex(i)
    });
  }

  // For three-hands mode: place one random card on table as initial trail
  let tableCards;
  if (playerCount === 3) {
    tableCards = [remainingDeck.pop()]; // Take one card for trail
  } else {
    tableCards = remainingDeck.splice(0, 4);
  }

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
    // Turn tracking per round
    roundPlayers,
    // Track last capture for end-of-game cleanup
    lastCapturePlayer: null,
    // Track captured teammate builds for cooperative rebuild in party mode
    // Key = player index who can rebuild (the OTHER teammate, not the original builder)
    // Value = array of captured builds
    teamCapturedBuilds: {},
    // Shiya recalls - ephemeral recall offers for each player
    shiyaRecalls: {},
    // Pending shiya button - shows on action strip when teammate captures with matching card
    // { playerIndex: number, recallId: string, expiresAt: number }
    pendingShiya: null,
  };
}

module.exports = {
  initializeGame,
  initializeTestGame,
};
