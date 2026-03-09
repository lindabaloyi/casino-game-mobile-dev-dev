/**
 * StackDropRouter
 * Handles all stack drop decisions.
 * - temp_stack → addToTemp
 * - build_stack → check ownership + team for smart routing
 * - loose card (via createTemp pathway) → check hand for capture vs temp
 */

const StackHelper = require('../helpers/StackHelper');
const CaptureRouter = require('./CaptureRouter');
const ExtendRouter = require('./ExtendRouter');
const LooseCardRouter = require('./LooseCardRouter');
const { areTeammates } = require('../../team');
const { canCaptureBuild, calculateBuildValue } = require('../../buildCalculator');

class StackDropRouter {
  constructor() {
    this.captureRouter = new CaptureRouter();
    this.extendRouter = new ExtendRouter();
    this.looseCardRouter = new LooseCardRouter();
  }

  /**
   * Main entry point for stack drop routing
   */
  route(payload, state, playerIndex) {
    const { stackType, stackId, card, targetCard } = payload;
    
    // Temp stack drops
    if (stackType === 'temp_stack') {
      return { 
        type: 'addToTemp', 
        payload: { card, stackId } 
      };
    }
    
    // Build stack drops
    if (stackType === 'build_stack') {
      return this.routeBuildStackDrop(payload, state, playerIndex);
    }
    
    // Loose card drops (no stack) - delegate to LooseCardRouter
    const source = this.getCardSource(state, playerIndex, card);
    return this.looseCardRouter.routeCreateTemp({ ...payload, source }, state, playerIndex);
  }

  /**
   * Route drop on a build stack
   */
  routeBuildStackDrop(payload, state, playerIndex) {
    const { stackId, card } = payload;
    
    const stack = StackHelper.findStack(state, stackId);
    if (!stack) {
      throw new Error(`Build stack "${stackId}" not found`);
    }
    
    console.log(`[StackDropRouter] routeBuildStackDrop - stackId: ${stackId}, owner: ${stack.owner}, player: ${playerIndex}, playerCount: ${state.playerCount}`);

    // Determine if the build is friendly (owner or teammate in party mode)
    const isFriendly = this.isFriendlyBuild(stack, playerIndex, state);
    console.log(`[StackDropRouter] isFriendlyBuild result: ${isFriendly}, ownerTeam: ${stack.owner < 2 ? 'A' : 'B'}, playerTeam: ${playerIndex < 2 ? 'A' : 'B'}`);
    
    if (isFriendly) {
      return this.routeOwnBuildDrop(payload, stack, state, playerIndex);
    } else {
      return this.routeOpponentBuildDrop(payload, stack, state, playerIndex);
    }
  }

  /**
   * Check if the player is allowed to treat this build as "friendly"
   * (owner or teammate in party mode)
   */
  isFriendlyBuild(stack, playerIndex, state) {
    // Same owner → always friendly
    if (stack.owner === playerIndex) {
      console.log(`[StackDropRouter] isFriendlyBuild: same owner (${stack.owner} === ${playerIndex}) → true`);
      return true;
    }

    // Party mode (4 players) → check teammates
    console.log(`[StackDropRouter] isFriendlyBuild: playerCount=${state.playerCount}, checking party mode`);
    if (state.playerCount === 4) {
      // Players 0,1 = Team A ; 2,3 = Team B
      const ownerTeam = stack.owner < 2 ? 'A' : 'B';
      const playerTeam = playerIndex < 2 ? 'A' : 'B';
      console.log(`[StackDropRouter] isFriendlyBuild: ownerTeam=${ownerTeam}, playerTeam=${playerTeam}`);
      return ownerTeam === playerTeam;
    }

    // Duel mode → only owner is friendly
    console.log(`[StackDropRouter] isFriendlyBuild: duel mode → false`);
    return false;
  }

  /**
   * Determine the source of a card (hand, table, or capture)
   * Note: This is a simplified version; in practice the payload should contain the source.
   */
  getCardSource(state, playerIndex, card) {
    // Check player's hand
    const playerHand = state.players?.[playerIndex]?.hand || [];
    if (playerHand.some(c => c.rank === card.rank && c.suit === card.suit)) {
      return 'hand';
    }

    // Check table
    if (state.tableCards.some(tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit)) {
      return 'table';
    }

    // Check captures (own first, then teammates in party mode)
    // For a complete solution, the UI should provide the source in the payload.
    return 'hand'; // fallback
  }

