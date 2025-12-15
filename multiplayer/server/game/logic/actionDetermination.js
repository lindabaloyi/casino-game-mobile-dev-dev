/**
 * Action Determination State Machine
 * Deterministic state machine for casino game action determination
 * Replaces procedural logic with rule-based evaluation
 */

const { rankValue, isCard, isBuild, isTemporaryStack, calculateCardSum } = require('../GameState');
const { createLogger } = require('../../utils/logger');
const logger = createLogger('ActionDetermination');

/**
 * Action Types Enum
 */
const ActionTypes = {
  CAPTURE: 'capture',
  BUILD: 'build',
  TRAIL: 'trail',
  STAGING: 'staging',
  TABLE_TO_TABLE: 'tableToTable',
  HAND_TO_TABLE: 'handToTable'
};

/**
 * Game State Context Keys
 */
const GameContext = {
  ROUND: 'round',
  CURRENT_PLAYER: 'currentPlayer',
  TABLE_CARDS: 'tableCards',
  PLAYER_HANDS: 'playerHands',
  DRAGGED_ITEM: 'draggedItem',
  TARGET_INFO: 'targetInfo'
};

/**
 * Action Determination Engine
 * Rule-based state machine for determining valid game actions
 */
class ActionDeterminationEngine {
  constructor() {
    this.rules = [];
    this.loadRules();
  }

  /**
   * Load all action determination rules
   */
  loadRules() {
    // Import rule modules
    const stagingRules = require('./rules/stagingRules');
    const captureRules = require('./rules/captureRules');
    const buildRules = require('./rules/buildRules');
    const trailRules = require('./rules/trailRules');

    // Combine all rules with priority ordering
    this.rules = [
      ...stagingRules,
      ...captureRules,
      ...buildRules,
      ...trailRules
    ].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    logger.debug(`Loaded ${this.rules.length} action determination rules`);
  }

  /**
   * Main action determination method
   */
  determineActions(draggedItem, targetInfo, gameState) {
    console.log('[ENGINE] ===== ACTION DETERMINATION START =====');
    console.log('[ENGINE] Input:', {
      draggedSource: draggedItem?.source,
      draggedCard: draggedItem?.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
      targetType: targetInfo?.type,
      targetArea: targetInfo?.area,
      gameId: gameState?.gameId
    });

    logger.debug('ActionDeterminationEngine: Starting evaluation', {
      draggedSource: draggedItem?.source,
      targetType: targetInfo?.type,
      gameId: gameState?.gameId
    });

    const context = this.createContext(draggedItem, targetInfo, gameState);
    const matchingRules = this.evaluateRules(context);

    console.log('[ENGINE] Matching rules found:', matchingRules.length);
    matchingRules.forEach((rule, i) => {
      console.log(`[ENGINE] Rule ${i}: ${rule.id} (priority: ${rule.priority})`);
    });

    logger.debug('ActionDeterminationEngine: Evaluation complete', {
      totalRules: this.rules.length,
      matchingRules: matchingRules.length,
      actionsFound: matchingRules.map(r => r.action?.type || r.action)
    });

    const result = this.formatResult(matchingRules, context);

    console.log('[ENGINE] Final result:', {
      actionsCount: result.actions?.length,
      requiresModal: result.requiresModal,
      actionTypes: result.actions?.map(a => a.type)
    });
    console.log('[ENGINE] ===== ACTION DETERMINATION END =====');

    return result;
  }

  /**
   * Create evaluation context from inputs
   */
  createContext(draggedItem, targetInfo, gameState) {
    return {
      [GameContext.ROUND]: gameState.round,
      [GameContext.CURRENT_PLAYER]: gameState.currentPlayer,
      [GameContext.TABLE_CARDS]: gameState.tableCards,
      [GameContext.PLAYER_HANDS]: gameState.playerHands,
      [GameContext.DRAGGED_ITEM]: draggedItem,
      [GameContext.TARGET_INFO]: targetInfo,
      gameId: gameState.gameId
    };
  }

  /**
   * Evaluate all rules against the context
   */
  evaluateRules(context) {
    const matchingRules = [];

    for (const rule of this.rules) {
      try {
        if (rule.condition(context)) {
          matchingRules.push(rule);
          logger.debug(`Rule matched: ${rule.id}`, {
            action: rule.action?.type || rule.action,
            requiresModal: rule.requiresModal
          });

          // If rule has exclusive flag, stop evaluating further rules
          if (rule.exclusive) {
            break;
          }
        }
      } catch (error) {
        logger.error(`Error evaluating rule ${rule.id}:`, error.message);
      }
    }

    return matchingRules;
  }

  /**
   * Format matching rules into final result
   * OPTION B: All actions are functions that return complete objects
   */
  formatResult(matchingRules, context) {
    console.log('[STATE_MACHINE] Formatting result for', matchingRules.length, 'matching rules');

    if (matchingRules.length === 0) {
      logger.debug('No matching rules found');
      return {
        actions: [],
        requiresModal: false,
        errorMessage: 'No valid actions available'
      };
    }

    // ✅ OPTION B: All actions are functions that return complete objects
    const actions = matchingRules.map(rule => {
      try {
        console.log('[STATE_MACHINE] Executing action function for rule:', rule.id);
        const action = rule.action(context); // All actions are functions
        console.log('[STATE_MACHINE] Action result:', {
          type: action.type,
          hasCard: !!action.card,
          cardRank: action.card?.rank
        });
        return action;
      } catch (error) {
        console.error(`[STATE_MACHINE] Error executing action for rule ${rule.id}:`, error);
        throw error;
      }
    });

    // Determine if modal is required
    const requiresModal = matchingRules.some(rule =>
      rule.requiresModal ||
      actions.some(action => action.type === 'trail') ||  // Trail always requires modal
      actions.length > 1                                   // Multiple actions require modal
    );

    console.log('[STATE_MACHINE] Final result:', {
      actionCount: actions.length,
      requiresModal,
      actionTypes: actions.map(a => a.type)
    });

    return {
      actions,
      requiresModal,
      errorMessage: null
    };
  }
}

// Singleton instance
const engine = new ActionDeterminationEngine();

/**
 * Public API - Maintains same interface as determineActions.js
 */
function determineActions(draggedItem, targetInfo, gameState) {
  return engine.determineActions(draggedItem, targetInfo, gameState);
}

/**
 * Check if current player can make any valid moves
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

module.exports = {
  determineActions,
  canPlayerMove,
  ActionTypes,
  GameContext,
  ActionDeterminationEngine
};
