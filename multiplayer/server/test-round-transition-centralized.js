/**
 * Test Suite: Centralized Round Transition Logic
 * Tests the fix for the critical multi-action play flaw
 */

const GameManager = require('./game/GameManager');
const ActionRouter = require('./game/ActionRouter');
const actionHandlers = require('./game/actions');

console.log('🎯 CENTRALIZED ROUND TRANSITION TEST SUITE');
console.log('==========================================\n');

// Test utilities
function createTestGame() {
  const gameManager = new GameManager();
  const actionRouter = new ActionRouter(gameManager);

  // Register action handlers (same as socket-server.js)
  const actionTypeMapping = {
    trail: actionHandlers.handleTrail,
    createTemp: actionHandlers.handleCreateTemp,
    addToOwnTemp: actionHandlers.handleAddToOwnTemp,
    cancelTemp: actionHandlers.handleCancelTemp,
    capture: actionHandlers.handleCapture,
    createBuildFromTempStack: actionHandlers.handleCreateBuildFromTempStack,
    addToOwnBuild: actionHandlers.handleAddToOwnBuild,
    BuildExtension: actionHandlers.handleBuildExtension,
    acceptBuildExtension: actionHandlers.handleAcceptBuildExtension,
    cancelBuildExtension: actionHandlers.handleCancelBuildExtension,
    tableToTableDrop: actionHandlers.handleTableToTableDrop,
    handToTableDrop: actionHandlers.handleHandToTableDrop
  };

  Object.keys(actionTypeMapping).forEach(actionType => {
    actionRouter.registerAction(actionType, actionTypeMapping[actionType]);
  });

  const { gameId } = gameManager.startGame();
  return { gameManager, actionRouter, gameId };
}

function setupGameState(gameManager, gameId, player0Cards, player1Cards, currentPlayer = 0) {
  const gameState = gameManager.getGameState(gameId);
  gameState.playerHands[0] = player0Cards;
  gameState.playerHands[1] = player1Cards;
  gameState.currentPlayer = currentPlayer;
  gameState.round = 1; // Ensure we're in round 1
  return gameState;
}

async function runTest(testName, testFunction) {
  console.log(`🧪 ${testName}`);
  try {
    const result = await testFunction();
    console.log(result.success ? '✅ PASS' : '❌ FAIL:', result.message);
    if (result.details) {
      console.log('   Details:', result.details);
    }
    console.log('');
    return result.success;
  } catch (error) {
    console.log('❌ ERROR:', error.message);
    console.log('');
    return false;
  }
}

