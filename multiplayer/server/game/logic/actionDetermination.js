/**
 * Action Determination State Machine
 * Deterministic state machine for casino game action determination
 * Replaces procedural logic with rule-based evaluation
 */

const { rankValue, isCard, isBuild, isTemporaryStack, calculateCardSum } = require('../GameState');
const { createLogger } = require('../../utils/logger');

// Helper function to get card type from union types (same as in TableCards.tsx)
function getCardType(card) {
  if ('type' in card) return card.type;
  return 'loose';  // Card objects are implicitly loose cards without type property
}
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
    // ⚙️ COMPREHENSIVE ACTION ENGINE INPUT LOGGING
    console.log('⚙️ [ACTION_DATA] ===== ACTION ENGINE INPUT =====');

    // Log EXACTLY what the engine receives
    console.log('⚙️ [ACTION_DATA] Engine inputs:', {
      draggedItem: {
        // Structure
        isDefined: !!draggedItem,
        isObject: draggedItem && typeof draggedItem === 'object',
        isArray: Array.isArray(draggedItem),

        // Critical properties for validation
        source: draggedItem?.source,
        hasCard: !!draggedItem?.card,
        card: draggedItem?.card ? {
          rank: draggedItem.card.rank,
          suit: draggedItem.card.suit,
          full: `${draggedItem.card.rank}${draggedItem.card.suit}`
        } : null,

        // All properties
        allKeys: draggedItem ? Object.keys(draggedItem) : [],
        fullObject: draggedItem
      },

      targetInfo: {
        ...targetInfo,
        card: targetInfo?.card ? {
          rank: targetInfo.card.rank,
          suit: targetInfo.card.suit,
          full: `${targetInfo.card.rank}${targetInfo.card.suit}`
        } : null
      },

      gameStateContext: {
        currentPlayer: gameState.currentPlayer,
        tableCardsCount: gameState.tableCards?.length || 0,
        tableCardsTypes: gameState.tableCards?.map(c => getCardType(c))
      }
    });

    console.log('⚙️ [ACTION_DATA] ===== END =====\n');

    console.log('[ENGINE] ===== ACTION DETERMINATION START =====');

    // 🔍 DEBUG: Full game state context
    console.log('[ENGINE] Full context:', {
      draggedSource: draggedItem?.source,
      draggedCard: draggedItem?.card ? `${draggedItem.card.rank}${draggedItem.card.suit}` : 'none',
      targetType: targetInfo?.type,
      targetArea: targetInfo?.area,
      gameId: gameState?.gameId,
      currentPlayer: gameState?.currentPlayer,
      tableCardsCount: gameState?.tableCards?.length || 0,
      playerHands: gameState?.playerHands?.map((h, i) => ({
        player: i,
        handSize: h?.length || 0
      })) || []
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
 * Used for turn management and game end detection
 */
function canPlayerMove(gameState) {
  if (!gameState) {
    return false;
  }

  const { playerHands, currentPlayer, tableCards } = gameState;

  if (!playerHands || !Array.isArray(playerHands) || currentPlayer === undefined) {
    return false;
  }

  const playerHand = playerHands[currentPlayer];

  if (!playerHand || !Array.isArray(playerHand)) {
    return false;
  }

  if (!tableCards || !Array.isArray(tableCards)) {
    return false;
  }

  // If player has no cards, they can't move
  if (playerHand.length === 0) {
    return false;
  }

  // Check if any card in hand has a valid move
  for (const card of playerHand) {
    if (!card || typeof card !== 'object') {
      continue;
    }

    // Try each card against each possible target
    // const draggedItem = { card, source: 'hand' }; // Not used in canPlayerMove

    // Check table targets (loose cards, builds, temp stacks)
    for (const tableCard of tableCards) {
      if (!tableCard || typeof tableCard !== 'object') {
        continue;
      }

      if (isCard(tableCard)) {
        // Check capture possibility
        if (rankValue(tableCard.rank) === rankValue(card.rank)) {
          return true; // Found valid capture
        }
      } else if (isBuild(tableCard)) {
        // Check capture of entire build
        if (tableCard.value === rankValue(card.rank)) {
          return true; // Found valid build capture
        }

        // Check build extension possibilities
        if (tableCard.owner === currentPlayer ||
            (tableCard.isExtendable && tableCard.value + rankValue(card.rank) <= 10)) {
          return true; // Found valid build extension
        }
      } else if (isTemporaryStack(tableCard)) {
        // Check stack capture possibilities
        const stackValue = tableCard.captureValue || calculateCardSum(tableCard.cards || []);
        if (stackValue === rankValue(card.rank)) {
          return true; // Found valid stack capture
        }
      }
    }

    // Check trail possibility (only if no captures/builds found for this card)
    const { canTrailCard } = require('./validation/canTrailCard');
    if (canTrailCard(card, gameState)) {
      return true; // Found valid trail
    }
  }

  // No valid moves found
  return false;
}

module.exports = {
  determineActions,
  canPlayerMove,
  ActionTypes,
  GameContext,
  ActionDeterminationEngine
};
