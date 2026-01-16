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

// Test 1: Trail action should NOT trigger round transition when only one player empties hand
async function testTrailNoEarlyRoundTransition() {
  const { gameManager, actionRouter, gameId } = createTestGame();

  // Setup: Player 0 has 1 card, Player 1 has cards
  setupGameState(gameManager, gameId,
    [{rank: 'A', suit: 'H'}], // Player 0: 1 card
    [{rank: 'K', suit: 'S'}, {rank: 'Q', suit: 'S'}] // Player 1: 2 cards
  );

  const initialState = gameManager.getGameState(gameId);

  // Execute trail action (should empty Player 0's hand but NOT trigger round transition)
  const trailAction = {
    type: 'trail',
    payload: { card: {rank: 'A', suit: 'H'} }
  };

  const result = await actionRouter.executeAction(gameId, 0, trailAction);

  // Validate NO round transition occurred (both players need empty hands)
  if (result.round === 1 &&
      result.playerHands[0].length === 0 &&
      result.playerHands[1].length === 2 &&
      result.currentPlayer === 1) { // Should switch to Player 1

    return {
      success: true,
      message: 'Trail correctly did NOT trigger round transition when only one player empties hand',
      details: `Round: ${result.round}, Player switched: 0→1, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
    };
  }

  return {
    success: false,
    message: 'Trail incorrectly triggered round transition when opponent still has cards',
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

// Test 3: Round transition triggers when BOTH players empty hands (not just one)
async function testBothPlayersEmptyRoundTransition() {
  const { gameManager, actionRouter, gameId } = createTestGame();

  // Setup: Player 0 has 1 card, Player 1 has 0 cards (both will be empty after Player 0's action)
  setupGameState(gameManager, gameId,
    [{rank: 'A', suit: 'H'}], // Player 0: 1 card
    []  // Player 1: 0 cards (already empty)
  );

  // Add a card to table that can be captured
  const gameState = gameManager.getGameState(gameId);
  gameState.tableCards = [{rank: 'A', suit: 'S', type: 'loose'}];

  // Execute capture action (will empty Player 0's hand, making both players empty)
  const captureAction = {
    type: 'capture',
    payload: {
      targetCards: [{rank: 'A', suit: 'S'}],
      capturingCard: {rank: 'A', suit: 'H'}
    }
  };

  const result = await actionRouter.executeAction(gameId, 0, captureAction);

  // Validate round transition occurred because BOTH players now have empty hands
  if (result.round === 2 &&
      result.playerHands[0].length === 10 &&
      result.playerHands[1].length === 10) {

    return {
      success: true,
      message: 'Round transition correctly triggered when BOTH players have empty hands',
      details: `Round: 1→2, New hands dealt: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
    };
  }

  return {
    success: false,
    message: 'Round transition did not trigger when both players emptied hands',
    details: `Round: 1→${result.round}, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
  };
}

// Test 4: Round 2 ends when any player empties their hand
async function testRound2GameOver() {
  const { gameManager, actionRouter, gameId } = createTestGame();

  // Setup: Round 2, Player 0 has 1 card, Player 1 has 0 cards
  setupGameState(gameManager, gameId,
    [{rank: 'A', suit: 'H'}], // Player 0: 1 card
    []  // Player 1: 0 cards
  );

  const gameState = gameManager.getGameState(gameId);
  gameState.round = 2; // Force round 2

  // Add a card to table that can be captured
  gameState.tableCards = [{rank: 'A', suit: 'S', type: 'loose'}];

  // Execute capture action (will empty Player 0's hand, ending round 2)
  const captureAction = {
    type: 'capture',
    payload: {
      targetCards: [{rank: 'A', suit: 'S'}],
      capturingCard: {rank: 'A', suit: 'H'}
    }
  };

  const result = await actionRouter.executeAction(gameId, 0, captureAction);

  // Validate game over occurred because player emptied hand in round 2
  if (result.gameOver &&
      result.playerHands[0].length === 0 &&
      result.playerHands[1].length === 0) {

    return {
      success: true,
      message: 'Round 2 correctly ended when player emptied hand',
      details: `Game over: ${result.gameOver}, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
    };
  }

  return {
    success: false,
    message: 'Round 2 did not end when player emptied hand',
    details: `Game over: ${result.gameOver}, Hands: [${result.playerHands[0].length}, ${result.playerHands[1].length}]`
  };
}

// Run all tests
async function runAllTests() {
  console.log('Running Centralized Round Transition Tests...\n');

  let passed = 0;
  let total = 0;

  // Test 1: Trail does NOT trigger early round transition
  total++;
  if (await runTest('Trail No Early Round Transition', testTrailNoEarlyRoundTransition)) passed++;

  // Test 2: Trail does NOT trigger when cards remain
  total++;
  if (await runTest('Trail No Transition With Cards', testTrailNoTransitionWithCards)) passed++;

  // Test 3: Round transition triggers when both players empty hands
  total++;
  if (await runTest('Both Players Empty Round Transition', testBothPlayersEmptyRoundTransition)) passed++;

  // Test 4: Round 2 game over
  total++;
  if (await runTest('Round 2 Game Over', testRound2GameOver)) passed++;

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
});// Run the test suite
