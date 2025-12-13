/**
 * Finalize Staging Stack Action Handler
 * Player finalizes temporary stack into permanent build
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('FinalizeStagingStack');

function handleFinalizeStagingStack(gameManager, playerIndex, action) {
  const { gameId } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  const { stack, buildValue } = action.payload;

  logger.info('[STAGING_ACCEPT] Starting staging stack finalization', {
    playerIndex,
    stackId: stack.stackId,
    buildValue,
    gameId,
    currentPlayer: gameState.currentPlayer,
    isPlayerTurn: playerIndex === gameState.currentPlayer
  });

  logger.debug('[STAGING_ACCEPT] Stack details', {
    stackOwner: stack.owner,
    stackCards: stack.cards?.map(c => `${c.rank}${c.suit}(${c.source})`) || [],
    stackValue: stack.value,
    handCardCount: stack.cards?.filter(c => c.source === 'hand').length || 0,
    tableCardCount: stack.cards?.filter(c => c.source === 'table').length || 0
  });

  // Find the staging stack
  logger.debug('[STAGING_ACCEPT] Searching for staging stack on table', {
    searchingStackId: stack.stackId,
    tableCardsCount: gameState.tableCards.length,
    tableTempStacks: gameState.tableCards.filter(card =>
      card.type === 'temporary_stack'
    ).map(s => ({
      stackId: s.stackId,
      owner: s.owner
    }))
  });

  const stackIndex = gameState.tableCards.findIndex(card =>
    card.type === 'temporary_stack' && card.stackId === stack.stackId
  );

  if (stackIndex === -1) {
    logger.error('[STAGING_ACCEPT] Staging stack not found - aborting', {
      requestedStackId: stack.stackId,
      availableStacks: gameState.tableCards.filter(card =>
        card.type === 'temporary_stack'
      ).map(s => s.stackId)
    });
    throw new Error('Staging stack not found');
  }

  logger.info('[STAGING_ACCEPT] Staging stack found - proceeding with finalization', {
    stackIndex,
    stackId: stack.stackId,
    buildValue
  });

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

  logger.info('Staging stack finalized into build', {
    buildId: build.buildId,
    value: buildValue,
    cardCount: build.cards.length,
    owner: build.owner,
    newPlayer: newState.currentPlayer
  });

  return newState;
}

module.exports = handleFinalizeStagingStack;
