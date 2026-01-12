/**
 * Test script to debug temp stack build value icon display issue
 * Tests the complete flow from temp stack creation to indicator display
 */

const { initializeBuildCalculator } = require('./game/logic/utils/tempStackBuildCalculator');

// Mock React component logging (simplified)
console.log = console.log || (() => {});

// Test temp stack creation with build calculator
console.log('🧪 Testing Temp Stack Build Value Icon Display Issue\n');

// Test Case 1: Create temp stack with [7,4,3] - should show build value 7
console.log('=== Test Case 1: [7,4,3] cards (should show build value 7) ===');

const mockCards_7_4_3 = [
  { rank: '7', suit: 'hearts', value: 7, source: 'table' },
  { rank: '4', suit: 'clubs', value: 4, source: 'hand' },
  { rank: '3', suit: 'diamonds', value: 3, source: 'hand' }
];

const stagingStack_7_4_3 = {
  stackId: 'temp-player1',
  cards: mockCards_7_4_3,
  value: 14, // 7+4+3
  combinedValue: 14,
  owner: 0,
  isSameValueStack: false
};

console.log('Input staging stack:', {
  stackId: stagingStack_7_4_3.stackId,
  cards: stagingStack_7_4_3.cards.map(c => `${c.rank}${c.suit}(${c.value})`),
  value: stagingStack_7_4_3.value
});

const enhancedStack_7_4_3 = initializeBuildCalculator(stagingStack_7_4_3);

console.log('\n📊 Build Calculator Result:');
console.log({
  buildValue: enhancedStack_7_4_3.buildValue,
  displayValue: enhancedStack_7_4_3.displayValue,
  segmentCount: enhancedStack_7_4_3.segmentCount,
  isValid: enhancedStack_7_4_3.isValid,
  isBuilding: enhancedStack_7_4_3.isBuilding
});

// Simulate TempStackRenderer passing to TempStackIndicator
console.log('\n📤 Simulating TempStackRenderer → TempStackIndicator propagation:');
const totalValueForIndicator = enhancedStack_7_4_3.displayValue || enhancedStack_7_4_3.value;
console.log({
  displayValue: enhancedStack_7_4_3.displayValue,
  fallbackValue: enhancedStack_7_4_3.value,
  totalValuePassed: totalValueForIndicator,
  passedFrom: enhancedStack_7_4_3.displayValue !== undefined ? 'displayValue' : 'value (fallback)'
});

// Simulate TempStackIndicator styling logic
console.log('\n🎨 Simulating TempStackIndicator styling decisions:');
const value = totalValueForIndicator;
let styleResult = '';
if (typeof value === 'string') {
  styleResult = 'INVALID (red)';
} else if (value > 0) {
  styleResult = 'SEGMENT COMPLETE (green)';
} else if (value < 0) {
  styleResult = 'SEGMENT BUILDING (orange)';
} else {
  styleResult = 'NEUTRAL (purple)';
}

console.log({
  totalValue: value,
  valueType: typeof value,
  stylingResult: styleResult,
  expectedIcon: value === 7 ? '✅ CORRECT: Green indicator with "7"' : '❌ INCORRECT: Wrong color/value'
});

// Test Case 2: Create temp stack with [5,3,2] - should show sum value 10 (special case)
console.log('\n=== Test Case 2: [5,3,2] cards (should show sum value 10, special case) ===');

const mockCards_5_3_2 = [
  { rank: '5', suit: 'hearts', value: 5, source: 'table' },
  { rank: '3', suit: 'clubs', value: 3, source: 'hand' },
  { rank: '2', suit: 'diamonds', value: 2, source: 'hand' }
];

const stagingStack_5_3_2 = {
  stackId: 'temp-player2',
  cards: mockCards_5_3_2,
  value: 10, // 5+3+2
  combinedValue: 10,
  owner: 0,
  isSameValueStack: false
};

console.log('Input staging stack:', {
  stackId: stagingStack_5_3_2.stackId,
  cards: stagingStack_5_3_2.cards.map(c => `${c.rank}${c.suit}(${c.value})`),
  value: stagingStack_5_3_2.value
});

const enhancedStack_5_3_2 = initializeBuildCalculator(stagingStack_5_3_2);

console.log('\n📊 Build Calculator Result:');
console.log({
  buildValue: enhancedStack_5_3_2.buildValue,
  displayValue: enhancedStack_5_3_2.displayValue,
  segmentCount: enhancedStack_5_3_2.segmentCount,
  isValid: enhancedStack_5_3_2.isValid,
  isBuilding: enhancedStack_5_3_2.isBuilding
});

// Simulate propagation and styling
const totalValueForIndicator2 = enhancedStack_5_3_2.displayValue || enhancedStack_5_3_2.value;
console.log('\n📤 Propagation simulation:');
console.log({
  displayValue: enhancedStack_5_3_2.displayValue,
  fallbackValue: enhancedStack_5_3_2.value,
  totalValuePassed: totalValueForIndicator2,
  passedFrom: enhancedStack_5_3_2.displayValue !== undefined ? 'displayValue' : 'value (fallback)'
});

