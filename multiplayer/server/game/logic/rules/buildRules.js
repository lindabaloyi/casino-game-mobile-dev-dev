/**
 * Build Action Rules
 * Rules for determining build actions (creating and extending builds)
 */

const { rankValue, isBuild } = require('../../GameState');
// Build extension utilities - inline implementation to avoid module resolution issues
const canBuildBeExtended = (build, currentPlayer) => {
  // Must not be owned by current player
  if (build.owner === currentPlayer) {
    return false;
  }

  // Must have less than 5 cards
  if (build.cards.length >= 5) {
    return false;
  }

  // Must not have base structure (pure sum-based builds only)
  // Default to false if undefined (assume no base for backward compatibility)
  const hasBase = build.hasBase || false;
  if (hasBase) {
    return false;
  }

  // Must have single combination only (unambiguous)
  // Default to true if undefined (assume single combination for backward compatibility)
  const isSingleCombination = build.isSingleCombination !== false; // true if undefined or true
  if (!isSingleCombination) {
    return false;
  }

  // Must be marked as extendable
  // Default to false if undefined (require explicit marking)
  const isExtendable = build.isExtendable || false;
  if (!isExtendable) {
    return false;
  }

  return true;
};

const createExtensionTempStack = (extensionCard, targetBuild, playerIndex) => {
  return {
    type: 'temporary_stack',
    stackId: `extension-${playerIndex}-${Date.now()}`,
    cards: [extensionCard],
    owner: playerIndex,
    value: extensionCard.value,
    combinedValue: extensionCard.value,
    possibleBuilds: [],
    isTableToTable: false,
    canAugmentBuilds: false,
    // Special markers for build extension
    isBuildExtension: true,
    targetBuildId: targetBuild.buildId,
    extensionCard: extensionCard,
    expectedNewValue: targetBuild.value + extensionCard.value
  };
};

const buildRules = [
  {
    id: 'create-own-build',
    condition: (context) => {
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;
      const currentPlayer = context.currentPlayer;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') {
        return false;
      }

      // Target must be a loose card (not already a build)
      if (targetInfo?.type !== 'loose' || isBuild(targetInfo.card)) {
        return false;
      }

      // Must be round 1 or player must have existing build
      const round = context.round;
      const tableCards = context.tableCards || [];
      const hasOwnBuild = tableCards.some(card =>
        isBuild(card) && card.owner === currentPlayer
      );

      const canCreate = round === 1 || hasOwnBuild;
      return canCreate;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      const action = {
        type: 'createTemp',
        payload: {
          draggedCard: context.draggedItem.card,
          targetCard: context.targetInfo.card,
          canAugmentBuilds: true // Allow build augmentation since player can create builds
        }
      };
      return action;
    },
    requiresModal: true,
    priority: 35,
    description: 'Create new build from loose card and hand card'
  },

];

module.exports = buildRules;
