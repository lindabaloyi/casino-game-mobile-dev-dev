/**
 * startBuildCapture
 * Opponent starts capturing a build by locking a card to a pending capture set.
 * Now supports cards from hand, table, or any player's captured pile.
 * Mirrors the pattern used in extendBuild for consistency.
 * 
 * Payload: { stackId, card, cardSource }
 * - stackId: ID of the build stack being captured
 * - card: { rank, suit } of the card to use
 * - cardSource: source location ('hand', 'table', 'captured', 'captured_<playerIndex>)
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

// Helper to check teammates
function areTeammates(playerA, playerB) {
  return (playerA < 2 && playerB < 2) || (playerA >= 2 && playerB >= 2);
}

// ---------- Main action ----------

function startBuildCapture(state, payload, playerIndex) {
  const { stackId, card, cardSource = 'table' } = payload;

  console.log('[startBuildCapture]', { stackId, card, cardSource, playerIndex });

  if (!stackId) throw new Error('startBuildCapture: missing stackId');
  if (!card?.rank || !card?.suit) throw new Error('startBuildCapture: invalid card');
  if (!cardSource) throw new Error('startBuildCapture: missing cardSource');

  const newState = cloneState(state);
  // Determine party mode: check if any player has a team property (indicates party mode)
  // In party mode, players have team: 'A' or 'B'. In four-hands, they have no team.
  const isPartyMode = newState.playerCount === 4 && newState.players.some(p => p.team);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId
  );
  if (stackIdx === -1) throw new Error(`startBuildCapture: build stack "${stackId}" not found`);

  const buildStack = newState.tableCards[stackIdx];
  const owner = buildStack.owner;

  // Validate that player is NOT owner and NOT teammate (i.e., opponent)
  // This is the key restriction: only opponents can start a capture
  const isOwner = owner === playerIndex;
  const isTeammate = isPartyMode && areTeammates(owner, playerIndex);
  if (isOwner || isTeammate) {
    throw new Error('startBuildCapture: cannot capture own or teammate build');
  }

  // Check if build already has a pending capture
  if (buildStack.pendingCapture) {
    throw new Error('startBuildCapture: build already has a pending capture');
  }

  // --- GUARDRAIL: Prevent startBuildCapture when player has active extendBuild ---
  const hasPendingExtension = state.tableCards?.some(
    tc => tc.type === 'build_stack' &&
         tc.owner === playerIndex &&
         (tc.pendingExtension?.cards?.length > 0 || tc.pendingExtension?.looseCard)
  );
  if (hasPendingExtension) {
    throw new Error('Cannot capture - you have an active build extension. Complete or cancel it first.');
  }

  // Debug log to verify source
  console.log('[startBuildCapture] Searching for card', card, 'with source', cardSource);
  
  // Locate the card at the claimed source (now supports 'captured' for any player's pile)
  const cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  if (!cardInfo.found) {
    throw new Error(`startBuildCapture: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }

  // Remove the card using the helper (provides rollback on failure)
  const { removedCard } = removeCardFromSource(newState, cardInfo, cardSource, playerIndex);

  // Initialize pending capture
  buildStack.pendingCapture = {
    cards: [{ card: removedCard, source: cardSource }]
  };

  console.log('[startBuildCapture] Success – pending capture started with', `${removedCard.rank}${removedCard.suit}`);

  return newState;
}

module.exports = startBuildCapture;