  /**
   * Calculate possible capture values for a set of cards (same rank)
   */
  getPossibleCaptureValues(cards) {
    if (!cards || cards.length === 0) return [];
    
    const cardValue = cards[0].value;
    const count = cards.length;
    const possibleValues = [];
    
    for (let i = 1; i <= count; i++) {
      const sum = cardValue * i;
      possibleValues.push(sum);
      
      // Handle Ace (A=1 or 14) edge case
      if (cards[0].rank === 'A') {
        const altSum = 14 + (cardValue - 1) * (i - 1);
        if (!possibleValues.includes(altSum) && altSum <= 14) {
          possibleValues.push(altSum);
        }
      }
    }
    
    return [...new Set(possibleValues)].sort((a, b) => a - b);
  }

  /**
   * Check if player has spare cards of the SAME RANK as the dropped card
   */
  checkForExtension(hand, droppedCardRank) {
    const sameRankCount = hand.filter(c => c.rank === droppedCardRank).length;
    if (sameRankCount > 1) {
      return { 
        canExtend: true, 
        reason: `spare ${droppedCardRank} exists (${sameRankCount} in hand)`
      };
    }
    return { canExtend: false, reason: 'no spare of dropped card rank' };
  }

  /**
   * Route drop on own (or friendly) build
   */
  routeOwnBuildDrop(payload, stack, state, playerIndex) {
    const { stackId, card } = payload;
    
    // 1. Pending extension? Delegate to ExtendRouter
    if (stack.pendingExtension?.looseCard || stack.pendingExtension?.cards) {
      const cardSource = this.getCardSource(state, playerIndex, card);
      return this.extendRouter.route({ stackId, card, cardSource }, state, playerIndex);
    }

    // 2. Determine where the dropped card is coming from
    const source = this.getCardSource(state, playerIndex, card);

    // 3. Check for spare cards that could extend the build
    const hand = state.players[playerIndex].hand;
    const extensionCheck = this.checkForExtension(hand, card.rank);
    
    if (extensionCheck.canExtend) {
      console.log(`[StackDropRouter] Extending build: ${extensionCheck.reason}`);
      return { 
        type: 'startBuildExtension', 
        payload: { card, stackId, cardSource: source } 
      };
    }

    // 4. If card is from hand, check if it can capture this build
    // Note: In party mode, friendly builds (teammates) should NOT be capturable - card should stack instead
    // Also: If build has Shiya from teammate, owner CANNOT capture - must extend instead
    if (source === 'hand') {
      // Check if Shiya is active from a teammate - if so, owner cannot capture
      if (stack.shiyaActive && stack.shiyaPlayer !== undefined) {
        const isShiyaByTeammate = areTeammates(stack.owner, stack.shiyaPlayer) && stack.shiyaPlayer !== stack.owner;
        if (isShiyaByTeammate) {
          console.log(`[StackDropRouter] Build has Shiya from teammate → owner cannot capture, routing to extend`);
          const cardSource = this.getCardSource(state, playerIndex, card);
          return this.extendRouter.route({ stackId, card, cardSource }, state, playerIndex);
        }
      }
      
      const buildCards = stack.cards || [];
      let canCapture = false;

      // Only allow capture if it's the owner's build (not teammate's)
      const isOwner = stack.owner === playerIndex;
      
      if (isOwner && buildCards.length > 0) {
        // Use the shared build calculator for proper multi-card build validation
        const buildValues = buildCards.map(c => c.value);
        canCapture = canCaptureBuild(card.value, buildValues);
      }

      if (canCapture) {
        return {
          type: 'captureOwn',
          payload: { card, targetType: 'build', targetStackId: stackId }
        };
      }
    }

    // 5. Otherwise, delegate to ExtendRouter (stacking the card)
    const cardSource = this.getCardSource(state, playerIndex, card);
    return this.extendRouter.route({ stackId, card, cardSource }, state, playerIndex);
  }

  /**
   * Route drop on opponent's build
   */
  routeOpponentBuildDrop(payload, stack, state, playerIndex) {
    return this.captureRouter.route(
      { card: payload.card, targetType: 'build', targetStackId: payload.stackId },
      state,
      playerIndex
    );
  }
}

module.exports = StackDropRouter;
