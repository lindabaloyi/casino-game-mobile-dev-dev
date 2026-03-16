/**
 * SmartRouter (Shared)
 * Main orchestrator for game action routing.
 * 
 * Delegates to specialized routers for each action type:
 * - StackDropDispatcher: handles stack drops (temp/build) via focused handlers
 * - CaptureRouter: handles capture/steal logic
 * - LooseCardRouter: handles loose card capture vs createTemp
 * - ExtendRouter: handles build extension
 * - TempRouter: handles temp stack validation
 * - TrailRouter: handles trail validation
 * 
 * Benefits:
 * - Each router has single responsibility
 * - Easy to test in isolation
 * - Easy to modify one area without affecting others
 */

const StackDropDispatcher = require('./dispatchers/StackDropDispatcher');
const CaptureRouter = require('./routers/CaptureRouter');
const LooseCardRouter = require('./routers/LooseCardRouter');
const ExtendRouter = require('./routers/ExtendRouter');
const TempRouter = require('./routers/TempRouter');
const TrailRouter = require('./routers/TrailRouter');

class SmartRouter {
  constructor() {
    this.stackDropDispatcher = new StackDropDispatcher();
    this.captureRouter = new CaptureRouter();
    this.looseCardRouter = new LooseCardRouter();
    this.extendRouter = new ExtendRouter();
    this.tempRouter = new TempRouter();
    this.trailRouter = new TrailRouter();
  }

  /**
   * Main route function - decides what handler to call
   * @param {string} actionType - The incoming action type
   * @param {object} payload - The action payload
   * @param {object} state - Current game state
   * @param {number} playerIndex - The player making the action
   * @returns {{ type: string, payload: object }} - The routed action
   */
  route(actionType, payload, state, playerIndex) {
    console.log('[SmartRouter.route] actionType:', actionType);
    console.log('[SmartRouter.route] payload:', JSON.stringify(payload));
    console.log('[SmartRouter.route] playerIndex:', playerIndex);
    
    switch (actionType) {
      case 'stackDrop':
        return this.stackDropDispatcher.route(payload, state, playerIndex);
      
      case 'capture':
        return this.captureRouter.route(payload, state, playerIndex);
      
      case 'extendBuild':
        return this.extendRouter.route(payload, state, playerIndex);
      
      case 'createTemp':
        // Check if player already has a temp stack - if so, don't allow creating another
        const existingTempStack = state.tableCards?.find(
          tc => tc.type === 'temp_stack' && tc.owner === playerIndex
        );
        if (existingTempStack) {
          // Player already has a temp stack - return no-op (state unchanged)
          // This prevents the error while allowing the game to continue
          return { type: 'noop', payload: {} };
        }
        
        // If there's a targetCard, route through smart loose card logic
        if (payload?.targetCard) {
          return this.looseCardRouter.routeCreateTemp(payload, state, playerIndex);
        }
        // No target card - allow temp stack creation
        return { type: actionType, payload };
      
      case 'addToTemp':
        // Allow adding to temp - validation happens in handler
        return { type: actionType, payload };
      
      case 'acceptTemp':
        return this.tempRouter.routeAcceptTemp(payload, state, playerIndex);
      
      case 'trail':
        return this.trailRouter.route(payload, state, playerIndex);
      
      default:
        // No routing needed for other actions
        return { type: actionType, payload };
    }
  }
}

module.exports = SmartRouter;
