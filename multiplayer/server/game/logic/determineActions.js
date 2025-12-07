/**
 * Determine Actions Logic Module - Refactored
 * Pure logic for determining what actions are possible when dropping cards
 * Now uses modular action determination for better maintainability
 */

const { rankValue, isCard, isBuild, isTemporaryStack, calculateCardSum } = require('../GameState');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('DetermineActions');

// Import specialized action modules
const { determineCaptureActions, shouldAutoExecuteCapture } = require('./actions/captureActions');
const { determineBuildActions } = require('./actions/buildActions');
const { determineStackActions } = require('./actions/stackActions');

/**
 * Determine what actions are possible when dropping a card
 * This is the authoritative source of truth for casino game rules
 * Returns possible actions, whether modal is required, and validation errors
 */
function determineActions(draggedItem, targetInfo, gameState) {
  logger.debug('Determining actions', {
    draggedCard: `${draggedItem.card.rank}${draggedItem.card.suit}`,
    targetType: targetInfo.type,
    currentPlayer: gameState.currentPlayer
  });

  let actions = [];
  const { card: draggedCard } = draggedItem;
  const { tableCards } = gameState;
  const draggedValue = rankValue(draggedCard.rank);

  // Handle different drag sources
  if (draggedItem.source === 'table') {
    // Use stack actions module for table-to-table drops
    const stackResult = determineStackActions(draggedItem, targetInfo, gameState);
    if ('errorMessage' in stackResult) {
      // Special handling for stack actions (may return validation result)
      return stackResult;
    }
    actions = actions.concat(stackResult);
  } else if (draggedItem.source === 'captured') {
    // ===== CAPTURED CARD DROPS =====
    // Fall through to use same logic as hand cards
  } else if (draggedItem.source !== 'hand') {
    // Unknown drag source
    return {
      actions: [],
      requiresModal: false,
      errorMessage: 'Unsupported drag source'
    };
  }

  // Use modular action determination
  if (draggedItem.source !== 'table') {
    // Only run these for non-table sources to avoid duplication
    const captureActions = determineCaptureActions(draggedItem, gameState);
    actions = actions.concat(captureActions);
  }

  const buildActions = determineBuildActions(draggedItem, targetInfo, gameState);
  const stackActionsResult = determineStackActions(draggedItem, targetInfo, gameState);

  actions = actions.concat(buildActions);

  // Handle different return types from stackActions
  if (Array.isArray(stackActionsResult)) {
    actions = actions.concat(stackActionsResult);
  }

  // If no actions found, check for trail
  if (actions.length === 0) {
    // 🚀 Use the new modular trail action determination
    const { determineTrailActions } = require('./actions/trail');
    const trailActions = determineTrailActions(draggedItem, targetInfo, gameState);

    if (trailActions.length > 0) {
      actions.push(...trailActions);
      // Trail action requires confirmation modal for player approval
      return {
        actions,
        requiresModal: true,
        errorMessage: null
      };
    }
  }

  // Handle automatic vs modal execution
  if (actions.length === 0) {
    logger.debug('No valid actions available', {
      draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
      targetType: targetInfo.type
    });
    return {
      actions: [],
      requiresModal: false,
      errorMessage: 'No valid actions available'
    };
  }

  if (actions.length === 1) {
    const action = actions[0];
    if (action.type === 'trail') {
      return {
        actions,
        requiresModal: true, // 🔥 Always require confirmation for trail actions
        errorMessage: null
      };
    } else if (action.type === 'capture') {
      // Check for duplicate loose cards before auto-executing capture
      const duplicateLooseCards = tableCards.filter(tableItem =>
        isCard(tableItem) &&
        tableItem.rank &&
        rankValue(tableItem.rank) === draggedValue
      );

      if (duplicateLooseCards.length >= 1) {
        logger.debug('Auto-capture blocked: duplicate cards on table', {
          draggedValue,
          duplicateCount: duplicateLooseCards.length
        });
        return {
          actions: [],
          requiresModal: false,
          errorMessage: `Cannot trail loose card: ${draggedCard.rank} cards already exist on the table.`
        };
      } else {
        logger.debug('Auto-executing single capture');
        return {
          actions,
          requiresModal: false,
          errorMessage: null
        };
      }
    }
  }

  // Multiple actions require modal choice
  logger.debug('Modal required', { actionCount: actions.length });
  return {
    actions,
    requiresModal: true,
    errorMessage: null
  };
}

/**
 * Check if current player can make any valid moves
 * Used to determine if turn should switch
 */
