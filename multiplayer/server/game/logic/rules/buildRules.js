/**
 * Build Action Rules
 * Rules for determining build actions (creating and extending builds)
 */

const { rankValue, isBuild } = require('../../GameState');

const buildRules = [
  {
    id: 'create-own-build',
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;
      const currentPlayer = context.currentPlayer;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') return false;

      // Target must be a loose card
      if (targetInfo?.type !== 'loose' || isBuild(targetInfo.card)) return false;

      // Must be round 1 or player must have existing build
      const round = context.round;
      const tableCards = context.tableCards || [];
      const hasOwnBuild = tableCards.some(card =>
        isBuild(card) && card.owner === currentPlayer
      );

      return round === 1 || hasOwnBuild;
    },
    action: {
      type: 'build',
      operation: 'create',
      owner: (context) => context.currentPlayer,
      cards: (context) => [context.targetInfo.card, context.draggedItem.card],
      value: (context) => rankValue(context.targetInfo.card.rank) + rankValue(context.draggedItem.card.rank)
    },
    requiresModal: true,
    priority: 35,
    description: 'Create new build from loose card and hand card'
  },
  {
    id: 'extend-own-build',
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;
      const currentPlayer = context.currentPlayer;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') return false;

      // Target must be player's own build
      if (!isBuild(targetInfo?.card) || targetInfo.card.owner !== currentPlayer) return false;

      // Check if extension is valid (total <= 10)
      const buildValue = targetInfo.card.value;
      const cardValue = rankValue(draggedItem.card.rank);
      const newTotal = buildValue + cardValue;

      return newTotal <= 10;
    },
    action: {
      type: 'build',
      operation: 'extend',
      targetBuild: (context) => context.targetInfo.card,
      addedCard: (context) => context.draggedItem.card,
      newValue: (context) => context.targetInfo.card.value + rankValue(context.draggedItem.card.rank)
    },
    requiresModal: false,
    priority: 30,
    description: 'Extend own build by adding card'
  },
  {
    id: 'extend-opponent-build',
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;
      const currentPlayer = context.currentPlayer;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') return false;

      // Target must be opponent's build that allows extension
      if (!isBuild(targetInfo?.card) ||
          targetInfo.card.owner === currentPlayer ||
          !targetInfo.card.isExtendable) return false;

      // Check if extension is valid (total <= 10)
      const buildValue = targetInfo.card.value;
      const cardValue = rankValue(draggedItem.card.rank);
      const newTotal = buildValue + cardValue;

      return newTotal <= 10;
    },
    action: {
      type: 'build',
      operation: 'extend',
      targetBuild: (context) => context.targetInfo.card,
      addedCard: (context) => context.draggedItem.card,
      newValue: (context) => context.targetInfo.card.value + rankValue(context.draggedItem.card.rank)
    },
    requiresModal: true,
    priority: 25,
    description: 'Extend opponent build by adding card'
  }
];

module.exports = buildRules;
