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
    const { stackType, stackId, card, targetCard, cardSource } = payload;
    
    console.log('[StackDropRouter.route] stackType:', stackType);
    console.log('[StackDropRouter.route] stackId:', stackId);
    console.log('[StackDropRouter.route] card:', card?.rank);
    
    // Temp stack drops - check for instant capture
    if (stackType === 'temp_stack') {
      return this.routeTempStackDrop(payload, state, playerIndex);
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
   * Route drop on a temp stack - check for instant capture
   */
  routeTempStackDrop(payload, state, playerIndex) {
    const { stackId, card, cardSource, stackOwner } = payload;
    
    console.log('[StackDropRouter.routeTempStackDrop] START');
    console.log('[StackDropRouter.routeTempStackDrop] stackId:', stackId);
    console.log('[StackDropRouter.routeTempStackDrop] stackOwner from payload:', stackOwner);
    console.log('[StackDropRouter.routeTempStackDrop] playerIndex:', playerIndex);
    console.log('[StackDropRouter.routeTempStackDrop] card:', card?.rank, card?.value);
    console.log('[StackDropRouter.routeTempStackDrop] cardSource:', cardSource);
    
    // Find the temp stack
    const stack = state.tableCards.find(
      tc => tc.type === 'temp_stack' && tc.stackId === stackId
    );
    
    console.log('[StackDropRouter.routeTempStackDrop] Found stack:', stack ? 'YES' : 'NO');
    if (stack) {
      console.log('[StackDropRouter.routeTempStackDrop] stack.owner:', stack.owner);
      console.log('[StackDropRouter.routeTempStackDrop] stack.cards:', stack.cards?.map(c => c.rank));
    }
    
    if (!stack) {
      console.log('[StackDropRouter.routeTempStackDrop] Stack NOT found, returning addToTemp');
      throw new Error(`Temp stack "${stackId}" not found`);
    }
    
    // Only check capture for player's own temp stack
    console.log('[StackDropRouter.routeTempStackDrop] Checking stack.owner vs playerIndex:', stack.owner, 'vs', playerIndex);
    if (stack.owner !== playerIndex) {
      console.log('[StackDropRouter.routeTempStackDrop] Owner mismatch - returning addToTemp');
      // Not owner's stack - just add to temp (other player is adding to it)
      return { 
        type: 'addToTemp', 
        payload: { card, stackId, source: cardSource } 
      };
    }
    
    console.log('[StackDropRouter.routeTempStackDrop] Owner matches - checking for instant capture');
    
    // Get player's hand to check how many matching cards they have
    const playerHand = state.players[playerIndex].hand || [];
    console.log('[StackDropRouter.routeTempStackDrop] Player hand:', playerHand.map(c => c.rank));
    
    // Check if the dropped card matches the build hint (need value)
    // This enables instant capture without showing PlayOptionsModal
    const stackValues = stack.cards.map(c => c.value);
    const buildInfo = calculateBuildValue(stackValues);
    
    console.log('[StackDropRouter.routeTempStackDrop] stackValues:', stackValues);
    console.log('[StackDropRouter.routeTempStackDrop] buildInfo:', buildInfo);
    
    // Check if dropped card can capture a COMPLETE temp stack (need: 0)
    // This is like acceptTemp - the card value equals the build value
    // ONLY auto-capture if player has exactly 1 matching card
    if (buildInfo && buildInfo.need === 0 && buildInfo.value > 0) {
      console.log('[StackDropRouter.routeTempStackDrop] Temp stack is complete, checking capture');
      if (card.value === buildInfo.value) {
        // Count how many cards in hand match this value
        const matchingCards = playerHand.filter(c => c.value === buildInfo.value);
        
        // Only auto-capture if player has EXACTLY ONE matching card
        if (matchingCards.length === 1) {
          console.log(`[StackDropRouter.routeTempStackDrop] Card ${card.rank} matches build value ${buildInfo.value}, player has exactly 1 - capturing!`);
          return {
            type: 'captureTemp',
            payload: { card, stackId, source: cardSource }
          };
        } else if (matchingCards.length > 1) {
          console.log(`[StackDropRouter.routeTempStackDrop] Multiple matching cards (${matchingCards.length}), routing to addToTemp for player choice`);
        }
      }
    }
    
    // Check if dropped card matches the build hint (need value) for incomplete builds
    // ONLY auto-capture if player has exactly 1 matching card
    if (buildInfo && buildInfo.need > 0) {
      // There's a build hint - check if dropped card matches
      if (card.value === buildInfo.need) {
        // Count how many cards in hand match this value
        const matchingCards = playerHand.filter(c => c.value === buildInfo.need);
        
        // Only auto-capture if player has EXACTLY ONE matching card
        if (matchingCards.length === 1) {
          console.log(`[StackDropRouter] Instant capture: card ${card.rank} matches need ${buildInfo.need}, player has exactly 1 matching card`);
          return {
            type: 'captureTemp',
            payload: { card, stackId, source: cardSource }
          };
        } else if (matchingCards.length > 1) {
          console.log(`[StackDropRouter] Multiple matching cards (${matchingCards.length}), showing modal for choice`);
        }
      }
    }
    
    // Also check if it's a same-rank capture (all cards same rank)
    const allSameRank = stack.cards.length > 0 && stack.cards.every(c => c.rank === stack.cards[0].rank);
    if (allSameRank && card.rank === stack.cards[0].rank) {
      // Count how many cards in hand match this rank
      const matchingCards = playerHand.filter(c => c.rank === stack.cards[0].rank);
      
      // Only auto-capture if player has EXACTLY ONE matching card
      if (matchingCards.length === 1) {
        console.log(`[StackDropRouter] Instant capture: same rank ${card.rank}, player has exactly 1 matching card`);
        return {
          type: 'captureTemp',
          payload: { card, stackId, source: cardSource }
        };
      } else if (matchingCards.length > 1) {
        console.log(`[StackDropRouter] Multiple matching cards (${matchingCards.length}), showing modal for choice`);
      }
    }
    
    // No instant capture - add to temp as normal
    return { 
      type: 'addToTemp', 
      payload: { card, stackId, source: cardSource } 
    };
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

    // Determine if the build is friendly (owner or teammate in party mode)
    const isFriendly = this.isFriendlyBuild(stack, playerIndex, state);
    
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
      return true;
    }

    // Party mode (4 players) → check teammates
    if (state.playerCount === 4) {
      // Players 0,1 = Team A ; 2,3 = Team B
      const ownerTeam = stack.owner < 2 ? 'A' : 'B';
      const playerTeam = playerIndex < 2 ? 'A' : 'B';
      return ownerTeam === playerTeam;
    }

    // Duel mode → only owner is friendly
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
      return { 
        type: 'startBuildExtension', 
        payload: { card, stackId, cardSource: source } 
      };
    }

    // 4. If card is from hand, check if it can capture this build
    // Note: In party mode, friendly builds (teammates) should NOT be capturable - card should stack instead
    if (source === 'hand') {
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
