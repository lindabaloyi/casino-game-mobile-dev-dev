/**
 * Build Extension Utilities
 * Core logic for determining build extension eligibility and processing extensions
 * JavaScript version for server-side use
 */

/**
 * Analyze build structure to determine if it is extendable.
 * Mirrors the TypeScript version in src/utils/buildExtensionUtils.ts.
 * @param {Object[]} cards - Array of card objects with a `value` property
 * @returns {{ hasBase: boolean, isSingleCombination: boolean, isExtendable: boolean }}
 */
function analyzeBuildForExtension(cards) {
  // Check for base structure: one card whose value equals the sum of all others
  let hasBase = false;
  for (let baseIndex = 0; baseIndex < cards.length; baseIndex++) {
    const potentialBase = cards[baseIndex];
    const supports = cards.filter((_, index) => index !== baseIndex);
    const supportsSum = supports.reduce((sum, card) => sum + (card.value || 0), 0);

    if (supportsSum === potentialBase.value && potentialBase.value <= 10) {
      hasBase = true;
      break;
    }
  }

  // Pure sum builds are treated as single-combination
  const isSingleCombination = !hasBase;

  // Extendable: fewer than 5 cards, no base structure, single combination
  const isExtendable = cards.length < 5 && !hasBase && isSingleCombination;

  return { hasBase, isSingleCombination, isExtendable };
}

/**
 * Insert extension card into build maintaining descending value order
 * Higher values at bottom (index 0), lower values on top
 * Used for build extensions where target build is already sorted
 */
function insertCardIntoBuildDescending(sortedCards, newCard) {
  const result = [...sortedCards];

  // Find insertion point: higher/equal values go earlier (closer to bottom)
  // Descending order: higher values first (bottom of visual stack)
  let insertIndex = result.length; // Default to end if smaller than all
  for (let i = 0; i < result.length; i++) {
    if (newCard.value >= (result[i].value || 0)) {
      insertIndex = i;
      break;
    }
  }

  // Insert at the found position
  result.splice(insertIndex, 0, newCard);
  return result;
}

/**
 * Validate that extension maintains descending order
 */
function validateBuildExtensionOrder(buildCards, extensionCard) {
  const extended = insertCardIntoBuildDescending(buildCards, extensionCard);
  // Check descending order: each card >= next card
  for (let i = 0; i < extended.length - 1; i++) {
    if ((extended[i].value || 0) < (extended[i + 1].value || 0)) {
      return false;
    }
  }
  return true;
}

module.exports = {
  analyzeBuildForExtension,
  insertCardIntoBuildDescending,
  validateBuildExtensionOrder,
};
