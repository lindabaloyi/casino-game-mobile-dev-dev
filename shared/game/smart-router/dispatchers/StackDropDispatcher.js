/**
 * StackDropDispatcher
 * Main entry point for stack drop routing.
 * Dispatches to the appropriate handler based on stack type and ownership.
 */

const StackHelper = require('../helpers/StackHelper');
const TempStackDropHandler = require('../handlers/TempStackDropHandler');
const FriendlyBuildHandler = require('../handlers/FriendlyBuildHandler');
const OpponentBuildHandler = require('../handlers/OpponentBuildHandler');
const LooseCardRouter = require('../routers/LooseCardRouter');
const { areTeammates } = require('../../team');

class StackDropDispatcher {
  constructor() {
    this.tempHandler = new TempStackDropHandler();
    this.friendlyHandler = new FriendlyBuildHandler();
    this.opponentHandler = new OpponentBuildHandler();
    this.looseCardRouter = new LooseCardRouter();
  }

  /**
   * Route a stack drop action to the appropriate handler.
   * @param {object} payload - { stackType, stackId, card, stackOwner, cardSource }
   * @param {object} state - Game state
   * @param {number} playerIndex - Player making the drop
   * @returns {object} - { type: string, payload: object }
   */
  route(payload, state, playerIndex) {
    const { stackType, stackId, card, stackOwner, cardSource } = payload;

    console.log('[StackDropDispatcher] Starting route');
    console.log('[StackDropDispatcher] stackType:', stackType);
    console.log('[StackDropDispatcher] stackId:', stackId);
    console.log('[StackDropDispatcher] card:', card?.rank, card?.suit);
    console.log('[StackDropDispatcher] cardSource:', cardSource);

    // Temp stack drops
    if (stackType === 'temp_stack') {
      console.log('[StackDropDispatcher] Temp stack - delegating to TempStackDropHandler');
      return this.tempHandler.handle(payload, state, playerIndex);
    }

    // Build stack drops
    if (stackType === 'build_stack') {
      console.log('[StackDropDispatcher] Build stack - finding stack');
      const stack = StackHelper.findStack(state, stackId);
      
      if (!stack) {
        console.log('[StackDropDispatcher] Build stack NOT found - throwing error');
        throw new Error(`Build stack "${stackId}" not found`);
      }

      console.log('[StackDropDispatcher] Found stack, owner:', stack.owner);

      // Determine if friendly
      const isFriendly = this.isFriendlyBuild(stack, playerIndex, state);
      console.log('[StackDropDispatcher] Is friendly:', isFriendly);

      if (isFriendly) {
        console.log('[StackDropDispatcher] Friendly build - delegating to FriendlyBuildHandler');
        return this.friendlyHandler.handle(payload, stack, state, playerIndex);
      } else {
        console.log('[StackDropDispatcher] Opponent build - delegating to OpponentBuildHandler');
        return this.opponentHandler.handle(payload, stack, state, playerIndex);
      }
    }

    // Unknown stack type - delegate to LooseCardRouter
    console.log('[StackDropDispatcher] Unknown stack type - delegating to LooseCardRouter');
    return this.looseCardRouter.routeCreateTemp(payload, state, playerIndex);
  }

  /**
   * Check if a build is friendly (owned by player or teammate).
   * @param {object} stack - Build stack
   * @param {number} playerIndex - Player index
   * @param {object} state - Game state
   * @returns {boolean}
   */
  isFriendlyBuild(stack, playerIndex, state) {
    // Same owner - always friendly
    if (stack.owner === playerIndex) {
      return true;
    }

    // Determine actual party mode: must have 4 players AND team properties
    // In party mode, players have team: 'A' or 'B'. In freeforall, they have no team.
    const isPartyMode = state.playerCount === 4 && state.players.some(p => p.team);

    // Party mode - check teammates (only if actual teams exist)
    if (isPartyMode) {
      return areTeammates(playerIndex, stack.owner);
    }

    // Three-hands mode (playerCount === 3): no teammates - only owner is friendly
    // Four-hands free-for-all (playerCount === 4, no teams): no teammates - only owner is friendly
    return false;
  }
}

module.exports = StackDropDispatcher;
