/**
 * startBuildExtension
 * Player starts extending their own (or teammate's) build by locking a card to it.
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
  console.log(`[startBuildExtension-findCardAtSource] Looking for ${cardKey} at source:`, source);
  
  // Helper to check if two players are teammates in a 4‑player game
  function areTeammates(pA, pB) {
    return (pA < 2 && pB < 2) || (pA >= 2 && pB >= 2);
  }

  switch (source) {
    case 'table': {
      const tableIdx = state.tableCards.findIndex(
        tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
      );
      console.log('[startBuildExtension-findCardAtSource] Table search result:', tableIdx);
      if (tableIdx !== -1) {
        return { found: true, card: state.tableCards[tableIdx], index: tableIdx };
      }
      break;
    }
    
    case 'hand': {
      const hand = state.players[playerIndex].hand;
      const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      console.log('[startBuildExtension-findCardAtSource] Hand search result:', handIdx);
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
          console.log(`[startBuildExtension-findCardAtSource] Parsed owner index from source: ${source} -> ${ownerIndex}`);
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
          console.log('[startBuildExtension-findCardAtSource] Found in own captures');
          return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex: playerIndex };
        }
        
        // If not found and in party mode, search teammates' captures
        if (isPartyMode) {
          const teammateIndices = playerIndex < 2 ? [1, 0] : [3, 2];
          for (const tIdx of teammateIndices) {
            captures = state.players[tIdx].captures;
            captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
            if (captureIdx !== -1) {
              console.log('[startBuildExtension-findCardAtSource] Found in teammate captures:', tIdx);
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
            console.log('[startBuildExtension-findCardAtSource] Found in opponent captures:', oIdx);
            return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex: oIdx };
          }
        }
      } else {
        // Specific player index - check permission
        if (!isOwner && !isTeammate && !isOpponent) {
          console.error(`[startBuildExtension-findCardAtSource] Access denied: player ${playerIndex} cannot access player ${ownerIndex}'s captures`);
          return { found: false };
        }
        
        // Direct access to specified player's captures
        const captures = state.players[ownerIndex].captures;
        const captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
        console.log(`[startBuildExtension-findCardAtSource] Captures search result for player ${ownerIndex}:`, captureIdx);
        
        if (captureIdx !== -1) {
          return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex };
        }
      }
      break;
    }
  }
  
  return { found: false };
}

function startBuildExtension(state, payload, playerIndex) {
  const { stackId, card, cardSource = 'table' } = payload;

  console.log('[startBuildExtension] ===== SOURCE-BASED LOOKUP =====');
  console.log('[startBuildExtension] Card source (from client):', cardSource);
  console.log('[startBuildExtension] Card:', card ? `${card.rank}${card.suit}` : 'NONE');
  console.log('[startBuildExtension] StackId:', stackId);
  console.log('[startBuildExtension] Player index:', playerIndex);

  if (!stackId) {
    throw new Error('startBuildExtension: missing stackId');
  }
  if (!card?.rank || !card?.suit) {
    throw new Error('startBuildExtension: invalid card');
  }

  const newState = cloneState(state);
  const isPartyMode = newState.playerCount === 4 && newState.players.some(p => p.team);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`startBuildExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];
  const owner = buildStack.owner;

  // Helper to check if two players are teammates
  function areTeammates(pA, pB) {
    return (pA < 2 && pB < 2) || (pA >= 2 && pB >= 2);
  }

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
    throw new Error('startBuildExtension: not authorized to extend this build');
  }

  // Validate card exists at claimed source
  console.log('[startBuildExtension] Validating card at source:', cardSource);
  const cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  
  if (!cardInfo.found) {
    console.error('[startBuildExtension] ===== CARD NOT AT CLAIMED SOURCE =====');
    console.error('[startBuildExtension] Client claimed card was from:', cardSource);
    throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }
  console.log('[startBuildExtension] Card validated at source:', cardSource, 'at index:', cardInfo.index);

  // ---------- REMOVE CARD (tentatively) ----------
  let usedCard;
  let removalInfo = { source: cardSource, index: cardInfo.index, ownerIndex: cardInfo.ownerIndex };

  if (cardSource === 'table') {
    [usedCard] = newState.tableCards.splice(cardInfo.index, 1);
    usedCard = { ...usedCard, source: 'table' };
    console.log('[startBuildExtension] Removed card from table');
  } else if (cardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    [usedCard] = hand.splice(cardInfo.index, 1);
    usedCard = { ...usedCard, source: 'hand' };
    console.log('[startBuildExtension] Removed card from hand');
  } else if (cardSource === 'captured' || (cardSource && cardSource.startsWith('captured_'))) {
    const ownerIdx = cardInfo.ownerIndex !== undefined ? cardInfo.ownerIndex : playerIndex;
    const captures = newState.players[ownerIdx].captures;
    [usedCard] = captures.splice(cardInfo.index, 1);
    usedCard = { ...usedCard, source: 'captured', originalOwner: ownerIdx };
    console.log('[startBuildExtension] Removed card from captures (owner:', ownerIdx, ')');
  } else {
    throw new Error(`startBuildExtension: unknown cardSource "${cardSource}"`);
  }

  // ---------- GUARDRAIL: Rank limit ----------
  try {
    // Safety check: build must have a value defined
    if (buildStack.value === undefined || buildStack.value === null) {
      throw new Error(`startBuildExtension: build stack "${stackId}" has no value defined`);
    }

    console.log('[startBuildExtension] buildStack.value raw:', buildStack.value, 'type:', typeof buildStack.value);
    console.log('[startBuildExtension] card.rank raw:', card.rank, 'type:', typeof card.rank);

    function rankToNumber(r) {
      if (r === 'A') return 1;
      return parseInt(r, 10);
    }
    const cardRankNum = rankToNumber(card.rank);
    const buildValueNum = typeof buildStack.value === 'number' ? buildStack.value : rankToNumber(buildStack.value);
    console.log(`[startBuildExtension] cardRankNum: ${cardRankNum}, buildValueNum: ${buildValueNum}`);

    if (cardRankNum > buildValueNum) {
      throw new Error(
        `startBuildExtension: cannot extend build of value ${buildStack.value} with card of rank ${card.rank} (would over-extend)`
      );
    }

    // Validation passed – set pending extension
    buildStack.pendingExtension = {
      cards: [{ card: usedCard, source: cardSource }]
    };

    console.log('[startBuildExtension] SUCCESS - started extension with card:', `${usedCard.rank}${usedCard.suit}`);
    return newState;

  } catch (error) {
    // ----- CLEANUP: Restore the card to its original location -----
    console.log('[startBuildExtension] Validation failed, restoring card to source:', removalInfo.source);

    if (removalInfo.source === 'table') {
      newState.tableCards.splice(removalInfo.index, 0, usedCard);
    } else if (removalInfo.source === 'hand') {
      newState.players[playerIndex].hand.splice(removalInfo.index, 0, usedCard);
    } else if (removalInfo.source === 'captured' || removalInfo.source.startsWith('captured_')) {
      const ownerIdx = removalInfo.ownerIndex !== undefined ? removalInfo.ownerIndex : playerIndex;
      newState.players[ownerIdx].captures.splice(removalInfo.index, 0, usedCard);
    }

    // Re-throw the original error
    throw error;
  }
}

module.exports = startBuildExtension;
