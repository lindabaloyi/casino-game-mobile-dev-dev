// Staging feature action handlers for casino game
import { isCard, isTemporaryStack, updateGameState } from './game-state.js';

/**
 * Helper function to remove card from player's hand
 */
function removeCardFromHand(playerHands, playerIndex, cardToRemove) {
  console.log(`[STAGING] Removing ${cardToRemove.rank}${cardToRemove.suit} from player ${playerIndex}'s hand`);

  const currentHand = [...playerHands[playerIndex]];
  const cardIndex = currentHand.findIndex(c =>
    c.rank === cardToRemove.rank && c.suit === cardToRemove.suit
  );

  if (cardIndex === -1) {
    console.error(`[STAGING] Card ${cardToRemove.rank}${cardToRemove.suit} not found in hand`);
    return null;
  }

  currentHand.splice(cardIndex, 1);
  const updatedHands = [...playerHands];
  updatedHands[playerIndex] = currentHand;

  console.log(`[STAGING] Removed card. Hand now has ${currentHand.length} cards`);
  return {
    updatedHands,
    cardRemoved: { ...cardToRemove, source: 'hand' }
  };
}

/**
 * Create a staging stack from hand card dropped on loose table card
 */
export const handleCreateStagingStack = (gameState, handCard, tableCard) => {
  console.log(`[STAGING] Creating staging stack: ${handCard.rank}${handCard.suit} on ${tableCard.rank}${tableCard.suit}`);
  console.log(`[STAGING] Game state before:`, {
    currentPlayer: gameState.currentPlayer,
    tableCardsCount: gameState.tableCards.length,
    handCardsCount: gameState.playerHands[gameState.currentPlayer]?.length || 0
  });

  const { playerHands, tableCards, currentPlayer } = gameState;

  // Validation: Check if player already has active staging stack
  const existingTempStack = tableCards.find(s =>
    isTemporaryStack(s) && s.owner === currentPlayer
  );
  if (existingTempStack) {
    console.error(`[STAGING] Player ${currentPlayer} already has active staging stack`);
    return {
      gameState,
      error: "You can only have one staging stack at a time."
    };
  }

  // Remove card from player's hand
  const removalResult = removeCardFromHand(playerHands, currentPlayer, handCard);
  if (!removalResult) {
    console.error(`[STAGING] Failed to remove card from hand`);
    return {
      gameState,
      error: "Could not remove card from hand."
    };
  }

  const { updatedHands, cardRemoved } = removalResult;

  // Create staging stack with source tracking
  const orderedCards = [
    { ...tableCard, source: 'table' },
    { ...cardRemoved, source: 'hand' }
  ];

  const newTempStack = {
    stackId: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'temporary_stack',
    cards: orderedCards,
    owner: currentPlayer,
    createdAt: Date.now()
  };

  // Remove target card from table and add staging stack
  const targetIndex = tableCards.findIndex(c =>
    isCard(c) && c.rank === tableCard.rank && c.suit === tableCard.suit
  );
  if (targetIndex === -1) {
    console.error(`[STAGING] Target card not found on table`);
    return {
      gameState,
      error: "Target card not found on table."
    };
  }

  const newTableCards = [...tableCards];
  newTableCards.splice(targetIndex, 1, newTempStack);

  const newState = updateGameState(gameState, {
    playerHands: updatedHands,
    tableCards: newTableCards,
    // Set game in staging mode
    isStagingActive: true,
    activeStagingStack: newTempStack.stackId
  });

  console.log(`[STAGING] Staging stack created successfully:`, {
    stackId: newTempStack.stackId,
    owner: newTempStack.owner,
    cardCount: newTempStack.cards.length,
    handCard: `${handCard.rank}${handCard.suit}`,
    tableCard: `${tableCard.rank}${tableCard.suit}`
  });

  return { gameState: newState, success: true };
};

/**
 * Add another card to existing staging stack
 */
export const handleAddToStagingStack = (gameState, handCard, targetStack) => {
  console.log(`[STAGING] Adding ${handCard.rank}${handCard.suit} to staging stack ${targetStack.stackId}`);

  const { playerHands, currentPlayer } = gameState;

  // Remove card from hand
  const removalResult = removeCardFromHand(playerHands, currentPlayer, handCard);
  if (!removalResult) {
    console.error(`[STAGING] Failed to add to staging stack - could not remove card from hand`);
    return { gameState, error: "Could not remove card from hand." };
  }

  const { updatedHands, cardRemoved } = removalResult;

  // Add card to existing staging stack
  const newCards = [...targetStack.cards, { ...cardRemoved, source: 'hand' }];
  const updatedStack = { ...targetStack, cards: newCards };

  // Update table
  const stackIndex = gameState.tableCards.findIndex(s => s.stackId === targetStack.stackId);
  const newTableCards = [...gameState.tableCards];
  newTableCards[stackIndex] = updatedStack;

  const newState = updateGameState(gameState, {
    playerHands: updatedHands,
    tableCards: newTableCards
  });

  console.log(`[STAGING] Added card to staging stack. Total cards: ${updatedStack.cards.length}`);

  return { gameState: newState, success: true };
};

/**
 * Finalize staging stack into permanent build
 */
