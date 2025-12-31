/**
 * Add To Own Build Action Handler
 * Player adds to their own build
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('AddToOwnBuild');

function handleAddToOwnBuild(gameManager, playerIndex, action, gameIdFromRouter) {
  // Handle both payload gameId (from card-drop) and parameter gameId (from game-action)
  const gameId = gameIdFromRouter || action.payload.gameId;
  console.log('[DEBUG-SERVER] addToOwnBuild called:', {
    gameId,
    gameIdFromRouter,
    payloadGameId: action.payload.gameId,
    playerIndex,
    actionType: action.type,
    payloadKeys: Object.keys(action.payload),
    timestamp: new Date().toISOString()
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    console.error('[DEBUG-SERVER] ❌ Game state not found:', {
      gameId,
      availableGames: gameManager ? Array.from(gameManager.activeGames.keys()) : 'no gameManager'
    });
    throw new Error(`Game ${gameId} not found`);
  }

  console.log('[DEBUG-SERVER] ✅ Game state found:', {
    gameId,
    currentPlayer: gameState.currentPlayer,
    tableCardsCount: gameState.tableCards?.length || 0,
    playerHandsCount: gameState.playerHands?.map(h => h.length) || []
  });

  const { draggedItem, buildToAddTo } = action.payload;

  console.log('[DEBUG-SERVER] Processing addToOwnBuild:', {
    draggedCard: draggedItem?.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'no card',
    draggedItemKeys: Object.keys(draggedItem || {}),
    buildId: buildToAddTo?.buildId,
    buildValue: buildToAddTo?.value,
    playerIndex
  });

  logger.info('Adding to own build', {
    playerIndex,
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    buildId: buildToAddTo.buildId,
    fromValue: buildToAddTo.value,
    gameId
  });

  // Find build and verify it's player's
  const buildIndex = gameState.tableCards.findIndex(card =>
    card.type === 'build' && card.buildId === buildToAddTo.buildId && card.owner === playerIndex
  );

  if (buildIndex === -1) {
    throw new Error("Own build not found");
  }

  // Remove card from hand
  const playerHand = gameState.playerHands[playerIndex];
  const handIndex = playerHand.findIndex(c =>
    c.rank === draggedItem.card.rank && c.suit === draggedItem.card.suit
  );

  if (handIndex === -1) {
    throw new Error("Card not found in hand");
  }

  const addedCard = playerHand.splice(handIndex, 1)[0];
  const newBuildValue = buildToAddTo.value + addedCard.value;

  // Extend build
  const extendedBuild = {
    ...buildToAddTo,
    value: newBuildValue,
    cards: [...buildToAddTo.cards, addedCard]
  };

  const newGameState = {
    ...gameState,
    playerHands: gameState.playerHands.map((hand, idx) =>
      idx === playerIndex ? playerHand : hand
    ),
    tableCards: gameState.tableCards.map((card, idx) =>
      idx === buildIndex ? extendedBuild : card
    )
  };

  logger.info('Own build extended successfully', {
    buildId: extendedBuild.buildId,
    newValue: newBuildValue,
    addedCard: `${addedCard.rank}${addedCard.suit}`
  });

  return newGameState;
}

module.exports = handleAddToOwnBuild;
