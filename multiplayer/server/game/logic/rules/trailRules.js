/**
 * Trail Action Rules
 * Rules for determining trail actions (placing cards on table)
 */

const { rankValue, isCard } = require('../../GameState');

const trailRules = [
  {
    id: 'trail-card',
    condition: (context) => {
      console.log('[TRAIL_RULE] Evaluating trail condition:', {
        draggedSource: context.draggedItem?.source,
        targetType: context.targetInfo?.type,
        targetArea: context.targetInfo?.area,
        round: context.round
      });

      const draggedItem = context.draggedItem;
      const targetInfo = context.targetInfo;
      const round = context.round;
      const tableCards = context.tableCards || [];
      const currentPlayer = context.currentPlayer;

      // Only for hand cards
      if (draggedItem?.source !== 'hand') {
        console.log('[TRAIL_RULE] ❌ Not hand card, rejecting trail');
        return false;
      }

      // Must be targeting empty table area (not specific cards)
      if (targetInfo?.type !== 'table' || targetInfo?.area !== 'empty') {
        console.log('[TRAIL_RULE] ❌ Not targeting empty table area, rejecting trail');
        return false;
      }

      // Round 1 restrictions: cannot trail if you have a build
      if (round === 1) {
        const hasOwnBuild = tableCards.some(card =>
          card.type === 'build' && card.owner === currentPlayer
        );
        if (hasOwnBuild) {
          console.log('[TRAIL_RULE] ❌ Round 1 with own build, rejecting trail');
          return false;
        }
      }

      // Cannot trail if same rank card exists on table
      const draggedValue = rankValue(draggedItem.card.rank);
      const hasDuplicateOnTable = tableCards.some(card =>
        isCard(card) && rankValue(card.rank) === draggedValue
      );

      if (hasDuplicateOnTable) {
        console.log('[TRAIL_RULE] ❌ Duplicate card on table, rejecting trail');
        return false;
      }

      console.log('[TRAIL_RULE] ✅ Trail condition met');
      return true;
    },
    action: (context) => {  // ✅ OPTION B: Function returns complete object
      console.log('[TRAIL_RULE] Creating trail action for card:', context.draggedItem.card);

      const action = {
        type: 'trail',
        payload: {  // Client expects nested payload structure
          card: context.draggedItem.card
        }
      };

      console.log('[TRAIL_RULE] Trail action created:', JSON.stringify(action, null, 2));
      return action;
    },
    requiresModal: true,
    priority: 10,
    description: 'Place card on table (trail)'
  }
];

module.exports = trailRules;
