/**
 * captureTemp
 * Immediate capture of a temp stack when player drops a card matching the build hint.
 * 
 * This action is routed by SmartRouter when:
 * 1. Player drops a card onto their own temp stack
 * 2. The dropped card matches the temp stack's build hint (need value)
 * 3. This provides instant capture without showing PlayOptionsModal
 */

const { cloneState, nextTurn, startPlayerTurn, triggerAction } = require('../');

function captureTemp(state, payload, playerIndex) {
  const { card, stackId, source } = payload;
  
  if (!card || !stackId) {
    throw new Error('captureTemp: missing card or stackId');
  }
  
  const newState = cloneState(state);
  
  // Find the temp stack
  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'temp_stack' && tc.stackId === stackId,
  );
  
  if (stackIdx === -1) {
    throw new Error(`captureTemp: temp stack "${stackId}" not found`);
  }
  
  const stack = newState.tableCards[stackIdx];
  
  // Validate that this is the player's own temp stack
  if (stack.owner !== playerIndex) {
    throw new Error(`captureTemp: cannot capture temp stack owned by player ${stack.owner}`);
  }
  
  // Find and remove the card from the source
  const cardSource = source || 'hand';
  let capturedCard = null;
  
  if (cardSource === 'table') {
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit,
    );
    if (tableIdx !== -1) {
      [capturedCard] = newState.tableCards.splice(tableIdx, 1);
    }
  } else if (cardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
    if (handIdx !== -1) {
      [capturedCard] = hand.splice(handIdx, 1);
    }
  } else if (cardSource.startsWith('captured_')) {
    const ownerIdx = parseInt(cardSource.split('_')[1], 10);
    if (!isNaN(ownerIdx) && ownerIdx >= 0 && ownerIdx < newState.players.length) {
      const captures = newState.players[ownerIdx].captures;
      const capIdx = captures.findIndex(c => c.rank === card.rank && c.suit === card.suit);
      if (capIdx !== -1) {
        [capturedCard] = captures.splice(capIdx, 1);
      }
    }
  }
  
  if (!capturedCard) {
    throw new Error(`captureTemp: card ${card.rank}${card.suit} not found at source ${cardSource}`);
  }
  
  // Add the captured stack cards to player's captures
  const capturedStackCards = [...stack.cards];
  newState.players[playerIndex].captures.push(...capturedStackCards);
  
  // Also capture the dropped card
  newState.players[playerIndex].captures.push(capturedCard);
  
  // Calculate and add score for captured cards
  let capturedScore = 0;
  for (const c of capturedStackCards) {
    capturedScore += c.value;
  }
  capturedScore += capturedCard.value;
  newState.players[playerIndex].score += capturedScore;
  
  // Remove the temp stack from table
  newState.tableCards.splice(stackIdx, 1);
  
  // --- Shiya Recall: If temp stack has Shiya active, create recall offer for the activator ---
  // This handles: P1 activates Shiya on P2's temp → P2 captures their own temp → P1 gets recall option
  // The recall stores both build cards AND capture cards (the card used to capture)
  if (stack.shiyaActive && stack.shiyaPlayer !== undefined) {
    const activator = stack.shiyaPlayer;
    
    // Ensure shiyaRecalls exists
    if (!newState.shiyaRecalls) {
      newState.shiyaRecalls = {};
    }
    
    // Support multiple recalls per player by using stackId as key
    if (!newState.shiyaRecalls[activator]) {
      newState.shiyaRecalls[activator] = {};
    }
    
    // Store build info and capture cards
    newState.shiyaRecalls[activator][stack.stackId] = {
      stackId: stack.stackId,
      value: stack.value,
      base: stack.base,
      need: stack.need,
      buildType: stack.buildType,
      capturedBy: playerIndex,
      originalOwner: stack.owner,
      buildCards: stack.cards.map(c => ({ ...c })),      // copy build cards
      captureCards: [capturedCard].map(c => ({ ...c })),  // copy capture card(s)
      expiresAt: Date.now() + 4000, // 4 second window
    };
    
    console.log(`[captureTemp] Created recall for player ${activator}: stackId=${stack.stackId}, buildCards=${stack.cards.length}, captureCards=1`);
  }
  
  console.log(`[captureTemp] Player ${playerIndex} captured temp stack with ${capturedStackCards.length + 1} cards, score: ${capturedScore}`);
  
  // Mark turn as started and ended
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  if (newState.roundPlayers && newState.roundPlayers[playerIndex]) {
    newState.roundPlayers[playerIndex].turnEnded = true;
  }
  
  return nextTurn(newState);
}

module.exports = captureTemp;
