/**
 * createTemp
 * Creates a temporary stack from:
 * - hand card + loose table card, OR
 * - loose table card + loose table card
 *
 * Rules:
 *  - Turn does NOT advance — player must Accept/Cancel
 *
 * Uses same sum/diff logic as addToTemp:
 * - total ≤ 10 → sum build (all cards add together)
 * - total > 10 → diff build (largest is base)
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState } = require('../GameState');

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

  // Find first card: check table first, then hand
  let firstCard = null;
  let firstSource = '';
  
  // Check table first (loose cards only)
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (tableIdx !== -1) {
    [firstCard] = newState.tableCards.splice(tableIdx, 1);
    firstSource = 'table';
  } else {
    // Check player's hand
    const hand = newState.playerHands[playerIndex];
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx !== -1) {
      [firstCard] = hand.splice(handIdx, 1);
      firstSource = 'hand';
    }
  }
  
  if (!firstCard) {
    console.log(`[createTemp] Warning: card ${card.rank}${card.suit} not found on table or hand`);
    return state;
  }

  // Find target card on table (must be loose) - get index BEFORE removing first card
  // This is important because removing the first card might shift indices
  let targetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (targetIdx === -1) {
    console.log(`[createTemp] Warning: targetCard ${targetCard.rank}${targetCard.suit} not found on table`);
    return state;
  }

  // Now remove the first card from table (if it's there)
  // Adjust targetIdx if the first card was before the target card
  let adjustedTargetIdx = targetIdx;
  if (tableIdx !== -1 && tableIdx < targetIdx) {
    // First card is before target in array - removing it shifts target index down
    adjustedTargetIdx = targetIdx - 1;
  }
  
  const [tableCard] = newState.tableCards.splice(targetIdx, 1);

  // Sort: higher-value card is the base (bottom), lower-value sits on top.
  const [bottom, top] = firstCard.value >= tableCard.value
    ? [{ ...firstCard, source: firstSource }, { ...tableCard, source: 'table' }]
    : [{ ...tableCard, source: 'table' }, { ...firstCard, source: firstSource }];

  // --- SAME LOGIC as addToTemp ---
  const cards = [bottom, top];
  const totalSum = cards.reduce((sum, c) => sum + c.value, 0);
  
  let base, need, buildType;
  if (totalSum <= 10) {
    // SUM BUILD: all cards add together
    base = totalSum;
    need = 0;
    buildType = 'sum';
  } else {
    // DIFF BUILD: largest is base
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    need = base - otherSum;
    buildType = 'diff';
  }

  // Insert temp stack at the adjusted position (right after where target card was)
  // This ensures visual order matches array order in the flex layout
  newState.tableCards.splice(adjustedTargetIdx + 1, 0, {
    type: 'temp_stack',
    stackId: `temp_${Date.now()}_p${playerIndex}`,
    cards: [bottom, top],
    owner: playerIndex,
    value: base,
    base: base,
    need: need,
    buildType: buildType,
  });

  // Find the newly inserted stack (it was inserted at adjustedTargetIdx + 1)
  const newStack = newState.tableCards[adjustedTargetIdx + 1];
  console.log(`[createTemp] Created: ${newStack?.cards?.map(c => `${c.rank}${c.suit}`).join(', ') || 'N/A'} | type=${buildType}, value=${base}, need=${need}`);

  // ⚠️  No nextTurn() — turn advances when the overlay Accept/Cancel is added
  return newState;
}

module.exports = createTemp;
