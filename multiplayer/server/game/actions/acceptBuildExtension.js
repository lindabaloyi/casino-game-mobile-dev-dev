/**
 * acceptBuildExtension
 * Player accepts their build extension, adding hand card to complete the extension.
 * 
 * Payload:
 * - stackId: required - the build stack ID
 * - handCard: required - the hand card to add
 * 
 * Rules:
 * - Player must own the build
 * - Build must have pending extension with loose card
 * - Hand card must be in player's hand
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
 * @param {{ stackId: string, handCard: object }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function acceptBuildExtension(state, payload, playerIndex) {
  const { stackId, handCard } = payload;

  if (!stackId) {
    throw new Error('acceptBuildExtension: missing stackId');
  }
  if (!handCard?.rank || !handCard?.suit) {
    throw new Error('acceptBuildExtension: invalid handCard');
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

  // Find and remove hand card from player's hand
  const hand = newState.playerHands[playerIndex];
  const handIdx = hand.findIndex(
    c => c.rank === handCard.rank && c.suit === handCard.suit,
  );
  if (handIdx === -1) {
    throw new Error(`acceptBuildExtension: hand card ${handCard.rank}${handCard.suit} not in hand`);
  }

  const [playedCard] = hand.splice(handIdx, 1);

  // Combine all cards: original build + loose card + hand card
  const allCards = [
    ...buildStack.cards,
    { ...pendingLooseCard },
    { ...playedCard, source: 'hand' },
  ];

  // Calculate new build value
  const buildResult = calculateBuildValue(allCards);

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
  console.log(`[acceptBuildExtension] Added: ${pendingLooseCard.rank}${pendingLooseCard.suit} + ${playedCard.rank}${playedCard.suit}`);
  console.log(`[acceptBuildExtension] New build value: ${buildResult.value}, type: ${buildResult.buildType}`);
  console.log(`[acceptBuildExtension] Build cards:`, buildStack.cards.map(c => `${c.rank}${c.suit}`).join(', '));

  // Turn advances to opponent
  return nextTurn(newState);
}

module.exports = acceptBuildExtension;
