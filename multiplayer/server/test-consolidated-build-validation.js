/**
 * Test Consolidated Build Validation System
 * Tests the new unified build recognition logic
 */

console.log('🧪 Testing Consolidated Build Validation System\n');

// Test cases for different build types
const testCases = [
  {
    name: 'Same Value Build',
    cards: [
      { value: 5, source: 'hand' },
      { value: 5, source: 'table' }
    ],
    expected: ['Capture 5', 'Build 5', 'Capture all (2 cards)']
  },
  {
    name: 'Base Build (casino-ordered)',
    cards: [
      { value: 7, source: 'table' },
      { value: 4, source: 'hand' },
      { value: 3, source: 'table' }
    ],
    hand: [{ value: 7, suit: '♠' }], // Has 7 to capture build
    expected: ['Build 7', 'Capture all (3 cards)']
  },
  {
    name: 'Base Build (5=3+2)',
    cards: [
      { value: 5, source: 'hand' },
      { value: 3, source: 'table' },
      { value: 2, source: 'table' }
    ],
    hand: [{ value: 5, suit: '♠' }], // Has 5 to capture build
    expected: ['Build 5', 'Capture all (3 cards)']
  },
  {
    name: 'Mixed Sources Base Build',
    cards: [
      { value: 9, source: 'table' },
      { value: 5, source: 'oppTopCard' },
      { value: 4, source: 'hand' }
    ],
    hand: [{ value: 9, suit: '♠' }], // Has 9 to capture build
    expected: ['Build 9', 'Capture all (3 cards)']
  },
  {
    name: 'Normal Sum Build',
    cards: [
      { value: 6, source: 'hand' },
      { value: 2, source: 'table' },
      { value: 2, source: 'table' }
    ],
    hand: [{ value: 10, suit: '♠' }], // Has 10 to capture build (6+2+2=10)
    expected: ['Build 10', 'Capture all (3 cards)']
  },
  {
    name: 'Base Build (oppTopCard not bottom: 6+2+8)',
    cards: [
      { value: 6, source: 'table' },
      { value: 2, source: 'hand' },
      { value: 8, source: 'oppTopCard' } // Base card in position 2 (not bottom)
    ],
    hand: [{ value: 8, suit: '♠' }], // Has 8 to capture build
    expected: ['Build 8', 'Capture all (3 cards)']
  },
  {
    name: 'Invalid Base Build (oppTopCard at bottom)',
    cards: [
      { value: 8, source: 'oppTopCard' }, // oppTopCard at bottom (position 0) - invalid
      { value: 6, source: 'table' },
      { value: 2, source: 'hand' }
    ],
    expected: ['Capture all (3 cards)'] // No build options, only capture
  },
  {
    name: 'Invalid Base Build (table base not first)',
    cards: [
      { value: 6, source: 'table' },
      { value: 9, source: 'table' }, // table base in wrong position
      { value: 3, source: 'hand' }
    ],
    expected: ['Capture all (3 cards)'] // No build options, only capture
  },
  {
    name: 'Build Rejected (missing capture card)',
    cards: [
      { value: 6, source: 'table' },
      { value: 2, source: 'hand' },
      { value: 8, source: 'oppTopCard' } // Base build of 8
    ],
    hand: [
      { value: 7, suit: '♠' }, // Has 7, but needs 8 to capture
      { value: 4, suit: '♥' }
    ],
    expected: ['Capture all (3 cards)'] // Build 8 rejected - missing 8 in hand
  },
  {
    name: 'Build Accepted (has capture card)',
    cards: [
      { value: 6, source: 'table' },
      { value: 2, source: 'hand' },
      { value: 8, source: 'oppTopCard' } // Base build of 8
    ],
    hand: [
      { value: 8, suit: '♠' }, // Has 8 - can capture the build
      { value: 4, suit: '♥' }
    ],
    expected: ['Build 8', 'Capture all (3 cards)'] // Build 8 accepted - has 8 in hand
  }
];

