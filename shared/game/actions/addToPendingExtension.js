/**
 * addToPendingExtension
 * Player adds another card to an existing pending extension.
 */

const { cloneState } = require('../');

// Helper to check if two players are teammates in a 4‑player game
function areTeammates(playerA, playerB) {
  // Players 0,1 = Team A ; Players 2,3 = Team B
  return (playerA < 2 && playerB < 2) || (playerA >= 2 && playerB >= 2);
}

function addToPendingExtension(state, payload, playerIndex) {
  const { stackId, card, cardSource } = payload;

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

  // Remove card from its source
  let usedCard;
  
  if (cardSource === 'table') {
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
    );
    if (tableIdx === -1) {
      throw new Error(`addToPendingExtension: card ${card.rank}${card.suit} not on table`);
    }
    usedCard = { ...newState.tableCards[tableIdx], source: 'table' };
    newState.tableCards.splice(tableIdx, 1);
  } else if (cardSource === 'hand') {
    const playerHand = newState.players[playerIndex].hand;
    const handIdx = playerHand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    if (handIdx === -1) {
      throw new Error(`addToPendingExtension: card ${card.rank}${card.suit} not in player's hand`);
    }
    usedCard = { ...playerHand[handIdx], source: 'hand' };
    playerHand.splice(handIdx, 1);
  } else if (cardSource === 'captured') {
    // Check player's own captures first, then opponent's captures
    // (allows using cards from opponent's capture pile when extending build)
    let playerCaptures = newState.players[playerIndex].captures;
    let captureIdx = playerCaptures.findIndex(
      c => String(c.rank).toLowerCase() === String(card.rank).toLowerCase() && 
           String(c.suit).toLowerCase() === String(card.suit).toLowerCase(),
    );
    
    // If not found in player's captures, check all opponents' captures
    if (captureIdx === -1) {
      // In party mode, check all opponents; in duel mode, check the single opponent
      const isPartyMode = newState.playerCount === 4;
      const opponentIndices = isPartyMode 
        ? (playerIndex < 2 ? [2, 3] : [0, 1])  // Team A: 0,1 vs Team B: 2,3
        : [playerIndex === 0 ? 1 : 0];
      
      for (const opponentIndex of opponentIndices) {
        const opponentCaptures = newState.players[opponentIndex].captures;
        captureIdx = opponentCaptures.findIndex(
          c => String(c.rank).toLowerCase() === String(card.rank).toLowerCase() && 
               String(c.suit).toLowerCase() === String(card.suit).toLowerCase(),
        );
        if (captureIdx !== -1) {
          playerCaptures = opponentCaptures;
          break;
        }
      }
    }
    
    if (captureIdx === -1) {
      throw new Error(`addToPendingExtension: card ${card.rank}${card.suit} not in player's or opponent's captures`);
    }
    usedCard = { ...playerCaptures[captureIdx], source: 'captured' };
    playerCaptures.splice(captureIdx, 1);
  } else {
    throw new Error(`addToPendingExtension: unknown cardSource "${cardSource}"`);
  }

  // LIMIT: Max 2 cards per pending extension
  if (buildStack.pendingExtension.cards.length >= 2) {
    throw new Error('Cannot add more than 2 cards to pending extension');
  }

  // Add to pending extension array
  // Cards are already in array format from startBuildExtension
  buildStack.pendingExtension.cards.push({ card: usedCard, source: cardSource });

  return newState;
}

module.exports = addToPendingExtension;
