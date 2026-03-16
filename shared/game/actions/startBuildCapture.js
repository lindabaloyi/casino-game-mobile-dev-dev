/**
 * startBuildCapture
 * Opponent starts capturing a build by locking a card to a pending capture set.
 * Supports cards from hand or table only.
 */

const { cloneState } = require('../');

function areTeammates(pA, pB) {
  return (pA < 2 && pB < 2) || (pA >= 2 && pB >= 2);
}

/**
 * Find a card at a specific source location (hand or table only)
 */
function findCardAtSource(state, card, source, playerIndex) {
  const cardKey = `${card.rank}${card.suit}`;
  console.log(`[startBuildCapture-findCardAtSource] Looking for ${cardKey} at source:`, source);

  // Search table (loose cards only)
  if (source === 'table') {
    const tableIdx = state.tableCards.findIndex(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit
    );
    console.log('[startBuildCapture-findCardAtSource] Table search result:', tableIdx);
    if (tableIdx !== -1) {
      return { found: true, card: state.tableCards[tableIdx], index: tableIdx };
    }
    return { found: false };
  }

  // Search hand
  if (source === 'hand') {
    const hand = state.players[playerIndex].hand;
    const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    console.log('[startBuildCapture-findCardAtSource] Hand search result:', handIdx);
    if (handIdx !== -1) {
      return { found: true, card: hand[handIdx], index: handIdx };
    }
    return { found: false };
  }

  return { found: false };
}

function startBuildCapture(state, payload, playerIndex) {
  const { stackId, card, cardSource = 'table' } = payload;

  console.log('[startBuildCapture]', { stackId, card, cardSource, playerIndex });

  if (!stackId) throw new Error('startBuildCapture: missing stackId');
  if (!card?.rank || !card?.suit) throw new Error('startBuildCapture: invalid card');

  // Validate source - only hand and table allowed for capture
  if (cardSource !== 'hand' && cardSource !== 'table') {
    throw new Error('startBuildCapture: card source must be "hand" or "table"');
  }

  const newState = cloneState(state);
  const isPartyMode = newState.playerCount === 4;

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId
  );
  if (stackIdx === -1) throw new Error(`startBuildCapture: build stack "${stackId}" not found`);

  const buildStack = newState.tableCards[stackIdx];
  const owner = buildStack.owner;

  // Validate that player is NOT owner and NOT teammate (i.e., opponent)
  const isOwner = owner === playerIndex;
  const isTeammate = isPartyMode && areTeammates(owner, playerIndex);
  if (isOwner || isTeammate) {
    throw new Error('startBuildCapture: cannot capture own or teammate build');
  }

  // Check if build already has a pending capture
  if (buildStack.pendingCapture) {
    throw new Error('startBuildCapture: build already has a pending capture');
  }

  // Validate card exists at claimed source
  const cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  if (!cardInfo.found) {
    throw new Error(`startBuildCapture: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }

  // Remove card from source
  let usedCard;

  if (cardSource === 'table') {
    [usedCard] = newState.tableCards.splice(cardInfo.index, 1);
    usedCard = { ...usedCard, source: 'table' };
  } else if (cardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    [usedCard] = hand.splice(cardInfo.index, 1);
    usedCard = { ...usedCard, source: 'hand' };
  } else {
    throw new Error(`startBuildCapture: unknown cardSource "${cardSource}"`);
  }

  // Initialize pending capture
  buildStack.pendingCapture = {
    cards: [{ card: usedCard, source: cardSource }]
  };

  console.log('[startBuildCapture] Success – pending capture started with', `${usedCard.rank}${usedCard.suit}`);

  return newState;
}

module.exports = startBuildCapture;
