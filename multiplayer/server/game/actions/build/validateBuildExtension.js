/**
 * Validate Build Extension Action Handler
 * Server-side validation and processing of build extensions
 */

const { createLogger } = require('../../../utils/logger');

// Inline build extension utilities to avoid module resolution issues
const validateBuildExtension = (build, extensionCard) => {
  // Calculate new total
  const newValue = build.value + extensionCard.value;

  // Extension must maintain valid build (new total <= 10 for casino rules)
  if (newValue > 10) {
    return {
      valid: false,
      newValue,
      error: `Extension would create invalid build value: ${newValue} (max 10)`
    };
  }

  // Additional validation can be added here
  // For now, single card extensions are always valid if under the limit

  return {
    valid: true,
    newValue
  };
};

const createExtendedBuild = (build, extensionCard, newOwner, newValue) => {
  // Re-analyze for extension eligibility with new card
  const cards = [...build.cards, extensionCard];

  // Check for base structure (one card that supports = total - supports)
  let hasBase = false;
  for (let baseIndex = 0; baseIndex < cards.length; baseIndex++) {
    const potentialBase = cards[baseIndex];
    const supports = cards.filter((_, index) => index !== baseIndex);
    const supportsSum = supports.reduce((sum, card) => sum + card.value, 0);

    if (supportsSum === potentialBase.value && potentialBase.value <= 10) {
      hasBase = true;
      break;
    }
  }

  // Check if single combination (only one way to interpret the build)
  // For now, assume pure sum builds are single combination
  const isSingleCombination = !hasBase;

  // Build is extendable if: <5 cards, no base, single combination
  const isExtendable = cards.length < 5 && !hasBase && isSingleCombination;

  return {
    ...build,
    cards: [...build.cards, extensionCard],
    value: newValue,
    owner: newOwner,
    // Extension eligibility flags
    hasBase,
    isSingleCombination,
    isExtendable
  };
};

const shouldExtensionEndTurn = () => {
  return true; // Build extensions always end the turn
};

const logger = createLogger('ValidateBuildExtension');

function handleValidateBuildExtension(gameManager, playerIndex, action, gameId) {
  const { tempStackId } = action.payload;

  logger.info('Validating build extension', {
    tempStackId,
    playerIndex,
    gameId
  });

  const gameState = gameManager.getGameState(gameId);

  if (!gameState) {
    throw new Error(`Game ${gameId} not found`);
  }

  // Find the extension temp stack
  const tempStackIndex = gameState.tableCards.findIndex(card =>
    card.stackId === tempStackId && card.isBuildExtension
  );

  if (tempStackIndex === -1) {
    logger.warn('Build extension temp stack not found', { tempStackId });
    return gameState;
  }

  const tempStack = gameState.tableCards[tempStackIndex];

  // Find the target build
  const targetBuildIndex = gameState.tableCards.findIndex(card =>
    card.type === 'build' && card.buildId === tempStack.targetBuildId
  );

  if (targetBuildIndex === -1) {
    logger.warn('Target build not found', {
      targetBuildId: tempStack.targetBuildId,
      tempStackId
    });
    return gameState;
  }

  const targetBuild = gameState.tableCards[targetBuildIndex];
  const extensionCard = tempStack.extensionCard;

  // Validate the extension
  const validation = validateBuildExtension(targetBuild, extensionCard);

  if (!validation.valid) {
    logger.warn('Build extension validation failed', {
      error: validation.error,
      extensionCard: `${extensionCard.rank}${extensionCard.suit}`,
      targetBuild: {
        id: targetBuild.buildId,
        value: targetBuild.value,
        owner: targetBuild.owner
      }
    });
    return gameState;
  }

  logger.info('Build extension validated successfully', {
    extensionCard: `${extensionCard.rank}${extensionCard.suit}`,
    oldBuild: {
      id: targetBuild.buildId,
      value: targetBuild.value,
      owner: targetBuild.owner,
      cards: targetBuild.cards.length
    },
    newValue: validation.newValue,
    newOwner: playerIndex
  });

  // Create the extended build
  const extendedBuild = createExtendedBuild(
    targetBuild,
    extensionCard,
    playerIndex, // New owner
    validation.newValue
  );

  // Update the build in game state
  gameState.tableCards[targetBuildIndex] = extendedBuild;

  // Remove the temp stack
  gameState.tableCards.splice(tempStackIndex, 1);

  // Remove extension card from player's hand
  const handIndex = gameState.playerHands[playerIndex].findIndex(card =>
    card.rank === extensionCard.rank && card.suit === extensionCard.suit
  );

  if (handIndex >= 0) {
    gameState.playerHands[playerIndex].splice(handIndex, 1);
    logger.debug('Extension card removed from hand', { handIndex });
  }

  // Handle turn management (extensions end the turn like captures)
  if (shouldExtensionEndTurn()) {
    const nextPlayer = (playerIndex + 1) % 2;
    gameState.currentPlayer = nextPlayer;

    logger.info('Build extension completed - turn ended', {
      previousPlayer: playerIndex,
      nextPlayer,
      extendedBuild: {
        id: extendedBuild.buildId,
        newValue: extendedBuild.value,
        newOwner: extendedBuild.owner
      }
    });
  }

  return gameState;
}

module.exports = handleValidateBuildExtension;
