/**
 * Test Temp Stack Capture Fix
 * Tests that temp stack captures now correctly include the capturing card
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

async function testTempStackCaptureFix() {
  console.log('🧪 Testing Temp Stack Capture Fix');
  console.log('Before capture:');
  console.log('- Hand: [8♦, 6♠]');
  console.log('- Table: Temp stack [8♣, 8♠]');
  console.log('- Captures: []');

  // Test the NEW behavior: temp stack capture with capturing card included
  const action = {
    payload: {
      tempStackId: 'temp-123',
      captureValue: 8,
      targetCards: [
        { suit: '♣', rank: '8', value: 8 }, // temp stack cards
        { suit: '♠', rank: '8', value: 8 },
        { suit: '♦', rank: '8', value: 8 }  // capturing card on top
      ],
      capturingCard: { suit: '♦', rank: '8', value: 8 }
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
    const capturingCardRemoved = !result.playerHands[0].some(c => c.rank === '8' && c.suit === '♦');

    console.log('\n✅ Verification:');
    console.log('- Hand size should be 1 (8♦ removed):', handSize === 1 ? '✓' : '✗');
    console.log('- Table should be empty:', tableCards === 0 ? '✓' : '✗');
    console.log('- Captures should be 3 (temp stack + capturing card):', captures === 3 ? '✓' : '✗');
    console.log('- Capturing card 8♦ removed from hand:', capturingCardRemoved ? '✓' : '✗');
    console.log('- Turn should switch to player 1:', currentPlayer === 1 ? '✓' : '✗');

    const success = handSize === 1 && tableCards === 0 && captures === 3 && capturingCardRemoved && currentPlayer === 1;

    if (success) {
      console.log('\n🎉 TEST PASSED: Temp stack capture now correctly includes capturing card!');
    } else {
      console.log('\n❌ TEST FAILED: Temp stack capture fix has issues');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTempStackCaptureFix();
