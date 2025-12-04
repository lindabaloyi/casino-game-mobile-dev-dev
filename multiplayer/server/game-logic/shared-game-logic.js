/**
 * Shared Game Logic Module (JavaScript version)
 * Provides type-safe functions for both frontend and backend
 * Migrated from utils/actionDeterminer.ts - now the SINGLE SOURCE OF TRUTH
 * Reduced logging for production use
 */

// ============================================================================
// CORE GAME FUNCTIONS
// ============================================================================

function initializeGame() {
  // Reduced logging - only essential initialization
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  let deck = [];

  // Create deck
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({
        suit,
        rank,
        value: rank === 'A' ? 1 : parseInt(rank, 10)
      });
    }
  }

  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  // Deal cards - 10 cards to each of 2 players
  const playerHands = [[], []];
  for (let i = 0; i < 10; i++) {
    playerHands[0].push(deck.pop());
    playerHands[1].push(deck.pop());
  }

  return {
    deck,
    playerHands,
    tableCards: [],
    playerCaptures: [[], []],
    currentPlayer: 0,
    round: 1,
    scores: [0, 0],
    gameOver: false,
    winner: null,
    lastCapturer: null,
    scoreDetails: null,
  };
}

function validateGameState(gameState) {
  // Reduced logging - only errors
  const errors = [];

  if (!gameState) {
    console.error('[SHARED_LOGIC] Game state validation error: null or undefined state');
    errors.push('Game state is null or undefined');
    return { valid: false, errors };
  }

  if (!Array.isArray(gameState.playerHands) || gameState.playerHands.length !== 2) {
    console.error('[SHARED_LOGIC] Game state validation error: invalid player hands');
    errors.push('playerHands must be an array of 2 elements');
  }

  if (!Array.isArray(gameState.tableCards)) {
    console.error('[SHARED_LOGIC] Game state validation error: invalid table cards');
    errors.push('tableCards must be an array');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================================================
// HELPER FUNCTIONS (Migrated from actionDeterminer.ts)
// ============================================================================

/**
 * Get card rank value (A=1, 2-10=face value)
 */
function rankValue(rank) {
  if (rank === 'A') return 1;
  if (typeof rank === 'number') return rank;
  if (typeof rank === 'string') {
    const parsed = parseInt(rank, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Calculate sum of card values in array
 */
function calculateCardSum(cards) {
  return cards.reduce((sum, card) => sum + rankValue(card.rank), 0);
}

/**
 * Check if player can create build with given value
 */
function canCreateBuild(buildValue, gameState) {
  const { currentPlayer, playerHands } = gameState;
  const playerHand = playerHands[currentPlayer];

  // Check if player has a card to capture this build value later
  return playerHand.some(card => rankValue(card.rank) === buildValue);
}

/**
 * Validate build creation per casino rules
 */
function validateBuildCreation(buildValue, gameState) {
  const { tableCards, currentPlayer } = gameState;

  // Rule 1: Cannot have multiple active builds per round
  const hasActiveBuild = tableCards.some(card =>
    card.type === 'build' && card.owner === currentPlayer
  );

  if (hasActiveBuild) {
    console.error('[SHARED_LOGIC] Build validation failed: player already has active build');
    return {
      valid: false,
      message: "You can only have one active build at a time."
    };
  }

  // Rule 2: Opponent cannot have same value build
  const opponentHasSameValue = tableCards.some(card =>
    card.type === 'build' &&
    card.owner !== currentPlayer &&
    card.value === buildValue
  );

  if (opponentHasSameValue) {
    console.error('[SHARED_LOGIC] Build validation failed: opponent has same value build');
    return {
      valid: false,
      message: `Opponent already has a build of ${buildValue}.`
    };
  }

  return { valid: true };
}

// ============================================================================
// DETERMINE ACTIONS - AUTHORITATIVE SOURCE (Migrated from actionDeterminer.ts)
// ============================================================================

/**
 * Determine what actions are possible when dropping a card
 * This is the authoritative source of truth for casino game rules
 * Migrated from utils/actionDeterminer.ts
 * Reduced logging - only errors and key debug info
 */
function determineActions(draggedItem, targetInfo, gameState) {
  // Removed verbose timestamp logging
  const actions = [];
  let actionError = null; // Track specific error messages
  const { card: draggedCard } = draggedItem;
  const { tableCards, playerHands, playerCaptures, currentPlayer } = gameState;
  const playerHand = playerHands[currentPlayer];
  const playerCapturedCards = playerCaptures[currentPlayer]; // Current player's captured cards
  const opponentCapturedCards = playerCaptures[(currentPlayer + 1) % 2]; // Opponent's captured cards
  const draggedValue = rankValue(draggedCard.rank);

  // Handle different drag sources
  if (draggedItem.source === 'table') {
    // ===== TABLE-TO-TABLE DROPS (Phase 3: Temporary Stacks) =====
    console.log(`[SHARED_LOGIC] Table card drop detected: ${draggedCard.rank}${draggedCard.suit} → ${targetInfo.type}`);

    if (targetInfo.type === 'loose') {
      // Casino rule: Players can only have one temp stack active at a time
      const alreadyHasTempStack = tableCards.some(card =>
        card.type === 'temporary_stack' && card.owner === currentPlayer
      );

      if (alreadyHasTempStack) {
        console.error('[SHARED_LOGIC] Player already has a temp stack - rejecting table drop');
        return {
          actions: [],
          requiresModal: false,
          errorMessage: 'You can only have one staging stack at a time.'
        };
      }

      // Create temporary stack action
      console.log(`[SHARED_LOGIC] Creating temp stack action: ${draggedValue} + ${rankValue(targetInfo.card.rank)}`);
      actions.push({
        type: 'tableCardDrop',
        label: `Create Stack (${draggedValue + rankValue(targetInfo.card.rank)})`,
        payload: {
          draggedCard: draggedCard,
          targetCard: targetInfo.card,
          player: currentPlayer
        }
      });

      // Auto-execute single table drop actions (don't require modal)
      return {
        actions,
        requiresModal: false,
        errorMessage: null
      };
    } else {
      // Table drop on non-loose targets not supported yet
      return {
        actions: [],
        requiresModal: false,
        errorMessage: 'Invalid table card drop target'
      };
    }
  } else if (draggedItem.source === 'captured') {
    // ===== CAPTURED CARD DROPS =====
    // Captured cards can be used like hand cards for builds/captures
    // Fall through to use same logic as hand cards but without hand card checks
  } else if (draggedItem.source !== 'hand') {
    // Unknown drag source
    return {
      actions: [],
      requiresModal: false,
      errorMessage: 'Unsupported drag source'
    };
  }

  // Check for captures on table cards (reduced logging)
  tableCards.forEach((tableCard) => {
    if (tableCard.type === 'loose') {
      const cardValue = tableCard.rank ? rankValue(tableCard.rank) : 0;
      if (cardValue === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture ${tableCard.rank}`,
          payload: { draggedItem, selectedTableCards: [tableCard], targetCard: tableCard }
        });
      }
    } else if (tableCard.type === 'build' && tableCard.value === draggedValue) {
      actions.push({
        type: 'capture',
        label: `Capture Build (${tableCard.value})`,
        payload: { draggedItem, selectedTableCards: [tableCard], targetCard: tableCard }
      });
    } else if (tableCard.type === 'temporary_stack') {
      // Use captureValue for temp stacks (displays the initial build value)
      // For new temp stacks this is the build value
      // For extended temp stacks it remains the original capture value
      const stackCaptureValue = tableCard.captureValue || calculateCardSum(tableCard.cards || []);
      if (stackCaptureValue === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture Stack (${stackCaptureValue})`,
          payload: { draggedItem, selectedTableCards: [tableCard], targetCard: tableCard }
        });
      }
    }
  });

  // Check for adding to temporary stacks
  if (targetInfo.type === 'temporary_stack') {
    const targetStack = tableCards.find(c =>
      c.type === 'temporary_stack' && c.stackId === targetInfo.stackId
    );

    if (targetStack) {
      // Cards can always be added to temp stacks (no value restriction for adding)
      console.log(`[SHARED_LOGIC] Add to temp stack detected: ${draggedCard.rank}${draggedCard.suit} → temp stack (${targetStack.value})`);
      actions.push({
        type: 'addToStagingStack',
        label: `Add to Stack (${targetStack.value} → ${targetStack.value + draggedValue})`,
        payload: {
          draggedItem,
          targetStack
        }
      });
    }
  }

  // Check for builds (dropping on loose card)
  if (targetInfo.type === 'loose') {
    const targetCard = tableCards.find(c =>
      c.rank === targetInfo.card?.rank && c.suit === targetInfo.card?.suit
    );

    if (targetCard) {
      const targetValue = rankValue(targetCard.rank);

      const hasCaptureCard = playerHand.some(card =>
        rankValue(card.rank) === targetValue + draggedValue &&
        !(card.rank === draggedCard.rank && card.suit === draggedCard.suit)
      );

      if (hasCaptureCard && (targetValue + draggedValue) <= 10) {
        const hasExistingBuild = tableCards.some(card =>
          card.type === 'build' && card.owner === currentPlayer
        );

        if (!hasExistingBuild) {
          actions.push({
            type: 'build',
            label: `Build ${targetValue + draggedValue} (${draggedValue}+${targetValue})`,
            payload: {
              draggedItem,
              tableCardsInBuild: [targetCard],
              buildValue: targetValue + draggedValue,
              biggerCard: draggedValue > targetValue ? draggedCard : targetCard,
              smallerCard: draggedValue < targetValue ? draggedCard : targetCard
            }
          });
        }
      }
    }
  }

  // Check for build extensions (reduced logging)
  if (targetInfo.type === 'build') {
    const targetBuild = tableCards.find(c =>
      c.type === 'build' && c.buildId === targetInfo.buildId
    );

    if (targetBuild) {
      if (targetBuild.owner === currentPlayer) {
        actions.push({
          type: 'addToOwnBuild',
          label: `Add to Build (${targetBuild.value})`,
          payload: { draggedItem, buildToAddTo: targetBuild }
        });
      } else if (targetBuild.isExtendable) {
        const newValue = (targetBuild.value || 0) + draggedValue;
        if (newValue <= 10) {
          // DEBUG: Log opponent build extension
          console.log(`[SHARED_LOGIC] Opponent build extension: ${targetBuild.value}→${newValue}`);
          actions.push({
            type: 'addToOpponentBuild',
            label: `Extend to ${newValue}`,
            payload: { draggedItem, buildToAddTo: targetBuild }
          });
        }
      }
    }
  }

  // If no actions found, check for trail
  if (actions.length === 0 && (!targetInfo.type || targetInfo.type === 'table')) {
    const hasActiveBuild = tableCards.some(card =>
      card.type === 'build' && card.owner === currentPlayer
    );

    const wouldCreateDuplicate = tableCards.some(tableItem =>
      tableItem.type === 'loose' &&
      tableItem.rank &&
      rankValue(tableItem.rank) === draggedValue
    );

    if (!(gameState.round === 1 && hasActiveBuild) && !wouldCreateDuplicate) {
      actions.push({
        type: 'trail',
        label: 'Trail Card',
        payload: { draggedItem, card: draggedCard }
      });
    } else if (gameState.round === 1 && hasActiveBuild) {
      console.error('[SHARED_LOGIC] Trail blocked: Round 1 with active build');
      actionError = 'Cannot trail card during round 1 when you have an active build.';
    } else if (wouldCreateDuplicate) {
      console.error('[SHARED_LOGIC] Trail blocked: Would create duplicate loose card');
      actionError = `Cannot trail: a ${draggedCard.rank} already exists as a loose card on the table.`;
    }
  }

  // Handle automatic vs modal execution
  if (actions.length === 0) {
    console.error(`[SHARED_LOGIC] No valid actions for ${draggedCard.rank}${draggedCard.suit} → ${targetInfo.type}`);
    return {
      actions: [],
      requiresModal: false,
      errorMessage: actionError || 'No valid actions available'
    };
  }

  if (actions.length === 1) {
    const action = actions[0];
    if (action.type === 'trail') {
      return {
        actions,
        requiresModal: false,
        errorMessage: null
      };
    } else if (action.type === 'capture') {
      // Check for duplicate loose cards before auto-executing capture
      const duplicateLooseCards = tableCards.filter(tableItem =>
        tableItem.type === 'loose' &&
        tableItem.rank &&
        rankValue(tableItem.rank) === draggedValue
      );

      if (duplicateLooseCards.length >= 1) {
        console.error(`[SHARED_LOGIC] Auto-capture blocked: ${duplicateLooseCards.length} loose ${draggedCard.rank} cards already exist on table`);
        return {
          actions: [],
          requiresModal: false,
          errorMessage: `Cannot trail loose card: ${draggedCard.rank} cards already exist on the table.`
        };
      } else {
        console.log(`[SHARED_LOGIC] Auto-executing single capture: ${draggedCard.rank}${draggedCard.suit}`);
        return {
          actions,
          requiresModal: false,
          errorMessage: null
        };
      }
    }
  }

  // Multiple actions require modal choice
  console.log(`[SHARED_LOGIC] Modal required: ${actions.length} actions available`);
  return {
    actions,
    requiresModal: true,
    errorMessage: null
  };
}

// ============================================================================
// EXPORTS - Single Source of Truth Established
// ============================================================================

module.exports = {
  initializeGame,
  validateGameState,
  determineActions,
  // Helper functions
  rankValue,
  calculateCardSum,
  canCreateBuild,
  validateBuildCreation
};
