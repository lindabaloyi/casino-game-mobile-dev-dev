/**
 * completeCapture
 * Performs the capture using the pending cards. Verifies that the total value of
 * the pending cards equals the build's value. Moves both build cards and pending
 * cards to the capturing player's capture pile.
 */

const { cloneState, nextTurn, startPlayerTurn, triggerAction, finalizeGame } = require('../');
const { createRecallEntries } = require('../recallHelpers');

function completeCapture(state, payload, playerIndex) {
  const { stackId, captureCard, captureCardSource } = payload;

  console.log('[completeCapture]', { stackId, playerIndex, captureCard });

  if (!stackId) throw new Error('completeCapture: missing stackId');

  let newState = cloneState(state);

  // Remove capture card from player's hand if it came from hand
  if (captureCard && captureCardSource === 'hand') {
    const hand = newState.players[playerIndex].hand;
    const handIdx = hand.findIndex(c => c.rank === captureCard.rank && c.suit === captureCard.suit);
    if (handIdx !== -1) {
      hand.splice(handIdx, 1);
      console.log('[completeCapture] Removed capture card from hand');
    }
  }

  const stackIdx = newState.tableCards.findIndex(
    tc => tc.type === 'build_stack' && tc.stackId === stackId
  );
  if (stackIdx === -1) throw new Error(`completeCapture: build stack "${stackId}" not found`);

  const buildStack = newState.tableCards[stackIdx];
  if (!buildStack.pendingCapture) {
    throw new Error('completeCapture: no pending capture for this build');
  }

  const pending = buildStack.pendingCapture;
  const totalPending = pending.cards.reduce((sum, item) => sum + item.card.value, 0);

  if (totalPending !== buildStack.value) {
    // Restore all cards and throw
    for (const item of pending.cards) {
      const card = item.card;
      const source = item.source;
      if (source === 'table') {
        newState.tableCards.push(card);
      } else if (source === 'hand') {
        newState.players[playerIndex].hand.push(card);
      }
      // Note: captured cards are not restored here since capture only supports hand and table
    }
    delete buildStack.pendingCapture;
    throw new Error(`completeCapture: pending cards sum to ${totalPending}, but build value is ${buildStack.value}`);
  }

  // Move build cards and pending cards to capturing player's captures
  const capturedBuildCards = [...buildStack.cards];
  const capturedPendingCards = pending.cards.map(item => item.card);
  
  // Collect all captured cards
  const allCapturedCards = [...capturedBuildCards, ...capturedPendingCards];
  
  // Add the capture card (hand card that triggered completion) if provided
  if (captureCard) {
    allCapturedCards.push({ ...captureCard, source: captureCardSource });
    console.log('[completeCapture] Including capture card:', captureCard.rank, captureCard.suit);
  }
  
  newState.players[playerIndex].captures.push(...allCapturedCards);

  // Track last capture for end-of-game cleanup
  newState.lastCapturePlayer = playerIndex;

  // Remove build from table
  newState.tableCards.splice(stackIdx, 1);

  // Clear pending capture (already gone with build)
  delete buildStack.pendingCapture;

  // --- Recall: Create recall entries for capturer's teammates ---
  // NEW BEHAVIOR: Always create recall entries for teammates of the capturer
  // No Shiya activation required. The recall stores the exact captured item.
  // Create a combined item representing what was captured (build cards + pending cards)
  const capturedItem = {
    stackId: buildStack.stackId,
    type: 'build_stack',
    value: buildStack.value,
    owner: buildStack.owner,
    cards: [
      ...capturedBuildCards.map(c => ({ ...c })),
      ...capturedPendingCards.map(c => ({ ...c }))
    ],
  };
  
  newState = createRecallEntries(newState, playerIndex, capturedItem);

  console.log('[completeCapture] Success – captured build', stackId);

  // Mark turn as started and ended (capture auto-ends turn)
  startPlayerTurn(newState, playerIndex);
  triggerAction(newState, playerIndex);
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

module.exports = completeCapture;