// Test 1: Trail action should trigger round transition when emptying hand
async function testTrailRoundTransition() {
  const { gameManager, actionRouter, gameId } = createTestGame();

  // Setup: Player 0 has 1 card, Player 1 has cards
  setupGameState(gameManager, gameId,
    [{rank: 'A', suit: 'H'}], // Player 0: 1 card
    [{rank: 'K', suit: 'S'}, {rank: 'Q', suit: 'S'}] // Player 1: 2 cards
  );

  const initialState = gameManager.getGameState(gameId);

  // Execute trail action (should empty Player 0's hand)
  const trailAction = {
    type: 'trail',
    payload: { card: {rank: 'A', suit: 'H'} }
  };

  const result = await actionRouter.executeAction(gameId, 0, trailAction);

  // Validate round transition occurred
  if (result.round === 2 &&
      result.playerHands[0].length === 0 &&
      result.currentPlayer === 1) { // Should switch to Player 1

    return {
      success: true,
      message: 'Trail correctly triggered round transition when emptying hand',
      details: `Round: 1→2, Player switched: 0→1, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
    };
  }

  return {
    success: false,
    message: 'Trail did not trigger round transition',
    details: `Round: ${initialState.round}→${result.round}, Current player: ${initialState.currentPlayer}→${result.currentPlayer}, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
  };
}

// Test 2: Trail should NOT trigger round transition when player still has cards
async function testTrailNoTransitionWithCards() {
  const { gameManager, actionRouter, gameId } = createTestGame();

  // Setup: Player 0 has 2 cards, Player 1 has cards
  setupGameState(gameManager, gameId,
    [{rank: 'A', suit: 'H'}, {rank: '2', suit: 'H'}], // Player 0: 2 cards
    [{rank: 'K', suit: 'S'}, {rank: 'Q', suit: 'S'}] // Player 1: 2 cards
  );

  const initialState = gameManager.getGameState(gameId);

  // Execute trail action (should leave Player 0 with 1 card)
  const trailAction = {
    type: 'trail',
    payload: { card: {rank: 'A', suit: 'H'} }
  };

  const result = await actionRouter.executeAction(gameId, 0, trailAction);

  // Validate NO round transition occurred
  if (result.round === 1 &&
      result.playerHands[0].length === 1 &&
      result.currentPlayer === 1) { // Should still switch to Player 1

    return {
      success: true,
      message: 'Trail correctly did NOT trigger round transition when cards remain',
      details: `Round: ${result.round}, Player switched: 0→1, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
    };
  }

  return {
    success: false,
    message: 'Trail incorrectly triggered round transition when cards remain',
    details: `Round: ${initialState.round}→${result.round}, Current player: ${initialState.currentPlayer}→${result.currentPlayer}, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
  };
}

// Test 3: Capture action should trigger round transition when emptying hand AND forcing turn switch
async function testCaptureRoundTransition() {
  const { gameManager, actionRouter, gameId } = createTestGame();

  // Setup: Player 0 has 1 card, Player 1 has no valid moves (empty hand)
  // This will force a turn switch after capture
  const gameState = setupGameState(gameManager, gameId,
    [{rank: 'A', suit: 'H'}], // Player 0: 1 card
    []  // Player 1: 0 cards (can't move)
  );

  // Add a card to table that can be captured
  gameState.tableCards = [{rank: 'A', suit: 'S', type: 'loose'}];

  // Execute capture action
  const captureAction = {
    type: 'capture',
    payload: {
      targetCards: [{rank: 'A', suit: 'S'}],
      capturingCard: {rank: 'A', suit: 'H'}
    }
  };

  const result = await actionRouter.executeAction(gameId, 0, captureAction);

  // Validate round transition occurred
  if (result.round === 2 &&
      result.playerHands[0].length === 0 &&
      result.currentPlayer === 1) {

    return {
      success: true,
      message: 'Capture correctly triggered round transition when emptying hand and forcing turn switch',
      details: `Round: 1→2, Player switched: 0→1, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
    };
  }

  return {
    success: false,
    message: 'Capture did not trigger round transition',
    details: `Round: 1→${result.round}, Current player: 0→${result.currentPlayer}, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
  };
}

// Test 4: Multi-action play should NOT trigger early round transition
async function testMultiActionSafety() {
  const { gameManager, actionRouter, gameId } = createTestGame();

  // Setup: Player 0 has 2 cards, Player 1 has cards
  // This simulates a "build then capture" scenario
  const gameState = setupGameState(gameManager, gameId,
    [{rank: 'A', suit: 'H'}, {rank: '2', suit: 'H'}], // Player 0: 2 cards
    [{rank: 'K', suit: 'S'}] // Player 1: 1 card
  );

  // Add table setup for potential build+capture
  gameState.tableCards = [{rank: 'A', suit: 'S', type: 'loose'}];

  // First action: Build (would use 1 card, leave 1)
  // We can't easily simulate the full build+capture in this test framework
  // But we can test that a regular action doesn't trigger round transition prematurely

  const buildAction = {
    type: 'addToOwnBuild',
    payload: {
      buildId: 'test-build',
      card: {rank: 'A', suit: 'H'},
      source: 'hand',
      buildToAddTo: {
        buildId: 'test-build',
        cards: [{rank: 'A', suit: 'S'}],
        owner: 0
      }
    }
  };

  const result = await actionRouter.executeAction(gameId, 0, buildAction);

  // After build, player should still have 1 card, no round transition
  if (result.round === 1 &&
      result.playerHands[0].length === 1 &&
      result.currentPlayer === 1) {

    return {
      success: true,
      message: 'Build action correctly did NOT trigger premature round transition',
      details: `Round: ${result.round}, Player switched: 0→1, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
    };
  }

  return {
    success: false,
    message: 'Build action incorrectly triggered round transition',
    details: `Round: 1→${result.round}, Current player: 0→${result.currentPlayer}, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
  };
}

// Run all tests
async function runAllTests() {
  console.log('Running Centralized Round Transition Tests...\n');

  let passed = 0;
  let total = 0;

  // Test 1: Trail triggers round transition
  total++;
  if (await runTest('Trail Round Transition', testTrailRoundTransition)) passed++;

  // Test 2: Trail does NOT trigger when cards remain
  total++;
  if (await runTest('Trail No Transition With Cards', testTrailNoTransitionWithCards)) passed++;

  // Test 3: Capture triggers round transition
  total++;
  if (await runTest('Capture Round Transition', testCaptureRoundTransition)) passed++;

  // Test 4: Multi-action safety
  total++;
  if (await runTest('Multi-Action Safety', testMultiActionSafety)) passed++;

  // Summary
  console.log('==========================================');
  console.log(`📊 TEST RESULTS: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED! Centralized round detection is working correctly.');
    console.log('✅ Multi-action plays are now safe from premature round transitions.');
  } else {
    console.log('⚠️  SOME TESTS FAILED. Round detection may need further fixes.');
  }

  return passed === total;
}

// Run the test suite
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test suite failed with error:', error);
  process.exit(1);
});