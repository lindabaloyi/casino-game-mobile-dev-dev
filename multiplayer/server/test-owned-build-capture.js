#!/usr/bin/env node

/**
 * Test Owned Build Capture
 * Tests that dropping a matching card on owned build triggers capture instead of addToOwnBuild
 */

const { determineActions } = require('./game/logic/actionDetermination');

// Mock game state with owned build
const mockGameState = {
  currentPlayer: 0,
  playerHands: [['7♦', '3♠']], // Player has 7♦ and 3♠
  tableCards: [{
    type: 'build',
    buildId: 'build-1',
    owner: 0, // Owned by current player
    value: 7, // Build value is 7
    cards: [{ rank: '5', suit: '♣' }, { rank: '2', suit: '♠' }] // 5♣ + 2♠ = 7
  }],
  round: 1,
  gameId: 'test-game'
};

// Convert string cards to proper card objects
function stringToCard(str) {
  const match = str.match(/(\d+|A|10)([♠♥♦♣])/);
  if (!match) return null;

  let value;
  if (match[1] === 'A') value = 1;
  else if (match[1] === '10') value = 10;
  else value = parseInt(match[1], 10);

  return {
    rank: match[1],
    suit: match[2],
    value
  };
}

// Test Case 1: Card matches build value (should trigger capture)
console.log('🧪 Testing Owned Build Capture');
console.log('================================');
console.log('Test Case 1: 7♦ dropped on owned build worth 7');
console.log('');

const draggedItemMatch = {
  card: stringToCard('7♦'), // 7♦ matches build value of 7
  source: 'hand'
};

const targetInfoMatch = {
  type: 'build',
  card: mockGameState.tableCards[0]
};

try {
  const resultMatch = determineActions(draggedItemMatch, targetInfoMatch, mockGameState);

  console.log('🎯 Action Determination Result (Value Match):');
  console.log(`Actions found: ${resultMatch.actions.length}`);
  console.log(`Requires modal: ${resultMatch.requiresModal}`);
  console.log('');

  if (resultMatch.actions.length > 0) {
    console.log('📋 Action Details:');
    resultMatch.actions.forEach((action, index) => {
      console.log(`  ${index + 1}. Type: ${action.type}`);
      if (action.payload) {
        console.log(`     Payload:`, JSON.stringify(action.payload, null, 2));
      }
    });
    console.log('');

    // Check if both capture and add actions are available (rule engine working correctly)
    const captureAction = resultMatch.actions.find(a => a.type === 'capture');
    const addToBuildAction = resultMatch.actions.find(a => a.type === 'addToOwnBuild');

    if (captureAction && addToBuildAction && resultMatch.requiresModal) {
      console.log('✅ SUCCESS: Rule engine working - both capture and add actions available');
      console.log('   - Player gets modal choice between capturing or adding to build');
      console.log('   - Modal required:', resultMatch.requiresModal);
    } else if (captureAction) {
      console.log('⚠️ PARTIAL: Only capture action available');
    } else if (addToBuildAction) {
      console.log('❌ FAILURE: Only addToOwnBuild available, capture missing');
      console.log('   - Rule engine not finding build-capture rule');
    } else {
      console.log('❌ FAILURE: No valid actions found');
    }
  } else {
    console.log('❌ FAILURE: No actions generated');
  }

} catch (error) {
  console.error('❌ ERROR during action determination:', error.message);
  console.error(error.stack);
}

console.log('');
console.log('Test Case 2: 3♠ dropped on owned build worth 7 (value mismatch)');
console.log('');

// Test Case 2: Card does not match build value (should trigger addToOwnBuild)
const draggedItemNoMatch = {
  card: stringToCard('3♠'), // 3♠ does not match build value of 7
  source: 'hand'
};

try {
  const resultNoMatch = determineActions(draggedItemNoMatch, targetInfoMatch, mockGameState);

  console.log('🎯 Action Determination Result (Value Mismatch):');
  console.log(`Actions found: ${resultNoMatch.actions.length}`);
  console.log(`Requires modal: ${resultNoMatch.requiresModal}`);
  console.log('');

  if (resultNoMatch.actions.length > 0) {
    console.log('📋 Action Details:');
    resultNoMatch.actions.forEach((action, index) => {
      console.log(`  ${index + 1}. Type: ${action.type}`);
      if (action.payload) {
        console.log(`     Payload:`, JSON.stringify(action.payload, null, 2));
      }
    });
    console.log('');

    // Check if addToOwnBuild was triggered for value mismatch
    const captureAction = resultNoMatch.actions.find(a => a.type === 'capture');
    const addToBuildAction = resultNoMatch.actions.find(a => a.type === 'addToOwnBuild');

    if (addToBuildAction && !captureAction) {
      console.log('✅ SUCCESS: addToOwnBuild triggered for owned build (value mismatch)');
      console.log('   - Player can add to their build when card value does not match');
    } else if (captureAction) {
      console.log('❌ FAILURE: Capture triggered when values don\'t match');
    } else {
      console.log('❌ FAILURE: Unexpected action type');
    }
  } else {
    console.log('❌ FAILURE: No actions generated');
  }

} catch (error) {
  console.error('❌ ERROR during action determination:', error.message);
  console.error(error.stack);
}

console.log('');
console.log('🎉 Owned build capture test completed!');