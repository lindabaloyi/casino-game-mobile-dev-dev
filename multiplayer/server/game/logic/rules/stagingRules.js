/**
 * Staging Action Rules
 * Rules for determining staging actions (temp stack creation)
 */

const stagingRules = [
  {
    id: 'table-to-table-staging',
    condition: (context) => {
      console.log('[STAGING_RULE] Evaluating table-to-table staging:', {
        draggedSource: context.draggedItem?.source,
        targetType: context.targetInfo?.type
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      const isValid = draggedItem?.source === 'table' && targetInfo?.type === 'loose';
      console.log('[STAGING_RULE] Table-to-table staging condition:', isValid);
      return isValid;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object with payload
      console.log('[STAGING_RULE] Creating table-to-table action with payload');
      const action = {
        type: 'tableToTableDrop',
        payload: {
          gameId: context.gameId,
          draggedItem: context.draggedItem,
          targetInfo: context.targetInfo
        }
      };
      console.log('[STAGING_RULE] Table-to-table action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: false,
    priority: 100,
    exclusive: true,
    description: 'Create temp stack from two table cards'
  },
  {
    id: 'hand-to-table-staging',
    condition: (context) => {
      console.log('[STAGING_RULE] Evaluating hand-to-table staging:', {
        draggedSource: context.draggedItem?.source,
        targetType: context.targetInfo?.type
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      const isValid = draggedItem?.source === 'hand' && targetInfo?.type === 'loose';
      console.log('[STAGING_RULE] Hand-to-table staging condition:', isValid);
      return isValid;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object with payload
      console.log('[STAGING_RULE] Creating hand-to-table action with payload');
      const action = {
        type: 'handToTableDrop',
        payload: {
          gameId: context.gameId,
          draggedItem: context.draggedItem,
          targetInfo: context.targetInfo
        }
      };
      console.log('[STAGING_RULE] Hand-to-table action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: false,
    priority: 90,
    exclusive: true,
    description: 'Create temp stack from hand card and table card'
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
