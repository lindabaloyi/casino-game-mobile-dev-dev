/**
 * Build Extend Rules
 * Simple rule for determining valid build extension actions
 * Shows overlay for user acceptance - no auto-resolution
 */

const { createLogger } = require('../../../utils/logger');
const logger = createLogger('BuildExtendRules');

/**
 * Check if a build can be extended (basic eligibility)
 * @param {Object} build - The target build
 * @param {number} currentPlayer - Current player index
 * @returns {boolean} - Whether build can be extended
 */
function canExtendBuild(build, currentPlayer) {
  // Must not be owned by current player
  if (build.owner === currentPlayer) {
    return false;
  }

  // Must have less than 5 cards
  if (build.cards.length >= 5) {
    return false;
  }

  // Must be marked as extendable
  if (!build.isExtendable) {
    return false;
  }

  return true;
}

/**
 * Build Extend Rules Array
 * Simple rule structure for build extensions
 */
const buildExtendRules = [
  {
    id: 'basic-build-extension',
    priority: 38, // Same as buildRules.js
    exclusive: false,
    requiresModal: false, // Shows overlay, not modal
    condition: (context) => {
      const { draggedItem, targetInfo, currentPlayer } = context;

      // Must be hand card
      if (draggedItem?.source !== 'hand') {
        return false;
      }

      // Target must be opponent's build
      if (!targetInfo?.card || targetInfo.card.type !== 'build') {
        return false;
      }

      // Build must be extendable
      if (!canExtendBuild(targetInfo.card, currentPlayer)) {
        return false;
      }

      // Card value must differ from build value
      const draggedValue = draggedItem.card.value;
      const buildValue = targetInfo.card.value;
      if (draggedValue === buildValue) {
        return false;
      }

      return true;
    },
    action: (context) => {
      // Create BuildExtension action (shows overlay)
      return {
        type: 'BuildExtension',
        payload: {
          extensionCard: context.draggedItem.card,
          targetBuildId: context.targetInfo.card.buildId
        }
      };
    },
    description: 'Basic build extension - shows overlay for acceptance'
  }
];

module.exports = {
  // Utility functions
  canExtendBuild,

  // Rules array
  buildExtendRules
};
