/**
 * Temp Action Rules
 * Rules for determining temp actions (temp stack creation and management)
 */

const { rankValue, calculateCardSum } = require('../../GameState');

// Helper functions for build feasibility checking
function hasSpareSameValue(value, playerHand, currentCard) {
  return playerHand.some(card =>
    card.value === value &&
    !(card.rank === currentCard.rank && card.suit === currentCard.suit)
  );
}

function hasSumCard(sumValue, playerHand) {
  return playerHand.some(card => card.value === sumValue);
}

function canBuildWithCards(handCard, target, playerHand) {
  const buildOptions = [];

  // Same-value build option
  if (hasSpareSameValue(handCard.value, playerHand, handCard)) {
    buildOptions.push('BUILD_SAME');
  }

  // Sum-value build option (only for 1-5)
  if (handCard.value <= 5) {
    let totalValue;
    if (target.type === 'loose') {
      totalValue = handCard.value + target.card.value;
    } else if (target.type === 'temporary_stack') {
      totalValue = handCard.value * (target.card.cards?.length || 1);
    }

    if (totalValue && hasSumCard(totalValue, playerHand)) {
      buildOptions.push('BUILD_SUM');
    }
  }

  return buildOptions;
}

// NEW: Check build options for same-value temp stacks
function checkBuildOptionsForStack(tempStack, playerHand) {
  const cards = tempStack.cards || [];
  if (cards.length === 0) return false;

  const stackValue = cards[0].value; // All cards have same value
  const stackSize = cards.length;

  console.log('[BUILD_CHECK_STACK] Checking options for same-value stack:', {
    stackId: tempStack.stackId,
    stackValue,
    stackSize,
    cards: cards.map(c => `${c.rank}${c.suit}`)
  });

  // Find the hand card that was used to create this stack
  const handCardInStack = cards.find(card => card.source === 'hand');

  // Check 1: Spare same-value card for building
  let hasSpareCard = false;
  if (handCardInStack) {
    hasSpareCard = playerHand.some(card =>
      card.value === stackValue &&
      !(card.rank === handCardInStack.rank && card.suit === handCardInStack.suit)
    );
  } else {
    // Fallback: check if any same-value cards exist in hand
    hasSpareCard = playerHand.some(card => card.value === stackValue);
  }

  console.log('[BUILD_CHECK_STACK] Spare card check:', {
    neededValue: stackValue,
    hasSpareCard,
    spareCards: playerHand.filter(c => c.value === stackValue).map(c => `${c.rank}${c.suit}`)
  });

  // Check 2: Sum build (only for low cards 1-5)
  let canBuildSum = false;
  if (stackValue <= 5) {
    const sumValue = stackValue * stackSize; // 5+5=10, 5+5+5=15, etc.
    canBuildSum = playerHand.some(card => card.value === sumValue);

    console.log('[BUILD_CHECK_STACK] Sum build check:', {
      isLowCard: stackValue <= 5,
      sumValue,
      hasSumCard: playerHand.some(c => c.value === sumValue),
      canBuildSum
    });
  } else {
    console.log('[BUILD_CHECK_STACK] Sum build: ❌ High card (6+), no sum builds possible');
  }

  const hasBuildOptions = hasSpareCard || canBuildSum;

  console.log('[BUILD_CHECK_STACK] Final result:', {
    hasSpareCard,
    canBuildSum,
    totalBuildOptions: (hasSpareCard ? 1 : 0) + (canBuildSum ? 1 : 0),
    hasBuildOptions
  });

  return hasBuildOptions;
}

