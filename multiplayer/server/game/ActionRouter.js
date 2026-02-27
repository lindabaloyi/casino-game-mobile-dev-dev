/**
 * ActionRouter
 * Routes incoming game-action events to the correct handler function.
 *
 * Handler contract:
 *   (gameState, payload, playerIndex) => newGameState   (pure, no side effects)
 *
 * The router:
 *   1. Validates the action type is registered
 *   2. Calls the handler
 *   3. Saves the returned state back to GameManager
 *   4. Returns the new state so the coordinator can broadcast it
 */

/**
 * Calculate the build target value from a stack of cards.
 * Uses the same logic as the frontend build icon:
 * - Find largest card = base
 * - Find subset of other cards that sums closest to base
 * - If exact match (diff=0), target = base
 * - Otherwise, target = best achievable sum
 */
function calculateBuildTarget(cards) {
  if (!cards || cards.length === 0) return 0;
  
  if (cards.length === 1) {
    return cards[0].value;
  }

  // Sort descending
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  const base = sorted[0].value;
  const otherCards = sorted.slice(1);

  // Find best subset sum
  const bestSum = findBestSubsetSum(otherCards, base);
  const diff = base - bestSum;

  if (diff === 0) {
    // Exact match - target is the base value
    return base;
  } else {
    // Incomplete - target is the best achievable sum
    return bestSum;
  }
}

/**
 * Find the maximum sum from subset of cards that doesn't exceed target.
 */
function findBestSubsetSum(cards, target) {
  if (cards.length === 0) return 0;

  const dp = new Array(target + 1).fill(0);

  for (const card of cards) {
    for (let s = target; s >= card.value; s--) {
      dp[s] = Math.max(dp[s], dp[s - card.value] + card.value);
    }
  }

  return dp[target];
}

class ActionRouter {
  constructor(gameManager) {
    this.gameManager = gameManager;
    // Loaded from actions/index.js — a plain { actionType: handlerFn } map
    this.handlers = require('./actions/index.js');
  }

  /**
   * Execute an action.
   * @param {string}  gameId
   * @param {number}  playerIndex
   * @param {{ type: string, payload: any }} action
   * @returns {object} updated game state
   * @throws if action type is unknown or handler throws
   */
  executeAction(gameId, playerIndex, action) {
    const { type, payload } = action;

    // 1. Guard: unknown action
    if (!this.handlers[type]) {
      const known = Object.keys(this.handlers).join(', ') || '(none registered yet)';
      throw new Error(`Unknown action "${type}". Registered: ${known}`);
    }

    // 2. Get current state
    const state = this.gameManager.getGameState(gameId);
    if (!state) throw new Error(`Game "${gameId}" not found`);

    // 3. Guard: wrong player's turn
    if (state.currentPlayer !== playerIndex) {
      throw new Error(`Not your turn (current player: ${state.currentPlayer})`);
    }

    // 4. Special routing for capture action on build/temp targets
    let finalActionType = type;
    let finalPayload = payload;

    if (type === 'capture' && payload?.targetType === 'build' && payload?.targetStackId) {
      // Find the stack (build_stack or temp_stack)
      const stack = state.tableCards.find(
        tc => (tc.type === 'build_stack' || tc.type === 'temp_stack') && tc.stackId === payload.targetStackId,
      );

      if (stack) {
        const isBuildStack = stack.type === 'build_stack';
        const isOwner = stack.owner === playerIndex;

        // Calculate the target value using subset sum logic
        const targetValue = calculateBuildTarget(stack.cards);
        
        console.log(`[ActionRouter] Capture check: card value ${payload.card.value} vs target value ${targetValue} (stack.value=${stack.value})`);
        console.log(`[ActionRouter] Stack type: ${stack.type}, isOwner: ${isOwner}`);

        if (payload.card.value === targetValue) {
          // Card matches target - always capture for build stacks (anyone can capture)
          // For temp stacks, only capture if it's not owner (owner should addToTemp)
          if (isBuildStack || !isOwner) {
            finalActionType = 'capture';
            console.log(`[ActionRouter] Card matches target - calling capture`);
          } else {
            // Owner of temp stack with matching card - route to addToTemp
            finalActionType = 'addToTemp';
            finalPayload = {
              card: payload.card,
              stackId: payload.targetStackId,
            };
            console.log(`[ActionRouter] Owner of temp stack - routing to addToTemp`);
          }
        } else {
          // Card doesn't match target
          if (isOwner && stack.type === 'temp_stack') {
            // Owner can add to their temp stack
            finalActionType = 'addToTemp';
            finalPayload = {
              card: payload.card,
              stackId: payload.targetStackId,
            };
            console.log(`[ActionRouter] Card doesn't match target - routing to addToTemp (owner)`);
          } else {
            // Can't add to opponent's temp stack or non-matching card on build
            throw new Error(`Cannot add card to stack - no matching target`);
          }
        }
      }
    }

    // 5. Execute handler — pure function returns new state
    const handler = this.handlers[finalActionType];
    const newState = handler(state, finalPayload || {}, playerIndex);

    // 6. Persist updated state
    this.gameManager.saveGameState(gameId, newState);

    return newState;
  }

  /**
   * Returns true if an action type is registered.
   */
  supports(actionType) {
    return Boolean(this.handlers[actionType]);
  }

  /**
   * List all registered action types (useful for debugging).
   */
  registeredActions() {
    return Object.keys(this.handlers);
  }
}

module.exports = ActionRouter;
