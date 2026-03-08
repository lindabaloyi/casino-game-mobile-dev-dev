/**
 * startBuildExtension
 * Player starts extending their own (or teammate's) build by locking a card to it.
 */

const { cloneState } = require('../');

// Helper to check if two players are teammates in a 4‑player game
function areTeammates(playerA, playerB) {
  // Players 0,1 = Team A ; Players 2,3 = Team B
  return (playerA < 2 && playerB < 2) || (playerA >= 2 && playerB >= 2);
}

function startBuildExtension(state, payload, playerIndex) {
  const { stackId, card, cardSource = 'table' } = payload;

  if (!stackId) {
    throw new Error('startBuildExtension: missing stackId');
  }
  if (!card?.rank || !card?.suit) {
    throw new Error('startBuildExtension: invalid card');
  }

  const newState = cloneState(state);
  const isPartyMode = newState.playerCount === 4; // or use newState.mode === 'party'

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`startBuildExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];
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
    throw new Error('startBuildExtension: not authorized to extend this build');
  }

  // Remove card from its source
  let usedCard;
  
  if (cardSource === 'table') {
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
    );
    if (tableIdx === -1) {
      throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not on table`);
    }
    usedCard = { ...newState.tableCards[tableIdx], source: 'table' };
    newState.tableCards.splice(tableIdx, 1);
    
  } else if (cardSource === 'hand') {
    const playerHand = newState.players[playerIndex].hand;
    const handIdx = playerHand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx === -1) {
      throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not in player's hand`);
    }
    usedCard = { ...playerHand[handIdx], source: 'hand' };
    playerHand.splice(handIdx, 1);
    
  } else if (cardSource === 'captured') {
    // Search for the card in captures (own first, then teammates if party, then opponents)
    let capturedCard = null;
    let sourcePlayer = null;
    let captureIdx = -1;

    // Search own captures first
    captureIdx = newState.players[playerIndex].captures.findIndex(
      c => String(c.rank).toLowerCase() === String(card.rank).toLowerCase() && 
           String(c.suit).toLowerCase() === String(card.suit).toLowerCase(),
    );
    if (captureIdx !== -1) {
      capturedCard = newState.players[playerIndex].captures[captureIdx];
      sourcePlayer = playerIndex;
    }

    // If not found and in party mode, search teammates' captures
    if (!capturedCard && isPartyMode) {
      const teammateIndices = (playerIndex < 2) ? [1, 0] : [3, 2]; // Team A: 0↔1, Team B: 2↔3
      for (const tIdx of teammateIndices) {
        captureIdx = newState.players[tIdx].captures.findIndex(
          c => String(c.rank).toLowerCase() === String(card.rank).toLowerCase() && 
               String(c.suit).toLowerCase() === String(card.suit).toLowerCase(),
        );
        if (captureIdx !== -1) {
          capturedCard = newState.players[tIdx].captures[captureIdx];
          sourcePlayer = tIdx;
          break;
        }
      }
    }

    // If still not found, search ALL opponents' captures (in both party and duel mode)
    if (!capturedCard) {
      // In party mode: check both opponents; in duel mode: check the single opponent
      const opponentIndices = isPartyMode 
        ? (playerIndex < 2 ? [2, 3] : [0, 1])  // Team A: 0,1 vs Team B: 2,3
        : [playerIndex === 0 ? 1 : 0];
      
      for (const oIdx of opponentIndices) {
        captureIdx = newState.players[oIdx].captures.findIndex(
          c => String(c.rank).toLowerCase() === String(card.rank).toLowerCase() && 
               String(c.suit).toLowerCase() === String(card.suit).toLowerCase(),
        );
        if (captureIdx !== -1) {
          capturedCard = newState.players[oIdx].captures[captureIdx];
          sourcePlayer = oIdx;
          break;
        }
      }
    }

    if (!capturedCard) {
      throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not found in any capture pile`);
    }

    // Remove the card from the source player's captures
    const sourceCaptures = newState.players[sourcePlayer].captures;
    const srcIdx = sourceCaptures.findIndex(
      c => String(c.rank).toLowerCase() === String(card.rank).toLowerCase() && 
           String(c.suit).toLowerCase() === String(card.suit).toLowerCase(),
    );
    usedCard = { ...sourceCaptures[srcIdx], source: 'captured', originalOwner: sourcePlayer };
    sourceCaptures.splice(srcIdx, 1);
    
  } else {
    throw new Error(`startBuildExtension: unknown cardSource "${cardSource}"`);
  }

  // Set pending extension
  buildStack.pendingExtension = {
    cards: [{ card: usedCard, source: cardSource }]
  };

  return newState;
}

module.exports = startBuildExtension;
