/**
 * Action Determination State Machine
 * Deterministic state machine for casino game action determination
 * Replaces procedural logic with rule-based evaluation
 */

const { rankValue, isCard, isBuild, isTemporaryStack, calculateCardSum } = require('../GameState.cjs');
const { createLogger } = require('../../utils/logger.cjs');

const logger = createLogger('ActionDetermination');

// 🎯 RULE USAGE TRACKING - Minimal but comprehensive
const ruleUsageTracker = new Map();
let totalGameActions = 0;

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
    const stagingRules = require('./rules/tempRules');
    const captureRules = require('./rules/captureRules');
    const buildRules = require('./rules/buildRules');
    const { buildExtendRules } = require('./rules/buildExtendRules');
    const trailRules = require('./rules/trailRules');

    // Combine all rules with priority ordering
    // IMPORTANT: Capture rules (190-200) must come before build extension rules (38)
    // to ensure captures always take precedence over extensions
    this.rules = [
      ...stagingRules,
      ...captureRules,        // Priority 190-200: Highest priority for captures
      ...buildExtendRules,    // Priority 38: Lower priority for extensions
      ...buildRules,
      ...trailRules
    ].sort((a, b) => (b.priority || 0) - (a.priority || 0));

    logger.debug(`Loaded ${this.rules.length} action determination rules from ${[
      'stagingRules',
      'captureRules',
      'buildExtendRules',
      'buildRules',
      'trailRules'
    ].join(', ')}`);
  }

  /**
   * Main action determination method
   */
  determineActions(draggedItem, targetInfo, gameState) {
    const context = this.createContext(draggedItem, targetInfo, gameState);
    const matchingRules = this.evaluateRules(context);
    const result = this.formatResult(matchingRules, context);
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
    console.log('\n🎯 ========== RULE EVALUATION START ==========');
    console.log('📦 Context:', {
      draggedCard: context.draggedItem?.card ? `${context.draggedItem.card.rank}${context.draggedItem.card.suit}=${context.draggedItem.card.value}` : 'none',
      draggedSource: context.draggedItem?.source,
      targetType: context.targetInfo?.type,
      targetCard: context.targetInfo?.card ? `${context.targetInfo.card.rank}${context.targetInfo.card.suit}=${context.targetInfo.card.value}` : 'none',
      currentPlayer: context.currentPlayer,
      playerHandSize: context.playerHands?.[context.currentPlayer]?.length || 0
    });

    console.log('📋 EVALUATING RULES IN PRIORITY ORDER:');
    this.rules.forEach((rule, i) => {
      console.log(`  ${i+1}. ${rule.id.padEnd(35)} (priority: ${rule.priority})`);
    });

    const matchingRules = [];

    for (const rule of this.rules) {
      try {
        console.log(`\n🔍 EVALUATING RULE: ${rule.id} (priority: ${rule.priority})`);

        const conditionResult = rule.condition(context);

        console.log(`   CONDITION RESULT: ${conditionResult ? '✅ TRUE' : '❌ FALSE'}`);
        console.log(`   Exclusive: ${rule.exclusive}, Requires Modal: ${rule.requiresModal}`);

        if (conditionResult) {
          matchingRules.push(rule);
          console.log(`🎯 RULE MATCHED! ${rule.id}`);

          // If rule has exclusive flag, stop evaluating further rules
          if (rule.exclusive) {
            console.log('🚫 EXCLUSIVE RULE - STOPPING FURTHER EVALUATION');
            break;
          }
        }
      } catch (error) {
        console.log(`❌ ERROR in rule ${rule.id}: ${error.message}`);
        logger.error(`Error evaluating rule ${rule.id}:`, error.message);
      }
    }

    console.log(`\n📊 EVALUATION COMPLETE: ${matchingRules.length} rules matched`);
    if (matchingRules.length > 0) {
      console.log('🎯 MATCHING RULES:');
      matchingRules.forEach((rule, i) => {
        console.log(`  ${i+1}. ${rule.id} (priority: ${rule.priority})`);
      });
    }

    console.log('🎯 ========== RULE EVALUATION END ===========\n');

    return matchingRules;
  }

  /**
   * Format matching rules into final result
   * OPTION B: All actions are functions that return complete objects
   * SPECIAL: Handle data packets (like showTempStackOptions) separately
   */
  formatResult(matchingRules, context) {
    if (matchingRules.length === 0) {
      return {
        actions: [],
        dataPackets: [],
        requiresModal: false,
        errorMessage: 'No valid actions available'
      };
    }

    // ✅ OPTION B: All actions are functions that return complete objects
    const results = matchingRules.map(rule => {
      try {
        const result = rule.action(context); // All actions are functions

        // 🎯 SPECIAL HANDLING: Check if result is a data packet (not an action)
        if (result && typeof result === 'object' && result.type && result.payload) {
          // Check if it's a data packet by looking for known data packet types
          const dataPacketTypes = ['showTempStackOptions', 'showLooseCardOptions'];

          if (dataPacketTypes.includes(result.type)) {
            logger.debug(`Data packet detected: ${result.type} from rule ${rule.id}`);
            return {
              isDataPacket: true,
              dataPacket: result
            };
          }
        }

        // Regular action
        return {
          isDataPacket: false,
          action: result
        };

      } catch (error) {
        logger.error(`Error executing action for rule ${rule.id}:`, error);
        throw error;
      }
    });

    // Separate data packets from actions
    const dataPackets = results.filter(r => r.isDataPacket).map(r => r.dataPacket);
    const actions = results.filter(r => !r.isDataPacket).map(r => r.action);

    // If we have data packets, return them separately
    if (dataPackets.length > 0) {
      logger.debug(`Returning ${dataPackets.length} data packets and ${actions.length} actions`);
      return {
        actions,
        dataPackets,  // 🎯 NEW: Data packets for frontend
        requiresModal: true,  // Data packets typically need modal
        errorMessage: null
      };
    }

    // Determine if modal is required for regular actions
    const requiresModal = matchingRules.some(rule =>
      rule.requiresModal ||
      actions.some(action => action.type === 'trail') ||  // Trail always requires modal
      actions.length > 1                                   // Multiple actions require modal
    );

    return {
      actions,
      dataPackets: [],  // No data packets
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
  totalGameActions++;
  const ruleHits = [];

  // Track which rules fire (minimal logging)
  const originalRules = [...engine.rules];

  // Patch rules to track hits
  engine.rules.forEach(rule => {
    const originalCondition = rule.condition;
    rule.condition = function(context) {
      const result = originalCondition.call(this, context);
      if (result) {
        ruleHits.push(rule.id);
        ruleUsageTracker.set(rule.id, (ruleUsageTracker.get(rule.id) || 0) + 1);
      }
      return result;
    };
  });

  try {
    const result = engine.determineActions(draggedItem, targetInfo, gameState);

    // Minimal summary logging
    if (ruleHits.length > 0) {
      console.log(`[RULES] Action #${totalGameActions}: ${ruleHits.join(',')} → ${result.actions.map(a => a.type).join(',')}`);
    }

    return result;
  } finally {
    // Restore original rules
    engine.rules = originalRules;
  }
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
        // Check stack capture possibilities - use sophisticated build values
        const stackValue = tableCard.displayValue ||
                          tableCard.captureValue ||
                          tableCard.buildValue ||
                          calculateCardSum(tableCard.cards || []);
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
