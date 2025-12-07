/**
 * Determine Actions Logic Module
 * Pure logic for determining what actions are possible when dropping cards
 * Migrated from shared-game-logic.js - SINGLE SOURCE OF TRUTH
 */

const { rankValue, calculateCardSum, isCard, isBuild, isTemporaryStack } = require('../GameState');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('DetermineActions');

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

  const actions = [];
  const { card: draggedCard } = draggedItem;
  const { tableCards, playerHands, playerCaptures, currentPlayer } = gameState;
  const playerHand = playerHands[currentPlayer];
  const playerCapturedCards = playerCaptures[currentPlayer];
  const opponentCapturedCards = playerCaptures[(currentPlayer + 1) % 2];
  const draggedValue = rankValue(draggedCard.rank);

  // Handle different drag sources
  if (draggedItem.source === 'table') {
    // ===== TABLE-TO-TABLE DROPS (Phase 3: Temporary Stacks) =====
    logger.debug('Table card drop detected', {
      draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
      targetType: targetInfo.type
    });

    if (targetInfo.type === 'loose') {
      // Casino rule: Players can only have one temp stack at a time
      const alreadyHasTempStack = tableCards.some(card =>
        card.type === 'temporary_stack' && card.owner === currentPlayer
      );

      if (alreadyHasTempStack) {
        logger.warn('Player already has temp stack - rejecting table drop');
        return {
          actions: [],
          requiresModal: false,
          errorMessage: 'You can only have one staging stack at a time.'
        };
      }

      // Create temporary stack action
      logger.debug('Creating temp stack action', {
        value: draggedValue + rankValue(targetInfo.card.rank)
      });
      actions.push({
        type: 'tableCardDrop',
        label: `Create Stack (${draggedValue + rankValue(targetInfo.card.rank)})`,
        payload: {
          gameId: gameState.gameId, // Will be set by caller
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
    // Fall through to use same logic as hand cards
  } else if (draggedItem.source !== 'hand') {
    // Unknown drag source
    return {
      actions: [],
      requiresModal: false,
      errorMessage: 'Unsupported drag source'
    };
  }

  // Check for captures on table cards
  tableCards.forEach((tableCard) => {
    if (isCard(tableCard)) {
      const cardValue = tableCard.rank ? rankValue(tableCard.rank) : 0;
      if (cardValue === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture ${tableCard.rank}`,
          payload: {
            gameId: gameState.gameId,
            draggedItem,
            selectedTableCards: [tableCard],
            targetCard: tableCard
          }
        });
      }
    } else if (isBuild(tableCard) && tableCard.value === draggedValue) {
      actions.push({
        type: 'capture',
        label: `Capture Build (${tableCard.value})`,
        payload: {
          gameId: gameState.gameId,
          draggedItem,
          selectedTableCards: [tableCard],
          targetCard: tableCard
        }
      });
    } else if (isTemporaryStack(tableCard)) {
      const stackCaptureValue = tableCard.captureValue || calculateCardSum(tableCard.cards || []);
      if (stackCaptureValue === draggedValue) {
        actions.push({
          type: 'capture',
          label: `Capture Stack (${stackCaptureValue})`,
          payload: {
            gameId: gameState.gameId,
            draggedItem,
            selectedTableCards: [tableCard],
            targetCard: tableCard
          }
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
      logger.debug('Add to temp stack detected', {
        stackId: targetStack.stackId,
        currentValue: targetStack.value,
        newValue: targetStack.value + draggedValue
      });
      actions.push({
        type: 'addToStagingStack',
        label: `Add to Stack (${targetStack.value} → ${targetStack.value + draggedValue})`,
        payload: {
          gameId: gameState.gameId,
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
          logger.debug('Build detected', {
            handCard: draggedValue,
            tableCard: targetValue,
            buildValue: targetValue + draggedValue
          });
          actions.push({
            type: 'build',
            label: `Build ${targetValue + draggedValue} (${draggedValue}+${targetValue})`,
            payload: {
              gameId: gameState.gameId,
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

  // Check for build extensions
  if (targetInfo.type === 'build') {
    const targetBuild = tableCards.find(c =>
      c.type === 'build' && c.buildId === targetInfo.buildId
    );

    if (targetBuild) {
      if (targetBuild.owner === currentPlayer) {
        actions.push({
          type: 'addToOwnBuild',
          label: `Add to Build (${targetBuild.value})`,
          payload: {
            gameId: gameState.gameId,
            draggedItem,
            buildToAddTo: targetBuild
          }
        });
      } else if (targetBuild.isExtendable) {
        const newValue = targetBuild.value + draggedValue;
        if (newValue <= 10) {
          logger.debug('Opponent build extension', {
            buildId: targetBuild.buildId,
            oldValue: targetBuild.value,
            newValue: newValue
          });
          actions.push({
            type: 'addToOpponentBuild',
            label: `Extend to ${newValue}`,
            payload: {
              gameId: gameState.gameId,
              draggedItem,
              buildToAddTo: targetBuild
            }
          });
        }
      }
    }
  }

  // If no actions found, check for trail
  if (actions.length === 0) {
    // 🚀 Use the new modular trail action determination
    const { determineTrailActions } = require('./actions/trail');
    const trailActions = determineTrailActions(draggedItem, targetInfo, gameState);

    if (trailActions.length > 0) {
      actions.push(...trailActions);
      // Trail action should NOT end the turn - player can continue
      return {
        actions,
        requiresModal: false,
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
