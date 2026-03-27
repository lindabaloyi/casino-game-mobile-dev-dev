/**
 * extendBuild
 * Unified action for build extension.
 * If no pending extension exists, starts one with the given card.
 * If a pending extension already exists, adds the card to it.
 * 
 * Payload: { stackId, card, cardSource }
 * - stackId: ID of the build stack being extended
 * - card: { rank, suit } of the card to add
 * - cardSource: source location ('hand', 'table', 'captured', 'captured_<index>')
 */

const { cloneState } = require('../');

// ---------- Internal helpers ----------

/**
 * Find card at specific source location
 * Returns { found: true, card, index, ownerIndex } or { found: false }
 * 
 * Source format:
 * - 'hand' - current player's hand
 * - 'table' - table cards
 * - 'captured' - current player's own captures (backward compat)
 * - 'captured_<playerIndex>' - specific player's captures (e.g., 'captured_2')
 */
function findCardAtSource(state, card, source, playerIndex) {
  const cardKey = `${card.rank}${card.suit}`;
  
  // Helper to check if two players are teammates in a 4‑player game
  function areTeammates(pA, pB) {
    return (pA < 2 && pB < 2) || (pA >= 2 && pB >= 2);
  }

  switch (source) {
    case 'table': {
      const tableIdx = state.tableCards.findIndex(
        tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
      );
      if (tableIdx !== -1) {
        return { found: true, card: state.tableCards[tableIdx], index: tableIdx };
      }
      break;
    }
    
    case 'hand': {
      const hand = state.players[playerIndex].hand;
      const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      if (handIdx !== -1) {
        return { found: true, card: hand[handIdx], index: handIdx };
      }
      break;
    }
    
    case 'captured':
    default: {
      // Handle both 'captured' (backward compat) and 'captured_<playerIndex>'
      let ownerIndex = playerIndex;
      const isPartyMode = state.playerCount === 4 && state.players.some(p => p.team);
      
      if (source && source.startsWith('captured_')) {
        const parsed = parseInt(source.split('_')[1], 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < state.players.length) {
          ownerIndex = parsed;
        }
      }
      
      // For backward compatibility with 'captured', allow searching own, teammates, opponents
      // For 'captured_<index>', directly access the specified player's captures
      if (source === 'captured') {
        // Search own captures first
        let captures = state.players[playerIndex].captures;
        let captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        if (captureIdx !== -1) {
          return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex: playerIndex };
        }
        
        // If not found and in party mode, search teammates' captures
        if (isPartyMode) {
          const teammateIndices = playerIndex < 2 ? [1, 0] : [3, 2];
          for (const tIdx of teammateIndices) {
            captures = state.players[tIdx].captures;
            captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
            if (captureIdx !== -1) {
              return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex: tIdx };
            }
          }
        }
        
        // Search opponents' captures
        const opponentIndices = isPartyMode 
          ? (playerIndex < 2 ? [2, 3] : [0, 1])
          : [playerIndex === 0 ? 1 : 0];
        
        for (const oIdx of opponentIndices) {
          captures = state.players[oIdx].captures;
          captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
          if (captureIdx !== -1) {
            return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex: oIdx };
          }
        }
      } else {
        // Specific player index – check permission
        const isOwner = ownerIndex === playerIndex;
        const isTeammate = isPartyMode && areTeammates(ownerIndex, playerIndex);
        const isOpponent = !isOwner && !isTeammate;
        
        if (!isOwner && !isTeammate && !isOpponent) {
          // Access denied, return not found
          return { found: false };
        }
        
        // Direct access to specified player's captures
        const captures = state.players[ownerIndex].captures;
        const captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        if (captureIdx !== -1) {
          return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex };
        }
      }
      break;
    }
  }
  
  return { found: false };
}

/**
 * Remove a card from its source location (hand, table, or captures).
 * Returns { removedCard, rollback: function }.
 * The rollback function can be called to restore the card if validation fails.
 */