// Mock the validation functions (extracted from AcceptValidationModal)
const findBaseBuildDetails = (cards) => {
  for (let baseIndex = 0; baseIndex < cards.length; baseIndex++) {
    const potentialBase = cards[baseIndex];
    const supports = cards.filter((_, index) => index !== baseIndex);
    const supportsSum = supports.reduce((s, c) => s + c.value, 0);

    if (supportsSum === potentialBase.value && potentialBase.value <= 10) {
      // Check position requirements based on base source
      if (potentialBase.source === 'oppTopCard') {
        // oppTopCard base: anywhere EXCEPT position 0 (bottom)
        if (baseIndex > 0) {
          return { baseValue: potentialBase.value, baseIndex, supports };
        }
      } else if (potentialBase.source === 'table' || potentialBase.source === 'hand') {
        // table/hand base: must be position 0 (bottom)
        if (baseIndex === 0) {
          return { baseValue: potentialBase.value, baseIndex, supports };
        }
      }
    }
  }
  return null;
};

const isValidBaseBuild = (cards) => {
  return findBaseBuildDetails(cards) !== null;
};

const isSameValueBuild = (cards) => {
  return cards.length >= 2 && cards.every(c => c.value === cards[0].value);
};

const calculateConsolidatedOptions = (stack, hand = []) => {
  const options = [];
  const cards = stack.cards || [];
  const hasHandCards = cards.some(c => c.source === 'hand');
  const totalSum = cards.reduce((s, c) => s + c.value, 0);

  // Helper function to check if player has required capture card
  const playerHasCaptureCard = (buildValue) => {
    return hand.some((card) => card.value === buildValue);
  };

  // Same Value Builds
  if (isSameValueBuild(cards)) {
    const value = cards[0].value;
    options.push({
      type: 'capture',
      label: `Capture ${value}`,
      value: value
    });

    options.push({
      type: 'build',
      label: `Build ${value}`,
      value: value
    });

    // Sum build for low cards
    if (value <= 5 && totalSum <= 10) {
      const hasExtraCard = hand.some(c => c.value === value);
      if (hasExtraCard) {
        options.push({
          type: 'build',
          label: `Build ${totalSum}`,
          value: totalSum
        });
      }
    }
  }

  // Base Builds (casino-ordered)
  else if (isValidBaseBuild(cards)) {
    const baseDetails = findBaseBuildDetails(cards);
    const baseValue = baseDetails.baseValue;
    // Check if player has the required capture card
    if (playerHasCaptureCard(baseValue)) {
      options.push({
        type: 'build',
        label: `Build ${baseValue}`,
        value: baseValue
      });
    }
  }

  // Normal Builds (sum-based with hand cards)
  else if (hasHandCards && totalSum <= 10 && totalSum >= 2) {
    // Check if player has the required capture card
    if (playerHasCaptureCard(totalSum)) {
      options.push({
        type: 'build',
        label: `Build ${totalSum}`,
        value: totalSum
      });
    }
  }

  // Capture fallback
  if (cards.length >= 2) {
    const captureValue = cards[0]?.value || 0;
    options.push({
      type: 'capture',
      label: `Capture all (${cards.length} cards)`,
      value: captureValue
    });
  }

  return options;
};

// Run tests
let passed = 0;
let total = testCases.length;

testCases.forEach((testCase, index) => {
  console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
  console.log(`Cards: [${testCase.cards.map(c => `${c.value}(${c.source})`).join(', ')}]`);

  const stack = { cards: testCase.cards };
  const hand = testCase.hand || []; // Use hand from test case or empty array
  const options = calculateConsolidatedOptions(stack, hand);
  const labels = options.map(o => o.label);

  console.log(`Expected: [${testCase.expected.join(', ')}]`);
  console.log(`Actual:   [${labels.join(', ')}]`);

  const success = JSON.stringify(labels) === JSON.stringify(testCase.expected);
  console.log(success ? '✅ PASS' : '❌ FAIL');

  if (success) passed++;
});

console.log(`\n🎯 Test Results: ${passed}/${total} passed`);

if (passed === total) {
  console.log('🎉 All consolidated build validation tests passed!');
} else {
  console.log('⚠️  Some tests failed - review the validation logic');
}
