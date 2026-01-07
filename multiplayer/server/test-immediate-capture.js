#!/usr/bin/env node

/**
 * Test Immediate Temp Stack Capture
 * Tests the new immediate-temp-stack-capture rule (priority 110)
 */

const { determineActions } = require('./game/logic/actionDetermination');

// Mock game state with temp stack and matching hand card
const mockGameState = {
  currentPlayer: 0,
  playerHands: [['8♦', '6♠']], // Player has 8♦ and 6♠
  tableCards: [{
    type: 'temporary_stack',
    stackId: 'temp-456',
    cards: [{ rank: '8', suit: '♣' }, { rank: '8', suit: '♠' }],
    captureValue: 8 // Temp stack sums to 8
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

// Mock context for action determination
const draggedItem = {
  card: stringToCard('8♦'), // 8♦ from hand
  source: 'hand'
};

const targetInfo = {
  type: 'temporary_stack',
  card: mockGameState.tableCards[0]
};

console.log('🧪 Testing Immediate Temp Stack Capture');
console.log('=====================================');
console.log(`Dragged: ${draggedItem.card.rank}${draggedItem.card.suit} (value: ${draggedItem.card.value})`);
console.log(`Target: Temp stack with cards [${targetInfo.card.cards.map(c => c.rank + c.suit).join(', ')}] (value: ${targetInfo.card.captureValue})`);
console.log('');

try {
  const result = determineActions(draggedItem, targetInfo, mockGameState);

  console.log('🎯 Action Determination Result:');
  console.log(`Actions found: ${result.actions.length}`);
  console.log(`Requires modal: ${result.requiresModal}`);
  console.log('');

  if (result.actions.length > 0) {
    console.log('📋 Action Details:');
    result.actions.forEach((action, index) => {
      console.log(`  ${index + 1}. Type: ${action.type}`);
      if (action.payload) {
        console.log(`     Payload:`, JSON.stringify(action.payload, null, 2));
      }
    });
    console.log('');

    // Check if immediate capture was triggered
    const immediateCaptureAction = result.actions.find(a =>
      a.type === 'capture' &&
      a.payload.tempStackId === 'temp-456'
    );

    if (immediateCaptureAction) {
      console.log('✅ SUCCESS: Immediate temp stack capture rule triggered!');
      console.log('   - Rule priority 110 executed before temp-stack-addition (priority 100)');
      console.log('   - Direct capture action created');
    } else {
      console.log('❌ FAILURE: Immediate capture rule did not trigger');
      console.log('   - Check rule conditions and priority ordering');
    }
  } else {
    console.log('❌ FAILURE: No actions generated');
    console.log('   - Rules may not be matching the context');
  }

} catch (error) {
  console.error('❌ ERROR during action determination:', error.message);
  console.error(error.stack);
}

console.log('');
console.log('🎉 Test completed!');