/**
 * Staging Action Rules
 * Rules for determining staging actions (temp stack creation)
 */

const stagingRules = [
  {
    id: 'universal-staging',
    priority: 95, // High priority for all staging actions
    exclusive: false,
    requiresModal: false,
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Handle both hand-to-table and table-to-table staging
      const isValidSource = draggedItem?.source === 'hand' || draggedItem?.source === 'table';
      const isValidTarget = targetInfo?.type === 'loose';
      const isValid = isValidSource && isValidTarget;

      console.log('[STAGING] Staging candidate detected:', {
        source: draggedItem?.source,
        targetType: targetInfo?.type,
        draggedCard: draggedItem?.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
        targetCard: targetInfo?.card ? `${targetInfo.card.rank}${targetInfo.card.suit}` : 'none',
        isHandToTable: draggedItem?.source === 'hand' && targetInfo?.type === 'loose',
        isTableToTable: draggedItem?.source === 'table' && targetInfo?.type === 'loose',
        overallResult: isValid
      });

      return isValid;
    },
    action: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      console.log('[STAGING] Creating unified staging action:', {
        source: draggedItem.source,
        draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
        targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
        targetIndex: targetInfo.index,
        isTableToTable: draggedItem.source === 'table'
      });

      return {
        type: 'createStagingStack',
        payload: {
          source: draggedItem.source,
          card: draggedItem.card,
          targetIndex: targetInfo.index,
          player: draggedItem.player,
          isTableToTable: draggedItem.source === 'table'
        }
      };
    }
  },
  {
    id: 'temp-stack-addition',
    condition: (context) => {
      console.log('[STAGING_RULE] Evaluating temp stack addition (GAME-APPROPRIATE):', {
        targetType: context.targetInfo?.type,
        draggedSource: context.draggedItem?.source,
        stackId: context.targetInfo?.stackId
      });

      const targetInfo = context.targetInfo;
      const draggedItem = context.draggedItem;

      // Game-appropriate validation: Check if target is temp stack and card exists
      const isValid = targetInfo?.type === 'temporary_stack' && draggedItem?.card;

      console.log('[STAGING_RULE] Temp stack addition condition:', isValid, {
        reason: isValid ? 'valid temp stack addition' : 'invalid target or missing card',
        validationApproach: 'game-appropriate'
      });
      return isValid;
    },
    action: (context) => {  // ✅ GAME-APPROPRIATE: Function returns complete object with payload
      console.log('[STAGING_RULE] Creating temp stack addition action (game-appropriate)');
      const action = {
        type: 'addToStagingStack',
        payload: {
          gameId: context.gameId,
          stackId: context.targetInfo?.stackId,
          card: context.draggedItem.card,
          source: context.draggedItem.source
        }
      };
      console.log('[STAGING_RULE] Temp stack addition action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: false,  // ✅ FIX: No modal interruptions during gameplay
    priority: 80,
    exclusive: true,
    description: 'Add card to existing temporary stack (game-appropriate, no modals)'
  }
];

module.exports = stagingRules;
