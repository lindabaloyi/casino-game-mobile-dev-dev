/**
 * Finalize Build Augmentation Action Handler
 * Player drags build augmentation staging stack onto their build to augment it
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('FinalizeBuildAugmentation');

function handleFinalizeBuildAugmentation(gameManager, playerIndex, action, gameId) {
  const { stagingStackId, targetBuildId } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[BUILD_AUGMENT_FINALIZE] 🏗️ FINALIZE BUILD AUGMENTATION STARTED:', {
    playerIndex,
    gameId,
    stagingStackId,
    targetBuildId,
    timestamp: new Date().toISOString()
  });

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  logger.info('Finalizing build augmentation', {
    playerIndex,
    stagingStackId,
    targetBuildId,
    gameId
  });

  // Find the staging stack
  const stagingStack = gameState.tableCards.find(card =>
    card.type === 'temporary_stack' && card.stackId === stagingStackId
  );

  if (!stagingStack) {
    const error = new Error('Build augmentation staging stack not found');
    logger.error('Staging stack not found', { stagingStackId });
    throw error;
  }

  if (!stagingStack.isBuildAugmentation) {
    const error = new Error('Stack is not a build augmentation stack');
    logger.error('Invalid stack type', { stagingStackId, type: stagingStack.type });
    throw error;
  }

  if (stagingStack.owner !== playerIndex) {
    const error = new Error('You can only finalize your own build augmentation stacks');
    logger.error('Ownership check failed', { stagingStackId, owner: stagingStack.owner, playerIndex });
    throw error;
  }

  // Use targetBuildId from payload, or fall back to the one stored in staging stack
  const finalTargetBuildId = targetBuildId || stagingStack.targetBuildId;

  if (!finalTargetBuildId) {
    const error = new Error('No target build specified for build augmentation');
    logger.error('No target build ID available', { stagingStackId, targetBuildId, stagingTargetBuildId: stagingStack.targetBuildId });
    throw error;
  }

  // Find the target build
  const targetBuild = gameState.tableCards.find(card =>
    card.type === 'build' && card.buildId === finalTargetBuildId
  );

  if (!targetBuild) {
    const error = new Error('Target build not found');
    logger.error('Target build not found', { targetBuildId: finalTargetBuildId });
    throw error;
  }

  if (targetBuild.owner !== playerIndex) {
    const error = new Error('You can only augment your own builds');
    logger.error('Build ownership check failed', { targetBuildId, owner: targetBuild.owner, playerIndex });
    throw error;
  }

  // Validate that staging stack cards sum equals build value
  const stagingValue = stagingStack.value;
  const buildValue = targetBuild.value;

  console.log('[BUILD_AUGMENT_FINALIZE] 🔍 VALIDATION CHECKS:', {
    stagingStackId,
    targetBuildId,
    stagingValue,
    buildValue,
    stagingCards: stagingStack.cards.map(c => `${c.rank}${c.suit}(${c.value})`),
    buildCards: targetBuild.cards.map(c => `${c.rank}${c.suit}(${c.value})`),
    validationPassed: stagingValue === buildValue
  });

  if (stagingValue !== buildValue) {
    const error = new Error(`Staging stack value (${stagingValue}) must equal build value (${buildValue})`);
    console.log('[BUILD_AUGMENT_FINALIZE] ❌ VALIDATION FAILED:', {
      error: error.message,
      stagingValue,
      buildValue,
      reason: 'Staging stack value must equal build value for augmentation'
    });
    logger.error('Value validation failed', { stagingValue, buildValue });
    throw error;
  }

  console.log('[BUILD_AUGMENT_FINALIZE] ✅ VALIDATION PASSED - proceeding with augmentation');

  // Augment the build: add all cards from staging stack to build
  const originalBuildCardCount = targetBuild.cards.length;
  targetBuild.cards.push(...stagingStack.cards);

  console.log('[BUILD_AUGMENT_FINALIZE] 🏗️ BUILD AUGMENTED:', {
    buildId: targetBuild.buildId,
    addedCards: stagingStack.cards.length,
    originalCardCount: originalBuildCardCount,
    newCardCount: targetBuild.cards.length,
    buildValue: targetBuild.value,
    augmentedCards: stagingStack.cards.map(c => `${c.rank}${c.suit}`)
  });

  logger.info('Build augmented successfully', {
    buildId: targetBuild.buildId,
    addedCards: stagingStack.cards.length,
    newCardCount: targetBuild.cards.length,
    buildValue: targetBuild.value
  });

  // Remove the staging stack from table
  const stackIndex = gameState.tableCards.findIndex(card =>
    card.type === 'temporary_stack' && card.stackId === stagingStackId
  );

  if (stackIndex >= 0) {
    gameState.tableCards.splice(stackIndex, 1);
    logger.info('Staging stack removed from table', { stagingStackId });
  }

  return gameState;
}

module.exports = handleFinalizeBuildAugmentation;
