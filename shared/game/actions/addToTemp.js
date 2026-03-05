/**
 * addToTemp
 * Player adds a card to their existing temp stack.
 */

const { cloneState } = require('../GameState');

function addToTemp(state, payload, playerIndex) {
  const card = payload.card || payload.tableCard || payload.handCard;
  const stackId = payload.stackId;

  if (!card || !stackId) {
    throw new Error('addToTemp: missing card or stackId');
  }

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToTemp: temp stack "${stackId}" not found`);
  }
  const stack = newState.tableCards[stackIdx];

  let source = 'unknown';
  let cardFound = false;
  
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (tableIdx !== -1) {
    newState.tableCards.splice(tableIdx, 1);
    source = 'table';
    cardFound = true;
  } else {
    const hand = newState.players[playerIndex].hand;
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx !== -1) {
      hand.splice(handIdx, 1);
      source = 'hand';
      cardFound = true;
    } else {
      const opponentIndex = playerIndex === 0 ? 1 : 0;
      const opponentCaptures = newState.players[opponentIndex].captures;
      const captureIdx = opponentCaptures.findIndex(
        c => c.rank === card.rank && c.suit === card.suit,
      );
      if (captureIdx !== -1) {
        opponentCaptures.splice(captureIdx, 1);
        source = 'captured';
        cardFound = true;
      }
    }
  }

  if (!cardFound) {
    return state;
  }

  stack.cards.push({ ...card, source });

  const totalSum = stack.cards.reduce((sum, c) => sum + c.value, 0);
  
  if (totalSum <= 10) {
    stack.value = totalSum;
    stack.base = totalSum;
    stack.need = 0;
    stack.buildType = 'sum';
  } else {
    const sorted = [...stack.cards].sort((a, b) => b.value - a.value);
    const base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    const need = base - otherSum;
    
    stack.value = base;
    stack.base = base;
    stack.need = need;
    stack.buildType = 'diff';
  }

  return newState;
}

module.exports = addToTemp;
