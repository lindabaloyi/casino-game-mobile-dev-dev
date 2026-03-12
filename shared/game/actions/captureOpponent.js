/**
 * captureOpponent
 * Player captures an OPPONENT'S build stack.
 */

const { cloneState, nextTurn, startPlayerTurn, triggerAction, finalizeGame } = require('../');

function captureOpponent(state, payload, playerIndex) {
  const { card, targetStackId } = payload;

  if (!card?.rank || !card?.suit) {
    throw new Error('captureOpponent: invalid card payload');
  }
  if (!targetStackId) {
    throw new Error('captureOpponent: targetStackId is required');
  }

  const newState = cloneState(state);
  const hand = newState.players[playerIndex].hand;

  const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
  if (handIdx === -1) {
    throw new Error(`captureOpponent: card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`);
  }
  const [capturingCard] = hand.splice(handIdx, 1);

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === targetStackId,
  );
  if (stackIdx === -1) {
    throw new Error(`captureOpponent: build stack "${targetStackId}" not found`);
  }

  const buildStack = newState.tableCards[stackIdx];
  if (buildStack.owner === playerIndex) {
    throw new Error('captureOpponent: cannot capture your own build - use captureOwn');
  }

  if (capturingCard.value !== buildStack.value) {
    throw new Error(`captureOpponent: card value ${capturingCard.value} doesn't match build value ${buildStack.value}`);
  }
  
  // Track captured builds for cooperative rebuild in party mode
  // Also handle shiyal recalls when applicable
  const isPartyMode = state.playerCount === 4;
  
  if (isPartyMode && buildStack && buildStack.type === 'build_stack') {
    const stackOwner = buildStack.owner;
    
    if (stackOwner !== undefined && stackOwner !== null) {
      const stackOwnerTeam = stackOwner < 2 ? 0 : 1;
      const capturingPlayerTeam = playerIndex < 2 ? 0 : 1;
      
      // Always track opponent captures (different teams) for cooperative rebuild
      if (stackOwnerTeam !== capturingPlayerTeam) {
        // Ensure teamCapturedBuilds exists
        if (!newState.teamCapturedBuilds) {
          newState.teamCapturedBuilds = { 0: [], 1: [] };
        }
        
        // Add to teamCapturedBuilds (no shiyaPlayer field)
        newState.teamCapturedBuilds[capturingPlayerTeam].push({
          value: buildStack.value,
          originalOwner: stackOwner,
          capturedBy: playerIndex,
          cards: buildStack.cards,
          stackId: buildStack.stackId,
        });
        
        // If the captured build had Shiya active, create a recall offer for the activator
        if (buildStack.shiyaActive && buildStack.shiyaPlayer !== undefined) {
          const activator = buildStack.shiyaPlayer;
          
          // Ensure shiyaRecalls exists
          if (!newState.shiyaRecalls) {
            newState.shiyaRecalls = {};
          }
          
          // Create recall offer for the activator (one per player)
          newState.shiyaRecalls[activator] = {
            stackId: buildStack.stackId,
            value: buildStack.value,
            capturedBy: playerIndex,
            originalOwner: stackOwner,
            cards: buildStack.cards,
            expiresAt: Date.now() + 4000, // 4 second window
          };
          
          console.log(`[captureOpponent] Created shiyal recall for player ${activator}:`, newState.shiyaRecalls[activator]);
        }
      }
    }
  }

  const capturedCards = [...buildStack.cards];
  newState.tableCards.splice(stackIdx, 1);
  newState.players[playerIndex].captures.push(...capturedCards, capturingCard);

  // Track last capture for end-of-game cleanup
  newState.lastCapturePlayer = playerIndex;

  // Mark turn as started and ended (capture auto-ends turn)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
  // Explicitly set turnEnded since capture ends the turn
  if (newState.roundPlayers && newState.roundPlayers[playerIndex]) {
    newState.roundPlayers[playerIndex].turnEnded = true;
  }

  const resultState = nextTurn(newState);
  
  // Check if game is over (deck empty and all hands empty)
  const deckEmpty = resultState.deck.length === 0;
  const allHandsEmpty = resultState.players.every(p => p.hand.length === 0);
  
  if (deckEmpty && allHandsEmpty) {
    return finalizeGame(resultState);
  }
  
  return resultState;
}

module.exports = captureOpponent;
