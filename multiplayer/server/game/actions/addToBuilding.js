
/**
 * Add To Building Action Handler
 * Adds a card directly to an existing build's card stack
 */

function handleAddToBuilding(gameManager, playerIndex, action, gameId) {
  const gameState = gameManager.getGameState(gameId);
  const { buildId, card, source } = action.payload;

  console.log('[ADDTOBUILDING] 🚀 STARTING add to build action:', {
    buildId,
    card: `${card.rank}${card.suit}`,
    source,
    playerIndex,
    gameId,
    timestamp: new Date().toISOString()
  });

  // Log current game state
  console.log('[ADDTOBUILDING] 📊 Current game state:', {
    tableCardCount: gameState.tableCards.length,
    playerHandSizes: gameState.playerHands.map(h => h.length),
    builds: gameState.tableCards.filter(tc => tc.type === 'build').map(b => ({
      buildId: b.buildId,
      value: b.value,
      cards: b.cards?.length || 0
    }))
  });

  // Find the build
  console.log('[ADDTOBUILDING] 🔍 Looking for build:', buildId);
  const buildIndex = gameState.tableCards.findIndex(item =>
    item.type === 'build' && item.buildId === buildId
  );

  if (buildIndex === -1) {
    console.error('[ADDTOBUILDING] ❌ Build not found:', {
      buildId,
      availableBuilds: gameState.tableCards.filter(tc => tc.type === 'build').map(b => b.buildId)
    });
    throw new Error(`Build ${buildId} not found`);
  }

  const build = gameState.tableCards[buildIndex];
  console.log('[ADDTOBUILDING] ✅ Found target build:', {
    buildId: build.buildId,
    currentValue: build.value,
    currentCardCount: build.cards?.length || 0,
    owner: build.owner,
    buildIndex
  });

  // Remove card from source
  console.log('[ADDTOBUILDING] 🗑️ Removing card from source:', { source, card: `${card.rank}${card.suit}` });
  const { removeCardFromSource } = require('../utils/sourceUtils');
  const { success, error } = removeCardFromSource(gameState, card, source, playerIndex);

  if (!success) {
    console.error('[ADDTOBUILDING] ❌ Failed to remove card from source:', { error, source, card });
    throw new Error(`Failed to remove card: ${error}`);
  }

  console.log('[ADDTOBUILDING] ✅ Card successfully removed from source');

  // Initialize build cards array if needed
  if (!build.cards) {
    console.log('[ADDTOBUILDING] 📝 Initializing build cards array');
    build.cards = [];
  }

  // Add card to build
  console.log('[ADDTOBUILDING] ➕ Adding card to build structure:', {
    beforeCards: build.cards.length,
    addingCard: `${card.rank}${card.suit}(${card.value})`
  });

  build.cards.push(card);

  // Recalculate build value
  const oldValue = build.value;
  build.value = build.cards.reduce((sum, c) => sum + (c.value || 0), 0);

  console.log('[ADDTOBUILDING] 🧮 Build value recalculated:', {
    oldValue,
    newValue: build.value,
    cardCount: build.cards.length,
    allCards: build.cards.map(c => `${c.rank}${c.suit}(${c.value})`)
  });

  // Final verification
  console.log('[ADDTOBUILDING] ✅ Build augmentation completed successfully:', {
    buildId: build.buildId,
    finalValue: build.value,
    finalCardCount: build.cards.length,
    addedCard: `${card.rank}${card.suit}`,
    source
  });

  return gameState;
}

module.exports = handleAddToBuilding;
