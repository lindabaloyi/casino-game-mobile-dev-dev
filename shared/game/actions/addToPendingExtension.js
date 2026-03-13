/**
 * addToPendingExtension
 * Player adds another card to an existing pending extension.
 * 
 * OPTIMIZATION: Uses cardSource from payload to directly access the card location
 * instead of searching everywhere. Supports 'captured_<playerIndex>' format.
 */

const { cloneState } = require('../');

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
  console.log(`[addToPendingExtension-findCardAtSource] Looking for ${cardKey} at source:`, source);
  
  // Helper to check if two players are teammates in a 4‑player game
  function areTeammates(pA, pB) {
    return (pA < 2 && pB < 2) || (pA >= 2 && pB >= 2);
  }

  switch (source) {
    case 'table': {
      const tableIdx = state.tableCards.findIndex(
        tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
      );
      console.log('[addToPendingExtension-findCardAtSource] Table search result:', tableIdx);
      if (tableIdx !== -1) {
        return { found: true, card: state.tableCards[tableIdx], index: tableIdx };
      }
      break;
    }
    
    case 'hand': {
      const hand = state.players[playerIndex].hand;
      const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      console.log('[addToPendingExtension-findCardAtSource] Hand search result:', handIdx);
      if (handIdx !== -1) {
        return { found: true, card: hand[handIdx], index: handIdx };
      }
      break;
    }
    
    case 'captured':
    default: {
      // Handle both 'captured' (backward compat) and 'captured_<playerIndex>'
      let ownerIndex = playerIndex;
      const isPartyMode = state.playerCount === 4;
      
      if (source && source.startsWith('captured_')) {
        const parsed = parseInt(source.split('_')[1], 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < state.players.length) {
          ownerIndex = parsed;
          console.log(`[addToPendingExtension-findCardAtSource] Parsed owner index from source: ${source} -> ${ownerIndex}`);
        }
      }
      
      // Validate access permission: can only use own, teammate's, or opponent's captures based on rules
      const isOwner = ownerIndex === playerIndex;
      const isTeammate = isPartyMode && areTeammates(ownerIndex, playerIndex);
      const isOpponent = !isOwner && !isTeammate;
      
      // For backward compatibility with 'captured', allow searching own, teammates, opponents
      // For 'captured_<index>', directly access the specified player's captures
      if (source === 'captured') {
        // Search own captures first
        let captures = state.players[playerIndex].captures;
        let captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        if (captureIdx !== -1) {
          console.log('[addToPendingExtension-findCardAtSource] Found in own captures');
          return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex: playerIndex };
        }
        
        // If not found and in party mode, search teammates' captures
        if (isPartyMode) {
          const teammateIndices = playerIndex < 2 ? [1, 0] : [3, 2];
          for (const tIdx of teammateIndices) {
            captures = state.players[tIdx].captures;
            captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
            if (captureIdx !== -1) {
              console.log('[addToPendingExtension-findCardAtSource] Found in teammate captures:', tIdx);
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
            console.log('[addToPendingExtension-findCardAtSource] Found in opponent captures:', oIdx);
            return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex: oIdx };
          }
        }
      } else {
        // Specific player index - check permission
        if (!isOwner && !isTeammate && !isOpponent) {
          console.error(`[addToPendingExtension-findCardAtSource] Access denied: player ${playerIndex} cannot access player ${ownerIndex}'s captures`);
          return { found: false };
        }
        
        // Direct access to specified player's captures
        const captures = state.players[ownerIndex].captures;
        const captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        console.log(`[addToPendingExtension-findCardAtSource] Captures search result for player ${ownerIndex}:`, captureIdx);
        
        if (captureIdx !== -1) {
          return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex };
        }
      }
      break;
    }
  }
  
  return { found: false };
}

// Helper to check if two players are teammates in a 4‑player game
function areTeammates(playerA, playerB) {
  // Players 0,1 = Team A ; Players 2,3 = Team B
  return (playerA < 2 && playerB < 2) || (playerA >= 2 && playerB >= 2);
}

