/**
 * playFromCaptures
 * Player uses opponent's captured top card to create temp stack.
 */

const { cloneState, generateStackId } = require('../GameState');

function playFromCaptures(state, payload, playerIndex) {
  const { capturedCard, targetCard, targetStackId } = payload;

  if (!capturedCard?.rank || !capturedCard?.suit) {
    throw new Error('playFromCaptures: invalid capturedCard payload');
  }

  const newState = cloneState(state);
  const opponentIndex = playerIndex === 0 ? 1 : 0;
  const opponentCaptures = newState.playerCaptures[opponentIndex];

  const capturedIdx = opponentCaptures.findIndex(
    c => c.rank === capturedCard.rank && c.suit === capturedCard.suit,
  );
  if (capturedIdx === -1) {
    throw new Error(`playFromCaptures: captured card ${capturedCard.rank}${capturedCard.suit} not found in opponent's captures`);
  }
  const [usedCard] = opponentCaptures.splice(capturedIdx, 1);

  // Adding to own existing temp stack
  if (targetStackId) {
    const tempStack = newState.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.stackId === targetStackId,
    );
    if (!tempStack) {
      throw new Error(`playFromCaptures: temp stack "${targetStackId}" not found`);
    }
    if (tempStack.owner !== playerIndex) {
      throw new Error('playFromCaptures: cannot add to opponent\'s temp stack');
    }
    tempStack.cards.push({ ...usedCard, source: 'captured' });
    tempStack.value += usedCard.value;
    return newState;
  }

  // Creating new temp stack with loose card
  if (!targetCard?.rank || !targetCard?.suit) {
    throw new Error('playFromCaptures: no targetCard or targetStackId provided');
  }

  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (tableIdx === -1) {
    throw new Error(`playFromCaptures: targetCard ${targetCard.rank}${targetCard.suit} not found as loose table card`);
  }
  const [tableCard] = newState.tableCards.splice(tableIdx, 1);

  const taggedCapturedCard = { ...usedCard, source: 'captured' };
  const taggedTableCard = { ...tableCard, source: 'table' };
  const [bottom, top] = taggedCapturedCard.value >= taggedTableCard.value
    ? [taggedCapturedCard, taggedTableCard]
    : [taggedTableCard, taggedCapturedCard];

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

  newState.tableCards.splice(tableIdx, 0, {
    type: 'temp_stack',
    stackId: generateStackId(newState, 'temp', playerIndex),
    cards: [bottom, top],
    owner: playerIndex,
    value: base,
    base: base,
    need: need,
    buildType: buildType,
  });

  return newState;
}

module.exports = playFromCaptures;
