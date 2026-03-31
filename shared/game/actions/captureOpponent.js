/**
 * captureOpponent
 * Player captures an OPPONENT'S build stack.
 */

const { cloneState, nextTurn, startPlayerTurn, triggerAction, finalizeGame } = require('../');
const { hasAnyActiveTempStack, getPlayerTempStack } = require('../tempStackHelpers');

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

  // Clear any pending choice from previous modal interactions
  newState.pendingChoice = null;

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
  
  // --- GUARDRAIL: Prevent capture opponent when player has active temp stack ---
  const playerTempStack = getPlayerTempStack(state, playerIndex);
  if (playerTempStack) {
    throw new Error('Cannot capture opponent\'s build when you have an active temp stack - capture your temp stack first');
  }
  
  // Also check for ANY temp stack on table
  if (hasAnyActiveTempStack(state)) {
    throw new Error('Cannot capture opponent\'s build when there is an active temp stack on the table');
  }

  if (capturingCard.value !== buildStack.value) {
    throw new Error(`captureOpponent: card value ${capturingCard.value} doesn't match build value ${buildStack.value}`);
  }
  
  // Track captured builds for cooperative rebuild in party mode
  // Also handle shiyal recalls when applicable
  const isPartyMode = state.playerCount === 4 && state.players.some(p => p.team);
  
  if (isPartyMode && buildStack && buildStack.type === 'build_stack') {
    const stackOwner = buildStack.owner;
    
    if (stackOwner !== undefined && stackOwner !== null) {
      const stackOwnerTeam = stackOwner < 2 ? 0 : 1;
      const capturingPlayerTeam = playerIndex < 2 ? 0 : 1;
      
      // Track opponent captures for cooperative rebuild
      // CRITICAL: Only the OTHER teammate (not the original builder) can rebuild
      // When opponent captures your teammate's build, add to the OTHER teammate's list
      if (stackOwnerTeam !== capturingPlayerTeam) {
        // Find the other teammate on the original owner's team
        // Team 0: players 0,1 | Team 1: players 2,3
        // If originalOwner is 0 or 1, other is 1 or 0 (XOR with 1)
        // If originalOwner is 2 or 3, other is 3 or 2 (XOR with 1)
        const targetPlayer = stackOwner ^ 1;
        
        // Validate build qualifies for team capture
        if (!buildStack.value || !buildStack.cards || buildStack.cards.length === 0) {
          console.warn(`[captureOpponent] ⚠️ Build ${buildStack.stackId} does NOT qualify for teamCapturedBuilds - missing value or cards`);
        } else {
          console.log(`[captureOpponent] ✅ Adding to teamCapturedBuilds: Player ${targetPlayer} can rebuild (originalOwner=Player ${stackOwner}, capturedBy=Player ${playerIndex}, value=${buildStack.value})`);
        }
        
        // Ensure teamCapturedBuilds exists
        if (!newState.teamCapturedBuilds) {
          newState.teamCapturedBuilds = {};
        }
        
        // Initialize player array if needed
        if (!newState.teamCapturedBuilds[targetPlayer]) {
          newState.teamCapturedBuilds[targetPlayer] = [];
        }
        
        // Deduplicate by value: remove any existing entry with the same value
        // This ensures only the most recent capture for that value remains
        newState.teamCapturedBuilds[targetPlayer] = 
          newState.teamCapturedBuilds[targetPlayer].filter(
            entry => entry.value !== buildStack.value
          );
        
        // Add to OTHER teammate's list (not the original builder)
        newState.teamCapturedBuilds[targetPlayer].push({
          value: buildStack.value,
          originalOwner: stackOwner,
          capturedBy: playerIndex,
          cards: buildStack.cards,
          stackId: buildStack.stackId,
        });
        
        console.log(`[captureOpponent] 📊 teamCapturedBuilds for Player ${targetPlayer} now has ${newState.teamCapturedBuilds[targetPlayer].length} entries`);
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
