/**
 * captureOwn
 * Player captures own loose card or build stack.
 */

const { cloneState, nextTurn, startPlayerTurn, triggerAction, finalizeGame } = require('../');
const { createRecallEntries } = require('../recallHelpers');
const { hasAnyActiveTempStack, getPlayerTempStack } = require('../tempStackHelpers');

function getPossibleCaptureValues(cards) {
  if (cards.length === 0) return [];
  const cardValue = cards[0].value;
  const count = cards.length;
  const possibleValues = [];
  for (let i = 1; i <= count; i++) {
    const sum = cardValue * i;
    possibleValues.push(sum);
    if (cards[0].rank === 'A') {
      const altSum = 14 + (cardValue - 1) * (i - 1);
      if (!possibleValues.includes(altSum) && altSum <= 14) {
        possibleValues.push(altSum);
      }
    }
  }
  return [...new Set(possibleValues)].sort((a, b) => a - b);
}

function captureOwn(state, payload, playerIndex) {
  const { card, targetType, targetRank, targetSuit, targetStackId } = payload;

  if (!card?.rank || !card?.suit) {
    throw new Error('captureOwn: invalid card payload');
  }

  // --- GUARDRAIL: Prevent captureOwn when player has active extendBuild ---
  const hasPendingExtension = state.tableCards?.some(
    tc => tc.type === 'build_stack' &&
         tc.owner === playerIndex &&
         (tc.pendingExtension?.cards?.length > 0 || tc.pendingExtension?.looseCard)
  );
  if (hasPendingExtension) {
    throw new Error('Cannot capture - you have an active build extension. Complete or cancel it first.');
  }

  let newState = cloneState(state);
  const hand = newState.players[playerIndex].hand;

  const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
  if (handIdx === -1) {
    throw new Error(`captureOwn: card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`);
  }
  const [capturingCard] = hand.splice(handIdx, 1);
  const capturedCards = [];

  if (targetType === 'loose') {
    if (!targetRank || !targetSuit) {
      throw new Error('captureOwn: loose target missing rank/suit');
    }
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === targetRank && tc.suit === targetSuit,
    );
    if (tableIdx === -1) {
      throw new Error(`captureOwn: target card ${targetRank}${targetSuit} not found on table`);
    }
    const targetCard = newState.tableCards[tableIdx];
    if (capturingCard.rank !== targetCard.rank) {
      throw new Error('captureOwn: can only capture identical cards');
    }
    newState.tableCards.splice(tableIdx, 1);
    capturedCards.push(targetCard);
  } else if (targetType === 'build') {
    if (!targetStackId) {
      throw new Error('captureOwn: build target missing stackId');
    }
    const stackIdx = newState.tableCards.findIndex(
      tc => (tc.type === 'build_stack' || tc.type === 'temp_stack') && tc.stackId === targetStackId,
    );
    if (stackIdx === -1) {
      throw new Error(`captureOwn: build stack "${targetStackId}" not found`);
    }
    const buildStack = newState.tableCards[stackIdx];
    if (buildStack.owner !== playerIndex) {
      throw new Error('captureOwn: use captureOpponent for opponent builds');
    }
    
    // --- GUARDRAIL: When capturing own build, verify it's valid ---
    if (buildStack && buildStack.type === 'temp_stack') {
      // Player can only capture their own temp stack - this is already validated by owner check above
      // Additional check: if player has a temp stack, they can only capture that specific one
      const playerTempStack = getPlayerTempStack(state, playerIndex);
      if (playerTempStack && playerTempStack.stackId !== targetStackId) {
        throw new Error('Cannot capture another player\'s temp stack - can only capture your own');
      }
    }
    
    // GUARDRAIL: Prevent capture of regular build when player has active temp stack
    const playerTempStack = getPlayerTempStack(state, playerIndex);
    if (playerTempStack && buildStack?.type !== 'temp_stack') {
      throw new Error('Cannot capture other cards when you have an active temp stack - capture your temp stack first');
    }
    
    if (buildStack.cards.length > 0) {
      const buildRank = buildStack.cards[0].rank;
      const allSameRank = buildStack.cards.every(c => c.rank === buildRank);
      if (allSameRank) {
        const possibleValues = getPossibleCaptureValues(buildStack.cards);
        if (!possibleValues.includes(capturingCard.value)) {
          throw new Error(`captureOwn: build can capture with [${possibleValues.join(', ')}], have ${capturingCard.value}`);
        }
      } else {
        if (capturingCard.value !== buildStack.value) {
          throw new Error(`captureOwn: build value is ${buildStack.value}, have ${capturingCard.value}`);
        }
      }
    }
    
    // Build captured - remove from table
    newState.tableCards.splice(stackIdx, 1);
    capturedCards.push(...buildStack.cards);
    
    // --- Recall: Create recall entries for capturer's teammates ---
    // NEW BEHAVIOR: Always create recall entries for teammates of the capturer
    // No Shiya activation required. The recall stores the exact captured item.
    // Create a combined item representing what was captured (build cards + capture card)
    const capturedItem = {
      stackId: buildStack.stackId,
      type: buildStack.type || 'build_stack',
      value: buildStack.value,
      owner: buildStack.owner,
      cards: [
        ...buildStack.cards.map(c => ({ ...c })),
        { ...capturingCard }
      ],
    };
    
    newState = createRecallEntries(newState, playerIndex, capturedItem);
    
    // --- DYNAMIC: Remove teamCapturedBuilds when original owner captures their own build ---
    // If the player who captured is the originalOwner of any build in teamCapturedBuilds,
    // remove those builds from all teammates' lists since they can no longer be rebuilt
    if (newState.teamCapturedBuilds && buildStack.value) {
      const capturedBuildValue = buildStack.value;
      
      // Check all players' teamCapturedBuilds lists
      for (const playerKey of Object.keys(newState.teamCapturedBuilds)) {
        const playerNum = parseInt(playerKey, 10);
        const buildsList = newState.teamCapturedBuilds[playerNum];
        
        if (buildsList && Array.isArray(buildsList)) {
          const originalLength = buildsList.length;
          
          // Filter out builds where:
          // 1. The originalOwner is the player who just captured
          // 2. The build value matches the captured build value
          const updatedBuilds = buildsList.filter(build => {
            return !(build.originalOwner === playerIndex && build.value === capturedBuildValue);
          });
          
          if (updatedBuilds.length !== originalLength) {
            newState.teamCapturedBuilds[playerNum] = updatedBuilds;
            console.log(`[captureOwn] Removed teamCapturedBuilds for Player ${playerNum}: ${originalLength} -> ${updatedBuilds.length} (originalOwner=${playerIndex} captured own build ${capturedBuildValue})`);
          }
        }
      }
    }
  }

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

module.exports = captureOwn;
