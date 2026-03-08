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
      // Check own captures first
      let ownCaptureIdx = newState.players[playerIndex].captures.findIndex(
        c => c.rank === card.rank && c.suit === card.suit,
      );
      if (ownCaptureIdx !== -1) {
        [firstCard] = newState.players[playerIndex].captures.splice(ownCaptureIdx, 1);
        firstSource = 'captured';
      } else if (state.isPartyMode) {
        // Check teammate's captures
        const teammateIndex = playerIndex < 2 ? (playerIndex === 0 ? 1 : 0) : (playerIndex === 2 ? 3 : 2);
        let teammateCaptureIdx = newState.players[teammateIndex].captures.findIndex(
          c => c.rank === card.rank && c.suit === card.suit,
        );
        if (teammateCaptureIdx !== -1) {
          [firstCard] = newState.players[teammateIndex].captures.splice(teammateCaptureIdx, 1);
          firstSource = 'captured';
        } else {
          // Check ALL opponents' captures
          const opponentIndices = playerIndex < 2 ? [2, 3] : [0, 1];
          for (const oIdx of opponentIndices) {
            const oppCaptureIdx = newState.players[oIdx].captures.findIndex(
              c => c.rank === card.rank && c.suit === card.suit,
            );
            if (oppCaptureIdx !== -1) {
              [firstCard] = newState.players[oIdx].captures.splice(oppCaptureIdx, 1);
              firstSource = 'captured';
              break;
            }
          }
        }
      } else {
        // Duel mode: check single opponent
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
    return state;
  }
  
  const [tableCard] = newState.tableCards.splice(newTargetIdx, 1);

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

  // Mark turn as started and action triggered (but NOT ended - player can continue)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  
  return newState;
}

module.exports = createTemp;
