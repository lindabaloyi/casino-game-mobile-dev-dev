/**
 * playFromCaptures
 * Player uses opponent's captured top card to create temp stack.
 */

const { cloneState, generateStackId } = require('../');

function playFromCaptures(state, payload, playerIndex) {
  const { capturedCard, targetCard, targetStackId } = payload;

  if (!capturedCard?.rank || !capturedCard?.suit) {
    throw new Error('playFromCaptures: invalid capturedCard payload');
  }

  const newState = cloneState(state);
  
  // Find the card in own captures, teammate's (party), or opponents' captures
  let capturedIdx = -1;
  let sourcePlayer = null;
  let opponentCaptures = [];
  
  // Check own captures first
  opponentCaptures = newState.players[playerIndex].captures;
  capturedIdx = opponentCaptures.findIndex(
    c => c.rank === capturedCard.rank && c.suit === capturedCard.suit,
  );
  if (capturedIdx !== -1) {
    sourcePlayer = playerIndex;
  } else if (state.isPartyMode) {
    // Check teammate's captures
    const teammateIndex = playerIndex < 2 ? (playerIndex === 0 ? 1 : 0) : (playerIndex === 2 ? 3 : 2);
    opponentCaptures = newState.players[teammateIndex].captures;
    capturedIdx = opponentCaptures.findIndex(
      c => c.rank === capturedCard.rank && c.suit === capturedCard.suit,
    );
    if (capturedIdx !== -1) {
      sourcePlayer = teammateIndex;
    } else {
      // Check ALL opponents' captures
      const opponentIndices = playerIndex < 2 ? [2, 3] : [0, 1];
      for (const oIdx of opponentIndices) {
        opponentCaptures = newState.players[oIdx].captures;
        capturedIdx = opponentCaptures.findIndex(
          c => c.rank === capturedCard.rank && c.suit === capturedCard.suit,
        );
        if (capturedIdx !== -1) {
          sourcePlayer = oIdx;
          break;
        }
      }
    }
  } else {
    // Duel mode: check single opponent
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    opponentCaptures = newState.players[opponentIndex].captures;
    capturedIdx = opponentCaptures.findIndex(
      c => c.rank === capturedCard.rank && c.suit === capturedCard.suit,
    );
    if (capturedIdx !== -1) {
      sourcePlayer = opponentIndex;
    }
  }

  if (capturedIdx === -1 || sourcePlayer === null) {
    throw new Error(`playFromCaptures: captured card ${capturedCard.rank}${capturedCard.suit} not found in any capture pile`);
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
