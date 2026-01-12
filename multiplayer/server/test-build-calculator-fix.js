/**
 * Test Build Calculator Fix
 * Tests the fixed checkFirstCompleteSegment function
 */

const { checkFirstCompleteSegment, updateBuildCalculator, initializeBuildCalculator } = require('./game/logic/utils/tempStackBuildCalculator');

// Test the core fix: single cards should be recognized as valid segments
console.log('🧪 Testing Build Calculator Fix');
console.log('================================');

// Test 1: Single card segments (the main fix)
console.log('\n1. Single Card Segments:');
const tests = [
  { input: [7, 4, 3], expected: 7, description: '[7,4,3] should recognize 7 as first segment (normal build)' },
  { input: [10, 6, 4], expected: 10, description: '[10,6,4] should recognize 10 as base build' },
  { input: [9, 1, 10], expected: 10, description: '[9,1,10] should recognize [9,1]=10 as base build' },
  { input: [3, 3, 3, 9], expected: 9, description: '[3,3,3,9] should recognize 9 as base build (9 + 3+3+3=9)' },
  { input: [11, 5], expected: null, description: '[11,5] should return null (11>10, no valid segment)' },
  { input: [6, 3], expected: 9, description: '[6,3] should recognize [6,3]=9 as normal build' },
  { input: [5, 4], expected: 9, description: '[5,4] should recognize [5,4]=9 as normal build' },
];

let passed = 0;
let total = tests.length;

tests.forEach((test, index) => {
  const result = checkFirstCompleteSegment(test.input);
  const success = result === test.expected;
  console.log(`   ${index + 1}. ${success ? '✅' : '❌'} ${test.description}`);
  console.log(`      Input: [${test.input}] → Expected: ${test.expected}, Got: ${result}`);
  if (success) passed++;
});

// Test 2: Build calculator with realistic examples
console.log('\n2. Build Calculator Integration:');

// Test [7,4,3] complete flow
const stack1 = initializeBuildCalculator({
  cards: [{ value: 7 }, { value: 4 }, { value: 3 }],
  value: 14
});

console.log('   Testing [7,4,3] build flow:');
console.log(`   Initial: displayValue=${stack1.displayValue}, buildValue=${stack1.buildValue}`);

// This should recognize the build when initialized
const finalStack = stack1; // Already initialized with all cards
console.log(`   Final: displayValue=${finalStack.displayValue}, buildValue=${finalStack.buildValue}, isValid=${finalStack.isValid}`);

// Test 3: Real-time updates
console.log('\n3. Real-Time Updates:');
const stack2 = initializeBuildCalculator({
  cards: [{ value: 7 }],
  value: 7
});

console.log('   Starting with [7]:');
console.log(`   displayValue=${stack2.displayValue}, buildValue=${stack2.buildValue}`);

// Add card 4
stack2.cards.push({ value: 4 });
updateBuildCalculator(stack2, 4);
console.log('   After adding 4:');
console.log(`   displayValue=${stack2.displayValue}, buildValue=${stack2.buildValue}`);

// Add card 3
stack2.cards.push({ value: 3 });
updateBuildCalculator(stack2, 3);
console.log('   After adding 3:');
console.log(`   displayValue=${stack2.displayValue}, buildValue=${stack2.buildValue}, segmentCount=${stack2.segmentCount}`);

console.log('\n📊 Results:');
console.log(`   Segment detection: ${passed}/${total} tests passed`);
console.log(`   Integration: ${finalStack.buildValue === 7 ? '✅' : '❌'} [7,4,3] recognized as Build 7`);
console.log(`   Real-time: ${stack2.displayValue === 7 && stack2.segmentCount === 2 ? '✅' : '❌'} Real-time updates work`);

const totalTests = total + 2; // segment tests + 2 integration tests
const totalPassed = passed + (finalStack.buildValue === 7 ? 1 : 0) + (stack2.displayValue === 7 && stack2.segmentCount === 2 ? 1 : 0);

console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} tests passed`);

if (totalPassed === totalTests) {
  console.log('🎉 Build calculator fix successful! Single cards are now recognized as valid segments.');
} else {
  console.log('⚠️  Some tests failed. The fix may need additional work.');
}
