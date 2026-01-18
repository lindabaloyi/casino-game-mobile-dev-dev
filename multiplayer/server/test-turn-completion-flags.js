/**
 * Test Suite: Turn Completion Flags
 * Tests the new turn completion tracking system
 */

const GameManager = require("./game/GameManager");
const ActionRouter = require("./game/ActionRouter");
const actionHandlers = require("./game/actions");

console.log("🎯 TURN COMPLETION FLAGS TEST SUITE");
console.log("====================================\n");

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
    handToTableDrop: actionHandlers.handleHandToTableDrop,
  };

  Object.keys(actionTypeMapping).forEach((actionType) => {
    actionRouter.registerAction(actionType, actionTypeMapping[actionType]);
  });

  const { gameId } = gameManager.startGame();
  return { gameManager, actionRouter, gameId };
}

function setupGameState(
  gameManager,
  gameId,
  player0Cards,
  player1Cards,
  currentPlayer = 0,
) {
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
    console.log(result.success ? "✅ PASS" : "❌ FAIL:", result.message);
    if (result.details) {
      console.log("   Details:", result.details);
    }
    console.log("");
    return result.success;
  } catch (error) {
    console.log("❌ ERROR:", error.message);
    console.log("");
    return false;
  }
}

// Test 1: Turn completion flags are initialized
async function testTurnCompletionFlagsInitialized() {
  const { gameManager, gameId } = createTestGame();
  const gameState = gameManager.getGameState(gameId);

  if (
    gameState.turnCompletionFlags &&
    Array.isArray(gameState.turnCompletionFlags) &&
    gameState.turnCompletionFlags.length === 0
  ) {
    return {
      success: true,
      message: "Turn completion flags are properly initialized as empty array",
      details: `turnCompletionFlags: ${JSON.stringify(gameState.turnCompletionFlags)}`,
    };
  }

  return {
    success: false,
    message: "Turn completion flags not properly initialized",
    details: `turnCompletionFlags: ${JSON.stringify(gameState.turnCompletionFlags)}`,
  };
}

// Test 2: Trail action creates completed turn flag
async function testTrailCreatesCompletedTurnFlag() {
  const { gameManager, actionRouter, gameId } = createTestGame();

  // Setup: Player 0 has 1 card, Player 1 has cards
  setupGameState(
    gameManager,
    gameId,
    [{ rank: "A", suit: "H" }], // Player 0: 1 card
    [
      { rank: "K", suit: "S" },
      { rank: "Q", suit: "S" },
    ], // Player 1: 2 cards
  );

  const initialState = gameManager.getGameState(gameId);

  // Execute trail action (should complete Player 0's turn)
  const trailAction = {
    type: "trail",
    payload: { card: { rank: "A", suit: "H" } },
  };

  const result = await actionRouter.executeAction(gameId, 0, trailAction);

  // Check turn completion flags
  const expectedFlags = [true]; // Turn 1 should be completed (forced turn switch)
  const actualFlags = result.turnCompletionFlags;

  if (
    JSON.stringify(actualFlags) === JSON.stringify(expectedFlags) &&
    result.currentPlayer === 1 && // Switched to player 1
    result.turnCounter === 2
  ) {
    // Turn counter incremented

    return {
      success: true,
      message: "Trail action correctly set turn 1 as completed",
      details: `turnCompletionFlags: ${JSON.stringify(actualFlags)}, turnCounter: ${result.turnCounter}, currentPlayer: ${result.currentPlayer}`,
    };
  }

  return {
    success: false,
    message: "Trail action did not set correct turn completion flag",
    details: `Expected: ${JSON.stringify(expectedFlags)}, Actual: ${JSON.stringify(actualFlags)}, turnCounter: ${result.turnCounter}, currentPlayer: ${result.currentPlayer}`,
  };
}

// Test 3: Multiple turns accumulate completion flags correctly
async function testMultipleTurnsCompletionFlags() {
  const { gameManager, actionRouter, gameId } = createTestGame();

  // Setup: Both players have cards
  setupGameState(
    gameManager,
    gameId,
    [{ rank: "A", suit: "H" }], // Player 0: 1 card
    [{ rank: "K", suit: "S" }], // Player 1: 1 card
  );

  // First turn: Player 0 trails (completed turn)
  const trailAction = {
    type: "trail",
    payload: { card: { rank: "A", suit: "H" } },
  };

  const result1 = await actionRouter.executeAction(gameId, 0, trailAction);

  // Check after first turn
  let expectedFlags = [true]; // Turn 1 completed
  let actualFlags = result1.turnCompletionFlags;

  if (JSON.stringify(actualFlags) !== JSON.stringify(expectedFlags)) {
    return {
      success: false,
      message: "First turn completion flag incorrect",
      details: `Expected: ${JSON.stringify(expectedFlags)}, Actual: ${JSON.stringify(actualFlags)}`,
    };
  }

  // Second turn: Player 1 trails (completed turn)
  const trailAction2 = {
    type: "trail",
    payload: { card: { rank: "K", suit: "S" } },
  };

  const result2 = await actionRouter.executeAction(gameId, 1, trailAction2);

  // Check after second turn
  expectedFlags = [true, true]; // Both turns completed
  actualFlags = result2.turnCompletionFlags;

  if (
    JSON.stringify(actualFlags) === JSON.stringify(expectedFlags) &&
    result2.currentPlayer === 0 && // Back to player 0
    result2.turnCounter === 3 // Turn counter incremented
  ) {
    return {
      success: true,
      message: "Multiple turns correctly accumulate completion flags",
      details: `turnCompletionFlags: ${JSON.stringify(actualFlags)}, turnCounter: ${result2.turnCounter}, currentPlayer: ${result2.currentPlayer}`,
    };
  }

  return {
    success: false,
    message: "Multiple turns did not accumulate completion flags correctly",
    details: `Expected: ${JSON.stringify(expectedFlags)}, Actual: ${JSON.stringify(actualFlags)}, turnCounter: ${result2.turnCounter}, currentPlayer: ${result2.currentPlayer}`,
  };
}

// Run all tests
async function runAllTests() {
  console.log("Running Turn Completion Flags Tests...\n");

  let passed = 0;
  let total = 0;

  // Test 1: Turn completion flags initialization
  total++;
  if (
    await runTest(
      "Turn Completion Flags Initialized",
      testTurnCompletionFlagsInitialized,
    )
  )
    passed++;

  // Test 2: Trail creates completed turn
  total++;
  if (
    await runTest(
      "Trail Creates Completed Turn Flag",
      testTrailCreatesCompletedTurnFlag,
    )
  )
    passed++;

  // Test 3: Multiple turns accumulate completion flags
  total++;
  if (
    await runTest(
      "Multiple Turns Completion Flags",
      testMultipleTurnsCompletionFlags,
    )
  )
    passed++;

  // Summary
  console.log("====================================");
  console.log(`📊 TEST RESULTS: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log(
      "🎉 ALL TESTS PASSED! Turn completion flags are working correctly.",
    );
    console.log("✅ Turn completion tracking system is functional.");
  } else {
    console.log("⚠️  SOME TESTS FAILED. Turn completion flags may need fixes.");
  }

  return passed === total;
}

// Run the test suite
runAllTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test suite failed with error:", error);
    process.exit(1);
  });