const value2 = totalValueForIndicator2;
let styleResult2 = '';
if (typeof value2 === 'string') {
  styleResult2 = 'INVALID (red)';
} else if (value2 > 0) {
  styleResult2 = 'SEGMENT COMPLETE (green)';
} else if (value2 < 0) {
  styleResult2 = 'SEGMENT BUILDING (orange)';
} else {
  styleResult2 = 'NEUTRAL (purple)';
}

console.log('\n🎨 Styling simulation:');
console.log({
  totalValue: value2,
  valueType: typeof value2,
  stylingResult: styleResult2,
  expectedIcon: value2 === 10 ? '✅ CORRECT: Green indicator with "10"' : '❌ INCORRECT: Wrong color/value'
});

// Summary
console.log('\n📋 SUMMARY:');
console.log(`Test Case 1 ([7,4,3]): Expected build value 7, Got ${totalValueForIndicator}, ${totalValueForIndicator === 7 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test Case 2 ([5,3,2]): Expected sum value 10, Got ${totalValueForIndicator2}, ${totalValueForIndicator2 === 10 ? '✅ PASS' : '❌ FAIL'}`);

if (totalValueForIndicator === 7 && totalValueForIndicator2 === 10) {
  console.log('\n🎉 ALL TESTS PASSED: Build calculator is working correctly!');
} else {
  console.log('\n⚠️ ISSUES DETECTED: Build calculator has problems that need fixing.');
}

// Test Case 3: Adding cards to existing temp stack - real-time updates
console.log('\n=== Test Case 3: Adding cards to existing temp stack (real-time updates) ===');

// Start with [7] - should show 7 (no build yet)
console.log('Step 1: Start with single card [7]');
const mockCard7 = { rank: '7', suit: 'hearts', value: 7, source: 'table' };
const initialStack = {
  stackId: 'temp-player3',
  cards: [mockCard7],
  value: 7,
  combinedValue: 7,
  owner: 0,
  isSameValueStack: false,
  buildValue: null,
  runningSum: 0,
  segmentCount: 0,
  displayValue: 7,
  isValid: true,
  isBuilding: true
};

console.log('Initial stack:', {
  cards: initialStack.cards.map(c => `${c.rank}${c.suit}(${c.value})`),
  displayValue: initialStack.displayValue,
  buildValue: initialStack.buildValue
});

// Simulate adding card 4
console.log('\nStep 2: Adding card 4 to [7]');
const { updateBuildCalculator } = require('./game/logic/utils/tempStackBuildCalculator');
let updatedStack = updateBuildCalculator(initialStack, 4);

// Add the card to the stack for next calculation
updatedStack.cards.push({ rank: '4', suit: 'clubs', value: 4, source: 'hand' });
updatedStack.value = updatedStack.cards.reduce((sum, c) => sum + c.value, 0);

console.log('After adding 4:', {
  cards: updatedStack.cards.map(c => `${c.rank}${c.suit}(${c.value})`),
  displayValue: updatedStack.displayValue,
  buildValue: updatedStack.buildValue,
  expectedDisplayValue: 11 // Should show sum while building
});

// Simulate adding card 3
console.log('\nStep 3: Adding card 3 to [7,4]');
updatedStack = updateBuildCalculator(updatedStack, 3);
updatedStack.cards.push({ rank: '3', suit: 'diamonds', value: 3, source: 'hand' });
updatedStack.value = updatedStack.cards.reduce((sum, c) => sum + c.value, 0);

console.log('After adding 3:', {
  cards: updatedStack.cards.map(c => `${c.rank}${c.suit}(${c.value})`),
  displayValue: updatedStack.displayValue,
  buildValue: updatedStack.buildValue,
  expectedDisplayValue: 7 // Should show build value 7 when complete
});

const test3Pass = updatedStack.displayValue === 7 && updatedStack.buildValue === 7;
console.log(`\nTest Case 3 Result: ${test3Pass ? '✅ PASS' : '❌ FAIL'} - Real-time updates work correctly`);

// Final Summary
console.log('\n📋 FINAL SUMMARY:');
console.log(`Test Case 1 (Initialize [7,4,3]): ${totalValueForIndicator === 7 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test Case 2 (Initialize [5,3,2]): ${totalValueForIndicator2 === 10 ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Test Case 3 (Real-time updates): ${test3Pass ? '✅ PASS' : '❌ FAIL'}`);

const allTestsPass = totalValueForIndicator === 7 && totalValueForIndicator2 === 10 && test3Pass;
if (allTestsPass) {
  console.log('\n🎉 ALL TESTS PASSED: Build calculator and real-time updates are working correctly!');
  console.log('💡 CONCLUSION: If you are still seeing incorrect build value icons, the issue is likely in:');
  console.log('   1. Server → Client data transmission');
  console.log('   2. React component prop passing');
  console.log('   3. TempStackIndicator styling logic');
  console.log('   4. Not in the build calculator logic itself');
} else {
  console.log('\n⚠️ ISSUES DETECTED: Build calculator has problems that need fixing.');
}
