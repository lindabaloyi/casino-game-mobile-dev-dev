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

const { cloneState, generateStackId } = require('../GameState');

/**
 * @param {object} state
 * @param {{ card: object, targetCard: object }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function createTemp(state, payload, playerIndex) {
  const { card, targetCard } = payload;

  console.log(`[createTemp] Creating temp stack - card: ${card?.rank}${card?.suit}, targetCard: ${targetCard?.rank}${targetCard?.suit}`);

  if (!card?.rank || !card?.suit) {
    throw new Error('createTemp: invalid card payload');
  }
  if (!targetCard?.rank || !targetCard?.suit) {
    throw new Error('createTemp: invalid targetCard payload');
  }

  const newState = cloneState(state);

  // Find first card: check table first, then hand, then opponent's captures
  let firstCard = null;
  let firstSource = '';
  let firstCardFoundOnTable = false;
  
  // Check table first (loose cards only)
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (tableIdx !== -1) {
    [firstCard] = newState.tableCards.splice(tableIdx, 1);
    firstSource = 'table';
    firstCardFoundOnTable = true;
  } else {
    // Check player's hand
    const hand = newState.playerHands[playerIndex];
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx !== -1) {
      [firstCard] = hand.splice(handIdx, 1);
      firstSource = 'hand';
    } else {
      // Check opponent's captures (player is using opponent's captured card)
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentCaptures = newState.playerCaptures[opponentIndex];
      const captureIdx = opponentCaptures.findIndex(
        c => c.rank === card.rank && c.suit === card.suit,
      );
      if (captureIdx !== -1) {
        [firstCard] = opponentCaptures.splice(captureIdx, 1);
        firstSource = 'captured';
        console.log(`[createTemp] Card ${card.rank}${card.suit} found in opponent's captures`);
      }
    }
  }
  
  if (!firstCard) {
    console.log(`[createTemp] Warning: card ${card.rank}${card.suit} not found on table, hand, or captures`);
    return state;
  }

  // Find first card index BEFORE any modifications - we need this to insert at correct position
  // If card was from table: use its original index
  // If card was from hand or captures: add to end of table cards (will be at targetIdx position)
  const originalFirstCardIdx = firstCardFoundOnTable ? tableIdx : newState.tableCards.length;
  
  // Find target card on table (must be loose) - get index BEFORE removing first card
  // This is important because removing the first card might shift indices
  let targetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (targetIdx === -1) {
    console.log(`[createTemp] Warning: targetCard ${targetCard.rank}${targetCard.suit} not found on table`);
    return state;
  }

  // Calculate where to insert the temp stack - use the earlier position
  // This preserves visual order: temp stack replaces the two cards at their original positions
  let insertIdx = Math.min(originalFirstCardIdx, targetIdx);
  
  // If first card was from hand or captures (not on table), use targetIdx as insertion point
  if (!firstCardFoundOnTable) {
    insertIdx = targetIdx;
  }
  
  // Now remove the first card from table if it was there
  if (firstCardFoundOnTable) {
    newState.tableCards.splice(tableIdx, 1);
    // Adjust insertIdx if needed after splice
    if (tableIdx < insertIdx) {
      insertIdx = insertIdx - 1;
    }
  }
  
  // Remove target card from table
  // Need to recalculate targetIdx after potential splice
  const newTargetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  const [tableCard] = newState.tableCards.splice(newTargetIdx, 1);

  // Sort: higher-value card is the base (bottom), lower-value sits on top.
  // Check for duplicates first
  if (firstCard.rank === tableCard.rank && firstCard.suit === tableCard.suit) {
    console.error(`[createTemp] ERROR: Duplicate card! firstCard and tableCard are the same: ${firstCard.rank}${firstCard.suit}`);
    console.error(`[createTemp] This means the hit detection found the dragged card instead of the target card`);
  }
  
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

  // Insert temp stack at the calculated position (where first card was)
  // This ensures visual order matches array order in the flex layout
  console.log(`[createTemp] Inserting temp stack with ${cards.length} cards at index ${insertIdx}:`, cards.map(c => `${c.rank}${c.suit}(${c.source})`));
  
  newState.tableCards.splice(insertIdx, 0, {
    type: 'temp_stack',
    stackId: generateStackId(newState, 'temp', playerIndex),
    cards: [bottom, top],
    owner: playerIndex,
    value: base,
    base: base,
    need: need,
    buildType: buildType,
  });

  // ⚠️  No nextTurn() — turn advances when the overlay Accept/Cancel is added
  return newState;
}

module.exports = createTemp;
