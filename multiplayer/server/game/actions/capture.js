/**
 * Helper: Calculate all possible capture values for identical card builds
 * For n cards of rank R, possible values = R, 2R, 3R, ..., nR
 * Handles Ace (1 or 11, treated as 1 for multiplication)
 */
function getPossibleCaptureValues(cards) {
  if (cards.length === 0) return [];
  
  const cardValue = cards[0].value;
  const count = cards.length;
  const possibleValues = [];
  
  // For each possible count from 1 to number of cards
  for (let i = 1; i <= count; i++) {
    const sum = cardValue * i;
    possibleValues.push(sum);
    
    // Special case for Ace: if sum <= 10 or sum > 10, also consider Ace as 14
    if (cards[0].rank === 'A') {
      // If using Ace as 14 (when sum would be > 10)
      const altSum = 14 + (cardValue - 1) * (i - 1); // Replace one Ace with 14
      if (!possibleValues.includes(altSum) && altSum <= 14) {
        possibleValues.push(altSum);
      }
    }
  }
  
  return [...new Set(possibleValues)].sort((a, b) => a - b);
}

/**
 * capture
 * Player captures either:
 *   1. A loose table card (matching the hand card's value)
 *   2. A build stack (matching the build's total value)
 *
 * Rules:
 *  - Card must be in player's hand
 *  - Card value must match target value
 *  - Player can capture their own builds or opponent's builds
 *  - Turn advances after capture
 *
 * For identical card builds (e.g., [5,5]):
 *  - Can capture by rank: 5
 *  - Can capture by sum: 10 (5+5)
 *
 * Contract: (state, payload, playerIndex) => newState  (pure, no side effects)
 */

const { cloneState, nextTurn } = require('../GameState');

/**
 * @param {object} state
 * @param {{
 *   card: object,           // hand card being used to capture
 *   targetType: 'loose' | 'build',
 *   targetRank?: string,
 *   targetSuit?: string,
 *   targetStackId?: string
 * }} payload
 * @param {number} playerIndex
 * @returns {object} New game state
 */
function capture(state, payload, playerIndex) {
  const { card, targetType, targetRank, targetSuit, targetStackId } = payload;

  // Validate card from hand
  if (!card?.rank || !card?.suit) {
    throw new Error('capture: invalid card payload');
  }

  const newState = cloneState(state);
  const hand = newState.playerHands[playerIndex];

  // Remove the capturing card from player's hand
  const handIdx = hand.findIndex(
    c => c.rank === card.rank && c.suit === card.suit,
  );
  if (handIdx === -1) {
    throw new Error(
      `capture: card ${card.rank}${card.suit} not in player ${playerIndex}'s hand`,
    );
  }
  const [capturingCard] = hand.splice(handIdx, 1);

  // Initialize captured cards array
  const capturedCards = [];

  if (targetType === 'loose') {
    // Capture a loose table card
    if (!targetRank || !targetSuit) {
      throw new Error('capture: loose target missing rank/suit');
    }

    // Find and remove the loose card from table
    const tableIdx = newState.tableCards.findIndex(
      tc => !tc.type && tc.rank === targetRank && tc.suit === targetSuit,
    );
    if (tableIdx === -1) {
      throw new Error(
        `capture: target card ${targetRank}${targetSuit} not found on table`,
      );
    }

    const targetCard = newState.tableCards[tableIdx];

    // Validate: card RANK must match target RANK (identical cards only)
    if (capturingCard.rank !== targetCard.rank) {
      throw new Error(
        `capture: can only capture identical cards (${capturingCard.rank}${capturingCard.suit} vs ${targetRank}${targetSuit})`,
      );
    }

    // Remove from table and add to captured
    newState.tableCards.splice(tableIdx, 1);
    capturedCards.push(targetCard);

  } else if (targetType === 'build') {
    // Capture a build stack (can be own or opponent's)
    if (!targetStackId) {
      throw new Error('capture: build target missing stackId');
    }

    // Find the stack (either build_stack or temp_stack)
    const stackIdx = newState.tableCards.findIndex(
      tc => (tc.type === 'build_stack' || tc.type === 'temp_stack') && tc.stackId === targetStackId,
    );
    if (stackIdx === -1) {
      throw new Error(`capture: build stack "${targetStackId}" not found`);
    }

    const buildStack = newState.tableCards[stackIdx];

    // Validate capture based on build type
    if (buildStack.cards.length > 0) {
      const buildRank = buildStack.cards[0].rank;
      const allSameRank = buildStack.cards.every(c => c.rank === buildRank);
      
      if (allSameRank) {
        // Identical cards: can capture by rank OR by sum of any subset
        // Example: [5,5] → can capture with 5 (rank) or 10 (5+5)
        // Example: [3,3,3] → can capture with 3, 6, or 9
        const possibleValues = getPossibleCaptureValues(buildStack.cards);
        
        if (!possibleValues.includes(capturingCard.value)) {
          // Build the card list string for error message
          const cardList = buildStack.cards.map(c => c.rank).join(',');
          throw new Error(
            `capture: build with ${cardList} can be captured with [${possibleValues.join(', ')}], have ${capturingCard.value}`,
          );
        }
      } else {
        // Different cards: must match build VALUE (e.g., 9+7+2=9 can be captured with 9)
        if (capturingCard.value !== buildStack.value) {
          throw new Error(
            `capture: build value is ${buildStack.value}, have ${capturingCard.value}`,
          );
        }
      }
    } else {
      // Empty build - use value check
      if (capturingCard.value !== buildStack.value) {
        throw new Error(
          `capture: card value ${capturingCard.value} does not match build value ${buildStack.value}`,
        );
      }
    }

    // Remove stack from table and add all its cards to captured
    newState.tableCards.splice(stackIdx, 1);
    capturedCards.push(...buildStack.cards);

  } else {
    throw new Error(`capture: unknown targetType "${targetType}"`);
  }

  // Add captured cards first, then the capturing card on top
  // Example: capture 7+3 with 10 -> pile becomes [7, 3, 10] with 10 on top
  newState.playerCaptures[playerIndex].push(...capturedCards, capturingCard);

  // Advance turn to opponent
  return nextTurn(newState);
}

module.exports = capture;
