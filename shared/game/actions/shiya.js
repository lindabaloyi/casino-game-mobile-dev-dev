/**
 * Shiya Action Handler
 * Party mode only - allows a player to capture their teammate's build.
 * 
 * Rules:
 * - Must be party mode (4 players)
 * - Build must be owned by a teammate
 * - Build must not already have Shiya active
 * - Player must have a card matching the build's value in hand
 * 
 * Payload: { stackId: string }
 */

const { areTeammates } = require('../team');

function shiya(state, payload, playerIndex) {
  const { stackId } = payload;
  
  // Validate party mode
  if (state.playerCount !== 4) {
    throw new Error('Shiya is only available in party mode (4 players)');
  }
  
  // Find the build on the table
  const tableCard = state.tableCards.find(
    tc => tc.stackId === stackId && tc.type === 'build_stack'
  );
  
  if (!tableCard) {
    throw new Error(`Build not found: ${stackId}`);
  }
  
  // Validate build is owned by a teammate
  if (!areTeammates(playerIndex, tableCard.owner)) {
    throw new Error('You can only use Shiya on your teammate\'s build');
  }
  
  // Validate build doesn't already have Shiya active
  if (tableCard.shiyaActive) {
    throw new Error('Shiya is already active on this build');
  }
  
  // Validate player has a matching card in hand
  const playerHand = state.players[playerIndex]?.hand || [];
  const hasMatchingCard = playerHand.some(card => card.value === tableCard.value);
  
  if (!hasMatchingCard) {
    throw new Error(`You need a ${tableCard.rank} to use Shiya on this build`);
  }
  
  // Create new state with Shiya activated
  const newState = JSON.parse(JSON.stringify(state));
  
  // Find and update the build
  const buildIndex = newState.tableCards.findIndex(
    tc => tc.stackId === stackId && tc.type === 'build_stack'
  );
  
  if (buildIndex !== -1) {
    newState.tableCards[buildIndex].shiyaActive = true;
    newState.tableCards[buildIndex].shiyaPlayer = playerIndex;
  }
  
  console.log(`[shiya] Player ${playerIndex} activated Shiya on build ${stackId}`);
  
  return newState;
}

module.exports = shiya;
