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
      console.log('[TEMP_RULE_EVAL] 📊 Context:', {
        draggedItem: context.draggedItem ? `${context.draggedItem.card?.rank}${context.draggedItem.card?.suit}(${context.draggedItem.card?.value})` : null,
        draggedSource: context.draggedItem?.source,
        targetInfoType: context.targetInfo?.type,
        targetInfoStackId: context.targetInfo?.stackId,
        currentPlayer: context.currentPlayer
      });
      const targetInfo = context.targetInfo;
      // ✅ CONDITION: Target is temp stack marked as same-value
      const isTempStack = targetInfo?.type === 'temporary_stack';
      if (!isTempStack) {
        return false;
      }
      // Use the flag set by client during temp stack creation
      const isSameValueStack = targetInfo.isSameValueStack === true;
      const finalResult = isSameValueStack;
      return finalResult;
    },
    action: (context) => {
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
      console.log('[TEMP_RULE_EVAL] 📊 Context:', {
        draggedItem: context.draggedItem ? `${context.draggedItem.card?.rank}${context.draggedItem.card?.suit}(${context.draggedItem.card?.value})` : null,
        draggedSource: context.draggedItem?.source,
        targetInfoType: context.targetInfo?.type,
        targetInfoStackId: context.targetInfo?.stackId,
        currentPlayer: context.currentPlayer
      });
      const targetInfo = context.targetInfo;
      const draggedItem = context.draggedItem;
      // ✅ PRIMARY CONDITION: Target must be an existing temp stack
      const isTempStackTarget = targetInfo?.type === 'temporary_stack';
      const hasValidCard = draggedItem?.card;
      console.log('[TEMP_RULE_EVAL] ✅ Condition 2 - Has valid card:', {
        condition: 'draggedItem?.card exists',
        result: hasValidCard,
        card: hasValidCard ? `${draggedItem.card.rank}${draggedItem.card.suit}(${draggedItem.card.value})` : null
      });
      const finalResult = isTempStackTarget && hasValidCard;
      return finalResult;
    },
    action: (context) => {
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