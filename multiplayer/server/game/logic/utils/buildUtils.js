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

  logger.debug('Checking options for same-value stack:', {
    stackId: tempStack.stackId,
    stackValue,
    stackSize,
    cards: cards.map(c => `${c.rank}${c.suit}`)
  });

  // Find the hand card that was used to create this stack
  const handCardInStack = cards.find(card => card.source === 'hand');

  // Check 1: Spare same-value card for building
  let hasSpareCard = false;
  if (handCardInStack) {
    hasSpareCard = playerHand.some(card =>
      card.value === stackValue &&
      !(card.rank === handCardInStack.rank && card.suit === handCardInStack.suit)
    );
  } else {
    // Fallback: check if any same-value cards exist in hand
    hasSpareCard = playerHand.some(card => card.value === stackValue);
  }

  logger.debug('Spare card check:', {
    neededValue: stackValue,
    hasSpareCard,
    spareCards: playerHand.filter(c => c.value === stackValue).map(c => `${c.rank}${c.suit}`)
  });

  // Check 2: Sum build (only for low cards 1-5)
  let canBuildSum = false;
  if (stackValue <= 5) {
    const sumValue = stackValue * stackSize; // 5+5=10, 5+5+5=15, etc.
    canBuildSum = playerHand.some(card => card.value === sumValue);

    logger.debug('Sum build check:', {
      isLowCard: stackValue <= 5,
      sumValue,
      hasSumCard: playerHand.some(c => c.value === sumValue),
      canBuildSum
    });
  } else {
    logger.debug('Sum build: ❌ High card (6+), no sum builds possible');
  }

  const hasBuildOptions = hasSpareCard || canBuildSum;

  logger.debug('Final result:', {
    hasSpareCard,
    canBuildSum,
    totalBuildOptions: (hasSpareCard ? 1 : 0) + (canBuildSum ? 1 : 0),
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