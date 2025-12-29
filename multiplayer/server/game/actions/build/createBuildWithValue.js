/**
 * Create Build With Value Action Handler
 * Creates a permanent build from a staging stack with specific value
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('CreateBuildWithValue');

function handleCreateBuildWithValue(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const { stack, buildValue } = action.payload;

  logger.info('Creating build from staging stack with specific value', {
    playerIndex,
    stackId: stack.stackId,
    buildValue,
    gameId
  });

  // Find the staging stack
  const stackIndex = gameState.tableCards.findIndex(card =>
    card.type === 'temporary_stack' && card.stackId === stack.stackId
  );

  if (stackIndex === -1) {
    throw new Error('Staging stack not found');
  }

  const stagingStack = gameState.tableCards[stackIndex];
  const handCards = stagingStack.cards.filter(card => card.source === 'hand');
  const tableCards = stagingStack.cards.filter(card => card.source === 'table');

  // Create build from staging stack
  const build = {
    type: 'build',
    buildId: `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards: [...handCards, ...tableCards], // All cards included
    value: buildValue,
    owner: stagingStack.owner,
    isExtendable: true
  };

  // Atomic state update
  const newState = {
    ...gameState,
    tableCards: [...gameState.tableCards]
  };

  // Remove staging stack and add build
  newState.tableCards.splice(stackIndex, 1);
  newState.tableCards.push(build);

  // Remove hand cards from player's hand
  newState.playerHands = [...gameState.playerHands];
  newState.playerHands[playerIndex] = gameState.playerHands[playerIndex].filter(handCard =>
    !handCards.some(stackCard => stackCard.rank === handCard.rank && stackCard.suit === handCard.suit)
  );

  // Advance turn
  newState.currentPlayer = (gameState.currentPlayer + 1) % 2;

  logger.info('Build created from staging stack with specified value', {
    buildId: build.buildId,
    value: buildValue,
    cardCount: build.cards.length,
    owner: build.owner,
    newPlayer: newState.currentPlayer
  });

  return newState;
}

module.exports = handleCreateBuildWithValue;
