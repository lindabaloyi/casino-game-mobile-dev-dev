/**
 * Staging Action Rules
 * Rules for determining staging actions (temp stack creation)
 */

const stagingRules = [
  {
    id: 'temp-stack-addition',
    priority: 100, // ✅ HIGHEST PRIORITY: Adding to existing temp stacks
    exclusive: true, // ✅ EXCLUSIVE: Prevents other rules from matching
    requiresModal: false,
    condition: (context) => {
      const targetInfo = context.targetInfo;
      const draggedItem = context.draggedItem;

      // ✅ PRIMARY CONDITION: Target must be an existing temp stack
      const isTempStackTarget = targetInfo?.type === 'temporary_stack';
      const hasValidCard = draggedItem?.card;

      console.log('[STAGING_RULE] Temp stack addition check:', {
        targetType: targetInfo?.type,
        stackId: targetInfo?.stackId,
        draggedSource: draggedItem?.source,
        hasValidCard,
        isTempStackTarget,
        result: isTempStackTarget && hasValidCard
      });

      return isTempStackTarget && hasValidCard;
    },
    action: (context) => {
      console.log('[STAGING_RULE] ✅ Creating temp stack addition action');
      return {
        type: 'addToStagingStack',
        payload: {
          gameId: context.gameId,
          stackId: context.targetInfo?.stackId,
          card: context.draggedItem.card,
          source: context.draggedItem.source
        }
      };
    },
    description: 'Add card to existing temporary stack (highest priority, exclusive)'
  },
  {
    id: 'table-to-table-staging',
    priority: 90, // Lower priority for new temp stack creation
    exclusive: true,
    requiresModal: false,
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // ✅ SPECIFIC CONDITION: Table source + loose target = new temp stack
      const isTableSource = draggedItem?.source === 'table';
      const isLooseTarget = targetInfo?.type === 'loose';
      const hasValidCards = draggedItem?.card && targetInfo?.card;

      console.log('[STAGING_RULE] Table-to-table staging check:', {
        source: draggedItem?.source,
        targetType: targetInfo?.type,
        isTableSource,
        isLooseTarget,
        hasValidCards,
        result: isTableSource && isLooseTarget && hasValidCards
      });

      return isTableSource && isLooseTarget && hasValidCards;
    },
    action: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Check if player has active builds for augmentation capability
      const playerHasBuilds = context.tableCards.some(tc =>
        tc.type === 'build' && tc.owner === draggedItem.player
      );

      console.log('[STAGING_RULE] ✅ Creating table-to-table staging action:', {
        canAugmentBuilds: playerHasBuilds
      });

      return {
        type: 'createStagingStack',
        payload: {
          source: draggedItem.source,
          card: draggedItem.card,
          targetIndex: targetInfo.index,
          player: draggedItem.player,
          isTableToTable: true,
          canAugmentBuilds: playerHasBuilds
        }
      };
    },
    description: 'Create new temp stack from two table cards'
  },
  {
    id: 'hand-to-table-staging',
    priority: 85, // Lower priority for hand-to-table
    exclusive: false,
    requiresModal: false,
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Hand source + loose target
      const isHandSource = draggedItem?.source === 'hand';
      const isLooseTarget = targetInfo?.type === 'loose';
      const hasValidCards = draggedItem?.card && targetInfo?.card;

      console.log('[STAGING_RULE] Hand-to-table staging check:', {
        source: draggedItem?.source,
        targetType: targetInfo?.type,
        isHandSource,
        isLooseTarget,
        hasValidCards,
        result: isHandSource && isLooseTarget && hasValidCards
      });

      return isHandSource && isLooseTarget && hasValidCards;
    },
    action: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Check if player has active builds for augmentation capability
      const playerHasBuilds = context.tableCards.some(tc =>
        tc.type === 'build' && tc.owner === draggedItem.player
      );

      console.log('[STAGING_RULE] ✅ Creating hand-to-table staging action:', {
        canAugmentBuilds: playerHasBuilds
      });

      return {
        type: 'createStagingStack',
        payload: {
          source: draggedItem.source,
          card: draggedItem.card,
          targetIndex: targetInfo.index,
          player: draggedItem.player,
          isTableToTable: false,
          canAugmentBuilds: playerHasBuilds
        }
      };
    },
    description: 'Create new temp stack from hand card to table card'
  }
];

module.exports = stagingRules;
