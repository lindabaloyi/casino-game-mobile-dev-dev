/**
 * Add To Staging Stack Action Handler
 * Player adds card to existing temporary stack
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('AddToStagingStack');

function handleAddToStagingStack(gameManager, playerIndex, action) {
  console.log('[TEMP_STACK] 🏃 ADD_TO_STAGING_STACK executing (FIXED VERSION)');
  console.log('[TEMP_STACK] Input action payload:', JSON.stringify(action.payload, null, 2));

  const { gameId, stackId, card, source } = action.payload;
  const gameState = gameManager.getGameState(gameId);
  const cardIdentifier = `${card.rank}${card.suit}`;

  console.log('[TEMP_STACK] Operation details:', {
    gameId,
    stackId,
    card: cardIdentifier,
    cardValue: card.value,
    source,
    playerIndex
  });

  console.log('[TEMP_STACK] Game state before operation:', {
    gameId,
    currentPlayer: gameState.currentPlayer,
    playerIndex,
    playerHandSize: gameState.playerHands?.[playerIndex]?.length || 0,
    playerHand: gameState.playerHands?.[playerIndex]?.map(c => `${c.rank}${c.suit}`) || [],
    tableCardsCount: gameState.tableCards?.length || 0,
    tableCards: gameState.tableCards?.map((card, index) => ({
      index,
      type: card?.type || 'loose',
      stackId: card?.stackId,
      cardCount: card?.cards?.length || 1,
      cards: card?.cards?.map(c => `${c.rank}${c.suit}`) || [`${card?.rank}${card?.suit}`],
      value: card?.value || (card?.rank ? require('../GameState').rankValue(card.rank) : 'n/a'),
      owner: card?.owner
    })) || []
  });

  // ✅ STEP 1: REMOVE CARD FROM ALL OTHER LOCATIONS FIRST
  console.log('[TEMP_STACK] 🔍 Removing card from all other locations before adding...');

  // 1A. Remove from other temp stacks (including target stack if card is already there)
  for (let i = gameState.tableCards.length - 1; i >= 0; i--) {
    const item = gameState.tableCards[i];

    if (item.type === 'temporary_stack' && item.stackId !== stackId) {
      // Check if this stack contains our card
      const cardIndex = item.cards.findIndex(stackCard =>
        `${stackCard.rank}${stackCard.suit}` === cardIdentifier
      );

      if (cardIndex >= 0) {
        console.log(`[TEMP_STACK] Removing ${cardIdentifier} from temp stack ${item.stackId} at position ${cardIndex}`);
        item.cards.splice(cardIndex, 1);

        // Update stack value
        item.value = item.cards.reduce((sum, c) => sum + (c.value || 0), 0);

        // If stack is now empty, remove it entirely
        if (item.cards.length === 0) {
          console.log(`[TEMP_STACK] Removing empty stack ${item.stackId}`);
          gameState.tableCards.splice(i, 1);
        }
      }
    }
  }

  // 1B. Remove from loose cards on table
  const looseIndex = gameState.tableCards.findIndex(item =>
    !item.type && // Not a temp stack (loose card)
    item.rank && item.suit &&
    `${item.rank}${item.suit}` === cardIdentifier
  );

  if (looseIndex >= 0) {
    console.log(`[TEMP_STACK] Removing ${cardIdentifier} from loose cards at index ${looseIndex}`);
    gameState.tableCards.splice(looseIndex, 1);
  }

  // 1C. Remove from source location (hand or captures)
  if (source === 'hand') {
    const originalHandSize = gameState.playerHands[playerIndex].length;
    gameState.playerHands[playerIndex] = gameState.playerHands[playerIndex].filter(c =>
      `${c.rank}${c.suit}` !== cardIdentifier
    );
    const newHandSize = gameState.playerHands[playerIndex].length;

    if (originalHandSize !== newHandSize) {
      console.log(`[TEMP_STACK] Removed ${cardIdentifier} from hand (${originalHandSize} → ${newHandSize})`);
    }
  } else if (source === 'captured') {
    const originalCaptureSize = gameState.playerCaptures[playerIndex].length;
    gameState.playerCaptures[playerIndex] = gameState.playerCaptures[playerIndex].filter(c =>
      `${c.rank}${c.suit}` !== cardIdentifier
    );
    const newCaptureSize = gameState.playerCaptures[playerIndex].length;

    if (originalCaptureSize !== newCaptureSize) {
      console.log(`[TEMP_STACK] Removed ${cardIdentifier} from captures (${originalCaptureSize} → ${newCaptureSize})`);
    }
  }

  // ✅ STEP 2: FIND OR CREATE TARGET TEMP STACK
  let tempStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === stackId
  );

  if (!tempStack) {
    console.log(`[TEMP_STACK] Creating new temp stack ${stackId} for player ${playerIndex}`);
    tempStack = {
      type: 'temporary_stack',
      stackId: stackId,
      cards: [],
      owner: playerIndex,
      value: 0
    };
    gameState.tableCards.push(tempStack);
  }

  // ✅ STEP 3: ADD CARD TO TARGET STACK
  console.log('[TEMP_STACK] Adding card to target stack:', {
    stackId: tempStack.stackId,
    beforeCount: tempStack.cards.length,
    card: cardIdentifier,
    source
  });

  tempStack.cards.push({
    ...card,
    source: source || 'unknown'
  });

  // Update stack value
  tempStack.value = tempStack.cards.reduce((sum, c) => sum + (c.value || 0), 0);

  console.log('[TEMP_STACK] ✅ Card added successfully:', {
    stackId: tempStack.stackId,
    newCardCount: tempStack.cards.length,
    newValue: tempStack.value,
    cardIds: tempStack.cards.map(c => `${c.rank}${c.suit}`)
  });

  // ✅ STEP 4: VALIDATE NO DUPLICATES
  const { validateNoDuplicates } = require('../GameState');
  const isValid = validateNoDuplicates(gameState);
  if (!isValid) {
    console.error('[TEMP_STACK] ❌ CRITICAL: Duplicates detected after addToStagingStack!');
    // Don't throw - let game continue but log the issue
  }

  return gameState;
}

module.exports = handleAddToStagingStack;