export const handleFinalizeStagingStack = (gameState, stack, chosenBuildValue = null) => {
  console.log(`[STAGING] Finalizing staging stack ${stack.stackId} with ${stack.cards.length} cards`);

  const { currentPlayer } = gameState;

  // Find possible build combinations with current hand
  const possibleBuilds = findPossibleBuildsFromStagingStack(stack, gameState.playerHands[currentPlayer]);

  console.log(`[STAGING] Found ${possibleBuilds.length} possible builds:`,
    possibleBuilds.map(b => ({ value: b.value, description: b.description })));

  if (possibleBuilds.length === 0) {
    console.error(`[STAGING] No valid builds possible from staging stack`);
    return {
      gameState,
      error: "This stack does not form a valid build with any card in your hand."
    };
  }

  if (possibleBuilds.length > 1 && !chosenBuildValue) {
    // Multiple options - return them for UI selection
    console.log(`[STAGING] Multiple build options available, requiring user selection`);
    return {
      gameState,
      options: possibleBuilds,
      requiresSelection: true
    };
  }

  // Create the build
  const buildValue = chosenBuildValue || possibleBuilds[0].value;

  // Clean up source tracking and create permanent build
  const finalCards = stack.cards.map(({ source, ...card }) => card);

  const newBuild = {
    buildId: `build-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'build',
    cards: finalCards,
    value: buildValue,
    owner: currentPlayer,
    isExtendable: true,
    createdFromStaging: true
  };

  // Remove staging stack and add permanent build
  const newTableCards = gameState.tableCards.filter(s => s.stackId !== stack.stackId);
  newTableCards.push(newBuild);

  const newState = updateGameState(gameState, {
    tableCards: newTableCards,
    isStagingActive: false,
    activeStagingStack: null,
  });

  // Move to next player turn
  const finalState = updateGameState(newState, {
    currentPlayer: (currentPlayer + 1) % 2
  });

  console.log(`[STAGING] Staging stack finalized into build:`, {
    buildId: newBuild.buildId,
    value: newBuild.value,
    cardCount: newBuild.cards.length,
    owner: newBuild.owner
  });

  return { gameState: finalState, success: true };
};

/**
 * Cancel staging stack and restore cards to original positions
 */
export const handleCancelStagingStack = (gameState, stack) => {
  console.log(`[STAGING] Canceling staging stack ${stack.stackId} with ${stack.cards.length} cards`);

  const { playerHands, tableCards, playerCaptures, currentPlayer } = gameState;

  // Restore cards based on source
  let newPlayerHands = [...playerHands];
  let newTableCards = [...tableCards];
  let newPlayerCaptures = playerCaptures ? [...playerCaptures] : [];

  const handCards = [];
  const looseTableCards = [];
  const opponentCaptureCards = [];

  // Categorize cards by original source
  for (const card of stack.cards) {
    const cleanCard = { ...card };
    delete cleanCard.source;

    switch (card.source) {
      case 'hand':
        handCards.push(cleanCard);
        break;
      case 'table':
        looseTableCards.push(cleanCard);
        break;
      case 'opponentCapture':
        opponentCaptureCards.push(cleanCard);
        break;
      default:
        console.warn(`[STAGING] Unknown card source: ${card.source}`);
        break;
    }
  }

  // Restore to hand
  if (handCards.length > 0) {
    console.log(`[STAGING] Restoring ${handCards.length} cards to hand`);
    newPlayerHands[currentPlayer] = [...newPlayerHands[currentPlayer], ...handCards];
  }

  // Restore loose cards to table
  if (looseTableCards.length > 0) {
    console.log(`[STAGING] Restoring ${looseTableCards.length} loose cards to table`);
    newTableCards.push(...looseTableCards);
  }

  // Restore opponent capture cards (add to last capture group)
  if (opponentCaptureCards.length > 0 && newPlayerCaptures.length > 0) {
    const opponentIndex = 1 - currentPlayer;
    const lastGroupIndex = newPlayerCaptures[opponentIndex].length - 1;
    if (lastGroupIndex >= 0) {
      console.log(`[STAGING] Restoring opponent capture cards to group ${lastGroupIndex}`);
      newPlayerCaptures[opponentIndex][lastGroupIndex].push(...opponentCaptureCards);
    } else {
      // No captures yet, create new group
      console.log(`[STAGING] Creating new opponent capture group`);
      if (!newPlayerCaptures[opponentIndex]) newPlayerCaptures[opponentIndex] = [];
      newPlayerCaptures[opponentIndex].push(opponentCaptureCards);
    }
  }

  // Remove the staging stack
  newTableCards = newTableCards.filter(s => s.stackId !== stack.stackId);

  const newState = updateGameState(gameState, {
    playerHands: newPlayerHands,
    tableCards: newTableCards,
    playerCaptures: newPlayerCaptures,
    isStagingActive: false,
    activeStagingStack: null
  });

  console.log(`[STAGING] Staging stack canceled successfully`);

  return { gameState: newState, success: true };
};

/**
 * Helper function to find possible builds from staging stack
 */
function findPossibleBuildsFromStagingStack(stagingStack, playerHand) {
  const builds = [];
  const stagingCardSum = stagingStack.cards.reduce((sum, card) => sum + (card.value || 0), 0);

  // Check each hand card for possible builds
  for (const handCard of playerHand) {
    const totalValue = stagingCardSum + (handCard.value || 0);
    if (totalValue <= 10) {
      builds.push({
        value: totalValue,
        description: `${stagingCardSum} + ${handCard.value} = ${totalValue}`,
        capturedCard: handCard
      });
    }
  }

  return builds;
}
