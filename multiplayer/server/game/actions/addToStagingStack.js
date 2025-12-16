/**
 * Add To Staging Stack Action Handler
 * Player adds card to existing temporary stack
 */

const { createLogger } = require('../../utils/logger');
const logger = createLogger('AddToStagingStack');

function handleAddToStagingStack(gameManager, playerIndex, action) {
  console.log('[TEMP_STACK] 🏃 ADD_TO_STAGING_STACK executing (AUGMENTATION MODE)');
  console.log('[TEMP_STACK] Input action payload:', JSON.stringify(action.payload, null, 2));

  const { gameId, stackId, card, source } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[TEMP_STACK] Operation details:', {
    gameId,
    stackId,
    card: `${card.rank}${card.suit}`,
    cardValue: card.value,
    source,
    playerIndex,
    philosophy: 'ALWAYS ALLOW, NEVER VALIDATE'
  });

  // 🎯 AUGMENTATION PHILOSOPHY: Find or create temp stack
  let tempStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === stackId
  );

  if (!tempStack) {
    console.log('[AUGMENTATION] Creating new temp stack for player (stack didn\'t exist)');
    tempStack = {
      type: 'temporary_stack',
      stackId: stackId || `staging-${Date.now()}`,
      cards: [],
      owner: playerIndex,
      value: 0
    };
    gameState.tableCards.push(tempStack);
  }

  // 🎯 ALWAYS ALLOW: Just add the card, no validation or restrictions
  console.log('[AUGMENTATION] Adding card to stack (freedom philosophy):', {
    stackId: tempStack.stackId,
    beforeCount: tempStack.cards.length,
    card: `${card.rank}${card.suit}`,
    source,
    freedomEnabled: true
  });

  tempStack.cards.push({
    ...card,
    source: source || 'unknown'
  });

  // Update value if available
  if (card.value) {
    tempStack.value = (tempStack.value || 0) + card.value;
  }

  // 🎯 CLEAN SOURCE: Remove from hand/captures only (table cards stay where they are for augmentation)
  if (source === 'hand') {
    const handIndex = gameState.playerHands[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (handIndex >= 0) {
      gameState.playerHands[playerIndex].splice(handIndex, 1);
      console.log('[AUGMENTATION] Removed from hand');
    }
  } else if (source === 'captured') {
    const captureIndex = gameState.playerCaptures[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (captureIndex >= 0) {
      gameState.playerCaptures[playerIndex].splice(captureIndex, 1);
      console.log('[AUGMENTATION] Removed from captures');
    }
  } else if (source === 'table') {
    // ✅ FIX: Remove table card from its original position to avoid duplicates
    const cardIndex = gameState.tableCards.findIndex(tableCard =>
      tableCard.rank === card.rank &&
      tableCard.suit === card.suit &&
      (!tableCard.type || tableCard.type === 'loose') // Only remove loose cards, not temp stacks
    );

    if (cardIndex >= 0) {
      console.log(`[AUGMENTATION] Removing table card from index ${cardIndex}: ${card.rank}${card.suit}`);
      gameState.tableCards.splice(cardIndex, 1);
    } else {
      console.warn(`[AUGMENTATION] Warning: Could not find table card ${card.rank}${card.suit} to remove`);
    }
  }

  console.log('[AUGMENTATION] ✅ Card added successfully:', {
    stackId: tempStack.stackId,
    newCardCount: tempStack.cards.length,
    newValue: tempStack.value,
    remainingHand: gameState.playerHands[playerIndex].length,
    freedomAchieved: true
  });

  // 🎯 OPTIONAL VALIDATION: Log but don't restrict (player freedom)
  const { validateNoDuplicates } = require('../GameState');
  const hasDuplicates = !validateNoDuplicates(gameState);
  if (hasDuplicates) {
    console.log('[AUGMENTATION] ⚠️ Duplicates detected, but allowing (player choice)');
  }

  return gameState;
}

module.exports = handleAddToStagingStack;
