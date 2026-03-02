/**
 * stealBuild
 * Player steals an opponent's build by adding a card from their hand.
 * 
 * Rules:
 * - Target must be an opponent's build (build_stack)
 * - Card must be from stealing player's hand
 * - Adding the card must create a valid new build (subset sum check)
 * - **OWNERSHIP CHANGES** to the stealing player
 * - Turn does NOT advance - player continues
 * 
 * Example:
 * - Player 1 has build [7,1] = 8 (owner = player 1)
 * - Player 2 steals with 2 from hand
 * - New build: [7,1,2] = 10 (owner = player 2)
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
function stealBuild(state, payload, playerIndex) {
  const card = payload.card || payload.handCard;
  const stackId = payload.stackId;

  if (!card || !stackId) {
    throw new Error('stealBuild: missing card or stackId');
  }

  const newState = cloneState(state);

  // Find the build stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId,
  );
  if (stackIdx === -1) {
    throw new Error(`stealBuild: build stack "${stackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];

  // Validate: must be opponent's build
  if (buildStack.owner === playerIndex) {
    throw new Error('stealBuild: cannot steal your own build');
  }

  // Validate: cannot steal base builds (hasBase === true)
  if (buildStack.hasBase === true) {
    throw new Error('stealBuild: cannot steal base builds');
  }

  // Find and remove card from player's hand
  const hand = newState.playerHands[playerIndex];
  const handIdx = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (handIdx === -1) {
    throw new Error(`stealBuild: card ${card.rank}${card.suit} not in hand`);
  }

  const [playedCard] = hand.splice(handIdx, 1);

  // Add card to build
  buildStack.cards.push({ ...playedCard, source: 'hand' });

  // Recalculate build value using same logic as addToTemp
  const totalSum = buildStack.cards.reduce((sum, c) => sum + c.value, 0);

  if (totalSum <= 10) {
    // SUM BUILD: all cards add together
    buildStack.value = totalSum;
    buildStack.base = totalSum;
    buildStack.need = 0;
    buildStack.buildType = 'sum';
  } else {
    // DIFF BUILD: largest is base
    const sorted = [...buildStack.cards].sort((a, b) => b.value - a.value);
    const base = sorted[0].value;
    const otherSum = sorted.slice(1).reduce((sum, c) => sum + c.value, 0);
    const need = base - otherSum;

    buildStack.value = base;
    buildStack.base = base;
    buildStack.need = need;
    buildStack.buildType = 'diff';
  }

  // **OWNERSHIP CHANGES** to stealing player
  const previousOwner = buildStack.owner;
  buildStack.owner = playerIndex;

  console.log(`[stealBuild] Player ${playerIndex} stole build from Player ${previousOwner}`);
  console.log(`[stealBuild] Added ${playedCard.rank}${playedCard.suit}, new value: ${buildStack.value}, need: ${buildStack.need}`);
  console.log(`[stealBuild] Build cards:`, buildStack.cards.map(c => `${c.rank}${c.suit}`).join(', '));

  // Turn does NOT advance - player continues
  return newState;
}

module.exports = stealBuild;
