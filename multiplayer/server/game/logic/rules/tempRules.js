/**
 * Temp Action Rules
 * Rules for determining temp actions (temp stack creation and management)
 */

const tempRules = [
  {
    id: 'same-value-temp-stack-actions',
    priority: 95, // ✅ HIGH PRIORITY: Same-value temp stack strategic options
    exclusive: false,
    requiresModal: true, // ✅ MODAL: Multiple strategic options available
    condition: (context) => {
      console.log('[TEMP_RULE] Evaluating same-value rule condition');
      const targetInfo = context.targetInfo;

      // ✅ CONDITION: Target is temp stack marked as same-value
      const isTempStack = targetInfo?.type === 'temporary_stack';
      console.log('[TEMP_RULE] Is temp stack:', isTempStack);
      if (!isTempStack) return false;

      // Use the flag set by client during temp stack creation
      const isSameValueStack = targetInfo.isSameValueStack === true;
      console.log('[TEMP_RULE] Is same-value stack (from flag):', isSameValueStack);

      console.log('[TEMP_RULE] Same-value temp stack check result:', isSameValueStack);
      return isSameValueStack;
    },
    action: (context) => {
      const tempStack = context.targetInfo;
      const playerHand = context.playerHands[context.currentPlayer];
      const cards = tempStack.cards || [];
      const stackValue = cards[0]?.value; // Rank value (e.g., 3)
      const stackSum = cards.reduce((sum, card) => sum + card.value, 0);

      console.log('[TEMP_RULE] ✅ Processing same-value temp stack:', {
        stackId: tempStack.stackId,
        stackValue,
        stackSum,
        cardCount: cards.length,
        handSize: playerHand.length,
        cardsPlayed: cards.map(c => `${c.rank}${c.suit}`)
      });

      const availableOptions = [];

      // SAME-VALUE STACKS: Calculate available options based on casino rules
      // Player has already played their card by creating this temp stack

      // 1. CAPTURE: ALWAYS available (card already in temp stack)
      availableOptions.push({
        type: 'capture',
        label: `Capture ${stackValue}`,
        value: stackValue,
        actionType: 'captureTempStack'
      });

      // 2. BUILD: Same rank value (if player has that card)
      const hasSameValueCard = playerHand.some(card => card.value === stackValue);
      if (hasSameValueCard) {
        availableOptions.push({
          type: 'build',
          label: `Build ${stackValue}`,
          value: stackValue,
          actionType: 'createBuildFromTempStack'
        });
      }

      // 3. BUILD: Sum total (only if all cards ≤ 5 AND player has sum card)
      const allCardsFiveOrLess = cards.every((card) => card.value <= 5);
      const hasSumCard = playerHand.some(card => card.value === stackSum);

      if (allCardsFiveOrLess && hasSumCard) {
        availableOptions.push({
          type: 'build',
          label: `Build ${stackSum}`,
          value: stackSum,
          actionType: 'createBuildFromTempStack'
        });
      }

      console.log('[TEMP_RULE] ✅ Generated same-value options:', {
        optionCount: availableOptions.length,
        options: availableOptions.map(o => o.label)
      });

      // Return DATA PACKET instead of executable actions
      return {
        type: 'showTempStackOptions', // Data packet, not action
        payload: {
          tempStackId: tempStack.stackId,
          availableOptions: availableOptions
        }
      };
    },
    description: 'Handle same-value temp stacks with strategic capture/build options'
  },
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

      console.log('[TEMP_RULE] Temp stack addition check:', {
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
      console.log('[TEMP_RULE] ✅ Creating temp stack addition action');
      return {
        type: 'addToOwnTemp',
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

module.exports = tempRules;
