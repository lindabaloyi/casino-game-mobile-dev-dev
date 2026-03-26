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

    if (isSameRankBuild) {
      const buildRank = stack.cards[0].rank;
      if (card.rank !== buildRank) {
        throw new Error(`Cannot drop ${card.rank}${card.suit} on same‑rank build of ${buildRank}`);
      }
      canExtend = true;
      canCapture = true;
      console.log('[FriendlyBuildHandler] Card matches build rank → both actions possible');
    } else {
      // Sum/diff build – arithmetic only
      if (card.value === stack.value) {
        canCapture = true;
        console.log('[FriendlyBuildHandler] Capture possible (card value matches build value)');
      }
      if (card.value + currentTotal === target) {
        canExtend = true;
        console.log('[FriendlyBuildHandler] Extend possible (card + current = target)');
      }
      if (!canExtend && !canCapture) {
        if (currentTotal === target) {
          throw new Error(`Build already complete (total ${target}). Only capture with ${target}.`);
        }
        throw new Error(`Cannot extend or capture: ${card.rank}${card.suit} (${card.value}) on build (value=${stack.value}, total=${currentTotal}/${target})`);
      }
    }

    // Decide action
    if (source === 'hand') {
      if (isSameRankBuild) {
        const playerHand = state.players[playerIndex]?.hand || [];
        const sameRankCount = playerHand.filter(c => c.rank === card.rank).length;
        const hasSpare = sameRankCount > 1;
        if (hasSpare) {
          console.log('[FriendlyBuildHandler] Same‑rank, has spare → EXTEND');
          return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
        } else {
          console.log('[FriendlyBuildHandler] Same‑rank, no spare → CAPTURE');
          return { type: 'captureOwn', payload: { card, targetType: 'build', targetStackId: stackId } };
        }
      } else {
        // Sum/diff – no spare logic
        if (canCapture) {
          console.log('[FriendlyBuildHandler] Sum/diff, capture → CAPTURE');
          return { type: 'captureOwn', payload: { card, targetType: 'build', targetStackId: stackId } };
        }
        if (canExtend) {
          console.log('[FriendlyBuildHandler] Sum/diff, extend → EXTEND');
          return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
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
