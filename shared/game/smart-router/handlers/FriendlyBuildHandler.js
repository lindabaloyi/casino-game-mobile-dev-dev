/**
 * FriendlyBuildHandler
 * Handles card drops on builds owned by the player or a teammate.
 */

const ExtendRouter = require('../routers/ExtendRouter');

class FriendlyBuildHandler {
  constructor() {
    this.extendRouter = new ExtendRouter();
  }

  handle(payload, stack, state, playerIndex) {
    const { stackId, card, cardSource } = payload;

    console.log('[FriendlyBuildHandler] ========== START ==========');
    console.log('[FriendlyBuildHandler] Build ID:', stackId);
    console.log('[FriendlyBuildHandler] Card:', card?.rank, card?.suit, 'value:', card?.value);
    console.log('[FriendlyBuildHandler] Stack owner:', stack.owner);
    console.log('[FriendlyBuildHandler] Stack cards:', stack.cards?.map(c => `${c.rank}${c.suit}`).join(', '));
    console.log('[FriendlyBuildHandler] Stack value:', stack.value, 'target:', stack.target, 'currentTotal:', stack.currentTotal);
    console.log('[FriendlyBuildHandler] Pending extension:', stack.pendingExtension);

    const source = cardSource || this.getCardSource(state, playerIndex, card);
    console.log('[FriendlyBuildHandler] Card source:', source);

    const isSameRankBuild = stack.cards?.length > 0 &&
                            stack.cards.every(c => c.rank === stack.cards[0].rank);
    console.log('[FriendlyBuildHandler] Build type:', isSameRankBuild ? 'same-rank' : 'sum/diff');

    let target = stack.target;
    let currentTotal = stack.currentTotal;

    if (!isSameRankBuild) {
      if (target === undefined && stack.value !== undefined) {
        target = stack.value;
        console.warn('[FriendlyBuildHandler] stack.target missing, using stack.value as target:', target);
      }
      if (currentTotal === undefined && stack.cards) {
        currentTotal = stack.cards.reduce((sum, c) => sum + c.value, 0);
        console.warn('[FriendlyBuildHandler] stack.currentTotal missing, computed from cards:', currentTotal);
      }
      if (target === undefined || currentTotal === undefined) {
        throw new Error(
          `Invalid build: missing target/currentTotal. Build value: ${stack.value}, cards: ${stack.cards?.map(c => `${c.rank}${c.suit}`).join(', ')}`
        );
      }
      console.log('[FriendlyBuildHandler] Using target:', target, 'currentTotal:', currentTotal);
    }

    let canExtend = false;
    let canCapture = false;

    const isOwnBuild = stack.owner === playerIndex;

    if (isSameRankBuild) {
      canExtend = true;
      canCapture = true;
      console.log('[FriendlyBuildHandler] Card matches build rank → both actions possible');
    } else {
        const playerHand = state.players[playerIndex]?.hand || [];
        const sameRankCount = playerHand.filter(c => c.rank === card.rank).length;
        const hasSpare = sameRankCount > 1;
        
        console.log('[FriendlyBuildHandler] Sum/diff: player has ' + sameRankCount + 'x ' + card.rank + ', spare exists: ' + hasSpare);
        
        if (isOwnBuild) {
          console.log('[FriendlyBuildHandler] Extending own build → spare check applies');
          if (card.value === target && hasSpare) {
            canExtend = true;
            canCapture = false;
            console.log('[FriendlyBuildHandler] Sum/diff, has spare → EXTEND');
          } else if (card.value === stack.value) {
            canCapture = true;
            console.log('[FriendlyBuildHandler] Capture possible (card value matches build value, no spare)');
          }
          if (card.value < target) {
            canExtend = true;
            console.log('[FriendlyBuildHandler] Extend possible (card value ' + card.value + ' < target ' + target + ')');
          }
        } else {
          console.log('[FriendlyBuildHandler] Extending teammate\'s build → no spare check needed');
          canExtend = true;
          if (card.value === stack.value) {
            canCapture = true;
            console.log('[FriendlyBuildHandler] Capture also possible (card value matches build value)');
          }
          if (card.value < target) {
            console.log('[FriendlyBuildHandler] Extend possible (card value ' + card.value + ' < target ' + target + ')');
          }
        }
        if (!canExtend && !canCapture) {
          if (currentTotal === target) {
            throw new Error(`Build already complete (total ${target}). Only capture with ${target}.`);
          }
          throw new Error(`Cannot extend or capture: ${card.rank}${card.suit} (${card.value}) on build (value=${stack.value}, total=${currentTotal}/${target})`);
        }
      }

    // Decide action
    // Handle all non-hand sources (table, captured, captured_<index>) - only extension allowed
    const isFromHand = source === 'hand';
    const isFromCaptured = source === 'captured' || source?.startsWith('captured_');
    
    if (isFromHand || isFromCaptured) {
      if (isSameRankBuild) {
        if (isOwnBuild) {
          const playerHand = state.players[playerIndex]?.hand || [];
          const sameRankCount = playerHand.filter(c => c.rank === card.rank).length;
          const hasSpare = sameRankCount > 1;
          if (hasSpare) {
            console.log('[FriendlyBuildHandler] Same‑rank own build, has spare → EXTEND');
            return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
          } else {
            console.log('[FriendlyBuildHandler] Same‑rank own build, no spare → CAPTURE');
            return { type: 'captureOwn', payload: { card, targetType: 'build', targetStackId: stackId } };
          }
        } else {
          console.log('[FriendlyBuildHandler] Same‑rank teammate\'s build → EXTEND');
          return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
        }
      } else {
        if (!isOwnBuild) {
          if (canExtend) {
            console.log('[FriendlyBuildHandler] Sum/diff teammate\'s build → EXTEND');
            return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
          }
          if (canCapture) {
            console.log('[FriendlyBuildHandler] Sum/diff, capture → CAPTURE');
            return { type: 'captureOwn', payload: { card, targetType: 'build', targetStackId: stackId } };
          }
        } else {
          if (canCapture) {
            console.log('[FriendlyBuildHandler] Sum/diff, capture → CAPTURE');
            return { type: 'captureOwn', payload: { card, targetType: 'build', targetStackId: stackId } };
          }
          if (canExtend) {
            console.log('[FriendlyBuildHandler] Sum/diff, extend → EXTEND');
            return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
          }
        }
      }
    } else {
      // Card from table – only extension is possible (capture from table handled elsewhere)
      if (canExtend) {
        console.log('[FriendlyBuildHandler] Table card, extend → EXTEND');
        return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
      }
      throw new Error(`Cannot drop table card ${card.rank}${card.suit} on this build (cannot extend)`);
    }

    throw new Error('Unreachable state');
  }

  getCardSource(state, playerIndex, card) {
    const hand = state.players?.[playerIndex]?.hand || [];
    if (hand.some(c => c.rank === card.rank && c.suit === card.suit)) return 'hand';
    const onTable = state.tableCards?.some(tc => !tc.type && tc.rank === card.rank && tc.suit === card.suit);
    return onTable ? 'table' : 'table';
  }
}

module.exports = FriendlyBuildHandler;
