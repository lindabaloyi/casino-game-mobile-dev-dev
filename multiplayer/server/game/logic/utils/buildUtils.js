/**
 * Build Utilities
 * Helper functions for build feasibility checking and card evaluation
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('BuildUtils');

/**
 * Check if player has a spare same-value card (excluding the current card)
 */
function hasSpareSameValue(value, playerHand, currentCard) {
  return playerHand.some(card =>
    card.value === value &&
    !(card.rank === currentCard.rank && card.suit === currentCard.suit)
  );
}

/**
 * Check if player has a card with the specified sum value
 */
function hasSumCard(sumValue, playerHand) {
  return playerHand.some(card => card.value === sumValue);
}

/**
 * Determine all build options available for a hand card + target combination
 */
function canBuildWithCards(handCard, target, playerHand) {
  const buildOptions = [];

  // Same-value build option
  if (hasSpareSameValue(handCard.value, playerHand, handCard)) {
    buildOptions.push('BUILD_SAME');
  }

  // Sum-value build option (only for 1-5)
  if (handCard.value <= 5) {
    let totalValue;
    if (target.type === 'loose') {
      totalValue = handCard.value + target.card.value;
    } else if (target.type === 'temporary_stack') {
      totalValue = handCard.value * (target.card.cards?.length || 1);
    }

    if (totalValue && hasSumCard(totalValue, playerHand)) {
      buildOptions.push('BUILD_SUM');
    }
  }

  return buildOptions;
}

/**
 * Check if player has build options for a same-value temp stack
 */
function checkBuildOptionsForStack(tempStack, playerHand) {
  const cards = tempStack.cards || [];
  if (cards.length === 0) return false;

  const stackValue = cards[0].value; // All cards have same value
  const stackSize = cards.length;

  logger.debug('🔍 [VALIDATOR] Checking options for same-value stack:', {
    stackId: tempStack.stackId,
    stackValue,
    stackSize,
    cards: cards.map(c => `${c.rank}${c.suit}`)
  });

  // ✅ SIMPLIFIED LOGIC: Just check if player has the required cards
  // No complex "spare/extra" logic needed

  // Check 1: Same-value build - player needs card with stack value
  const hasSameValueCard = playerHand.some(card => card.value === stackValue);
  logger.debug('🔍 [VALIDATOR] Same-value build check:', {
    neededValue: stackValue,
    hasSameValueCard,
    availableCards: playerHand.filter(c => c.value === stackValue).map(c => `${c.rank}${c.suit}`)
  });

  // Check 2: Sum build (only for low cards 1-5)
  let canBuildSum = false;
  if (stackValue <= 5) {
    const sumValue = stackValue * stackSize; // 5+5=10, 5+5+5=15, etc.
    canBuildSum = playerHand.some(card => card.value === sumValue);

    logger.debug('🔍 [VALIDATOR] Sum build check:', {
      isLowCard: stackValue <= 5,
      sumValue,
      hasSumCard: canBuildSum,
      availableSumCards: playerHand.filter(c => c.value === sumValue).map(c => `${c.rank}${c.suit}`)
    });
  } else {
    logger.debug('❌ [VALIDATOR] Sum build: High card (6+), no sum builds possible');
  }

  const hasBuildOptions = hasSameValueCard || canBuildSum;

  logger.debug('✅ [VALIDATOR] Final result:', {
    hasSameValueCard,
    canBuildSum,
    totalBuildOptions: (hasSameValueCard ? 1 : 0) + (canBuildSum ? 1 : 0),
    hasBuildOptions
  });

  return hasBuildOptions;
}

module.exports = {
  hasSpareSameValue,
  hasSumCard,
  canBuildWithCards,
  checkBuildOptionsForStack
};
