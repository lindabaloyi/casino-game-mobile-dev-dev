/**
 * addToBuild
 * Player adds a card to their existing build (not temp stack).
 * This is different from addToTemp - it's adding to an ACCEPTED build.
 * 
 * Rules:
 * - Card must be from player's hand
 * - Build must be owned by player
 * - Turn does NOT advance - player continues
 * 
 * Contract: (state, payload, playerIndex) => newState (pure)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ card: object, stackId: string }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function addToBuild(state, payload, playerIndex) {
  const card = payload.card || payload.handCard;
  const stackId = payload.stackId;

  if (!card || !stackId) {
    throw new Error('addToBuild: missing card or stackId');
  }

  const newState = cloneState(state);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`addToBuild: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  // Validate ownership
  if (buildStack.owner !== playerIndex) {
    throw new Error(`addToBuild: cannot add to opponent's build`);
  }

  // Find and remove card from player's hand
  const hand = newState.playerHands[playerIndex];
  const handIdx = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (handIdx === -1) {
    throw new Error(`addToBuild: card ${card.rank}${card.suit} not in hand`);
  }

  const [playedCard] = hand.splice(handIdx, 1);

  // Add card to build
  buildStack.cards.push({ ...playedCard, source: 'hand' });

  // Recalculate build value (sum of all cards)
  const newValue = buildStack.cards.reduce((sum, c) => sum + c.value, 0);
  buildStack.value = newValue;

  console.log(`[addToBuild] Added ${playedCard.rank}${playedCard.suit} to build, new value: ${newValue}`);

  // Turn does NOT advance - player continues
  return newState;
}

module.exports = addToBuild;
