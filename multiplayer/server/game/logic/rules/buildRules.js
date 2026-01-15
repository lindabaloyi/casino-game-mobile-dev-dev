/**
 * Build Action Rules
 * Rules for determining build actions (creating and extending builds)
 */

const { isBuild } = require('../../GameState');

const buildRules = [
  {
    id: 'create-own-build',
    condition: (context) => {
<<<<<<< HEAD
=======
      console.log('[BUILD_RULE] Evaluating create own build:', {
        draggedSource: context.draggedItem?.source,
        targetType: context.targetInfo?.type,
        round: context.round,
        isBuild: isBuild(context.targetInfo?.card)
      });

>>>>>>> parent of e2b4bbc (perf: remove all console.log statements for optimal performance)
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;
      const currentPlayer = context.currentPlayer;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') {
        console.log('[BUILD_RULE] ❌ Not hand card, rejecting build creation');
        return false;
      }

      // Target must be a loose card (not already a build)
      if (targetInfo?.type !== 'loose' || isBuild(targetInfo.card)) {
        console.log('[BUILD_RULE] ❌ Not loose card or already a build, rejecting build creation');
        return false;
      }

      // Must be round 1 or player must have existing build
      const round = context.round;
      const tableCards = context.tableCards || [];
      const hasOwnBuild = tableCards.some(card =>
        isBuild(card) && card.owner === currentPlayer
      );

      const canCreate = round === 1 || hasOwnBuild;
      console.log('[BUILD_RULE] Build creation check:', { round, hasOwnBuild, canCreate });
      return canCreate;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      console.log('[BUILD_RULE] Creating staging stack for build creation');
      const action = {
        type: 'createTemp',
        payload: {
          draggedCard: context.draggedItem.card,
          targetCard: context.targetInfo.card,
          canAugmentBuilds: true // Allow build augmentation since player can create builds
        }
      };
      console.log('[BUILD_RULE] Staging stack action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: true,
    priority: 35,
    description: 'Create new build from loose card and hand card'
  },




];

module.exports = buildRules;
