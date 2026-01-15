/**
 * Auto-Capture Rules
 * High-priority rules for automatic captures and modal options
 * Priorities: 210-205
 */

const { hasSpareSameValue, hasSumCard, canBuildWithCards } = require('../utils/buildUtils');

const autoCaptureRules = [
  // NEW: Auto-capture rule for same-value when no build options exist
  {
    id: 'same-value-auto-capture',
    priority: 210, // HIGHEST: Must beat single-card-capture (200)
    exclusive: true, // ✅ EXCLUSIVE: Stop other rules when this fires
    requiresModal: false,
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Must be dragging from hand
      if (draggedItem?.source !== 'hand') {
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
        return canAutoCapture;
      }

      return false;
    },
    action: (context) => {
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
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Must be hand card on loose card
      if (draggedItem?.source !== 'hand' || targetInfo?.type !== 'loose') {
        return false;
      }

      // Must be same value
      const handValue = draggedItem.card.value;
      const targetValue = targetInfo.card.value;
      if (handValue !== targetValue) {
        return false;
      }

      // Must have build options (spare card or sum card)
      const playerHand = context.playerHands[context.currentPlayer];
      const buildOptions = canBuildWithCards(draggedItem.card, targetInfo, playerHand);

      const shouldShowModal = buildOptions.length > 0;
      return shouldShowModal;
    },
    action: (context) => {
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
  }
];

module.exports = autoCaptureRules;