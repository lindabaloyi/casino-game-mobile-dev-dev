/**
 * Loose Card Contact Handler
 * Handles loose card contact logic (capture/staging)
 */

import type { Card, GameState } from '../../../multiplayer/server/game-logic/game-state';
import { findCardIndex, findLooseCardById } from '../contactUtils';

/**
 * Check if player has build options for same-value cards
 */
function checkBuildOptionsForSameValue(handCard: Card, playerHand: Card[]): boolean {
  const value = handCard.value;

  console.log('[BUILD_CHECK_CLIENT] Checking options for same-value card:', {
    handCard: `${handCard.rank}${handCard.suit}=${value}`,
    playerHandSize: playerHand.length,
    playerHand: playerHand.map(c => `${c.rank}${c.suit}=${c.value}`)
  });

  // Check 1: Spare same-value card for building
  const hasSpareCard = playerHand.some(card =>
    card.value === value &&
    !(card.rank === handCard.rank && card.suit === handCard.suit)
  );

  console.log('[BUILD_CHECK_CLIENT] Spare card check:', {
    neededValue: value,
    hasSpareCard,
    spareCards: playerHand.filter(c =>
      c.value === value &&
      !(c.rank === handCard.rank && c.suit === handCard.suit)
    ).map(c => `${c.rank}${c.suit}`)
  });

  // Check 2: Sum build (only for low cards 1-5)
  let canBuildSum = false;
  if (value <= 5) {
    // For same-value cards, sum would be value + value = 2 * value
    const sumValue = value * 2;
    canBuildSum = playerHand.some(card => card.value === sumValue);

    console.log('[BUILD_CHECK_CLIENT] Sum build check:', {
      isLowCard: value <= 5,
      sumValue,
      hasSumCard: playerHand.some(c => c.value === sumValue),
      canBuildSum
    });
  } else {
    console.log('[BUILD_CHECK_CLIENT] Sum build: ❌ High card (6+), no sum builds possible');
  }

  const hasBuildOptions = hasSpareCard || canBuildSum;

  console.log('[BUILD_CHECK_CLIENT] Final result:', {
    hasSpareCard,
    canBuildSum,
    totalBuildOptions: (hasSpareCard ? 1 : 0) + (canBuildSum ? 1 : 0),
    hasBuildOptions
  });

  return hasBuildOptions;
}

interface Contact {
  id: string;
  type: string;
  distance: number;
  data?: any;
}

/**
 * Handle loose card contact
 */
export function handleLooseCardContact(
  draggedCard: Card,
  contact: Contact,
  gameState: GameState,
  currentPlayer: number,
  source?: string
): { type: string; payload: any } | null {

  console.log('[CARD_HANDLER] 🎯 Handling loose card contact:', {
    draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
    contactId: contact.id,
    currentPlayer
  });

  const touchedCard = findLooseCardById(contact.id, gameState);

  if (!touchedCard) {
    console.log('[CARD_HANDLER] ❌ Card not found in game state:', contact.id);
    return null;
  }

  console.log('[CARD_HANDLER] 🔍 Found loose card:', {
    card: `${touchedCard.rank}${touchedCard.suit}`,
    value: touchedCard.value
  });

  // Allow creative freedom: Players can combine ANY cards in temp stacks
  // Validation happens during build creation, not staging
  const totalValue = draggedCard.value + touchedCard.value;
  const isSameValue = draggedCard.value === touchedCard.value;

  // For same-value interactions, check build options BEFORE staging
  if (isSameValue) {
    console.log('[CARD_HANDLER] ⚡ SAME-VALUE CONTACT DETECTED');

    const playerHand = gameState.playerHands[currentPlayer];
    const hasBuildOptions = checkBuildOptionsForSameValue(draggedCard, playerHand);

    if (!hasBuildOptions) {
      console.log('[CARD_HANDLER] 🚀 NO BUILD OPTIONS - IMMEDIATE CAPTURE');

      // Send immediate capture action for both cards
      return {
        type: 'capture',
        payload: {
          targetCards: [touchedCard, draggedCard], // Both cards to capture
          capturingCard: draggedCard, // The hand card being played
          captureValue: draggedCard.value,
          captureType: 'same_value_auto'
        }
      };
    } else {
      console.log('[CARD_HANDLER] 📋 HAS BUILD OPTIONS - PROCEED TO STAGING');
      // Continue with existing staging logic
    }
  }

  // Allow all combinations for maximum player creativity
  if (isSameValue || totalValue > 0) {
    // Check if player has active builds for contextual logging
    const playerHasBuilds = gameState.tableCards.some(tc =>
      (tc as any).type === 'build' && (tc as any).owner === currentPlayer
    );

    console.log('[CARD_HANDLER] 🎯 STAGING TRIGGERED:', {
      player: currentPlayer,
      draggedCard: `${draggedCard.rank}${draggedCard.suit}`,
      touchedCard: `${touchedCard.rank}${touchedCard.suit}`,
      totalValue,
      isSameValue,
      playerHasBuilds,
      stagingType: isSameValue ? 'same-value (strategic options)' : (playerHasBuilds ? 'enhanced (with augmentation)' : 'basic (capture only)'),
      reason: isSameValue ? 'Same-value cards need strategic options' : 'Universal staging available to all players'
    });

    // Find the index of the touched card in tableCards
    const touchedIndex = findCardIndex(touchedCard, gameState);

    // Use single staging action for all players
    const action = {
      type: 'createTemp',
      payload: {
        source: source || 'hand',
        isTableToTable: false,
        card: draggedCard,
        targetIndex: touchedIndex,
        // Include build augmentation capability flag
        canAugmentBuilds: playerHasBuilds,
        // Mark same-value stacks for special handling
        isSameValueStack: isSameValue
      }
    };

    console.log('[CARD_HANDLER] 🚀 Sending staging action:', {
      actionType: action.type,
      canAugmentBuilds: action.payload.canAugmentBuilds,
      isSameValueStack: action.payload.isSameValueStack,
      stagingValue: totalValue
    });

    return action;
  }

  return null;
}
