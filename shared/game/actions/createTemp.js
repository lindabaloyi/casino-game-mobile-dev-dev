/**
 * createTemp
 * Creates a temporary stack from hand card + loose table card.
 * NOTE: This does NOT end the turn - player can continue with more actions.
 */

const { cloneState, generateStackId, startPlayerTurn, triggerAction } = require('../');

function createTemp(state, payload, playerIndex) {
  const { card, targetCard } = payload;

  if (!card?.rank || !card?.suit || card?.value === undefined) {
    throw new Error('createTemp: invalid card payload - missing rank, suit, or value');
  }
  if (!targetCard?.rank || !targetCard?.suit || targetCard?.value === undefined) {
    throw new Error('createTemp: invalid targetCard payload - missing rank, suit, or value');
  }

  const newState = cloneState(state);

  let firstCard = null;
  let firstSource = '';
  let firstCardFoundOnTable = false;
  
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (tableIdx !== -1) {
    [firstCard] = newState.tableCards.splice(tableIdx, 1);
    firstSource = 'table';
    firstCardFoundOnTable = true;
  } else {
    const hand = newState.players[playerIndex].hand;
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx !== -1) {
      [firstCard] = hand.splice(handIdx, 1);
      firstSource = 'hand';
    } else {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentCaptures = newState.players[opponentIndex].captures;
      const captureIdx = opponentCaptures.findIndex(
        c => c.rank === card.rank && c.suit === card.suit,
      );
      if (captureIdx !== -1) {
        [firstCard] = opponentCaptures.splice(captureIdx, 1);
        firstSource = 'captured';
      }
    }
  }
  
  if (!firstCard) {
    return state;
  }

  const originalFirstCardIdx = firstCardFoundOnTable ? tableIdx : newState.tableCards.length;
  
  let targetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (targetIdx === -1) {
    return state;
  }

  let insertIdx = Math.min(originalFirstCardIdx, targetIdx);
  if (!firstCardFoundOnTable) {
    insertIdx = targetIdx;
  }
  
  if (firstCardFoundOnTable) {
    newState.tableCards.splice(tableIdx, 1);
    if (tableIdx < insertIdx) {
      insertIdx = insertIdx - 1;
    }
  }
  
  const newTargetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  
  if (newTargetIdx === -1) {
    console.log(`[createTemp] Target card not found on table, returning original state`);
    return state;
  }
  
  const [tableCard] = newState.tableCards.splice(newTargetIdx, 1);
  
  if (!tableCard || tableCard.value === undefined) {
    console.log(`[createTemp] Table card missing value property:`, tableCard);
    return state;
  }

  const [bottom, top] = firstCard.value >= tableCard.value
    ? [{ ...firstCard, source: firstSource }, { ...tableCard, source: 'table' }]
    : [{ ...tableCard, source: 'table' }, { ...firstCard, source: firstSource }];

  const cards = [bottom, top];
  const totalSum = cards.reduce((sum, c) => sum + c.value, 0);
  
  let base, need, buildType;
  if (totalSum <= 10) {
    base = totalSum;
    need = 0;
    buildType = 'sum';
  } else {
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    need = base - otherSum;
    buildType = 'diff';
  }

  console.log(`[createTemp] buildType: ${buildType}, totalSum: ${totalSum}, base: ${base}, need: ${need}`);

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

  // Debug: Show what hasBase will be set to when temp is accepted
  const willBeHasBase = (buildType === 'diff');
  console.log(`[createTemp] Temp stack created - hasBase will be: ${willBeHasBase} (buildType === 'diff' is ${willBeHasBase})`);

  // Mark turn as started and action triggered (but NOT ended - player can continue)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  // Do NOT set turnEnded - player can continue with more actions
  
  return newState;
}

module.exports = createTemp;
