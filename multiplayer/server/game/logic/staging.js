/**
 * Staging Logic Module
 * Pure functions for staging validation and build calculations
 * No direct state mutation - returns transformed data for handlers to use
 */

const { rankValue, calculateCardSum, isCard, isBuild, isTemporaryStack } = require('../GameState');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('StagingLogic');

/**
 * Validate staging creation
 * Returns { valid: boolean, message?: string }
 */
function validateStagingCreation(gameState, handCard, tableCard) {
  logger.debug('Validating staging creation', {
    handCard: `${handCard.rank}${handCard.suit}`,
    tableCard: `${tableCard.rank}${tableCard.suit}`,
    player: gameState.currentPlayer
  });

  const { currentPlayer, tableCards, playerHands } = gameState;

  // Check if staging already active for this player
  const hasActiveStaging = tableCards.some(s =>
    s.type === 'temporary_stack' && s.owner === currentPlayer
  );

  if (hasActiveStaging) {
    logger.debug('Staging already active for player');
    return { valid: false, message: "Complete your current staging action first." };
  }

  // Verify hand card ownership
  const playerHand = playerHands[currentPlayer];
  const cardInHand = playerHand.find(c => c.rank === handCard.rank && c.suit === handCard.suit);

  if (!cardInHand) {
    logger.debug('Hand card not in player hand');
    return { valid: false, message: "This card is not in your hand." };
  }

  // Verify table card exists and is loose
  const targetOnTable = tableCards.find(c =>
    !c.type && c.rank === tableCard.rank && c.suit === tableCard.suit
  );

  if (!targetOnTable) {
    logger.debug('Target table card not found as loose card');
    return { valid: false, message: "Target card not found on table." };
  }

  logger.debug('Staging creation validation passed');
  return { valid: true };
}

/**
 * Validate adding cards to existing staging stack (Game-Appropriate Version)
 * Minimal validation for flexible temp stack building during gameplay
 */
function validateStagingAddition(gameState, handCard, targetStack) {
  logger.debug('Validating staging addition (GAME-APPROPRIATE)', {
    handCard: `${handCard.rank}${handCard.suit}`,
    stackId: targetStack.stackId,
    player: gameState.currentPlayer,
    philosophy: 'flexible temp stacking'
  });

  const { currentPlayer, playerHands } = gameState;

  // ✅ FIX 2 & 3: REMOVE RESTRICTIVE CHECKS FOR TEMP STACKS

  // COMMENTED OUT: Ownership check - allow flexible stacking
  /*
  if (targetStack.owner !== currentPlayer) {
    logger.debug('Attempt to add to opponent staging stack');
    return { valid: false, message: "You can only add to your own staging stacks." };
  }
  */

  // Keep basic hand card verification (essential for game integrity)
  const playerHand = playerHands[currentPlayer];
  const cardInHand = playerHand.find(c => c.rank === handCard.rank && c.suit === handCard.suit);

  if (!cardInHand) {
    logger.debug('Hand card not in player hand (still validating this)');
    return { valid: false, message: "This card is not in your hand." };
  }

  // COMMENTED OUT: Size limits - allow unlimited temp stacking
  /*
  const maxStackSize = 10;
  if (targetStack.cards.length >= maxStackSize) {
    logger.debug('Stack at maximum size', { currentSize: targetStack.cards.length, maxSize: maxStackSize });
    return { valid: false, message: "Staging stack is already at maximum size." };
  }
  */

  logger.debug('Staging addition validation passed (flexible approach)');
  return { valid: true };
}

/**
 * Validate staging finalization
 */
