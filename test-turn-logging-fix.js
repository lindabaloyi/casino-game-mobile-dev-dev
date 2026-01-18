/**
 * Test Turn Logging Fix
 * Tests that turn logging only happens when turns actually change
 */

// Mock console methods to capture output
const originalConsoleLog = console.log;
let capturedLogs = [];

console.log = function (...args) {
  capturedLogs.push(args.join(" "));
  originalConsoleLog.apply(console, args);
};

// Mock the turn logging logic (shared variables)
let lastTurnCounter = 0;
let lastTurnCompleted = null;
let loggedTurnCompletions = new Set(); // Track which turn completions we've already logged

function simulateGameStart(gameState) {
  // Initialize turn tracking for game start
  lastTurnCounter = gameState.turnCounter;
  lastTurnCompleted = false;

  // Log initial turn 1 start when game begins
  console.log(
    `🎯 TURN COUNTER: ${gameState.turnCounter} - Current Player: P${gameState.currentPlayer + 1} (${gameState.currentPlayer})`,
  );
  console.log(`TurnCompletion : False - shows start of turn`);
}

function simulateGameUpdate(gameStateUpdate) {
  // Log turn counter and completion status
  const turnCompletionFlags = gameStateUpdate.turnCompletionFlags || [];
  const currentTurnIndex = gameStateUpdate.turnCounter - 1;
  const currentTurnCompleted = turnCompletionFlags[currentTurnIndex];

  // Check if turn counter changed (new turn started)
  if (gameStateUpdate.turnCounter !== lastTurnCounter) {
    // First, check if the previous turn was completed and not already logged
    const previousTurnIndex = lastTurnCounter - 1;
    const previousTurnCompleted = turnCompletionFlags[previousTurnIndex];

    if (
      previousTurnCompleted === true &&
      !loggedTurnCompletions.has(lastTurnCounter)
    ) {
      console.log(
        `🎯 TURN COUNTER: ${lastTurnCounter} - Current Player: P${gameStateUpdate.currentPlayer + 1} (${gameStateUpdate.currentPlayer})`,
      );
      console.log(`TurnCompletion : True - shows end of turn`);
      loggedTurnCompletions.add(lastTurnCounter);
    }

    // Then log the new turn start
    console.log(
      `🎯 TURN COUNTER: ${gameStateUpdate.turnCounter} - Current Player: P${gameStateUpdate.currentPlayer + 1} (${gameStateUpdate.currentPlayer})`,
    );
    console.log(`TurnCompletion : False - shows start of turn`);
    lastTurnCounter = gameStateUpdate.turnCounter;
    lastTurnCompleted = false;
  }
  // Check if turn completion status changed within the same turn
  else if (
    currentTurnCompleted !== lastTurnCompleted &&
    currentTurnCompleted === true
  ) {
    console.log(
      `🎯 TURN COUNTER: ${gameStateUpdate.turnCounter} - Current Player: P${gameStateUpdate.currentPlayer + 1} (${gameStateUpdate.currentPlayer})`,
    );
    console.log(`TurnCompletion : True - shows end of turn`);
    lastTurnCompleted = currentTurnCompleted;
  }
}

function runTurnLoggingFixTest() {
  console.log("🧪 TURN LOGGING FIX TEST");
  console.log("=========================\n");

  capturedLogs = []; // Reset captured logs

  // Test 1: Game starts - should log turn 1 start
  console.log("Test 1: Game starts");
  simulateGameStart({
    turnCounter: 1,
    currentPlayer: 0,
  });

  // Test 2: Same turn update (no turn change) - should NOT log
  console.log("\nTest 2: Same turn update (no change)");
  simulateGameUpdate({
    turnCounter: 1,
    currentPlayer: 0,
    turnCompletionFlags: [],
  });

  // Test 3: Turn 1 completes - should log turn 1 end
  console.log("\nTest 3: Turn 1 completes");
  simulateGameUpdate({
    turnCounter: 1,
    currentPlayer: 0,
    turnCompletionFlags: [true],
  });

  // Test 4: Turn 2 starts - should log turn 2 start
  console.log("\nTest 4: Turn 2 starts");
  simulateGameUpdate({
    turnCounter: 2,
    currentPlayer: 1,
    turnCompletionFlags: [true],
  });

  console.log("\n📋 CAPTURED LOG OUTPUT:");
  console.log("========================");

  const turnLogs = capturedLogs.filter(
    (log) => log.includes("TURN COUNTER") || log.includes("TurnCompletion"),
  );

  turnLogs.forEach((log, i) => {
    console.log(`${i + 1}: ${log}`);
  });

  // Verify expected behavior
  const expectedCount = 4; // Turn 1 start, turn 1 end, turn 2 start
  const hasTurn1Start = turnLogs.some(
    (log) =>
      log.includes("TURN COUNTER: 1") && log.includes("TurnCompletion : False"),
  );
  const hasTurn1End = turnLogs.some(
    (log) =>
      log.includes("TURN COUNTER: 1") && log.includes("TurnCompletion : True"),
  );
  const hasTurn2Start = turnLogs.some(
    (log) =>
      log.includes("TURN COUNTER: 2") && log.includes("TurnCompletion : False"),
  );
  const noDuplicates = turnLogs.length === expectedCount;

  console.log(`\n📊 VERIFICATION:`);
  console.log(`Turn 1 start logged: ${hasTurn1Start}`);
  console.log(`Turn 1 end logged: ${hasTurn1End}`);
  console.log(`Turn 2 start logged: ${hasTurn2Start}`);
  console.log(`No duplicates: ${noDuplicates}`);
  console.log(`Total logs: ${turnLogs.length} (expected: ${expectedCount})`);

  const testPassed =
    hasTurn1Start && hasTurn1End && hasTurn2Start && noDuplicates;

  console.log(`\n📊 TEST RESULTS: ${testPassed ? 1 : 0}/1 pattern matched`);

  if (testPassed) {
    console.log(
      "✅ ALL TESTS PASSED! Turn logging now only happens when turns actually change.",
    );
  } else {
    console.log("❌ TESTS FAILED. Turn logging duplication still exists.");
  }

  return testPassed;
}

// Run the test
runTurnLoggingFixTest();
