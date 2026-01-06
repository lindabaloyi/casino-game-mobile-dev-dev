/**
 * Test Suite for Opponent Card Interactions
 * Tests all opponent captured card drag-and-drop functionality
 */

// Mock game manager for testing
class MockGameManager {
  constructor() {
    this.games = new Map();
  }

  getGameState(gameId) {
    return this.games.get(gameId);
  }

  setGameState(gameId, state) {
    this.games.set(gameId, state);
  }

  createTestGame(gameId) {
    // Create a test game state with opponent captures and table cards
    const gameState = {
      deck: [],
      playerHands: [
        [{ rank: '5', suit: 'H', value: 5 }, { rank: '7', suit: 'D', value: 7 }],
        [{ rank: '3', suit: 'C', value: 3 }, { rank: '9', suit: 'S', value: 9 }]
      ],
      tableCards: [
        { rank: 'A', suit: 'H', value: 1 }, // Loose card
        { rank: '4', suit: 'D', value: 4 }, // Loose card
        {
          type: 'temporary_stack',
          stackId: 'temp-0',
          owner: 0,
          cards: [
            { rank: '2', suit: 'H', value: 2, source: 'hand' },
            { rank: '6', suit: 'C', value: 6, source: 'table' }
          ],
          value: 8,
          cardPositions: []
        },
        {
          type: 'build',
          buildId: 'build-0',
          owner: 0,
          cards: [
            { rank: 'J', suit: 'H', value: 11 },
            { rank: 'J', suit: 'D', value: 11 }
          ],
          value: 11,
          isExtendable: true
        }
      ],
      playerCaptures: [
        [], // Player 0 has no captures
        [
          { rank: 'K', suit: 'S', value: 13 },
          { rank: 'Q', suit: 'H', value: 12 },
          { rank: '8', suit: 'C', value: 8 }  // Top card (last in array)
        ]
      ],
      currentPlayer: 0,
      round: 1,
      scores: [0, 0],
      gameOver: false,
      winner: null
    };

    this.games.set(gameId, gameState);
    return gameState;
  }
}

// Import action handlers
const handleCreateTemp = require('./multiplayer/server/game/actions/temp/createTemp');
const handleAddToOwnTemp = require('./multiplayer/server/game/actions/temp/addToOwnTemp');
const handleAddToOwnBuild = require('./multiplayer/server/game/actions/build/addToOwnBuild');

class OpponentCardTestSuite {
  constructor() {
    this.gameManager = new MockGameManager();
    this.testGameId = 'test-opponent-cards';
    this.passed = 0;
    this.failed = 0;
  }

  log(message, ...args) {
    console.log(`[TEST] ${message}`, ...args);
  }

  assert(condition, message, testName) {
    if (condition) {
      this.log(`✅ PASS: ${testName}`);
      this.passed++;
    } else {
      this.log(`❌ FAIL: ${testName} - ${message}`);
      this.failed++;
    }
  }

  async runTest(testName, testFunction) {
    this.log(`\n🧪 Running: ${testName}`);
    try {
      await testFunction();
    } catch (error) {
      this.log(`💥 ERROR in ${testName}:`, error.message);
      this.failed++;
    }
  }

  // Test 1: Opponent top card creates temp stack with loose card
  async testOpponentCardCreatesTempStack() {
    await this.runTest('Opponent Top Card Creates Temp Stack', async () => {
      // Reset game state
      this.gameManager.createTestGame(this.testGameId);

      // Action: Opponent top card (8♣) + loose card (A♥) → create temp stack
      const action = {
        type: 'createTemp',
        payload: {
          source: 'oppTopCard',
          card: { rank: '8', suit: 'C', value: 8 }, // Opponent's top card
          targetIndex: 0, // A♥ at index 0
          opponentId: 1,  // Opponent player 1
          isTableToTable: false,
          canAugmentBuilds: true
        }
      };

      const newGameState = handleCreateTemp(this.gameManager, 0, action, this.testGameId);

      // Assertions
      const tempStack = newGameState.tableCards.find(card =>
        card.type === 'temporary_stack' && card.owner === 0
      );

      this.assert(tempStack !== undefined, 'Temp stack should be created', 'Temp Stack Creation');
      this.assert(tempStack.cards.length === 2, 'Temp stack should have 2 cards', 'Temp Stack Card Count');
      this.assert(tempStack.value === 9, 'Temp stack value should be 1 + 8 = 9', 'Temp Stack Value');

      // Check opponent captures removed top card
      this.assert(newGameState.playerCaptures[1].length === 2, 'Opponent should have 2 cards left', 'Opponent Captures Removal');
      this.assert(newGameState.playerCaptures[1][1].rank === 'Q', 'Top card should now be Q♥', 'Opponent Top Card Removal');

      // Check loose card removed from table
      const looseCards = newGameState.tableCards.filter(card => !card.type);
      this.assert(looseCards.length === 1, 'Should have 1 loose card left', 'Loose Card Removal');
      this.assert(looseCards[0].rank === '4', 'Remaining loose card should be 4♦', 'Loose Card Identity');
    });
  }