function removeCardFromSource(state, cardInfo, source, playerIndex) {
  const { index, ownerIndex } = cardInfo;
  let removedCard;
  let rollback;

  if (source === 'table') {
    [removedCard] = state.tableCards.splice(index, 1);
    removedCard.source = 'table';
    rollback = () => { state.tableCards.splice(index, 0, removedCard); };
  } else if (source === 'hand') {
    const hand = state.players[playerIndex].hand;
    [removedCard] = hand.splice(index, 1);
    removedCard.source = 'hand';
    rollback = () => { hand.splice(index, 0, removedCard); };
  } else if (source === 'captured' || source.startsWith('captured_')) {
    const ownerIdx = ownerIndex !== undefined ? ownerIndex : playerIndex;
    const captures = state.players[ownerIdx].captures;
    [removedCard] = captures.splice(index, 1);
    removedCard.source = 'captured';
    removedCard.originalOwner = ownerIdx;
    rollback = () => { captures.splice(index, 0, removedCard); };
  } else {
    throw new Error(`Unknown source: ${source}`);
  }

  return { removedCard, rollback };
}

/**
 * Validate that a card's rank does not exceed the build value.
 * Throws an error if invalid.
 */
function validateRankAgainstBuild(card, buildValue) {
  const rankToNumber = (r) => (r === 'A' ? 1 : parseInt(r, 10));
  const cardRankNum = rankToNumber(card.rank);
  const buildValueNum = typeof buildValue === 'number' ? buildValue : rankToNumber(buildValue);

  if (cardRankNum > buildValueNum) {
    throw new Error(
      `Cannot extend build of value ${buildValue} with card of rank ${card.rank} (would over-extend)`
    );
  }
}

// Helper to check teammates
function areTeammates(playerA, playerB) {
  return (playerA < 2 && playerB < 2) || (playerA >= 2 && playerB >= 2);
}

// ---------- Main action ----------

function extendBuild(state, payload, playerIndex) {
  const { stackId, card, cardSource } = payload;

  console.log('[extendBuild] Input:', { stackId, card, cardSource });

  // ----- Input validation -----
  if (!stackId) throw new Error('extendBuild: missing stackId');
  if (!card?.rank || !card?.suit) throw new Error('extendBuild: invalid card');
  if (!cardSource) throw new Error('extendBuild: missing cardSource');

  const newState = cloneState(state);
  const isPartyMode = newState.playerCount === 4 && newState.players.some(p => p.team);

  // ----- Find the build stack -----
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId
  );
  if (stackIdx === -1) throw new Error(`extendBuild: build stack "${stackId}" not found`);
  const buildStack = newState.tableCards[stackIdx];

  // ----- Permission check -----
  const allowed = isPartyMode
    ? areTeammates(buildStack.owner, playerIndex)
    : buildStack.owner === playerIndex;
  if (!allowed) throw new Error('extendBuild: not authorized to extend this build');

  // ----- Locate the card at the claimed source -----
  const cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  if (!cardInfo.found) {
    throw new Error(`extendBuild: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }

  // ----- Tentatively remove the card -----
  const { removedCard, rollback } = removeCardFromSource(newState, cardInfo, cardSource, playerIndex);

  try {
    // ----- Validate rank against build value (always) -----
    console.log('[extendBuild] Validating:', { cardRank: card.rank, cardValue: removedCard.value, buildValue: buildStack.value });
    validateRankAgainstBuild(removedCard, buildStack.value);

    // ----- Determine if we are starting or adding to a pending extension -----
    const hasPending = !!buildStack.pendingExtension;

    // Track whether a hand card is being used (for turn ending logic)
    const isHandCard = cardSource === 'hand';

    console.log('[extendBuild] Before extension:', {
      hasPending,
      isHandCard,
      buildStackValue: buildStack.value,
      pendingExtensionBefore: buildStack.pendingExtension?.cards?.map(p => p.card?.value)
    });

    if (!hasPending) {
      // Start a new pending extension
      buildStack.pendingExtension = {
        cards: [{ card: removedCard, source: cardSource }],
        usedHandCard: isHandCard
      };
    } else {
      // Adding to an existing pending extension
      // Additional guardrail: only one hand card allowed in the whole pending extension
      if (cardSource === 'hand') {
        const handCardsInExtension = buildStack.pendingExtension.cards.filter(c => c.source === 'hand').length;
        if (handCardsInExtension >= 1) {
          throw new Error('extendBuild: cannot add more than one hand card to a pending extension');
        }
        // Mark that a hand card was used
        buildStack.pendingExtension.usedHandCard = true;
      }
      buildStack.pendingExtension.cards.push({ card: removedCard, source: cardSource });
    }

    console.log('[extendBuild] After extension:', {
      pendingExtensionCards: buildStack.pendingExtension?.cards?.map(p => p.card?.value),
      buildStackValue: buildStack.value
    });

    return newState;
  } catch (error) {
    // On any validation error, restore the card to its original location
    rollback();
    throw error;
  }
}

module.exports = extendBuild;
