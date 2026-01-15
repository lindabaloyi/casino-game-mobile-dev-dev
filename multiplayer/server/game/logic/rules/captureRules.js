/**
 * Capture Action Rules
 * Rules for determining capture actions
 */

const { rankValue, isCard, isBuild, isTemporaryStack, calculateCardSum } = require('../../GameState');

const captureRules = [
  {
    id: 'single-card-capture',
    condition: (context) => {
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') {
        return false;
      }

      // Target must be a loose card
      if (targetInfo?.type !== 'loose' || !isCard(targetInfo.card)) {
        return false;
      }

      const draggedValue = rankValue(draggedItem.card.rank);
      const targetValue = rankValue(targetInfo.card.rank);
      const matches = draggedValue === targetValue;
      return matches;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      const action = {
        type: 'capture',
        payload: {
          tempStackId: null, // Single card capture - create temp stack on the fly
          captureValue: rankValue(context.draggedItem.card.rank),
          targetCards: [context.targetInfo.card, context.draggedItem.card], // Include capturing card on top
          capturingCard: context.draggedItem.card // Mark the capturing card
        }
      };
      return action;
    },
    requiresModal: false,
    priority: 200, // BOOSTED: Was 50, now highest priority
    description: 'Capture single matching card'
  },
  {
    id: 'build-capture',
    condition: (context) => {
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') {
        return false;
      }

      // Target must be a build (check targetInfo.type, not targetInfo.card.type)
      if (targetInfo?.type !== 'build') {
        return false;
      }

      const draggedValue = rankValue(draggedItem.card.rank);
      const buildValue = targetInfo.card.value;
      const matches = draggedValue === buildValue;

      console.log('[CAPTURE_RULE] 🎯 Build value check:', {
        draggedValue,
        buildValue,
        buildCards: targetInfo.card.cards?.map(c => `${c.rank}${c.suit}`) || [],
        matches,
        rule: 'build-capture'
      });
      return matches;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      const action = {
        type: 'capture',
        payload: {
          tempStackId: null, // Build capture - no temp stack, capture build cards directly
          captureValue: context.targetInfo.card.value,
          targetCards: [...(context.targetInfo.card.cards || []), context.draggedItem.card], // Include capturing card on top
          capturingCard: context.draggedItem.card, // Mark the capturing card
          buildId: context.targetInfo.card.buildId // Include build ID for cleanup
        }
      };
      return action;
    },
    requiresModal: false,
    priority: 195, // BOOSTED: Was 45, now second highest
    description: 'Capture entire build'
  },
  {
    id: 'temp-stack-capture',
    condition: (context) => {
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') {
        return false;
      }

      // Target must be a temporary stack
      if (!isTemporaryStack(targetInfo?.card)) {
        return false;
      }

      const draggedValue = rankValue(draggedItem.card.rank);
      // Use ONLY displayValue - this is the authoritative capture value set by build calculator
      const stackValue = targetInfo.card.displayValue;
      const matches = draggedValue === stackValue;

      // LOGGING: Show temp stack capture evaluation result
      return matches;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      const tempStackId = context.targetInfo.card.stackId;
      const captureValue = context.targetInfo.card.displayValue; // Use ONLY displayValue

      console.log('[CAPTURE_RULE] 📋 Temp stack capture details:', {
        stackId: tempStackId,
        captureValue: captureValue,
        tempStackCards: context.targetInfo.card.cards?.map(c => `${c.rank}${c.suit}`) || [],
        capturingCard: `${context.draggedItem.card.rank}${context.draggedItem.card.suit}`
      });

      const action = {
        type: 'capture',
        payload: {
          tempStackId: tempStackId,  // CRITICAL: Must be set to remove entire temp stack from table
          captureValue: captureValue,
          targetCards: [...(context.targetInfo.card.cards || []), context.draggedItem.card], // Include capturing card on top
          capturingCard: context.draggedItem.card // Mark the capturing card
        }
      };
      return action;
    },
    requiresModal: false,
    priority: 190, // BOOSTED: Was 40, now third highest
    exclusive: true, // 🚫 EXCLUSIVE: Stop further rule evaluation when capture matches
    description: 'Capture temporary stack'
  }
];

module.exports = captureRules;
