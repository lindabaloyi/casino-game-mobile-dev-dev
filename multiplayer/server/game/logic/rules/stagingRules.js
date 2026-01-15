/**
 * Staging Rules
 * Rules for creating new temp stacks from card combinations
 * Priorities: 90-85
 */

const stagingRules = [
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

      console.log('[TEMP_RULE] Table-to-table temp creation check:', {
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

      console.log('[TEMP_RULE] ✅ Creating table-to-table temp action:', {
        canAugmentBuilds: playerHasBuilds
      });

      return {
        type: 'createTemp',
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

      console.log('[TEMP_RULE] Hand-to-table temp creation check:', {
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

      console.log('[TEMP_RULE] ✅ Creating hand-to-table temp action:', {
        canAugmentBuilds: playerHasBuilds
      });

      return {
        type: 'createTemp',
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