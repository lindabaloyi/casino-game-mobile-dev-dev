/**
 * Create Build Augmentation Staging Stack Action Handler
 * Player creates build augmentation staging stack by dropping hand card on loose table card when they have an active build
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('CreateBuildAugmentationStagingStack');

function handleCreateBuildAugmentationStagingStack(gameManager, playerIndex, action, gameId) {
  const { source, card: draggedCard, targetIndex, isTableToTable } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[BUILD_AUGMENT_STAGING] 🏗️ CREATE BUILD AUGMENTATION STAGING STACK STARTED:', {
    playerIndex,
    gameId,
    source,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetIndex,
    isTableToTable,
    timestamp: new Date().toISOString()
  });

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  logger.info('Creating build augmentation staging stack', {
    playerIndex,
    source,
    isTableToTable,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetIndex,
    gameId
  });

  // ✅ CRITICAL: Add null checks to prevent server crashes
  if (!gameState) {
    const error = new Error(`Game ${gameId} not found`);
    logger.error('Build augmentation staging creation failed - game not found', { gameId, playerIndex });
    throw error;
  }

  if (!gameState.tableCards) {
    const error = new Error(`Game ${gameId} has no table cards`);
    logger.error('Build augmentation staging creation failed - no table cards', { gameId, playerIndex });
    throw error;
  }

  // Find the target table card at the specified index
  if (targetIndex >= gameState.tableCards.length) {
    const error = new Error("Target table card not found at specified index.");
    logger.error('Build augmentation staging creation failed - invalid target index', { targetIndex, tableCardsCount: gameState.tableCards.length });
    throw error;
  }

  const targetCard = gameState.tableCards[targetIndex];
  if (!targetCard || targetCard.type === 'temporary_stack') {
    const error = new Error("Target card is not a valid loose card.");
    logger.error('Build augmentation staging creation failed - invalid target card', { targetCard, targetIndex });
    throw error;
  }

  // Validate dragged card from hand (build augmentation only supports hand cards)
  if (source !== 'hand') {
    const error = new Error("Build augmentation staging only supports hand cards.");
    logger.error('Build augmentation staging creation failed - invalid source', { source });
    throw error;
  }

  const playerHand = gameState.playerHands[playerIndex];
  const handExists = playerHand.some(card =>
    card.rank === draggedCard.rank && card.suit === draggedCard.suit
  );

  if (!handExists) {
    const error = new Error("Hand card not found.");
    logger.error('Build augmentation staging creation failed - hand card not in hand', { playerIndex, draggedCard });
    throw error;
  }

  // Check that player doesn't already have a staging stack
  const hasStagingStack = gameState.tableCards.some(card =>
    card.type === 'temporary_stack' && card.owner === playerIndex
  );

  if (hasStagingStack) {
    const error = new Error("You can only have one staging stack at a time.");
    logger.error('Build augmentation staging creation failed - player already has staging stack', { playerIndex });
    throw error;
  }

  // Create build augmentation staging stack
  // Sort cards by value: highest value at bottom, lowest at top
  const sortedCards = [targetCard, draggedCard].sort((a, b) => b.value - a.value);
  const stagingStack = {
    type: 'temporary_stack',
    stackId: `build-augment-staging-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards: sortedCards.map(card => ({
      ...card,
      source: card === targetCard ? 'table' : source
    })),
    // Track original positions for proper restoration
    cardPositions: [
      {
        cardId: `${targetCard.rank}${targetCard.suit}`,
        originalIndex: targetIndex,
        source: 'table'
      },
      {
        cardId: `${draggedCard.rank}${draggedCard.suit}`,
        originalIndex: null, // Hand card
        source: source
      }
    ],
    owner: playerIndex,
    value: draggedCard.value + targetCard.value,
    combinedValue: draggedCard.value + targetCard.value,
    possibleBuilds: [draggedCard.value + targetCard.value],
    isTableToTable: false,
    // 🏗️ SPECIAL FLAG: This is a build augmentation staging stack
    isBuildAugmentation: true
  };

  const newGameState = { ...gameState };

  // Remove dragged card from player's hand
  newGameState.playerHands = gameState.playerHands.map((hand, idx) =>
    idx === playerIndex ? hand.filter(card =>
      !(card.rank === draggedCard.rank && card.suit === draggedCard.suit)
    ) : hand
  );

  // Replace target card with staging stack
  newGameState.tableCards = [...gameState.tableCards];
  newGameState.tableCards.splice(targetIndex, 1, stagingStack);

  logger.info('Build augmentation staging stack created successfully', {
    stackId: stagingStack.stackId,
    source,
    value: stagingStack.value,
    tableCardsCount: newGameState.tableCards.length,
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    targetCard: `${targetCard.rank}${targetCard.suit}`,
    isBuildAugmentation: true
  });

  return newGameState;
}

module.exports = handleCreateBuildAugmentationStagingStack;
