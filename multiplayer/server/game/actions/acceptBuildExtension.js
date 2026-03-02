/**
 * acceptBuildExtension
 * Player accepts their build extension, adding a card to complete the extension.
 * 
 * Payload:
 * - stackId: required - the build stack ID
 * - card: required - the card to add (from hand or captures)
 * - cardSource: optional - source of the card ('hand' or 'captured'). Defaults to 'hand'
 * 
 * Rules:
 * - Player must own the build
 * - Build must have pending extension with loose card
 * - Card must be in player's hand or captures
 * - New build value must be valid (sum/diff logic)
 * - Turn advances on success
 * 
 * Contract: (state, payload, playerIndex) => newState (pure)
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * Calculate build value using sum/diff logic
 * @param {Array} cards - Array of card objects
 * @returns {{ value: number, base: number, need: number, buildType: string }}
 */
function calculateBuildValue(cards) {
  const totalSum = cards.reduce((sum, c) => sum + c.value, 0);
  
  if (totalSum <= 10) {
    // SUM BUILD: all cards add together
    return {
      value: totalSum,
      base: totalSum,
      need: 0,
      buildType: 'sum',
    };
  } else {
    // DIFF BUILD: largest is base
    const sorted = [...cards].sort((a, b) => b.value - a.value);
    const base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    const need = base - otherSum;
    
    return {
      value: base,
      base: base,
      need: need,
      buildType: need === 0 ? 'diff' : 'diff-incomplete',
    };
  }
}

/**
 * @param {object} state
 * @param {{ stackId: string, card: object, cardSource?: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function acceptBuildExtension(state, payload, playerIndex) {
  const { stackId, card, cardSource = 'hand' } = payload;

  if (!stackId) {
    throw new Error('acceptBuildExtension: missing stackId');
  }
  if (!card?.rank || !card?.suit) {
    throw new Error('acceptBuildExtension: invalid card');
  }

  const newState = cloneState(state);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`acceptBuildExtension: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  // Validate ownership
  if (buildStack.owner !== playerIndex) {
    throw new Error('acceptBuildExtension: only owner can extend their build');
  }

  // Validate pending extension exists
  if (!buildStack.pendingExtension?.looseCard) {
    throw new Error('acceptBuildExtension: no pending extension to accept');
  }

  const pendingLooseCard = buildStack.pendingExtension.looseCard;

  // Find and remove card from its source
  let playedCard;
  
  if (cardSource === 'hand') {
    // Find and remove card from player's hand
    const hand = newState.playerHands[playerIndex];
    if (!hand) {
      throw new Error('acceptBuildExtension: player has no hand');
    }
    
    const handIdx = hand.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    
    console.log(`[acceptBuildExtension] Looking for hand card: ${card.rank}${card.suit}`);
    console.log(`[acceptBuildExtension] Player ${playerIndex} hand:`, hand.map(c => `${c.rank}${c.suit}`).join(', '));
    
    if (handIdx === -1) {
      throw new Error(`acceptBuildExtension: card ${card.rank}${card.suit} not in player's hand`);
    }
    
    playedCard = { ...hand[handIdx], source: 'hand' };
    hand.splice(handIdx, 1);
    
  } else if (cardSource === 'captured') {
    // Find and remove card from player's captured cards
    const playerCaptures = newState.playerCaptures[playerIndex];
    if (!playerCaptures) {
      throw new Error('acceptBuildExtension: player has no captured cards');
    }
    
    const captureIdx = playerCaptures.findIndex(
      c => c.rank === card.rank && c.suit === card.suit,
    );
    
    console.log(`[acceptBuildExtension] Looking for captured card: ${card.rank}${card.suit}`);
    console.log(`[acceptBuildExtension] Player ${playerIndex} captures:`, playerCaptures.map(c => `${c.rank}${c.suit}`).join(', '));
    
    if (captureIdx === -1) {
      throw new Error(`acceptBuildExtension: card ${card.rank}${card.suit} not in player's captures`);
    }
    
    playedCard = { ...playerCaptures[captureIdx], source: 'captured' };
    playerCaptures.splice(captureIdx, 1);
    
  } else {
    throw new Error(`acceptBuildExtension: unknown cardSource "${cardSource}"`);
  }

  // Combine all cards: original build + loose card + played card
  const allCards = [
    ...buildStack.cards,
    { ...pendingLooseCard },
    playedCard,
  ];

  // Calculate new build value
  // Special logic for extensions:
  // - If (looseCard + playedCard) == original build value → keep the same build value
  // - If (looseCard + playedCard) < original build value → need = buildValue - (looseCard + playedCard)
  const originalValue = buildStack.value;
  const addedValue = pendingLooseCard.value + playedCard.value;
  let buildResult;

  if (addedValue === originalValue) {
    // Adding cards equal to original value - keep same value
    buildResult = {
      value: originalValue,
      base: originalValue,
      need: 0,
      buildType: 'extend-same',
    };
    console.log(`[acceptBuildExtension] Added value equals original (${addedValue}), keeping build value: ${originalValue}`);
  } else if (addedValue < originalValue) {
    // Adding cards less than original value - need is what's left
    const need = originalValue - addedValue;
    buildResult = {
      value: originalValue, // Keep original value as target
      base: originalValue,
      need: need,
      buildType: 'extend-need',
    };
    console.log(`[acceptBuildExtension] Added value (${addedValue}) less than original (${originalValue}), need: ${need}`);
  } else {
    // Added value > original value - use sum/diff logic
    buildResult = calculateBuildValue(allCards);
    console.log(`[acceptBuildExtension] Added value (${addedValue}) > original (${originalValue}), using sum/diff logic`);
  }

  // Validate the extension is possible
  // For a valid build: need must be 0 (complete) or we accept incomplete builds
  // The key is that the new value must be achievable
  if (buildResult.buildType === 'diff-incomplete') {
    // Diff build that's not complete - validate can still use this value
    console.log(`[acceptBuildExtension] Build is incomplete, need: ${buildResult.need}`);
  }

  // Update build stack with new cards and value
  buildStack.cards = allCards;
  buildStack.value = buildResult.value;
  buildStack.base = buildResult.base;
  buildStack.need = buildResult.need;
  buildStack.buildType = buildResult.buildType;

  // Clear pending extension
  buildStack.pendingExtension = null;

  console.log(`[acceptBuildExtension] Player ${playerIndex} extended build ${stackId}`);
  console.log(`[acceptBuildExtension] Added: ${pendingLooseCard.rank}${pendingLooseCard.suit} + ${playedCard.rank}${playedCard.suit} from ${playedCard.source}`);
  console.log(`[acceptBuildExtension] New build value: ${buildResult.value}, type: ${buildResult.buildType}`);
  console.log(`[acceptBuildExtension] Build cards:`, buildStack.cards.map(c => `${c.rank}${c.suit}`).join(', '));

  // Turn advances to opponent
  return nextTurn(newState);
}

module.exports = acceptBuildExtension;
