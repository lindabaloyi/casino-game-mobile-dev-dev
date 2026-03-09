/**
 * createTemp
 * Creates a temporary stack from hand card + loose table card.
 * NOTE: This does NOT end the turn - player can continue with more actions.
 * 
 * FIX: Added validation-first approach to prevent card loss when target not found.
 * Previously, if the target card wasn't found after removing the first card,
 * the first card would be lost. Now we validate BOTH cards exist before removing either.
 */

const { cloneState, generateStackId, startPlayerTurn, triggerAction } = require('../');
const { calculateBuildValue } = require('../buildCalculator');

/**
 * Helper: Find card in hand, table, or captures
 * Returns { found: true, source, card, index, playerIndex } or null
 */
function findCardAnywhere(state, card, playerIndex) {
  // Debug: Log what we're looking for
  console.log('[findCardAnywhere] Looking for:', `${card.rank}${card.suit}`);
  console.log('[findCardAnywhere] Checking tableCards:', state.tableCards.map(tc => {
    if (tc.type) {
      return `{${tc.type}: ${tc.cards?.map(c => c.rank + c.suit).join(',')}}`;
    }
    return tc.rank + tc.suit;
  }));
  
  // Check table first
  const tableIdx = state.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  console.log('[findCardAnywhere] Table search result:', tableIdx);
  if (tableIdx !== -1) {
    return { found: true, source: 'table', card: state.tableCards[tableIdx], index: tableIdx, playerIndex: null };
  }
  
  // Debug: Log what's in player's hand
  console.log('[findCardAnywhere] Checking player hand:', state.players[playerIndex]?.hand?.map(c => c.rank + c.suit));
  
  // Check player's hand
  const hand = state.players[playerIndex].hand;
  const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
  if (handIdx !== -1) {
    return { found: true, source: 'hand', card: hand[handIdx], index: handIdx, playerIndex };
  }
  
  // Check own captures
  const ownCaptureIdx = state.players[playerIndex].captures.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (ownCaptureIdx !== -1) {
    return { found: true, source: 'captured', card: state.players[playerIndex].captures[ownCaptureIdx], index: ownCaptureIdx, playerIndex };
  }
  
  // Check teammate's captures (party mode)
  if (state.isPartyMode) {
    const teammateIndex = playerIndex < 2 ? (playerIndex === 0 ? 1 : 0) : (playerIndex === 2 ? 3 : 2);
    const teammateCaptureIdx = state.players[teammateIndex].captures.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (teammateCaptureIdx !== -1) {
      return { found: true, source: 'captured', card: state.players[teammateIndex].captures[teammateCaptureIdx], index: teammateCaptureIdx, playerIndex: teammateIndex };
    }
    
    // Check opponents' captures
    const opponentIndices = playerIndex < 2 ? [2, 3] : [0, 1];
    for (const oIdx of opponentIndices) {
      const oppCaptureIdx = state.players[oIdx].captures.findIndex(
        c => c.rank === card.rank && c.suit === card.suit,
      );
      if (oppCaptureIdx !== -1) {
        return { found: true, source: 'captured', card: state.players[oIdx].captures[oppCaptureIdx], index: oppCaptureIdx, playerIndex: oIdx };
      }
    }
  } else {
    // Duel mode: check single opponent
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    const captureIdx = state.players[opponentIndex].captures.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (captureIdx !== -1) {
      return { found: true, source: 'captured', card: state.players[opponentIndex].captures[captureIdx], index: captureIdx, playerIndex: opponentIndex };
    }
  }
  
  return { found: false };
}

/**
 * Helper: Find card specifically on table
 */
