/**
 * addToTemp
 * Player drags a card (hand or loose table) onto their existing temp stack —
 * appending it to the stack.
 *
 * Rules:
 *  - Either tableCard (loose) OR card (hand) must be provided
 *  - stackId must exist in tableCards as a temp_stack
 *  - Player must own that temp stack
 *  - Turn does NOT advance — player must Accept/Cancel
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ tableCard?: object, card?: object, stackId: string }} payload
 *   tableCard - loose table card being added (optional)
 *   card      - hand card being added (optional)
 *   stackId   - target temp stack
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function addToTemp(state, payload, playerIndex) {
  const { tableCard, card, stackId } = payload;

  if (!stackId) {
    throw new Error('addToTemp: missing stackId');
  }

  // Must provide either tableCard or card
  const isTableCard = tableCard?.rank && tableCard?.suit;
  const isHandCard = card?.rank && card?.suit;
  
  if (!isTableCard && !isHandCard) {
    throw new Error('addToTemp: must provide either tableCard or card');
  }

  const newState = cloneState(state);

  // Find and validate the temp stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToTemp: temp stack "${stackId}" not found`);
  }
  const stack = newState.tableCards[stackIdx];
  if (stack.owner !== playerIndex) {
    throw new Error(`addToTemp: player ${playerIndex} does not own stack "${stackId}"`);
  }

  if (isTableCard) {
    // Remove loose table card from table
    const cardIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === tableCard.rank && tc.suit === tableCard.suit,
    );
    if (cardIdx === -1) {
      throw new Error(
        `addToTemp: tableCard ${tableCard.rank}${tableCard.suit} not found as a loose table card`,
      );
    }
    const [looseCard] = newState.tableCards.splice(cardIdx, 1);
    
    // Append to stack - tag as 'table' so cancelTemp returns it correctly
    stack.cards.push({ ...looseCard, source: 'table' });
    
    console.log(`[addToTemp] Added table card ${looseCard.rank}${looseCard.suit} to stack "${stackId}"`);
  } 
  else if (isHandCard) {
    // Remove hand card from player's hand
    const hand = newState.playerHands[playerIndex];
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx === -1) {
      throw new Error(
        `addToTemp: hand card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`,
      );
    }
    const [handCard] = hand.splice(handIdx, 1);
    
    // Append to stack - tag as 'hand' so cancelTemp returns it correctly
    stack.cards.push({ ...handCard, source: 'hand' });
    
    console.log(`[addToTemp] Added hand card ${handCard.rank}${handCard.suit} to stack "${stackId}"`);
  }

  // Recalculate stack value from all cards (hand + table)
  stack.value = stack.cards.reduce((sum, c) => sum + c.value, 0);

  // Log the number of cards in temp stack
  console.log(`[addToTemp] Stack "${stackId}" now has ${stack.cards.length} cards:`, stack.cards.map(c => `${c.rank}${c.suit}`), `value: ${stack.value}`);

  // ⚠️  No nextTurn() — turn advances when player Accepts
  return newState;
}

module.exports = addToTemp;