const tempRules = [

  // NEW: Auto-capture rule for same-value when no build options exist
  {
    id: 'same-value-auto-capture',
    priority: 210, // HIGHEST: Must beat single-card-capture (200)
    exclusive: true, // ✅ EXCLUSIVE: Stop other rules when this fires
    requiresModal: false,
    condition: (context) => {
      console.log('[AUTO_CAPTURE] 🔍 Checking for same-value auto-capture');

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Must be dragging from hand
      if (draggedItem?.source !== 'hand') {
        console.log('[AUTO_CAPTURE] ❌ Not from hand');
        return false;
      }

      const handCard = draggedItem.card;
      const playerHand = context.playerHands[context.currentPlayer];

      // Check different target types
      if (targetInfo?.type === 'loose') {
        // Loose card same-value check
        const targetCard = targetInfo.card;
        if (handCard.value !== targetCard.value) return false;

        // Check if player has build options
        const buildOptions = canBuildWithCards(handCard, targetInfo, playerHand);

        const canAutoCapture = buildOptions.length === 0;

        console.log('[AUTO_CAPTURE] 🎯 Loose card check:', {
          handCard: `${handCard.rank}${handCard.suit}`,
          targetCard: `${targetCard.rank}${targetCard.suit}`,
          buildOptions: buildOptions.length,
          canAutoCapture,
          options: buildOptions
        });

        return canAutoCapture;

      } else if (targetInfo?.type === 'temporary_stack' && targetInfo.isSameValueStack) {
        // Same-value temp stack check
        const stackCards = targetInfo.card.cards || [];
        const firstValue = stackCards[0]?.value;

        // Verify all cards are same value
        const allSameValue = stackCards.every(c => c.value === firstValue);
        if (!allSameValue || handCard.value !== firstValue) return false;

        // Check build options for temp stack
        const buildOptions = canBuildWithCards(handCard, targetInfo, playerHand);

        const canAutoCapture = buildOptions.length === 0;

        console.log('[AUTO_CAPTURE] 🎯 Temp stack check:', {
          handCard: `${handCard.rank}${handCard.suit}`,
          stackValue: firstValue,
          stackSize: stackCards.length,
          buildOptions: buildOptions.length,
          canAutoCapture,
          options: buildOptions
        });

        return canAutoCapture;
      }

      return false;
    },
    action: (context) => {
      console.log('[AUTO_CAPTURE] ✅ Executing same-value auto-capture');

      const handCard = context.draggedItem.card;
      const target = context.targetInfo;

      // Get all cards to capture (target + hand card)
      let targetCards = [];
      let tempStackId = null;

      if (target.type === 'loose') {
        targetCards = [target.card, handCard];
      } else if (target.type === 'temporary_stack') {
        targetCards = [...(target.card.cards || []), handCard];
        tempStackId = target.card.stackId;
      }

      // Auto-capture immediately (inspired by build capture)
      return {
        type: 'capture',
        payload: {
          tempStackId: tempStackId,
          captureValue: handCard.value,
          targetCards: targetCards, // All cards including capture card
          capturingCard: handCard,
          captureType: 'same_value_auto'
        }
      };
    },
    description: 'Auto-capture same-value cards when no build options exist'
  },
  {
    id: 'loose-card-modal-options',
    priority: 205, // Between auto-capture (210) and single-card-capture (200)
    exclusive: false,
    requiresModal: true, // ✅ MODAL: Multiple strategic options available
    condition: (context) => {
      console.log('[MODAL_RULE] 🔍 Checking loose card modal options');

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Must be hand card on loose card
      if (draggedItem?.source !== 'hand' || targetInfo?.type !== 'loose') {
        console.log('[MODAL_RULE] ❌ Not hand card on loose card');
        return false;
      }

      // Must be same value
      const handValue = draggedItem.card.value;
      const targetValue = targetInfo.card.value;
      if (handValue !== targetValue) {
        console.log('[MODAL_RULE] ❌ Values don\'t match');
        return false;
      }

      // Must have build options (spare card or sum card)
      const playerHand = context.playerHands[context.currentPlayer];
      const buildOptions = canBuildWithCards(draggedItem.card, targetInfo, playerHand);

      const shouldShowModal = buildOptions.length > 0;

      console.log('[MODAL_RULE] 🎯 Build options check:', {
        handCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
        targetCard: `${targetInfo.card.rank}${targetInfo.card.suit}`,
        buildOptions: buildOptions.length,
        options: buildOptions,
        shouldShowModal
      });

      return shouldShowModal;
    },
    action: (context) => {
      console.log('[MODAL_RULE] ✅ Returning loose card modal options');

      const handCard = context.draggedItem.card;
      const targetCard = context.targetInfo.card;
      const playerHand = context.playerHands[context.currentPlayer];

      const availableOptions = [];

      // 1. CAPTURE: Always available
      availableOptions.push({
        type: 'capture',
        label: `Capture ${handCard.value}`,
        value: handCard.value,
        actionType: 'captureLooseCards'
      });

      // 2. BUILD: Same value (if spare card exists)
      const hasSpareCard = hasSpareSameValue(handCard.value, playerHand, handCard);
      if (hasSpareCard) {
        availableOptions.push({
          type: 'build',
          label: `Build ${handCard.value}`,
          value: handCard.value,
          actionType: 'createBuildFromLooseCards'
        });
      }

      // 3. BUILD: Sum value (only for 1-5)
      if (handCard.value <= 5) {
        const sumValue = handCard.value + targetCard.value;
        const hasSumCardAvailable = playerHand.some(card => card.value === sumValue);
        if (hasSumCardAvailable) {
          availableOptions.push({
            type: 'build',
            label: `Build ${sumValue}`,
            value: sumValue,
            actionType: 'createBuildFromLooseCards'
          });
        }
      }

      console.log('[MODAL_RULE] ✅ Generated loose card options:', {
        optionCount: availableOptions.length,
        options: availableOptions.map(o => o.label)
      });

      // Return data packet for modal
      return {
        type: 'showLooseCardOptions',
        payload: {
          handCard,
          targetCard,
          availableOptions
        }
      };
    },
    description: 'Show modal options for loose card same-value interactions with build choices'
  },
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

      const tempStack = context.targetInfo.card; // Note: targetInfo.card has the stack data
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

// Export the helper function for use in createTemp.js
module.exports.checkBuildOptionsForStack = checkBuildOptionsForStack;