function canPlayerMove(gameState) {
  const { playerHands, currentPlayer, tableCards, round } = gameState;
  const playerHand = playerHands[currentPlayer];

  // 🎯 [DEBUG] Movement analysis start
  console.log('🎯 [DEBUG] CAN PLAYER MOVE? - Analysis Start:', {
    gameId: gameState.gameId || 'unknown',
    currentPlayer,
    handSize: playerHand.length,
    tableCardsCount: tableCards.length,
    round
  });

  // If player has no cards, they can't move
  if (playerHand.length === 0) {
    console.log('🎯 [DEBUG] CAN MOVE: false - No cards in hand');
    return false;
  }

  // Check if any card in hand has a valid move
  let hasValidMove = false;
  let checkedCaptures = 0;
  let checkedBuilds = 0;
  let checkedTrails = 0;

  for (const card of playerHand) {
    console.log('🎯 [DEBUG] Checking card:', {
      card: `${card.rank}${card.suit}`,
      value: rankValue(card.rank)
    });

    // Try each card against each possible target
    const draggedItem = { card, source: 'hand' };

    // Check table targets (loose cards, builds, temp stacks)
    for (const tableCard of tableCards) {
      if (isCard(tableCard)) {
        // Check capture possibility
        if (rankValue(tableCard.rank) === rankValue(card.rank)) {
          console.log('🎯 [DEBUG] FOUND CAPTURE:', {
            card: `${card.rank}${card.suit}`,
            against: `${tableCard.rank}${tableCard.suit}`,
            reason: 'rank_match'
          });
          checkedCaptures++;
          hasValidMove = true;
          break;
        }

        checkedCaptures++;
      } else if (isBuild(tableCard)) {
        // Check capture of entire build
        if (tableCard.value === rankValue(card.rank)) {
          console.log('🎯 [DEBUG] FOUND BUILD CAPTURE:', {
            card: `${card.rank}${card.suit}`,
            buildValue: tableCard.value,
            buildOwner: tableCard.owner
          });
          checkedBuilds++;
          hasValidMove = true;
          break;
        }

        // Check build extension possibilities
        if (tableCard.owner === currentPlayer ||
            (tableCard.isExtendable && tableCard.value + rankValue(card.rank) <= 10)) {
          console.log('🎯 [DEBUG] FOUND BUILD EXTENSION:', {
            card: `${card.rank}${card.suit}`,
            buildValue: tableCard.value,
            canExtend: tableCard.isExtendable,
            newTotal: tableCard.value + rankValue(card.rank)
          });
          checkedBuilds++;
          hasValidMove = true;
          break;
        }

        checkedBuilds++;
      } else if (isTemporaryStack(tableCard)) {
        // Check stack capture possibilities
        const stackValue = tableCard.captureValue || calculateCardSum(tableCard.cards || []);
        if (stackValue === rankValue(card.rank)) {
          console.log('🎯 [DEBUG] FOUND STACK CAPTURE:', {
            card: `${card.rank}${card.suit}`,
            stackValue,
            stackCards: tableCard.cards?.length || 0
          });
          hasValidMove = true;
          break;
        }
      }
    }

    if (hasValidMove) break;

    // Check trail possibility
    const { canTrailCard } = require('./validation/canTrailCard');
    const canTrail = canTrailCard(card, gameState);
    checkedTrails++;
    if (canTrail) {
      console.log('🎯 [DEBUG] FOUND TRAIL OPPORTUNITY:', {
        card: `${card.rank}${card.suit}`,
        reason: 'can_be_trailed'
      });
      hasValidMove = true;
      break;
    } else {
      console.log('🎯 [DEBUG] TRAIL BLOCKED:', {
        card: `${card.rank}${card.suit}`,
        round,
        hasActiveBuild: round === 1 && tableCards.some(tc =>
          tc.type === 'build' && tc.owner === currentPlayer
        ),
        duplicateExists: tableCards.some(tc =>
          isCard(tc) && rankValue(tc.rank) === rankValue(card.rank)
        )
      });
    }
  }

  // 🎯 [DEBUG] Final decision
  console.log('🎯 [DEBUG] CAN MOVE RESULT:', {
    gameId: gameState.gameId || 'unknown',
    currentPlayer,
    hasValidMove,
    summary: {
      handSize: playerHand.length,
      checkedCaptures,
      checkedBuilds,
      checkedTrails,
      tableCards: tableCards.length,
      round
    }
  });

  return hasValidMove;
}



module.exports = { determineActions, canPlayerMove };
