/**
 * createTemp
 * Creates a temporary stack from two loose table cards.
 *
 * Rules:
 *  - Two loose table cards only
 *  - Turn does NOT advance — player must Accept/Cancel
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState } = require('../GameState');

/**
 * Simple build value calculation (inlined, no external dependency)
 * @param {Array} cards - Array of card objects
 * @returns {{ base: number, need: number }}
 */
function calculateBuildParams(cards) {
  if (!cards || cards.length === 0) {
    return { base: 0, need: 0 };
  }
  
  // Sort by value descending - largest is base
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const base = sorted[0].value;
  
  // Need = base - sum of all other cards
  const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
  const need = base - otherSum;
  
  return { base, need };
}

/**
 * @param {object} state
 * @param {{ card: object, targetCard: object }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function createTemp(state, payload, playerIndex) {
  const { card, targetCard } = payload;

  if (!card?.rank || !card?.suit) {
    throw new Error('createTemp: invalid card payload');
  }
  if (!targetCard?.rank || !targetCard?.suit) {
    throw new Error('createTemp: invalid targetCard payload');
  }

  const newState = cloneState(state);

  // Find first card on table (must be loose - no type)
  const firstIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (firstIdx === -1) {
    console.log(`[createTemp] Warning: card ${card.rank}${card.suit} not found on table`);
    return state; // Return unchanged state instead of throwing
  }
  const [firstCard] = newState.tableCards.splice(firstIdx, 1);

  // Find target card on table (must be loose - no type)
  const targetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (targetIdx === -1) {
    console.log(`[createTemp] Warning: targetCard ${targetCard.rank}${targetCard.suit} not found on table`);
    return state; // Return unchanged state instead of throwing
  }
  const [tableCard] = newState.tableCards.splice(targetIdx, 1);

  // Sort: higher-value card is the base (bottom), lower-value sits on top.
  const [bottom, top] = firstCard.value >= tableCard.value
    ? [{ ...firstCard, source: 'table' }, { ...tableCard, source: 'table' }]
    : [{ ...tableCard, source: 'table' }, { ...firstCard, source: 'table' }];

  // Calculate build parameters: base (largest card) and need (what's needed to complete)
  const { base, need } = calculateBuildParams([bottom, top]);

  newState.tableCards.push({
    type: 'temp_stack',
    stackId: `temp_${Date.now()}_p${playerIndex}`,
    cards: [bottom, top],
    owner: playerIndex,
    value: base, // Stack value is the base (target), not the sum
    base: base,  // The build target (largest card)
    need: need,  // Cards needed to complete the build
  });

  // Log temp stack info
  const newStack = newState.tableCards[newState.tableCards.length - 1];
  console.log(`[createTemp] Created: ${newStack.cards.map(c => `${c.rank}${c.suit}`).join(', ')} | base=${newStack.base}, need=${newStack.need}`);

  // ⚠️  No nextTurn() — turn advances when the overlay Accept/Cancel is added
  return newState;
}

module.exports = createTemp;
