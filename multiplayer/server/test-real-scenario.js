/**
 * Test script to simulate the exact scenario from user's gameplay logs
 * Start with [4♠, 3♥] temp stack, then add A♠ to make [4♠, 3♥, A♠]
 * This should result in displayValue: 8 (special case sum)
 */

const { initializeBuildCalculator, updateBuildCalculator } = require('./game/logic/utils/tempStackBuildCalculator');

console.log('🧪 Testing Real Gameplay Scenario: [4,2] + A♦ = [4,2,1]\n');

// Step 1: Create initial temp stack with [4,2]
console.log('=== Step 1: Create temp stack with [4♠, 2♥] ===');

const initialCards = [
  { rank: '4', suit: '♠', value: 4, source: 'table' },
  { rank: '2', suit: '♥', value: 2, source: 'hand' }
];

const initialStack = {
  stackId: 'temp-1',
  cards: initialCards,
  value: 6, // 4+2
  combinedValue: 6,
  owner: 1,
  isSameValueStack: false
};

console.log('Initial stack:', {
  cards: initialStack.cards.map(c => `${c.rank}${c.suit}(${c.value})`),
  value: initialStack.value
});

const tempStack = initializeBuildCalculator(initialStack);

console.log('\nAfter initializeBuildCalculator:');
console.log({
  buildValue: tempStack.buildValue,
  displayValue: tempStack.displayValue,
  segmentCount: tempStack.segmentCount,
  isValid: tempStack.isValid,
  isBuilding: tempStack.isBuilding
});

// Step 2: Add A♦ (value 1) to the temp stack
console.log('\n=== Step 2: Add A♦ (value 1) to temp stack ===');

const aceCard = { rank: 'A', suit: '♦', value: 1, source: 'table' };

// First add the card to the tempStack.cards array (simulating what addToOwnTemp does)
tempStack.cards.push(aceCard);
tempStack.value = tempStack.cards.reduce((sum, c) => sum + c.value, 0);

console.log('After adding A♦ to cards array:');
console.log({
  cards: tempStack.cards.map(c => `${c.rank}${c.suit}(${c.value})`),
  newValue: tempStack.value,
  expectedSum: 4 + 2 + 1 // Should be 7
});

// Now call updateBuildCalculator
console.log('\nCalling updateBuildCalculator with newCardValue: 1...');
const updatedStack = updateBuildCalculator(tempStack, aceCard.value);

console.log('\n📊 FINAL RESULT after updateBuildCalculator:');
console.log({
  stackId: updatedStack.stackId,
  buildValue: updatedStack.buildValue,
  displayValue: updatedStack.displayValue,
  segmentCount: updatedStack.segmentCount,
  runningSum: updatedStack.runningSum,
  isValid: updatedStack.isValid,
  isBuilding: updatedStack.isBuilding,
  finalCards: updatedStack.cards.map(c => `${c.rank}${c.suit}(${c.value})`)
});

// Test Results
const expectedDisplayValue = 7; // Special case: sum ≤ 10
const actualDisplayValue = updatedStack.displayValue;

console.log('\n📋 TEST RESULTS:');
console.log(`✅ Expected displayValue: ${expectedDisplayValue} (special case sum)`);
console.log(`✅ Actual displayValue: ${actualDisplayValue}`);
console.log(`✅ Cards: [${updatedStack.cards.map(c => c.value).join(',')}] sum = ${updatedStack.cards.reduce((sum, c) => sum + c.value, 0)}`);
console.log(`✅ Test result: ${actualDisplayValue === expectedDisplayValue ? 'PASS' : 'FAIL'}`);

if (actualDisplayValue === expectedDisplayValue) {
  console.log('\n🎉 SUCCESS: Temp stack correctly shows displayValue: 7');
  console.log('💡 The server-side build calculator is working correctly!');
} else {
  console.log('\n❌ FAILURE: Temp stack shows wrong displayValue');
  console.log('🔧 The build calculator has a bug that needs fixing');
}