  // Test 2: Opponent top card adds to existing temp stack
  async testOpponentCardAddsToTempStack() {
    await this.runTest('Opponent Top Card Adds to Temp Stack', async () => {
      // Reset game state
      this.gameManager.createTestGame(this.testGameId);

      // Action: Opponent top card (8♣) → add to existing temp stack (temp-0)
      const action = {
        type: 'addToOwnTemp',
        payload: {
          stackId: 'temp-0',
          card: { rank: '8', suit: 'C', value: 8 }, // Opponent's top card
          source: 'oppTopCard',
          opponentId: 1
        }
      };

      const newGameState = handleAddToOwnTemp(this.gameManager, 0, action, this.testGameId);

      // Assertions
      const tempStack = newGameState.tableCards.find(card =>
        card.type === 'temporary_stack' && card.stackId === 'temp-0'
      );

      this.assert(tempStack !== undefined, 'Temp stack should exist', 'Temp Stack Exists');
      this.assert(tempStack.cards.length === 3, 'Temp stack should have 3 cards now', 'Temp Stack Card Count');
      this.assert(tempStack.value === 16, 'Temp stack value should be 8 + 8 = 16', 'Temp Stack Value');

      // Check opponent captures removed top card
      this.assert(newGameState.playerCaptures[1].length === 2, 'Opponent should have 2 cards left', 'Opponent Captures Removal');
    });
  }

  // Test 3: Opponent top card adds to build
  async testOpponentCardAddsToBuild() {
    await this.runTest('Opponent Top Card Adds to Build', async () => {
      // Reset game state
      this.gameManager.createTestGame(this.testGameId);

      // Action: Opponent top card (8♣) → add to build (build-0)
      const action = {
        type: 'addToOwnBuild',
        payload: {
          buildId: 'build-0',
          card: { rank: '8', suit: 'C', value: 8 }, // Opponent's top card
          source: 'oppTopCard',
          opponentId: 1
        }
      };

      const newGameState = handleAddToOwnBuild(this.gameManager, 0, action, this.testGameId);

      // Assertions
      const build = newGameState.tableCards.find(card =>
        card.type === 'build' && card.buildId === 'build-0'
      );

      this.assert(build !== undefined, 'Build should exist', 'Build Exists');
      this.assert(build.cards.length === 3, 'Build should have 3 cards now', 'Build Card Count');

      // Check opponent captures removed top card
      this.assert(newGameState.playerCaptures[1].length === 2, 'Opponent should have 2 cards left', 'Opponent Captures Removal');
    });
  }



  // Test 4: Error cases
  async testErrorCases() {
    await this.runTest('Error Cases', async () => {
      // Reset game state
      this.gameManager.createTestGame(this.testGameId);

      // Test 1: Wrong opponent ID
      try {
        const action = {
          type: 'createTemp',
          payload: {
            source: 'oppTopCard',
            card: { rank: '8', suit: 'C', value: 8 },
            targetIndex: 0,
            opponentId: 999, // Invalid opponent ID
            isTableToTable: false,
            canAugmentBuilds: true
          }
        };
        handleCreateTemp(this.gameManager, 0, action, this.testGameId);
        this.assert(false, 'Should throw error for invalid opponent ID', 'Invalid Opponent ID');
      } catch (error) {
        this.assert(error.message.includes('has no captured cards'), 'Should detect invalid opponent', 'Invalid Opponent ID');
      }

      // Test 2: Wrong card (not top card)
      try {
        const action = {
          type: 'createTemp',
          payload: {
            source: 'oppTopCard',
            card: { rank: 'K', suit: 'S', value: 13 }, // Not the top card
            targetIndex: 0,
            opponentId: 1,
            isTableToTable: false,
            canAugmentBuilds: true
          }
        };
        handleCreateTemp(this.gameManager, 0, action, this.testGameId);
        this.assert(false, 'Should throw error for wrong card', 'Wrong Card');
      } catch (error) {
        this.assert(error.message.includes('not opponent'), 'Should detect wrong card', 'Wrong Card');
      }
    });
  }

  // Run all tests
  async runAllTests() {
    console.log('\n🎯 Opponent Card Interaction Test Suite');
    console.log('=' .repeat(50));

    await this.testOpponentCardCreatesTempStack();
    await this.testOpponentCardAddsToTempStack();
    await this.testOpponentCardAddsToBuild();
    await this.testErrorCases();

    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${this.passed} passed, ${this.failed} failed`);

    if (this.failed === 0) {
      console.log('🎉 All tests passed! Opponent card interactions working correctly.');
    } else {
      console.log('❌ Some tests failed. Check the implementation.');
    }

    return this.failed === 0;
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new OpponentCardTestSuite();
  testSuite.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = OpponentCardTestSuite;
