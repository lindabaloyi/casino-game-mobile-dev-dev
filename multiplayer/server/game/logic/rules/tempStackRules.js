/**
 * Temp Stack Rules
 * Rules for handling temp stack interactions and modifications
 * Priorities: 188-100
 */

const { checkBuildOptionsForStack } = require('../utils/buildUtils');

const tempStackRules = [
  {
    id: 'same-value-modal-options',
    priority: 188, // Lower priority for temp stacks
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
      console.log('[SAME_VALUE_RULE] 🎯 Processing same-value temp stack');

      const tempStack = context.targetInfo; // targetInfo has the stack data directly
      const playerHand = context.playerHands[context.currentPlayer];

      console.log('[SAME_VALUE_RULE] Stack details:', {
        stackId: tempStack.stackId,
        cards: tempStack.cards?.map(c => `${c.rank}${c.suit}=${c.value}`),
        playerHand: playerHand.map(c => `${c.rank}${c.suit}=${c.value}`)
      });

      // Check if player has build options for this same-value stack
      const hasBuildOptions = checkBuildOptionsForStack(tempStack, playerHand);

      if (!hasBuildOptions) {
        // ⚡ AUTO-CAPTURE: No build options available
        console.log('[SAME_VALUE_RULE] 🚀 NO BUILD OPTIONS - AUTO-CAPTURING!');

        return {
          type: 'capture',
          payload: {
            tempStackId: tempStack.stackId,
            captureValue: tempStack.cards[0]?.value,
            targetCards: tempStack.cards, // All cards in temp stack
            captureType: 'same_value_auto_capture'
          }
        };
      } else {
        // 📋 SHOW MODAL: Build options exist
        console.log('[SAME_VALUE_RULE] 📋 HAS BUILD OPTIONS - SHOWING MODAL');

        const cards = tempStack.cards || [];
        const stackValue = cards[0]?.value;
        const stackSum = cards.reduce((sum, card) => sum + card.value, 0);

        const availableOptions = [];

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

        console.log('[SAME_VALUE_RULE] ✅ Generated modal options:', {
          optionCount: availableOptions.length,
          options: availableOptions.map(o => o.label)
        });

        // Return DATA PACKET for modal
        return {
          type: 'showTempStackOptions',
          payload: {
            tempStackId: tempStack.stackId,
            availableOptions: availableOptions
          }
        };
      }
    },
    description: 'Handle same-value temp stacks with strategic capture/build options'
  },
  {
    id: 'temp-stack-addition',
    priority: 100, // Lower priority than immediate capture (110)
    exclusive: false, // ✅ CHANGED: Allow other rules to be evaluated
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
  }
];

module.exports = tempStackRules;
