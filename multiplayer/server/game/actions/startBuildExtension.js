/**
 * startBuildExtension
 * Player starts extending their own build by locking a card to it.
 * 
 * Payload:
 * - stackId: required - the build stack ID
 * - card: required - the card being used to extend (from table, hand, or captures)
 * - cardSource: optional - source of the card ('table', 'hand', 'captured'). Defaults to 'table'
 * 
 * Rules:
 * - Player must own the build
 * - Card must be available from the specified source
 * - Does NOT advance turn
 * 
 * Contract: (state, payload, playerIndex) => newState (pure)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ stackId: string, card: object, cardSource?: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function startBuildExtension(state, payload, playerIndex) {
  const { stackId, card, cardSource = 'table' } = payload;

  if (!stackId) {
    throw new Error('startBuildExtension: missing stackId');
  }
  if (!card?.rank || !card?.suit) {
    throw new Error('startBuildExtension: invalid card');
  }

  const newState = cloneState(state);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`startBuildExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  // Validate ownership - only owner can extend their build
  if (buildStack.owner !== playerIndex) {
    throw new Error('startBuildExtension: only owner can extend their build');
  }

  // Check if build is already extending
  if (buildStack.pendingExtension?.looseCard) {
    throw new Error('startBuildExtension: build already has pending extension');
  }

  // Remove card from its source
  let usedCard;
  
  if (cardSource === 'table') {
    // Find and remove loose card from table
    // Loose cards are plain Card objects without 'type' property
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
    );
    
    console.log(`[startBuildExtension] Looking for table card: ${card.rank}${card.suit}`);
    console.log(`[startBuildExtension] Table cards:`, newState.tableCards.map(tc => {
      if (tc.type) return `${tc.type}:${tc.stackId}`;
      return `${tc.rank}${tc.suit}`;
    }).join(', '));
    
    if (tableIdx === -1) {
      throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not on table`);
    }
    
    // Remove the loose card from table
    usedCard = { ...newState.tableCards[tableIdx], source: 'table' };
    newState.tableCards.splice(tableIdx, 1);
    
  } else if (cardSource === 'hand') {
    // Find and remove card from player's hand
    const playerHand = newState.playerHands[playerIndex];
    if (!playerHand) {
      throw new Error('startBuildExtension: player has no hand');
    }
    
    const handIdx = playerHand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    
    console.log(`[startBuildExtension] Looking for hand card: ${card.rank}${card.suit}`);
    console.log(`[startBuildExtension] Player ${playerIndex} hand:`, playerHand.map(c => `${c.rank}${c.suit}`).join(', '));
    
    if (handIdx === -1) {
      throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not in player's hand`);
    }
    
    // Remove the card from hand
    usedCard = { ...playerHand[handIdx], source: 'hand' };
    playerHand.splice(handIdx, 1);
    
  } else if (cardSource === 'captured') {
    // Find and remove card from player's captured cards
    const playerCaptures = newState.playerCaptures[playerIndex];
    if (!playerCaptures) {
      throw new Error('startBuildExtension: player has no captured cards');
    }
    
    const captureIdx = playerCaptures.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    
    console.log(`[startBuildExtension] Looking for captured card: ${card.rank}${card.suit}`);
    console.log(`[startBuildExtension] Player ${playerIndex} captures:`, playerCaptures.map(c => `${c.rank}${c.suit}`).join(', '));
    
    if (captureIdx === -1) {
      throw new Error(`startBuildExtension: card ${card.rank}${card.suit} not in player's captures`);
    }
    
    // Remove the card from captures
    usedCard = { ...playerCaptures[captureIdx], source: 'captured' };
    playerCaptures.splice(captureIdx, 1);
    
  } else {
    throw new Error(`startBuildExtension: unknown cardSource "${cardSource}"`);
  }

  // Set pending extension with the locked card
  buildStack.pendingExtension = {
    looseCard: usedCard,
  };

  console.log(`[startBuildExtension] Player ${playerIndex} started extending build ${stackId}`);
  console.log(`[startBuildExtension] Locked card: ${usedCard.rank}${usedCard.suit} from ${usedCard.source}`);
  console.log(`[startBuildExtension] Build ${stackId} now has pending extension`);

  // Turn does NOT advance - player continues to add hand card
  return newState;
}

module.exports = startBuildExtension;
