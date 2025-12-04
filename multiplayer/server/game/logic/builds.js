/**
 * Builds Logic Module
 * Pure functions for build-specific logic
 * No direct state mutation - returns data for handlers to use
 */

const { rankValue, calculateCardSum, isBuild } = require('../GameState');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('BuildsLogic');

/**
 * Validate build creation per casino rules
 * Returns { valid: boolean, message?: string }
 */
function validateBuildCreation(buildValue, targetBuildValue, gameState) {
  logger.debug('Validating build creation', {
    buildValue,
    targetBuildValue,
    currentPlayer: gameState.currentPlayer
  });

  const { tableCards, currentPlayer } = gameState;

  // Rule 1: Cannot have multiple active builds per round
  const hasActiveBuild = tableCards.some(card =>
    card.type === 'build' && card.owner === currentPlayer
  );

  if (hasActiveBuild) {
    logger.debug('Player already has active build');
    return {
      valid: false,
      message: "You can only have one active build at a time."
    };
  }

  // Rule 2: Opponent cannot have same value build
  const opponentHasSameValue = tableCards.some(card =>
    card.type === 'build' &&
    card.owner !== currentPlayer &&
    card.value === buildValue
  );

  if (opponentHasSameValue) {
    logger.debug('Opponent has same value build', { buildValue });
    return {
      valid: false,
      message: `Opponent already has a build of ${buildValue}.`
    };
  }

  logger.debug('Build creation validation passed');
  return { valid: true };
}

/**
 * Validate adding to own build
 */
function validateAddToOwnBuild(build, addedCard) {
  logger.debug('Validating add to own build', {
    buildId: build.buildId,
    buildValue: build.value,
    addedValue: addedCard.value,
    newValue: build.value + addedCard.value
  });

  const newValue = build.value + addedCard.value;

  if (newValue > 10) {
    logger.debug('Build would exceed 10', { newValue });
    return {
      valid: false,
      message: "Build value cannot exceed 10."
    };
  }

  logger.debug('Add to own build validation passed');
  return { valid: true };
}

/**
 * Validate adding to opponent build
 */
function validateAddToOpponentBuild(build, addedCard, currentPlayer) {
  logger.debug('Validating add to opponent build', {
    buildId: build.buildId,
    owner: build.owner,
    currentPlayer,
    buildValue: build.value,
    addedValue: addedCard.value,
    newValue: build.value + addedCard.value
  });

  // Verify it's opponent's build
  if (build.owner === currentPlayer) {
    logger.debug('Cannot add to own build');
    return {
      valid: false,
      message: "Cannot add to your own build through this action."
    };
  }

  // Verify build is extendable
  if (!build.isExtendable) {
    logger.debug('Build is not extendable');
    return {
      valid: false,
      message: "This build cannot be extended."
    };
  }

  const newValue = build.value + addedCard.value;

  if (newValue > 10) {
    logger.debug('Build would exceed 10', { newValue });
    return {
      valid: false,
      message: "Build value would exceed 10."
    };
  }

  logger.debug('Add to opponent build validation passed');
  return { valid: true };
}

/**
 * Calculate possible build values for hand card + table card combination
 */
function calculateBuildValues(handCard, tableCard) {
  const handValue = rankValue(handCard.rank);
  const tableValue = rankValue(tableCard.rank);
  const buildValue = handValue + tableValue;

  logger.debug('Calculated build values', {
    handCard: `${handCard.rank}${handCard.suit}`,
    tableCard: `${tableCard.rank}${tableCard.suit}`,
    buildValue
  });

  return {
    buildValue,
    handValue,
    tableValue,
    canBuild: buildValue <= 10
  };
}

/**
 * Determine build card ordering (bigger card first in build)
 */
function determineBuildOrdering(card1, card2) {
  const value1 = rankValue(card1.rank);
  const value2 = rankValue(card2.rank);

  if (value1 > value2) {
    logger.debug('Card 1 is bigger');
    return { biggerCard: card1, smallerCard: card2 };
  } else if (value2 > value1) {
    logger.debug('Card 2 is bigger');
    return { biggerCard: card2, smallerCard: card1 };
  } else {
    // Same value - arbitrary ordering
    logger.debug('Cards have same value');
    return { biggerCard: card1, smallerCard: card2 };
  }
}

/**
 * Expand build by adding cards from a staging stack
 */
function expandBuildWithValue(build, stagingStack, targetValue) {
  logger.debug('Expanding build from staging stack', {
    buildId: build.buildId,
    originalValue: build.value,
    targetValue,
    stackValue: calculateCardSum(stagingStack.cards)
  });

  const handCards = stagingStack.cards.filter(c => c.source === 'hand');
  const tableCards = stagingStack.cards.filter(c => c.source === 'table');

  // Clean source tracking
  const cleanedHandCards = handCards.map(({ source, ...card }) => card);
  const cleanedTableCards = tableCards.map(({ source, ...card }) => card);

  // Create expanded build
  const expandedBuild = {
    ...build,
    value: targetValue,
    cards: [...build.cards, ...cleanedHandCards, ...cleanedTableCards],
    isExtendable: true // Builds remain extendable after being created from staging
  };

  logger.debug('Build expanded successfully', {
    newValue: targetValue,
    totalCards: expandedBuild.cards.length,
    isExtendable: expandedBuild.isExtendable
  });

  return expandedBuild;
}

/**
 * Get builds owned by a specific player
 */
function getPlayerBuilds(tableCards, playerIndex) {
  const playerBuilds = tableCards.filter(card =>
    isBuild(card) && card.owner === playerIndex
  );

  logger.debug('Getting player builds', {
    playerIndex,
    buildCount: playerBuilds.length
  });

  return playerBuilds;
}

/**
 * Check if player can extend opponent's build
 */
function canExtendOpponentBuild(build, handCard) {
  if (!build.isExtendable) {
    logger.debug('Build is not extendable', { buildId: build.buildId });
    return false;
  }

  const newValue = build.value + rankValue(handCard.rank);

  if (newValue > 10) {
    logger.debug('Extension would exceed 10', { newValue });
    return false;
  }

  logger.debug('Can extend opponent build');
  return true;
}

/**
 * Calculate captured build value (for scoring purposes)
 */
function calculateCapturedBuildValue(build) {
  const value = calculateCardSum(build.cards || []);
  logger.debug('Calculated captured build value', {
    buildId: build.buildId,
    calculatedValue: value
  });
  return value;
}

module.exports = {
  validateBuildCreation,
  validateAddToOwnBuild,
  validateAddToOpponentBuild,
  calculateBuildValues,
  determineBuildOrdering,
  expandBuildWithValue,
  getPlayerBuilds,
  canExtendOpponentBuild,
  calculateCapturedBuildValue
};
