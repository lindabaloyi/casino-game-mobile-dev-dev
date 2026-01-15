/**
 * Build Action Rules
 * Rules for determining build actions (creating and extending builds)
 */

const { isBuild } = require('../../GameState');

const buildRules = [
  {
    id: 'create-own-build',
    condition: (context) => {
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
