/**
 * Add To Own Temp Action Handler
 * Player adds card to existing temp stack
 * Implements freedom of play approach like addToOwnBuild
 */

const handleCapture = require('../capture/capture');
const { updateBuildCalculator } = require('../../logic/utils/tempStackBuildCalculator');

function handleAddToOwnTemp(gameManager, playerIndex, action, gameId) {
  console.log('🚨🚨🚨 EMERGENCY: handleAddToOwnTemp EXECUTING 🚨🚨🚨');
  console.log('🚨🚨🚨 Action payload:', JSON.stringify(action.payload));
  console.log('🚨🚨🚨 Player:', playerIndex, 'Game:', gameId);
  console.log('[TEMP_STACK] 🏃 ADD_TO_OWN_TEMP executing (FREEDOM OF PLAY)');
  console.log('[TEMP_STACK] Input action payload:', JSON.stringify(action.payload, null, 2));

  // 🎯 DEBUG: Log opponent card handling specifically
  if (action.payload.source === 'oppTopCard') {
    console.log('[🎯 OPP-TEMP-STACK-SERVER] Processing opponent card for temp stack:', {
      opponentId: action.payload.opponentId,
      card: `${action.payload.card.rank}${action.payload.card.suit}`,
      stackId: action.payload.stackId,
      playerIndex,
      gameId
    });
  }

  const { stackId, card, source } = action.payload;
  const gameState = gameManager.getGameState(gameId);

  console.log('[TEMP_STACK] Operation details:', {
    gameId,
    stackId,
    card: `${card.rank}${card.suit}`,
    cardValue: card.value,
    source,
    playerIndex,
    philosophy: 'ALWAYS FIND OR CREATE'
  });

  // 🎯 EARLY VALIDATION: Check for undefined stackId (client bug)
  if (!stackId || stackId === 'undefined') {
    console.log('[TEMP_STACK] 🚨 CLIENT BUG: Received undefined stackId from client');
    throw new Error('Invalid temp stack selection. Please try again.');
  }

  // 🎯 GUARD RAIL: Prevent multiple hand card additions to temp stacks per turn
  if (source === 'hand') {
    console.log('[TEMP_STACK_GUARD] 🎯 Checking hand card usage for temp stacks this turn');

    // Initialize tracking array if it doesn't exist
    if (!gameState.tempStackHandCardUsedThisTurn) {
      gameState.tempStackHandCardUsedThisTurn = [false, false];
      console.log('[TEMP_STACK_GUARD] 🆕 Initialized temp stack hand card tracking');
    }

    // Check if player has already used a hand card for temp stacks this turn
    if (gameState.tempStackHandCardUsedThisTurn[playerIndex]) {
      console.log('[TEMP_STACK_GUARD] ❌ BLOCKED: Player already added hand card to temp stack this turn');
      throw new Error('Cannot add multiple hand cards to temp stacks in the same turn. You must resolve your temp stack or wait for your next turn.');
    }

    // Mark hand card as used for temp stacks this turn
    gameState.tempStackHandCardUsedThisTurn[playerIndex] = true;
    console.log('[TEMP_STACK_GUARD] ✅ ALLOWED: Marked hand card usage for temp stack this turn');
  }

  // 🎯 DIRECT CAPTURE CHECK: FIRST CHECK - If dragging hand card that equals temp stack value
  if (source === 'hand') {
    // Find the temp stack to check its value
    const tempStack = gameState.tableCards.find(item =>
      item.type === 'temporary_stack' && item.stackId === stackId
    );

    if (tempStack && card.value === tempStack.value) {
<<<<<<< HEAD
=======
      console.log('[DIRECT_CAPTURE] 🎯 Hand card matches temp stack value - executing direct capture:', {
        cardValue: card.value,
        stackValue: tempStack.value,
        stackId: tempStack.stackId,
        tempStackCards: tempStack.cards.map(c => `${c.rank}${c.suit}`)
      });

>>>>>>> parent of e2b4bbc (perf: remove all console.log statements for optimal performance)
      // Execute capture instead of adding to stack
      // Include capturing card in the captured set (like build captures)
      return handleCapture(gameManager, playerIndex, {
        type: 'capture',
        payload: {
          tempStackId: tempStack.stackId, // Include the actual stack ID for removal
          captureValue: card.value,
          targetCards: [...tempStack.cards, card], // Include capturing card on top
          capturingCard: card // Mark for hand removal
        }
      }, gameId);
    }
  }

  // Find the temp stack - no auto-creation fallback
  const tempStack = gameState.tableCards.find(item =>
    item.type === 'temporary_stack' && item.stackId === stackId
  );

  if (!tempStack) {
    const error = new Error(`Temp stack '${stackId}' not found. Cannot add card to non-existent stack.`);
    console.error('[TEMP_STACK_ERROR] Stack not found:', {
      requestedStackId: stackId,
      availableStacks: gameState.tableCards
        .filter(item => item.type === 'temporary_stack')
        .map(stack => ({ id: stack.stackId, owner: stack.owner, cards: stack.cards.length }))
    });
    throw error;
  }

  // 🎯 COMPLETE FREEDOM: No validation for temp stack building
  // All validation deferred to finalizeStagingStack
<<<<<<< HEAD
=======
  console.log('[VALIDATION] 🎯 Skipping validation for temp stack (player freedom)');

  // Basic sanity checks only (no game rule validation)
  if (!card || !card.rank || !card.suit) {
    console.error('[VALIDATION_ERROR] Invalid card data');
    throw new Error('Invalid card data');
  }
>>>>>>> parent of e2b4bbc (perf: remove all console.log statements for optimal performance)

  if (!source) {
    console.error('[VALIDATION_ERROR] Card source not specified');
    throw new Error('Card source not specified');
  }

  // NOTE: No ownership, size, or rule validation for temp stacks
  // Freedom-first approach: Let players build anything during temp phase

  // 🎯 EXECUTION: Add card to stack (no size limits)
  console.log('[EXECUTION] Adding card to stack (unlimited):', {
    stackId: tempStack.stackId,
    beforeCount: tempStack.cards.length,
    card: `${card.rank}${card.suit}`,
    source,
    flexibleStacking: true
  });

  // Initialize cardPositions array if it doesn't exist (for backward compatibility)
  if (!tempStack.cardPositions) {
    tempStack.cardPositions = [];
    // Populate with existing cards' positions (best effort)
    tempStack.cards.forEach((existingCard, index) => {
      tempStack.cardPositions.push({
        cardId: `${existingCard.rank}${existingCard.suit}`,
        originalIndex: null, // Unknown for existing cards
        source: existingCard.source || 'unknown'
      });
    });
  }

  tempStack.cards.push({
    ...card,
    source: source || 'unknown',
    addedAt: Date.now(),
    addedBy: playerIndex
  });

  // Track the position of the newly added card
  let originalIndex = null;
  if (source === 'table' || source === 'loose') {
    // For table cards, find their original position
    // Note: This is approximate since we don't have perfect tracking
    // In a real implementation, this would need better state management
    originalIndex = gameState.tableCards.findIndex(tableCard =>
      tableCard.rank === card.rank &&
      tableCard.suit === card.suit &&
      (!tableCard.type || tableCard.type === 'loose')
    );
  }

  tempStack.cardPositions.push({
    cardId: `${card.rank}${card.suit}`,
    originalIndex: originalIndex,
    source: source || 'unknown'
  });

  // 🎯 REAL-TIME BUILD CALCULATOR: Update build state as cards are added (ALWAYS RUNS)
  console.log('[DEBUG] 🎯 About to call build calculator - THIS SHOULD ALWAYS APPEAR');
  console.log('[DEBUG] Source check - source:', source, 'card.value:', card.value, 'tempStack.value:', tempStack.value);
  console.log('[DEBUG] Direct capture check result:', source === 'hand' && card.value === tempStack.value);
  console.log('[DEBUG] updateBuildCalculator imported:', typeof updateBuildCalculator);
  console.log('[DEBUG] tempStack before build calc:', {
    stackId: tempStack.stackId,
    cards: tempStack.cards.map(c => `${c.rank}${c.suit}(${c.value})`),
    value: tempStack.value,
    hasBuildValue: 'buildValue' in tempStack
  });

  try {
    console.log('[BUILD_CALCULATOR] 🎯 Updating real-time build calculator:', {
      stackId: tempStack.stackId,
      beforeCards: tempStack.cards.length - 1,
      newCardValue: card.value,
      currentBuildValue: tempStack.buildValue,
      currentRunningSum: tempStack.runningSum
    });

    updateBuildCalculator(tempStack, card.value);

    console.log('[BUILD_CALCULATOR] ✅ Build calculator updated:', {
      displayValue: tempStack.displayValue,
      isValid: tempStack.isValid,
      isBuilding: tempStack.isBuilding,
      buildValue: tempStack.buildValue,
      runningSum: tempStack.runningSum,
      segmentCount: tempStack.segmentCount
    });
  } catch (error) {
    console.error('[BUILD_CALCULATOR] ❌ ERROR in build calculator:', error.message);
    console.error('[BUILD_CALCULATOR] Stack trace:', error.stack);
    // Continue execution even if build calculator fails
  }

  // Update stack value (simple sum for backward compatibility)
  tempStack.value = tempStack.cards.reduce((sum, c) => sum + (c.value || 0), 0);
  tempStack.lastUpdated = Date.now();

  // 🎯 SOURCE REMOVAL: Remove card from original source
  console.log('[EXECUTION] Removing card from source:', { source, card: `${card.rank}${card.suit}` });

  try {
    removeCardFromSource(gameState, card, source, playerIndex, action.payload.opponentId);
    console.log('[EXECUTION] ✅ Card successfully removed from source');
  } catch (error) {
    console.error('[EXECUTION_ERROR] Failed to remove card from source:', error.message);
    throw error;
  }

  // 🎯 COMPLEX BUILD CHECK: After adding card, check if we now have complex build options
<<<<<<< HEAD
=======
  console.log('[COMPLEX_BUILD_CHECK] Checking for complex build options after adding card:', {
    stackId: tempStack.stackId,
    cardCount: tempStack.cards.length,
    isSameValueStack: tempStack.isSameValueStack,
    cardValues: tempStack.cards.map(c => c.value)
  });
>>>>>>> parent of e2b4bbc (perf: remove all console.log statements for optimal performance)

  // Check if this is now a complex stack (3+ cards, not same-value)
  const isComplexStack = tempStack.cards.length >= 3 && !tempStack.isSameValueStack;

  if (isComplexStack) {
<<<<<<< HEAD
    const { detectNormalBuildCombinations } = require('../../logic/utils/tempStackBuildCalculator');
=======
    console.log('[COMPLEX_BUILD_CHECK] ✅ Complex stack detected - checking for build options');

    const { detectNormalBuildCombinations, detectBaseBuild } = require('../../logic/utils/tempStackBuildCalculator');
>>>>>>> parent of e2b4bbc (perf: remove all console.log statements for optimal performance)
    const playerHand = gameState.playerHands[playerIndex];
    const cardValues = tempStack.cards.map(c => c.value);

    const availableOptions = [];

    // Check for Base Build options
    for (let baseIndex = 0; baseIndex < tempStack.cards.length; baseIndex++) {
      const potentialBase = tempStack.cards[baseIndex];
      const supports = tempStack.cards.filter((_, index) => index !== baseIndex);
      const supportsSum = supports.reduce((s, c) => s + c.value, 0);

      if (supportsSum === potentialBase.value && potentialBase.value <= 10) {
        // Check position requirements
        let isValidBase = false;
        if (potentialBase.source === 'oppTopCard') {
          isValidBase = (baseIndex > 0); // oppTopCard base anywhere except bottom
        } else if (potentialBase.source === 'table' || potentialBase.source === 'hand') {
          isValidBase = (baseIndex === 0); // table/hand base must be bottom
        }

        if (isValidBase) {
          // Check if player has the capture card
          const hasCaptureCard = playerHand.some(card => card.value === potentialBase.value);
          if (hasCaptureCard) {
            availableOptions.push({
              type: 'build',
              label: `Build ${potentialBase.value} (base build)`,
              value: potentialBase.value,
              buildType: 'base',
              actionType: 'createBuildFromTempStack'
            });
            console.log(`[COMPLEX_BUILD_CHECK] ✅ Added base build option: ${potentialBase.value}`);
          }
        }
      }
    }

    // Check for Normal Build options
    const normalCombinations = detectNormalBuildCombinations(cardValues);

    normalCombinations.forEach((combo) => {
      // Check if player has the capture card for this build value
      const hasCaptureCard = playerHand.some(card => card.value === combo.buildValue);
      if (hasCaptureCard) {
        availableOptions.push({
          type: 'build',
          label: `Build ${combo.buildValue} (normal build)`,
          value: combo.buildValue,
          buildType: 'normal',
          segments: combo.segments,
          actionType: 'createBuildFromTempStack'
        });
        console.log(`[COMPLEX_BUILD_CHECK] ✅ Added normal build option: ${combo.buildValue} (${combo.segmentCount} segments)`);
      }
    });

    // If we have build options, send modal data packet instead of just updating the stack
    if (availableOptions.length > 0) {
      // Always add capture option
      availableOptions.push({
        type: 'capture',
        label: `Capture all (${tempStack.cards.length} cards)`,
        value: tempStack.cards[0]?.value || 0,
        actionType: 'captureTempStack'
      });

      console.log('[COMPLEX_BUILD_CHECK] 🎯 Complex build options found - sending modal data packet:', {
        optionCount: availableOptions.length,
        options: availableOptions.map(o => `${o.label} (${o.type})`)
      });

      // Create a special action to trigger modal on client
      // We'll modify the game state to include a pending modal action
      gameState.pendingModalAction = {
        type: 'showTempStackOptions',
        payload: {
          tempStackId: tempStack.stackId,
          availableOptions: availableOptions,
          isComplexBuild: true
        }
      };

      console.log('[COMPLEX_BUILD_CHECK] 📦 Modal data packet attached to game state');
    } else {
      console.log('[COMPLEX_BUILD_CHECK] ❌ No build options available - stack remains basic');
    }
  } else {
    console.log('[COMPLEX_BUILD_CHECK] ❌ Not a complex stack (same-value or < 3 cards)');
  }

  console.log('[EXECUTION] ✅ Card added successfully (game-appropriate):', {
    stackId: tempStack.stackId,
    newCardCount: tempStack.cards.length,
    newValue: tempStack.value,
    remainingHand: gameState.playerHands[playerIndex]?.length || 0,
    unlimitedStacking: true,
    autoCreated: !!tempStack.createdAt,
    hasPendingModal: !!gameState.pendingModalAction
  });

  return gameState;
}