function validateStagingFinalization(gameState, stack) {
  logger.debug('Validating staging finalization', {
    stackId: stack.stackId,
    cardCount: stack.cards.length,
    player: gameState.currentPlayer
  });

  const { currentPlayer, playerHands } = gameState;

  // Verify ownership
  if (stack.owner !== currentPlayer) {
    logger.debug('Attempt to finalize opponent staging stack');
    return { valid: false, message: "You can only finalize your own staging stacks." };
  }

  // Verify minimum card count
  if (stack.cards.length < 2) {
    logger.debug('Stack has insufficient cards', { cardCount: stack.cards.length });
    return { valid: false, message: "Staging stack must have at least 2 cards to finalize." };
  }

  // Verify at least one hand card and one table card
  const handCards = stack.cards.filter(c => c.source === 'hand');
  const tableCards = stack.cards.filter(c => c.source === 'table');

  if (handCards.length === 0) {
    logger.debug('Stack has no hand cards');
    return { valid: false, message: "Staging stack must include at least one card from your hand." };
  }

  if (tableCards.length === 0) {
    logger.debug('Stack has no table cards');
    return { valid: false, message: "Staging stack must include at least one card from the table." };
  }

  // Verify player has the required hand cards for finalization
  const currentHand = playerHands[currentPlayer];

  for (const requiredCard of handCards) {
    const cardExists = currentHand.some(c =>
      c.rank === requiredCard.rank && c.suit === requiredCard.suit
    );
    if (!cardExists) {
      logger.debug('Required hand card not available', { card: `${requiredCard.rank}${requiredCard.suit}` });
      return { valid: false, message: "One or more required hand cards are no longer available." };
    }
  }

  logger.debug('Staging finalization validation passed');
  return { valid: true };
}

/**
 * Validate staging cancellation
 */
function validateStagingCancellation(gameState, stack) {
  logger.debug('Validating staging cancellation', {
    stackId: stack.stackId,
    player: gameState.currentPlayer
  });

  const { currentPlayer } = gameState;

  // Verify ownership
  if (stack.owner !== currentPlayer) {
    logger.debug('Attempt to cancel opponent staging stack');
    return { valid: false, message: "You can only cancel your own staging stacks." };
  }

  // Basic validation: stack exists and is temporary
  if (stack.type !== 'temporary_stack') {
    logger.debug('Stack is not a temporary stack', { type: stack.type });
    return { valid: false, message: "This is not a valid staging stack." };
  }

  logger.debug('Staging cancellation validation passed');
  return { valid: true };
}

/**
 * Evaluate finalize options - returns possible build values
 */
function evaluateFinalizeOptions(stagingStack, playerHand) {
  const builds = [];
  const stagingCardSum = calculateCardSum(stagingStack.cards);

  logger.debug('Evaluating finalize options', {
    stackId: stagingStack.stackId,
    currentValue: stagingCardSum,
    handSize: playerHand.length
  });

  // Check each hand card for possible builds
  for (const handCard of playerHand) {
    const totalValue = stagingCardSum + handCard.value;
    if (totalValue <= 10) {
      builds.push({
        value: totalValue,
        description: `${stagingCardSum} + ${handCard.value} = ${totalValue}`,
        captureCard: handCard
      });
    }
  }

  logger.debug('Found possible builds', { buildCount: builds.length });
  return builds;
}

/**
 * Create staging stack object (pure function returning data)
 */
function createStagingStackData(handCard, tableCard, playerIndex) {
  const orderedCards = [
    { ...tableCard, source: 'table' },
    { ...handCard, source: 'hand' }
  ];

  const stackData = {
    type: 'temporary_stack',
    stackId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    cards: orderedCards,
    owner: playerIndex,
    value: handCard.value + tableCard.value,
    possibleBuilds: [handCard.value + tableCard.value]
  };

  logger.debug('Created staging stack data', {
    stackId: stackData.stackId,
    value: stackData.value,
    cardCount: stackData.cards.length
  });

  return stackData;
}

/**
 * Calculate staging stack capture value (first possible build value)
 */
function calculateStagingCaptureValue(stagingStack) {
  const captureValue = stagingStack.captureValue ||
    calculateCardSum(stagingStack.cards || []);
  return captureValue;
}

module.exports = {
  validateStagingCreation,
  validateStagingAddition,
  validateStagingFinalization,
  validateStagingCancellation,
  evaluateFinalizeOptions,
  createStagingStackData,
  calculateStagingCaptureValue
};
