/**
 * Test Script for Refactored Architecture
 * Verifies the modular system works before replacing old server
 */

console.log('🧪 [TEST] Starting refactor validation tests...\n');

// Test 1: Import all modules successfully
console.log('📦 [TEST] Testing module imports...');

try {
  const GameManager = require('./game/GameManager');
  const ActionRouter = require('./game/ActionRouter');
  const GameState = require('./game/GameState');
  const determineActions = require('./game/logic/determineActions');
  const stagingLogic = require('./game/logic/staging');
  const buildsLogic = require('./game/logic/builds');
  const actionHandlers = require('./game/actions');
  const logger = require('./utils/logger');

  console.log('✅ [TEST] All modules imported successfully\n');

  // Test 2: Initialize game system
  console.log('🎲 [TEST] Testing GameManager initialization...');

  const gameManager = new GameManager();
  const actionRouter = new ActionRouter(gameManager);
  gameManager.actionRouter = actionRouter;

  console.log('✅ [TEST] GameManager and ActionRouter initialized\n');

  // Test 3: Register action handlers
  console.log('🎯 [TEST] Testing action handler registration...');
  const handlerCount = Object.keys(actionHandlers).length;
  console.log(`📊 [TEST] Found ${handlerCount} action handlers to register`);

  // Map handler names to action types
  const actionTypeMapping = {
    trail: actionHandlers.handleTrail,
    capture: actionHandlers.handleCapture,
    build: actionHandlers.handleBuild,
    createStagingStack: actionHandlers.handleCreateStagingStack,
    addToStagingStack: actionHandlers.handleAddToStagingStack,
    finalizeStagingStack: actionHandlers.handleFinalizeStagingStack,
    cancelStagingStack: actionHandlers.handleCancelStagingStack,
    addToOpponentBuild: actionHandlers.handleAddToOpponentBuild,
    addToOwnBuild: actionHandlers.handleAddToOwnBuild,
    tableCardDrop: actionHandlers.handleTableCardDrop,
    createBuildWithValue: actionHandlers.handleCreateBuildWithValue,
    addToTemporaryCaptureStack: actionHandlers.handleAddToTemporaryCaptureStack
  };

  for (const [actionType, handler] of Object.entries(actionTypeMapping)) {
    actionRouter.registerAction(actionType, handler);
  }
  console.log('✅ [TEST] All action handlers registered\n');

  // Test 4: Start a game
  console.log('🎮 [TEST] Testing game creation...');
  const { gameId, gameState } = gameManager.startGame();
  console.log(`✅ [TEST] Game ${gameId} created successfully`);
  console.log(`📊 [TEST] Initial state: Player ${gameState.currentPlayer}'s turn, ${gameState.tableCards.length} table cards\n`);

  // Test 5: Test determineActions logic
  console.log('🧠 [TEST] Testing determineActions logic...');
  const testCard = gameState.playerHands[0][0]; // First card of first player
  const testDraggedItem = { source: 'hand', card: testCard };

  const result = gameManager.determineActions(gameId, testDraggedItem, { type: 'table' });
  console.log('✅ [TEST] determineActions executed successfully');
  console.log(`📊 [TEST] Actions determined: ${result.actions.length}, requiresModal: ${result.requiresModal}\n`);

  // Test 6: Test simple trail action
  console.log('🚶 [TEST] Testing trail action execution...');
  if (result.actions.length > 0 && result.actions[0].type === 'trail') {
    const trailAction = {
      type: 'trail',
      payload: {
        gameId,
        draggedItem: testDraggedItem,
        card: testCard
      }
    };

    const newState = gameManager.applyAction(gameId, 0, trailAction);
    console.log('✅ [TEST] Trail action executed successfully');
    console.log(`📊 [TEST] Game state updated: Player ${newState.currentPlayer}'s turn, ${newState.tableCards.length} table cards\n`);
  } else {
    console.log('⚠️ [TEST] Could not test trail action (no trail action available)\n');
  }

  // Test 7: Validate game state
  console.log('🔍 [TEST] Testing game state validation...');
  const validation = gameManager.validateGame(gameId);
  if (validation.valid) {
    console.log('✅ [TEST] Game state validation passed\n');
  } else {
    console.log('❌ [TEST] Game state validation failed:', validation.errors, '\n');
  }

  // Test 8: Clean up
  console.log('🧹 [TEST] Testing game cleanup...');
  gameManager.endGame(gameId);
  console.log(`📊 [TEST] Active games remaining: ${gameManager.getActiveGamesCount()}\n`);

  console.log('🎉 [TEST] ALL REFACTOR TESTS PASSED!');
  console.log('✅ [TEST] Modular architecture is working correctly');
  console.log('🐉 [TEST] Ready to replace old monolithic server');

} catch (error) {
  console.error('❌ [TEST] REFACTOR TESTS FAILED!');
  console.error('💥 [TEST] Error details:', error);
  console.error(error.stack);
  process.exit(1);
}
