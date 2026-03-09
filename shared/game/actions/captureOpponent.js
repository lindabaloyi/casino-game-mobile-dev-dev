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
  
  // Track captured teammate builds for cooperative rebuild in party mode
  // This action is specifically for capturing opponent's builds
  const isPartyMode = state.playerCount === 4;
  console.log(`[captureOpponent] Build capture tracking - isPartyMode: ${isPartyMode}, playerCount: ${state.playerCount}, stackType: ${buildStack?.type}, stackOwner: ${buildStack?.owner}, playerIndex: ${playerIndex}`);
  
  if (isPartyMode && buildStack && buildStack.type === 'build_stack') {
    const stackOwner = buildStack.owner;
    console.log(`[captureOpponent] Checking build stack - owner: ${stackOwner}, value: ${buildStack.value}`);
    
    if (stackOwner !== undefined && stackOwner !== null) {
      const stackOwnerTeam = stackOwner < 2 ? 0 : 1;
      const capturingPlayerTeam = playerIndex < 2 ? 0 : 1;
      console.log(`[captureOpponent] Team check - stackOwnerTeam: ${stackOwnerTeam}, capturingPlayerTeam: ${capturingPlayerTeam}, different: ${stackOwnerTeam !== capturingPlayerTeam}`);
      
      // Only track if the capturing player is on a DIFFERENT team (opponent captured it)
      if (stackOwnerTeam !== capturingPlayerTeam) {
        // Ensure teamCapturedBuilds exists
        if (!newState.teamCapturedBuilds) {
          newState.teamCapturedBuilds = { 0: [], 1: [] };
          console.log(`[captureOpponent] Created teamCapturedBuilds in newState`);
        }
        
        // Add entry to the VICTIM's team array (so they can rebuild their captured build)
        // This allows the victim to rebuild the build that was taken from them
        newState.teamCapturedBuilds[stackOwnerTeam].push({
          value: buildStack.value,
          originalOwner: stackOwner,
          capturedBy: playerIndex  // Track who captured it (for filtering)
        });
        
        console.log(`[captureOpponent] ✅ Tracked captured build: value=${buildStack.value}, originalOwner=${stackOwner}, capturedBy=${playerIndex}, forVictimTeam=${stackOwnerTeam}`);
        console.log(`[captureOpponent] Final teamCapturedBuilds:`, JSON.stringify(newState.teamCapturedBuilds));
      } else {
        console.log(`[captureOpponent] ⏭️ Skipped tracking - same team (playerIndex: ${playerIndex}, stackOwner: ${stackOwner})`);
      }
    } else {
      console.log(`[captureOpponent] ⏭️ Skipped tracking - no stack owner`);
    }
  } else {
    console.log(`[captureOpponent] ⏭️ Skipped tracking - not party mode or not build_stack`);
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