function addToPendingExtension(state, payload, playerIndex) {
  const { stackId, card, cardSource = 'table' } = payload;

  console.log('[addToPendingExtension] ===== SOURCE-BASED LOOKUP =====');
  console.log('[addToPendingExtension] Card source (from client):', cardSource);
  console.log('[addToPendingExtension] Card:', card ? `${card.rank}${card.suit}` : 'NONE');
  console.log('[addToPendingExtension] StackId:', stackId);
  console.log('[addToPendingExtension] Player index:', playerIndex);

  if (!stackId) {
    throw new Error('addToPendingExtension: missing stackId');
  }
  if (!card?.rank || !card?.suit) {
    throw new Error('addToPendingExtension: invalid card');
  }
  if (!cardSource) {
    throw new Error('addToPendingExtension: missing cardSource');
  }

  const newState = cloneState(state);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToPendingExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  const isPartyMode = newState.playerCount === 4;
  const owner = buildStack.owner;

  // Validate permission to extend
  let allowed = false;
  if (isPartyMode) {
    // Teammates can extend each other's builds
    allowed = areTeammates(owner, playerIndex);
  } else {
    // Duel mode: only the owner can extend
    allowed = owner === playerIndex;
  }

  if (!allowed) {
    throw new Error('addToPendingExtension: only owner can extend their build');
  }

  // Check pending extension
  if (!buildStack.pendingExtension) {
    throw new Error('addToPendingExtension: no pending extension to add to');
  }

  // Validate card exists at claimed source
  console.log('[addToPendingExtension] Validating card at source:', cardSource);
  const cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  
  if (!cardInfo.found) {
    console.error('[addToPendingExtension] ===== CARD NOT AT CLAIMED SOURCE =====');
    console.error('[addToPendingExtension] Client claimed card was from:', cardSource);
    throw new Error(`addToPendingExtension: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }
  console.log('[addToPendingExtension] Card validated at source:', cardSource, 'at index:', cardInfo.index);

  // Enforce: at most one hand card per pending extension
  if (cardSource === 'hand') {
    const handCardsInExtension = buildStack.pendingExtension.cards.filter(c => c.source === 'hand').length;
    if (handCardsInExtension >= 1) {
      throw new Error('addToPendingExtension: cannot add more than one hand card to a pending extension');
    }
  }

  // Remove card from its source in cloned state
  let usedCard;
  
  if (cardSource === 'table') {
    [usedCard] = newState.tableCards.splice(cardInfo.index, 1);
    usedCard = { ...usedCard, source: 'table' };
    console.log('[addToPendingExtension] Removed card from table');
  } else if (cardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    [usedCard] = hand.splice(cardInfo.index, 1);
    usedCard = { ...usedCard, source: 'hand' };
    console.log('[addToPendingExtension] Removed card from hand');
  } else if (cardSource === 'captured' || (cardSource && cardSource.startsWith('captured_'))) {
    // Use ownerIndex from cardInfo
    const ownerIndex = cardInfo.ownerIndex !== undefined ? cardInfo.ownerIndex : playerIndex;
    const captures = newState.players[ownerIndex].captures;
    [usedCard] = captures.splice(cardInfo.index, 1);
    usedCard = { ...usedCard, source: 'captured', originalOwner: ownerIndex };
    console.log('[addToPendingExtension] Removed card from captures (owner:', ownerIndex, ')');
  } else {
    throw new Error(`addToPendingExtension: unknown cardSource "${cardSource}"`);
  }

  // Add to pending extension array
  buildStack.pendingExtension.cards.push({ card: usedCard, source: cardSource });

  console.log('[addToPendingExtension] SUCCESS - added card to extension:', `${usedCard.rank}${usedCard.suit}`);

  return newState;
}

module.exports = addToPendingExtension;