/**
 * Remove card from its source location
 * Handles hand, captures, and table sources
 */
function removeCardFromSource(gameState, card, source, playerIndex, opponentId) {
  console.log('[SOURCE_REMOVAL] Removing card from source:', {
    card: `${card.rank}${card.suit}`,
    source,
    playerIndex
  });

  if (source === 'hand') {
    const handIndex = gameState.playerHands[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (handIndex >= 0) {
      gameState.playerHands[playerIndex].splice(handIndex, 1);
      console.log('[SOURCE_REMOVAL] ✅ Removed from hand at index:', handIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found in player's hand`);
    }
  } else if (source === 'table' || source === 'loose') {
    // 🎯 FIX: Handle 'loose' source same as 'table' (loose cards are table cards)
    console.log('[SOURCE_REMOVAL] Removing loose card from table');
    const cardIndex = gameState.tableCards.findIndex(tableCard =>
      tableCard.rank === card.rank &&
      tableCard.suit === card.suit &&
      (!tableCard.type || tableCard.type === 'loose')
    );
    if (cardIndex >= 0) {
      gameState.tableCards.splice(cardIndex, 1);
      console.log('[SOURCE_REMOVAL] ✅ Removed from table at index:', cardIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found on table`);
    }
  } else if (source === 'captured') {
    const captureIndex = gameState.playerCaptures[playerIndex].findIndex(c =>
      c.rank === card.rank && c.suit === card.suit
    );
    if (captureIndex >= 0) {
      gameState.playerCaptures[playerIndex].splice(captureIndex, 1);
      console.log('[SOURCE_REMOVAL] ✅ Removed from captures at index:', captureIndex);
    } else {
      throw new Error(`Card ${card.rank}${card.suit} not found in player's captures`);
    }
  } else if (source === 'oppTopCard') {
    // Handle opponent top card - validate it's the top card and remove it
    if (opponentId === undefined) {
      throw new Error("opponentId is required for oppTopCard source");
    }

    const opponentCaptures = gameState.playerCaptures[opponentId] || [];
    if (opponentCaptures.length === 0) {
      throw new Error(`Opponent ${opponentId} has no captured cards`);
    }

    // Check if it's the top card (last element in array)
    const actualTopCard = opponentCaptures[opponentCaptures.length - 1];
    if (actualTopCard.rank !== card.rank || actualTopCard.suit !== card.suit) {
      throw new Error(`Card ${card.rank}${card.suit} is not opponent ${opponentId}'s top card`);
    }

    // Remove the top card from opponent's captures
    gameState.playerCaptures[opponentId].pop();
    console.log('[SOURCE_REMOVAL] ✅ Removed opponent top card from captures');
  } else {
    throw new Error(`Unknown source type: ${source}`);
  }
}

module.exports = handleAddToOwnTemp;
