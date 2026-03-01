/**
 * addToTemp
 * Player adds a card to their existing temp stack.
 * FREE STACKING - no validation checks.
 * 
 * Two build types:
 * - SUM builds: total ≤ 10, all cards sum together
 * - DIFF builds: total > 10, largest is base
 * 
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ card: object, stackId: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function addToTemp(state, payload, playerIndex) {
  // Accept card, tableCard, or handCard
  const card = payload.card || payload.tableCard || payload.handCard;
  const stackId = payload.stackId;

  if (!card || !stackId) {
    throw new Error('addToTemp: missing card or stackId');
  }

  const newState = cloneState(state);

  // Find the temp stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToTemp: temp stack "${stackId}" not found`);
  }
  const stack = newState.tableCards[stackIdx];

  // Try to find and remove card from table first, then hand
  let source = 'unknown';
  let cardFound = false;
  
  // Check loose table cards first
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (tableIdx !== -1) {
    const [tableCard] = newState.tableCards.splice(tableIdx, 1);
    source = 'table';
    cardFound = true;
  } else {
    // Not on table, try hand
    const hand = newState.playerHands[playerIndex];
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx !== -1) {
      const [handCard] = hand.splice(handIdx, 1);
      source = 'hand';
      cardFound = true;
    }
  }

  // If card wasn't found anywhere, log warning and return unchanged state
  if (!cardFound) {
    console.log(`[addToTemp] Warning: card ${card.rank}${card.suit} not found in hand or on table`);
    return state;
  }

  // Add card to stack with source
  stack.cards.push({ ...card, source });

  // Calculate total sum of all cards
  const totalSum = stack.cards.reduce((sum, c) => sum + c.value, 0);
  
  if (totalSum <= 10) {
    // SUM BUILD: All cards add together (like 4+3+2=9)
    stack.value = totalSum;
    stack.base = totalSum;  // Base is the total sum
    stack.need = 0;         // Complete build
    stack.buildType = 'sum';
  } else {
    // DIFF BUILD: Largest is base, others try to sum to it
    const sorted = [...stack.cards].sort((a, b) => b.value - a.value);
    const base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    const need = base - otherSum;
    
    stack.value = base;
    stack.base = base;
    stack.need = need;
    stack.buildType = 'diff';
  }

  console.log(`[addToTemp] Stack "${stackId}" now has ${stack.cards.length} cards:`, 
    stack.cards.map(c => `${c.rank}${c.suit}`).join(', '));
  console.log(`[addToTemp] Build type: ${stack.buildType}, value: ${stack.value}, need: ${stack.need}`);

  return newState;
}

module.exports = addToTemp;
