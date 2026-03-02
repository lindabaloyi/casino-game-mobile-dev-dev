/**
 * startBuildExtension
 * Player starts extending their own build by locking a loose card to it.
 * 
 * Payload:
 * - stackId: required - the build stack ID
 * - looseCard: required - the loose card from table
 * 
 * Rules:
 * - Player must own the build
 * - Loose card must be on table
 * - Does NOT advance turn
 * 
 * Contract: (state, payload, playerIndex) => newState (pure)
 */

const { cloneState } = require('../GameState');

/**
 * @param {object} state
 * @param {{ stackId: string, looseCard: object }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function startBuildExtension(state, payload, playerIndex) {
  const { stackId, looseCard } = payload;

  if (!stackId) {
    throw new Error('startBuildExtension: missing stackId');
  }
  if (!looseCard?.rank || !looseCard?.suit) {
    throw new Error('startBuildExtension: invalid looseCard');
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

  // Find and remove loose card from table
  const tableIdx = newState.tableCards.findIndex(
    tc => !tc.type && tc.rank === looseCard.rank && tc.suit === looseCard.suit,
  );
  if (tableIdx === -1) {
    throw new Error(`startBuildExtension: loose card ${looseCard.rank}${looseCard.suit} not on table`);
  }

  // Remove the loose card from table
  newState.tableCards.splice(tableIdx, 1);

  // Set pending extension with the locked loose card
  buildStack.pendingExtension = {
    looseCard: { ...looseCard, source: 'table' },
  };

  console.log(`[startBuildExtension] Player ${playerIndex} started extending build ${stackId}`);
  console.log(`[startBuildExtension] Locked loose card: ${looseCard.rank}${looseCard.suit}`);
  console.log(`[startBuildExtension] Build ${stackId} now has pending extension`);

  // Turn does NOT advance - player continues to add hand card
  return newState;
}

module.exports = startBuildExtension;
