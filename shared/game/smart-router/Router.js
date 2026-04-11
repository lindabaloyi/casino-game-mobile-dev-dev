/**
 * Router (Consolidated)
 * Single entry point for all game action routing.
 * Replaces: SmartRouter + StackDropDispatcher
 * 
 * Layer 1: Action type routing
 * Layer 2: Context-specific routing (stack type, ownership, etc.)
 */

const StackHelper = require('./helpers/StackHelper');
const { areTeammates, isPartyGame } = require('../team');

// Handlers
const TempStackDropHandler = require('./handlers/TempStackDropHandler');
const FriendlyBuildHandler = require('./handlers/FriendlyBuildHandler');
const OpponentBuildHandler = require('./handlers/OpponentBuildHandler');

// Routers
const LooseCardRouter = require('./routers/LooseCardRouter');
const CaptureRouter = require('./routers/CaptureRouter');
const ExtendRouter = require('./routers/ExtendRouter');
const TempRouter = require('./routers/TempRouter');
const TrailRouter = require('./routers/TrailRouter');

class Router {
  constructor() {
    // Initialize handlers
    this.tempHandler = new TempStackDropHandler();
    this.friendlyHandler = new FriendlyBuildHandler();
    this.opponentHandler = new OpponentBuildHandler();
    
    // Initialize routers
    this.looseCardRouter = new LooseCardRouter();
    this.captureRouter = new CaptureRouter();
    this.extendRouter = new ExtendRouter();
    this.tempRouter = new TempRouter();
    this.trailRouter = new TrailRouter();
  }

  /**
   * Main route function - single entry point
   * @param {string} actionType - The incoming action type
   * @param {object} payload - The action payload
   * @param {object} state - Current game state
   * @param {number} playerIndex - The player making the action
   * @returns {{ type: string, payload: object }} - The routed action
   */
  route(actionType, payload, state, playerIndex) {
    console.log('[Router] actionType:', actionType);
    console.log('[Router] payload:', JSON.stringify(payload));
    console.log('[Router] playerIndex:', playerIndex);

    switch (actionType) {
      case 'stackDrop':
        return this.routeStackDrop(payload, state, playerIndex);

      case 'friendBuildDrop':
        return this.routeFriendBuildDrop(payload, state, playerIndex);

      case 'opponentBuildDrop':
        return this.routeOpponentBuildDrop(payload, state, playerIndex);

      case 'capture':
        return this.captureRouter.route(payload, state, playerIndex);

      case 'extendBuild':
        return this.extendRouter.route(payload, state, playerIndex);

      case 'createTemp':
        return this.routeCreateTemp(payload, state, playerIndex);

      case 'addToTemp':
        // Direct passthrough - validation happens in handler
        return { type: actionType, payload };

      case 'acceptTemp':
        return this.tempRouter.routeAcceptTemp(payload, state, playerIndex);

      case 'trail':
        return this.trailRouter.route(payload, state, playerIndex);

      default:
        // No routing needed
        return { type: actionType, payload };
    }
  }

  /**
   * Route stack drop action - handles temp, build, and loose card drops
   */
  routeStackDrop(payload, state, playerIndex) {
    const { stackType, stackId, card, cardSource } = payload;

    console.log('[Router.stackDrop] stackType:', stackType);
    console.log('[Router.stackDrop] stackId:', stackId);
    console.log('[Router.stackDrop] card:', card?.rank, card?.suit);

    // Route based on stack type
    switch (stackType) {
      case 'temp_stack':
        return this.routeTempStackDrop(payload, state, playerIndex);
      
      case 'build_stack':
        return this.routeBuildStackDrop(payload, state, playerIndex);
      
      default:
        // Loose card (no stackType)
        return this.looseCardRouter.routeCreateTemp(payload, state, playerIndex);
    }
  }

  /**
   * Route temp stack drop
   */
  routeTempStackDrop(payload, state, playerIndex) {
    const { stackId } = payload;
    
    console.log('[Router.tempStack] stackId:', stackId);
    
    // Validate temp stack exists
    const stack = state.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.stackId === stackId
    );

