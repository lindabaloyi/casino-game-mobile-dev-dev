/**
 * FriendlyBuildHandler
 * Handles card drops on builds owned by the player or a teammate.
 */

const ExtendRouter = require('../routers/ExtendRouter');
const { areTeammates } = require('../../team');
const { getConsecutivePartition } = require('../../buildCalculator');

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

    // Check if the build owner is a teammate (not the player themselves)
    const isTeammate = stack.owner !== playerIndex && areTeammates(playerIndex, stack.owner);
    console.log('[FriendlyBuildHandler] isTeammate:', isTeammate);

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
    let requiresChoice = false;

    if (isSameRankBuild) {
      const buildRank = stack.cards[0].rank;
      // For same-rank builds: allow any card to extend, but capture only with matching rank
      if (card.rank === buildRank) {
        // Matching rank: decide extend vs capture based on spare
        canExtend = true;
        canCapture = true;
        console.log('[FriendlyBuildHandler] Card matches build rank → both actions possible');
      } else {
        // Non-matching rank: only extension is possible (capture not allowed)
        canExtend = true;
        canCapture = false;
        console.log('[FriendlyBuildHandler] Non-matching rank → extension only');
      }
    } else {
        // Sum/diff – compute hasBase dynamically
        const cardValues = stack.cards.map(c => c.value);
        const groups = getConsecutivePartition(cardValues, target);
        const hasBase = (target > 5) && (groups.length > 1);
        console.log('[FriendlyBuildHandler] Partition groups:', groups, ', hasBase:', hasBase);
        
        // Check for spares when card value matches build value
        const playerHand = state.players[playerIndex]?.hand || [];
        const sameRankCount = playerHand.filter(c => c.rank === card.rank).length;
        const hasSpare = sameRankCount > 1;
        
        console.log('[FriendlyBuildHandler] Sum/diff: player has ' + sameRankCount + 'x ' + card.rank + ', spare exists: ' + hasSpare);
        
        // Small build logic (value ≤ 5): offer choice if player has card to capture extended build
        if (card.value === target && target <= 5 && !hasBase) {
          const newTarget = target + card.value;  // e.g., 5+5=10
          const hasNewTargetCard = playerHand.some(c => c.value === newTarget);
          if (hasNewTargetCard) {
            canExtend = true;
            canCapture = true;
            requiresChoice = true;
            console.log('[FriendlyBuildHandler] Small build (≤5): player has ' + newTarget + ' → offer choice');
          } else {
            canExtend = false;
            canCapture = true;
            console.log('[FriendlyBuildHandler] Small build (≤5): player lacks ' + newTarget + ' → only capture');
          }
        } else if (card.value === target && hasSpare) {
          // Rule: if card value equals build value and player has spare, allow extend
          canExtend = true;
          canCapture = false;  // Override capture when spare exists
          console.log('[FriendlyBuildHandler] Sum/diff, has spare → EXTEND');
        } else if (card.value === stack.value) {
          // No spare - can only capture
          canCapture = true;
          console.log('[FriendlyBuildHandler] Capture possible (card value matches build value, no spare)');
        }
        // Allow extension if card value is less than target (build value)
        // This is the user's rule: "any card less than our build is extension"
        if (card.value < target) {
          canExtend = true;
          console.log('[FriendlyBuildHandler] Extend possible (card value ' + card.value + ' < target ' + target + ')');
        }

        // ========== TEAMMATE OVERRIDE ==========
        // For teammates, allow extension even when card value equals target (no spare needed)
        if (isTeammate && card.value === target) {
          canExtend = true;
          canCapture = false;
          console.log('[FriendlyBuildHandler] Teammate override: force extension for value = target');
        }
        // =======================================

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
        const buildRank = stack.cards[0].rank;
        if (card.rank === buildRank) {
          // Matching rank: apply the spare rule for capture vs extend
          const playerHand = state.players[playerIndex]?.hand || [];
          const sameRankCount = playerHand.filter(c => c.rank === card.rank).length;
          const hasSpare = sameRankCount > 1;
          if (hasSpare) {
            console.log('[FriendlyBuildHandler] Same‑rank, has spare → EXTEND');
            return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
          } else {
            // No spare – capture would be allowed for own build, but for teammate it's disallowed
            if (isTeammate) {
              throw new Error('Cannot capture a teammate\'s build – you must have a spare card to extend it.');
            }
            console.log('[FriendlyBuildHandler] Same‑rank, no spare → CAPTURE');
            return { type: 'captureOwn', payload: { card, targetType: 'build', targetStackId: stackId } };
          }
        } else {
          // Non-matching rank: always extend (capture not possible)
          console.log('[FriendlyBuildHandler] Same‑rank, non‑matching card → EXTEND');
          return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
        }
      } else {
        // Sum/diff – no spare logic
        // For teammate builds: never allow capture, only extension
        if (isTeammate) {
          if (canExtend) {
            console.log('[FriendlyBuildHandler] Sum/diff, teammate → EXTEND');
            return this.extendRouter.route({ stackId, card, cardSource: source }, state, playerIndex);
          }
          throw new Error('Cannot capture a teammate\'s build – no extension possible with this card.');
        }
        // For own builds: allow capture or extend or offer choice
        if (requiresChoice) {
          // Player has card to capture extended build → offer choice
          const newTarget = target + card.value;
          console.log('[FriendlyBuildHandler] Sum/diff, CHOICE → return choice action');
          return { 
            type: 'choice', 
            payload: { 
              card, 
              stackId, 
              options: [
                { action: 'captureOwn', params: { card, targetType: 'build', targetStackId: stackId } },
                { action: 'extend', params: { stackId, card, cardSource: source } }
              ],
              extendedTarget: newTarget
            } 
          };
        }
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
