/**
 * Trail Action Rules
 * Rules for determining trail actions (placing cards on table)
 */

const { rankValue, isCard } = require('../../GameState');

const trailRules = [
  {
    id: 'trail-card',
    condition: (context) => {
      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;
      const round = context.round;
      const tableCards = context.tableCards || [];
      const currentPlayer = context.currentPlayer;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') {
        return false;
      }

      // Must be targeting empty table area (not specific cards)
      if (targetInfo?.type !== 'table' || targetInfo?.area !== 'empty') {
        return false;
      }

      // Round 1 restrictions: cannot trail if you have a build
      if (round === 1) {
        const hasOwnBuild = tableCards.some(card =>
          card.type === 'build' && card.owner === currentPlayer
        );
        if (hasOwnBuild) {
          return false;
        }
      }

      // Cannot trail if same rank card exists on table
      const draggedValue = rankValue(draggedItem.card.rank);
      const hasDuplicateOnTable = tableCards.some(card =>
        isCard(card) && rankValue(card.rank) === draggedValue
      );

      if (hasDuplicateOnTable) {
        return false;
      }
      return true;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      const action = {
        type: 'trail',
        payload: {  // Client expects nested payload structure
          card: context.draggedItem.card
        }
      };
      return action;
    },
    requiresModal: true,
    priority: 10,
    description: 'Place card on table (trail)'
  }
];

module.exports = trailRules;
