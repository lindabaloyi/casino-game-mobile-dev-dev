/**
 * Capture Action Rules
 * Rules for determining capture actions
 */

const { rankValue, isCard, isBuild, isTemporaryStack, calculateCardSum } = require('../../GameState');

const captureRules = [
  {
    id: 'single-card-capture',
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;
      const tableCards = context.tableCards || [];

      // Only for hand cards
      if (draggedItem?.source !== 'hand') return false;

      // Target must be a loose card
      if (targetInfo?.type !== 'loose' || !isCard(targetInfo.card)) return false;

      const draggedValue = rankValue(draggedItem.card.rank);
      const targetValue = rankValue(targetInfo.card.rank);

      return draggedValue === targetValue;
    },
    action: {
      type: 'capture',
      targetCards: (context) => [context.targetInfo.card],
      captureValue: (context) => rankValue(context.draggedItem.card.rank)
    },
    requiresModal: false,
    priority: 50,
    description: 'Capture single matching card'
  },
  {
    id: 'build-capture',
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') return false;

      // Target must be a build
      if (!isBuild(targetInfo?.card)) return false;

      const draggedValue = rankValue(draggedItem.card.rank);
      const buildValue = targetInfo.card.value;

      return draggedValue === buildValue;
    },
    action: {
      type: 'capture',
      targetCards: (context) => context.targetInfo.card.cards || [],
      captureValue: (context) => context.targetInfo.card.value
    },
    requiresModal: false,
    priority: 45,
    description: 'Capture entire build'
  },
  {
    id: 'temp-stack-capture',
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') return false;

      // Target must be a temporary stack
      if (!isTemporaryStack(targetInfo?.card)) return false;

      const draggedValue = rankValue(draggedItem.card.rank);
      const stackValue = targetInfo.card.captureValue ||
                        calculateCardSum(targetInfo.card.cards || []);

      return draggedValue === stackValue;
    },
    action: {
      type: 'capture',
      targetCards: (context) => context.targetInfo.card.cards || [],
      captureValue: (context) => context.targetInfo.card.captureValue ||
                                 calculateCardSum(context.targetInfo.card.cards || [])
    },
    requiresModal: false,
    priority: 40,
    description: 'Capture temporary stack'
  }
];

module.exports = captureRules;