function findCardOnTable(state, targetCard) {
  console.log('[findCardOnTable] Looking for target:', `${targetCard.rank}${targetCard.suit}`);
  console.log('[findCardOnTable] Table cards:', state.tableCards.map(tc => {
    if (tc.type) {
      return `{${tc.type}: ${tc.cards?.map(c => c.rank + c.suit).join(',')}}`;
    }
    return tc.rank + tc.suit;
  }));
  
  const tableIdx = state.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  console.log('[findCardOnTable] Result index:', tableIdx);
  if (tableIdx !== -1) {
    return { found: true, card: state.tableCards[tableIdx], index: tableIdx };
  }
  return { found: false };
}

function createTemp(state, payload, playerIndex) {
  const { card, targetCard } = payload;

  // Debug: Log all table cards to help diagnose issues
  console.log('[createTemp] START:', {
    card: `${card?.rank}${card?.suit}`,
    target: `${targetCard?.rank}${targetCard?.suit}`,
    tableCardsCount: state.tableCards.length,
    tableCards: state.tableCards.map(tc => {
      if (tc.type) {
        return `{${tc.type}: ${tc.cards?.map(c => c.rank + c.suit).join(',')}}`;
      }
      return tc.rank + tc.suit;
    })
  });

  if (!card?.rank || !card?.suit || card?.value === undefined) {
    throw new Error('createTemp: invalid card payload - missing rank, suit, or value');
  }
  if (!targetCard?.rank || !targetCard?.suit || targetCard?.value === undefined) {
    throw new Error('createTemp: invalid targetCard payload - missing rank, suit, or value');
  }

  // FIX: Validate BOTH cards exist BEFORE modifying anything
  // This prevents card loss if target is not found after first card is removed
  
  console.log('[createTemp] Validating card existence...');
  
  // Validate the dragged card exists somewhere
  const cardInfo = findCardAnywhere(state, card, playerIndex);
  if (!cardInfo.found) {
    // LENIENT MODE: In multiplayer, the server may have already processed this action
    // and sent us the updated state. If we can't find the card, it means the operation
    // already succeeded on the server. Just return state as-is to sync with server.
    console.warn('[createTemp] Card not found - likely already processed by server, returning current state');
    return state;
  }
  console.log('[createTemp] Card found:', cardInfo.source);
  
  // Validate the target card exists on table
  const targetInfo = findCardOnTable(state, targetCard);
  if (!targetInfo.found) {
    // LENIENT MODE: Same as above - if target not found, server already processed it
    console.warn('[createTemp] Target card not found - likely already processed by server, returning current state');
    return state;
  }
  console.log('[createTemp] Target found on table at index:', targetInfo.index);

  // Only now proceed with modifications since both cards are confirmed to exist
  const newState = cloneState(state);

  let firstCard = null;
  let firstSource = '';
  let firstCardFoundOnTable = false;
  
  // Re-find the card in the cloned state (same logic as before but now safe)
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
  );
  if (tableIdx !== -1) {
    [firstCard] = newState.tableCards.splice(tableIdx, 1);
    firstSource = 'table';
    firstCardFoundOnTable = true;
    console.log('[createTemp] Removed card from table');
  } else {
    const hand = newState.players[playerIndex].hand;
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx !== -1) {
      [firstCard] = hand.splice(handIdx, 1);
      firstSource = 'hand';
      console.log('[createTemp] Removed card from hand');
    } else {
      // Check own captures first
      let ownCaptureIdx = newState.players[playerIndex].captures.findIndex(
        c => c.rank === card.rank && c.suit === card.suit,
      );
      if (ownCaptureIdx !== -1) {
        [firstCard] = newState.players[playerIndex].captures.splice(ownCaptureIdx, 1);
        firstSource = 'captured';
        console.log('[createTemp] Removed card from own captures');
      } else if (state.isPartyMode) {
        // Check teammate's captures
        const teammateIndex = playerIndex < 2 ? (playerIndex === 0 ? 1 : 0) : (playerIndex === 2 ? 3 : 2);
        let teammateCaptureIdx = newState.players[teammateIndex].captures.findIndex(
          c => c.rank === card.rank && c.suit === card.suit,
        );
        if (teammateCaptureIdx !== -1) {
          [firstCard] = newState.players[teammateIndex].captures.splice(teammateCaptureIdx, 1);
          firstSource = 'captured';
          console.log('[createTemp] Removed card from teammate captures');
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
              console.log('[createTemp] Removed card from opponent captures');
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
          console.log('[createTemp] Removed card from opponent captures (duel)');
        }
      }
    }
  }
  
  // This should never happen now since we validated upfront
  if (!firstCard) {
    // Lenient mode: If card not found after clone, likely already processed by server
    console.warn('[createTemp] Card disappeared during removal - likely already processed, returning current state');
    return state;
  }

  const originalFirstCardIdx = firstCardFoundOnTable ? tableIdx : newState.tableCards.length;
  
  // FIX: After removing first card, validate target STILL exists before removing it
  // This handles the case where another action might have removed the target
  let targetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  if (targetIdx === -1) {
    // Lenient mode: Target not found - likely already processed by server
    console.warn('[createTemp] Target card was removed - likely already processed, returning current state');
    // Rollback: Put the first card back where it came from
    if (firstSource === 'table') {
      // Find where to put it back on table
      const insertBackIdx = Math.min(originalFirstCardIdx, newState.tableCards.length);
      newState.tableCards.splice(insertBackIdx, 0, firstCard);
    } else if (firstSource === 'hand') {
      newState.players[playerIndex].hand.push(firstCard);
    } else if (firstSource === 'captured') {
      newState.players[playerIndex].captures.push(firstCard);
    }
    return state;
  }
  console.log('[createTemp] Target still at index:', targetIdx);

  let insertIdx = Math.min(originalFirstCardIdx, targetIdx);
  if (!firstCardFoundOnTable) {
    insertIdx = targetIdx;
  }
  
  // BUG FIX: Don't remove again! We already removed firstCard from tableCards at line 171
  // The previous code was mistakenly removing a card again here, causing cards to disappear
  // if (firstCardFoundOnTable) {
  //   newState.tableCards.splice(tableIdx, 1);
  //   if (tableIdx < insertIdx) {
  //     insertIdx = insertIdx - 1;
  //   }
  // }
  
  const newTargetIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === targetCard.rank && tc.suit === targetCard.suit,
  );
  
  if (newTargetIdx === -1) {
    // Lenient mode: Target not found - likely already processed by server
    console.warn('[createTemp] Target card moved - likely already processed, returning current state');
    // Rollback: Put the first card back
    if (firstSource === 'table') {
      newState.tableCards.splice(insertIdx, 0, firstCard);
    } else if (firstSource === 'hand') {
      newState.players[playerIndex].hand.push(firstCard);
    } else if (firstSource === 'captured') {
      newState.players[playerIndex].captures.push(firstCard);
    }
    return state;
  }
  
  const [tableCard] = newState.tableCards.splice(newTargetIdx, 1);
  console.log('[createTemp] Removed target card from table');

  const [bottom, top] = firstCard.value >= tableCard.value
    ? [{ ...firstCard, source: firstSource }, { ...tableCard, source: 'table' }]
    : [{ ...tableCard, source: 'table' }, { ...firstCard, source: firstSource }];

  const cards = [bottom, top];
  
  // Use the shared build calculator to compute value
  const values = cards.map(c => c.value);
  const buildInfo = calculateBuildValue(values);
  console.log('[createTemp] Build info:', buildInfo);
  
  newState.tableCards.splice(insertIdx, 0, {
    type: 'temp_stack',
    stackId: generateStackId(newState, 'temp', playerIndex),
    cards: [bottom, top],
    owner: playerIndex,
    value: buildInfo.value,
    base: buildInfo.value,
    need: buildInfo.need,
    buildType: buildInfo.buildType,
  });

  // Mark turn as started and action triggered (but NOT ended - player can continue)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  
  console.log('[createTemp] SUCCESS - created temp stack');
  
  return newState;
}

module.exports = createTemp;
