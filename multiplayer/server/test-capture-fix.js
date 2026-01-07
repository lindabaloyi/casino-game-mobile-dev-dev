/**
 * Test Capture Fix
 * Tests that captureTempStack doesn't add extra hand cards
 */

const handleCapture = require('./game/actions/capture/capture');

// Mock game manager
const mockGameManager = {
  getGameState: (gameId) => {
    return {
      currentPlayer: 0,
      playerHands: [
        [
          { suit: '♦', rank: '8', value: 8 },
          { suit: '♠', rank: '6', value: 6 }
        ],
        []
      ],
      tableCards: [
        {
          stackId: 'temp-123',
          cards: [
            { suit: '♣', rank: '8', value: 8 },
            { suit: '♠', rank: '8', value: 8 }
          ]
        }
      ],
      playerCaptures: [[], []]
    };
  }
};

async function testCaptureFix() {
  console.log('🧪 Testing Capture Fix');
  console.log('Before capture:');
  console.log('- Hand: [8♦, 6♠]');
  console.log('- Table: Temp stack [8♣, 8♠]');
  console.log('- Captures: []');

  const action = {
    payload: {
      tempStackId: 'temp-123',
      captureValue: 8
    }
  };

  try {
    const result = await handleCapture(mockGameManager, 0, action, 'test-game');

    console.log('\nAfter capture:');
    console.log('- Hand:', result.playerHands[0].map(c => `${c.rank}${c.suit}`));
    console.log('- Table cards:', result.tableCards.length);
    console.log('- Captures:', result.playerCaptures[0].map(c => `${c.rank}${c.suit}`));
    console.log('- Current player:', result.currentPlayer);

    // Verify results
    const handSize = result.playerHands[0].length;
    const tableCards = result.tableCards.length;
    const captures = result.playerCaptures[0].length;
    const currentPlayer = result.currentPlayer;

    console.log('\n✅ Verification:');
    console.log('- Hand size should be 2 (unchanged):', handSize === 2 ? '✓' : '✗');
    console.log('- Table should be empty:', tableCards === 0 ? '✓' : '✗');
    console.log('- Captures should be 2 (only temp stack cards):', captures === 2 ? '✓' : '✗');
    console.log('- Turn should switch to player 1:', currentPlayer === 1 ? '✓' : '✗');

    const success = handSize === 2 && tableCards === 0 && captures === 2 && currentPlayer === 1;

    if (success) {
      console.log('\n🎉 TEST PASSED: Capture works correctly!');
    } else {
      console.log('\n❌ TEST FAILED: Capture has issues');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCaptureFix();
