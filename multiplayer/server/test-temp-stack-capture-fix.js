/**
 * Test: Temp Stack Capture Fix - Multiple Edge Cases
 * Verifies that sophisticated build values are used for temp stack capture
 */

const { determineActions } = require('./game/logic/actionDetermination');

console.log('🧪 TESTING: Temp Stack Capture Fix - Edge Cases\n');

function testTempStackCapture(testName, draggedCard, targetStack) {
  console.log(`\n🔬 ${testName}`);
  console.log(`Dragged: ${draggedCard.rank}${draggedCard.suit} (value: ${draggedCard.value})`);
  console.log(`Target: Temp stack with displayValue: ${targetStack.displayValue}, simple sum: ${targetStack.value}`);
  console.log(`Cards: [${targetStack.cards.map(c => c.rank + c.suit).join(', ')}]`);

  const draggedItem = {
    card: draggedCard,
    source: 'hand'
  };

  const targetInfo = {
    type: 'temporary_stack',
    card: {
      type: 'temporary_stack',
      stackId: 'temp-0',  // ✅ Add stackId as it would be in real game
      displayValue: targetStack.displayValue,
      captureValue: targetStack.captureValue,
      buildValue: targetStack.buildValue,
      value: targetStack.value,
      cards: targetStack.cards
    }
  };

  const gameState = {
    currentPlayer: 0,
    round: 1,
    tableCards: [],
    playerHands: [[], []],
    playerCaptures: [[], []]
  };

  try {
    const result = determineActions(draggedItem, targetInfo, gameState);

    if (result.actions.length > 0 && result.actions[0].type === 'capture') {
      const captureValue = result.actions[0].payload?.captureValue;
      if (captureValue === draggedCard.value) {
        console.log(`✅ SUCCESS: Capture with value ${captureValue}`);
        return true;
      } else {
        console.log(`❌ FAILURE: Wrong capture value ${captureValue}, expected ${draggedCard.value}`);
        return false;
      }
    } else {
      console.log('❌ FAILURE: No capture action returned');
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return false;
  }
}

// Test Case 1: [4,3,5,2] = 7 build (4+3=7, then 5+2=7)
const test1Passed = testTempStackCapture(
  'Test Case 1: [4,3,5,2] = 7 build',
  { suit: '♥', rank: '7', value: 7 },
  {
    displayValue: 7,
    captureValue: undefined,
    buildValue: undefined,
    value: 14, // 4+3+5+2=14
    cards: [
      { suit: '♠', rank: '4', value: 4 },
      { suit: '♣', rank: '3', value: 3 },
      { suit: '♥', rank: '5', value: 5 },
      { suit: '♦', rank: '2', value: 2 }
    ]
  }
);

// Test Case 2: [7,5,2] = 7 build (7+5+2=14, but maybe it's a special build = 7)
const test2Passed = testTempStackCapture(
  'Test Case 2: [7,5,2] = 7 build',
  { suit: '♠', rank: '7', value: 7 },
  {
    displayValue: 7,
    captureValue: undefined,
    buildValue: undefined,
    value: 14, // 7+5+2=14
    cards: [
      { suit: '♥', rank: '7', value: 7 },
      { suit: '♣', rank: '5', value: 5 },
      { suit: '♦', rank: '2', value: 2 }
    ]
  }
);

// Test Case 3: Original test case for comparison
const test3Passed = testTempStackCapture(
  'Test Case 3: Original [5♥,3♣,7♠,A♠] = 7 build',
  { suit: '♥', rank: '7', value: 7 },
  {
    displayValue: 7,
    captureValue: undefined,
    buildValue: undefined,
    value: 16, // 5+3+7+1=16
    cards: [
      { suit: '♥', rank: '5', value: 5 },
      { suit: '♣', rank: '3', value: 3 },
      { suit: '♠', rank: '7', value: 7 },
      { suit: '♠', rank: 'A', value: 1 }
    ]
  }
);

console.log('\n📊 FINAL RESULTS:');
console.log(`Test Case 1 (4+3+5+2=7): ${test1Passed ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test Case 2 (7+5+2=7): ${test2Passed ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test Case 3 (Original): ${test3Passed ? '✅ PASS' : '❌ FAIL'}`);

const allPassed = test1Passed && test2Passed && test3Passed;
console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️ SOME TESTS FAILED'}`);
console.log('Temp stack capture fix is ' + (allPassed ? 'working correctly' : 'still having issues'));

console.log('\n🧪 Edge case testing completed.');