    if (!stack) {
      throw new Error(`Temp stack "${stackId}" not found`);
    }

    console.log('[Router.tempStack] found, owner:', stack.owner);
    
    // Delegate to handler
    return this.tempHandler.handle(payload, state, playerIndex);
  }

  /**
   * Route build stack drop
   */
  routeBuildStackDrop(payload, state, playerIndex) {
    const { stackId } = payload;

    console.log('[Router.buildStack] stackId:', stackId);

    // Find the build stack
    const stack = StackHelper.findStack(state, stackId);

    if (!stack) {
      throw new Error(`Build stack "${stackId}" not found`);
    }

    console.log('[Router.buildStack] found, owner:', stack.owner);

    // Determine if friendly (owned by player or teammate)
    const isFriendly = this.isFriendlyBuild(stack, playerIndex, state);
    console.log('[Router.buildStack] isFriendly:', isFriendly);

    // Route to appropriate handler
    if (isFriendly) {
      return this.friendlyHandler.handle(payload, stack, state, playerIndex);
    } else {
      return this.opponentHandler.handle(payload, stack, state, playerIndex);
    }
  }

  /**
   * Route friend build drop
   */
  routeFriendBuildDrop(payload, state, playerIndex) {
    const { stackId } = payload;

    console.log('[Router.friendBuildDrop] stackId:', stackId);

    // Find the build stack
    const stack = StackHelper.findStack(state, stackId);

    if (!stack) {
      throw new Error(`Build stack "${stackId}" not found`);
    }

    console.log('[Router.friendBuildDrop] found, owner:', stack.owner);

    // Verify it's friendly
    const isFriendly = this.isFriendlyBuild(stack, playerIndex, state);
    if (!isFriendly) {
      throw new Error(`Cannot perform friendBuildDrop on opponent's build (owner: ${stack.owner})`);
    }

    // Route to friendly handler
    return this.friendlyHandler.handle(payload, stack, state, playerIndex);
  }

  /**
   * Route opponent build drop
   */
  routeOpponentBuildDrop(payload, state, playerIndex) {
    const { stackId } = payload;

    console.log('[Router.opponentBuildDrop] stackId:', stackId);

    // Find the build stack
    const stack = StackHelper.findStack(state, stackId);

    if (!stack) {
      throw new Error(`Build stack "${stackId}" not found`);
    }

    console.log('[Router.opponentBuildDrop] found, owner:', stack.owner);

    // Verify it's opponent
    const isFriendly = this.isFriendlyBuild(stack, playerIndex, state);
    if (isFriendly) {
      throw new Error(`Cannot perform opponentBuildDrop on friendly build (owner: ${stack.owner})`);
    }

    // Route to opponent handler
    return this.opponentHandler.handle(payload, stack, state, playerIndex);
  }

  /**
   * Route createTemp action
   */
  routeCreateTemp(payload, state, playerIndex) {
    // Check if player already has a temp stack
    const existingTempStack = state.tableCards?.find(
      tc => tc.type === 'temp_stack' && tc.owner === playerIndex
    );
    
    if (existingTempStack) {
      // Already has temp stack - return no-op
      return { type: 'noop', payload: {} };
    }
    
    // If there's a targetCard, route through loose card logic
    if (payload?.targetCard) {
      return this.looseCardRouter.routeCreateTemp(payload, state, playerIndex);
    }
    
    // No target card - allow temp stack creation
    return { type: 'createTemp', payload };
  }

  /**
   * Check if a build is friendly (owned by player or teammate)
   */
  isFriendlyBuild(stack, playerIndex, state) {
    // Same owner - always friendly
    if (stack.owner === playerIndex) {
      return true;
    }

    // Determine party mode using the official helper
    const isPartyMode = isPartyGame(state);

    // Party mode - check teammates
    if (isPartyMode) {
      return areTeammates(playerIndex, stack.owner);
    }

    // Not party mode - only owner is friendly
    return false;
  }
}

module.exports = Router;
