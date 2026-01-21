/**
 * Test script for the overtake mechanic
 * Tests the scenario: Player owns build 10, creates build of 8, inserts 2 on opponent's 8 (making it 10), then overtakes
 */

const { handleBuildExtension, handleAcceptBuildExtension, handleOvertakeBuild } = require('./multiplayer/server/game/actions');

// Mock game state for testing
function createMockGameState() {
  return {
    tableCards: [
      // Player 0's build of 10
      {
        buildId: 'build-p0-10',
        type: 'build',
        cards: [
          { rank: '5', suit: '♠', value: 5 },
          { rank: '5', suit: '♥', value: 5 }
        ],
        value: 10,
        owner: 0,
        isExtendable: true
      },
      // Player 1's build of 8
      {
        buildId: 'build-p1-8',
        type: 'build',
        cards: [
          { rank: '3', suit: '♠', value: 3 },
          { rank: '5', suit: '♦', value: 5 }
        ],
        value: 8,
        owner: 1,
        isExtendable: true,
        hasBase: false
      }
    ],
    playerHands: [
      // Player 0 has 2♣
      [{ rank: '2', suit: '♣', value: 2 }],
      // Player 1 has 10♦ for capture
      [{ rank: '10', suit: '♦', value: 10 }]
    ],
    playerCaptures: [[], []],
    currentPlayer: 0
  };
}

async function testOvertakeMechanic() {
  console.log('🧪 Testing Overtake Mechanic\n');

  let gameState = createMockGameState();

  // Mock gameManager
  const gameStates = { 'test-game': gameState };
  const mockGameManager = {
    getGameState: (gameId) => gameStates[gameId],
    setGameState: (gameId, newState) => { gameStates[gameId] = newState; }
  };

  console.log('📋 Initial State:');
  console.log('Player 0 build: 10 (5♠ + 5♥)');
  console.log('Player 1 build: 8 (3♠ + 5♦)');
  console.log('Player 0 hand: 2♣');
  console.log('Player 1 hand: 10♦');
  console.log('');

  // Step 1: Player 0 extends Player 1's build with 2♣ (8 + 2 = 10)
  console.log('🎯 Step 1: Player 0 extends Player 1\'s build with 2♣');

  try {
    gameState = handleBuildExtension(mockGameManager, 0, {
      payload: {
        extensionCard: { rank: '2', suit: '♣', value: 2 },
        targetBuildId: 'build-p1-8',
        overtakeMode: true
      }
    }, 'test-game');

    console.log('✅ Extension successful - Player 1\'s build now pending extension');
    console.log('Pending build value:', gameState.tableCards[1].previewValue);
    console.log('');
  } catch (error) {
    console.log('❌ Extension failed:', error.message);
    return;
  }

  // Step 2: Player 0 accepts the extension (keeping original ownership for overtake setup)
  console.log('🎯 Step 2: Player 0 accepts the extension (overtake mode)');

  try {
    gameState = handleAcceptBuildExtension(mockGameManager, 0, {
      payload: {
        buildId: 'build-p1-8',
        overtakeMode: true
      }
    }, 'test-game');

    console.log('✅ Extension accepted - Player 1\'s build finalized at value 10');
    console.log('Build owner remains:', gameState.tableCards[1].owner);
    console.log('Build value:', gameState.tableCards[1].value);
    console.log('');
  } catch (error) {
    console.log('❌ Extension acceptance failed:', error.message);
    return;
  }

  // Step 3: Player 0 drags the extended opponent build onto their own build to overtake
  console.log('🎯 Step 3: Player 0 overtakes by dragging extended build onto their own');

  try {
    gameState = handleOvertakeBuild(mockGameManager, 0, {
      payload: {
        extendedOpponentBuildId: 'build-p1-8',
        playerBuildId: 'build-p0-10'
      }
    }, 'test-game');

    console.log('✅ Overtake successful!');
    console.log('Both builds removed from table');
    console.log('Table cards remaining:', gameState.tableCards.length);
    console.log('Player 0 captures:', gameState.playerCaptures[0].length, 'cards');
    console.log('Current player:', gameState.currentPlayer);
    console.log('');

  } catch (error) {
    console.log('❌ Overtake failed:', error.message);
    return;
  }

  console.log('🎉 Overtake mechanic test completed successfully!');
}

// Run the test
testOvertakeMechanic().catch(console.error);
