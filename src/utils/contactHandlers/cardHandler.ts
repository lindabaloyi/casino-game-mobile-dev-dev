/**
 * Loose Card Contact Handler
 * Handles loose card contact logic (capture/staging)
 */

import type { Card, GameState } from '../../../multiplayer/server/game-logic/game-state';
import { findCardIndex, findLooseCardById } from '../contactUtils';

/**
 * Calculate all valid build options for same-value cards
 * Returns array of build options with their capture requirements
 */
function calculateAllBuildOptions(draggedCard: Card, touchedCard: Card, playerHand: Card[]): {
  buildValue: number;
  captureCard: number;
  type: 'spare' | 'sum';
  description: string;
}[] {
  const value = draggedCard.value;

  console.log('[BUILD_OPTIONS_CALC] Calculating build options for same-value cards:', {
    draggedCard: `${draggedCard.rank}${draggedCard.suit}=${value}`,
    touchedCard: `${touchedCard.rank}${touchedCard.suit}=${value}`,
    playerHandSize: playerHand.length,
    playerHand: playerHand.map(c => `${c.rank}${c.suit}=${c.value}`)
  });

  const options: {
    buildValue: number;
    captureCard: number;
    type: 'spare' | 'sum';
    description: string;
  }[] = [];

  // Option 1: Spare same-value card build (build with same value)
  const spareCards = playerHand.filter(card =>
    card.value === value &&
    !(card.rank === draggedCard.rank && card.suit === draggedCard.suit)
  );

  if (spareCards.length > 0) {
    options.push({
      buildValue: value,
      captureCard: value,
      type: 'spare',
      description: `Build ${value} (captured by spare ${value})`
    });

    console.log('[BUILD_OPTIONS_CALC] ✅ Spare card build available:', {
      buildValue: value,
      captureCard: value,
      availableCards: spareCards.map(c => `${c.rank}${c.suit}`)
    });
  }

  // Option 2: Sum build (only for low cards 1-5, sum = value + value)
  if (value <= 5) {
    const sumValue = value * 2;
    const hasSumCard = playerHand.some(card => card.value === sumValue);

    if (hasSumCard) {
      options.push({
        buildValue: sumValue,
        captureCard: sumValue,
        type: 'sum',
        description: `Build ${sumValue} (${value}+${value}, captured by ${sumValue})`
      });

      console.log('[BUILD_OPTIONS_CALC] ✅ Sum build available:', {
        buildValue: sumValue,
        captureCard: sumValue,
        sumCalculation: `${value} + ${value} = ${sumValue}`
      });
    } else {
      console.log('[BUILD_OPTIONS_CALC] ❌ Sum build not available:', {
        neededCard: sumValue,
        availableCards: playerHand.map(c => c.value).sort()
      });
    }
  } else {
    console.log('[BUILD_OPTIONS_CALC] ❌ Sum build: High card (6+), no sum builds possible');
  }

  console.log('[BUILD_OPTIONS_CALC] Final build options:', {
    totalOptions: options.length,
    options: options.map(o => ({
      type: o.type,
      buildValue: o.buildValue,
      captureCard: o.captureCard,
      description: o.description
    }))
  });

  return options;
}

/**
 * Legacy function - kept for backward compatibility
 * Now delegates to calculateAllBuildOptions and returns boolean
 */
function checkBuildOptionsForSameValue(handCard: Card, playerHand: Card[]): boolean {
  const options = calculateAllBuildOptions(handCard, handCard, playerHand);
  return options.length > 0;
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

  // For same-value interactions, calculate all build options
  let buildOptions: {
    buildValue: number;
    captureCard: number;
    type: 'spare' | 'sum';
    description: string;
  }[] = [];

  if (isSameValue) {
    console.log('[CARD_HANDLER] ⚡ SAME-VALUE CONTACT DETECTED');

    const playerHand = gameState.playerHands[currentPlayer];
    buildOptions = calculateAllBuildOptions(draggedCard, touchedCard, playerHand);

    console.log('[CARD_HANDLER] 📊 Calculated build options:', {
      totalOptions: buildOptions.length,
      options: buildOptions.map(o => o.description),
      willShowModal: buildOptions.length > 0
    });

    // If no build options available, do immediate capture
    if (buildOptions.length === 0) {
      console.log('[CARD_HANDLER] 🚀 NO BUILD OPTIONS - IMMEDIATE CAPTURE');

      return {
        type: 'capture',
        payload: {
          targetCards: [touchedCard, draggedCard],
          capturingCard: draggedCard,
          captureValue: draggedCard.value,
          captureType: 'same_value_auto'
        }
      };
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
        isSameValueStack: isSameValue,
        // Include calculated build options for same-value stacks
        sameValueBuildOptions: isSameValue ? buildOptions : []
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
