/**
 * Create Table to Build Augmentation Staging Stack Action Handler
 * Player drops a table card onto their build to create an augmentation staging stack
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('CreateTableToBuildAugmentationStagingStack');

function handleCreateTableToBuildAugmentationStagingStack(gameManager, playerIndex, action, gameId) {
  const { buildId, card, sourceCardIndex } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[TABLE_TO_BUILD_AUGMENT] 🏗️ CREATE TABLE TO BUILD AUGMENTATION STAGING STARTED:', {
    playerIndex,
    gameId,
    buildId,
    card: `${card.rank}${card.suit}`,
    sourceCardIndex,
    timestamp: new Date().toISOString()
  });

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  logger.info('Creating table to build augmentation staging stack', {
    playerIndex,
    buildId,
    card: `${card.rank}${card.suit}`,
    sourceCardIndex,
    gameId
  });

  // Find the target build
  const targetBuild = gameState.tableCards.find(card =>
    card.type === 'build' && card.buildId === buildId
  );

  if (!targetBuild) {
    const error = new Error('Target build not found');
    logger.error('Target build not found', { buildId });
    throw error;
  }

  if (targetBuild.owner !== playerIndex) {
    const error = new Error('You can only augment your own builds');
    logger.error('Build ownership check failed', { buildId, owner: targetBuild.owner, playerIndex });
    throw error;
  }

  // Find the source table card
  if (sourceCardIndex >= gameState.tableCards.length) {
    const error = new Error("Source table card not found at specified index.");
    logger.error('Source table card not found', { sourceCardIndex, tableCardsCount: gameState.tableCards.length });
    throw error;
  }

  const sourceCard = gameState.tableCards[sourceCardIndex];
  if (!sourceCard || sourceCard.type === 'temporary_stack') {
    const error = new Error("Source card is not a valid loose card.");
    logger.error('Invalid source card', { sourceCard, sourceCardIndex });
    throw error;
  }

  // Check that player doesn't already have a staging stack
  const hasStagingStack = gameState.tableCards.some(card =>
    card.type === 'temporary_stack' && card.owner === playerIndex
  );

  if (hasStagingStack) {
    const error = new Error("You can only have one staging stack at a time.");
    logger.error('Player already has staging stack', { playerIndex });
    throw error;
  }

  // Create build augmentation staging stack
  const stagingStack = {
    type: 'temporary_stack',
    stackId: `build-augment-${buildId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards: [sourceCard],
    owner: playerIndex,
    value: sourceCard.value,
    combinedValue: sourceCard.value,
    possibleBuilds: [sourceCard.value],
    isTableToTable: false,
    // 🏗️ SPECIAL FLAG: This is a build augmentation staging stack
    isBuildAugmentation: true,
    // Reference to the target build for validation
    targetBuildId: buildId,
    // Track original position for proper restoration
    cardPositions: [
      {
        cardId: `${sourceCard.rank}${sourceCard.suit}`,
        originalIndex: sourceCardIndex,
        source: 'table'
      }
    ]
  };

  const newGameState = { ...gameState };

  // Replace source card with staging stack
  newGameState.tableCards = [...gameState.tableCards];
  newGameState.tableCards.splice(sourceCardIndex, 1, stagingStack);

  logger.info('Table to build augmentation staging stack created successfully', {
    stackId: stagingStack.stackId,
    buildId,
    card: `${card.rank}${card.suit}`,
    value: stagingStack.value,
    tableCardsCount: newGameState.tableCards.length,
    isBuildAugmentation: true,
    targetBuildId: buildId
  });

  return newGameState;
}

module.exports = handleCreateTableToBuildAugmentationStagingStack;
