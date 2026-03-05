/**
 * capture
 * Player captures either loose card or build stack.
 */

const { cloneState, nextTurn } = require('../GameState');

function getPossibleCaptureValues(cards) {
  if (cards.length === 0) return [];
  const cardValue = cards[0].value;
  const count = cards.length;
  const possibleValues = [];
  for (let i = 1; i <= count; i++) {
    const sum = cardValue * i;
    possibleValues.push(sum);
    if (cards[0].rank === 'A') {
      const altSum = 14 + (cardValue - 1) * (i - 1);
      if (!possibleValues.includes(altSum) && altSum <= 14) {
        possibleValues.push(altSum);
      }
    }
  }
  return [...new Set(possibleValues)].sort((a, b) => a - b);
}

function capture(state, payload, playerIndex) {
  const { card, targetType, targetRank, targetSuit, targetStackId } = payload;

  if (!card?.rank || !card?.suit) {
    throw new Error('capture: invalid card payload');
  }

  const newState = cloneState(state);
  const hand = newState.playerHands[playerIndex];

  const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
  if (handIdx === -1) {
    throw new Error(`capture: card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`);
  }
  const [capturingCard] = hand.splice(handIdx, 1);

  const capturedCards = [];

  if (targetType === 'loose') {
    if (!targetRank || !targetSuit) {
      throw new Error('capture: loose target missing rank/suit');
    }
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === targetRank && tc.suit === targetSuit,
    );
    if (tableIdx === -1) {
      throw new Error(`capture: target card ${targetRank}${targetSuit} not found on table`);
    }
    const targetCard = newState.tableCards[tableIdx];
    if (capturingCard.rank !== targetCard.rank) {
      throw new Error(`capture: can only capture identical cards`);
    }
    newState.tableCards.splice(tableIdx, 1);
    capturedCards.push(targetCard);
  } else if (targetType === 'build') {
    if (!targetStackId) {
      throw new Error('capture: build target missing stackId');
    }
    const stackIdx = newState.tableCards.findIndex(
      tc => (tc.type === 'build_stack' || tc.type === 'temp_stack') && tc.stackId === targetStackId,
    );
    if (stackIdx === -1) {
      throw new Error(`capture: build stack "${targetStackId}" not found`);
    }
    const buildStack = newState.tableCards[stackIdx];
    if (buildStack.cards.length > 0) {
      const buildRank = buildStack.cards[0].rank;
      const allSameRank = buildStack.cards.every(c => c.rank === buildRank);
      if (allSameRank) {
        const possibleValues = getPossibleCaptureValues(buildStack.cards);
        if (!possibleValues.includes(capturingCard.value)) {
          throw new Error(`capture: build can be captured with [${possibleValues.join(', ')}], have ${capturingCard.value}`);
        }
      } else {
        if (capturingCard.value !== buildStack.value) {
          throw new Error(`capture: build value is ${buildStack.value}, have ${capturingCard.value}`);
        }
      }
    } else {
      if (capturingCard.value !== buildStack.value) {
        throw new Error(`capture: card value ${capturingCard.value} does not match build value ${buildStack.value}`);
      }
    }
    newState.tableCards.splice(stackIdx, 1);
    capturedCards.push(...buildStack.cards);
  } else {
    throw new Error(`capture: unknown targetType "${targetType}"`);
  }

  newState.playerCaptures[playerIndex].push(...capturedCards, capturingCard);
  return nextTurn(newState);
}

module.exports = capture;
