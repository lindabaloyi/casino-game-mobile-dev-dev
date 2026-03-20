/**
 * addToCapture
 * Opponent adds another card to an existing pending capture set.
 * Supports cards from hand, table, or captured pile.
 */

const { cloneState } = require('../');

function areTeammates(pA, pB) {
  return (pA < 2 && pB < 2) || (pA >= 2 && pB >= 2);
}

/**
 * Find a card at a specific source location (hand, table, or captured)
 */
function findCardAtSource(state, card, source, playerIndex) {
  const cardKey = `${card.rank}${card.suit}`;
  console.log(`[addToCapture-findCardAtSource] Looking for ${cardKey} at source:`, source);

  // Search table (loose cards only)
  if (source === 'table') {
    const tableIdx = state.tableCards.findIndex(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit
    );
    console.log('[addToCapture-findCardAtSource] Table search result:', tableIdx);
    if (tableIdx !== -1) {
      return { found: true, card: state.tableCards[tableIdx], index: tableIdx };
    }
    return { found: false };
  }

  // Search hand
  if (source === 'hand') {
    const hand = state.players[playerIndex].hand;
    const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    console.log('[addToCapture-findCardAtSource] Hand search result:', handIdx);
    if (handIdx !== -1) {
      return { found: true, card: hand[handIdx], index: handIdx };
    }
    return { found: false };
  }

  // Search captured pile - can be 'captured' (own) or 'captured_<playerIndex>'
  if (source === 'captured' || (typeof source === 'string' && source.startsWith('captured_'))) {
    let ownerIndex = playerIndex;
    
    if (source.startsWith('captured_')) {
      const parsed = parseInt(source.split('_')[1], 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < state.players.length) {
        ownerIndex = parsed;
      }
    }
    
    const captures = state.players[ownerIndex]?.captures || [];
    const captureIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    console.log('[addToCapture-findCardAtSource] Captured search result:', captureIdx, 'at owner:', ownerIndex);
    
    if (captureIdx !== -1) {
      return { found: true, card: captures[captureIdx], index: captureIdx, ownerIndex };
    }
    return { found: false };
  }

  return { found: false };
}

function addToCapture(state, payload, playerIndex) {
  const { stackId, card, cardSource = 'table' } = payload;

  console.log('[addToCapture]', { stackId, card, cardSource, playerIndex });

  if (!stackId) throw new Error('addToCapture: missing stackId');
  if (!card?.rank || !card?.suit) throw new Error('addToCapture: invalid card');

  // Validate source - hand, table, or captured allowed for capture
  const validSources = ['hand', 'table', 'captured'];
  const isValidSource = validSources.includes(cardSource) || 
    (typeof cardSource === 'string' && cardSource.startsWith('captured_'));
  if (!isValidSource) {
    throw new Error('addToCapture: card source must be "hand", "table", or "captured" (or "captured_<playerIndex>")');
  }

  const newState = cloneState(state);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId
  );
  if (stackIdx === -1) throw new Error(`addToCapture: build stack "${stackId}" not found`);

  const buildStack = newState.tableCards[stackIdx];
  const owner = buildStack.owner;
  // Determine party mode: check if any player has a team property (indicates party mode)
  // In party mode, players have team: 'A' or 'B'. In freeforall, they have no team.
  const isPartyMode = newState.playerCount === 4 && newState.players.some(p => p.team);

  // Validate player is opponent
  const isOwner = owner === playerIndex;
  const isTeammate = isPartyMode && areTeammates(owner, playerIndex);
  if (isOwner || isTeammate) {
    throw new Error('addToCapture: cannot capture own or teammate build');
  }

  // Must have pending capture
  if (!buildStack.pendingCapture) {
    throw new Error('addToCapture: no pending capture to add to');
  }

  // Validate card exists at source
  const cardInfo = findCardAtSource(state, card, cardSource, playerIndex);
  if (!cardInfo.found) {
    throw new Error(`addToCapture: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }

  // Optional: prevent adding if sum would exceed build value (user-friendly)
  const currentSum = buildStack.pendingCapture.cards.reduce((sum, item) => sum + item.card.value, 0);
  if (currentSum + card.value > buildStack.value) {
    throw new Error(`addToCapture: adding ${card.value} would exceed build value ${buildStack.value}`);
  }

  // Remove card from source
  let usedCard;
  const cardOwnerIndex = cardInfo.ownerIndex ?? playerIndex;

  try {
    if (cardSource === 'table') {
      [usedCard] = newState.tableCards.splice(cardInfo.index, 1);
      usedCard = { ...usedCard, source: 'table' };
    } else if (cardSource === 'hand') {
      const hand = newState.players[playerIndex].hand;
      [usedCard] = hand.splice(cardInfo.index, 1);
      usedCard = { ...usedCard, source: 'hand' };
    } else if (cardSource === 'captured' || (typeof cardSource === 'string' && cardSource.startsWith('captured_'))) {
      const captures = newState.players[cardOwnerIndex].captures;
      [usedCard] = captures.splice(cardInfo.index, 1);
      usedCard = { ...usedCard, source: cardSource };
    } else {
      throw new Error(`addToCapture: unknown cardSource "${cardSource}"`);
    }

    // Add to pending capture
    buildStack.pendingCapture.cards.push({ card: usedCard, source: cardSource });

    console.log('[addToCapture] Success – added', `${usedCard.rank}${usedCard.suit}`);

    return newState;
  } catch (error) {
    // Restore card if error occurred after removal
    if (cardSource === 'table') {
      newState.tableCards.splice(cardInfo.index, 0, cardInfo.card);
    } else if (cardSource === 'hand') {
      newState.players[playerIndex].hand.splice(cardInfo.index, 0, cardInfo.card);
    } else if (cardSource === 'captured' || (typeof cardSource === 'string' && cardSource.startsWith('captured_'))) {
      newState.players[cardOwnerIndex].captures.splice(cardInfo.index, 0, cardInfo.card);
    }
    throw error;
  }
}

module.exports = addToCapture;
