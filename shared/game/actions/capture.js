/**
 * capture
 * Player captures either loose card or build stack.
 */

const { cloneState, nextTurn, startPlayerTurn, triggerAction, finalizeGame } = require('../');

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

function capture(state, payload, playerIndex) {
  const { card, targetType, targetRank, targetSuit, targetStackId } = payload;

  if (!card?.rank || !card?.suit) {
    throw new Error('capture: invalid card payload');
  }

  const newState = cloneState(state);
  const hand = newState.players[playerIndex].hand;

  const handIdx = hand.findIndex(c => c.rank === card.rank && c.suit === card.suit);
  if (handIdx === -1) {
    throw new Error(`capture: card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`);
  }
  const [capturingCard] = hand.splice(handIdx, 1);

  const capturedCards = [];

  if (targetType === 'loose') {
    if (!targetRank || !targetSuit) {
      throw new Error('capture: loose target missing rank/suit');
    }
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === targetRank && tc.suit === targetSuit,
    );
    if (tableIdx === -1) {
      throw new Error(`capture: target card ${targetRank}${targetSuit} not found on table`);
    }
    const targetCard = newState.tableCards[tableIdx];
    if (capturingCard.rank !== targetCard.rank) {
      throw new Error(`capture: can only capture identical cards`);
    }
    newState.tableCards.splice(tableIdx, 1);
    capturedCards.push(targetCard);
  } else if (targetType === 'build') {
    if (!targetStackId) {
      throw new Error('capture: build target missing stackId');
    }
    const stackIdx = newState.tableCards.findIndex(
      tc => (tc.type === 'build_stack' || tc.type === 'temp_stack') && tc.stackId === targetStackId,
    );
    if (stackIdx === -1) {
      throw new Error(`capture: build stack "${targetStackId}" not found`);
    }
    const buildStack = newState.tableCards[stackIdx];
    if (buildStack.cards.length > 0) {
      const buildRank = buildStack.cards[0].rank;
      const allSameRank = buildStack.cards.every(c => c.rank === buildRank);
      if (allSameRank) {
        const possibleValues = getPossibleCaptureValues(buildStack.cards);
        if (!possibleValues.includes(capturingCard.value)) {
          throw new Error(`capture: build can be captured with [${possibleValues.join(', ')}], have ${capturingCard.value}`);
        }
      } else {
        if (capturingCard.value !== buildStack.value) {
          throw new Error(`capture: build value is ${buildStack.value}, have ${capturingCard.value}`);
        }
      }
    } else {
      if (capturingCard.value !== buildStack.value) {
        throw new Error(`capture: card value ${capturingCard.value} does not match build value ${buildStack.value}`);
      }
    }
    
    // Track captured teammate builds for cooperative rebuild in party mode
    // CRITICAL: Only the OTHER teammate (not the original builder) can rebuild
    // When opponent captures your teammate's build, add to the OTHER teammate's list
    const isPartyMode = state.playerCount === 4 && state.players.some(p => p.team);
    
    if (isPartyMode && buildStack && buildStack.type === 'build_stack') {
      const stackOwner = buildStack.owner;
      
      if (stackOwner !== undefined && stackOwner !== null) {
        const stackOwnerTeam = stackOwner < 2 ? 0 : 1;
        const capturingPlayerTeam = playerIndex < 2 ? 0 : 1;
        
        // Check if the ORIGINAL OWNER was on the SAME TEAM as the capturing player
        // This means: "My teammate built this, opponent captured it"
        const isOwnTeamBuild = stackOwnerTeam === capturingPlayerTeam;
        
        if (isOwnTeamBuild) {
          // Find the other teammate (not the original builder)
          const targetPlayer = stackOwner ^ 1; // XOR to get teammate
          
          // Validate build qualifies for team capture
          if (!buildStack.value || !buildStack.cards || buildStack.cards.length === 0) {
            console.warn(`[capture] ⚠️ Build ${buildStack.stackId} does NOT qualify for teamCapturedBuilds - missing value or cards`);
          } else {
            console.log(`[capture] ✅ Adding to teamCapturedBuilds: Player ${targetPlayer} can rebuild (originalOwner=Player ${stackOwner}, capturedBy=Player ${playerIndex}, value=${buildStack.value})`);
          }
          
          // Ensure teamCapturedBuilds exists
          if (!newState.teamCapturedBuilds) {
            newState.teamCapturedBuilds = {};
          }
          
          // Initialize player array if needed
          if (!newState.teamCapturedBuilds[targetPlayer]) {
            newState.teamCapturedBuilds[targetPlayer] = [];
          }
          
          // Add to OTHER teammate's list (not the original builder)
          newState.teamCapturedBuilds[targetPlayer].push({
            value: buildStack.value,
            originalOwner: stackOwner,
            capturedBy: playerIndex,
            cards: buildStack.cards,
            stackId: buildStack.stackId,
          });
          
          console.log(`[capture] 📊 teamCapturedBuilds for Player ${targetPlayer} now has ${newState.teamCapturedBuilds[targetPlayer].length} entries`);
        } else {
          // Opponent's build was captured - don't add to teamCapturedBuilds
          console.log(`[capture] ℹ️ Not adding to teamCapturedBuilds: captured opponent's build (originalOwner=Player ${stackOwner}, originalTeam=${stackOwnerTeam}, myTeam=${capturingPlayerTeam})`);
        }
      }
    }
    
    newState.tableCards.splice(stackIdx, 1);
    capturedCards.push(...buildStack.cards);
  } else {
    throw new Error(`capture: unknown targetType "${targetType}"`);
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

module.exports = capture;
