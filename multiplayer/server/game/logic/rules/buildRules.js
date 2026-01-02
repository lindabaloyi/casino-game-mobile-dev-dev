/**
 * Build Action Rules
 * Rules for determining build actions (creating and extending builds)
 */

const { rankValue, isBuild } = require('../../GameState');

const buildRules = [
  {
    id: 'create-own-build',
    condition: (context) => {
      console.log('[BUILD_RULE] Evaluating create own build:', {
        draggedSource: context.draggedItem?.source,
        targetType: context.targetInfo?.type,
        round: context.round,
        isBuild: isBuild(context.targetInfo?.card)
      });

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
        type: 'createStagingStack',
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

  {
    id: 'augment-own-build',
    condition: (context) => {
      console.log('[BUILD_AUGMENT_RULE] 🔍 Evaluating augment own build:', {
        draggedSource: context.draggedItem?.source,
        draggedCard: context.draggedItem?.card ? `${context.draggedItem.card.rank}${context.draggedItem.card.suit}` : 'none',
        targetType: context.targetInfo?.type,
        targetCard: context.targetInfo?.card ? `${context.targetInfo.card.rank}${context.targetInfo.card.suit}` : 'none',
        isBuild: isBuild(context.targetInfo?.card),
        buildOwner: context.targetInfo?.card?.owner,
        buildValue: context.targetInfo?.card?.value,
        buildId: context.targetInfo?.card?.buildId,
        currentPlayer: context.currentPlayer
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;
      const currentPlayer = context.currentPlayer;

      // Only allow hand or table cards for augmentation
      if (!draggedItem?.source || !['hand', 'table'].includes(draggedItem.source)) {
        console.log('[BUILD_AUGMENT_RULE] ❌ Invalid source for build augmentation:', {
          source: draggedItem?.source,
          allowedSources: ['hand', 'table']
        });
        return false;
      }

      // Target must be player's own build
      if (!isBuild(targetInfo?.card)) {
        console.log('[BUILD_AUGMENT_RULE] ❌ Target is not a build');
        return false;
      }

      if (targetInfo.card.owner !== currentPlayer) {
        console.log('[BUILD_AUGMENT_RULE] ❌ Not own build:', {
          buildOwner: targetInfo.card.owner,
          currentPlayer: currentPlayer
        });
        return false;
      }

      console.log('[BUILD_AUGMENT_RULE] ✅ Build augmentation conditions met:', {
        buildId: targetInfo.card.buildId,
        buildValue: targetInfo.card.value,
        draggedCardValue: rankValue(draggedItem.card.rank)
      });
      return true;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      console.log('[BUILD_RULE] Creating add to own build action');
      const action = {
        type: 'addToOwnBuild',
        payload: {
          buildId: context.targetInfo.card.buildId,
          card: context.draggedItem.card,
          source: context.draggedItem.source
        }
      };
      console.log('[BUILD_RULE] Add to own build action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: false, // Direct action, no modal needed
    priority: 40, // High priority - more specific than general build rules
    description: 'Augment own build by adding cards that sum to build value'
  }
];

module.exports = buildRules;
